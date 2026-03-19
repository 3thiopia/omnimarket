import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, Send, MessageCircle, Facebook, Share2, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string;
}

export const ShareModal = ({ isOpen, onClose, title, url }: ShareModalProps) => {
  const [copied, setCopied] = useState(false);

  const shareOptions = [
    {
      name: 'Telegram',
      icon: <Send className="w-5 h-5" />,
      color: 'bg-[#0088cc]',
      action: () => {
        window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank');
      }
    },
    {
      name: 'WhatsApp',
      icon: <MessageCircle className="w-5 h-5" />,
      color: 'bg-[#25D366]',
      action: () => {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(title + ' ' + url)}`, '_blank');
      }
    },
    {
      name: 'Facebook',
      icon: <Facebook className="w-5 h-5" />,
      color: 'bg-[#1877F2]',
      action: () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
      }
    }
  ];

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          toast.error('Failed to share');
        }
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Share listing</h3>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                {shareOptions.map((option) => (
                  <button
                    key={option.name}
                    onClick={option.action}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className={`${option.color} p-4 rounded-2xl text-white shadow-lg shadow-black/5 group-hover:scale-110 transition-transform`}>
                      {option.icon}
                    </div>
                    <span className="text-xs font-medium text-gray-600">{option.name}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="flex-1 text-sm text-gray-500 truncate">{url}</span>
                  <button
                    onClick={handleCopyLink}
                    className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-emerald-600"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {navigator.share && (
                  <button
                    onClick={handleWebShare}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 text-white rounded-2xl font-semibold hover:bg-gray-800 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    More options
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
