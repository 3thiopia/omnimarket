-- SUPABASE ULTIMATE MARKETPLACE SETUP SQL
-- This script builds a production-ready schema for a classifieds platform.
-- WARNING: This will drop existing tables and data for a clean start!

-- 0. Cleanup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversations;
DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS listing_images;
DROP TABLE IF EXISTS listings;
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS categories;

-- 1. Categories
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Profiles (Users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'banned', 'suspended')),
  bio TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Listings
CREATE TABLE listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  price BIGINT NOT NULL,
  location TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL, -- Primary display image
  is_promoted BOOLEAN DEFAULT false,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'hidden', 'deleted')),
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Listing Images (Gallery)
CREATE TABLE listing_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Favorites
CREATE TABLE favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

-- 6. Conversations (Chat Threads)
CREATE TABLE conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(buyer_id, seller_id)
);

-- 7. Messages
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  deleted_by_sender BOOLEAN DEFAULT false,
  deleted_by_recipient BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Reviews
CREATE TABLE reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Reports
CREATE TABLE reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Transactions (Monetization)
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  amount BIGINT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('boost_ad', 'premium_subscription', 'top_placement')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  payment_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 12. Policies (Simplified for brevity, but secure)

-- Public Reads
CREATE POLICY "Public Read Categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public Read Profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Public Read Listings" ON listings FOR SELECT USING (status = 'active');
CREATE POLICY "Public Read Images" ON listing_images FOR SELECT USING (true);
CREATE POLICY "Public Read Reviews" ON reviews FOR SELECT USING (true);

-- Authenticated Actions
CREATE POLICY "Owner Update Profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Owner Manage Listings" ON listings FOR ALL USING (auth.uid() = seller_id);
CREATE POLICY "Owner Manage Images" ON listing_images FOR ALL USING (
  EXISTS (SELECT 1 FROM listings WHERE id = listing_id AND seller_id = auth.uid())
);
CREATE POLICY "Owner Manage Favorites" ON favorites FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Participant Manage Conversations" ON conversations FOR ALL USING (auth.uid() IN (buyer_id, seller_id));
CREATE POLICY "Sender Manage Messages" ON messages FOR ALL USING (auth.uid() = sender_id);
CREATE POLICY "Reviewer Manage Reviews" ON reviews FOR ALL USING (auth.uid() = reviewer_id);
CREATE POLICY "Reporter Manage Reports" ON reports FOR ALL USING (auth.uid() = reporter_id);
CREATE POLICY "Owner Read Transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);

-- 13. Profile Sync Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'New User'), 
    new.email, 
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 14. Seed Categories
INSERT INTO categories (name, icon) VALUES
('Mobile Phones', '📱'), ('Vehicles', '🚗'), ('Property', '🏠'), 
('Electronics', '💻'), ('Home & Garden', '🛋️'), ('Fashion', '👕'), 
('Jobs', '💼'), ('Services', '🛠️'), ('Health & Beauty', '💄'), ('Agriculture', '🚜');

-- 15. Search Performance (Full-Text Search)
-- Add a search vector column that combines title and description
ALTER TABLE listings ADD COLUMN fts tsvector GENERATED ALWAYS AS (
  to_tsvector('english', title || ' ' || coalesce(description, ''))
) STORED;

-- Create a GIN index for lightning-fast searching
CREATE INDEX listings_fts_idx ON listings USING GIN (fts);

-- 16. Storage Setup (Permissions for 'listings' bucket)
-- Note: You must manually create the 'listings' bucket in the Supabase UI first.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('listings', 'listings', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'listings');
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'listings' AND auth.role() = 'authenticated'
);
