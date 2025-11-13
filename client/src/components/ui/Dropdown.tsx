import React, { useState, useEffect, useRef } from 'react';
import './Dropdown.css';

interface DropdownItem {
  label: string;
  icon?: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface DropdownProps {
  items: DropdownItem[];
  trigger?: React.ReactNode;
  align?: 'left' | 'right';
}

export const Dropdown: React.FC<DropdownProps> = ({ 
  items, 
  trigger,
  align = 'right' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleItemClick = (item: DropdownItem) => {
    if (!item.disabled) {
      item.onClick();
      setIsOpen(false);
    }
  };

  return (
    <div className="dropdown-container" ref={dropdownRef}>
      <button
        className="dropdown-trigger"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {trigger || (
          <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 16 16">
            <circle cx="8" cy="3" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="8" cy="13" r="1.5" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className={`dropdown-menu dropdown-menu-${align}`}>
          {items.map((item, index) => (
            <button
              key={index}
              className={`dropdown-item ${item.danger ? 'dropdown-item-danger' : ''} ${item.disabled ? 'dropdown-item-disabled' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                handleItemClick(item);
              }}
              disabled={item.disabled}
            >
              {item.icon && (
                <span className="material-symbols-outlined dropdown-item-icon">
                  {item.icon}
                </span>
              )}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

