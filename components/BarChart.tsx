'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale,
  type ChartOptions,
  type TooltipItem,
  ChartType,
} from 'chart.js';

// Simple emoji "icons"
const BarChart3 = ({ size = 18 }) => <span style={{ fontSize: `${size}px` }}>📊</span>;
const TrendingUp = ({ size = 18 }) => <span style={{ fontSize: `${size}px` }}>📈</span>;
const Activity = ({ size = 18 }) => <span style={{ fontSize: `${size}px` }}>📉</span>;
const TrendingDown = ({ size = 18 }) => <span style={{ fontSize: `${size}px` }}>📉</span>;
const Calendar = ({ size = 18 }) => <span style={{ fontSize: `${size}px` }}>📅</span>;
const ChevronLeft = ({ size = 18 }) => <span style={{ fontSize: `${size}px` }}>◀️</span>;
const ChevronRight = ({ size = 18 }) => <span style={{ fontSize: `${size}px` }}>▶️</span>;
const ZoomIn = ({ size = 16 }) => <span style={{ fontSize: `${size}px` }}>🔍</span>;
const ZoomOut = ({ size = 16 }) => <span style={{ fontSize: `${size}px` }}>🔎</span>;

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale
);

// Sample data - replace with your actual data
const sampleRecords = [
    { date: '2025-08-17', amount: 150, category: 'Food' },
    { date: '2025-08-16', amount: 3000, category: 'Bills' },
    { date: '2025-08-15', amount: 50, category: 'Transportation' },
    { date: '2025-08-14', amount: 200, category: 'Food' },
    { date: '2025-08-13', amount: 800, category: 'Shopping' },
    { date: '2025-08-12', amount: 120, category: 'Entertainment' },
    { date: '2025-08-11', amount: 300, category: 'Food' },
    { date: '2025-08-08', amount: 45, category: 'Transportation' },
    { date: '2025-08-05', amount: 1200, category: 'Shopping' },
    { date: '2025-08-02', amount: 75, category: 'Food' },
    { date: '2025-07-30', amount: 500, category: 'Entertainment' },
    { date: '2025-07-28', amount: 250, category: 'Food' },
    { date: '2025-07-25', amount: 60, category: 'Transportation' },
    { date: '2025-07-22', amount: 2000, category: 'Bills' },
    { date: '2025-07-20', amount: 180, category: 'Food' },
    { date: '2025-06-15', amount: 90, category: 'Transportation' },
    { date: '2025-06-10', amount: 400, category: 'Food' },
    { date: '2025-06-05', amount: 1500, category: 'Shopping' },
    { date: '2025-05-30', amount: 220, category: 'Entertainment' },
    { date: '2025-05-25', amount: 85, category: 'Food' },
    { date: '2025-05-20', amount: 350, category: 'Food' },
    { date: '2024-12-01', amount: 120, category: 'Transportation' },
    { date: '2024-11-15', amount: 800, category: 'Shopping' },
    { date: '2024-10-20', amount: 150, category: 'Entertainment' },
    { date: '2024-09-10', amount: 600, category: 'Bills' },
    { date: '2024-08-05', amount: 280, category: 'Food' },
    { date: '2024-07-01', amount: 95, category: 'Transportation' },
    { date: '2024-06-15', amount: 450, category: 'Food' },
    { date: '2024-05-20', amount: 1100, category: 'Shopping' },
    { date: '2024-04-10', amount: 320, category: 'Entertainment' },
    { date: '2024-03-15', amount: 250, category: 'Healthcare' },
    { date: '2024-02-01', amount: 180, category: 'Healthcare' },
    { date: '2024-01-20', amount: 90, category: 'Other' },
    { date: '2024-01-15', amount: 120, category: 'Other' },
];

interface Record {
  date: string;
  amount: number;
  category: string;
}

const categoryMapping = {
  Food: { emoji: '🍔', name: 'Food & Dining' },
  Transportation: { emoji: '🚗', name: 'Transportation' },
  Shopping: { emoji: '🛒', name: 'Shopping' },
  Entertainment: { emoji: '🎬', name: 'Entertainment' },
  Bills: { emoji: '💡', name: 'Bills & Utilities' },
  Healthcare: { emoji: '🏥', name: 'Healthcare' },
  Other: { emoji: '📦', name: 'Other' },
};

const dateFilterOptions = [
    { value: 'all', label: 'All Time', group: 'All Data' },
    { value: '7d', label: 'Last 7 days', group: 'Past Records' },
    { value: '30d', label: 'Last 30 days', group: 'Past Records' },
    { value: '90d', label: 'Last 90 days', group: 'Past Records' },
    { value: 'next7d', label: 'Next 7 days', group: 'Future Records' },
    { value: 'next30d', label: 'Next 30 days', group: 'Future Records' },
    { value: 'next90d', label: 'Next 90 days', group: 'Future Records' },
];

type TimeRangeOption = '7d' | '30d' | '90d' | 'next7d' | 'next30d' | 'next90d' | 'all';

const AdvancedChartSystem = ({ records }: { records?: Record[] }) => {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'doughnut'>('bar');
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('all');
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(6);
  const [isMobile, setIsMobile] = useState(false);

  const [isTimeRangeDropdownOpen, setIsTimeRangeDropdownOpen] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  // FIX 1: Restored separate, correctly-typed refs for each chart.
  // A single generic ref is not type-compatible with the specific chart components.
  const barChartRef = useRef<ChartJS<'bar'> | null>(null);
  const lineChartRef = useRef<ChartJS<'line'> | null>(null);
  const doughnutChartRef = useRef<ChartJS<'doughnut'> | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const timeRangeDropdownRef = useRef<HTMLDivElement>(null);

  const dataRecords = records || sampleRecords;

  useEffect(() => {
    setMounted(true);
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
        if (timeRangeDropdownRef.current && !timeRangeDropdownRef.current.contains(event.target as Node)) {
            if (isTimeRangeDropdownOpen) {
                setIsAnimatingOut(true);
            }
        }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isTimeRangeDropdownOpen]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (isAnimatingOut) {
        timeoutId = setTimeout(() => {
            setIsTimeRangeDropdownOpen(false);
            setIsAnimatingOut(false);
        }, 200);
    }
    return () => clearTimeout(timeoutId);
  }, [isAnimatingOut]);

  const colorSchemes = {
    vibrant: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'],
    dark: ['#E74C3C', '#1ABC9C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6', '#34495E', '#E67E22'],
  };
  const colors = isDark ? colorSchemes.dark : colorSchemes.vibrant;

  const processedData = useMemo(() => {
    const now = new Date();
    const filtered = dataRecords.filter((r) => {
      if (timeRange === 'all') return true;
      const recordDate = new Date(r.date);
      const timeDiff = recordDate.getTime() - now.getTime();
      const daysDiff = Math.floor(timeDiff / (24 * 60 * 60 * 1000));
      if (timeRange === '7d') return daysDiff >= -7 && daysDiff <= 0;
      if (timeRange === '30d') return daysDiff >= -30 && daysDiff <= 0;
      if (timeRange === '90d') return daysDiff >= -90 && daysDiff <= 0;
      if (timeRange === 'next7d') return daysDiff >= 0 && daysDiff <= 7;
      if (timeRange === 'next30d') return daysDiff >= 0 && daysDiff <= 30;
      if (timeRange === 'next90d') return daysDiff >= 0 && daysDiff <= 90;
      return true;
    });
    const dateMap = new Map<string, { date: string; amount: number; categories: Set<string>; records: Record[] }>();
    filtered.forEach((rec) => {
        const dateKey = new Date(rec.date).toISOString().split('T')[0];
        if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, { date: dateKey, amount: 0, categories: new Set(), records: [] });
        }
        const day = dateMap.get(dateKey)!;
        day.amount += rec.amount;
        day.categories.add(rec.category);
        day.records.push(rec);
    });
    const dailyData = Array.from(dateMap.values()).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const categoryMap = new Map<string, number>();
    const categoryRecords = new Map<string, Record[]>();
    filtered.forEach((rec) => {
        if (!categoryMap.has(rec.category)) {
            categoryMap.set(rec.category, 0);
            categoryRecords.set(rec.category, []);
        }
        categoryMap.set(rec.category, (categoryMap.get(rec.category) || 0) + rec.amount);
        categoryRecords.get(rec.category)!.push(rec);
    });
    const allCategories = Object.keys(categoryMapping);
    const categoryData = allCategories.map((cat) => ({
        category: cat,
        amount: categoryMap.get(cat) || 0,
        records: categoryRecords.get(cat) || [],
        count: (categoryRecords.get(cat) || []).length,
    }));
    return {
        daily: dailyData,
        categories: categoryData,
        totalAmount: filtered.reduce((s, r) => s + r.amount, 0),
        avgDaily: dailyData.length > 0 ? dailyData.reduce((s, d) => s + d.amount, 0) / dailyData.length : 0,
        avgCategory: categoryData.filter((c) => c.amount > 0).length > 0 ? categoryData.reduce((s, c) => s + c.amount, 0) / categoryData.filter((c) => c.amount > 0).length : 0,
    };
  }, [dataRecords, timeRange]);

  const MAX_VISIBLE_BARS = Math.max(2, Math.min(10, zoomLevel));
  const totalItems = processedData.categories.length;
  const needsScrolling = (chartType === 'bar' || chartType === 'line') && totalItems > MAX_VISIBLE_BARS;

  const [scrollOffset, setScrollOffset] = useState(0);
  const maxOffset = Math.max(0, totalItems - MAX_VISIBLE_BARS);

  useEffect(() => {
    setScrollOffset(0);
  }, [timeRange, chartType, totalItems, zoomLevel]);

  const clampedOffset = Math.max(0, Math.min(scrollOffset, maxOffset));

  const visibleData = useMemo(() => {
    if (!needsScrolling) return processedData.categories;
    return processedData.categories.slice(clampedOffset, clampedOffset + MAX_VISIBLE_BARS);
  }, [processedData.categories, clampedOffset, needsScrolling, MAX_VISIBLE_BARS]);

  const handlePrev = () => setScrollOffset((o) => Math.max(0, o - 1));
  const handleNext = () => setScrollOffset((o) => Math.min(maxOffset, o + 1));
  const handleZoomIn = () => setZoomLevel((z) => Math.max(2, z - 1));
  const handleZoomOut = () => setZoomLevel((z) => Math.min(10, z + 1));

  const getChartData = () => {
    if (chartType === 'bar' || chartType === 'line') {
      return {
        labels: visibleData.map((item) => {
          const info = categoryMapping[item.category as keyof typeof categoryMapping] || {};
          const label = `${info.emoji || '📦'} ${info.name || item.category}`;
          return isMobile && label.length > 15 ? label.substring(0, 15) + '...' : label;
        }),
        datasets: [
          {
            label: 'Total Expenses by Category',
            data: visibleData.map((item) => item.amount),
            backgroundColor: visibleData.map((_, i) => colors[i % colors.length] + '40'),
            borderColor: visibleData.map((_, i) => colors[i % colors.length]),
            borderWidth: 2,
            ...(chartType === 'bar'
              ? {
                  borderRadius: 6,
                  borderSkipped: false as const,
                  barThickness: isMobile ? 20 : 60,
                  maxBarThickness: isMobile ? 30 : 80,
                  categoryPercentage: 0.8,
                  barPercentage: 0.9,
                }
              : {
                  fill: true,
                  tension: 0.3,
                  pointBackgroundColor: visibleData.map((_, i) => colors[i % colors.length]),
                  pointBorderColor: '#ffffff',
                  pointBorderWidth: 2,
                  pointRadius: 8,
                  pointHoverRadius: 12,
                }),
          },
        ],
      };
    }

    const categoriesWithData = processedData.categories.filter((c) => c.amount > 0);
    return {
      labels: categoriesWithData.map((item) => {
        const info = categoryMapping[item.category as keyof typeof categoryMapping] || {};
        return `${info.emoji || '📦'} ${info.name || item.category}`;
      }),
      datasets: [
        {
          data: categoriesWithData.map((item) => item.amount),
          backgroundColor: categoriesWithData.map((_, i) => colors[i % colors.length]),
          borderColor: isDark ? '#1f2937' : '#ffffff',
          borderWidth: 2,
          hoverOffset: 10,
        },
      ],
    };
  };

  const getChartOptions = (): ChartOptions<ChartType> => {
    const baseOptions: ChartOptions<'bar' | 'line' | 'doughnut'> = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' as const },
      layout: { padding: { top: 20, right: 20, bottom: 20, left: 20 } },
      plugins: {
        legend: {
          display: chartType === 'doughnut',
          position: 'bottom' as const,
          labels: {
            padding: 20,
            usePointStyle: true,
            font: { size: isMobile ? 10 : 12 },
            color: isDark ? '#e5e7eb' : '#374151',
          },
        },
        tooltip: {
          backgroundColor: isDark ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255,255,255,0.95)',
          titleColor: isDark ? '#f9fafb' : '#111827',
          bodyColor: isDark ? '#d1d5db' : '#374151',
          borderColor: isDark ? '#374151' : '#d1d5db',
          borderWidth: 1,
          cornerRadius: 12,
          titleFont: { size: 14, weight: 'bold' },
          bodyFont: { size: 12 },
          padding: 12,
          displayColors: true,
          callbacks: {
            title: (ctx: TooltipItem<'bar' | 'line' | 'doughnut'>[]) => {
              if (chartType === 'bar' || chartType === 'line') {
                const idx = ctx[0]?.dataIndex;
                if (idx !== undefined && visibleData[idx]) {
                  const cat = visibleData[idx].category;
                  const info = categoryMapping[cat as keyof typeof categoryMapping] || {};
                  return `${info.emoji || '📦'} ${info.name || cat}`;
                }
              }
              return ctx[0]?.label || '';
            },
            label: (ctx: TooltipItem<'bar' | 'line' | 'doughnut'>) => {
              if (chartType === 'doughnut') {
                const total = processedData.totalAmount || 1;
                const pct = ((ctx.parsed as number / total) * 100).toFixed(1);
                return `Total: ₹${(ctx.parsed as number).toLocaleString()} (${pct}%)`;
              }
              const idx = ctx.dataIndex;
              if (idx !== undefined && visibleData[idx]) {
                const catData = visibleData[idx];
                const avg =
                  catData.count > 0
                    ? Math.round((catData.amount || 0) / (catData.count || 1)).toLocaleString()
                    : '0';
                return [
                  `Total Amount: ₹${(catData.amount || 0).toLocaleString()}`,
                  `Number of Transactions: ${catData.count || 0}`,
                  `Average per Transaction: ₹${avg}`,
                ];
              }
              const val = (ctx.parsed?.y ?? ctx.parsed ?? 0) as number;
              return `Amount: ₹${val.toLocaleString()}`;
            },
          },
        },
      },
    };

    if (chartType === 'bar' || chartType === 'line') {
      baseOptions.scales = {
        x: {
          title: {
            display: true,
            text: 'Categories',
            font: { size: 14, weight: 'bold' },
            color: isDark ? '#d1d5db' : '#374151',
          },
          grid: { display: false },
          ticks: {
            color: isDark ? '#9ca3af' : '#6b7280',
            font: { size: isMobile ? 8 : 11 },
            maxRotation: isMobile ? 90 : 45,
            minRotation: isMobile ? 90 : 0,
            padding: 8,
          },
        },
        y: {
          title: {
            display: true,
            text: 'Total Amount (₹)',
            font: { size: 14, weight: 'bold' },
            color: isDark ? '#d1d5db' : '#374151',
          },
          grid: { color: isDark ? '#374151' : '#e5e7eb' },
          ticks: {
            color: isDark ? '#9ca3af' : '#6b7280',
            font: { size: isMobile ? 8 : 11 },
            callback: (v: string | number) => '₹' + Number(v).toLocaleString(),
          },
          beginAtZero: true,
        },
      };
      baseOptions.indexAxis = 'x';
    }

    return baseOptions;
  };

  const stats = useMemo(() => {
    const { categories, totalAmount, avgCategory } = processedData;
    const withData = categories.filter((c) => c.amount > 0);
    if (withData.length === 0) {
      return { total: 0, average: 0, highest: 0, lowest: 0, categoriesUsed: 0 };
    }
    const highest = withData.reduce((m, c) => (c.amount > m.amount ? c : m), withData[0]).amount;
    const lowest = withData.reduce((m, c) => (c.amount < m.amount ? c : m), withData[0]).amount;
    return {
      total: totalAmount,
      average: avgCategory || 0,
      highest,
      lowest,
      categoriesUsed: withData.length,
    };
  }, [processedData]);

  const currentTimeRangeOption = dateFilterOptions.find(option => option.value === timeRange);

  if (!mounted) {
    return (
      <div className={`w-full max-w-6xl mx-auto p-6 rounded-xl ${isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} shadow-2xl`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-gray-300 rounded"></div>)}
          </div>
          <div className="h-96 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-6xl mx-auto p-4 md:p-6 rounded-xl ${isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} shadow-2xl overflow-hidden`}>
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes fadeOut {
          from {
            opacity: 1;
            transform: scale(1);
          }
          to {
            opacity: 0;
            transform: scale(0.95);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .animate-fadeOut {
          animation: fadeOut 0.2s ease-out forwards;
        }
      `}</style>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 space-y-4 md:space-y-0">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
            Financial Dashboard
          </h2>
          <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Category-wise expense tracking and visualization
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsDark(!isDark)}
            className={`px-4 py-2 rounded-lg transition-all duration-200 ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
          >
            {isDark ? '🌞' : '🌙'}
          </button>
          <div className="relative" ref={timeRangeDropdownRef}>
            <button
                type="button"
                className={`w-full flex justify-between items-center py-2 px-4 rounded-lg transition-all duration-200 ${isDark ? 'bg-gray-800 border-gray-700 text-white hover:bg-gray-700' : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-100'} border`}
                onClick={() => {
                    if (isTimeRangeDropdownOpen) {
                        setIsAnimatingOut(true);
                    } else {
                        setIsTimeRangeDropdownOpen(true);
                    }
                }}
            >
                <span>{currentTimeRangeOption?.label}</span>
                <span className={`transition-transform duration-200 ${isTimeRangeDropdownOpen && !isAnimatingOut ? 'rotate-180' : 'rotate-0'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </span>
            </button>

            {isTimeRangeDropdownOpen && (
              <div
                className={`absolute top-full mt-2 z-10 
                  w-[90vw] max-w-sm md:w-96 
                  left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-0
                  bg-white dark:bg-gray-800 
                  border border-gray-200/60 dark:border-gray-700/60 
                  rounded-xl sm:rounded-2xl 
                  shadow-lg origin-top-right 
                  ${isAnimatingOut ? 'animate-fadeOut' : 'animate-fadeIn'}`}
                onAnimationEnd={() => {
                  if (isAnimatingOut) {
                    setIsTimeRangeDropdownOpen(false);
                    setIsAnimatingOut(false);
                  }
                }}
              >
                <div className="p-2">
                  {['Past Records', 'Future Records', 'All Data'].map(group => (
                    <React.Fragment key={group}>
                      <div className="text-xs text-gray-500 dark:text-gray-400 px-3 py-1 font-bold uppercase tracking-wider mt-2 first:mt-0">{group}</div>
                      {dateFilterOptions.filter(opt => opt.group === group).map(option => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setTimeRange(option.value as TimeRangeOption);
                            setIsAnimatingOut(true);
                          }}
                          className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 ${timeRange === option.value
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                          <span className="flex-1">{option.label}</span>
                        </button>
                      ))}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-8">
        <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-blue-50'} border ${isDark ? 'border-gray-700' : 'border-blue-200'}`}>
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-blue-600'}`}>Total</p>
              <p className="text-sm sm:text-base md:text-xl font-bold truncate">
                ₹{stats.total.toLocaleString()}
              </p>
            </div>
            <span>💰</span>
          </div>
        </div>

        <div className={`hidden md:block p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-green-50'} border ${isDark ? 'border-gray-700' : 'border-green-200'}`}>
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-green-600'}`}>Avg/Category</p>
              <p className="text-lg md:text-xl font-bold truncate">₹{Math.round(stats.average).toLocaleString()}</p>
            </div>
            <TrendingUp size={24} />
          </div>
        </div>

        <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-red-50'} border ${isDark ? 'border-gray-700' : 'border-red-200'}`}>
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-red-600'}`}>Highest</p>
              <p className="text-lg md:text-xl font-bold truncate">₹{stats.highest.toLocaleString()}</p>
            </div>
            <span>🔺</span>
          </div>
        </div>

        <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-yellow-50'} border ${isDark ? 'border-gray-700' : 'border-yellow-200'}`}>
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-yellow-600'}`}>Lowest</p>
              <p className="text-lg md:text-xl font-bold truncate">₹{stats.lowest.toLocaleString()}</p>
            </div>
            <TrendingDown size={24} />
          </div>
        </div>

        <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-purple-50'} border ${isDark ? 'border-gray-700' : 'border-purple-200'}`}>
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-purple-600'}`}>Categories Used</p>
              <p className="text-lg md:text-xl font-bold truncate">{stats.categoriesUsed}</p>
            </div>
            <Calendar size={24} />
          </div>
        </div>
      </div>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
        <div className={`flex w-fit rounded-xl p-1 space-x-0 px-1 py-2 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <button
            onClick={() => setChartType('bar')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${chartType === 'bar'
              ? `${isDark ? 'bg-blue-600' : 'bg-blue-500'} text-white shadow-lg`
              : `${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200'}`
              }`}
          >
            <BarChart3 />
            <span>Bar</span>
          </button>
          <button
            onClick={() => setChartType('line')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${chartType === 'line'
              ? `${isDark ? 'bg-blue-600' : 'bg-blue-500'} text-white shadow-lg`
              : `${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200'}`
              }`}
          >
            <Activity />
            <span>Line</span>
          </button>
          <button
            onClick={() => setChartType('doughnut')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${chartType === 'doughnut'
              ? `${isDark ? 'bg-blue-600' : 'bg-blue-500'} text-white shadow-lg`
              : `${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200'}`
              }`}
          >
            <div className="w-4 h-4 border-2 border-current border-r-transparent rounded-full" />
            <span>Doughnut</span>
          </button>
        </div>
        <div className={`hidden md:block px-3 py-2 text-sm rounded-lg ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
          {(chartType === 'bar' || chartType === 'line')
            ? `Showing expenses by category (${processedData.categories.filter(c => c.amount > 0).length} categories with data)`
            : `Showing category distribution (${processedData.categories.filter((c) => c.amount > 0).length} with data)`}
          <br />
          <span className="text-xs opacity-75">
            {timeRange.startsWith('next') ? '📅 Future' : timeRange === 'all' ? '📊 All Time' : '📈 Past'} |
            Records: {processedData.daily.reduce((sum, day) => sum + day.records.length, 0)} |
            Total: ₹{processedData.totalAmount.toLocaleString()}
          </span>
        </div>
      </div>
      {(chartType === 'bar' || chartType === 'line') && (
        <div className="flex flex-col sm:flex-row items-center justify-between mb-4 space-y-2 sm:space-y-0">
          <div className="flex items-center gap-2">
            <span className={`hidden sm:inline text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Zoom: {MAX_VISIBLE_BARS} items
            </span>
            <button
              onClick={handleZoomOut}
              disabled={zoomLevel >= 10}
              className={`p-2 rounded-lg border text-sm transition-all duration-200 ${isDark ? 'bg-gray-800 border-gray-700 text-white hover:bg-gray-700' : 'bg-white border-gray-300 text-gray-800 hover:bg-gray-50'} disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Zoom Out (show more items)"
            >
              <ZoomOut size={16} />
            </button>
            <button
              onClick={handleZoomIn}
              disabled={zoomLevel <= 2}
              className={`p-2 rounded-lg border text-sm transition-all duration-200 ${isDark ? 'bg-gray-800 border-gray-700 text-white hover:bg-gray-700' : 'bg-white border-gray-300 text-gray-800 hover:bg-gray-50'} disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Zoom In (show fewer items)"
            >
              <ZoomIn size={16} />
            </button>
          </div>

          {needsScrolling && (
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                disabled={clampedOffset === 0}
                className={`px-3 py-2 rounded-lg border text-sm flex items-center gap-1 transition-all duration-200 ${isDark ? 'bg-gray-800 border-gray-700 text-white hover:bg-gray-700' : 'bg-white border-gray-300 text-gray-800 hover:bg-gray-50'} disabled:opacity-50 disabled:cursor-not-allowed`}
                aria-label="Previous items"
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <span className={`text-sm px-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {clampedOffset + 1}-{Math.min(clampedOffset + MAX_VISIBLE_BARS, totalItems)} of {totalItems}
              </span>
              <button
                onClick={handleNext}
                disabled={clampedOffset >= maxOffset}
                className={`px-3 py-2 rounded-lg border text-sm flex items-center gap-1 transition-all duration-200 ${isDark ? 'bg-gray-800 border-gray-700 text-white hover:bg-gray-700' : 'bg-white border-gray-300 text-gray-800 hover:bg-gray-50'} disabled:opacity-50 disabled:cursor-not-allowed`}
                aria-label="Next items"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
      <div className="overflow-hidden">
        <div
          ref={containerRef}
          className={`relative w-full rounded-xl p-6 ${isDark ? 'bg-gray-800' : 'bg-gray-50'} border ${isDark ? 'border-gray-700' : 'border-gray-200'} overflow-hidden`}
          style={{ height: chartType === 'doughnut' ? '500px' : '400px' }}
        >
          {processedData.daily.length > 0 ? (
            <div className="w-full h-full overflow-hidden">
              {/* FIX 2: Added type assertions to options and used the correct specific ref for each chart */}
              {chartType === 'bar' && <Bar ref={barChartRef} data={getChartData()} options={getChartOptions() as ChartOptions<'bar'>} />}
              {chartType === 'line' && <Line ref={lineChartRef} data={getChartData()} options={getChartOptions() as ChartOptions<'line'>} />}
              {chartType === 'doughnut' && <Doughnut ref={doughnutChartRef} data={getChartData()} options={getChartOptions() as ChartOptions<'doughnut'>} />}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl mb-4">📊</div>
                <p className={`text-lg font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  No data available for the selected time range
                </p>
                <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Try selecting a different time range or add some expense records
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      {(chartType === 'bar' || chartType === 'line') && needsScrolling && totalItems > 0 && (
        <div className="mt-4 overflow-hidden">
          <div className={`w-full h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-300"
              style={{
                width: `${((clampedOffset + Math.min(MAX_VISIBLE_BARS, totalItems)) / totalItems) * 100}%`,
                marginLeft: `${(clampedOffset / totalItems) * 100}%`,
              }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Start: {processedData.daily[0] ? new Date(processedData.daily[0].date).toLocaleDateString() : '—'}
            </span>
            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              End: {processedData.daily[processedData.daily.length - 1] ? new Date(processedData.daily[processedData.daily.length - 1].date).toLocaleDateString() : '—'}
            </span>
          </div>
        </div>
      )}
      {(chartType === 'bar' || chartType === 'line') && (
        <div className={`mt-4 p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'} border ${isDark ? 'border-gray-700' : 'border-gray-200'} overflow-hidden`}>
          <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} text-center`}>
            💡 Tip: Use zoom controls to adjust view size ({MAX_VISIBLE_BARS} items visible){needsScrolling && `, and Prev/Next buttons to navigate. Showing ${visibleData.length} of ${totalItems}.`}
          </p>
        </div>
      )}
      {(chartType === 'bar' || chartType === 'line') && visibleData.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden">
          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'} border ${isDark ? 'border-gray-700' : 'border-gray-200'} overflow-hidden`}>
            <h4 className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-2`}>Current View Total</h4>
            <p className="text-xl font-bold">₹{visibleData.reduce((s, it) => s + it.amount, 0).toLocaleString()}</p>
          </div>

          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'} border ${isDark ? 'border-gray-700' : 'border-gray-200'} overflow-hidden`}>
            <h4 className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-2`}>View Average</h4>
            <p className="text-xl font-bold">
              ₹
              {Math.round(
                visibleData.reduce((s, it) => s + it.amount, 0) / Math.max(1, visibleData.length)
              ).toLocaleString()}
            </p>
          </div>

          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'} border ${isDark ? 'border-gray-700' : 'border-gray-200'} overflow-hidden`}>
            <h4 className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-2`}>Date Range</h4>
            <p className="text-sm font-medium">
              {processedData.daily[0]
                ? new Date(processedData.daily[0].date).toLocaleDateString()
                : '—'}{' '}
              -{' '}
              {processedData.daily[processedData.daily.length - 1]
                ? new Date(processedData.daily[processedData.daily.length - 1].date).toLocaleDateString()
                : '—'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedChartSystem;