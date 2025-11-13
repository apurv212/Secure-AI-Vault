import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';
import { compressCardImage, getCompressionEstimate } from './imageCompression';

export interface UploadOptions {
  compress?: boolean;      // Whether to compress image before upload (default: true)
  onProgress?: (stage: 'compressing' | 'uploading', progress: number) => void;
}

/**
 * Upload image to Firebase Storage with optional compression
 * Images are compressed by ~25% while maintaining OCR quality
 * 
 * @param file - Image file to upload
 * @param userId - User ID for file organization
 * @param options - Upload options (compression, progress callback)
 * @returns Download URL of uploaded image
 */
export const uploadImage = async (
  file: File, 
  userId: string,
  options: UploadOptions = { compress: true }
): Promise<string> => {
  try {
    let fileToUpload = file;
    
    // Step 1: Compress image if enabled (default: true)
    if (options.compress !== false) {
      console.log('📦 Starting image compression...');
      options.onProgress?.('compressing', 0);
      
      // Show compression estimate
      const estimate = getCompressionEstimate(file);
      console.log(`📊 Original: ${estimate.originalSizeMB}MB, Estimated: ${estimate.estimatedSizeMB}MB`);
      
      options.onProgress?.('compressing', 30);
      
      // Compress the image
      fileToUpload = await compressCardImage(file);
      
      options.onProgress?.('compressing', 100);
      console.log('✅ Compression complete');
    }
    
    // Step 2: Upload to Firebase Storage
    console.log('☁️ Uploading to Firebase Storage...');
    options.onProgress?.('uploading', 0);
    
    const timestamp = Date.now();
    const fileName = `${userId}/${timestamp}_${file.name}`;
    const storageRef = ref(storage, `cards/${fileName}`);
    
    options.onProgress?.('uploading', 30);
    
    await uploadBytes(storageRef, fileToUpload);
    
    options.onProgress?.('uploading', 80);
    
    const downloadURL = await getDownloadURL(storageRef);
    
    options.onProgress?.('uploading', 100);
    console.log('✅ Upload complete:', downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error('❌ Upload error:', error);
    throw error;
  }
};

