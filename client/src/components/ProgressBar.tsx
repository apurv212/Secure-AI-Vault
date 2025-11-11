import React from 'react';
import './ProgressBar.css';

interface ProgressBarProps {
  progress: number;
  label: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, label }) => {
  return (
    <div className="progress-container">
      <div className="progress-label">{label}</div>
      <div className="progress-bar-wrapper">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        ></div>
      </div>
      <div className="progress-percentage">{Math.round(progress)}%</div>
    </div>
  );
};

export default ProgressBar;
export { ProgressBar };
