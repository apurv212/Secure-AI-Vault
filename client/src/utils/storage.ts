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
      options.onProgress?.('compressing', 0);
      
      // Get compression estimate
      getCompressionEstimate(file);
      
      options.onProgress?.('compressing', 30);
      
      // Compress the image
      fileToUpload = await compressCardImage(file);
      
      options.onProgress?.('compressing', 100);
    }
    
    // Step 2: Upload to Firebase Storage
    options.onProgress?.('uploading', 0);
    
    const timestamp = Date.now();
    const fileName = `${userId}/${timestamp}_${file.name}`;
    const storageRef = ref(storage, `cards/${fileName}`);
    
    options.onProgress?.('uploading', 30);
    
    await uploadBytes(storageRef, fileToUpload);
    
    options.onProgress?.('uploading', 80);
    
    const downloadURL = await getDownloadURL(storageRef);
    
    options.onProgress?.('uploading', 100);
    
    return downloadURL;
  } catch (error) {
    throw error;
  }
};

