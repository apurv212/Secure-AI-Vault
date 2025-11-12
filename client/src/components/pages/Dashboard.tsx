import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { cardApi } from '../../services/api';
import { Card } from '../../types/card';
import { Header } from '../layout/Header';
import { CardUpload } from '../features/cards/CardUpload';
import { CardItem } from '../features/cards/CardItem';
import { Sidebar } from '../layout/Sidebar';
import { Loading } from '../ui/Loading';
import { CreditCard, Search, Filter } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-950 dark:via-blue-950/30 dark:to-indigo-950/50">
      <Header
        selectedBank={selectedBank}
        onBankChange={setSelectedBank}
        banks={banks}
        onSidebarToggle={() => setShowSidebar(!showSidebar)}
        cardCount={allCards.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CardUpload onUploadComplete={handleUploadComplete} />
        
        {cards.length === 0 ? (
          <div className="mt-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full">
                {searchQuery || selectedBank ? (
                  <Search className="w-12 h-12 text-slate-400" />
                ) : (
                  <CreditCard className="w-12 h-12 text-slate-400" />
                )}
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  {searchQuery || selectedBank ? 'No cards found' : 'No cards yet'}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 max-w-md">
                  {searchQuery || selectedBank 
                    ? `No cards found matching your search${searchQuery ? `: "${searchQuery}"` : ''}${selectedBank ? ` in ${selectedBank}` : ''}.`
                    : 'Upload your first card to get started with secure card management!'
                  }
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((card) => (
              <div 
                key={card.id} 
                id={`card-${card.id}`}
                className="transition-all duration-300 hover:scale-[1.02]"
              >
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

