import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { cardApi } from '../services/api';
import { Card } from '../types/card';
import { Header } from './Header';
import { CardUpload } from './CardUpload';
import { CardItem } from './CardItem';
import { Sidebar } from './Sidebar';
import { Loading } from './Loading';
import './Dashboard.css';

export const Dashboard: React.FC = () => {
  const { idToken } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [banks, setBanks] = useState<string[]>([]);
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | undefined>();

  const fetchCards = useCallback(async () => {
    if (!idToken) return;

    try {
      setLoading(true);
      const fetchedCards = await cardApi.getAll(idToken, selectedBank || undefined);
      setAllCards(fetchedCards);
    } catch (error) {
      console.error('Error fetching cards:', error);
    } finally {
      setLoading(false);
    }
  }, [idToken, selectedBank]);

  // Filter cards based on search query
  useEffect(() => {
    let filtered = allCards;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(card => {
        const cardName = (card.cardName || '').toLowerCase();
        const cardNumber = (card.cardNumber || '').toLowerCase();
        const cardHolderName = (card.cardHolderName || '').toLowerCase();
        const bank = (card.bank || '').toLowerCase();
        const type = card.type.toLowerCase();
        
        return cardName.includes(query) ||
               cardNumber.includes(query) ||
               cardHolderName.includes(query) ||
               bank.includes(query) ||
               type.includes(query);
      });
    }

    setCards(filtered);
  }, [allCards, searchQuery]);

  const fetchBanks = useCallback(async () => {
    if (!idToken) return;

    try {
      const fetchedBanks = await cardApi.getBanks(idToken);
      setBanks(fetchedBanks);
    } catch (error) {
      console.error('Error fetching banks:', error);
    }
  }, [idToken]);

  useEffect(() => {
    if (idToken) {
      fetchCards();
      fetchBanks();
    }
  }, [idToken, selectedBank, fetchCards, fetchBanks]);

  const handleCardUpdate = () => {
    fetchCards();
    fetchBanks();
  };

  const handleUploadComplete = (newCard: Card) => {
    fetchCards();
    fetchBanks();
    // Scroll to the new card
    if (newCard.id) {
      setTimeout(() => {
        const element = document.getElementById(`card-${newCard.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  const handleCardSelect = (cardId: string) => {
    setSelectedCardId(cardId);
    const element = document.getElementById(`card-${cardId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight the card
      element.classList.add('highlighted');
      setTimeout(() => {
        element.classList.remove('highlighted');
      }, 2000);
    }
    setShowSidebar(false);
  };

  if (loading && cards.length === 0) {
    return <Loading />;
  }

  return (
    <div className="dashboard">
      <Header
        selectedBank={selectedBank}
        onBankChange={setSelectedBank}
        banks={banks}
        onSidebarToggle={() => setShowSidebar(!showSidebar)}
        cardCount={allCards.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <div className="dashboard-content">
        <CardUpload onUploadComplete={handleUploadComplete} />
        
        {cards.length === 0 ? (
          <div className="empty-state">
            <p>
              {searchQuery || selectedBank 
                ? `No cards found matching your search${searchQuery ? `: "${searchQuery}"` : ''}${selectedBank ? ` in ${selectedBank}` : ''}.`
                : 'No cards found. Upload your first card to get started!'
              }
            </p>
          </div>
        ) : (
          <div className="cards-grid">
            {cards.map((card) => (
              <div key={card.id} id={`card-${card.id}`}>
                <CardItem
                  card={card}
                  onUpdate={handleCardUpdate}
                />
              </div>
            ))}
          </div>
        )}
      </div>
      {showSidebar && (
        <Sidebar
          cards={allCards}
          selectedCardId={selectedCardId}
          onCardSelect={handleCardSelect}
          onClose={() => setShowSidebar(false)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      )}
    </div>
  );
};

