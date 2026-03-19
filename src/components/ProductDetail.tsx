import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  ArrowLeft, 
  Share2, 
  Heart, 
  MapPin, 
  ShieldCheck, 
  Phone, 
  MessageCircle,
  Clock,
  User,
  Flag,
  ChevronRight,
  Loader2,
  Edit3,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Listing, api } from '../services/api';
import { supabase } from '../lib/supabase';
import { getOptimizedImageUrl } from '../lib/imageUtils';
import { LazyImage } from './LazyImage';
import { ListingCard } from './ListingCard';
import { ShareModal } from './ShareModal';

interface ProductDetailProps {
  product: Listing;
  onBack: () => void;
  onViewProduct: (listing: Listing) => void;
  onStartChat?: (conversationId: string) => void;
  onEdit?: (listing: Listing) => void;
  onDelete?: (listingId: string | number) => void;
}

export const ProductDetail = ({ product, onBack, onViewProduct, onStartChat, onEdit, onDelete }: ProductDetailProps) => {
  const [activeImage, setActiveImage] = useState(product.image);
  const [relatedItems, setRelatedItems] = useState<Listing[]>([]);
  const [isLoadingRelated, setIsLoadingRelated] = useState(false);
  const [showAllRelated, setShowAllRelated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user || null);
    });
  }, []);

  const isOwner = currentUser?.id === product.seller_id;
  
  const optimizedActiveImage = getOptimizedImageUrl(activeImage, {
    width: 1200,
    height: 900
  });

  const allImages = product.images && product.images.length > 0 
    ? product.images 
    : [product.image];

  useEffect(() => {
    const fetchRelated = async () => {
      setIsLoadingRelated(true);
      try {
        // Fetch items from same category
        const categoryItems = await api.listings.getAll({ 
          category: product.category_id || product.category,
          status: 'active'
        });
        
        // Fetch items from same seller
        let sellerItems: Listing[] = [];
        if (product.seller_id) {
          sellerItems = await api.listings.getAll({
            seller_id: product.seller_id as string,
            status: 'active'
          });
        }
        
        // Combine and remove duplicates
        const combined = [...categoryItems, ...sellerItems];
        const unique = combined.reduce((acc: Listing[], current) => {
          const x = acc.find(item => item.id === current.id);
          if (!x && String(current.id) !== String(product.id)) {
            return acc.concat([current]);
          } else {
            return acc;
          }
        }, []);
        
        setRelatedItems(unique);
      } catch (error) {
        console.error('Error fetching related items:', error);
      } finally {
        setIsLoadingRelated(false);
      }
    };

    fetchRelated();
    // Reset active image when product changes
    setActiveImage(product.image);
    setShowAllRelated(false);
  }, [product.id]);

  const displayedRelated = showAllRelated ? relatedItems : relatedItems.slice(0, 10);

  const handleStartChat = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Handle unauthenticated user - maybe show login modal?
        toast.error('Please log in to start a chat.');
        return;
      }

      if (product.seller_id === session.user.id) {
        toast.error("You can't chat with yourself!");
        return;
      }

      const conversation = await api.chats.createConversation(product.id, product.seller_id as string, session.access_token);
      if (conversation) {
        if (onStartChat) {
          onStartChat(conversation.id);
        } else {
          // Fallback to custom event if prop not provided
          const event = new CustomEvent('navigate-to-chat', { detail: { conversationId: conversation.id } });
          window.dispatchEvent(event);
        }
      }
    } catch (err: any) {
      console.error('Error starting chat:', err);
      toast.error(err.message || 'Failed to start chat. Please try again.');
    }
  };

  const [isReporting, setIsReporting] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const handleReportAd = async () => {
    if (!reportReason) {
      toast.error('Please select a reason for reporting.');
      return;
    }

    setIsSubmittingReport(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to report an ad.');
        return;
      }

      await api.reports.create({
        listing_id: product.id,
        reason: reportReason,
        details: reportDetails
      }, session.access_token);

      toast.success('Thank you for your report. Our team will review it shortly.');
      setIsReporting(false);
      setReportReason('');
      setReportDetails('');
    } catch (err: any) {
      console.error('Error submitting report:', err);
      toast.error('Failed to submit report. Please try again.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen bg-white"
    >
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-4 flex items-center justify-between">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-900" />
        </button>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsShareModalOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Share2 className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Heart className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Image Gallery */}
          <div className="space-y-4">
            {/* Main Image Container - Mobile: Scroll, Desktop: Single with Thumbnails */}
            <div className="relative group">
              <div className="aspect-[4/3] rounded-3xl overflow-hidden bg-gray-100 border border-gray-100 sm:block hidden">
                <LazyImage 
                  src={getOptimizedImageUrl(activeImage, { width: 1200, height: 900 })} 
                  alt={product.title}
                  className="w-full h-full object-cover transition-all duration-500"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Mobile Swipeable Gallery */}
              <div 
                className="sm:hidden flex overflow-x-auto snap-x snap-mandatory no-scrollbar aspect-[4/3] rounded-3xl bg-gray-100 border border-gray-100"
                onScroll={(e) => {
                  const scrollLeft = e.currentTarget.scrollLeft;
                  const width = e.currentTarget.offsetWidth;
                  const index = Math.round(scrollLeft / width);
                  if (allImages[index] && allImages[index] !== activeImage) {
                    setActiveImage(allImages[index]);
                  }
                }}
              >
                {allImages.map((img, idx) => (
                  <div key={idx} className="w-full h-full flex-shrink-0 snap-center">
                    <LazyImage 
                      src={getOptimizedImageUrl(img, { width: 800, height: 600 })} 
                      alt={`${product.title} - ${idx + 1}`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ))}
              </div>

              {/* Image Indicators (Dots) for Mobile */}
              {allImages.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 sm:hidden">
                  {allImages.map((_, idx) => (
                    <div 
                      key={idx}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        activeImage === allImages[idx] ? 'bg-emerald-500 w-4' : 'bg-white/60'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
            
            {/* Thumbnails - Hidden on very small screens, shown on desktop */}
            {allImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar sm:flex hidden">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(img)}
                    className={`relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                      activeImage === img ? 'border-emerald-500 scale-105 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <LazyImage 
                      src={getOptimizedImageUrl(img, { width: 100, height: 100 })} 
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {product.isPromoted && (
                <span className="bg-orange-100 text-orange-600 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider">
                  Promoted
                </span>
              )}
              {(product.category_data || product.category) && (
                <span className="bg-emerald-100 text-emerald-600 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider flex items-center gap-1">
                  <span>{product.category_data?.icon || product.categoryIcon}</span>
                  <span>
                    {product.category_data?.parent 
                      ? `${product.category_data.parent.name} > ${product.category_data.name}` 
                      : (product.category_data?.name || product.category)}
                  </span>
                </span>
              )}
              <span className="text-gray-400 text-sm font-medium flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {product.postedAt || '2 hours ago'}
              </span>
            </div>
            
            <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-tight">
              {product.title}
            </h1>
            
            <div className="flex items-center justify-between">
              <div className="text-4xl font-black text-emerald-600">
                Br{product.price.toLocaleString()}
              </div>
              <div className="flex items-center gap-1 text-gray-500 font-medium">
                <MapPin className="w-4 h-4" />
                {product.location}
              </div>
            </div>
          </div>

          <div className="h-[1px] bg-gray-100" />

          {/* Description */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Description</h2>
            <p className="text-gray-600 leading-relaxed text-lg">
              {product.description || "This is a high-quality item in excellent condition. Perfect for anyone looking for reliability and style. Please contact me for more details or to arrange a viewing."}
            </p>
          </div>

          {/* Safety Tips */}
          <div className="bg-blue-50 rounded-3xl p-6 space-y-4 border border-blue-100">
            <div className="flex items-center gap-3 text-blue-600">
              <ShieldCheck className="w-6 h-6" />
              <h3 className="font-bold text-lg">Safety Tips</h3>
            </div>
            <ul className="space-y-2 text-blue-800/70 text-sm font-medium">
              <li>• Meet the seller in a public place</li>
              <li>• Check the item before you buy</li>
              <li>• Pay only after collecting the item</li>
            </ul>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Seller Info */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400">
                <User className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900">{product.sellerName || 'Verified Seller'}</h3>
                <p className="text-gray-500 text-sm">Member since 2023</p>
              </div>
            </div>

            <div className="space-y-3">
              {isOwner ? (
                <>
                  <button 
                    onClick={() => onEdit?.(product)}
                    className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    <Edit3 className="w-5 h-5" />
                    Edit Listing
                  </button>
                  <button 
                    onClick={() => onDelete?.(product.id)}
                    className="w-full bg-red-50 text-red-500 border-2 border-red-500 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                    Delete Listing
                  </button>
                </>
              ) : (
                <>
                  <button className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20">
                    <Phone className="w-5 h-5" />
                    Show Contact
                  </button>
                  <button 
                    onClick={handleStartChat}
                    className="w-full bg-white border-2 border-emerald-500 text-emerald-500 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-50 transition-all"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Start Chat
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Report Ad */}
          <button 
            onClick={() => setIsReporting(true)}
            className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-red-500 transition-colors font-medium py-2"
          >
            <Flag className="w-4 h-4" />
            Report this ad
          </button>
        </div>
      </div>

      {/* Report Modal */}
      {isReporting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-gray-900">Report Ad</h3>
                <button 
                  onClick={() => setIsReporting(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-6 h-6 rotate-90" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-gray-500 font-medium">Why are you reporting this ad?</p>
                <div className="grid gap-2">
                  {[
                    'Inappropriate content',
                    'Scam or Fraud',
                    'Duplicate ad',
                    'Wrong category',
                    'Item already sold',
                    'Other'
                  ].map((reason) => (
                    <button
                      key={reason}
                      onClick={() => setReportReason(reason)}
                      className={`w-full text-left px-6 py-4 rounded-2xl font-bold transition-all border-2 ${
                        reportReason === reason 
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-600' 
                          : 'border-gray-100 hover:border-gray-200 text-gray-600'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-900 ml-1">Additional Details (Optional)</label>
                  <textarea
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Tell us more about the issue..."
                    className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white transition-all outline-none min-h-[100px] resize-none font-medium"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsReporting(false)}
                  className="flex-1 py-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReportAd}
                  disabled={!reportReason || isSubmittingReport}
                  className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                >
                  {isSubmittingReport ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Flag className="w-5 h-5" />
                      Submit Report
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Related Items Section */}
      <div className="max-w-7xl mx-auto px-4 py-12 border-t border-gray-100 mt-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Related Items</h2>
            <p className="text-gray-500 font-medium">You might also like these</p>
          </div>
          {relatedItems.length > 10 && !showAllRelated && (
            <button 
              onClick={() => setShowAllRelated(true)}
              className="flex items-center gap-1 text-emerald-600 font-bold hover:gap-2 transition-all"
            >
              Show More <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {isLoadingRelated ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
            <p className="text-gray-500 font-medium">Finding related items...</p>
          </div>
        ) : relatedItems.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
            {displayedRelated.map((item) => (
              <ListingCard
                key={item.id}
                {...item}
                viewMode="grid"
                onClick={() => {
                  onViewProduct(item);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-gray-50 rounded-[2.5rem] border border-dashed border-gray-200">
            <p className="text-gray-400 font-medium">No related items found in this category.</p>
          </div>
        )}
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title={product.title}
        url={`${window.location.origin}?listing=${product.id}`}
      />
    </motion.div>
  );
};
