import React, { useState, useEffect } from 'react';
import { Modal } from '../../ui/Modal';
import { ShareFolder } from '../../../types/card';
import './SelectShareFolderModal.css';

interface SelectShareFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (folderId: string) => Promise<void>;
  folders: ShareFolder[];
}

export const SelectShareFolderModal: React.FC<SelectShareFolderModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  folders,
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [isCopying, setIsCopying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedFolderId('');
      setError('');
    }
  }, [isOpen]);

  const handleCopy = async () => {
    if (!selectedFolderId) {
      setError('Please select a folder');
      return;
    }

    try {
      setIsCopying(true);
      setError('');
      await onSelect(selectedFolderId);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to copy card to folder');
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Copy to Share Folder">
      <div className="select-folder-content">
        {error && (
          <div className="error-message">
            <span className="material-symbols-outlined">error</span>
            <span>{error}</span>
          </div>
        )}

        {folders.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined">folder_off</span>
            <p>No share folders yet</p>
            <span className="empty-hint">Create a share folder from the sidebar first</span>
          </div>
        ) : (
          <>
            <div className="folder-list">
              {folders.map((folder) => (
                <label
                  key={folder.id}
                  className={`folder-option ${selectedFolderId === folder.id ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="folder"
                    value={folder.id}
                    checked={selectedFolderId === folder.id}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                    disabled={isCopying}
                  />
                  <div className="folder-info">
                    <div className="folder-header">
                      <span className="material-symbols-outlined">folder</span>
                      <span className="folder-name">{folder.name}</span>
                    </div>
                    {folder.description && (
                      <p className="folder-description">{folder.description}</p>
                    )}
                    <span className="folder-count">{folder.cardIds?.length || 0} cards</span>
                  </div>
                </label>
              ))}
            </div>

            <div className="form-actions">
              <button
                onClick={onClose}
                className="cancel-btn"
                disabled={isCopying}
              >
                Cancel
              </button>
              <button
                onClick={handleCopy}
                className="copy-btn"
                disabled={isCopying || !selectedFolderId}
              >
                {isCopying ? (
                  <>
                    <span className="spinner-small"></span>
                    Copying...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">content_copy</span>
                    Copy to Folder
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

