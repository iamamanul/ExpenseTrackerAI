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

  // FIX: Create a separate, correctly typed ref for each chart type
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

  const getChartOptions = (): ChartOptions<'bar' | 'line' | 'doughnut'> => {
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
        /* ... styles ... */
      `}</style>
      {/* ... header and stats ... */}
      <div className="overflow-hidden">
        <div
          ref={containerRef}
          className={`relative w-full rounded-xl p-6 ${isDark ? 'bg-gray-800' : 'bg-gray-50'} border ${isDark ? 'border-gray-700' : 'border-gray-200'} overflow-hidden`}
          style={{ height: chartType === 'doughnut' ? '500px' : '400px' }}
        >
          {processedData.daily.length > 0 ? (
            <div className="w-full h-full overflow-hidden">
              {/* FIX: Use the specific ref for each chart type */}
              {chartType === 'bar' && <Bar ref={barChartRef} data={getChartData()} options={getChartOptions()} />}
              {chartType === 'line' && <Line ref={lineChartRef} data={getChartData()} options={getChartOptions()} />}
              {chartType === 'doughnut' && <Doughnut ref={doughnutChartRef} data={getChartData()} options={getChartOptions()} />}
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
      {/* ... rest of JSX ... */}
    </div>
  );
};

export default AdvancedChartSystem;