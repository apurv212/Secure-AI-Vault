import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Shield, Search, Menu, LogOut, User, Filter } from 'lucide-react';

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
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-slate-900/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow-sm">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent hidden sm:block">
              Secure AI Vault
            </h1>
          </div>

          {/* Search and Actions */}
          <div className="flex items-center gap-2 flex-1 max-w-2xl">
            {onSearchChange && (
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search cards..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
            )}

            <div className="hidden md:flex items-center gap-2">
              {banks.length > 0 && (
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedBank || 'all'}
                    onChange={(e) => onBankChange(e.target.value === 'all' ? '' : e.target.value)}
                    className="h-9 pl-10 pr-8 rounded-md border border-input bg-transparent text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] appearance-none cursor-pointer"
                  >
                    <option value="all">All Banks</option>
                    {banks.map((bank) => (
                      <option key={bank} value={bank}>
                        {bank}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={onSidebarToggle}
                className="gap-2"
              >
                <Menu className="w-4 h-4" />
                <span className="hidden lg:inline">My Cards</span>
                {cardCount > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {cardCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden sm:flex items-center gap-3">
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <User className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span className="text-sm text-slate-700 dark:text-slate-300 max-w-[150px] truncate">
                  {user?.email}
                </span>
              </div>
              <Separator orientation="vertical" className="h-6" />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/30"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onSidebarToggle}
            className="md:hidden"
          >
            <Menu className="w-4 h-4" />
            {cardCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {cardCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
};

