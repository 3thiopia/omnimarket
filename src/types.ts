export interface Listing {
  id: number;
  title: string;
  price: number;
  location: string;
  image: string;
  images?: string[];
  isPromoted: boolean;
  description?: string;
  category?: string;
  categoryIcon?: string;
  sellerName?: string;
  postedAt?: string;
  status?: 'pending' | 'approved' | 'rejected';
  views?: number;
  isFavorited?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  joinedAt: string;
  status: 'active' | 'blocked';
}
