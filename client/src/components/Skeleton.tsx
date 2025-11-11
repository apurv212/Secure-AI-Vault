import React from 'react';
import './Skeleton.css';

export const Skeleton: React.FC = () => {
  return (
    <div className="skeleton-container">
      <div className="skeleton-card">
        <div className="skeleton-image"></div>
        <div className="skeleton-content">
          <div className="skeleton-line skeleton-title"></div>
          <div className="skeleton-line"></div>
          <div className="skeleton-line"></div>
          <div className="skeleton-line skeleton-short"></div>
        </div>
      </div>
    </div>
  );
};

