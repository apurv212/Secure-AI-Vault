import React from 'react';
import { CreditCard } from 'lucide-react';

interface NetworkLogoProps {
  network: string;
  className?: string;
}

export const NetworkLogo: React.FC<NetworkLogoProps> = ({ network, className = 'w-12 h-8' }) => {
  const normalizedNetwork = network?.toLowerCase() || '';

  // Visa Logo
  if (normalizedNetwork === 'visa') {
    return (
      <div className={`${className} bg-white rounded flex items-center justify-center px-2`}>
        <svg viewBox="0 0 48 16" className="w-full h-full">
          <text x="0" y="12" fill="#1434CB" fontWeight="bold" fontSize="12" fontFamily="Arial">VISA</text>
        </svg>
      </div>
    );
  }

  // Mastercard Logo
  if (normalizedNetwork === 'mastercard') {
    return (
      <div className={`${className} bg-white rounded flex items-center justify-center`}>
        <svg viewBox="0 0 48 32" className="w-full h-full">
          <circle cx="15" cy="16" r="10" fill="#EB001B" />
          <circle cx="33" cy="16" r="10" fill="#F79E1B" />
          <path d="M24 8.5c-2.5 2-4 5-4 8s1.5 6 4 8c2.5-2 4-5 4-8s-1.5-6-4-8z" fill="#FF5F00" />
        </svg>
      </div>
    );
  }

  // Aadhaar Logo
  if (normalizedNetwork === 'aadhaar') {
    return (
      <div className={`${className} bg-gradient-to-br from-orange-500 to-green-600 rounded flex items-center justify-center`}>
        <svg viewBox="0 0 32 32" className="w-6 h-6" fill="white">
          <path d="M16 2L4 8v8c0 7.5 5.2 14.5 12 16 6.8-1.5 12-8.5 12-16V8L16 2zm0 3.2l9 4.5v6.3c0 5.6-3.9 10.8-9 12-5.1-1.2-9-6.4-9-12V9.7l9-4.5z" />
        </svg>
      </div>
    );
  }

  // PAN Logo (India emblem)
  if (normalizedNetwork === 'pan') {
    return (
      <div className={`${className} bg-gradient-to-br from-blue-900 to-green-700 rounded flex items-center justify-center`}>
        <svg viewBox="0 0 32 32" className="w-6 h-6" fill="gold">
          <circle cx="16" cy="16" r="12" stroke="gold" strokeWidth="2" fill="none" />
          <path d="M16 8l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z" />
        </svg>
      </div>
    );
  }

  // RuPay Logo
  if (normalizedNetwork === 'rupay') {
    return (
      <div className={`${className} bg-gradient-to-r from-green-600 to-blue-600 rounded flex items-center justify-center px-2`}>
        <svg viewBox="0 0 48 16" className="w-full h-full">
          <text x="2" y="12" fill="white" fontWeight="bold" fontSize="9" fontFamily="Arial, sans-serif">RuPay</text>
        </svg>
      </div>
    );
  }

  // Discover Logo
  if (normalizedNetwork === 'discover') {
    return (
      <div className={`${className} bg-orange-500 rounded flex items-center justify-center px-2`}>
        <svg viewBox="0 0 48 16" className="w-full h-full">
          <text x="0" y="12" fill="white" fontWeight="bold" fontSize="8" fontFamily="Arial">DISCOVER</text>
        </svg>
      </div>
    );
  }

  // Default/Unknown
  return (
    <div className={`${className} bg-slate-200 dark:bg-slate-700 rounded flex items-center justify-center`}>
      <CreditCard className="w-5 h-5 text-slate-500 dark:text-slate-400" />
    </div>
  );
};

