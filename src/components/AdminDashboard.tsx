import { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  BarChart3, 
  Settings, 
  Search, 
  MoreVertical,
  CheckCircle2,
  XCircle,
  Trash2,
  ExternalLink,
  ArrowLeft,
  Menu,
  X,
  Plus,
  Edit2,
  FolderTree,
  Flag,
  UserX,
  MapPin,
  RotateCcw,
  History,
  Clock
} from 'lucide-react';
import { getOptimizedImageUrl } from '../lib/imageUtils';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Listing, User } from '../types';
import { api, Category, Stat, Report, UserProfile } from '../services/api';
import { ConfirmationModal } from './ConfirmationModal';

interface AdminDashboardProps {
  listings: Listing[];
  onBack: () => void;
}

const ICON_MAP: Record<string, any> = {
  Package,
  Users,
  BarChart3,
  FolderTree
};

export const AdminDashboard = ({ listings, onBack }: AdminDashboardProps) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'listings' | 'users' | 'categories' | 'reports'>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [localListings, setLocalListings] = useState<Listing[]>(listings);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📁');
  const [newCategoryParentId, setNewCategoryParentId] = useState<string>('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editParentId, setEditParentId] = useState<string>('');
  const [stats, setStats] = useState<Stat[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [reportView, setReportView] = useState<'active' | 'history'>('active');
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'info'
  });

  useEffect(() => {
    if (activeTab === 'categories') {
      fetchCategories();
    }
    if (activeTab === 'overview') {
      fetchStats();
    }
    if (activeTab === 'listings') {
      fetchListings();
    }
    if (activeTab === 'reports') {
      fetchReports();
    }
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchReports = async () => {
    setIsLoadingReports(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const data = await api.reports.getAll(session.access_token);
      setReports(data);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setIsLoadingReports(false);
    }
  };

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const data = await api.users.getAll(session.access_token);
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleUpdateUserStatus = async (userId: string, status: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await api.users.updateStatus(userId, status, session.access_token);
      toast.success(`User status updated to ${status}`);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleUpdateReportStatus = async (id: string, status: Report['status']) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await api.reports.updateStatus(id, status, session.access_token);
      fetchReports();
    } catch (error) {
      console.error('Error updating report status:', error);
    }
  };

  const handleReportAction = async (report: Report, action: 'unlist' | 'delete' | 'ban' | 'dismiss' | 'resolve') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const token = session.access_token;

      if (action === 'unlist') {
        await api.listings.update(report.listing_id, { status: 'hidden' }, token);
        await api.reports.updateStatus(report.id, 'resolved', token);
        toast.success('Listing unlisted and report resolved');
      } else if (action === 'delete') {
        setConfirmModal({
          isOpen: true,
          title: 'Delete Listing',
          message: 'Are you sure you want to delete this listing? This will also resolve the report.',
          type: 'danger',
          onConfirm: async () => {
            try {
              await fetch(`/api/listings/${report.listing_id}`, { 
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
              });
              await api.reports.updateStatus(report.id, 'resolved', token);
              toast.success('Listing deleted and report resolved');
              fetchReports();
              fetchListings();
            } catch (error) {
              console.error('Error deleting listing from report:', error);
              toast.error('Failed to delete listing');
            }
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
          }
        });
        return; // Modal handles the rest
      } else if (action === 'ban') {
        const sellerId = report.listing?.seller_id;
        if (!sellerId) {
          toast.error('Could not find seller information');
          return;
        }
        setConfirmModal({
          isOpen: true,
          title: 'Ban Seller',
          message: 'Are you sure you want to ban the seller of this listing? This will also resolve the report.',
          type: 'danger',
          onConfirm: async () => {
            try {
              await api.users.updateStatus(sellerId, 'banned', token);
              await api.reports.updateStatus(report.id, 'resolved', token);
              toast.success('Seller banned and report resolved');
              fetchReports();
              fetchUsers();
            } catch (error) {
              console.error('Error banning seller:', error);
              toast.error('Failed to ban seller');
            }
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
          }
        });
        return;
      } else if (action === 'dismiss') {
        await api.reports.updateStatus(report.id, 'dismissed', token);
        toast.success('Report dismissed');
      } else if (action === 'resolve') {
        await api.reports.updateStatus(report.id, 'resolved', token);
        toast.success('Report marked as resolved');
      }

      fetchReports();
      fetchListings();
    } catch (error) {
      console.error('Error performing report action:', error);
      toast.error('Action failed');
    }
  };

  const handleBanUser = async (userId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Ban User',
      message: "Are you sure you want to ban this user? All their listings will remain but they won't be able to log in.",
      type: 'danger',
      onConfirm: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;
          await api.users.updateStatus(userId, 'banned', session.access_token);
          toast.success('User has been banned successfully.');
          fetchReports();
          fetchUsers();
        } catch (error) {
          console.error('Error banning user:', error);
          toast.error('Failed to ban user.');
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const fetchListings = async () => {
    try {
      // Fetch all listings for admin view, not just active ones
      const response = await fetch('/api/listings?status=all');
      if (!response.ok) throw new Error('Failed to fetch listings');
      const data = await response.json();
      setLocalListings(data);
    } catch (err) {
      console.error('Error fetching listings:', err);
    }
  };

  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const data = await api.stats.getAll();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const fetchCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const data = await api.categories.getAll();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const newCat = await api.categories.create(
        newCategoryName, 
        newCategoryIcon, 
        newCategoryParentId || undefined
      );
      setCategories([...categories, newCat]);
      setNewCategoryName('');
      setNewCategoryParentId('');
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Failed to add category');
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !editName.trim()) return;
    try {
      const updatedCat = await api.categories.update(editingCategory.id, {
        name: editName,
        icon: editIcon,
        parent_id: editParentId || undefined
      });
      setCategories(categories.map(c => c.id === updatedCat.id ? updatedCat : c));
      setEditingCategory(null);
      toast.success('Category updated successfully');
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Failed to update category');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await api.categories.delete(id);
      setCategories(categories.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const handleDeleteListing = async (id: string | number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Listing',
      message: 'Are you sure you want to delete this listing? This action cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          await fetch(`/api/listings/${id}`, { 
            method: 'DELETE',
            headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
          });
          fetchListings();
        } catch (error) {
          console.error('Error deleting listing:', error);
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleUpdateStatus = async (id: string | number, status: Listing['status']) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await api.listings.update(id, { status }, session.access_token);
      toast.success(`Listing status updated to ${status}`);
      fetchListings();
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update listing status');
    }
  };

  const handleMarkAsSold = async (id: string | number) => {
    handleUpdateStatus(id, 'sold');
  };

  const SidebarContent = () => (
    <>
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">J</span>
          </div>
          <span className="text-xl font-black tracking-tight text-gray-900">Admin<span className="text-emerald-500">Panel</span></span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(false)}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-full"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        <button 
          onClick={() => { setActiveTab('overview'); setIsSidebarOpen(false); }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'overview' ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <LayoutDashboard className="w-5 h-5" />
          Overview
        </button>
        <button 
          onClick={() => { setActiveTab('listings'); setIsSidebarOpen(false); }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'listings' ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Package className="w-5 h-5" />
          Listings
        </button>
        <button 
          onClick={() => { setActiveTab('users'); setIsSidebarOpen(false); }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'users' ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Users className="w-5 h-5" />
          Users
        </button>
        <button 
          onClick={() => { setActiveTab('categories'); setIsSidebarOpen(false); }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'categories' ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <FolderTree className="w-5 h-5" />
          Categories
        </button>
        <button 
          onClick={() => { setActiveTab('reports'); setIsSidebarOpen(false); }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'reports' ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Flag className="w-5 h-5" />
          Reports
        </button>
        <div className="pt-4 pb-2">
          <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">System</p>
        </div>
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-all">
          <Settings className="w-5 h-5" />
          Settings
        </button>
      </nav>

      <div className="p-4 border-t border-gray-100">
        <button 
          onClick={onBack}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-red-500 hover:bg-red-50 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
          Exit Admin
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex relative pb-20 lg:pb-0">
      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between z-50 lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'overview' ? 'text-gray-900' : 'text-gray-400'}`}
        >
          <LayoutDashboard className={`w-6 h-6 ${activeTab === 'overview' ? 'fill-gray-900/10' : ''}`} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Overview</span>
        </button>
        <button 
          onClick={() => setActiveTab('listings')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'listings' ? 'text-gray-900' : 'text-gray-400'}`}
        >
          <Package className={`w-6 h-6 ${activeTab === 'listings' ? 'fill-gray-900/10' : ''}`} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Listings</span>
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'users' ? 'text-gray-900' : 'text-gray-400'}`}
        >
          <Users className={`w-6 h-6 ${activeTab === 'users' ? 'fill-gray-900/10' : ''}`} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Users</span>
        </button>
        <button 
          onClick={() => setActiveTab('categories')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'categories' ? 'text-gray-900' : 'text-gray-400'}`}
        >
          <FolderTree className={`w-6 h-6 ${activeTab === 'categories' ? 'fill-gray-900/10' : ''}`} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Cats</span>
        </button>
        <button 
          onClick={() => setActiveTab('reports')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'reports' ? 'text-gray-900' : 'text-gray-400'}`}
        >
          <Flag className={`w-6 h-6 ${activeTab === 'reports' ? 'fill-gray-900/10' : ''}`} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Reports</span>
        </button>
        <button 
          onClick={onBack}
          className="flex flex-col items-center gap-1 text-red-500"
        >
          <ArrowLeft className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Exit</span>
        </button>
      </nav>

      {/* Mobile Sidebar Overlay (Keeping for Settings/System if needed, or can remove) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
            />
            <motion.aside 
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="fixed inset-y-0 left-0 w-72 bg-white z-50 lg:hidden flex flex-col shadow-2xl"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-gray-200 flex-col sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4 flex-1">
            <div className="hidden md:flex items-center bg-gray-100 rounded-xl px-4 py-2 w-full max-w-md gap-3">
              <Search className="w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search listings, users, orders..." 
                className="bg-transparent border-none focus:ring-0 text-sm w-full"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2 lg:gap-4">
            <div className="h-8 w-[1px] bg-gray-200 mx-1 lg:mx-2"></div>
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-gray-900">Admin User</p>
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Super Admin</p>
              </div>
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-emerald-500 rounded-lg lg:rounded-xl flex items-center justify-center text-white font-bold text-sm lg:text-base">
                AU
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
          {activeTab === 'overview' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 lg:space-y-8"
            >
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h1 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">Dashboard Overview</h1>
                  <p className="text-gray-500 font-medium text-sm lg:text-base">Welcome back! Here's what's happening today.</p>
                </div>
                <div className="flex gap-2 lg:gap-3">
                  <button className="flex-1 sm:flex-none bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">
                    Export
                  </button>
                  <button className="flex-1 sm:flex-none bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20">
                    Report
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                {isLoadingStats ? (
                  [...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white p-5 lg:p-6 rounded-3xl border border-gray-100 shadow-sm animate-pulse">
                      <div className="h-12 w-12 bg-gray-200 rounded-2xl mb-4"></div>
                      <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                      <div className="h-8 w-32 bg-gray-200 rounded"></div>
                    </div>
                  ))
                ) : (
                  stats.map((stat, i) => {
                    const IconComponent = ICON_MAP[stat.icon] || Package;
                    return (
                      <div key={i} className="bg-white p-5 lg:p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                          <div className={`p-3 rounded-2xl bg-${stat.color}-50`}>
                            <IconComponent className={`w-6 h-6 text-${stat.color}-600`} />
                          </div>
                          <span className="text-emerald-500 text-xs font-bold bg-emerald-50 px-2 py-1 rounded-lg">
                            +12%
                          </span>
                        </div>
                        <p className="text-gray-500 text-sm font-medium mb-1">{stat.label}</p>
                        <h3 className="text-2xl lg:text-3xl font-black text-gray-900">{stat.value}</h3>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Recent Activity / Table */}
              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 lg:p-6 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-lg lg:text-xl font-bold text-gray-900">Pending Approvals</h3>
                  <button className="text-emerald-500 text-sm font-bold hover:underline">View all</button>
                </div>
                
                {/* Mobile Card View */}
                <div className="lg:hidden divide-y divide-gray-100">
                  {localListings.slice(0, 5).map((listing) => (
                    <div key={listing.id} className="p-4 space-y-4">
                      <div className="flex items-center gap-3">
                        <img src={listing.image} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between items-start">
                            <p className="text-sm font-bold text-gray-900 truncate pr-2">{listing.title}</p>
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-orange-50 text-orange-600 flex-shrink-0">
                              Pending
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 truncate">{listing.location}</p>
                          <p className="text-sm font-black text-gray-900 mt-1">Br{listing.price.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                        <p className="text-[10px] font-medium text-gray-500">Seller: <span className="font-bold text-gray-700">{listing.sellerName || 'Verified Seller'}</span></p>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleUpdateStatus(listing.id, 'active')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase transition-all active:scale-95"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approve
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(listing.id, 'hidden')}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Reject"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto border border-gray-100 rounded-2xl mx-6 mb-6">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/50">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Listing</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Seller</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Price</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {localListings.slice(0, 5).map((listing) => (
                        <tr key={listing.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img src={listing.image} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 shadow-sm" />
                              <div className="min-w-0 max-w-[200px]">
                                <p className="text-sm font-bold text-gray-900 truncate group-hover:text-emerald-600 transition-colors">{listing.title}</p>
                                <p className="text-[10px] text-gray-400 truncate flex items-center gap-1">
                                  <MapPin className="w-2.5 h-2.5" />
                                  {listing.location}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-gray-600 truncate max-w-[120px]">{listing.sellerName || 'Verified Seller'}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-black text-gray-900">Br{listing.price.toLocaleString()}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-orange-50 text-orange-600 border border-orange-100">
                              Pending
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button 
                                onClick={() => handleUpdateStatus(listing.id, 'active')}
                                className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all" 
                                title="Approve"
                              >
                                <CheckCircle2 className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={() => handleUpdateStatus(listing.id, 'hidden')}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all" 
                                title="Reject"
                              >
                                <XCircle className="w-5 h-5" />
                              </button>
                              <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-all">
                                <MoreVertical className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'listings' && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h2 className="text-2xl lg:text-3xl font-black text-gray-900">Manage Listings</h2>
                <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                  <select className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-gray-600 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all flex-shrink-0">
                    <option>All Categories</option>
                    <option>Electronics</option>
                    <option>Vehicles</option>
                    <option>Property</option>
                  </select>
                  <select className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-gray-600 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all flex-shrink-0">
                    <option>All Status</option>
                    <option>Approved</option>
                    <option>Pending</option>
                    <option>Rejected</option>
                  </select>
                </div>
              </div>

              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                {/* Mobile Card View */}
                <div className="lg:hidden divide-y divide-gray-100">
                  {localListings.map((listing) => (
                    <div key={listing.id} className="p-4 space-y-4">
                      <div className="flex items-center gap-3">
                        <img src={listing.image} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between items-start">
                            <p className="text-sm font-bold text-gray-900 truncate pr-2">{listing.title}</p>
                            <div className="flex flex-col items-end gap-1">
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase flex-shrink-0 ${listing.isPromoted ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-500'}`}>
                                {listing.isPromoted ? 'Promoted' : 'Standard'}
                              </span>
                              {listing.status === 'sold' && (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-red-50 text-red-600">
                                  Sold
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-[10px] text-gray-400 truncate">{listing.location}</p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-sm font-black text-gray-900">Br{listing.price.toLocaleString()}</p>
                            <p className="text-[10px] font-mono text-gray-400">#{listing.id}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-50">
                        {listing.status === 'pending' && (
                          <button 
                            onClick={() => handleUpdateStatus(listing.id, 'active')}
                            className="px-3 py-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg text-[10px] font-bold uppercase transition-all"
                          >
                            Approve
                          </button>
                        )}
                        {listing.status === 'active' && (
                          <button 
                            onClick={() => handleUpdateStatus(listing.id, 'hidden')}
                            className="px-3 py-1.5 text-orange-600 hover:bg-orange-50 rounded-lg text-[10px] font-bold uppercase transition-all"
                          >
                            Unlist
                          </button>
                        )}
                        <button 
                          onClick={() => listing.seller_id && handleBanUser(listing.seller_id)}
                          className="px-3 py-1.5 text-red-700 hover:bg-red-50 rounded-lg text-[10px] font-bold uppercase transition-all"
                          title="Ban Seller"
                        >
                          Ban User
                        </button>
                        {listing.status !== 'sold' && listing.status !== 'hidden' && (
                          <button 
                            onClick={() => handleMarkAsSold(listing.id)}
                            className="px-3 py-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg text-[10px] font-bold uppercase transition-all"
                          >
                            Mark Sold
                          </button>
                        )}
                        {listing.status === 'sold' && (
                          <button 
                            onClick={() => handleUpdateStatus(listing.id, 'active')}
                            className="px-3 py-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg text-[10px] font-bold uppercase transition-all"
                          >
                            Make Available
                          </button>
                        )}
                        <button className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg text-[10px] font-bold uppercase transition-all">
                          <ExternalLink className="w-3.5 h-3.5" />
                          View
                        </button>
                        <button 
                          onClick={() => handleDeleteListing(listing.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-red-500 hover:bg-red-50 rounded-lg text-[10px] font-bold uppercase transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto border border-gray-100 rounded-2xl mx-6 mb-6">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/50">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">ID</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Listing</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Price</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {localListings.map((listing) => (
                        <tr key={listing.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-6 py-4 text-xs font-mono text-gray-400">#{listing.id}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img 
                                src={getOptimizedImageUrl(listing.image, { width: 100, height: 100 })} 
                                alt="" 
                                className="w-12 h-12 rounded-xl object-cover flex-shrink-0 shadow-sm" 
                              />
                              <div className="min-w-0 max-w-[250px]">
                                <p className="text-sm font-bold text-gray-900 truncate group-hover:text-emerald-600 transition-colors">{listing.title}</p>
                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider truncate flex items-center gap-1">
                                  <MapPin className="w-2.5 h-2.5" />
                                  {listing.location}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-black text-gray-900">Br{listing.price.toLocaleString()}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1 items-start">
                              <span className={`inline-flex px-2 py-1 rounded-lg text-[10px] font-black uppercase border ${listing.isPromoted ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                                {listing.isPromoted ? 'Promoted' : 'Standard'}
                              </span>
                              {listing.status === 'sold' && (
                                <span className="inline-flex px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-red-50 text-red-600 border border-red-100">
                                  Sold
                                </span>
                              )}
                              {listing.status === 'pending' && (
                                <span className="inline-flex px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-orange-50 text-orange-600 border border-orange-100">
                                  Pending
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1">
                              {listing.status === 'pending' && (
                                <button 
                                  onClick={() => handleUpdateStatus(listing.id, 'active')}
                                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                  title="Approve"
                                >
                                  <CheckCircle2 className="w-5 h-5" />
                                </button>
                              )}
                              {listing.status === 'active' && (
                                <button 
                                  onClick={() => handleUpdateStatus(listing.id, 'hidden')}
                                  className="p-2 text-orange-600 hover:bg-orange-50 rounded-xl transition-all"
                                  title="Unlist"
                                >
                                  <XCircle className="w-5 h-5" />
                                </button>
                              )}
                              <button 
                                onClick={() => listing.seller_id && handleBanUser(listing.seller_id)}
                                className="p-2 text-red-700 hover:bg-red-50 rounded-xl transition-all"
                                title="Ban Seller"
                              >
                                <UserX className="w-5 h-5" />
                              </button>
                              {listing.status !== 'sold' && listing.status !== 'hidden' && (
                                <button 
                                  onClick={() => handleMarkAsSold(listing.id)}
                                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                  title="Mark Sold"
                                >
                                  <CheckCircle2 className="w-5 h-5" />
                                </button>
                              )}
                              {listing.status === 'sold' && (
                                <button 
                                  onClick={() => handleUpdateStatus(listing.id, 'active')}
                                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                  title="Make Available"
                                >
                                  <RotateCcw className="w-5 h-5" />
                                </button>
                              )}
                              <button className="p-2 text-gray-400 hover:text-emerald-500 transition-all rounded-xl hover:bg-gray-50">
                                <ExternalLink className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={() => handleDeleteListing(listing.id)}
                                className="p-2 text-gray-400 hover:text-red-500 transition-all rounded-xl hover:bg-red-50"
                                title="Delete"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'categories' && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <h2 className="text-2xl lg:text-3xl font-black text-gray-900">Manage Categories</h2>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: 'Sync Category Counts',
                          message: 'This will recalculate the number of active listings for each category. Continue?',
                          type: 'info',
                          onConfirm: async () => {
                            try {
                              await api.categories.syncCounts();
                              fetchCategories();
                            } catch (error) {
                              console.error('Error syncing counts:', error);
                            }
                            setConfirmModal(prev => ({ ...prev, isOpen: false }));
                          }
                        });
                      }}
                      className="bg-blue-50 text-blue-600 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-100 transition-all border border-blue-100/50"
                    >
                      Sync Counts
                    </button>
                    <button 
                      onClick={async () => {
                        setConfirmModal({
                          isOpen: true,
                          title: 'Seed Categories',
                          message: 'This will add common categories to your database. Continue?',
                          type: 'info',
                          onConfirm: async () => {
                            try {
                              await api.categories.seed();
                              fetchCategories();
                            } catch (error) {
                              console.error('Error seeding categories:', error);
                            }
                            setConfirmModal(prev => ({ ...prev, isOpen: false }));
                          }
                        });
                      }}
                      className="bg-emerald-50 text-emerald-600 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-100/50"
                    >
                      Seed Defaults
                    </button>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-2">Add New Category</h3>
                  <div className="flex flex-col sm:flex-row bg-gray-50/50 p-1.5 rounded-2xl gap-1.5 w-full">
                    <div className="flex gap-1.5 flex-1">
                      <input 
                        type="text" 
                        placeholder="Name" 
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="flex-1 px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 border-none bg-white rounded-xl font-bold outline-none transition-all shadow-sm"
                      />
                      <input 
                        type="text" 
                        placeholder="Icon" 
                        value={newCategoryIcon}
                        onChange={(e) => setNewCategoryIcon(e.target.value)}
                        className="w-16 px-2 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 border-none bg-white rounded-xl text-center font-bold outline-none transition-all shadow-sm"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-1.5 flex-1">
                      <select
                        value={newCategoryParentId}
                        onChange={(e) => setNewCategoryParentId(e.target.value)}
                        className="flex-1 px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 border-none bg-white rounded-xl font-bold text-gray-600 appearance-none cursor-pointer outline-none transition-all shadow-sm"
                      >
                        <option value="">Main Category</option>
                        {categories.filter(c => !c.parent_id).map(c => (
                          <option key={c.id} value={c.id}>Parent: {c.name}</option>
                        ))}
                      </select>
                      <button 
                        onClick={handleAddCategory}
                        className="bg-gray-900 text-white px-6 py-2.5 rounded-xl flex items-center justify-center hover:bg-gray-800 transition-all font-bold text-sm shadow-lg shadow-gray-900/10 active:scale-95"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {isLoadingCategories ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="space-y-8">
                  <AnimatePresence>
                    {editingCategory && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
                      >
                        <motion.div 
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.95, opacity: 0 }}
                          className="bg-white rounded-[2rem] w-full max-w-md p-6 sm:p-8 shadow-2xl border border-gray-100"
                        >
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Edit Category</h3>
                            <button 
                              onClick={() => setEditingCategory(null)}
                              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                              <X className="w-5 h-5 text-gray-500" />
                            </button>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block px-1">Category Name</label>
                              <input 
                                type="text" 
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 border border-gray-100 bg-gray-50/50 rounded-xl font-bold outline-none transition-all"
                              />
                            </div>
                            
                            <div className="grid grid-cols-4 gap-4">
                              <div className="col-span-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block px-1">Icon</label>
                                <input 
                                  type="text" 
                                  value={editIcon}
                                  onChange={(e) => setEditIcon(e.target.value)}
                                  className="w-full px-2 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 border border-gray-100 bg-gray-50/50 rounded-xl text-center font-bold outline-none transition-all"
                                />
                              </div>
                              <div className="col-span-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block px-1">Parent Category</label>
                                <select
                                  value={editParentId}
                                  onChange={(e) => setEditParentId(e.target.value)}
                                  className="w-full px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 border border-gray-100 bg-gray-50/50 rounded-xl font-bold text-gray-600 appearance-none cursor-pointer outline-none transition-all"
                                >
                                  <option value="">Main Category</option>
                                  {categories.filter(c => !c.parent_id && c.id !== editingCategory.id).map(c => (
                                    <option key={c.id} value={c.id}>Parent: {c.name}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                              <button 
                                onClick={() => setEditingCategory(null)}
                                className="flex-1 px-6 py-3 rounded-xl font-bold text-sm text-gray-500 hover:bg-gray-50 transition-all"
                              >
                                Cancel
                              </button>
                              <button 
                                onClick={handleUpdateCategory}
                                className="flex-1 bg-gray-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-gray-800 transition-all shadow-lg shadow-gray-900/10 active:scale-95"
                              >
                                Save Changes
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {categories.filter(c => !c.parent_id).map((mainCat, index) => (
                    <motion.div 
                      key={mainCat.id} 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="space-y-4 bg-white p-4 sm:p-6 rounded-3xl sm:rounded-[2rem] border border-gray-100 shadow-sm"
                    >
                      <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-50 rounded-xl sm:rounded-2xl flex items-center justify-center text-2xl sm:text-3xl shadow-inner flex-shrink-0">
                            {mainCat.icon}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-black text-lg sm:text-xl text-gray-900 uppercase tracking-tight truncate">{mainCat.name}</h3>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              {mainCat.count} Total
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => {
                              setEditingCategory(mainCat);
                              setEditName(mainCat.name);
                              setEditIcon(mainCat.icon);
                              setEditParentId(mainCat.parent_id || '');
                            }}
                            className="p-2 text-gray-400 hover:text-emerald-500 transition-all rounded-xl hover:bg-emerald-50"
                          >
                            <Edit2 className="w-4 h-4 sm:w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteCategory(mainCat.id)}
                            className="p-2 text-gray-400 hover:text-red-500 transition-all rounded-xl hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 sm:w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
                        {categories.filter(c => String(c.parent_id) === String(mainCat.id)).map((subCat) => (
                          <div key={subCat.id} className="bg-gray-50/50 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-gray-100/50 hover:bg-white hover:shadow-md hover:border-emerald-100 transition-all group">
                            <div className="flex justify-between items-center gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-lg flex-shrink-0">{subCat.icon}</span>
                                <span className="text-xs sm:text-sm font-bold text-gray-700 truncate">{subCat.name}</span>
                              </div>
                              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                <button 
                                  onClick={() => {
                                    setEditingCategory(subCat);
                                    setEditName(subCat.name);
                                    setEditIcon(subCat.icon);
                                    setEditParentId(subCat.parent_id || '');
                                  }}
                                  className="p-1 text-gray-400 hover:text-emerald-500 transition-all rounded-lg hover:bg-emerald-50"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteCategory(subCat.id)}
                                  className="p-1 text-gray-400 hover:text-red-500 transition-all rounded-lg hover:bg-red-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                        <button 
                          onClick={() => {
                            setNewCategoryParentId(String(mainCat.id));
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="border-2 border-dashed border-gray-100 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 text-gray-400 hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-50/30 transition-all group"
                        >
                          <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Add Sub</span>
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'reports' && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl lg:text-3xl font-black text-gray-900">Ad Reports</h2>
                  <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button 
                      onClick={() => setReportView('active')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${reportView === 'active' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Active
                    </button>
                    <button 
                      onClick={() => setReportView('history')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${reportView === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      History
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={fetchReports}
                    className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-2"
                  >
                    <RotateCcw className={`w-4 h-4 ${isLoadingReports ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                {isLoadingReports ? (
                  <div className="flex justify-center py-20">
                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : reports.filter(r => reportView === 'active' ? r.status === 'pending' : r.status !== 'pending').length === 0 ? (
                  <div className="text-center py-20">
                    {reportView === 'active' ? (
                      <>
                        <CheckCircle2 className="w-12 h-12 text-emerald-200 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-900">All caught up!</h3>
                        <p className="text-gray-500">No pending reports to review.</p>
                      </>
                    ) : (
                      <>
                        <History className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-900">No history yet</h3>
                        <p className="text-gray-500">Resolved reports will appear here.</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto scrollbar-hide">
                    <table className="w-full text-left min-w-[800px]">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Listing</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Reporter</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Reason</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {reports
                          .filter(report => reportView === 'active' ? report.status === 'pending' : report.status !== 'pending')
                          .map((report) => (
                          <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <img 
                                  src={report.listing?.thumbnail_url || 'https://picsum.photos/seed/placeholder/100/100'} 
                                  alt="" 
                                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0" 
                                />
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-gray-900 truncate max-w-[150px]">{report.listing?.title || 'Unknown Listing'}</p>
                                  <p className="text-[10px] text-gray-400 font-mono">#{report.listing_id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-gray-900 truncate max-w-[150px]">{report.reporter?.full_name || 'Unknown'}</p>
                                <p className="text-[10px] text-gray-400 truncate max-w-[150px]">{report.reporter?.email}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-red-600">{report.reason}</p>
                                {report.details && (
                                  <p className="text-[10px] text-gray-500 truncate max-w-[200px]">{report.details}</p>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-xs text-gray-500 font-medium">
                                {new Date(report.created_at).toLocaleDateString()}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                                report.status === 'pending' ? 'bg-orange-50 text-orange-600' :
                                report.status === 'resolved' ? 'bg-emerald-50 text-emerald-600' :
                                'bg-gray-50 text-gray-500'
                              }`}>
                                {report.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                {report.status === 'pending' && (
                                  <>
                                    <button 
                                      onClick={() => handleReportAction(report, 'unlist')}
                                      className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
                                      title="Unlist Listing"
                                    >
                                      <XCircle className="w-5 h-5" />
                                    </button>
                                    <button 
                                      onClick={() => handleReportAction(report, 'resolve')}
                                      className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                                      title="Mark as Resolved"
                                    >
                                      <CheckCircle2 className="w-5 h-5" />
                                    </button>
                                    <button 
                                      onClick={() => handleReportAction(report, 'dismiss')}
                                      className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-all"
                                      title="Dismiss"
                                    >
                                      <XCircle className="w-5 h-5" />
                                    </button>
                                  </>
                                )}
                                <button 
                                  onClick={() => handleReportAction(report, 'delete')}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                  title="Delete Listing"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                                <button 
                                  onClick={() => handleReportAction(report, 'ban')}
                                  className="p-2 text-red-700 hover:bg-red-100 rounded-lg transition-all"
                                  title="Ban Seller"
                                >
                                  <UserX className="w-5 h-5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'users' && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h2 className="text-2xl lg:text-3xl font-black text-gray-900">User Management</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={fetchUsers}
                    className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                {isLoadingUsers ? (
                  <div className="flex justify-center py-20">
                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-20">
                    <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900">No users found</h3>
                  </div>
                ) : (
                  <div className="overflow-x-auto scrollbar-hide">
                    <table className="w-full text-left min-w-[800px]">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">User</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Role</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Joined</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {users.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                                  {user.avatar_url ? (
                                    <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <Users className="w-5 h-5 text-gray-400" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-gray-900 truncate max-w-[200px]">{user.full_name}</p>
                                  <p className="text-[10px] text-gray-400 truncate max-w-[200px]">{user.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                                user.role === 'admin' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                              }`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                                user.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                              }`}>
                                {user.status || 'active'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-xs text-gray-500 font-medium">
                                {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                {user.status === 'suspended' || user.status === 'banned' ? (
                                  <button 
                                    onClick={() => handleUpdateUserStatus(user.id, 'active')}
                                    className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                                    title="Unblock User"
                                  >
                                    <CheckCircle2 className="w-5 h-5" />
                                  </button>
                                ) : (
                                  <button 
                                    onClick={() => handleBanUser(user.id)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                    title="Block User"
                                  >
                                    <UserX className="w-5 h-5" />
                                  </button>
                                )}
                                <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-all">
                                  <MoreVertical className="w-5 h-5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </main>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText="Confirm"
        cancelText="Cancel"
      />
    </div>
  );
};
