import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// Get reviews for a seller
router.get('/seller/:sellerId', async (req, res) => {
  try {
    if (!supabase) return res.json([]);
    
    const { sellerId } = req.params;
    
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewer:profiles!reviewer_id(id, full_name, avatar_url)
      `)
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a review
router.post('/', async (req, res) => {
  try {
    if (!supabase) throw new Error('Supabase not configured');
    
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No authorization header' });
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) return res.status(401).json({ error: 'Invalid token' });
    
    const { seller_id, listing_id, rating, comment } = req.body;
    
    if (!seller_id || !rating) {
      return res.status(400).json({ error: 'Seller ID and rating are required' });
    }

    // Check if user is trying to review themselves
    if (user.id === seller_id) {
      return res.status(400).json({ error: 'You cannot review yourself' });
    }

    // Check if user has already reviewed this listing
    if (listing_id) {
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('reviewer_id', user.id)
        .eq('listing_id', listing_id)
        .single();
        
      if (existingReview) {
        return res.status(400).json({ error: 'You have already reviewed this listing' });
      }
    }

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        reviewer_id: user.id,
        seller_id,
        listing_id,
        rating,
        comment
      })
      .select(`
        *,
        reviewer:profiles!reviewer_id(id, full_name, avatar_url)
      `)
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
