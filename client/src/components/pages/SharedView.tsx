import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Card } from '../../types/card';
import { Loading } from '../ui/Loading';
import { NetworkLogo } from '../ui/NetworkLogo';
import { getCardNetwork } from '../../utils/cardUtils';
import './SharedView.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface SharedFolderData {
  folder: {
    name: string;
    description: string;
    cardCount: number;
  };
  cards: Card[];
}

export const SharedView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedFolderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    const fetchSharedFolder = async () => {
      if (!token) {
        setError('Invalid share link');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/sharefolders/public/${token}`);
        setData(response.data);
      } catch (err: any) {
        console.error('Error fetching shared folder:', err);
        if (err.response?.status === 404) {
          setError('This share link is invalid or has been revoked.');
        } else if (err.response?.status === 410) {
          setError('This share link has expired.');
        } else {
          setError('Failed to load shared folder. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSharedFolder();
  }, [token]);

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatCardNumber = (cardNumber: string): string => {
    const digits = cardNumber.replace(/\D/g, '');
    if (digits.length === 16) {
      return `${digits.substring(0, 4)} ${digits.substring(4, 8)} ${digits.substring(8, 12)} ${digits.substring(12, 16)}`;
    }
    return cardNumber;
  };

  const getCardTitle = (card: Card): string => {
    return card.bank || card.cardName || 'Unknown';
  };

  const getCardSubtitle = (card: Card): string => {
    const typeMap: Record<string, string> = {
      credit: 'Credit Card',
      debit: 'Debit Card',
      aadhar: 'Aadhaar Card',
      pan: 'PAN Card',
      other: 'Other',
    };
    return typeMap[card.type] || card.type;
  };

  const getNetworkForCard = (card: Card): string => {
    if ((card.type === 'credit' || card.type === 'debit') && card.cardNumber) {
      return getCardNetwork(card.cardNumber);
    }
    return card.type;
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="shared-view-error">
        <div className="error-container">
          <div className="error-icon">
            <span className="material-symbols-outlined">error</span>
          </div>
          <h1>Unable to Load Share</h1>
          <p>{error}</p>
          <p className="error-hint">
            If you believe this is a mistake, please contact the person who shared this link.
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="shared-view">
      <div className="shared-header">
        <div className="shared-header-content">
          <div className="logo">
            <span className="material-symbols-outlined">folder_shared</span>
          </div>
          <div className="header-text">
            <h1>{data.folder.name}</h1>
            {data.folder.description && <p>{data.folder.description}</p>}
            <div className="card-count">
              <span className="material-symbols-outlined">credit_card</span>
              {data.folder.cardCount} {data.folder.cardCount === 1 ? 'card' : 'cards'}
            </div>
          </div>
        </div>
      </div>

      <div className="shared-content">
        {data.cards.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined">folder_off</span>
            <p>This folder is empty</p>
          </div>
        ) : (
          <div className="cards-grid">
            {data.cards.map((card) => (
              <div key={card.id} className="shared-card">
                {card.imageUrl && (
                  <div className="card-image">
                    <img src={card.imageUrl} alt={card.cardName || card.type} />
                  </div>
                )}

                <div className="card-content">
                  <div className="card-header">
                    <div>
                      <h3>{getCardTitle(card)}</h3>
                      <p className="card-type">{getCardSubtitle(card)}</p>
                    </div>
                    <NetworkLogo network={getNetworkForCard(card)} />
                  </div>

                  <div className="card-details">
                    {card.cardNumber && (
                      <div className="detail-row">
                        <span className="label">Card Number</span>
                        <div className="value-with-copy">
                          <span className="value">{formatCardNumber(card.cardNumber)}</span>
                          <button
                            onClick={() => copyToClipboard(card.cardNumber!, `${card.id}-number`)}
                            className="copy-btn"
                            title="Copy card number"
                          >
                            <span className="material-symbols-outlined">content_copy</span>
                          </button>
                          {copiedField === `${card.id}-number` && (
                            <span className="copied-indicator">Copied!</span>
                          )}
                        </div>
                      </div>
                    )}

                    {card.cardHolderName && (
                      <div className="detail-row">
                        <span className="label">Cardholder</span>
                        <div className="value-with-copy">
                          <span className="value">{card.cardHolderName}</span>
                          <button
                            onClick={() => copyToClipboard(card.cardHolderName!, `${card.id}-name`)}
                            className="copy-btn"
                            title="Copy name"
                          >
                            <span className="material-symbols-outlined">content_copy</span>
                          </button>
                          {copiedField === `${card.id}-name` && (
                            <span className="copied-indicator">Copied!</span>
                          )}
                        </div>
                      </div>
                    )}

                    {card.expiryDate && (
                      <div className="detail-row">
                        <span className="label">Expiry</span>
                        <div className="value-with-copy">
                          <span className="value">{card.expiryDate}</span>
                          <button
                            onClick={() => copyToClipboard(card.expiryDate!, `${card.id}-expiry`)}
                            className="copy-btn"
                            title="Copy expiry"
                          >
                            <span className="material-symbols-outlined">content_copy</span>
                          </button>
                          {copiedField === `${card.id}-expiry` && (
                            <span className="copied-indicator">Copied!</span>
                          )}
                        </div>
                      </div>
                    )}

                    {card.cvv && (
                      <div className="detail-row">
                        <span className="label">CVV</span>
                        <div className="value-with-copy">
                          <span className="value cvv-value">{card.cvv}</span>
                          <button
                            onClick={() => copyToClipboard(card.cvv!, `${card.id}-cvv`)}
                            className="copy-btn"
                            title="Copy CVV"
                          >
                            <span className="material-symbols-outlined">content_copy</span>
                          </button>
                          {copiedField === `${card.id}-cvv` && (
                            <span className="copied-indicator">Copied!</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="shared-footer">
        <p>
          <span className="material-symbols-outlined">lock</span>
          This is a secure share from{' '}
          <a 
            href="https://secure-ai-vault.vercel.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'underline' }}
          >
            click here
          </a>
        </p>
      </div>
    </div>
  );
};

