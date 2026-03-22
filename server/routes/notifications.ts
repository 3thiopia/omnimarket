import express from 'express';
import webpush from 'web-push';
import { supabase } from '../lib/supabase.js';

/**
 * SQL Schema for Supabase:
 * 
 * CREATE TABLE push_subscriptions (
 *   user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 *   subscription TEXT NOT NULL,
 *   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- Enable RLS
 * ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
 * 
 * -- Policies
 * CREATE POLICY "Users can manage their own subscriptions" 
 *   ON push_subscriptions FOR ALL 
 *   USING (auth.uid() = user_id);
 */

const router = express.Router();

const publicKey = process.env.VAPID_PUBLIC_KEY || 'BIpqfovvAROHIyXg1xxeof8igMhblYBcuae8Qd-uZlnqAuc84L2qXD6GERbzfScG4dgfs1QK9JK5Oa50wNClYLk';
const privateKey = process.env.VAPID_PRIVATE_KEY || 'ihfDhy5gvKDHuEM9Co7fHxF1nlcN20DkD7UCi0J0lok';
const email = process.env.VAPID_EMAIL || 'getahunpro@gmail.com';

webpush.setVapidDetails(
  `mailto:${email}`,
  publicKey,
  privateKey
);

// Subscribe a user to push notifications
router.post('/subscribe', async (req, res) => {
  const { subscription, user_id } = req.body;

  if (!subscription || !user_id) {
    return res.status(400).json({ error: 'Missing subscription or user_id' });
  }

  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Database connection not configured' });
    }
    // Store subscription in Supabase
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id,
        subscription: JSON.stringify(subscription),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) throw error;

    res.status(201).json({ message: 'Subscription saved' });
  } catch (error) {
    console.error('Error saving subscription:', error);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

// Test notification
router.post('/test', async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

  try {
    await sendPushNotification(user_id, {
      title: 'Test Notification',
      body: 'This is a test push notification from Omni Market!',
      icon: '/logo.png',
      data: { url: '/' }
    });
    res.json({ message: 'Test notification sent' });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

// Helper function to send push notification
export const sendPushNotification = async (userId: string, payload: any) => {
  try {
    if (!supabase) {
      console.warn('Supabase not configured, skipping push notification');
      return;
    }
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId);

    if (error) throw error;

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`No push subscription found for user ${userId}`);
      return;
    }

    const pushPromises = subscriptions.map(sub => {
      const subscription = JSON.parse(sub.subscription);
      return webpush.sendNotification(subscription, JSON.stringify(payload))
        .catch(err => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            // Subscription has expired or is no longer valid
            console.log(`Removing expired subscription for user ${userId}`);
            if (!supabase) {
              console.error('Supabase client not initialized, cannot remove expired subscription');
              return;
            }
            return supabase
              .from('push_subscriptions')
              .delete()
              .eq('user_id', userId);
          }
          throw err;
        });
    });

    await Promise.all(pushPromises);
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};

export default router;
