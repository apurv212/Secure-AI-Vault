import React, { useState, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { uploadImage } from '../../../utils/storage';
import { cardApi, extractApi } from '../../../services/api';
import { CardType, Card } from '../../../types/card';
import { ProgressBar } from '../../ui/ProgressBar';
import './CardUpload.css';

interface CardUploadProps {
  onUploadComplete: (card: Card) => void;
}

export const CardUpload: React.FC<CardUploadProps> = ({ onUploadComplete }) => {
  const { user, idToken } = useAuth();
  const [showOptions, setShowOptions] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [extractProgress, setExtractProgress] = useState(0);
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
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

      // Simulate upload progress
      const uploadInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(uploadInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Upload image to Firebase Storage
      const imageUrl = await uploadImage(file, user.uid);
      setUploadProgress(100);
      clearInterval(uploadInterval);

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
      } catch (error) {
        console.error('Extraction error:', error);
        clearInterval(extractInterval);
        setExtractProgress(0);
        await cardApi.update(idToken, card.id!, {
          extractionStatus: 'failed'
        });
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
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload card. Please try again.');
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
    const type = prompt('Enter card type (credit/debit/aadhar/pan/other):') as CardType;
    if (!type || !['credit', 'debit', 'aadhar', 'pan', 'other'].includes(type)) {
      alert('Invalid card type');
      return;
    }

    const cardName = prompt('Enter card name (optional):') || '';
    
    if (!user || !idToken) return;

    cardApi.create(idToken, {
      userId: user.uid,
      type,
      cardName: cardName || undefined
    }).then((card) => {
      onUploadComplete(card);
    }).catch((error) => {
      console.error('Error creating card:', error);
      alert('Failed to create card. Please try again.');
    });
  };

  if (uploading || extracting) {
    return (
      <div className="card-upload">
        <h2>Uploading Card</h2>
        {uploading && (
          <ProgressBar 
            progress={uploadProgress} 
            label="Uploading image to server..."
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
    </div>
  );
};

