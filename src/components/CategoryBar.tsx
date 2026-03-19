import { useState, useEffect } from 'react';
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
        
        // If a category is selected, find its parent to show sub-categories
        if (selectedId) {
          const current = data.find(c => String(c.id) === String(selectedId));
          if (current?.parent_id) {
            setSelectedParentId(String(current.parent_id));
          } else {
            setSelectedParentId(String(selectedId));
          }
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCategories();
  }, [selectedId]);

  if (isLoading) {
    return (
      <div className="py-2 overflow-x-auto no-scrollbar">
        <div className="flex gap-4 min-w-max">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2 animate-pulse">
              <div className="w-12 h-12 rounded-xl bg-gray-200" />
              <div className="w-8 h-2 bg-gray-200 rounded" />
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
      <div className="py-2 overflow-x-auto no-scrollbar">
        <div className="flex gap-4 min-w-max">
          {mainCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedParentId(String(cat.id));
                onSelect(cat.id);
              }}
              className="flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all group-hover:scale-110 group-active:scale-95 shadow-sm text-xl ${
                selectedParentId === String(cat.id) 
                  ? 'bg-emerald-500 border-emerald-500 text-white scale-110 shadow-emerald-500/20' 
                  : 'bg-white border-gray-100 text-gray-700'
              }`}>
                {cat.icon}
              </div>
              <span className={`text-[10px] font-bold transition-colors uppercase tracking-tight ${
                selectedParentId === String(cat.id) ? 'text-emerald-600' : 'text-gray-500 group-hover:text-emerald-500'
              }`}>
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {subCategories.length > 0 && (
        <div className="py-1 overflow-x-auto no-scrollbar border-t border-gray-50 pt-3">
          <div className="flex gap-2 min-w-max">
            <button
              onClick={() => onSelect(selectedParentId!)}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${
                selectedId === selectedParentId
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-emerald-200 hover:text-emerald-600'
              }`}
            >
              All {mainCategories.find(c => String(c.id) === selectedParentId)?.name}
            </button>
            {subCategories.map((sub) => (
              <button
                key={sub.id}
                onClick={() => onSelect(sub.id)}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${
                  selectedId === sub.id
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-emerald-200 hover:text-emerald-600'
                }`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
