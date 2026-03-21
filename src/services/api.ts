import { getOptimizedImageUrl } from '../lib/imageUtils';

export interface Category {
  id: string;
  name: string;
  count: number;
  icon: string;
  parent_id?: string;
}

export interface Listing {
  id: string | number;
  title: string;
  price: number;
  location: string;
  image: string;
  images?: string[];
  isPromoted: boolean;
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
  description?: string;
  sellerName?: string;
  seller_id?: string;
  postedAt?: string;
  status?: 'active' | 'sold' | 'pending' | 'rejected';
  isFavorited?: boolean;
}

export interface Stat {
  label: string;
  value: string;
  change: string;
  icon: string;
  color: string;
  bg: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  phone?: string;
  location?: string;
  role: string;
}

export interface Report {
  id: string;
  listing_id: string | number;
  reporter_id: string;
  reason: string;
  details?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
  listing?: {
    id: string | number;
    title: string;
    thumbnail_url: string;
  };
  reporter?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface Review {
  id: string;
  reviewer_id: string;
  seller_id: string;
  listing_id?: string | number;
  rating: number;
  comment?: string;
  created_at: string;
  reviewer?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

let categoriesCache: Category[] | null = null;

export const api = {
  categories: {
    getAll: async (): Promise<Category[]> => {
      // Try memory cache first
      if (categoriesCache) return categoriesCache;
      
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      
      const data = await response.json();
      categoriesCache = data;
      return data;
    },
    create: async (name: string, icon: string, parent_id?: string): Promise<Category> => {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, icon, parent_id }),
      });
      if (!response.ok) throw new Error('Failed to create category');
      categoriesCache = null; // Invalidate cache
      return response.json();
    },
    delete: async (id: string): Promise<void> => {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete category');
      categoriesCache = null; // Invalidate cache
    },
    seed: async (): Promise<any> => {
      const response = await fetch('/api/categories/seed', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to seed categories');
      categoriesCache = null; // Invalidate cache
      return response.json();
    },
    syncCounts: async (): Promise<any> => {
      const response = await fetch('/api/categories/sync-counts', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to sync category counts');
      categoriesCache = null; // Invalidate cache
      return response.json();
    },
  },
  listings: {
    getAll: async (params?: { 
      search?: string; 
      category?: string; 
      status?: string; 
      seller_id?: string;
      sort?: string;
      order?: 'asc' | 'desc';
      min_price?: number;
      max_price?: number;
      location?: string;
    }, token?: string): Promise<Listing[]> => {
      const queryParams = new URLSearchParams();
      if (params?.search) queryParams.append('search', params.search);
      if (params?.category) queryParams.append('category', params.category);
      if (params?.status) queryParams.append('status', params.status);
      if (params?.seller_id) queryParams.append('seller_id', params.seller_id);
      if (params?.sort) queryParams.append('sort', params.sort);
      if (params?.order) queryParams.append('order', params.order);
      if (params?.min_price) queryParams.append('min_price', params.min_price.toString());
      if (params?.max_price) queryParams.append('max_price', params.max_price.toString());
      if (params?.location) queryParams.append('location', params.location);
      
      const url = `/api/listings${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await fetch(url, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (!response.ok) throw new Error('Failed to fetch listings');
      const data: Listing[] = await response.json();
      
      // Apply default optimization to image and images
      return data.map(listing => ({
        ...listing,
        image: getOptimizedImageUrl(listing.image, { width: 800, height: 600 }),
        images: listing.images?.map(img => getOptimizedImageUrl(img, { width: 800, height: 600 }))
      }));
    },
    getById: async (id: string | number, token?: string): Promise<Listing | null> => {
      const response = await fetch(`/api/listings/${id}`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (!response.ok) return null;
      const data: Listing = await response.json();
      return {
        ...data,
        image: getOptimizedImageUrl(data.image, { width: 800, height: 600 }),
        images: data.images?.map(img => getOptimizedImageUrl(img, { width: 800, height: 600 }))
      };
    },
    create: async (listing: Omit<Listing, 'id'>, token?: string): Promise<Listing> => {
      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(listing),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create listing' }));
        throw new Error(JSON.stringify(errorData));
      }
      const data: Listing = await response.json();
      return {
        ...data,
        image: getOptimizedImageUrl(data.image, { width: 800, height: 600 }),
        images: data.images?.map(img => getOptimizedImageUrl(img, { width: 800, height: 600 }))
      };
    },
    update: async (id: string | number, updates: Partial<Listing>, token?: string): Promise<Listing> => {
      const response = await fetch(`/api/listings/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update listing' }));
        throw new Error(JSON.stringify(errorData));
      }
      const data: Listing = await response.json();
      return {
        ...data,
        image: getOptimizedImageUrl(data.image, { width: 800, height: 600 }),
        images: data.images?.map(img => getOptimizedImageUrl(img, { width: 800, height: 600 }))
      };
    },
    delete: async (id: string | number, token: string): Promise<void> => {
      const response = await fetch(`/api/listings/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete listing');
    },
    toggleFavorite: async (listingId: string | number, token: string): Promise<{ favorited: boolean }> => {
      const response = await fetch(`/api/listings/${listingId}/favorite`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to toggle favorite');
      return response.json();
    },
    getFavorites: async (token: string): Promise<Listing[]> => {
      const response = await fetch('/api/listings/favorites', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch favorites');
      const data: Listing[] = await response.json();
      return data.map(listing => ({
        ...listing,
        image: getOptimizedImageUrl(listing.image, { width: 800, height: 600 }),
        images: listing.images?.map(img => getOptimizedImageUrl(img, { width: 800, height: 600 }))
      }));
    },
  },
  stats: {
    getAll: async (): Promise<Stat[]> => {
      const response = await fetch('/api/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
  },
  users: {
    getMe: async (token: string): Promise<UserProfile> => {
      const response = await fetch('/api/users/me', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch profile');
      return response.json();
    },
    getAll: async (token: string): Promise<UserProfile[]> => {
      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
    getById: async (id: string): Promise<UserProfile> => {
      const response = await fetch(`/api/users/${id}`);
      if (!response.ok) throw new Error('Failed to fetch user');
      return response.json();
    },
    updateMe: async (profile: Partial<UserProfile>, token: string): Promise<UserProfile> => {
      const response = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(profile),
      });
      if (!response.ok) throw new Error('Failed to update profile');
      return response.json();
    },
    deleteMe: async (token: string): Promise<void> => {
      const response = await fetch('/api/users/me', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete account');
    },
    uploadAvatar: async (file: File, token: string): Promise<UserProfile> => {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/users/upload-avatar', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}` 
        },
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to upload avatar');
      return response.json();
    },
    updateStatus: async (id: string, status: string, token: string): Promise<UserProfile> => {
      const response = await fetch(`/api/users/${id}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update user status');
      return response.json();
    }
  },
  chats: {
    getUnreadCount: async (token: string): Promise<{ count: number }> => {
      const response = await fetch('/api/chats/unread-count', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch unread count');
      return response.json();
    },
    getConversations: async (token: string): Promise<any[]> => {
      const response = await fetch('/api/chats/conversations', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch conversations');
      return response.json();
    },
    getMessages: async (conversationId: string, token: string): Promise<any[]> => {
      const response = await fetch(`/api/chats/conversations/${conversationId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    sendMessage: async (conversationId: string, content: string, token: string): Promise<any> => {
      const response = await fetch(`/api/chats/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    deleteMessage: async (messageId: string, token: string): Promise<any> => {
      const response = await fetch(`/api/chats/messages/${messageId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete message');
      return response.json();
    },
    createConversation: async (listingId: string | number, sellerId: string, token: string): Promise<any> => {
      const response = await fetch('/api/chats/conversations', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ listing_id: listingId, seller_id: sellerId }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create conversation' }));
        throw new Error(errorData.error || errorData.details || 'Failed to create conversation');
      }
      return response.json();
    },
  },
  reports: {
    create: async (report: { listing_id: string | number; reason: string; details?: string }, token: string): Promise<Report> => {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(report),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to submit report' }));
        throw new Error(errorData.error || errorData.details || 'Failed to submit report');
      }
      return response.json();
    },
    getAll: async (token: string): Promise<Report[]> => {
      const response = await fetch('/api/reports', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch reports' }));
        throw new Error(errorData.error || errorData.details || 'Failed to fetch reports');
      }
      return response.json();
    },
    updateStatus: async (id: string, status: string, token: string): Promise<Report> => {
      const response = await fetch(`/api/reports/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update report status');
      return response.json();
    }
  },
  reviews: {
    getForSeller: async (sellerId: string): Promise<Review[]> => {
      const response = await fetch(`/api/reviews/seller/${sellerId}`);
      if (!response.ok) throw new Error('Failed to fetch reviews');
      return response.json();
    },
    create: async (review: { seller_id: string; listing_id?: string | number; rating: number; comment?: string }, token: string): Promise<Review> => {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(review),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to submit review' }));
        throw new Error(errorData.error || errorData.details || 'Failed to submit review');
      }
      return response.json();
    }
  }
};
