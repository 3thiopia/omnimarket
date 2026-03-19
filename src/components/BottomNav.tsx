import { Home, Package, PlusCircle, User, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface BottomNavProps {
  onHome: () => void;
  onItems: () => void;
  onSell: () => void;
  onProfile: () => void;
  onMessages: () => void;
  activeTab: 'home' | 'items' | 'sell' | 'profile' | 'messages';
  unreadCount?: number;
}

export const BottomNav = ({ onHome, onItems, onSell, onProfile, onMessages, activeTab, unreadCount = 0 }: BottomNavProps) => {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 z-[60] flex justify-between items-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      <button 
        onClick={onHome}
        className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'home' ? 'text-emerald-500' : 'text-gray-400'}`}
      >
        <Home className="w-6 h-6" />
        <span className="text-[10px] font-bold uppercase tracking-tighter">Home</span>
      </button>

      <button 
        onClick={onItems}
        className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'items' ? 'text-emerald-500' : 'text-gray-400'}`}
      >
        <Package className="w-6 h-6" />
        <span className="text-[10px] font-bold uppercase tracking-tighter">Items</span>
      </button>

      <div className="relative -top-8">
        <button 
          onClick={onSell}
          className="w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-orange-500/40 active:scale-90 transition-transform"
        >
          <PlusCircle className="w-8 h-8" />
        </button>
      </div>

      <button 
        onClick={onMessages}
        className={`flex flex-col items-center gap-1 transition-colors relative ${activeTab === 'messages' ? 'text-emerald-500' : 'text-gray-400'}`}
      >
        <div className="relative">
          <MessageCircle className="w-6 h-6" />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1">
              <div className="relative">
                <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20"></div>
                <div className="bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              </div>
            </div>
          )}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-tighter">Chat</span>
      </button>

      <button 
        onClick={onProfile}
        className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'profile' ? 'text-emerald-500' : 'text-gray-400'}`}
      >
        <User className="w-6 h-6" />
        <span className="text-[10px] font-bold uppercase tracking-tighter">Account</span>
      </button>
    </div>
  );
};
