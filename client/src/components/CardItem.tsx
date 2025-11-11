import React, { useState, useEffect } from 'react';
import { Card, CardType } from '../types/card';
import { useAuth } from '../contexts/AuthContext';
import { cardApi, extractApi } from '../services/api';
import { Skeleton } from './Skeleton';
import './CardItem.css';

interface CardItemProps {
  card: Card;
  onUpdate: () => void;
}

export const CardItem: React.FC<CardItemProps> = ({ card, onUpdate }) => {
  const { idToken } = useAuth();
  const [reExtracting, setReExtracting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<Card>>({
    cardName: card.cardName || '',
    cardNumber: card.cardNumber || '',
    cardHolderName: card.cardHolderName || '',
    expiryDate: card.expiryDate || '',
    cvv: card.cvv || '',
    bank: card.bank || '',
    type: card.type,
  });

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
      console.error('Re-extraction error:', error);
      alert('Failed to re-extract. Please try again.');
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
      onUpdate();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete card. Please try again.');
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
      onUpdate();
    } catch (error) {
      console.error('Update error:', error);
      alert('Failed to update card. Please try again.');
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
            <span className="icon">🔄</span> {reExtracting ? 'Extracting...' : 'Extract Again'}
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
            <img src={card.imageUrl} alt={card.cardName || card.type} />
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
    <div className="card-item">
      {card.imageUrl && (
        <div className="card-image">
          <img src={card.imageUrl} alt={card.cardName || card.type} />
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
                    <span className="icon">📋</span>
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
                    <span className="icon">📋</span>
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
                    <span className="icon">📋</span>
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
                    title="Copy"
                  >
                    <span className="icon">📋</span>
                    {copied === 'cvv' && <span className="copied-indicator">Copied!</span>}
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
            <span className="icon">🔄</span> {reExtracting ? 'Extracting...' : 'Extract Again'}
          </button>
        )}

        {card.extractionStatus === 'failed' && card.imageUrl && (
          <div className="error-message">
            <p>Extraction failed. Please try again.</p>
            <button onClick={handleReExtract} className="re-extract-btn">
              <span className="icon">🔄</span> Try Again
            </button>
          </div>
        )}

        <div className="card-actions">
          <button onClick={handleEdit} className="edit-btn" title="Edit card">
            <span className="icon">✏️</span> Edit
          </button>
          <button onClick={handleDelete} className="delete-btn" title="Delete card">
            <span className="icon">🗑️</span> Delete
          </button>
        </div>
      </div>
    </div>
  );
};

