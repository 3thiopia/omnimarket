export interface Listing {
  id: string | number;
  title: string;
  price: number;
  location: string;
  image: string;
  images?: string[];
  isPromoted: boolean;
  description?: string;
  category?: string;
  categoryIcon?: string;
  category_id?: string;
  category_data?: {
    name: string;
    icon: string;
    parent?: {
      name: string;
    } | null;
  };
  sellerName?: string;
  seller_id?: string;
  postedAt?: string;
  status?: 'active' | 'sold' | 'pending' | 'hidden' | 'deleted';
  views?: number;
  isFavorited?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  joinedAt: string;
  status: 'active' | 'banned' | 'suspended';
}
