import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { api, Category } from '../services/api';

interface CategoryBarProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export const CategoryBar = ({ selectedId, onSelect }: CategoryBarProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await api.categories.getAll();
        setCategories(data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setSelectedParentId(null);
      return;
    }

    const current = categories.find(c => String(c.id) === String(selectedId));
    if (current) {
      if (current.parent_id) {
        setSelectedParentId(String(current.parent_id));
      } else {
        setSelectedParentId(String(selectedId));
      }
    }
  }, [selectedId, categories]);

  if (isLoading) {
    return (
      <div className="py-2 overflow-x-auto no-scrollbar -mx-4 px-4">
        <div className="flex gap-5 min-w-max">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2 animate-pulse shrink-0">
              <div className="w-12 h-12 rounded-xl bg-gray-200" />
              <div className="w-12 h-2 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const mainCategories = categories.filter(c => !c.parent_id);
  const subCategories = selectedParentId 
    ? categories.filter(c => String(c.parent_id) === selectedParentId)
    : [];

  return (
    <div className="space-y-4">
      <div className="py-2 overflow-x-auto no-scrollbar -mx-4 px-4">
        <div className="flex gap-5 min-w-max">
          {mainCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className="flex flex-col items-center gap-2 group cursor-pointer shrink-0 relative"
            >
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all group-hover:scale-110 group-active:scale-95 shadow-sm text-xl relative ${
                selectedParentId === String(cat.id) 
                  ? 'bg-emerald-500 border-emerald-500 text-white scale-110 shadow-emerald-500/20' 
                  : 'bg-white border-gray-100 text-gray-700'
              }`}>
                {cat.icon}
                
                <AnimatePresence>
                  {selectedParentId === String(cat.id) && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full border border-emerald-100 flex items-center justify-center shadow-md z-10"
                    >
                      <X className="w-3 h-3 text-emerald-600" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <span className={`text-[10px] font-bold transition-colors uppercase tracking-tight max-w-[72px] truncate ${
                selectedParentId === String(cat.id) ? 'text-emerald-600' : 'text-gray-500 group-hover:text-emerald-500'
              }`}>
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {subCategories.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-2 overflow-x-auto no-scrollbar border-t border-gray-100 pt-4 -mx-4 px-4"
        >
          <div className="flex gap-3 min-w-max">
            <button
              onClick={() => onSelect(selectedParentId!)}
              className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border shadow-sm shrink-0 flex items-center gap-2 ${
                selectedId === selectedParentId
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/20'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-emerald-200 hover:text-emerald-600'
              }`}
            >
              All {mainCategories.find(c => String(c.id) === selectedParentId)?.name}
              {selectedId === selectedParentId && <X className="w-3 h-3" />}
            </button>
            {subCategories.map((sub) => (
              <button
                key={sub.id}
                onClick={() => onSelect(sub.id)}
                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border shadow-sm shrink-0 flex items-center gap-2 ${
                  selectedId === sub.id
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/20'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-emerald-200 hover:text-emerald-600'
                }`}
              >
                {sub.icon} {sub.name}
                {selectedId === sub.id && <X className="w-3 h-3" />}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};
