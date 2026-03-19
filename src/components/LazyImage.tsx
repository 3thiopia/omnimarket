import { useState, useEffect, ImgHTMLAttributes, HTMLAttributeReferrerPolicy } from 'react';

interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt?: string;
  className?: string;
  fallbackSrc?: string;
  referrerPolicy?: HTMLAttributeReferrerPolicy;
}

export const LazyImage = ({ 
  src, 
  alt, 
  className, 
  fallbackSrc,
  ...props 
}: LazyImageProps) => {
  const [imgSrc, setImgSrc] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!src) {
      setIsLoading(false);
      setHasError(true);
      return;
    }

    setIsLoading(true);
    setHasError(false);
    setImgSrc(src);

  }, [src]);

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className={`relative overflow-hidden bg-gray-100/50 ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      )}
      {hasError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-gray-50">
          <div className="text-gray-300 mb-1">
            <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">No Image</span>
        </div>
      ) : (
        <img
          src={imgSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
          className={`w-full h-full object-cover transition-all duration-200 ease-out ${
            isLoading ? 'opacity-0 scale-[1.02] blur-sm' : 'opacity-100 scale-100 blur-0'
          }`}
          {...props}
        />
      )}
    </div>
  );
};
