import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

router.get('/', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Database connection not configured' });
    }

    // In a real app, you'd query Supabase for these counts
    const { count: listingCount } = await supabase.from('listings').select('*', { count: 'exact', head: true });
    const { count: categoryCount } = await supabase.from('categories').select('*', { count: 'exact', head: true });

    res.json([
      { label: 'Total Listings', value: listingCount?.toLocaleString() || '0', change: '+12%', icon: 'Package', color: 'blue' },
      { label: 'Categories', value: categoryCount?.toLocaleString() || '0', change: '+5.4%', icon: 'FolderTree', color: 'emerald' },
      { label: 'Revenue', value: 'Br4.2M', change: '+18%', icon: 'BarChart3', color: 'orange' },
    ]);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
