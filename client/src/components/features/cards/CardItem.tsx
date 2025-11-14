import React, { useState, useEffect } from 'react';
import { Card, CardType } from '../../../types/card';
import { useAuth } from '../../../contexts/AuthContext';
import { useToastContext } from '../../../contexts/ToastContext';
import { cardApi, extractApi } from '../../../services/api';
import { Skeleton } from '../../ui/Skeleton';
import './CardItem.css';

interface CardItemProps {
  card: Card;
  onUpdate: () => void;
}

export const CardItem: React.FC<CardItemProps> = ({ card, onUpdate }) => {
  const { idToken } = useAuth();
  const toast = useToastContext();
  const [reExtracting, setReExtracting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const [displayImageUrl, setDisplayImageUrl] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [editData, setEditData] = useState<Partial<Card>>({
    cardName: card.cardName || '',
    cardNumber: card.cardNumber || '',
    cardHolderName: card.cardHolderName || '',
    expiryDate: card.expiryDate || '',
    cvv: card.cvv || '',
    bank: card.bank || '',
    type: card.type,
  });

  // Load card image (handles encrypted images)
  useEffect(() => {
    const loadImage = async () => {
      if (!card.imageUrl || !idToken || !card.id) return;
      
      try {
        setLoadingImage(true);
        const imageUrl = await cardApi.getCardImage(idToken, card.id);
        setDisplayImageUrl(imageUrl);
      } catch (error) {
        // Fallback to direct URL if decryption fails
        setDisplayImageUrl(card.imageUrl);
      } finally {
        setLoadingImage(false);
      }
    };
    
    loadImage();
  }, [card.imageUrl, card.id, idToken]);

  // Update editData when card prop changes
  useEffect(() => {
    if (!isEditing) {
      setEditData({
        cardName: card.cardName || '',
        cardNumber: card.cardNumber || '',
        cardHolderName: card.cardHolderName || '',
        expiryDate: card.expiryDate || '',
        cvv: card.cvv || '',
        bank: card.bank || '',
        type: card.type,
      });
    }
  }, [card, isEditing]);

  // Handle ESC key to close image modal
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isImageExpanded) {
        setIsImageExpanded(false);
      }
    };

    if (isImageExpanded) {
      document.addEventListener('keydown', handleEscKey);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [isImageExpanded]);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatCardNumber = (cardNumber: string): string => {
    // Remove all non-digits
    const digits = cardNumber.replace(/\D/g, '');
    // Format as XXXX XXXX XXXX XXXX
    if (digits.length === 16) {
      return `${digits.substring(0, 4)} ${digits.substring(4, 8)} ${digits.substring(8, 12)} ${digits.substring(12, 16)}`;
    }
    // Return as-is if not 16 digits
    return cardNumber;
  };

  const handleReExtract = async () => {
    if (!card.imageUrl || !idToken || !card.id) return;

    try {
      setReExtracting(true);
      const extractedData = await extractApi.extract(idToken, card.imageUrl, card.id);
      await cardApi.update(idToken, card.id, {
        ...extractedData,
        extractionStatus: 'completed'
      });
      onUpdate();
    } catch (error) {
      toast.error('Failed to re-extract. Please try again.');
    } finally {
      setReExtracting(false);
    }
  };

  const handleDelete = async () => {
    if (!idToken || !card.id) return;

    const confirmed = window.confirm(`Are you sure you want to delete "${card.cardName || card.type}" card? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      await cardApi.delete(idToken, card.id);
      toast.success('Card deleted successfully');
      onUpdate();
    } catch (error) {
      toast.error('Failed to delete card. Please try again.');
    }
  };

  const handleDeleteCVV = async () => {
    if (!idToken || !card.id) return;

    const confirmed = window.confirm(
      '⚠️ Delete CVV only?\n\n' +
      'This will remove the CVV but keep all other card details.\n\n' +
      'You can add it again later if needed.'
    );
    if (!confirmed) return;

    try {
      await cardApi.deleteCVV(idToken, card.id);
      toast.success('CVV deleted successfully');
      onUpdate();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      toast.error(`Failed to delete CVV: ${errorMessage}`);
    }
  };

  const handleEdit = () => {
    setEditData({
      cardName: card.cardName || '',
      cardNumber: card.cardNumber || '',
      cardHolderName: card.cardHolderName || '',
      expiryDate: card.expiryDate || '',
      cvv: card.cvv || '',
      bank: card.bank || '',
      type: card.type,
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({
      cardName: card.cardName || '',
      cardNumber: card.cardNumber || '',
      cardHolderName: card.cardHolderName || '',
      expiryDate: card.expiryDate || '',
      cvv: card.cvv || '',
      bank: card.bank || '',
      type: card.type,
    });
  };

  const handleSave = async () => {
    if (!idToken || !card.id) return;

    try {
      setIsSaving(true);
      
      // Clean card number - remove spaces and dashes
      const cleanedCardNumber = editData.cardNumber?.replace(/[\s-]/g, '') || '';
      
      // Clean CVV - remove spaces
      const cleanedCvv = editData.cvv?.replace(/\s/g, '') || '';
      
      // Prepare update data
      const updateData: Partial<Card> = {
        ...editData,
        cardNumber: cleanedCardNumber || undefined,
        cvv: cleanedCvv || undefined,
        // Remove empty strings
        cardName: editData.cardName?.trim() || undefined,
        cardHolderName: editData.cardHolderName?.trim() || undefined,
        expiryDate: editData.expiryDate?.trim() || undefined,
        bank: editData.bank?.trim() || undefined,
      };

      await cardApi.update(idToken, card.id, updateData);
      setIsEditing(false);
      toast.success('Card updated successfully');
      onUpdate();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      toast.error(`Failed to update card: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof Card, value: string | CardType) => {
    setEditData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const isExtracting = card.extractionStatus === 'processing' || 
                       card.extractionStatus === 'pending' ||
                       reExtracting;

  if (isExtracting && card.imageUrl) {
    return (
      <div className="card-item">
        <Skeleton />
        {card.extractionStatus === 'completed' && (
          <button 
            onClick={handleReExtract} 
            className="re-extract-btn"
            disabled={reExtracting}
          >
            <span className="material-symbols-outlined">refresh</span> {reExtracting ? 'Extracting...' : 'Extract Again'}
          </button>
        )}
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="card-item">
        {card.imageUrl && (
          <div className="card-image">
            {loadingImage ? (
              <div className="skeleton-loader" style={{ width: '100%', height: '200px' }} />
            ) : displayImageUrl ? (
              <img src={displayImageUrl} alt={card.cardName || card.type} />
            ) : null}
          </div>
        )}
        
        <div className="card-details">
          <div className="card-header">
            <h3>Edit Card Details</h3>
          </div>

          <div className="edit-form">
            <div className="form-group">
              <label htmlFor="edit-type">Category/Type:</label>
              <select
                id="edit-type"
                value={editData.type}
                onChange={(e) => handleInputChange('type', e.target.value as CardType)}
                className="form-input"
              >
                <option value="credit">Credit</option>
                <option value="debit">Debit</option>
                <option value="aadhar">Aadhar</option>
                <option value="pan">PAN</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="edit-cardName">Card Name:</label>
              <input
                id="edit-cardName"
                type="text"
                value={editData.cardName}
                onChange={(e) => handleInputChange('cardName', e.target.value)}
                className="form-input"
                placeholder="e.g., TATA NEUCARD+"
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-bank">Bank:</label>
              <input
                id="edit-bank"
                type="text"
                value={editData.bank}
                onChange={(e) => handleInputChange('bank', e.target.value)}
                className="form-input"
                placeholder="e.g., HDFC, SBI, ICICI"
              />
            </div>

            {(editData.type === 'credit' || editData.type === 'debit') && (
              <>
                <div className="form-group">
                  <label htmlFor="edit-cardNumber">Card Number:</label>
                  <input
                    id="edit-cardNumber"
                    type="text"
                    value={editData.cardNumber}
                    onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                    className="form-input"
                    placeholder="16 digits"
                    maxLength={19}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-cardHolderName">Cardholder Name:</label>
                  <input
                    id="edit-cardHolderName"
                    type="text"
                    value={editData.cardHolderName}
                    onChange={(e) => handleInputChange('cardHolderName', e.target.value)}
                    className="form-input"
                    placeholder="Name on card"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-expiryDate">Expiry Date:</label>
                  <input
                    id="edit-expiryDate"
                    type="text"
                    value={editData.expiryDate}
                    onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                    className="form-input"
                    placeholder="MM/YY"
                    maxLength={5}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-cvv">CVV:</label>
                  <input
                    id="edit-cvv"
                    type="text"
                    value={editData.cvv}
                    onChange={(e) => handleInputChange('cvv', e.target.value)}
                    className="form-input"
                    placeholder="3 digits"
                    maxLength={4}
                  />
                </div>
              </>
            )}

            {(editData.type === 'aadhar' || editData.type === 'pan') && (
              <div className="form-group">
                <label htmlFor="edit-cardHolderName">Name:</label>
                <input
                  id="edit-cardHolderName"
                  type="text"
                  value={editData.cardHolderName}
                  onChange={(e) => handleInputChange('cardHolderName', e.target.value)}
                  className="form-input"
                  placeholder="Full name"
                />
              </div>
            )}

            {editData.type === 'pan' && (
              <div className="form-group">
                <label htmlFor="edit-cardNumber">PAN Number:</label>
                <input
                  id="edit-cardNumber"
                  type="text"
                  value={editData.cardNumber}
                  onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                  className="form-input"
                  placeholder="PAN number"
                  maxLength={10}
                />
              </div>
            )}

            <div className="form-actions">
              <button
                onClick={handleSave}
                className="save-btn"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleCancel}
                className="cancel-btn"
                disabled={isSaving}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card-item">
        {card.imageUrl && (
          <div className="card-image">
            {loadingImage ? (
              <div className="skeleton-loader" style={{ width: '100%', height: '200px', borderRadius: '8px', background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'loading 1.5s ease-in-out infinite' }} />
            ) : displayImageUrl ? (
              <>
                <img src={displayImageUrl} alt={card.cardName || card.type} />
                <button 
                  className="expand-image-btn" 
                  onClick={() => setIsImageExpanded(true)}
                  title="Expand image"
                >
                  <span className="material-symbols-outlined">open_in_full</span>
                </button>
              </>
            ) : null}
          </div>
        )}
        
        <div className="card-details">
        <div className="card-header">
          <h3>{card.cardName || card.type.toUpperCase()}</h3>
          {card.bank && <span className="bank-badge">{card.bank}</span>}
        </div>

        {(card.type === 'credit' || card.type === 'debit') && (
          <>
            {card.cardNumber && (
              <div className="detail-row">
                <span className="label">Card Number:</span>
                <div className="value-with-copy">
                  <span>{formatCardNumber(card.cardNumber)}</span>
                  <button
                    onClick={() => copyToClipboard(card.cardNumber!, 'number')}
                    className="copy-btn"
                    title="Copy"
                  >
                    <span className="material-symbols-outlined">content_copy</span>
                    {copied === 'number' && <span className="copied-indicator">Copied!</span>}
                  </button>
                </div>
              </div>
            )}

            {card.cardHolderName && (
              <div className="detail-row">
                <span className="label">Cardholder Name:</span>
                <div className="value-with-copy">
                  <span>{card.cardHolderName}</span>
                  <button
                    onClick={() => copyToClipboard(card.cardHolderName!, 'name')}
                    className="copy-btn"
                    title="Copy"
                  >
                    <span className="material-symbols-outlined">content_copy</span>
                    {copied === 'name' && <span className="copied-indicator">Copied!</span>}
                  </button>
                </div>
              </div>
            )}

            {card.expiryDate && (
              <div className="detail-row">
                <span className="label">Expiry Date:</span>
                <div className="value-with-copy">
                  <span>{card.expiryDate}</span>
                  <button
                    onClick={() => copyToClipboard(card.expiryDate!, 'expiry')}
                    className="copy-btn"
                    title="Copy"
                  >
                    <span className="material-symbols-outlined">content_copy</span>
                    {copied === 'expiry' && <span className="copied-indicator">Copied!</span>}
                  </button>
                </div>
              </div>
            )}

            {card.cvv && (
              <div className="detail-row">
                <span className="label">CVV:</span>
                <div className="value-with-copy">
                  <span>{card.cvv}</span>
                  <button
                    onClick={() => copyToClipboard(card.cvv!, 'cvv')}
                    className="copy-btn"
                    title="Copy CVV"
                  >
                    <span className="material-symbols-outlined">content_copy</span>
                    {copied === 'cvv' && <span className="copied-indicator">Copied!</span>}
                  </button>
                  <button
                    onClick={handleDeleteCVV}
                    className="copy-btn"
                    style={{ color: '#DC2626', marginLeft: '4px' }}
                    title="Delete CVV (Security - recommended)"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {card.type === 'aadhar' && card.cardHolderName && (
          <div className="detail-row">
            <span className="label">Name:</span>
            <span>{card.cardHolderName}</span>
          </div>
        )}

        {card.type === 'pan' && card.cardNumber && (
          <div className="detail-row">
            <span className="label">PAN Number:</span>
            <span>{card.cardNumber}</span>
          </div>
        )}

        {card.imageUrl && card.extractionStatus === 'completed' && (
          <button 
            onClick={handleReExtract} 
            className="re-extract-btn"
            disabled={reExtracting}
          >
            <span className="material-symbols-outlined">refresh</span> {reExtracting ? 'Extracting...' : 'Extract Again'}
          </button>
        )}

        {card.extractionStatus === 'failed' && card.imageUrl && (
          <div className="error-message">
            <p>Extraction failed. Please try again.</p>
            <button onClick={handleReExtract} className="re-extract-btn">
              <span className="material-symbols-outlined">refresh</span> Try Again
            </button>
          </div>
        )}

        <div className="card-actions">
          <button onClick={handleEdit} className="edit-btn" title="Edit card">
            <span className="material-symbols-outlined">edit</span> Edit
          </button>
          <button onClick={handleDelete} className="delete-btn" title="Delete card">
            <span className="material-symbols-outlined">delete</span> Delete
          </button>
        </div>
      </div>
    </div>

    {/* Image Expansion Modal */}
    {isImageExpanded && displayImageUrl && (
      <div className="image-modal-overlay" onClick={() => setIsImageExpanded(false)}>
        <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
          <button 
            className="image-modal-close" 
            onClick={() => setIsImageExpanded(false)}
            title="Close (ESC)"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          {loadingImage ? (
            <div className="skeleton-loader" style={{ width: '80vw', height: '80vh', borderRadius: '8px' }} />
          ) : (
            <img src={displayImageUrl} alt={card.cardName || card.type} />
          )}
        </div>
      </div>
    )}
    </>
  );
};

