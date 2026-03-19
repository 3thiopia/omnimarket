/**
 * Utility to handle Supabase Image Transformations
 * This helps reduce bandwidth and improve page load speed.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export type ImageOptions = {
  width?: number;
  height?: number;
  quality?: number; // 1-100
  resize?: 'cover' | 'contain' | 'fill';
  format?: 'webp' | 'origin';
};

/**
 * Transforms a Supabase storage path into an optimized URL
 * @param path The path to the image in the bucket (e.g., 'listings/my-car.jpg')
 * @param options Transformation options
 */
export function getOptimizedImageUrl(path: string, options: ImageOptions = {}) {
  if (!path) return '';
  
  const { width, height, quality = 80, resize = 'cover', format = 'webp' } = options;

  // If it's a full URL, check if it's a Supabase URL to optimize it
  if (path.startsWith('http')) {
    if (path.includes('.supabase.co/storage/v1/object/public/') || path.includes('.supabase.co/storage/v1/render/image/public/')) {
      const transformedUrl = path.replace('/object/public/', '/render/image/public/').split('?')[0];
      const params = new URLSearchParams();
      if (width) params.append('width', width.toString());
      if (height) params.append('height', height.toString());
      params.append('quality', quality.toString());
      params.append('resize', resize);
      // format=origin is often better for compatibility if webp isn't strictly needed, 
      // but webp is smaller. Let's stick to origin for safety or webp for speed.
      // params.append('format', format); 
      
      return `${transformedUrl}?${params.toString()}`;
    }
    return path;
  }

  // If it's a relative path, construct the public URL for the 'listings' bucket
  if (SUPABASE_URL) {
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    const prefix = cleanPath.includes('/') ? '' : 'listings/';
    const baseUrl = `${SUPABASE_URL}/storage/v1/render/image/public/${prefix}${cleanPath}`;
    
    const params = new URLSearchParams();
    if (width) params.append('width', width.toString());
    if (height) params.append('height', height.toString());
    params.append('quality', quality.toString());
    params.append('resize', resize);
    
    return `${baseUrl}?${params.toString()}`;
  }

  return path;
}
