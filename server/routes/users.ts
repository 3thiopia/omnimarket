import { Router } from 'express';
import { supabase } from '../lib/supabase';
import multer from 'multer';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Get all users (Admin only)
router.get('/', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    if (!supabase) {
      return res.json([
        { id: '1', full_name: 'Admin User', email: 'admin@example.com', role: 'admin', status: 'active', created_at: new Date().toISOString() },
        { id: '2', full_name: 'John Doe', email: 'john@example.com', role: 'user', status: 'active', created_at: new Date().toISOString() },
        { id: '3', full_name: 'Jane Smith', email: 'jane@example.com', role: 'user', status: 'blocked', created_at: new Date().toISOString() },
      ]);
    }

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

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(profiles);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get current user profile
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    if (!supabase) {
      return res.json({
        id: 'mock-user-123',
        full_name: 'Admin User',
        email: 'admin@jijiclone.com',
        role: 'admin'
      });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;
    res.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    if (!supabase) {
      return res.json({
        id: req.params.id,
        full_name: 'Mock Seller',
        email: 'seller@example.com'
      });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json(profile);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Upload avatar
router.post('/upload-avatar', upload.single('avatar'), async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    if (!supabase) {
      return res.status(500).json({ error: 'Database connection not configured' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const file = req.file;
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { data, error: uploadError } = await supabase.storage
      .from('listings') // Using 'listings' bucket as it's already configured
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('listings')
      .getPublicUrl(filePath);

    // Update profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json(updatedProfile);
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// Update profile
router.put('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    if (!supabase) {
      return res.json({ ...req.body, id: 'mock-user-123' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { data, error } = await supabase
      .from('profiles')
      .update(req.body)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Delete account
router.delete('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    if (!supabase) {
      return res.json({ success: true });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // Delete user from auth.users (this will cascade to profiles and other tables)
    // Note: In a real app, you might want to use supabase.auth.admin.deleteUser(user.id)
    // but that requires service role key.
    // For now, we delete from profiles, and the user can be deleted from auth manually or via admin.
    // Actually, the schema says profiles.id REFERENCES auth.users ON DELETE CASCADE.
    // So we should delete from auth.users.
    
    const { error } = await supabase.auth.admin.deleteUser(user.id);

    if (error) {
      // If admin delete fails (e.g. no service role), try deleting from profiles at least
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);
      
      if (profileError) throw profileError;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Update user status (Admin only)
router.patch('/:id/status', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    if (!supabase) {
      return res.json({ id: req.params.id, ...req.body });
    }

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

    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error updating user status:', error);
      return res.status(400).json({ error: 'Failed to update user status', details: error.message });
    }
    res.json(updatedProfile);
  } catch (error: any) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Failed to update user status', details: error.message });
  }
});

export default router;
