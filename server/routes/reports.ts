import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// Get all reports (Admin only)
router.get('/', async (req, res) => {
  try {
    if (!supabase) {
      return res.json([]);
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const token = authHeader.split(' ')[1];
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const { data: reports, error } = await supabase
      .from('reports')
      .select(`
        *,
        listing:listings(id, title, thumbnail_url),
        reporter:profiles(id, full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching reports:', JSON.stringify(error, null, 2));
      throw error;
    }
    res.json(reports);
  } catch (error: any) {
    console.error('Error fetching reports:', error.message || error);
    res.status(500).json({ error: error.message || 'Failed to fetch reports' });
  }
});

// Create a new report
router.post('/', async (req, res) => {
  try {
    if (!supabase) {
      const mockReport = {
        id: Math.random().toString(36).substr(2, 9),
        ...req.body,
        status: 'pending',
        created_at: new Date().toISOString()
      };
      return res.status(201).json(mockReport);
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const token = authHeader.split(' ')[1];
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { listing_id, reason, details } = req.body;

    if (!listing_id || !reason) {
      return res.status(400).json({ error: 'Listing ID and reason are required' });
    }

    // Validate listing_id is a UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(listing_id as string);
    
    if (!isUuid) {
      // If it's not a UUID, it might be a mock ID. 
      // In a real Supabase setup, this would fail due to foreign key constraints.
      // For now, we'll return an error to avoid DB crashes.
      return res.status(400).json({ error: 'Invalid Listing ID format. Reporting only works for real listings.' });
    }

    let { data: report, error } = await supabase
      .from('reports')
      .insert({
        listing_id,
        reporter_id: user.id,
        reason,
        details,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      // If the error is that the 'details' column doesn't exist, try without it
      const isMissingColumnError = 
        error.code === '42703' || 
        (error.message && (
          error.message.toLowerCase().includes('column "details"') || 
          error.message.toLowerCase().includes("'details' column") ||
          error.message.toLowerCase().includes('column details')
        ));

      if (isMissingColumnError) {
        console.warn('Details column missing in reports table, retrying without it...');
        const { data: retryReport, error: retryError } = await supabase
          .from('reports')
          .insert({
            listing_id,
            reporter_id: user.id,
            reason,
            status: 'pending'
          })
          .select()
          .single();
        
        if (retryError) {
          console.error('Supabase error creating report (retry):', JSON.stringify(retryError, null, 2));
          throw retryError;
        }
        report = retryReport;
      } else {
        console.error('Supabase error creating report:', JSON.stringify(error, null, 2));
        throw error;
      }
    }
    res.status(201).json(report);
  } catch (error: any) {
    console.error('Error creating report:', error.message || error);
    res.status(500).json({ error: error.message || 'Failed to create report' });
  }
});

// Update report status (Admin only)
router.patch('/:id', async (req, res) => {
  try {
    if (!supabase) {
      return res.json({ id: req.params.id, ...req.body });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const token = authHeader.split(' ')[1];
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const { id } = req.params;
    const { status } = req.body;

    const { data: report, error } = await supabase
      .from('reports')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(report);
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

export default router;
