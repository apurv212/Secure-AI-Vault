import React from 'react';
import { Card } from '../../types/card';
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
        <div className="sidebar-header">
          <h2>My Cards ({cards.length})</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
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
            <span className="sidebar-search-icon">🔍</span>
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
                        {card.type === 'credit' || card.type === 'debit' ? '💳' : 
                         card.type === 'aadhar' ? '🆔' : 
                         card.type === 'pan' ? '📄' : '📋'}
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
      </div>
    </div>
  );
};

