import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { cardApi } from '../../services/api';

interface CardImageProps {
  cardId?: string;
  imageUrl?: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onError?: () => void;
}

export const CardImage: React.FC<CardImageProps> = ({
  cardId,
  imageUrl,
  alt,
  className = '',
  style = {},
  onError
}) => {
  const { idToken } = useAuth();
  const [displayImageUrl, setDisplayImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      if (!imageUrl || !idToken || !cardId) {
        setDisplayImageUrl(null);
        return;
      }

      try {
        setLoading(true);
        setError(false);
        const url = await cardApi.getCardImage(idToken, cardId);
        setDisplayImageUrl(url);
      } catch (err) {
        console.error('Failed to load card image:', err);
        setError(true);
        // Fallback to direct URL if decryption fails
        setDisplayImageUrl(imageUrl);
        onError?.();
      } finally {
        setLoading(false);
      }
    };

    loadImage();
  }, [imageUrl, cardId, idToken, onError]);

  // Cleanup blob URLs when component unmounts
  useEffect(() => {
    return () => {
      if (displayImageUrl && displayImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(displayImageUrl);
      }
    };
  }, [displayImageUrl]);

  if (loading) {
    return (
      <div className={className} style={{ ...style, background: '#f0f0f0' }}>
        <div className="skeleton-loader" style={{ width: '100%', height: '100%' }} />
      </div>
    );
  }

  if (!displayImageUrl || error) {
    return null;
  }

  return (
    <img
      src={displayImageUrl}
      alt={alt}
      className={className}
      style={style}
      onError={() => {
        setError(true);
        onError?.();
      }}
    />
  );
};

