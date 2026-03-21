import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { User, Phone, Mail, Camera, Loader2, CheckCircle2, AlertCircle, LogOut, ArrowLeft, Trash2, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { api, UserProfile } from '../services/api';
import { supabase } from '../lib/supabase';
import { getOptimizedImageUrl } from '../lib/imageUtils';
import { ConfirmationModal } from './ConfirmationModal';
import { ETHIOPIAN_LOCATIONS } from '../constants/locations';

interface ProfileViewProps {
  onLogout: () => void;
  onBack: () => void;
}

export const ProfileView = ({ onLogout, onBack }: ProfileViewProps) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedSubRegion, setSelectedSubRegion] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('You must be logged in to view your profile.');
        return;
      }

      const data = await api.users.getMe(session.access_token);
      setProfile(data);
      setFullName(data.full_name || '');
      setPhone(data.phone || '');
      setAvatarUrl(data.avatar_url || '');
      
      if (data.location) {
        if (data.location.includes(', ')) {
          const [region, subRegion] = data.location.split(', ');
          setSelectedRegion(region);
          setSelectedSubRegion(subRegion);
        } else {
          setSelectedRegion(data.location);
          setSelectedSubRegion('');
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB.');
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Unauthorized');

      const updatedProfile = await api.users.uploadAvatar(file, session.access_token);
      setProfile(updatedProfile);
      setAvatarUrl(updatedProfile.avatar_url || '');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setError('Failed to upload profile picture. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Unauthorized');

      const locationString = selectedSubRegion 
        ? `${selectedRegion}, ${selectedSubRegion}` 
        : selectedRegion;

      const updatedProfile = await api.users.updateMe({
        full_name: fullName,
        phone: phone,
        location: locationString
      }, session.access_token);

      setProfile(updatedProfile);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Unauthorized');

      await api.users.deleteMe(session.access_token);
      await supabase.auth.signOut();
      onLogout();
    } catch (err) {
      console.error('Error deleting account:', err);
      setError('Failed to delete account. Please try again.');
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-24">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-xl transition-all"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Account Settings</h2>
            <p className="text-gray-500 text-sm font-medium">Manage your personal information</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="flex items-center gap-2 text-red-500 font-bold text-sm hover:bg-red-50 px-4 py-2 rounded-xl transition-all"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-emerald-500 to-emerald-600 relative">
          <div className="absolute -bottom-12 left-8">
            <div className="relative group">
              <div className="w-24 h-24 rounded-[2rem] bg-white p-1 shadow-xl">
                <div className="w-full h-full rounded-[1.8rem] overflow-hidden bg-gray-100">
                  {isUploading ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50">
                      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                    </div>
                  ) : avatarUrl ? (
                    <img 
                      src={getOptimizedImageUrl(avatarUrl, { width: 200, height: 200 })} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <User className="w-10 h-10" />
                    </div>
                  )}
                </div>
              </div>
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-xl shadow-lg flex items-center justify-center text-gray-600 hover:text-emerald-500 transition-all border border-gray-100 cursor-pointer">
                <Camera className="w-4 h-4" />
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="pt-16 pb-8 px-8">
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium">
                <AlertCircle className="w-5 h-5 shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                Profile updated successfully!
              </div>
            )}

            <div className="grid gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter your phone number"
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Region</label>
                <div className="relative group">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                  <select
                    required
                    className="w-full pl-12 pr-10 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all appearance-none cursor-pointer"
                    value={selectedRegion}
                    onChange={(e) => {
                      setSelectedRegion(e.target.value);
                      setSelectedSubRegion('');
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
              </div>

              {selectedRegion && ETHIOPIAN_LOCATIONS.find(l => l.name === selectedRegion)?.subRegions && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Sub-Region / City</label>
                  <div className="relative group">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                    <select
                      required
                      className="w-full pl-12 pr-10 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all appearance-none cursor-pointer"
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
                </div>
              )}

              <div className="space-y-2 opacity-60">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address (Read-only)</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="email"
                    value={profile?.email || ''}
                    disabled
                    className="w-full bg-gray-100 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isSaving}
              className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Profile'
              )}
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-gray-100">
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Danger Zone</h3>
              <p className="text-xs text-gray-500 font-medium">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <button 
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl border-2 border-red-100 text-red-500 font-black uppercase tracking-widest hover:bg-red-50 transition-all active:scale-[0.98]"
              >
                <Trash2 className="w-5 h-5" />
                Delete My Account
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message="Are you absolutely sure you want to delete your account? This action is irreversible and all your listings, messages, and profile data will be permanently removed."
        confirmText="Yes, Delete My Account"
        cancelText="No, Keep My Account"
        type="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
