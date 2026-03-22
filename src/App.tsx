import { useState, useEffect, FormEvent } from 'react';
import { CategoryBar } from './components/CategoryBar';
import { ListingCard } from './components/ListingCard';
import { PostAdModal } from './components/PostAdModal';
import { AuthModal } from './components/AuthModal';
import { ProductDetail } from './components/ProductDetail';
import { AdminDashboard } from './components/AdminDashboard';
import { MyListings } from './components/MyListings';
import { ProfileView } from './components/ProfileView';
import { ChatView } from './components/ChatView';
import { BottomNav } from './components/BottomNav';
import { ConfirmationModal } from './components/ConfirmationModal';
import { api, Listing } from './services/api';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { ETHIOPIAN_LOCATIONS } from './constants/locations';
import { ShieldCheck, Search, PlusCircle, LayoutGrid, List, Settings, LogOut, User, Home, Package, MessageCircle, Filter, ArrowUpDown, X, MapPin } from 'lucide-react';
import { supabase } from './lib/supabase';

export default function App() {
  const [isPostAdOpen, setIsPostAdOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedProduct, setSelectedProduct] = useState<Listing | null>(null);
  const [isAdminView, setIsAdminView] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'items' | 'sell' | 'profile' | 'messages'>('home');
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingConversationId, setPendingConversationId] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'created_at' | 'price'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [regionFilter, setRegionFilter] = useState<string>('');
  const [subRegionFilter, setSubRegionFilter] = useState<string>('');
  const [isDeletingListing, setIsDeletingListing] = useState<string | number | null>(null);

  useEffect(() => {
    if (isAdminView && userProfile && userProfile.role !== 'admin') {
      setIsAdminView(false);
    }
  }, [isAdminView, userProfile]);

  useEffect(() => {
    fetchListings();
    
    // Check for listing query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const listingId = urlParams.get('listing');
    if (listingId) {
      handleOpenListing(listingId);
    }
    
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser({ ...session.user, token: session.access_token });
        fetchUserProfile(session.access_token);
      } else {
        setUser(null);
        setUserProfile(null);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser({ ...session.user, token: session.access_token });
        fetchUserProfile(session.access_token);
      } else {
        setUser(null);
        setUserProfile(null);
        setIsAdminView(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (token: string) => {
    try {
      const profile = await api.users.getMe(token);
      setUserProfile(profile);
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const { count } = await api.chats.getUnreadCount(session.access_token);
        setUnreadCount(count);
      } else {
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
  }, [user]);

  // Refresh unread count when switching to messages tab
  useEffect(() => {
    if (activeTab === 'messages') {
      fetchUnreadCount();
    }
  }, [activeTab]);

  // Update location filter when region or sub-region changes
  useEffect(() => {
    if (subRegionFilter) {
      setLocationFilter(subRegionFilter);
    } else if (regionFilter) {
      setLocationFilter(regionFilter);
    } else {
      setLocationFilter('');
    }
  }, [regionFilter, subRegionFilter]);

  const handleOpenListing = async (id: string | number) => {
    try {
      const listing = await api.listings.getById(id);
      if (listing) {
        setSelectedProduct(listing);
        // Clear query param without reloading
        const url = new URL(window.location.href);
        url.searchParams.delete('listing');
        window.history.replaceState({}, '', url.toString());
      }
    } catch (err) {
      console.error('Error fetching shared listing:', err);
    }
  };

  const fetchListings = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const data = await api.listings.getAll({ 
        search: searchQuery || undefined, 
        category: selectedCategory || undefined,
        sort: sortBy,
        order: sortOrder,
        min_price: minPrice ? parseFloat(minPrice) : undefined,
        max_price: maxPrice ? parseFloat(maxPrice) : undefined,
        location: locationFilter || undefined
      }, session?.access_token);
      setListings(data);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    fetchListings();
  };

  // Refetch when sorting, category, or user changes
  useEffect(() => {
    if (activeTab === 'home') {
      fetchListings();
    }
  }, [selectedCategory, sortBy, sortOrder, user]);

  const handleSellClick = () => {
    if (!user) {
      setIsAuthOpen(true);
    } else {
      setIsPostAdOpen(true);
    }
  };

  const handleToggleFavorite = async (listingId: string | number) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const { favorited } = await api.listings.toggleFavorite(listingId, session.access_token);
      
      // Update local state
      setListings(prev => prev.map(l => l.id === listingId ? { ...l, isFavorited: favorited } : l));
      
      // Update selectedProduct if it's the one being favorited
      if (selectedProduct?.id === listingId) {
        setSelectedProduct(prev => prev ? { ...prev, isFavorited: favorited } : null);
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const handleDeleteListing = async (listingId: string | number) => {
    setIsDeletingListing(listingId);
  };

  const confirmDeleteListing = async () => {
    if (!isDeletingListing) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      await api.listings.delete(isDeletingListing, session.access_token);
      setListings(prev => prev.filter(l => l.id !== isDeletingListing));
      if (selectedProduct?.id === isDeletingListing) {
        setSelectedProduct(null);
      }
      setIsDeletingListing(null);
    } catch (error) {
      console.error('Error deleting listing:', error);
      toast.error('Failed to delete listing');
    }
  };

  useEffect(() => {
    const handleNavigation = (e: any) => {
      const { conversationId } = e.detail || {};
      if (conversationId) {
        setPendingConversationId(conversationId);
      }
      setActiveTab('messages');
      setSelectedProduct(null);
    };

    window.addEventListener('navigate-to-chat', handleNavigation);
    window.addEventListener('refresh-unread-count', fetchUnreadCount);
    return () => {
      window.removeEventListener('navigate-to-chat', handleNavigation);
      window.removeEventListener('refresh-unread-count', fetchUnreadCount);
    };
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setActiveTab('home');
  };

  const handleStartChat = (conversationId: string) => {
    setPendingConversationId(conversationId);
    setActiveTab('messages');
    setSelectedProduct(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20 lg:pb-0">
      <Toaster position="top-right" />
      {!isAdminView && !selectedProduct && (
        <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-4">
            {/* Logo */}
            <div 
              onClick={() => {
                setActiveTab('home');
                setSelectedProduct(null);
                setIsAdminView(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex-shrink-0 flex items-center gap-2 cursor-pointer"
            >
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">O</span>
              </div>
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
                Omni<span className="text-emerald-500">Market</span>
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-8">
              <button 
                onClick={() => {
                  setActiveTab('home');
                  setSelectedProduct(null);
                  setIsAdminView(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex items-center gap-2 font-bold transition-colors ${activeTab === 'home' ? 'text-emerald-500' : 'text-gray-500 hover:text-emerald-500'}`}
              >
                <Home className="w-5 h-5" />
                <span>Home</span>
              </button>
              <button 
                onClick={() => {
                  if (!user) {
                    setIsAuthOpen(true);
                    return;
                  }
                  setActiveTab('items');
                  setSelectedProduct(null);
                  setIsAdminView(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex items-center gap-2 font-bold transition-colors ${activeTab === 'items' ? 'text-emerald-500' : 'text-gray-500 hover:text-emerald-500'}`}
              >
                <Package className="w-5 h-5" />
                <span>My Items</span>
              </button>
              <button 
                onClick={() => {
                  setActiveTab('messages');
                  fetchUnreadCount();
                }}
                className={`flex items-center gap-2 font-bold transition-colors relative ${activeTab === 'messages' ? 'text-emerald-500' : 'text-gray-500 hover:text-emerald-500'}`}
              >
                <div className="relative">
                  <MessageCircle className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <div className="absolute -top-2 -right-2">
                      <div className="relative">
                        <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-25"></div>
                        <div className="bg-red-500 text-white text-[10px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow-lg border-2 border-white leading-none">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <span>Chat</span>
              </button>
              <button 
                onClick={() => {
                  setActiveTab('profile');
                  if (!user) {
                    setIsAuthOpen(true);
                  }
                }}
                className={`flex items-center gap-2 font-bold transition-colors ${activeTab === 'profile' ? 'text-emerald-500' : 'text-gray-500 hover:text-emerald-500'}`}
              >
                <User className="w-5 h-5" />
                <span>Account</span>
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-4">
              {userProfile?.role === 'admin' && (
                <>
                  <button 
                    onClick={() => setIsAdminView(true)}
                    className="text-gray-400 hover:text-emerald-500 transition-colors flex items-center gap-1 font-medium text-xs sm:text-sm"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span className="hidden xs:inline">Admin</span>
                  </button>
                  <div className="h-6 w-[1px] bg-gray-200 hidden sm:block"></div>
                </>
              )}
              
              {user ? (
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="hidden sm:flex items-center gap-2 text-gray-600 font-medium">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                    <span className="text-sm truncate max-w-[100px]">{user.email}</span>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="text-gray-400 hover:text-red-500 transition-colors p-2"
                    title="Log Out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAuthOpen(true)}
                  className="text-gray-600 hover:text-emerald-500 transition-colors flex items-center gap-1 font-medium text-sm"
                >
                  <PlusCircle className="w-5 h-5" />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              )}

              <button 
                onClick={handleSellClick}
                className="bg-orange-500 text-white px-4 sm:px-6 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-95 text-sm sm:text-base"
              >
                <PlusCircle className="w-5 h-5" />
                <span>SELL</span>
              </button>
            </div>
          </div>
        </div>
      </nav>
    )}
      
      <main className={`${viewMode === 'grid' ? 'max-w-7xl' : 'max-w-3xl'} mx-auto pb-20 lg:pb-0 px-4 transition-all duration-500`}>
        {isAdminView && userProfile?.role === 'admin' ? (
          <AdminDashboard 
            listings={listings} 
            onBack={() => setIsAdminView(false)} 
          />
        ) : selectedProduct ? (
          <ProductDetail 
            product={selectedProduct} 
            onBack={() => setSelectedProduct(null)} 
            onViewProduct={(listing) => setSelectedProduct(listing)}
            onStartChat={handleStartChat}
            onEdit={(listing) => {
              setEditingListing(listing);
              setIsPostAdOpen(true);
            }}
            onDelete={handleDeleteListing}
          />
        ) : activeTab === 'items' ? (
          <MyListings 
            onBack={() => setActiveTab('home')}
            onViewProduct={(listing) => setSelectedProduct(listing)}
            onEditProfile={() => setActiveTab('profile')}
          />
        ) : activeTab === 'profile' ? (
          <ProfileView 
            onLogout={handleLogout} 
            onBack={() => setActiveTab('home')}
          />
        ) : activeTab === 'messages' ? (
          <ChatView 
            initialConversationId={pendingConversationId} 
            onConversationSelected={() => setPendingConversationId(null)}
          />
        ) : (
          <>
            {/* Sticky Search Bar */}
            <div className="sticky top-16 z-40 bg-gray-50/95 backdrop-blur-md py-3 sm:py-4 -mx-4 px-4 mb-4 border-b border-gray-200/50">
          <motion.form 
            onSubmit={handleSearch}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center bg-white rounded-2xl px-3 sm:px-4 py-2 sm:py-3 gap-2 sm:gap-3 shadow-lg shadow-gray-200/50 border border-gray-100 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all"
          >
            <Search className="w-5 h-5 text-gray-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for anything..."
              className="bg-transparent border-none focus:ring-0 w-full text-sm sm:text-base outline-none font-medium placeholder:text-gray-400"
            />
            <button 
              type="submit"
              className="bg-emerald-500 text-white px-4 sm:px-5 py-1.5 sm:py-2 rounded-xl font-bold hover:bg-emerald-600 transition-all active:scale-95 shrink-0 text-xs sm:text-base shadow-lg shadow-emerald-500/20"
            >
              Search
            </button>
            <button 
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`p-1.5 sm:p-2 rounded-xl border transition-all flex items-center gap-1 sm:gap-2 ${isFilterOpen ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'}`}
            >
              <Filter className="w-4 h-4 sm:w-5 h-5" />
              <span className="text-xs sm:text-sm font-bold hidden xs:inline">Filters</span>
            </button>
          </motion.form>

          {/* Filter Pane */}
          <AnimatePresence>
            {isFilterOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white rounded-2xl p-4 mt-3 border border-gray-100 shadow-xl shadow-gray-200/50 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Sorting */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sort By</label>
                    <div className="flex gap-2">
                      <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="flex-1 bg-gray-50 border-none rounded-xl px-3 py-2 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      >
                        <option value="created_at">Date Posted</option>
                        <option value="price">Price</option>
                      </select>
                      <button 
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="p-2 bg-gray-50 rounded-xl text-gray-500 hover:text-emerald-500 transition-colors"
                      >
                        <ArrowUpDown className={`w-4 h-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Price Range */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Price Range (Br)</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        placeholder="Min"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        className="w-full bg-gray-50 border-none rounded-xl px-3 py-2 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      />
                      <span className="text-gray-300">-</span>
                      <input 
                        type="number" 
                        placeholder="Max"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        className="w-full bg-gray-50 border-none rounded-xl px-3 py-2 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      />
                    </div>
                  </div>

                  {/* Location */}
                  <div className="space-y-2 sm:col-span-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Location</label>
                    <div className="space-y-2">
                      <div className="relative">
                        <select 
                          value={regionFilter}
                          onChange={(e) => {
                            setRegionFilter(e.target.value);
                            setSubRegionFilter('');
                          }}
                          className="w-full bg-gray-50 border-none rounded-xl px-3 py-2 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500/20 outline-none appearance-none cursor-pointer"
                        >
                          <option value="">All Regions</option>
                          {ETHIOPIAN_LOCATIONS.map(loc => (
                            <option key={loc.name} value={loc.name}>{loc.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      {regionFilter && ETHIOPIAN_LOCATIONS.find(l => l.name === regionFilter)?.subRegions && (
                        <div className="relative">
                          <select 
                            value={subRegionFilter}
                            onChange={(e) => setSubRegionFilter(e.target.value)}
                            className="w-full bg-gray-50 border-none rounded-xl px-3 py-2 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500/20 outline-none appearance-none cursor-pointer"
                          >
                            <option value="">All Sub-Regions</option>
                            {ETHIOPIAN_LOCATIONS.find(l => l.name === regionFilter)?.subRegions?.map(sub => (
                              <option key={sub} value={sub}>{sub}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Apply Button */}
                  <div className="sm:col-span-3 flex justify-end gap-2 pt-2 border-t border-gray-50">
                    <button 
                      onClick={() => {
                        setMinPrice('');
                        setMaxPrice('');
                        setLocationFilter('');
                        setRegionFilter('');
                        setSubRegionFilter('');
                        setSelectedCategory(null);
                        setSortBy('created_at');
                        setSortOrder('desc');
                      }}
                      className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      Reset All
                    </button>
                    <button 
                      onClick={() => {
                        fetchListings();
                        setIsFilterOpen(false);
                      }}
                      className="bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Categories */}
        <section className="mb-8">
          <CategoryBar 
            selectedId={selectedCategory} 
            onSelect={(id) => {
              const newId = selectedCategory === id ? null : id;
              setSelectedCategory(newId);
            }} 
          />
        </section>

        {/* Listings Section */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Recent Listings</h2>
              <p className="text-gray-500 text-sm font-medium">Showing {viewMode} view</p>
            </div>
            
            <div className="flex items-center bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'text-gray-400 hover:bg-gray-50'}`}
              >
                <List className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'text-gray-400 hover:bg-gray-50'}`}
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className={`grid gap-3 sm:gap-4 ${viewMode === 'grid' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'flex flex-col'}`}>
            {isLoading ? (
              <div className="flex justify-center py-20 col-span-full">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : listings.length === 0 ? (
              <div className="text-center py-20 col-span-full">
                <p className="text-gray-500 font-medium">No listings found. Be the first to sell!</p>
              </div>
            ) : (
              listings.map((listing) => (
                <ListingCard 
                  key={listing.id} 
                  title={listing.title}
                  price={listing.price}
                  location={listing.location}
                  image={listing.image}
                  category={listing.category_data?.parent ? `${listing.category_data.parent.name} > ${listing.category_data.name}` : (listing.category_data?.name || listing.category)}
                  categoryIcon={listing.category_data?.icon || listing.categoryIcon}
                  isPromoted={listing.isPromoted}
                  isFavorited={listing.isFavorited}
                  viewMode={viewMode} 
                  onClick={() => setSelectedProduct(listing)}
                  onFavorite={() => handleToggleFavorite(listing.id)}
                />
              ))
            )}
          </div>
        </section>

        {/* Why Omni Section */}
        <section className="px-4 py-16 bg-white rounded-[3rem] my-12 mx-4 border border-gray-100">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl font-black text-gray-900 mb-4">Why Choose OmniMarket?</h2>
            <p className="text-gray-500 text-lg">We make buying and selling safe, fast and easy for everyone.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-12 text-center">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mb-6">
                <ShieldCheck className="w-10 h-10 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Verified Sellers</h3>
              <p className="text-gray-500">Every seller is verified by our security team to ensure your safety.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center mb-6">
                <PlusCircle className="w-10 h-10 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Free Posting</h3>
              <p className="text-gray-500">Post your ads for free and reach millions of potential buyers instantly.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mb-6">
                <Search className="w-10 h-10 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Smart Search</h3>
              <p className="text-gray-500">Find exactly what you need with our advanced filtering and search.</p>
            </div>
          </div>
        </section>
          </>
        )}
      </main>

      {!isAdminView && !selectedProduct && (
        <>
          <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-4 gap-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-2xl">O</span>
              </div>
              <span className="text-3xl font-bold tracking-tight">
                Omni<span className="text-emerald-500">Market</span>
              </span>
            </div>
            <p className="text-gray-400 max-w-md text-lg leading-relaxed">
              The leading online marketplace in Africa. We connect buyers and sellers in a safe and secure environment.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-xl mb-6">Quick Links</h4>
            <ul className="space-y-4 text-gray-400">
              <li><a href="#" className="hover:text-emerald-500 transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-emerald-500 transition-colors">Contact Support</a></li>
              <li><a href="#" className="hover:text-emerald-500 transition-colors">Safety Tips</a></li>
              <li><a href="#" className="hover:text-emerald-500 transition-colors">Terms of Service</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-xl mb-6">Categories</h4>
            <ul className="space-y-4 text-gray-400">
              <li><a href="#" className="hover:text-emerald-500 transition-colors">Mobile Phones</a></li>
              <li><a href="#" className="hover:text-emerald-500 transition-colors">Vehicles</a></li>
              <li><a href="#" className="hover:text-emerald-500 transition-colors">Property</a></li>
              <li><a href="#" className="hover:text-emerald-500 transition-colors">Electronics</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-16 pt-8 border-t border-gray-800 text-center text-gray-500">
          <p>© 2026 OmniMarket. All rights reserved.</p>
        </div>
      </footer>

      <BottomNav 
        activeTab={activeTab}
        unreadCount={unreadCount}
        onHome={() => {
          setActiveTab('home');
          setSelectedProduct(null);
          setIsAdminView(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onItems={() => {
          if (!user) {
            setIsAuthOpen(true);
            return;
          }
          setActiveTab('items');
          setSelectedProduct(null);
          setIsAdminView(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onSell={() => {
          setActiveTab('sell');
          handleSellClick();
        }}
        onMessages={() => {
          setActiveTab('messages');
          fetchUnreadCount();
        }}
        onProfile={() => {
          setActiveTab('profile');
          if (!user) {
            setIsAuthOpen(true);
          } else {
            // Future: Open profile view
          }
        }}
      />
      </>
    )}

      <PostAdModal 
        isOpen={isPostAdOpen} 
        onClose={() => {
          setIsPostAdOpen(false);
          setEditingListing(null);
        }}
        onSuccess={() => {
          setIsPostAdOpen(false);
          setEditingListing(null);
          fetchListings();
        }}
        editListing={editingListing}
      />
      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        onSuccess={() => {}} 
      />

      <ConfirmationModal
        isOpen={!!isDeletingListing}
        onClose={() => setIsDeletingListing(null)}
        onConfirm={confirmDeleteListing}
        title="Delete Listing"
        message="Are you sure you want to delete this listing? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}

