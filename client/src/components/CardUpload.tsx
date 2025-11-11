import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { uploadImage } from '../utils/storage';
import { cardApi, extractApi } from '../services/api';
import { CardType, Card } from '../types/card';
import { ProgressBar } from './ProgressBar';
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
    <div className="card-upload">
      <h2>Add New Card</h2>
      <div className="upload-options">
        <button onClick={handleGalleryUpload} className="upload-option">
          <span>📁</span>
          Upload from Gallery
        </button>
        <button onClick={handleCameraCapture} className="upload-option">
          <span>📷</span>
          Take Photo
        </button>
        <button onClick={handleManualEntry} className="upload-option">
          <span>✏️</span>
          Enter Manually
        </button>
      </div>
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

