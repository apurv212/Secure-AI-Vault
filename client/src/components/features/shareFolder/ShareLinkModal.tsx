import React, { useState } from 'react';
import { Modal } from '../../ui/Modal';
import './ShareLinkModal.css';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderId: string;
  folderName: string;
  onGenerate: (folderId: string, expiresIn: string) => Promise<{ shareUrl: string; expiresAt: string | null }>;
}

export const ShareLinkModal: React.FC<ShareLinkModalProps> = ({
  isOpen,
  onClose,
  folderId,
  folderName,
  onGenerate,
}) => {
  const [expiresIn, setExpiresIn] = useState<string>('24h');
  const [shareUrl, setShareUrl] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError('');
      const result = await onGenerate(folderId, expiresIn);
      setShareUrl(result.shareUrl);
      setExpiresAt(result.expiresAt);
    } catch (err: any) {
      setError(err.message || 'Failed to generate share link');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setShareUrl('');
    setExpiresAt(null);
    setError('');
    setCopied(false);
    onClose();
  };

  const formatExpiry = (date: string | null): string => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Share: ${folderName}`}>
      <div className="share-link-content">
        {error && (
          <div className="error-message">
            <span className="material-symbols-outlined">error</span>
            <span>{error}</span>
          </div>
        )}

        {!shareUrl ? (
          <>
            <div className="info-box">
              <span className="material-symbols-outlined">info</span>
              <p>
                Anyone with this link will be able to view all cards in this folder,
                including sensitive information like CVV numbers.
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="expiry-select">Link expires in:</label>
              <select
                id="expiry-select"
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value)}
                className="form-select"
                disabled={isGenerating}
              >
                <option value="24h">24 hours</option>
                <option value="48h">48 hours</option>
                <option value="7d">7 days</option>
                <option value="30d">30 days</option>
                <option value="never">Never</option>
              </select>
            </div>

            <div className="form-actions">
              <button
                onClick={handleClose}
                className="cancel-btn"
                disabled={isGenerating}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                className="generate-btn"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <span className="spinner-small"></span>
                    Generating...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">link</span>
                    Generate Link
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="success-box">
              <span className="material-symbols-outlined">check_circle</span>
              <p>Share link generated successfully!</p>
            </div>

            <div className="link-container">
              <div className="link-box">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="link-input"
                />
                <button
                  onClick={handleCopyLink}
                  className="copy-link-btn"
                  title="Copy link"
                >
                  {copied ? (
                    <>
                      <span className="material-symbols-outlined">check</span>
                      Copied!
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">content_copy</span>
                      Copy
                    </>
                  )}
                </button>
              </div>
              <div className="link-info">
                <span className="material-symbols-outlined">schedule</span>
                Expires: {formatExpiry(expiresAt)}
              </div>
            </div>

            <div className="warning-box">
              <span className="material-symbols-outlined">warning</span>
              <p>
                <strong>Security Note:</strong> Anyone with this link can view all card details.
                You can revoke this link anytime from the folder settings.
              </p>
            </div>

            <div className="form-actions">
              <button onClick={handleClose} className="done-btn">
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

