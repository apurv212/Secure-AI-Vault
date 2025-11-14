import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
  maxSizeMB?: number;        // Max file size in MB
  maxWidthOrHeight?: number; // Max dimension in pixels
  useWebWorker?: boolean;     // Use web worker for better performance
  quality?: number;          // Image quality 0-1
}

/**
 * Default compression options optimized for card OCR
 * - Reduces file size by ~25% (to 75% of original)
 * - Maintains high quality (0.93) for excellent OCR accuracy
 * - Preserves text readability with high resolution (2560px)
 */
const DEFAULT_OPTIONS: CompressionOptions = {
  maxSizeMB: undefined,      // Don't limit by size, use quality instead
  maxWidthOrHeight: 2560,    // High resolution for text recognition
  useWebWorker: true,        // Use web worker (faster, non-blocking)
  quality: 0.93,             // 93% quality - excellent for OCR, ~25% reduction
};

/**
 * Compress image file before upload
 * Optimized to reduce file size by ~25% while maintaining OCR quality
 * 
 * @param file - Original image file
 * @param options - Custom compression options (optional)
 * @returns Compressed File object
 */
export async function compressImageFile(
  file: File, 
  options: CompressionOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  try {
    // Compress the image
    const compressedFile = await imageCompression(file, {
      maxSizeMB: opts.maxSizeMB,
      maxWidthOrHeight: opts.maxWidthOrHeight!,
      useWebWorker: opts.useWebWorker!,
      initialQuality: opts.quality,
    });
    
    // If compression didn't help much or made it bigger, return original
    if (compressedFile.size >= file.size * 0.95) {
      return file;
    }
    
    return compressedFile;
  } catch (error) {
    // If compression fails, return original file
    return file;
  }
}

/**
 * Compress card image with optimal settings for OCR
 * - High quality (0.93) to preserve text clarity
 * - High resolution (2560px) for detail preservation
 * - Targets ~25% size reduction
 * 
 * @param file - Original card image file
 * @returns Compressed File object optimized for OCR
 */
export async function compressCardImage(file: File): Promise<File> {
  return compressImageFile(file, {
    maxWidthOrHeight: 2560,  // High resolution for card details
    quality: 0.93,           // 93% quality - minimal loss, good compression
    useWebWorker: true,      // Non-blocking compression
  });
}

/**
 * Get compression statistics without actually compressing
 * Useful for showing estimated compression results to user
 * 
 * @param file - Image file to analyze
 * @returns Estimated compression info
 */
export function getCompressionEstimate(file: File): {
  originalSizeMB: string;
  estimatedSizeMB: string;
  estimatedReduction: string;
} {
  const originalSize = file.size;
  const originalSizeMB = (originalSize / 1024 / 1024).toFixed(2);
  
  // Estimate ~25% reduction based on our quality settings
  const estimatedSize = originalSize * 0.75;
  const estimatedSizeMB = (estimatedSize / 1024 / 1024).toFixed(2);
  const estimatedReduction = '25';
  
  return {
    originalSizeMB,
    estimatedSizeMB,
    estimatedReduction,
  };
}

