import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

router.get('/', async (req, res) => {
  try {
    if (!supabase) {
      return res.json([]);
    }
    let query = supabase
      .from('listings')
      .select(`
        *,
        seller:profiles(*),
        category_data:categories(name, icon, parent:categories!parent_id(name)),
        listing_images(image_url)
      `);

    // If no status is provided, default to 'active' for general browsing
    const { 
      search: searchParam, 
      category: categoryParam, 
      status = 'active', 
      seller_id,
      sort = 'created_at',
      order = 'desc',
      min_price,
      max_price,
      location: locationParam
    } = req.query;
    
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (seller_id) {
      query = query.eq('seller_id', seller_id);
    }

    // Apply price filters
    if (min_price) {
      query = query.gte('price', min_price);
    }
    if (max_price) {
      query = query.lte('price', max_price);
    }

    // Apply location filter
    if (locationParam) {
      query = query.ilike('location', `%${locationParam}%`);
    }

    // Apply Full-Text Search if search query exists
    if (searchParam) {
      // .textSearch uses the 'fts' column we created in SQL
      query = query.textSearch('fts', searchParam as string, {
        type: 'websearch',
        config: 'english'
      });
    }

    // Filter by category if provided
    if (categoryParam) {
      // Check if it's a UUID (likely category_id) or a string (likely category name)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryParam as string);
      
      if (isUuid) {
        // For hierarchical categories, we might want to include sub-categories
        // First, get all sub-categories of this category
        const { data: subCategories } = await supabase
          .from('categories')
          .select('id')
          .eq('parent_id', categoryParam);
        
        if (subCategories && subCategories.length > 0) {
          const categoryIds = [categoryParam, ...subCategories.map(c => c.id)];
          query = query.in('category_id', categoryIds);
        } else {
          query = query.eq('category_id', categoryParam);
        }
      } else {
        query = query.eq('category', categoryParam);
      }
    }

    // Apply sorting
    const sortField = sort as string;
    const sortOrder = order as string === 'asc';
    query = query.order(sortField, { ascending: sortOrder });

    const { data, error } = await query;

    if (error) throw error;
    
    // Check for favorites if user is logged in
    let favoriteIds: Set<string | number> = new Set();
    const authHeader = req.headers.authorization;
    if (authHeader && supabase) {
      const token = authHeader.split(' ')[1];
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const { data: favorites } = await supabase
          .from('favorites')
          .select('listing_id')
          .eq('user_id', user.id);
        
        if (favorites) {
          favoriteIds = new Set(favorites.map(f => f.listing_id));
        }
      }
    }

    // Map database fields to frontend fields
    const mappedData = (data || []).map(item => ({
      ...item,
      image: item.thumbnail_url,
      images: item.listing_images?.map((img: any) => img.image_url) || [item.thumbnail_url],
      isPromoted: item.is_promoted,
      category: item.category_data?.name || item.category,
      categoryIcon: item.category_data?.icon,
      isFavorited: favoriteIds.has(item.id)
    }));

    res.json(mappedData);
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!supabase) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const { data: item, error } = await supabase
      .from('listings')
      .select(`
        *,
        seller:profiles(*),
        category_data:categories(name, icon, parent:categories!parent_id(name)),
        listing_images(image_url)
      `)
      .eq('id', id)
      .single();

    if (error || !item) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Check for favorites if user is logged in
    let isFavorited = false;
    const authHeader = req.headers.authorization;
    if (authHeader && supabase) {
      const token = authHeader.split(' ')[1];
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const { data: favorite } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', user.id)
          .eq('listing_id', id)
          .single();
        
        if (favorite) {
          isFavorited = true;
        }
      }
    }

    // Map database fields to frontend fields
    const mappedData = {
      ...item,
      image: item.thumbnail_url,
      images: item.listing_images?.map((img: any) => img.image_url) || [item.thumbnail_url],
      isPromoted: item.is_promoted,
      category: item.category_data?.name || item.category,
      categoryIcon: item.category_data?.icon,
      isFavorited
    };

    res.json(mappedData);
  } catch (error) {
    console.error('Error fetching listing by id:', error);
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
});

router.get('/favorites', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !supabase) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data, error } = await supabase
      .from('favorites')
      .select(`
        listing_id,
        listing:listings(
          *,
          seller:profiles(*),
          category_data:categories(name, icon),
          listing_images(image_url)
        )
      `)
      .eq('user_id', user.id);

    if (error) throw error;

    const mappedData = (data || []).map((item: any) => {
      const listing = item.listing;
      return {
        ...listing,
        image: listing.thumbnail_url,
        images: listing.listing_images?.map((img: any) => img.image_url) || [listing.thumbnail_url],
        isPromoted: listing.is_promoted,
        category: listing.category_data?.name || listing.category,
        categoryIcon: listing.category_data?.icon,
        isFavorited: true
      };
    });

    res.json(mappedData);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

router.post('/:id/favorite', async (req, res) => {
  try {
    const { id } = req.params;
    const authHeader = req.headers.authorization;

    if (!supabase) {
      return res.status(500).json({ error: 'Database connection not configured' });
    }

    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if already favorited
    const { data: existing } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('listing_id', id)
      .single();

    if (existing) {
      // Unfavorite
      await supabase
        .from('favorites')
        .delete()
        .eq('id', existing.id);
      
      return res.json({ favorited: false });
    } else {
      // Favorite
      await supabase
        .from('favorites')
        .insert([{ user_id: user.id, listing_id: id }]);
      
      return res.json({ favorited: true });
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({ error: 'Failed to toggle favorite' });
  }
});

router.post('/', async (req, res) => {
  try {
    const listingData = req.body;
    const authHeader = req.headers.authorization;

    if (!supabase) {
      const newListing = { ...listingData, id: Date.now().toString(), postedAt: 'Just now' };
      return res.status(201).json(newListing);
    }

    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return res.status(401).json({ error: 'Unauthorized', details: authError?.message });
    }

    const { title, price, location, description, category_id, image, images, isPromoted } = listingData;
    
    // Validate category_id is a UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category_id as string);
    
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .insert([{ 
        title,
        price,
        location,
        description,
        category_id: isUuid ? category_id : null,
        thumbnail_url: image, 
        is_promoted: isPromoted,
        seller_id: user.id 
      }])
      .select()
      .single();

    if (listingError) throw listingError;

    // Insert additional images if provided
    if (images && Array.isArray(images) && images.length > 0) {
      const imageInserts = images.map((url, index) => ({
        listing_id: listing.id,
        image_url: url,
        display_order: index
      }));

      const { error: imagesError } = await supabase
        .from('listing_images')
        .insert(imageInserts);

      if (imagesError) {
        console.error('Error inserting listing images:', imagesError);
        // We don't fail the whole request if images fail, but we log it
      }
    }

    res.status(201).json(listing);
  } catch (error) {
    console.error('Error creating listing:', error);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const listingData = req.body;
    const authHeader = req.headers.authorization;

    if (!supabase) {
      return res.status(500).json({ error: 'Database connection not configured' });
    }

    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is the owner or an admin
    const { data: listing, error: fetchError } = await supabase
      .from('listings')
      .select('seller_id')
      .eq('id', id)
      .single();

    if (fetchError || !listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.seller_id !== user.id) {
       // Check if user is admin
       const { data: profile } = await supabase
         .from('profiles')
         .select('role')
         .eq('id', user.id)
         .single();
       
       if (profile?.role !== 'admin') {
         return res.status(403).json({ error: 'Forbidden' });
       }
    }

    // Map frontend fields to database fields
    const { title, price, location, description, category_id, image, images, isPromoted, status } = listingData;
    
    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (price !== undefined) updates.price = price;
    if (location !== undefined) updates.location = location;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (isPromoted !== undefined) updates.is_promoted = isPromoted;
    if (image !== undefined) updates.thumbnail_url = image;
    
    if (category_id !== undefined) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category_id as string);
      if (isUuid) {
        updates.category_id = category_id;
      } else if (category_id === null || category_id === '') {
        updates.category_id = null;
      }
    }

    const { data: updatedListing, error: updateError } = await supabase
      .from('listings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Supabase update error:', JSON.stringify(updateError));
      return res.status(400).json({ 
        error: 'Failed to update listing', 
        details: updateError.message || JSON.stringify(updateError) 
      });
    }

    // Update images if provided
    if (images && Array.isArray(images)) {
      // Delete old images
      await supabase.from('listing_images').delete().eq('listing_id', id);
      
      // Insert new ones
      const imageInserts = images.map((url, index) => ({
        listing_id: id,
        image_url: url,
        display_order: index
      }));

      const { error: imagesError } = await supabase
        .from('listing_images')
        .insert(imageInserts);

      if (imagesError) {
        console.error('Error updating listing images:', JSON.stringify(imagesError));
      }
    }

    res.json(updatedListing);
  } catch (error: any) {
    console.error('Error updating listing:', error);
    res.status(500).json({ 
      error: 'Failed to update listing',
      details: error.message || JSON.stringify(error)
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const authHeader = req.headers.authorization;

    if (!supabase) {
      return res.status(500).json({ error: 'Database connection not configured' });
    }

    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is the owner or an admin
    const { data: listing, error: fetchError } = await supabase
      .from('listings')
      .select('seller_id')
      .eq('id', id)
      .single();

    if (fetchError || !listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.seller_id !== user.id) {
       // Check if user is admin
       const { data: profile } = await supabase
         .from('profiles')
         .select('role')
         .eq('id', user.id)
         .single();
       
       if (profile?.role !== 'admin') {
         return res.status(403).json({ error: 'Forbidden' });
       }
    }

    // 1. Get all conversation IDs for this listing
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .eq('listing_id', id);

    const conversationIds = conversations?.map(c => c.id) || [];

    // 2. Delete messages for those conversations
    if (conversationIds.length > 0) {
      await supabase
        .from('messages')
        .delete()
        .in('conversation_id', conversationIds);
    }

    // 3. Delete conversations
    await supabase
      .from('conversations')
      .delete()
      .eq('listing_id', id);

    // 4. Delete reports
    await supabase
      .from('reports')
      .delete()
      .eq('listing_id', id);

    // 5. Delete favorites
    await supabase
      .from('favorites')
      .delete()
      .eq('listing_id', id);

    // 6. Delete associated images
    await supabase
      .from('listing_images')
      .delete()
      .eq('listing_id', id);

    // 7. Finally delete the listing
    const { error: deleteError } = await supabase
      .from('listings')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting listing:', error);
    res.status(500).json({ error: 'Failed to delete listing' });
  }
});

export default router;
