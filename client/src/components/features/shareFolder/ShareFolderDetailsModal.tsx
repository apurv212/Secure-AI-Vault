import React, { useState, useEffect } from 'react';
import { Modal } from '../../ui/Modal';
import { Card, ShareFolder, ShareHistoryEntry } from '../../../types/card';
import { shareFolderApi, cardApi } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { NetworkLogo } from '../../ui/NetworkLogo';
import { getCardNetwork } from '../../../utils/cardUtils';
import './ShareFolderDetailsModal.css';

interface ShareFolderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: ShareFolder;
  onUpdate: () => void;
  onShare: (folder: ShareFolder) => void;
}

export const ShareFolderDetailsModal: React.FC<ShareFolderDetailsModalProps> = ({
  isOpen,
  onClose,
  folder,
  onUpdate,
  onShare,
}) => {
  const { idToken } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [shareHistory, setShareHistory] = useState<ShareHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    const fetchCards = async () => {
      if (!isOpen || !idToken || !folder.cardIds || folder.cardIds.length === 0) {
        setCards([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Fetch all user's cards
        const allCards = await cardApi.getAll(idToken);
        
        // Filter to only cards in this folder
        const folderCards = allCards.filter((card: Card) => 
          folder.cardIds.includes(card.id!)
        );
        
        setCards(folderCards);
      } catch (error) {
        console.error('Error fetching cards:', error);
        setCards([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
  }, [isOpen, folder.cardIds, idToken]);

  const handleRemoveCard = async (cardId: string) => {
    if (!idToken || !folder.id) return;

    const confirmed = window.confirm(
      'Remove this card from the folder?\n\nThe card itself will not be deleted.'
    );
    
    if (!confirmed) return;

    try {
      setRemoving(cardId);
      await shareFolderApi.removeCard(idToken, folder.id, cardId);
      onUpdate();
      
      // Update local state
      setCards(prev => prev.filter(card => card.id !== cardId));
    } catch (error: any) {
      console.error('Remove card error:', error);
      alert('Failed to remove card. Please try again.');
    } finally {
      setRemoving(null);
    }
  };

  const handleShareFolder = () => {
    if (cards.length === 0) {
      alert('Add at least one card to the folder before sharing.');
      return;
    }
    onShare(folder);
  };

  const handleRevokeLink = async () => {
    if (!idToken || !folder.id) return;

    const confirmed = window.confirm(
      'Revoke the current share link?\n\nThe link will stop working immediately. You can generate a new link anytime.'
    );
    
    if (!confirmed) return;

    try {
      setRevoking(true);
      await shareFolderApi.revokeShareLink(idToken, folder.id);
      onUpdate();
      alert('Share link revoked successfully!');
    } catch (error: any) {
      console.error('Revoke link error:', error);
      alert(error.response?.data?.error || 'Failed to revoke share link. Please try again.');
    } finally {
      setRevoking(false);
    }
  };

  const handleViewHistory = async () => {
    if (!idToken || !folder.id) return;

    try {
      setHistoryLoading(true);
      setShowHistory(true);
      const response = await shareFolderApi.getShareHistory(idToken, folder.id);
      setShareHistory(response.history || []);
    } catch (error: any) {
      console.error('Fetch history error:', error);
      alert('Failed to load share history. Please try again.');
      setShowHistory(false);
    } finally {
      setHistoryLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Link copied to clipboard!');
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getCardTitle = (card: Card): string => {
    return card.bank || card.cardName || card.type.toUpperCase();
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

  const formatCardNumber = (cardNumber: string): string => {
    const last4 = cardNumber.slice(-4);
    return `•••• ${last4}`;
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={folder.name}
      maxWidth="600px"
    >
      <div className="folder-details-content">
        {/* Folder Info */}
        {folder.description && (
          <div className="folder-description">
            <p>{folder.description}</p>
          </div>
        )}

        {/* Stats */}
        <div className="folder-stats">
          <div className="stat-item">
            <span className="material-symbols-outlined">credit_card</span>
            <span>{cards.length} {cards.length === 1 ? 'card' : 'cards'}</span>
          </div>
        </div>

        {/* Cards List */}
        <div className="folder-cards-section">
          <div className="section-header">
            <h3>Cards in this folder</h3>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading cards...</p>
            </div>
          ) : cards.length === 0 ? (
            <div className="empty-state">
              <span className="material-symbols-outlined">folder_off</span>
              <p>No cards in this folder</p>
              <span className="empty-hint">Use the 3-dot menu on any card to add it here</span>
            </div>
          ) : (
            <div className="cards-list">
              {cards.map((card) => (
                <div key={card.id} className="card-item-compact">
                  <div className="card-item-left">
                    <NetworkLogo network={getNetworkForCard(card)} />
                    <div className="card-info">
                      <h4>{getCardTitle(card)}</h4>
                      <p className="card-type">{getCardSubtitle(card)}</p>
                      {card.cardNumber && (
                        <p className="card-number">{formatCardNumber(card.cardNumber)}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveCard(card.id!)}
                    className="remove-card-btn"
                    disabled={removing === card.id}
                    title="Remove from folder"
                  >
                    {removing === card.id ? (
                      <span className="spinner-small"></span>
                    ) : (
                      <span className="material-symbols-outlined">close</span>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Share Status & Actions */}
        {folder.isPublic && folder.shareToken && (
          <div className="share-status-section">
            <div className="share-status-header">
              <span className="material-symbols-outlined status-icon active">link</span>
              <div className="status-info">
                <h4>Active Share Link</h4>
                <p className="status-text">This folder is currently shared</p>
              </div>
            </div>
            <div className="share-actions">
              <button
                onClick={() => copyToClipboard(`${window.location.origin}/shared/${folder.shareToken}`)}
                className="copy-link-btn-small"
                title="Copy link"
              >
                <span className="material-symbols-outlined">content_copy</span>
                Copy Link
              </button>
              <button
                onClick={handleRevokeLink}
                className="revoke-link-btn"
                disabled={revoking}
                title="Revoke link"
              >
                {revoking ? (
                  <span className="spinner-small"></span>
                ) : (
                  <>
                    <span className="material-symbols-outlined">link_off</span>
                    Revoke Link
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Share History */}
        {!showHistory ? (
          <div className="history-toggle-section">
            <button
              onClick={handleViewHistory}
              className="view-history-btn"
              disabled={historyLoading}
            >
              {historyLoading ? (
                <span className="spinner-small"></span>
              ) : (
                <>
                  <span className="material-symbols-outlined">history</span>
                  View Share History
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="share-history-section">
            <div className="section-header">
              <h3>Share History</h3>
              <button
                onClick={() => setShowHistory(false)}
                className="close-history-btn"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {shareHistory.length === 0 ? (
              <div className="empty-state">
                <span className="material-symbols-outlined">history</span>
                <p>No share history yet</p>
              </div>
            ) : (
              <div className="history-list">
                {shareHistory.map((entry, index) => (
                  <div key={index} className={`history-item ${entry.isActive ? 'active' : 'revoked'}`}>
                    <div className="history-item-header">
                      <span className={`material-symbols-outlined status-icon ${entry.isActive ? 'active' : 'revoked'}`}>
                        {entry.isActive ? 'check_circle' : 'cancel'}
                      </span>
                      <span className="history-status">
                        {entry.isActive ? 'Active' : 'Revoked'}
                      </span>
                    </div>
                    <div className="history-item-details">
                      <div className="history-detail">
                        <span className="detail-label">Created:</span>
                        <span className="detail-value">{formatDate(entry.createdAt)}</span>
                      </div>
                      {entry.expiresAt && (
                        <div className="history-detail">
                          <span className="detail-label">Expires:</span>
                          <span className="detail-value">{formatDate(entry.expiresAt)}</span>
                        </div>
                      )}
                      {entry.revokedAt && (
                        <div className="history-detail">
                          <span className="detail-label">Revoked:</span>
                          <span className="detail-value">{formatDate(entry.revokedAt)}</span>
                        </div>
                      )}
                    </div>
                    {entry.isActive && (
                      <button
                        onClick={() => copyToClipboard(entry.shareUrl)}
                        className="copy-history-link-btn"
                        title="Copy link"
                      >
                        <span className="material-symbols-outlined">content_copy</span>
                        Copy Link
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="folder-actions-section">
          <button
            onClick={handleShareFolder}
            className="share-folder-action-btn"
            disabled={cards.length === 0}
          >
            <span className="material-symbols-outlined">share</span>
            {folder.isPublic ? 'Generate New Link' : 'Generate Share Link'}
          </button>
          <button
            onClick={onClose}
            className="close-action-btn"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

