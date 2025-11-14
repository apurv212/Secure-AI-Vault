import React, { useState } from 'react';
import { Modal } from '../../ui/Modal';
import './CreateShareFolderModal.css';

interface CreateShareFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string) => Promise<void>;
}

export const CreateShareFolderModal: React.FC<CreateShareFolderModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Please enter a folder name');
      return;
    }

    try {
      setIsCreating(true);
      setError('');
      await onCreate(name.trim(), description.trim());
      setName('');
      setDescription('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create share folder');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Share Folder">
      <div className="create-folder-form">
        {error && (
          <div className="error-message">
            <span className="material-symbols-outlined">error</span>
            <span>{error}</span>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="folder-name">Folder Name *</label>
          <input
            id="folder-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Family Cards, Work Cards"
            className="form-input"
            maxLength={50}
            disabled={isCreating}
          />
        </div>

        <div className="form-group">
          <label htmlFor="folder-description">Description (Optional)</label>
          <textarea
            id="folder-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description for this folder"
            className="form-textarea"
            rows={3}
            maxLength={200}
            disabled={isCreating}
          />
        </div>

        <div className="form-actions">
          <button
            onClick={handleClose}
            className="cancel-btn"
            disabled={isCreating}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="create-btn"
            disabled={isCreating || !name.trim()}
          >
            {isCreating ? (
              <>
                <span className="spinner-small"></span>
                Creating...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">folder_open</span>
                Create Folder
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

