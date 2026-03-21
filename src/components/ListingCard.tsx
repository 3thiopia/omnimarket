import React, { Key } from 'react';
import { Heart, MapPin, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

import { getOptimizedImageUrl } from '../lib/imageUtils';
import { LazyImage } from './LazyImage';

interface ListingCardProps {
  title: string;
  price: number;
  location: string;
  image: string;
  category?: string;
  categoryIcon?: string;
  isPromoted?: boolean;
  isFavorited?: boolean;
  viewMode?: 'grid' | 'list';
  key?: Key;
  onClick?: () => void;
  onFavorite?: (e: React.MouseEvent) => void;
}

export const ListingCard = ({ title, price, location, image, category, categoryIcon, isPromoted, isFavorited, viewMode = 'grid', onClick, onFavorite }: ListingCardProps) => {
  const optimizedImage = getOptimizedImageUrl(image, { 
    width: viewMode === 'grid' ? 300 : 200,
    height: viewMode === 'grid' ? 225 : 150
  });

  if (viewMode === 'grid') {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        onClick={onClick}
        className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all group cursor-pointer relative"
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <LazyImage 
            src={optimizedImage} 
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onFavorite?.(e);
            }}
            className={`absolute top-3 right-3 p-2 backdrop-blur-sm rounded-full transition-colors ${isFavorited ? 'bg-red-500 text-white' : 'bg-white/80 text-gray-400 hover:text-red-500'}`}
          >
            <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
          </button>
          {isPromoted && (
            <div className="absolute top-3 left-3 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              TOP
            </div>
          )}
        </div>
        <div className="p-2 sm:p-4">
          {category && (
            <div className="flex items-center gap-1 text-[8px] sm:text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5 sm:mb-1">
              <span>{categoryIcon}</span>
              <span className="truncate">{category}</span>
            </div>
          )}
          <h3 className="font-bold text-gray-800 text-xs sm:text-base line-clamp-2 mb-1 sm:mb-2 group-hover:text-emerald-600 transition-colors leading-tight">
            {title}
          </h3>
          <div className="flex flex-col gap-0.5 sm:gap-1">
            <span className="text-sm sm:text-xl font-black text-emerald-600">
              Br {price.toLocaleString()}
            </span>
            <div className="flex items-center gap-1 text-gray-400 text-[9px] sm:text-xs mt-0.5">
              <MapPin className="w-2.5 h-2.5 sm:w-3 h-3" />
              <span className="truncate">{location}</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      onClick={onClick}
      className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-md transition-all group cursor-pointer flex h-32"
    >
      <div className="relative w-32 sm:w-48 overflow-hidden flex-shrink-0">
        <LazyImage 
          src={optimizedImage} 
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        {isPromoted && (
          <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
            <ShieldCheck className="w-2 h-2" />
            TOP
          </div>
        )}
      </div>
      <div className="p-3 sm:p-4 flex flex-col justify-between flex-1 min-w-0">
        <div>
          {category && (
            <div className="flex items-center gap-1 text-[8px] sm:text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5 sm:mb-1">
              <span>{categoryIcon}</span>
              <span className="truncate">{category}</span>
            </div>
          )}
          <h3 className="font-bold text-gray-800 text-sm sm:text-lg line-clamp-1 group-hover:text-emerald-600 transition-colors">
            {title}
          </h3>
          <div className="flex items-center gap-1 text-gray-400 text-[9px] sm:text-[10px] mt-0.5 sm:mt-1 uppercase font-bold tracking-wider">
            <MapPin className="w-2.5 h-2.5 sm:w-3 h-3" />
            <span className="truncate">{location}</span>
          </div>
        </div>
        <div className="flex justify-between items-end">
          <span className="text-base sm:text-xl font-black text-emerald-600">
            Br {price.toLocaleString()}
          </span>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onFavorite?.(e);
            }}
            className={`p-1 sm:p-2 transition-colors ${isFavorited ? 'text-red-500' : 'text-gray-300 hover:text-red-500'}`}
          >
            <Heart className={`w-4 h-4 sm:w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
