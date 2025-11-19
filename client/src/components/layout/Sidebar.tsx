import React, { useState } from 'react';
import { Card, ShareFolder } from '../../types/card';
import { useAuth } from '../../contexts/AuthContext';
import { shareFolderApi } from '../../services/api';
import { CreateShareFolderModal, ShareLinkModal, ShareFolderDetailsModal } from '../features/shareFolder';
import './Sidebar.css';

interface SidebarProps {
  cards: Card[];
  selectedCardId?: string;
  onCardSelect: (cardId: string) => void;
  onClose: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  shareFolders?: ShareFolder[];
  onShareFoldersUpdate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  cards, 
  selectedCardId, 
  onCardSelect, 
  onClose,
  searchQuery = '',
  onSearchChange,
  shareFolders = [],
  onShareFoldersUpdate
}) => {
  const { user, signOut, idToken } = useAuth();
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showShareLinkModal, setShowShareLinkModal] = useState(false);
  const [showFolderDetailsModal, setShowFolderDetailsModal] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<ShareFolder | null>(null);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleCreateFolder = async (name: string, description: string) => {
    if (!idToken) return;

    try {
      await shareFolderApi.create(idToken, { name, description });
      onShareFoldersUpdate?.();
    } catch (error: any) {
      console.error('Create folder error:', error);
      throw new Error(error.response?.data?.message || 'Failed to create share folder');
    }
  };

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    if (!idToken) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${folderName}"?\n\nCards in this folder will not be deleted.`
    );

    if (!confirmed) return;

    try {
      await shareFolderApi.delete(idToken, folderId);
      onShareFoldersUpdate?.();
    } catch (error: any) {
      console.error('Delete folder error:', error);
      alert('Failed to delete share folder. Please try again.');
    }
  };

  const handleFolderClick = (folder: ShareFolder) => {
    setSelectedFolder(folder);
    setShowFolderDetailsModal(true);
  };

  const handleShareFolder = (folder: ShareFolder) => {
    setSelectedFolder(folder);
    setShowShareLinkModal(true);
    setShowFolderDetailsModal(false);
  };

  const handleGenerateShareLink = async (folderId: string, expiresIn: string) => {
    if (!idToken) throw new Error('Not authenticated');

    try {
      const result = await shareFolderApi.generateShareLink(idToken, folderId, expiresIn);
      return {
        shareUrl: result.shareUrl,
        expiresAt: result.expiresAt
      };
    } catch (error: any) {
      console.error('Generate share link error:', error);
      throw new Error(error.response?.data?.message || 'Failed to generate share link');
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

        {/* Share Folders Section */}
        {shareFolders && shareFolders.length > 0 && (
          <div className="share-folders-section">
            <div className="section-header">
              <h3>Share Folders</h3>
              <button
                className="create-folder-btn"
                onClick={() => setShowCreateFolderModal(true)}
                title="Create Share Folder"
              >
                <span className="material-symbols-outlined">add</span>
              </button>
            </div>
            <div className="folders-list">
              {shareFolders.map((folder) => (
                <div key={folder.id} className="folder-item">
                  <div 
                    className="folder-item-content"
                    onClick={() => handleFolderClick(folder)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="material-symbols-outlined folder-icon">folder</span>
                    <div className="folder-details">
                      <h4>{folder.name}</h4>
                      <span className="folder-count">{folder.cardIds?.length || 0} cards</span>
                    </div>
                  </div>
                  <div className="folder-actions">
                    <button
                      className="share-folder-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShareFolder(folder);
                      }}
                      title="Share folder"
                      disabled={(folder.cardIds?.length || 0) === 0}
                    >
                      <span className="material-symbols-outlined">share</span>
                    </button>
                    <button
                      className="delete-folder-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFolder(folder.id!, folder.name);
                      }}
                      title="Delete folder"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create Folder Button (when no folders exist) */}
        {(!shareFolders || shareFolders.length === 0) && (
          <div className="create-folder-section">
            <button
              className="create-folder-primary-btn"
              onClick={() => setShowCreateFolderModal(true)}
            >
              <span className="material-symbols-outlined">folder_open</span>
              <span>Create Share Folder</span>
            </button>
          </div>
        )}
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
                    <div className="card-placeholder">
                      <span className="material-symbols-outlined">
                        {card.type === 'credit' || card.type === 'debit' ? 'credit_card' : 
                         card.type === 'aadhar' ? 'badge' : 
                         card.type === 'pan' ? 'description' : 'folder'}
                      </span>
                    </div>
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

      {/* Create Share Folder Modal */}
      {showCreateFolderModal && (
        <CreateShareFolderModal
          isOpen={showCreateFolderModal}
          onClose={() => setShowCreateFolderModal(false)}
          onCreate={handleCreateFolder}
        />
      )}

      {/* Folder Details Modal */}
      {showFolderDetailsModal && selectedFolder && (
        <ShareFolderDetailsModal
          isOpen={showFolderDetailsModal}
          onClose={() => {
            setShowFolderDetailsModal(false);
            setSelectedFolder(null);
          }}
          folder={selectedFolder}
          onUpdate={onShareFoldersUpdate || (() => {})}
          onShare={handleShareFolder}
        />
      )}

      {/* Share Link Modal */}
      {showShareLinkModal && selectedFolder && (
        <ShareLinkModal
          isOpen={showShareLinkModal}
          onClose={() => {
            setShowShareLinkModal(false);
            setSelectedFolder(null);
          }}
          folderId={selectedFolder.id!}
          folderName={selectedFolder.name}
          onGenerate={handleGenerateShareLink}
        />
      )}
    </div>
  );
};

