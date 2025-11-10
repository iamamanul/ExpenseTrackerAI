'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import RecordItem from './RecordItem';
import { Record } from '@/types/Record';

interface RecordHistoryClientProps {
  initialRecords: Record[];
  initialError: string | null;
}

// All options for date filtering
const dateFilterOptions = [
  { value: 'all', label: 'All Records', icon: '📊', group: 'All Data' },
  { value: 'recent', label: 'Last 7 days', icon: '🕐', group: 'Past Records' },
  { value: 'month', label: 'This Month', icon: '📅', group: 'This Year' },
  { value: 'year', label: 'This Year', icon: '🗓️', group: 'This Year' },
  { value: '30d', label: 'Last 30 days', icon: '🗓️', group: 'Past Records' },
  { value: '90d', label: 'Last 90 days', icon: '🗓️', group: 'Past Records' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First', icon: '⬇️' },
  { value: 'oldest', label: 'Oldest First', icon: '⬆️' },
  { value: 'highest', label: 'Highest Amount', icon: '💰' },
  { value: 'lowest', label: 'Lowest Amount', icon: '💸' }
];

// Fix 1: Removed unused ITEMS_PER_PAGE_OPTIONS constant
// const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100, 'all'];

const RecordHistoryClient = ({ initialRecords, initialError }: RecordHistoryClientProps) => {
  const [records, setRecords] = useState<Record[]>(initialRecords);
  const [error, setError] = useState<string | null>(initialError);
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [itemsPerPage] = useState<number | 'all'>(15); // Fix 2: Removed unused 'setItemsPerPage'
  const [currentPage, setCurrentPage] = useState(1);

  // New state for dropdowns
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  // Refs for outside click detection
  const dateDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Fixed cards per page based on screen size
  const getCardsPerPage = () => {
    return 15;
  };

  const CARDS_PER_PAGE = getCardsPerPage();
  const MOBILE_CARDS_PER_PAGE = 8;

  // Update records when initialRecords change (for real-time updates)
  useEffect(() => {
    setRecords(initialRecords);
    setError(initialError);
  }, [initialRecords, initialError]);

  // Handle clicks outside of dropdowns
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        dateDropdownRef.current && !dateDropdownRef.current.contains(event.target as Node) &&
        sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)
      ) {
        setIsDateDropdownOpen(false);
        setIsSortDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  // Handle record deletion - remove from state immediately
  const handleRecordDelete = (recordId: string) => {
    setRecords(prevRecords => prevRecords.filter(r => r.id !== recordId));
    // Reset to first page if current page becomes empty
    setCurrentPage(1);
  };

  // Filter and sort records
  const filteredAndSortedRecords = useMemo(() => {
    let filtered = [...records];
    const now = new Date();

    // Apply date filter first
    switch (dateFilter) {
      case 'recent': // Last 7 days
      case '7d':
        filtered = filtered.filter(record => {
          const recordDate = new Date(record.date || 0);
          const timeDiff = now.getTime() - recordDate.getTime();
          const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
          return daysDiff <= 7 && daysDiff >= 0;
        });
        break;
      case '30d':
        filtered = filtered.filter(record => {
          const recordDate = new Date(record.date || 0);
          const timeDiff = now.getTime() - recordDate.getTime();
          const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
          return daysDiff <= 30 && daysDiff >= 0;
        });
        break;
      case '90d':
        filtered = filtered.filter(record => {
          const recordDate = new Date(record.date || 0);
          const timeDiff = now.getTime() - recordDate.getTime();
          const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
          return daysDiff <= 90 && daysDiff >= 0;
        });
        break;
      case 'month': // This month
        filtered = filtered.filter(record => {
          const recordDate = new Date(record.date || 0);
          return recordDate.getMonth() === now.getMonth() && recordDate.getFullYear() === now.getFullYear();
        });
        break;
      case 'year': // This year
        filtered = filtered.filter(record => {
          const recordDate = new Date(record.date || 0);
          return recordDate.getFullYear() === now.getFullYear();
        });
        break;
      case 'all': // All records
      default:
        break;
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(record => {
        // FIX: Replaced `any` with a more specific type assertion to satisfy the linter.
        const description = ((record as Record & { description?: string }).description || '').toString().toLowerCase();
        const category = (record.category || '').toString().toLowerCase();
        const amount = (record.amount || '').toString().toLowerCase();
        const date = (record.date || '').toString().toLowerCase();

        console.log('Search query:', query);
        console.log('Record description:', description);
        console.log('Record category:', category);
        console.log('Record amount:', amount);

        return description.includes(query) ||
          category.includes(query) ||
          amount.includes(query) ||
          date.includes(query);
      });
    }

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => {
          const dateA = new Date(a.date || 0);
          const dateB = new Date(b.date || 0);
          return dateB.getTime() - dateA.getTime();
        });
        break;

      case 'oldest':
        filtered.sort((a, b) => {
          const dateA = new Date(a.date || 0);
          const dateB = new Date(b.date || 0);
          return dateA.getTime() - dateB.getTime();
        });
        break;

      case 'highest':
        filtered.sort((a, b) => (b.amount || 0) - (a.amount || 0));
        break;

      case 'lowest':
        filtered.sort((a, b) => (a.amount || 0) - (b.amount || 0));
        break;
    }

    return filtered;
  }, [records, dateFilter, sortBy, searchQuery]);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const currentCardsPerPage = isMobile ? MOBILE_CARDS_PER_PAGE : CARDS_PER_PAGE;
  const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(filteredAndSortedRecords.length / currentCardsPerPage);

  const paginatedRecords = useMemo(() => {
    if (itemsPerPage === 'all') {
      return filteredAndSortedRecords;
    }

    const startIndex = (currentPage - 1) * currentCardsPerPage;
    const endIndex = startIndex + currentCardsPerPage;
    return filteredAndSortedRecords.slice(startIndex, endIndex);
  }, [filteredAndSortedRecords, currentPage, itemsPerPage, currentCardsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, sortBy, searchQuery, itemsPerPage]);

  // Find the current sort option object to display its label and icon
  const currentSortOption = SORT_OPTIONS.find(option => option.value === sortBy);
  const currentDateOption = dateFilterOptions.find(option => option.value === dateFilter);

  if (error) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-0">
        <div className="relative overflow-hidden bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-200/60 dark:border-gray-700/60 rounded-3xl shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-50/50 via-transparent to-red-50/30 dark:from-rose-900/10 dark:via-transparent dark:to-red-900/5"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(239,68,68,0.1),transparent_50%)]"></div>

          <div className="relative p-4 sm:p-6 md:p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="relative">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-red-500 via-rose-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3">
                  <span className="text-white text-xl sm:text-2xl">📝</span>
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 rounded-full animate-pulse"></div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent mb-1">
                  Expense History
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Your spending timeline
                </p>
              </div>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-r from-red-50 via-rose-50 to-pink-50 dark:from-red-950/30 dark:via-rose-950/20 dark:to-pink-950/30 border border-red-200/60 dark:border-red-800/60 rounded-2xl p-4 sm:p-6">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent"></div>
              <div className="relative flex items-start gap-3 sm:gap-4">
                <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-red-100 dark:bg-red-900/50 rounded-xl flex items-center justify-center">
                  <span className="text-lg sm:text-xl">⚠️</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-base sm:text-lg font-bold text-red-800 dark:text-red-300 mb-4 sm:mb-6">
                    Error loading expense history
                  </h4>
                  <p className="text-red-700 dark:text-red-400 text-sm leading-relaxed">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!records || records.length === 0) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-0">
        <div className="relative overflow-hidden bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-200/60 dark:border-gray-700/60 rounded-3xl shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 via-transparent to-teal-50/30 dark:from-emerald-900/10 dark:via-transparent dark:to-teal-900/5"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.1),transparent_50%)]"></div>

          <div className="relative p-4 sm:p-6 md:p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="relative">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3">
                  <span className="text-white text-xl sm:text-2xl">📝</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent mb-1">
                  Expense History
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Your spending timeline
                </p>
              </div>
            </div>

            <div className="text-center py-12 sm:py-16">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 via-green-100 to-teal-100 dark:from-emerald-900/50 dark:via-green-900/50 dark:to-teal-900/50 rounded-3xl transform rotate-6"></div>
                <div className="relative w-full h-full bg-gradient-to-br from-emerald-200 to-green-200 dark:from-emerald-800 dark:to-green-800 rounded-3xl flex items-center justify-center">
                  <span className="text-3xl sm:text-4xl">📊</span>
                </div>
              </div>
              <h4 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-200 mb-3">
                No Expense Records Found
              </h4>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto leading-relaxed text-sm sm:text-base px-4">
                Start tracking your expenses to see your spending history and
                patterns here.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-0">
      <div className="relative overflow-hidden bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-200/60 dark:border-gray-700/60 rounded-3xl shadow-2xl hover:shadow-3xl transition-shadow duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 via-transparent to-teal-50/30 dark:from-emerald-900/10 dark:via-transparent dark:to-teal-900/5"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.1),transparent_50%)]"></div>

        <style jsx>{`
          @keyframes fadeInSlide {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          .animate-fadeIn {
            animation: fadeInSlide 0.6s ease-out forwards;
          }
          @media (max-width: 640px) {
            .mobile-grid {
              display: flex !important;
              flex-direction: column !important;
              gap: 1rem !important;
              height: auto !important;
              min-height: 400px;
              grid-template-rows: none !important;
              grid-auto-flow: row !important;
            }
            .mobile-grid > div {
              width: 100% !important;
              max-width: none !important;
              flex-shrink: 0;
              padding: 0.25rem !important;
              box-sizing: border-box !important;
            }
            .mobile-grid > div > * {
              overflow: visible !important;
              position: relative !important;
            }
            .mobile-content-area {
              height: auto !important;
              min-height: 600px !important;
              padding: 0.5rem !important;
            }
            .mobile-pagination {
              height: auto !important;
              padding: 1rem 0 !important;
            }
            .mobile-search {
              padding-left: 2.5rem !important;
              padding-right: 1rem !important;
              padding-top: 0.875rem !important;
              padding-bottom: 0.875rem !important;
              font-size: 0.875rem !important;
            }
            .mobile-filters {
              gap: 0.5rem !important;
              overflow: hidden !important;
              -webkit-overflow-scrolling: auto !important;
              scrollbar-width: none !important;
              -ms-overflow-style: none !important;
            }
            .mobile-filters > div {
              flex-shrink: 0 !important;
              display: grid !important;
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 0.25rem !important;
              width: 100% !important;
            }
            .mobile-filter-button {
              min-width: auto !important;
              white-space: nowrap !important;
              padding-left: 0.5rem !important;
              padding-right: 0.5rem !important;
              font-size: 0.625rem !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
            }
            .mobile-filter-button span:not(.hidden) {
              display: inline !important;
            }
            .mobile-filter-button .full-text {
              display: none !important;
            }
            .mobile-filter-button .short-text {
              display: inline !important;
            }
            .mobile-pagination-container {
              flex-direction: column !important;
              gap: 1rem !important;
              align-items: center !important;
            }
            .mobile-pagination-info {
              text-align: center !important;
              font-size: 0.75rem !important;
            }
            .mobile-pagination-buttons {
              gap: 0.5rem !important;
            }
            .mobile-pagination-buttons button {
              padding: 0.5rem 0.75rem !important;
              font-size: 0.75rem !important;
            }
            .mobile-pagination-buttons .w-10 {
              width: 2rem !important;
              height: 2rem !important;
              font-size: 0.75rem !important;
            }
            .mobile-card-container {
              margin: 0.5rem 0 !important;
              overflow: visible !important;
              position: relative !important;
            }
          }
          @media (min-width: 641px) and (max-width: 1024px) {
            .tablet-grid {
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 1rem !important;
              grid-template-rows: repeat(3, 1fr) !important;
              grid-auto-flow: row !important;
              padding: 0.5rem !important;
            }
            .tablet-grid > div {
              overflow: visible !important;
              padding: 0.25rem !important;
            }
          }
          @media (min-width: 1025px) {
            .desktop-grid {
              grid-template-rows: repeat(3, 1fr) !important;
              grid-auto-flow: row !important;
              padding: 0.5rem !important;
            }
            .desktop-grid > div {
              overflow: visible !important;
              padding: 0.25rem !important;
            }
          }
        `}</style>

        <div className="relative p-4 sm:p-6 md:p-8">
          <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="relative">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                <span className="text-white text-xl sm:text-2xl">📝</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent mb-1 truncate">
                Expense History
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium truncate">
                {filteredAndSortedRecords.length} of {records.length} records
                {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
              </p>
            </div>
          </div>

          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row gap-4 sm:gap-6">
            <div className="flex-1 relative group">
              <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                <div className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500 group-focus-within:text-emerald-500 transition-colors duration-200">
                  <span>🔍</span>
                </div>
              </div>
              <input
                type="text"
                placeholder="Search by category, or amount..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mobile-search w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 bg-gray-50/80 dark:bg-gray-800/50 border border-gray-200/60 dark:border-gray-700/60 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 focus:bg-white dark:focus:bg-gray-800 outline-none transition-all duration-300 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              />
              <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            </div>

            {/* Date Filter Dropdown */}
            <div className="relative" ref={dateDropdownRef}>
              <button
                type="button"
                className="w-full flex justify-between items-center py-3 sm:py-4 px-4 bg-gray-50/80 dark:bg-gray-800/50 border border-gray-200/60 dark:border-gray-700/60 rounded-xl sm:rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors duration-200 text-gray-900 dark:text-gray-100 text-sm sm:text-base font-medium"
                onClick={() => {
                  setIsDateDropdownOpen(!isDateDropdownOpen);
                  setIsSortDropdownOpen(false); // Close other dropdown
                }}
              >
                <div className="flex items-center gap-2">
                  <span>{currentDateOption?.icon}</span>
                  <span>{currentDateOption?.label}</span>
                </div>
                <span className={`transition-transform duration-200 ${isDateDropdownOpen ? 'rotate-180' : 'rotate-0'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </span>
              </button>
              
              {isDateDropdownOpen && (
                <div className="absolute left-0 top-full mt-2 z-10 w-full sm:w-64 bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl sm:rounded-2xl shadow-lg animate-fadeIn origin-top-left">
                  <div className="p-2">
                    {/* Past Records */}
                    <div className="text-xs text-gray-500 dark:text-gray-400 px-3 py-1 font-bold uppercase tracking-wider">Past Records</div>
                    {dateFilterOptions.filter(opt => opt.group === 'Past Records').map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setDateFilter(option.value);
                          setIsDateDropdownOpen(false);
                        }}
                        className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 ${
                          dateFilter === option.value
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <span className="flex-shrink-0">{option.icon}</span>
                        <span className="flex-1">{option.label}</span>
                      </button>
                    ))}

                    {/* This Year */}
                    <div className="text-xs text-gray-500 dark:text-gray-400 px-3 py-1 font-bold uppercase tracking-wider mt-2">This Year</div>
                    {dateFilterOptions.filter(opt => opt.group === 'This Year').map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setDateFilter(option.value);
                          setIsDateDropdownOpen(false);
                        }}
                        className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 ${
                          dateFilter === option.value
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <span className="flex-shrink-0">{option.icon}</span>
                        <span className="flex-1">{option.label}</span>
                      </button>
                    ))}

                    {/* All Data */}
                    <div className="text-xs text-gray-500 dark:text-gray-400 px-3 py-1 font-bold uppercase tracking-wider mt-2">All Data</div>
                    {dateFilterOptions.filter(opt => opt.group === 'All Data').map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setDateFilter(option.value);
                          setIsDateDropdownOpen(false);
                        }}
                        className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 ${
                          dateFilter === option.value
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <span className="flex-shrink-0">{option.icon}</span>
                        <span className="flex-1">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sorting Dropdown Menu */}
            <div className="relative" ref={sortDropdownRef}>
              <button
                type="button"
                className="w-full flex justify-between items-center py-3 sm:py-4 px-4 bg-gray-50/80 dark:bg-gray-800/50 border border-gray-200/60 dark:border-gray-700/60 rounded-xl sm:rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors duration-200 text-gray-900 dark:text-gray-100 text-sm sm:text-base font-medium"
                onClick={() => {
                  setIsSortDropdownOpen(!isSortDropdownOpen);
                  setIsDateDropdownOpen(false); // Close other dropdown
                }}
              >
                <div className="flex items-center gap-2">
                  <span>{currentSortOption?.icon}</span>
                  <span>{currentSortOption?.label}</span>
                </div>
                <span className={`transition-transform duration-200 ${isSortDropdownOpen ? 'rotate-180' : 'rotate-0'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </span>
              </button>
              
              {isSortDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 z-10 w-full sm:w-64 bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl sm:rounded-2xl shadow-lg animate-fadeIn origin-top-right">
                  <div className="p-2">
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortBy(option.value);
                          setIsSortDropdownOpen(false);
                        }}
                        className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 ${
                          sortBy === option.value
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <span className="flex-shrink-0">{option.icon}</span>
                        <span className="flex-1">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

         

          <div className="mobile-content-area relative h-auto sm:h-[700px] flex flex-col">
            {filteredAndSortedRecords.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center py-12 sm:py-0">
                <div>
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-3xl transform rotate-12 opacity-50"></div>
                    <div className="relative w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 rounded-3xl flex items-center justify-center">
                      <span className="text-2xl sm:text-3xl">🔍</span>
                    </div>
                  </div>
                  <h4 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-200 mb-3">
                    No Records Found
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm px-4">
                    Try adjusting your filters or search query.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 h-auto sm:h-[580px] overflow-hidden">
                  <div
                    key={`page-${currentPage}`}
                    className="mobile-grid tablet-grid desktop-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 h-auto sm:h-full opacity-0 animate-fadeIn"
                    style={{
                      animation: 'fadeInSlide 0.6s ease-out forwards',
                      animationDelay: '0.1s'
                    }}
                  >
                    {paginatedRecords.map((record: Record, index: number) => (
                      <div
                        key={(record as Record & { id: string }).id}
                        className="mobile-card-container transform transition-all duration-300 hover:scale-105 opacity-0 w-full"
                        style={{
                          animation: `fadeInUp 0.5s ease-out forwards`,
                          animationDelay: `${index * 80 + 200}ms`,
                          overflow: 'visible',
                          padding: '0.25rem',
                          position: 'relative'
                        }}
                      >
                        <RecordItem record={record} onDelete={handleRecordDelete} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mobile-pagination flex-shrink-0 h-auto sm:h-[120px] flex items-center pt-4 sm:pt-0">
                  {totalPages > 1 && itemsPerPage !== 'all' && (
                    <div className="mobile-pagination-container w-full flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-gray-200/60 dark:border-gray-700/60 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4">
                      <div className="mobile-pagination-info text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium text-center sm:text-left">
                        Showing <span className="font-bold text-emerald-600 dark:text-emerald-400">{(currentPage - 1) * currentCardsPerPage + 1}-{Math.min(currentPage * currentCardsPerPage, filteredAndSortedRecords.length)}</span> of <span className="font-bold text-emerald-600 dark:text-emerald-400">{filteredAndSortedRecords.length}</span> records
                      </div>
                      <div className="mobile-pagination-buttons flex items-center gap-1 sm:gap-2">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="group px-3 sm:px-4 py-2 sm:py-2.5 bg-white/80 dark:bg-gray-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 border border-gray-200/60 dark:border-gray-700/60 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-lg disabled:hover:bg-white/80 dark:disabled:hover:bg-gray-800/80 disabled:hover:border-gray-200/60 dark:disabled:hover:border-gray-700/60 disabled:hover:shadow-none flex items-center gap-1 sm:gap-2 backdrop-blur-sm"
                        >
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                          <span className="hidden sm:inline group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300">Previous</span>
                        </button>
                        <div className="flex items-center gap-0.5 sm:gap-1">
                          {[...Array(Math.min(5, totalPages))].map((_, i) => {
                            const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                            if (page > totalPages) return null;
                            return (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 border backdrop-blur-sm ${currentPage === page
                                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg border-emerald-500 scale-110'
                                  : 'bg-white/80 dark:bg-gray-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-gray-700 dark:text-gray-300 border-gray-200/60 dark:border-gray-700/60 hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-600 dark:hover:text-emerald-400 hover:shadow-md hover:scale-105'
                                  }`}
                              >
                                {page}
                              </button>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="group px-3 sm:px-4 py-2 sm:py-2.5 bg-white/80 dark:bg-gray-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 border border-gray-200/60 dark:border-gray-700/60 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-lg disabled:hover:bg-white/80 dark:disabled:hover:bg-gray-800/80 disabled:hover:border-gray-200/60 dark:disabled:hover:border-gray-700/60 disabled:hover:shadow-none flex items-center gap-1 sm:gap-2 backdrop-blur-sm"
                        >
                          <span className="hidden sm:inline group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300">Next</span>
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordHistoryClient;