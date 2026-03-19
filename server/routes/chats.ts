import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// Get all conversations for the current user
router.get('/conversations', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    if (!supabase) {
      // Mock data if supabase is not available
      return res.json([
        {
          id: 'conv-1',
          last_message: 'Is this still available?',
          last_message_at: new Date().toISOString(),
          other_user: {
            id: 'user-2',
            full_name: 'John Doe',
            avatar_url: 'https://picsum.photos/seed/john/100/100'
          },
          listing: {
            id: 'listing-1',
            title: 'iPhone 13 Pro',
            image: 'https://picsum.photos/seed/iphone/100/100'
          }
        }
      ]);
    }

    const token = authHeader.split(' ')[1];
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // Fetch conversations where user is either buyer or seller
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        *,
        buyer:profiles!conversations_buyer_id_fkey(id, full_name, avatar_url),
        seller:profiles!conversations_seller_id_fkey(id, full_name, avatar_url),
        listing:listings(id, title, thumbnail_url)
      `)
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching conversations:', JSON.stringify(error, null, 2));
      if (error.code === '42P01') {
        return res.status(500).json({ 
          error: 'Database table "conversations" is missing. Please create it in Supabase.',
          details: error.message 
        });
      }
      if (error.message?.includes('column') && error.message?.includes('not found')) {
        return res.status(500).json({
          error: 'Database schema mismatch. A required column is missing.',
          details: error.message,
          hint: 'Please run the provided SQL to update your "conversations" table.'
        });
      }
      throw error;
    }

    // Format for frontend
    const formatted = conversations.map(c => {
      const isBuyer = c.buyer_id === user.id;
      return {
        id: c.id,
        last_message: c.last_message,
        last_message_at: c.last_message_at,
        other_user: isBuyer ? c.seller : c.buyer,
        seller: c.seller,
        buyer_unread_count: c.buyer_unread_count,
        seller_unread_count: c.seller_unread_count,
        listing: {
          id: c.listing.id,
          title: c.listing.title,
          image: c.listing.thumbnail_url
        }
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get total unread count for the current user
router.get('/unread-count', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    if (!supabase) return res.json({ count: 0 });

    const token = authHeader.split(' ')[1];
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('buyer_id, seller_id, buyer_unread_count, seller_unread_count')
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);

    if (error) throw error;

    const totalUnread = conversations.reduce((acc, c) => {
      const isBuyer = c.buyer_id === user.id;
      return acc + (isBuyer ? (c.buyer_unread_count || 0) : (c.seller_unread_count || 0));
    }, 0);

    res.json({ count: totalUnread });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// Get messages for a conversation
router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    if (!supabase) {
      return res.json([
        {
          id: 'msg-1',
          content: 'Hello, is this still available?',
          sender_id: 'user-2',
          created_at: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 'msg-2',
          content: 'Yes, it is!',
          sender_id: 'mock-user-123',
          created_at: new Date(Date.now() - 1800000).toISOString()
        }
      ]);
    }

    const token = authHeader.split(' ')[1];
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // Reset unread count for the user in this conversation
    const { data: conv } = await supabase
      .from('conversations')
      .select('buyer_id, seller_id')
      .eq('id', req.params.id)
      .single();

    if (conv) {
      const isBuyer = conv.buyer_id === user.id;
      await supabase
        .from('conversations')
        .update({
          [isBuyer ? 'buyer_unread_count' : 'seller_unread_count']: 0
        })
        .eq('id', req.params.id);
    }

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', req.params.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Filter out messages deleted "for me"
    const filteredMessages = messages.filter(msg => {
      if (msg.sender_id === user.id) {
        return !msg.deleted_by_sender;
      } else {
        return !msg.deleted_by_recipient;
      }
    });

    res.json(filteredMessages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a message in a conversation
router.post('/conversations/:id/messages', async (req, res) => {
  try {
    const { content } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    if (!supabase) {
      return res.json({
        id: Math.random().toString(36).substr(2, 9),
        content,
        sender_id: 'mock-user-123',
        created_at: new Date().toISOString()
      });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const conversation_id = req.params.id;

    // Save message to database
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id,
        sender_id: user.id,
        content
      })
      .select()
      .single();

    if (error) throw error;

    // Update conversation last message and unread count
    const { data: conv } = await supabase
      .from('conversations')
      .select('buyer_id, seller_id, buyer_unread_count, seller_unread_count')
      .eq('id', conversation_id)
      .single();

    if (conv) {
      const isBuyerSender = user.id === conv.buyer_id;
      const updateData = {
        last_message: content,
        last_message_at: new Date().toISOString(),
        buyer_unread_count: isBuyerSender ? (conv.buyer_unread_count || 0) : (conv.buyer_unread_count || 0) + 1,
        seller_unread_count: isBuyerSender ? (conv.seller_unread_count || 0) + 1 : (conv.seller_unread_count || 0)
      };

      await supabase
        .from('conversations')
        .update(updateData)
        .eq('id', conversation_id);
    }

    res.json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Delete a message "for me"
router.delete('/messages/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    if (!supabase) return res.json({ success: true });

    const token = authHeader.split(' ')[1];
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const isSender = message.sender_id === user.id;
    const updateField = isSender ? 'deleted_by_sender' : 'deleted_by_recipient';

    const { error: updateError } = await supabase
      .from('messages')
      .update({ [updateField]: true })
      .eq('id', req.params.id);

    if (updateError) throw updateError;

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Create or get a conversation for a listing
router.post('/conversations', async (req, res) => {
  try {
    const { listing_id, seller_id } = req.body;
    const authHeader = req.headers.authorization;
    
    console.log('Creating conversation for listing:', listing_id, 'seller:', seller_id);

    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    if (!supabase) {
      return res.json({ id: 'conv-1' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error in createConversation:', authError);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(listing_id)) {
      console.error('Invalid listing_id format:', listing_id);
      return res.status(400).json({ error: 'Invalid listing ID format' });
    }
    if (!uuidRegex.test(seller_id)) {
      console.error('Invalid seller_id format:', seller_id);
      return res.status(400).json({ error: 'Invalid seller ID format' });
    }

    // Check if listing exists and get its seller_id to verify
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('title, thumbnail_url, seller_id')
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) {
      console.error('Listing not found or error:', JSON.stringify(listingError, null, 2));
      return res.status(404).json({ error: 'Listing not found', details: listingError?.message });
    }

    const actualSellerId = listing.seller_id;

    if (actualSellerId === user.id) {
      return res.status(400).json({ error: "You can't chat with yourself!" });
    }

    // Check if conversation already exists between this buyer and seller
    const { data: existing, error: findError } = await supabase
      .from('conversations')
      .select('id, listing_id, seller_unread_count, buyer_unread_count')
      .eq('buyer_id', user.id)
      .eq('seller_id', actualSellerId)
      .maybeSingle();

    const initialMessage = `Interested in: ${listing.title}\n[PRODUCT_IMAGE]${listing.thumbnail_url}`;

    if (existing) {
      // If it's a different listing, send a new automated message to clarify the context
      if (existing.listing_id !== listing_id) {
        await supabase
          .from('conversations')
          .update({ 
            listing_id,
            last_message: initialMessage,
            last_message_at: new Date().toISOString(),
            seller_unread_count: (existing.seller_unread_count || 0) + 1
          })
          .eq('id', existing.id);

        // Insert the automated message
        await supabase.from('messages').insert({
          conversation_id: existing.id,
          sender_id: user.id,
          content: initialMessage
        });
      }
      return res.json(existing);
    }

    // Create new conversation
    const { data: conversation, error: createError } = await supabase
      .from('conversations')
      .insert({
        listing_id,
        buyer_id: user.id,
        seller_id: actualSellerId,
        last_message: initialMessage,
        last_message_at: new Date().toISOString(),
        seller_unread_count: 1
      })
      .select()
      .single();

    if (createError) {
      // ... error handling ...
    }

    // Insert the initial automated message
    if (conversation) {
      await supabase.from('messages').insert({
        conversation_id: conversation.id,
        sender_id: user.id,
        content: initialMessage
      });
    }

    res.json(conversation);
  } catch (error) {
    console.error('Unexpected error creating conversation:', error);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
});

export default router;
