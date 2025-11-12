import React from 'react';
import { Card } from '../../types/card';
import { useAuth } from '../../contexts/AuthContext';
import './Sidebar.css';

interface SidebarProps {
  cards: Card[];
  selectedCardId?: string;
  onCardSelect: (cardId: string) => void;
  onClose: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  cards, 
  selectedCardId, 
  onCardSelect, 
  onClose,
  searchQuery = '',
  onSearchChange
}) => {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };
  // Filter cards based on search query
  const filteredCards = searchQuery.trim() 
    ? cards.filter(card => {
        const query = searchQuery.toLowerCase();
        const cardName = (card.cardName || '').toLowerCase();
        const bank = (card.bank || '').toLowerCase();
        const type = card.type.toLowerCase();
        return cardName.includes(query) || bank.includes(query) || type.includes(query);
      })
    : cards;

  return (
    <div className="sidebar-overlay" onClick={onClose}>
      <div className="sidebar" onClick={(e) => e.stopPropagation()}>
        {/* User Info Section */}
        <div className="sidebar-user-info">
          <div className="user-avatar">
            {user?.photoURL ? (
              <img 
                src={user.photoURL} 
                alt={user.displayName || user.email || 'User'}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  console.error('Image failed to load:', user.photoURL);
                  e.currentTarget.style.display = 'none';
                  const placeholder = e.currentTarget.parentElement?.querySelector('.user-avatar-placeholder');
                  if (placeholder) {
                    (placeholder as HTMLElement).style.display = 'flex';
                  }
                }}
              />
            ) : null}
            <div 
              className="user-avatar-placeholder" 
              style={{ display: user?.photoURL ? 'none' : 'flex' }}
            >
              <span className="material-symbols-outlined">person</span>
            </div>
          </div>
          <div className="user-details">
            <h3>{user?.displayName || 'User'}</h3>
            <p>{user?.email}</p>
          </div>
          <button className="close-btn" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="sidebar-header">
          <h2>My Cards ({cards.length})</h2>
        </div>
        {onSearchChange && (
          <div className="sidebar-search">
            <input
              type="text"
              placeholder="Search cards..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="sidebar-search-input"
            />
            <span className="material-symbols-outlined sidebar-search-icon">search</span>
          </div>
        )}
        <div className="sidebar-content">
          {filteredCards.length === 0 ? (
            <div className="sidebar-empty">
              <p>{searchQuery ? 'No cards found' : 'No cards yet'}</p>
            </div>
          ) : (
            <div className="cards-list">
              {filteredCards.map((card) => (
                <div
                  key={card.id}
                  className={`card-item-sidebar ${selectedCardId === card.id ? 'active' : ''}`}
                  onClick={() => card.id && onCardSelect(card.id)}
                >
                  <div className="card-item-preview">
                    {card.imageUrl ? (
                      <img src={card.imageUrl} alt={card.cardName || card.type} />
                    ) : (
                      <div className="card-placeholder">
                        <span className="material-symbols-outlined">
                          {card.type === 'credit' || card.type === 'debit' ? 'credit_card' : 
                           card.type === 'aadhar' ? 'badge' : 
                           card.type === 'pan' ? 'description' : 'folder'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="card-item-info">
                    <h4>{card.cardName || card.type.toUpperCase()}</h4>
                    {card.bank && <span className="bank-tag">{card.bank}</span>}
                    {card.extractionStatus === 'processing' && (
                      <span className="status-tag processing">Extracting...</span>
                    )}
                    {card.extractionStatus === 'failed' && (
                      <span className="status-tag failed">Failed</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sign Out Button */}
        <div className="sidebar-footer">
          <button className="signout-btn" onClick={handleSignOut}>
            <span className="material-symbols-outlined">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

