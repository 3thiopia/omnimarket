import { useState, useRef, useEffect, ChangeEvent, FormEvent } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, Tag, Upload, MapPin, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { api, Listing } from '../services/api';
import { ETHIOPIAN_LOCATIONS } from '../constants/locations';

interface PostAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editListing?: Listing;
}

const ETHIOPIAN_REGIONS = ETHIOPIAN_LOCATIONS.map(l => l.name);

export const PostAdModal = ({ isOpen, onClose, onSuccess, editListing }: PostAdModalProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>(editListing?.images || (editListing?.image ? [editListing.image] : []));
  const [categories, setCategories] = useState<any[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedSubRegion, setSelectedSubRegion] = useState('');
  
  const [selectedMainCategory, setSelectedMainCategory] = useState<string>('');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('');
  
  const [formData, setFormData] = useState({
    title: editListing?.title || '',
    category: editListing?.category_id ? String(editListing.category_id) : '',
    price: editListing?.price ? String(editListing.price) : '',
    location: editListing?.location || '',
    description: editListing?.description || '',
  });

  // Reset form when editListing changes or modal opens
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const profile = await api.users.getMe(session.access_token);
          if (profile.location) {
            setFormData(prev => ({ ...prev, location: profile.location }));
            
            if (profile.location.includes(', ')) {
              const [region, subRegion] = profile.location.split(', ');
              setSelectedRegion(region);
              setSelectedSubRegion(subRegion);
            } else {
              setSelectedRegion(profile.location);
              setSelectedSubRegion('');
            }
          }
        }
      } catch (err) {
        console.error('Error fetching user profile for default location:', err);
      }
    };

    if (isOpen) {
      if (editListing) {
        setFormData({
          title: editListing.title,
          category: editListing.category_id ? String(editListing.category_id) : '',
          price: String(editListing.price),
          location: editListing.location,
          description: editListing.description || '',
        });
        
        // Handle category hierarchy for editing
        if (editListing.category_id && categories.length > 0) {
          const catId = String(editListing.category_id);
          const currentCat = categories.find(c => String(c.id) === catId);
          
          if (currentCat) {
            if (currentCat.parent_id) {
              setSelectedMainCategory(String(currentCat.parent_id));
              setSelectedSubCategory(catId);
            } else {
              setSelectedMainCategory(catId);
              setSelectedSubCategory('');
            }
          }
        }
        
        // Parse location string (e.g., "Addis Ababa, Bole")
        if (editListing.location.includes(', ')) {
          const [region, subRegion] = editListing.location.split(', ');
          setSelectedRegion(region);
          setSelectedSubRegion(subRegion);
        } else {
          setSelectedRegion(editListing.location);
          setSelectedSubRegion('');
        }
        
        setPreviews(editListing.images || (editListing.image ? [editListing.image] : []));
        setSelectedFiles([]);
      } else {
        setFormData({ title: '', category: '', price: '', location: '', description: '' });
        setSelectedRegion('');
        setSelectedSubRegion('');
        setSelectedMainCategory('');
        setSelectedSubCategory('');
        setPreviews([]);
        setSelectedFiles([]);
        fetchUserProfile();
      }
    }
  }, [isOpen, editListing, categories]);

  // Update category ID when main or sub category changes
  useEffect(() => {
    const finalCategoryId = selectedSubCategory || selectedMainCategory;
    setFormData(prev => ({ ...prev, category: finalCategoryId }));
  }, [selectedMainCategory, selectedSubCategory]);

  // Update location string when region or sub-region changes
  useEffect(() => {
    if (selectedRegion) {
      const locationString = selectedSubRegion 
        ? `${selectedRegion}, ${selectedSubRegion}` 
        : selectedRegion;
      setFormData(prev => ({ ...prev, location: locationString }));
    }
  }, [selectedRegion, selectedSubRegion]);

  // Fetch categories on open
  useEffect(() => {
    const fetchCategories = async () => {
      setCategoriesLoading(true);
      try {
        let data = await api.categories.getAll();
        
        // Auto-seed if empty and we're in a state where we can
        if (data.length === 0) {
          try {
            await api.categories.seed();
            data = await api.categories.getAll();
          } catch (seedError) {
            console.error('Failed to auto-seed categories:', seedError);
          }
        }
        
        setCategories(data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setCategoriesLoading(false);
      }
    };
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to 5 photos total (including existing ones if we were to support mixing, but for simplicity let's say new uploads replace old ones if any)
    const totalFiles = [...selectedFiles, ...files].slice(0, 5);
    setSelectedFiles(totalFiles);

    // Create new previews for newly selected files
    const newPreviews = totalFiles.map(file => URL.createObjectURL(file));
    
    // If editing, we might want to keep existing ones or replace. 
    // For now, let's say selecting new files replaces the existing ones to keep it simple.
    setPreviews(newPreviews);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    
    const newPreviews = previews.filter((_, i) => i !== index);
    setPreviews(newPreviews);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // If not editing, require photos
    if (!editListing && selectedFiles.length === 0) {
      setError('Please add at least one photo');
      return;
    }

    if (!formData.category) {
      setError('Please select a category');
      return;
    }

    // Check if sub-category is required
    const hasSubCategories = categories.some(c => String(c.parent_id) === selectedMainCategory);
    if (hasSubCategories && !selectedSubCategory) {
      setError('Please select a specific sub-category');
      return;
    }

    const price = Number(formData.price);
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('You must be logged in to post an ad');

      // 1. Upload images to Supabase Storage if new ones selected
      let imageUrls: string[] = editListing?.images || (editListing?.image ? [editListing.image] : []);
      
      if (selectedFiles.length > 0) {
        imageUrls = []; // Replace existing if new ones uploaded
        for (const file of selectedFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `${session.user.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('listings')
            .upload(filePath, file);

          if (uploadError) throw uploadError;
          
          const { data: urlData } = supabase.storage
            .from('listings')
            .getPublicUrl(filePath);
            
          imageUrls.push(urlData.publicUrl);
        }
      }

      // 2. Create or Update listing in database
      let categoryName = '';
      let categoryId = '';

      if (selectedSubCategory === 'other') {
        const parent = categories.find(c => String(c.id) === selectedMainCategory);
        categoryName = `Other ${parent?.name || 'Uncategorized'}`;
        categoryId = selectedMainCategory; // Use parent ID as fallback
      } else {
        const subCat = categories.find(c => String(c.id) === selectedSubCategory);
        const mainCat = categories.find(c => String(c.id) === selectedMainCategory);
        
        if (subCat) {
          categoryName = subCat.name;
          categoryId = String(subCat.id);
        } else if (mainCat) {
          categoryName = mainCat.name;
          categoryId = String(mainCat.id);
        }
      }
      
      const listingPayload: any = {
        title: formData.title,
        price: price,
        location: formData.location,
        image: imageUrls[0], // Primary thumbnail
        images: imageUrls,   // All images for gallery
        description: formData.description,
        category: categoryName,
        category_id: categoryId,
      };

      if (editListing) {
        await api.listings.update(editListing.id, listingPayload, session.access_token);
      } else {
        listingPayload.isPromoted = false;
        await api.listings.create(listingPayload, session.access_token);
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
        // Reset state
        setSuccess(false);
        if (!editListing) {
          setFormData({ title: '', category: '', price: '', location: '', description: '' });
          setSelectedFiles([]);
          setPreviews([]);
        }
      }, 2000);

    } catch (error: any) {
      console.error('Error posting ad:', error);
      let errorMessage = 'Failed to post ad. Please try again.';
      
      if (error instanceof Error) {
        try {
          // Try to parse JSON error from backend if it's a fetch error
          const parsed = JSON.parse(error.message);
          errorMessage = parsed.error || parsed.details || errorMessage;
        } catch {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white w-full sm:max-w-2xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[90vh]"
          >
          {/* Header */}
          <div className="p-4 sm:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div>
              <h2 className="text-xl sm:text-3xl font-black text-gray-900 tracking-tight">
                {editListing ? 'Edit Your Ad' : 'Post Your Ad'}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 font-medium">
                {editListing ? 'Update your listing details' : 'Reach millions of buyers in seconds'}
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          {success ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-500"
              >
                <CheckCircle2 className="w-12 h-12" />
              </motion.div>
              <h3 className="text-2xl font-black text-gray-900">Success!</h3>
              <p className="text-gray-500 font-medium">Your ad has been posted and is now live.</p>
            </div>
          ) : (
            <>
              {/* Form Content */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 sm:space-y-8">
                {error && (
                  <div className="bg-red-50 border border-red-100 text-red-600 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    {error}
                  </div>
                )}
                {/* Step 1: Category & Photos */}
                <div className="space-y-4">
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">1. Select Category</label>
                  
                  <div className="space-y-4">
                    {/* Main Category Dropdown */}
                    <div className="relative group">
                      <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                      <select
                        required
                        className="w-full pl-12 pr-10 py-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl outline-none transition-all font-medium appearance-none cursor-pointer"
                        value={selectedMainCategory}
                        onChange={(e) => {
                          setSelectedMainCategory(e.target.value);
                          setSelectedSubCategory(''); // Reset sub-category
                        }}
                        disabled={categoriesLoading}
                      >
                        <option value="">{categoriesLoading ? 'Loading categories...' : 'Select Main Category'}</option>
                        {categories.filter(c => !c.parent_id).map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.icon} {cat.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {/* Sub Category Dropdown */}
                    <AnimatePresence>
                      {selectedMainCategory && categories.some(c => String(c.parent_id) === selectedMainCategory) && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="relative group"
                        >
                          <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                          <select
                            required
                            className="w-full pl-12 pr-10 py-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl outline-none transition-all font-medium appearance-none cursor-pointer"
                            value={selectedSubCategory}
                            onChange={(e) => setSelectedSubCategory(e.target.value)}
                          >
                            <option value="">Select Sub-Category</option>
                            {categories
                              .filter(c => String(c.parent_id) === selectedMainCategory)
                              .map((sub) => (
                                <option key={sub.id} value={sub.id}>
                                  {sub.icon} {sub.name}
                                </option>
                              ))}
                            <option value="other">Other / Uncategorized</option>
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {categories.length === 0 && !categoriesLoading && (
                    <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 flex flex-col items-center gap-3 text-center">
                      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                        <Tag className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-amber-900">No categories found</p>
                        <p className="text-xs text-amber-700 mt-1">We need to set up the default categories first.</p>
                      </div>
                      <button 
                        type="button"
                        onClick={async () => {
                          setCategoriesLoading(true);
                          try {
                            await api.categories.seed();
                            const data = await api.categories.getAll();
                            setCategories(data);
                          } catch (err) {
                            console.error(err);
                          } finally {
                            setCategoriesLoading(false);
                          }
                        }}
                        className="bg-amber-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20"
                      >
                        Fix Categories Now
                      </button>
                    </div>
                  )}
                  <input type="hidden" name="category" value={formData.category} required />
                </div>

                <div className="space-y-6">
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">2. Add Photos ({selectedFiles.length}/5)</label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*"
                      multiple
                      className="hidden"
                    />
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-emerald-500 hover:text-emerald-500 cursor-pointer transition-all bg-gray-50"
                    >
                      <Upload className="w-8 h-8" />
                      <span className="text-[10px] font-bold">ADD PHOTO</span>
                    </div>
                    
                    {previews.map((preview, index) => (
                      <div key={index} className="relative aspect-square rounded-2xl overflow-hidden group">
                        <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Step 2: Details */}
                <div className="space-y-6">
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">3. Item Details</label>
                  <div className="space-y-4">
                    <div className="relative">
                      <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        required
                        placeholder="Ad Title (e.g. iPhone 15 Pro Max)"
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl outline-none transition-all font-medium"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">Br</span>
                        <input
                          type="number"
                          required
                          placeholder="Price"
                          className="w-full pl-10 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl outline-none transition-all font-medium"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        />
                      </div>
                      <div className="space-y-4">
                        <div className="relative group">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                          <select
                            required
                            className="w-full pl-12 pr-10 py-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl outline-none transition-all font-medium appearance-none cursor-pointer"
                            value={selectedRegion}
                            onChange={(e) => {
                              setSelectedRegion(e.target.value);
                              setSelectedSubRegion(''); // Reset sub-region when region changes
                            }}
                          >
                            <option value="">Select Region</option>
                            {ETHIOPIAN_LOCATIONS.map((loc) => (
                              <option key={loc.name} value={loc.name}>
                                {loc.name}
                              </option>
                            ))}
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>

                        {selectedRegion && ETHIOPIAN_LOCATIONS.find(l => l.name === selectedRegion)?.subRegions && (
                          <div className="relative group">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                            <select
                              required
                              className="w-full pl-12 pr-10 py-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl outline-none transition-all font-medium appearance-none cursor-pointer"
                              value={selectedSubRegion}
                              onChange={(e) => setSelectedSubRegion(e.target.value)}
                            >
                              <option value="">Select Sub-Region / City</option>
                              {ETHIOPIAN_LOCATIONS.find(l => l.name === selectedRegion)?.subRegions?.map((sub) => (
                                <option key={sub} value={sub}>
                                  {sub}
                                </option>
                              ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <textarea
                      required
                      placeholder="Describe what you are selling..."
                      rows={4}
                      className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl outline-none transition-all font-medium resize-none"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-orange-500/30 hover:bg-orange-600 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:scale-100"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span>{editListing ? 'UPDATING...' : 'POSTING...'}</span>
                      </>
                    ) : (
                      <span>{editListing ? 'UPDATE AD NOW' : 'POST AD NOW'}</span>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);
};
