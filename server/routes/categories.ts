import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

router.get('/', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Database connection not configured' });
    }

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('count', { ascending: false });

    if (error) throw error;
    
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, icon, parent_id } = req.body;
    
    if (!supabase) {
      const newCat = { id: Date.now().toString(), name, count: 0, icon: icon || '📁', parent_id: parent_id || null };
      return res.status(201).json(newCat);
    }

    const { data, error } = await supabase
      .from('categories')
      .insert([{ name, icon: icon || '📁', count: 0, parent_id: parent_id || null }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!supabase) {
      return res.status(204).send();
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

router.post('/seed', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(400).json({ error: 'Supabase not connected' });
    }

    // Clear existing categories to avoid duplicates and ensure a clean seed
    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) throw deleteError;

    const mainCategories = [
      { name: 'Mobile Phones & Tablets', icon: '📱' },
      { name: 'Electronics', icon: '💻' },
      { name: 'Vehicles', icon: '🚗' },
      { name: 'Property', icon: '🏠' },
      { name: 'Home, Furniture & Appliances', icon: '🛋️' },
      { name: 'Health & Beauty', icon: '💄' },
      { name: 'Fashion', icon: '👕' },
      { name: 'Sports, Arts & Outdoors', icon: '⚽' },
      { name: 'Services', icon: '🛠️' },
      { name: 'Jobs', icon: '💼' },
      { name: 'Babies & Kids', icon: '👶' },
      { name: 'Pets', icon: '🐕' },
      { name: 'Agriculture & Food', icon: '🌾' },
      { name: 'Commercial Equipment & Tools', icon: '🏗️' },
      { name: 'General / Uncategorized', icon: '📦' },
    ];

    const { data: seededMain, error: mainError } = await supabase
      .from('categories')
      .insert(mainCategories)
      .select();

    if (mainError) throw mainError;

    const subCategories: any[] = [];
    
    const findId = (name: string) => seededMain?.find(c => c.name === name)?.id;

    // Mobile
    const mobileId = findId('Mobile Phones & Tablets');
    if (mobileId) {
      subCategories.push(
        { name: 'Mobile Phones', parent_id: mobileId, icon: '📱' },
        { name: 'Tablets', parent_id: mobileId, icon: '📟' },
        { name: 'Smart Watches & Trackers', parent_id: mobileId, icon: '⌚' },
        { name: 'Mobile Phone Accessories', parent_id: mobileId, icon: '🎧' },
        { name: 'Tablet Accessories', parent_id: mobileId, icon: '🔌' },
        { name: 'Other Mobile & Tablets', parent_id: mobileId, icon: '📱' }
      );
    }

    // Electronics
    const electronicsId = findId('Electronics');
    if (electronicsId) {
      subCategories.push(
        { name: 'Laptops & Computers', parent_id: electronicsId, icon: '💻' },
        { name: 'Computer Hardware', parent_id: electronicsId, icon: '💾' },
        { name: 'Computer Accessories', parent_id: electronicsId, icon: '🖱️' },
        { name: 'TV & Video Equipment', parent_id: electronicsId, icon: '📺' },
        { name: 'Audio & Music Equipment', parent_id: electronicsId, icon: '🔊' },
        { name: 'Cameras & Camcorders', parent_id: electronicsId, icon: '📷' },
        { name: 'Video Games & Consoles', parent_id: electronicsId, icon: '🎮' },
        { name: 'Networking Products', parent_id: electronicsId, icon: '🌐' },
        { name: 'Printers & Scanners', parent_id: electronicsId, icon: '🖨️' },
        { name: 'Security & Surveillance', parent_id: electronicsId, icon: '🛡️' },
        { name: 'Other Electronics', parent_id: electronicsId, icon: '🔌' }
      );
    }

    // Vehicles
    const vehiclesId = findId('Vehicles');
    if (vehiclesId) {
      subCategories.push(
        { name: 'Cars', parent_id: vehiclesId, icon: '🚗' },
        { name: 'Buses & Microbuses', parent_id: vehiclesId, icon: '🚌' },
        { name: 'Heavy Equipment', parent_id: vehiclesId, icon: '🚜' },
        { name: 'Motorcycles & Scooters', parent_id: vehiclesId, icon: '🏍️' },
        { name: 'Trucks & Trailers', parent_id: vehiclesId, icon: '🚛' },
        { name: 'Vehicle Parts & Accessories', parent_id: vehiclesId, icon: '⚙️' },
        { name: 'Watercraft & Boats', parent_id: vehiclesId, icon: '🚤' },
        { name: 'Other Vehicles', parent_id: vehiclesId, icon: '🚜' }
      );
    }

    // Property
    const propertyId = findId('Property');
    if (propertyId) {
      subCategories.push(
        { name: 'Houses & Apartments for Rent', parent_id: propertyId, icon: '🔑' },
        { name: 'Houses & Apartments for Sale', parent_id: propertyId, icon: '🏠' },
        { name: 'Land & Plots for Sale', parent_id: propertyId, icon: '🗺️' },
        { name: 'Commercial Property for Rent', parent_id: propertyId, icon: '🏢' },
        { name: 'Commercial Property for Sale', parent_id: propertyId, icon: '🏢' },
        { name: 'Short Let Property', parent_id: propertyId, icon: '🛌' },
        { name: 'Other Property', parent_id: propertyId, icon: '🏘️' }
      );
    }

    // Home
    const homeId = findId('Home, Furniture & Appliances');
    if (homeId) {
      subCategories.push(
        { name: 'Furniture', parent_id: homeId, icon: '🛋️' },
        { name: 'Kitchen Appliances', parent_id: homeId, icon: '🍳' },
        { name: 'Home Appliances', parent_id: homeId, icon: '🧺' },
        { name: 'Home Decor', parent_id: homeId, icon: '🖼️' },
        { name: 'Kitchen & Dining', parent_id: homeId, icon: '🍽️' },
        { name: 'Garden & Outdoor', parent_id: homeId, icon: '🌳' },
        { name: 'Household Supplies', parent_id: homeId, icon: '🧹' },
        { name: 'Other Home Items', parent_id: homeId, icon: '🏠' }
      );
    }

    // Fashion
    const fashionId = findId('Fashion');
    if (fashionId) {
      subCategories.push(
        { name: "Men's Clothing", parent_id: fashionId, icon: '👕' },
        { name: "Men's Shoes", parent_id: fashionId, icon: '👞' },
        { name: "Women's Clothing", parent_id: fashionId, icon: '👗' },
        { name: "Women's Shoes", parent_id: fashionId, icon: '👠' },
        { name: 'Watches', parent_id: fashionId, icon: '⌚' },
        { name: 'Jewelry', parent_id: fashionId, icon: '💎' },
        { name: 'Bags', parent_id: fashionId, icon: '👜' },
        { name: 'Wedding Wear & Accessories', parent_id: fashionId, icon: '👰' },
        { name: 'Other Fashion', parent_id: fashionId, icon: '👕' }
      );
    }

    // Health & Beauty
    const healthId = findId('Health & Beauty');
    if (healthId) {
      subCategories.push(
        { name: 'Skincare', parent_id: healthId, icon: '🧴' },
        { name: 'Makeup', parent_id: healthId, icon: '💄' },
        { name: 'Haircare', parent_id: healthId, icon: '💇' },
        { name: 'Fragrances', parent_id: healthId, icon: '✨' },
        { name: 'Vitamins & Supplements', parent_id: healthId, icon: '💊' },
        { name: 'Bath & Body', parent_id: healthId, icon: '🧼' },
        { name: 'Sexual Wellness', parent_id: healthId, icon: '❤️' },
        { name: 'Other Health & Beauty', parent_id: healthId, icon: '🧼' }
      );
    }

    // Sports
    const sportsId = findId('Sports, Arts & Outdoors');
    if (sportsId) {
      subCategories.push(
        { name: 'Gym & Fitness', parent_id: sportsId, icon: '🏋️' },
        { name: 'Outdoor & Camping', parent_id: sportsId, icon: '⛺' },
        { name: 'Sports Equipment', parent_id: sportsId, icon: '⚽' },
        { name: 'Musical Instruments', parent_id: sportsId, icon: '🎸' },
        { name: 'Books & Magazines', parent_id: sportsId, icon: '📚' },
        { name: 'Arts & Crafts', parent_id: sportsId, icon: '🎨' },
        { name: 'Board Games & Hobbies', parent_id: sportsId, icon: '🎲' },
        { name: 'Other Sports & Arts', parent_id: sportsId, icon: '🎨' }
      );
    }

    // Services
    const servicesId = findId('Services');
    if (servicesId) {
      subCategories.push(
        { name: 'Automotive Services', parent_id: servicesId, icon: '🔧' },
        { name: 'Building & Trade Services', parent_id: servicesId, icon: '🏗️' },
        { name: 'Cleaning Services', parent_id: servicesId, icon: '🧹' },
        { name: 'Computer & IT Services', parent_id: servicesId, icon: '💻' },
        { name: 'Classes & Tutoring', parent_id: servicesId, icon: '🎓' },
        { name: 'Event Planning & Catering', parent_id: servicesId, icon: '🎉' },
        { name: 'Health & Beauty Services', parent_id: servicesId, icon: '💅' },
        { name: 'Legal & Financial Services', parent_id: servicesId, icon: '⚖️' },
        { name: 'Logistics & Transport', parent_id: servicesId, icon: '🚚' },
        { name: 'Repair & Maintenance', parent_id: servicesId, icon: '🛠️' },
        { name: 'Other Services', parent_id: servicesId, icon: '🛠️' }
      );
    }

    // Jobs
    const jobsId = findId('Jobs');
    if (jobsId) {
      subCategories.push(
        { name: 'Accounting & Finance Jobs', parent_id: jobsId, icon: '📊' },
        { name: 'Advertising & Marketing Jobs', parent_id: jobsId, icon: '📈' },
        { name: 'Customer Service Jobs', parent_id: jobsId, icon: '🎧' },
        { name: 'Education & Training Jobs', parent_id: jobsId, icon: '🏫' },
        { name: 'Engineering & Technology Jobs', parent_id: jobsId, icon: '💻' },
        { name: 'Healthcare & Nursing Jobs', parent_id: jobsId, icon: '🏥' },
        { name: 'Hotels & Hospitality Jobs', parent_id: jobsId, icon: '🏨' },
        { name: 'Sales Jobs', parent_id: jobsId, icon: '💰' },
        { name: 'Other Jobs', parent_id: jobsId, icon: '💼' }
      );
    }

    // Babies
    const babiesId = findId('Babies & Kids');
    if (babiesId) {
      subCategories.push(
        { name: 'Baby & Child Care', parent_id: babiesId, icon: '🍼' },
        { name: 'Children Furniture', parent_id: babiesId, icon: '🛏️' },
        { name: 'Children Clothing', parent_id: babiesId, icon: '👕' },
        { name: 'Children Shoes', parent_id: babiesId, icon: '👟' },
        { name: 'Toys', parent_id: babiesId, icon: '🧸' },
        { name: 'Prams & Strollers', parent_id: babiesId, icon: '🛒' },
        { name: 'Other Baby Items', parent_id: babiesId, icon: '👶' }
      );
    }

    // Pets
    const petsId = findId('Pets');
    if (petsId) {
      subCategories.push(
        { name: 'Dogs & Puppies', parent_id: petsId, icon: '🐕' },
        { name: 'Cats & Kittens', parent_id: petsId, icon: '🐈' },
        { name: 'Birds', parent_id: petsId, icon: '🦜' },
        { name: 'Fish & Aquarium', parent_id: petsId, icon: '🐠' },
        { name: 'Pet Accessories', parent_id: petsId, icon: '🦴' },
        { name: 'Other Pets', parent_id: petsId, icon: '🐾' }
      );
    }

    // Agriculture
    const agricultureId = findId('Agriculture & Food');
    if (agricultureId) {
      subCategories.push(
        { name: 'Livestock & Poultry', parent_id: agricultureId, icon: '🐄' },
        { name: 'Feeds, Seeds & Supplements', parent_id: agricultureId, icon: '🌱' },
        { name: 'Farm Machinery & Equipment', parent_id: agricultureId, icon: '🚜' },
        { name: 'Food & Beverages', parent_id: agricultureId, icon: '🍎' },
        { name: 'Other Agriculture', parent_id: agricultureId, icon: '🌾' }
      );
    }

    // Commercial
    const commercialId = findId('Commercial Equipment & Tools');
    if (commercialId) {
      subCategories.push(
        { name: 'Industrial Machinery', parent_id: commercialId, icon: '⚙️' },
        { name: 'Construction Equipment', parent_id: commercialId, icon: '🏗️' },
        { name: 'Medical Equipment', parent_id: commercialId, icon: '🏥' },
        { name: 'Printing & Packaging', parent_id: commercialId, icon: '📦' },
        { name: 'Restaurant & Catering Equipment', parent_id: commercialId, icon: '🍳' },
        { name: 'Store Equipment', parent_id: commercialId, icon: '🏪' },
        { name: 'Other Commercial', parent_id: commercialId, icon: '🏗️' }
      );
    }

    const { data: seededSubs, error: subError } = await supabase
      .from('categories')
      .insert(subCategories)
      .select();

    if (subError) throw subError;

    res.json({ 
      message: 'Categories seeded successfully with hierarchy', 
      main: seededMain?.length,
      subs: seededSubs?.length 
    });
  } catch (error) {
    console.error('Error seeding categories:', error);
    res.status(500).json({ error: 'Failed to seed categories' });
  }
});

router.post('/sync-counts', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(400).json({ error: 'Supabase not connected' });
    }

    // 1. Reset all counts to 0
    await supabase.from('categories').update({ count: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');

    // 2. Get all active listings with their category_id
    const { data: listings, error: listingError } = await supabase
      .from('listings')
      .select('category_id')
      .eq('status', 'active');

    if (listingError) throw listingError;

    // 3. Count occurrences
    const counts: Record<string, number> = {};
    listings?.forEach(l => {
      if (l.category_id) {
        counts[l.category_id] = (counts[l.category_id] || 0) + 1;
      }
    });

    // 4. Update sub-category counts and build parent counts
    const parentCounts: Record<string, number> = {};
    const { data: categories } = await supabase.from('categories').select('id, parent_id');
    
    for (const [catId, count] of Object.entries(counts)) {
      await supabase.from('categories').update({ count }).eq('id', catId);
      
      // Find parent and add to its count
      const cat = categories?.find(c => c.id === catId);
      if (cat?.parent_id) {
        parentCounts[cat.parent_id] = (parentCounts[cat.parent_id] || 0) + count;
      }
    }

    // 5. Update parent category counts
    for (const [parentId, count] of Object.entries(parentCounts)) {
      await supabase.from('categories').update({ count }).eq('id', parentId);
    }

    res.json({ message: 'Category counts synchronized successfully' });
  } catch (error) {
    console.error('Error syncing category counts:', error);
    res.status(500).json({ error: 'Failed to sync category counts' });
  }
});

export default router;
