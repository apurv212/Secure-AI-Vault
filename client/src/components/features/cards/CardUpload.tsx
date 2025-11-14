import React, { useState, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToastContext } from '../../../contexts/ToastContext';
import { uploadImage } from '../../../utils/storage';
import { cardApi, extractApi, isRateLimitError } from '../../../services/api';
import { Card } from '../../../types/card';
import { ProgressBar } from '../../ui/ProgressBar';
import { ManualEntryModal, ManualEntryData } from './ManualEntryModal';
import './CardUpload.css';

interface CardUploadProps {
  onUploadComplete: (card: Card) => void;
}

export const CardUpload: React.FC<CardUploadProps> = ({ onUploadComplete }) => {
  const { user, idToken } = useAuth();
  const toast = useToastContext();
  const [showOptions, setShowOptions] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [extractProgress, setExtractProgress] = useState(0);
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!user || !idToken) return;

    try {
      setUploading(true);
      setExtracting(false);
      setShowOptions(false);
      setUploadProgress(0);
      setExtractProgress(0);
      setCurrentCard(null);

      // Upload image to Firebase Storage with compression
      // Progress callback updates the UI in real-time
      const imageUrl = await uploadImage(file, user.uid, {
        compress: true, // Enable compression (~25% reduction, maintains OCR quality)
        onProgress: (stage, progress) => {
          if (stage === 'compressing') {
            // Compression takes 0-50% of progress bar
            setUploadProgress(Math.floor(progress * 0.5));
          } else if (stage === 'uploading') {
            // Upload takes 50-100% of progress bar
            setUploadProgress(50 + Math.floor(progress * 0.5));
          }
        }
      });
      setUploadProgress(100);

      // Create card entry immediately
      const card = await cardApi.create(idToken, {
        userId: user.uid,
        type: 'other', // Will be updated after extraction
        imageUrl,
        extractionStatus: 'processing'
      });

      setCurrentCard(card);
      onUploadComplete(card); // Show card immediately

      // Start extraction
      setUploading(false);
      setExtracting(true);
      setExtractProgress(0);

      // Simulate extraction progress
      const extractInterval = setInterval(() => {
        setExtractProgress(prev => {
          if (prev >= 90) {
            clearInterval(extractInterval);
            return 90;
          }
          return prev + 5;
        });
      }, 300);

      try {
        const extractedData = await extractApi.extract(idToken, imageUrl, card.id);
        setExtractProgress(100);
        clearInterval(extractInterval);
        
        // Update card with extracted data
        const updatedCard = await cardApi.update(idToken, card.id!, {
          ...extractedData,
          extractionStatus: 'completed'
        });
        
        setCurrentCard(updatedCard);
        onUploadComplete(updatedCard);
      } catch (error: any) {
        clearInterval(extractInterval);
        setExtractProgress(0);
        
        // Check if it's a rate limit error
        if (isRateLimitError(error)) {
          toast.error(error.message || 'Rate limit exceeded. You have reached the maximum number of extractions (10 per hour). Please try again later.');
          await cardApi.update(idToken, card.id!, {
            extractionStatus: 'failed'
          });
        } else {
          toast.error('Extraction failed. Please try re-extracting or editing the card manually.');
          await cardApi.update(idToken, card.id!, {
            extractionStatus: 'failed'
          });
        }
        
        const failedCard = await cardApi.getById(idToken, card.id!);
        setCurrentCard(failedCard);
        onUploadComplete(failedCard);
      } finally {
        setExtracting(false);
        setTimeout(() => {
          setShowOptions(true);
          setUploadProgress(0);
          setExtractProgress(0);
          setCurrentCard(null);
        }, 2000);
      }
    } catch (error: any) {
      // Show appropriate error message
      if (isRateLimitError(error)) {
        toast.error(error.message || 'Rate limit exceeded. Please try again later.');
      } else {
        toast.error('Failed to upload card. Please try again.');
      }
      
      setShowOptions(true);
      setUploading(false);
      setExtracting(false);
      setUploadProgress(0);
      setExtractProgress(0);
    }
  };

  const handleGalleryUpload = () => {
    fileInputRef.current?.click();
  };

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleManualEntry = () => {
    setShowManualModal(true);
  };

  const handleManualSubmit = async (data: ManualEntryData) => {
    if (!user || !idToken) return;

    try {
      let cardData: any = {
        userId: user.uid,
      };

      if (data.entryType === 'card') {
        // Card entry
        cardData = {
          ...cardData,
          type: data.cardType,
          cardNumber: data.cardNumber?.replace(/\s/g, ''),
          cardHolderName: data.cardHolderName,
          expiryDate: data.expiryDate,
          cvv: data.cvv,
          bank: data.bankName,
          extractionStatus: 'completed',
        };
      } else {
        // Document entry
        cardData = {
          ...cardData,
          type: data.documentType === 'aadhar' ? 'aadhar' : data.documentType === 'pan' ? 'pan' : 'other',
          cardName: data.documentName,
          cardNumber: data.idNumber,
          cardHolderName: data.notes,
          extractionStatus: 'completed',
        };
      }

      const card = await cardApi.create(idToken, cardData);
      setShowManualModal(false);
      toast.success('Entry created successfully');
      onUploadComplete(card);
    } catch (error) {
      toast.error('Failed to create entry. Please try again.');
    }
  };

  if (uploading || extracting) {
    return (
      <div className="card-upload">
        <h2>Uploading Card</h2>
        {uploading && (
          <ProgressBar 
            progress={uploadProgress} 
            label={uploadProgress < 50 ? "Compressing image..." : "Uploading to server..."}
          />
        )}
        {extracting && (
          <ProgressBar 
            progress={extractProgress} 
            label="Extracting card details with AI..."
          />
        )}
        {currentCard && currentCard.imageUrl && (
          <div className="uploaded-card-preview">
            <img src={currentCard.imageUrl} alt="Uploaded card" />
          </div>
        )}
      </div>
    );
  }

  if (!showOptions && currentCard) {
    return null; // Card is being displayed in main area
  }

  return (
    <div className="space-y-4">
      {/* Upload from Gallery */}
      <button
        onClick={handleGalleryUpload}
        className="w-full bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-colors shadow-sm"
      >
        <div className="flex items-center gap-4">
          <div className="p-4 bg-blue-600 rounded-xl">
            <span className="material-symbols-outlined text-white text-2xl">folder_open</span>
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Upload from Gallery</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Select an existing photo of your card.</p>
          </div>
          <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
        </button>

      {/* Take Photo */}
      <button
        onClick={handleCameraCapture}
        className="w-full bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-colors shadow-sm"
      >
        <div className="flex items-center gap-4">
          <div className="p-4 bg-blue-600 rounded-xl">
            <span className="material-symbols-outlined text-white text-2xl">photo_camera</span>
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Take Photo</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Use your camera to scan your card instantly.</p>
          </div>
          <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
        </button>

      {/* Enter Manually */}
      <button
        onClick={handleManualEntry}
        className="w-full bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-colors shadow-sm"
      >
        <div className="flex items-center gap-4">
          <div className="p-4 bg-blue-600 rounded-xl">
            <span className="material-symbols-outlined text-white text-2xl">edit_note</span>
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Enter Manually</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Type in your card details yourself.</p>
          </div>
          <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
        </button>

      {/* Security Message */}
      <div className="text-center pt-4">
        <p className="text-sm text-slate-500 dark:text-slate-600">Your data is encrypted and stored securely.</p>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Manual Entry Modal */}
      {showManualModal && (
        <ManualEntryModal
          onClose={() => setShowManualModal(false)}
          onSubmit={handleManualSubmit}
        />
      )}
    </div>
  );
};

