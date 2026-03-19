export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  icon: string;
  slug: string;
};

export type Listing = {
  id: string;
  title: string;
  description: string;
  price: number;
  category_id: string;
  user_id: string;
  images: string[];
  location: string;
  created_at: string;
  is_promoted: boolean;
};
