import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToastContext } from '../../contexts/ToastContext';
import { cardApi, shareFolderApi, isRateLimitError } from '../../services/api';
import { Card, ShareFolder } from '../../types/card';
import { Loading } from '../ui/Loading';
import { Menu, Search, Plus, ArrowLeft } from 'lucide-react';
import { CardItem } from '../features/cards/CardItem';
import { CardUpload } from '../features/cards/CardUpload';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Sidebar } from '../layout/Sidebar';
import { maskCardNumber, maskPAN, getCardNetwork } from '../../utils/cardUtils';
import { NetworkLogo } from '../ui/NetworkLogo';
import { Dropdown } from '../ui/Dropdown';
import { SelectShareFolderModal } from '../features/shareFolder';

type ViewMode = 'list' | 'details' | 'add';

export const Dashboard: React.FC = () => {
  const { idToken } = useAuth();
  const toast = useToastContext();
  const [cards, setCards] = useState<Card[]>([]);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [banks, setBanks] = useState<string[]>([]);
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [shareFolders, setShareFolders] = useState<ShareFolder[]>([]);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [cardToCopy, setCardToCopy] = useState<Card | null>(null);

  const fetchCards = useCallback(async () => {
    if (!idToken) return;

    try {
      setLoading(true);
      const fetchedCards = await cardApi.getAll(idToken, selectedBank || undefined);
      setAllCards(fetchedCards);
    } catch (error: any) {
      if (isRateLimitError(error)) {
        toast.error(error.message || 'Rate limit exceeded. Please try again later.');
      } else {
        toast.error('Failed to fetch cards. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [idToken, selectedBank]);

  const fetchBanks = useCallback(async () => {
    if (!idToken) return;

    try {
      const fetchedBanks = await cardApi.getBanks(idToken);
      setBanks(fetchedBanks);
    } catch (error: any) {
      // Silently fail for banks list - not critical
    }
  }, [idToken]);

  const fetchShareFolders = useCallback(async () => {
    if (!idToken) return;

    try {
      const folders = await shareFolderApi.getAll(idToken);
      setShareFolders(folders);
    } catch (error: any) {
      // Silently fail for share folders - not critical
    }
  }, [idToken]);

  // Filter cards based on search query
  useEffect(() => {
    let filtered = allCards;

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

  useEffect(() => {
    if (idToken) {
      fetchCards();
      fetchBanks();
      fetchShareFolders();
    }
  }, [idToken, selectedBank, fetchCards, fetchBanks, fetchShareFolders]);

  const handleCardUpdate = () => {
    fetchCards();
    fetchBanks();
  };

  const handleCardSelect = (card: Card) => {
    setSelectedCard(card);
    setViewMode('details');
  };

  const handleBack = () => {
    if (viewMode === 'details' || viewMode === 'add') {
      setViewMode('list');
      setSelectedCard(null);
    }
  };

  const handleAddCard = () => {
    setViewMode('add');
  };

  const handleUploadComplete = () => {
    fetchCards();
    fetchBanks();
    setViewMode('list');
  };

  const handleCardSelectFromSidebar = (cardId: string) => {
    const card = allCards.find(c => c.id === cardId);
    if (card) {
      setSelectedCard(card);
      setViewMode('details');
      setShowSidebar(false);
    }
  };

  const getDisplayNumber = (card: Card): string => {
    if (card.type === 'pan' && card.cardNumber) {
      return maskPAN(card.cardNumber);
    }
    if (card.cardNumber) {
      return maskCardNumber(card.cardNumber);
        }
    return '';
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
    // For credit/debit cards, detect network from card number
    if ((card.type === 'credit' || card.type === 'debit') && card.cardNumber) {
      return getCardNetwork(card.cardNumber);
    }
    // For other card types, use the type itself
    return card.type;
  };

  const handleDeleteCard = async (card: Card) => {
    if (!idToken || !card.id) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${card.cardName || card.bank || card.type}" card?\n\nThis action cannot be undone.`
    );
    
    if (!confirmed) return;

    try {
      await cardApi.delete(idToken, card.id);
      toast.success('Card deleted successfully');
      fetchCards();
    } catch (error: any) {
      toast.error('Failed to delete card. Please try again.');
    }
  };

  const handleCopyToFolder = (card: Card) => {
    setCardToCopy(card);
    setShowCopyModal(true);
  };

  const handleCopyCardToFolder = async (folderId: string) => {
    if (!idToken || !cardToCopy?.id) return;

    try {
      await shareFolderApi.addCard(idToken, folderId, cardToCopy.id);
      await fetchShareFolders();
      setShowCopyModal(false);
      setCardToCopy(null);
      toast.success('Card copied to share folder successfully!');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to copy card to folder';
      toast.error(errorMessage);
    }
  };

  if (loading && cards.length === 0) {
    return <Loading />;
  }

  // Mobile List View
  if (viewMode === 'list') {
  return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        {/* Mobile Header */}
        <header className="sticky top-0 z-50 bg-white dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <button 
                onClick={() => setShowSidebar(true)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Menu className="w-6 h-6 text-slate-700 dark:text-white" />
              </button>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">My Wallet</h1>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <button 
                  onClick={() => setShowSearchBar(!showSearchBar)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Search className="w-6 h-6 text-slate-700 dark:text-white" />
                </button>
              </div>
            </div>

            {/* Search Bar */}
            {showSearchBar && (
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search cards..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Filter Chips */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => setSelectedBank('')}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedBank === ''
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                All
              </button>
              {banks.map((bank) => (
                <button
                  key={bank}
                  onClick={() => setSelectedBank(bank)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedBank === bank
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {bank}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Card List */}
        <div className="px-4 py-6 space-y-4">
          {cards.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-slate-400 dark:text-slate-500 mb-4">No cards found</div>
              <p className="text-sm text-slate-500 dark:text-slate-600">
                {searchQuery || selectedBank
                  ? 'Try adjusting your filters'
                  : 'Add your first card to get started'}
              </p>
            </div>
          ) : (
            cards.map((card) => {
              const isExtracting = card.extractionStatus === 'processing' || card.extractionStatus === 'pending';
              
              if (isExtracting) {
                return (
                  <div
                    key={card.id}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm animate-pulse"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-2"></div>
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
                      </div>
                      <div className="w-12 h-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    </div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-2"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-36"></div>
                    <div className="mt-3 text-xs text-blue-600 dark:text-blue-400">
                      Extracting card details...
                    </div>
                  </div>
                );
              }
              
              return (
              <div 
                key={card.id} 
                onClick={() => handleCardSelect(card)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                      {getCardTitle(card)}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{getCardSubtitle(card)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <NetworkLogo network={getNetworkForCard(card)} />
                    <Dropdown
                      items={[
                        {
                          label: 'Copy to Share Folder',
                          icon: 'folder_shared',
                          onClick: () => handleCopyToFolder(card),
                        },
                        {
                          label: 'Delete Card',
                          icon: 'delete',
                          onClick: () => handleDeleteCard(card),
                          danger: true,
                        },
                      ]}
                    />
                  </div>
                </div>

                {getDisplayNumber(card) && (
                  <div className="font-mono text-base text-slate-700 dark:text-slate-300 mb-2">
                    {getDisplayNumber(card)}
                  </div>
                )}

                {card.cardHolderName && (
                  <div className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    {card.cardHolderName}
                  </div>
                )}
              </div>
              );
            })
          )}
        </div>

        {/* FAB */}
        <button
          onClick={handleAddCard}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg flex items-center justify-center transition-colors z-50"
        >
          <Plus className="w-6 h-6 text-white" />
        </button>

        {/* Bottom Safe Area */}
        <div className="h-20" />

        {/* Sidebar */}
        {showSidebar && (
          <Sidebar
            cards={allCards}
            selectedCardId={selectedCard?.id}
            onCardSelect={handleCardSelectFromSidebar}
            onClose={() => setShowSidebar(false)}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            shareFolders={shareFolders}
            onShareFoldersUpdate={fetchShareFolders}
          />
        )}

        {/* Copy to Share Folder Modal */}
        {showCopyModal && cardToCopy && (
          <SelectShareFolderModal
            isOpen={showCopyModal}
            onClose={() => {
              setShowCopyModal(false);
              setCardToCopy(null);
            }}
            onSelect={handleCopyCardToFolder}
            folders={shareFolders}
          />
        )}
      </div>
    );
  }

  // Details View
  if (viewMode === 'details' && selectedCard) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <header className="sticky top-0 z-50 bg-white dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
          <div className="px-4 py-4 flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-slate-700 dark:text-white" />
            </button>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Card Details</h1>
          </div>
        </header>
        <div className="p-4">
          <CardItem card={selectedCard} onUpdate={handleCardUpdate} />
        </div>
      </div>
    );
  }

  // Add Card View
  if (viewMode === 'add') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <header className="sticky top-0 z-50 bg-white dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
          <div className="px-4 py-4 flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-slate-700 dark:text-white" />
            </button>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Add New Card</h1>
          </div>
        </header>
        <div className="p-4">
          <CardUpload onUploadComplete={handleUploadComplete} />
        </div>
    </div>
  );
  }

  return null;
};
