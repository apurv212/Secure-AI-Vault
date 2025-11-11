import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Header.css';

interface HeaderProps {
  selectedBank?: string;
  onBankChange: (bank: string) => void;
  banks: string[];
  onSidebarToggle?: () => void;
  cardCount?: number;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  selectedBank, 
  onBankChange, 
  banks, 
  onSidebarToggle, 
  cardCount = 0,
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

  return (
    <header className="header">
      <div className="header-content">
        <h1>Secure AI Vault</h1>
        <div className="header-actions">
          {onSearchChange && (
            <div className="search-container">
              <input
                type="text"
                placeholder="Search cards..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="search-input"
              />
              <span className="search-icon">🔍</span>
            </div>
          )}
          <button 
            onClick={onSidebarToggle} 
            className="sidebar-toggle-btn"
            title="View all cards"
          >
            <span>📋</span> My Cards {cardCount > 0 && `(${cardCount})`}
          </button>
          {banks.length > 0 && (
            <select
              value={selectedBank || 'all'}
              onChange={(e) => onBankChange(e.target.value === 'all' ? '' : e.target.value)}
              className="bank-filter"
            >
              <option value="all">All</option>
              {banks.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
          )}
          <div className="user-info">
            <span>{user?.email}</span>
            <button onClick={handleSignOut} className="signout-btn">
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

