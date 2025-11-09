// 'use client';

// import { useState, useMemo, useEffect } from 'react';
// import getRecords from '@/app/actions/getRecords';
// import RecordItem from './RecordItem';
// import { Record } from '@/types/Record';

// interface RecordHistoryProps {
//   initialRecords?: Record[];
//   initialError?: string | null;
// }

// // Filter and sort options
// const FILTER_OPTIONS = [
//   { value: 'all', label: 'All Records', icon: '📊' },
//   { value: 'recent', label: 'Recent (7 days)', icon: '🕐' },
//   { value: 'month', label: 'This Month', icon: '📅' },
//   { value: 'year', label: 'This Year', icon: '🗓️' }
// ];

// const SORT_OPTIONS = [
//   { value: 'newest', label: 'Newest First', icon: '⬇️' },
//   { value: 'oldest', label: 'Oldest First', icon: '⬆️' },
//   { value: 'highest', label: 'Highest Amount', icon: '💰' },
//   { value: 'lowest', label: 'Lowest Amount', icon: '💸' }
// ];

// const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100, 'all'];

// const RecordHistory = ({ initialRecords = [], initialError = null }: RecordHistoryProps) => {
//   const [records, setRecords] = useState<Record[]>(initialRecords);
//   const [error, setError] = useState<string | null>(initialError);
//   const [loading, setLoading] = useState(false);
//   const [dateFilter, setDateFilter] = useState('all');
//   const [sortBy, setSortBy] = useState('newest');
//   const [searchQuery, setSearchQuery] = useState('');
//   const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(20);
//   const [currentPage, setCurrentPage] = useState(1);

//   const loadRecords = async () => {
//     setLoading(true);
//     try {
//       const result = await getRecords();
//       setRecords(result.records || []);
//       setError(result.error);
//     } catch (err) {
//       setError('Failed to load records');
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Load records if not provided initially
//   useEffect(() => {
//     if (initialRecords.length === 0 && !initialError) {
//       loadRecords();
//     }
//   }, [initialRecords.length, initialError]);

//   // Filter and sort records
//   const filteredAndSortedRecords = useMemo(() => {
//     let filtered = [...records];

//     // Apply search filter
//     if (searchQuery.trim()) {
//       const query = searchQuery.toLowerCase();
//       filtered = filtered.filter(record => {
//         // Based on your Record structure, check these fields
//         const description = String(record.description || '').toLowerCase();
//         const category = String(record.category || '').toLowerCase(); 
//         const amount = String(record.amount || '').toLowerCase();
        
//         return description.includes(query) || 
//                category.includes(query) || 
//                amount.includes(query);
//       });
//     }

//     // Apply date filter using the 'date' field from your database
//     if (dateFilter !== 'all') {
//       const now = new Date();
      
//       switch (dateFilter) {
//         case 'recent':
//           const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
//           filtered = filtered.filter(record => {
//             if (!record.date) return false;
//             const recordDate = new Date(record.date);
//             return !isNaN(recordDate.getTime()) && recordDate >= sevenDaysAgo;
//           });
//           break;
          
//         case 'month':
//           const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
//           filtered = filtered.filter(record => {
//             if (!record.date) return false;
//             const recordDate = new Date(record.date);
//             return !isNaN(recordDate.getTime()) && recordDate >= firstOfMonth;
//           });
//           break;
          
//         case 'year':
//           const firstOfYear = new Date(now.getFullYear(), 0, 1);
//           filtered = filtered.filter(record => {
//             if (!record.date) return false;
//             const recordDate = new Date(record.date);
//             return !isNaN(recordDate.getTime()) && recordDate >= firstOfYear;
//           });
//           break;
//       }
//     }

//     // Apply sorting using the 'date' field
//     switch (sortBy) {
//       case 'newest':
//         filtered.sort((a, b) => {
//           const dateA = new Date(a.date || 0);
//           const dateB = new Date(b.date || 0);
//           return dateB.getTime() - dateA.getTime();
//         });
//         break;
        
//       case 'oldest':
//         filtered.sort((a, b) => {
//           const dateA = new Date(a.date || 0);
//           const dateB = new Date(b.date || 0);
//           return dateA.getTime() - dateB.getTime();
//         });
//         break;
        
//       case 'highest':
//         filtered.sort((a, b) => (b.amount || 0) - (a.amount || 0));
//         break;
        
//       case 'lowest':
//         filtered.sort((a, b) => (a.amount || 0) - (b.amount || 0));
//         break;
//     }

//     return filtered;
//   }, [records, dateFilter, sortBy, searchQuery]);

//   // Pagination  
//   const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(filteredAndSortedRecords.length / (itemsPerPage as number));
//   const paginatedRecords = itemsPerPage === 'all' 
//     ? filteredAndSortedRecords 
//     : filteredAndSortedRecords.slice(
//         (currentPage - 1) * (itemsPerPage as number),
//         currentPage * (itemsPerPage as number)
//       );

//   // Reset page when filters change
//   useEffect(() => {
//     setCurrentPage(1);
//   }, [dateFilter, sortBy, searchQuery, itemsPerPage]);

//   if (error) {
//     return (
//       <div className='bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-xl border border-gray-100/50 dark:border-gray-700/50'>
//         <div className='flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6'>
//           <div className='w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg'>
//             <span className='text-white text-sm sm:text-lg'>📝</span>
//           </div>
//           <div>
//             <h3 className='text-lg sm:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent'>
//               Expense History
//             </h3>
//             <p className='text-xs text-gray-500 dark:text-gray-400 mt-0.5'>
//               Your spending timeline
//             </p>
//           </div>
//         </div>
//         <div className='bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-l-4 border-l-red-500 p-3 sm:p-4 rounded-xl'>
//           <div className='flex items-center gap-2 mb-2'>
//             <div className='w-6 h-6 sm:w-8 sm:h-8 bg-red-100 dark:bg-red-800 rounded-lg flex items-center justify-center'>
//               <span className='text-base sm:text-lg'>⚠️</span>
//             </div>
//             <h4 className='font-bold text-red-800 dark:text-red-300 text-sm'>
//               Error loading expense history
//             </h4>
//           </div>
//           <p className='text-red-700 dark:text-red-400 ml-8 sm:ml-10 text-xs'>
//             {error}
//           </p>
//           <button
//             onClick={loadRecords}
//             className='mt-3 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors duration-200'
//           >
//             Try Again
//           </button>
//         </div>
//       </div>
//     );
//   }

//   if (loading) {
//     return (
//       <div className='bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-xl border border-gray-100/50 dark:border-gray-700/50'>
//         <div className='animate-pulse'>
//           <div className='flex items-center gap-3 mb-6'>
//             <div className='w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-xl'></div>
//             <div className='space-y-2'>
//               <div className='h-6 w-32 bg-gray-300 dark:bg-gray-600 rounded'></div>
//               <div className='h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded'></div>
//             </div>
//           </div>
//           <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
//             {[...Array(8)].map((_, i) => (
//               <div key={i} className='h-24 bg-gray-200 dark:bg-gray-700 rounded-xl'></div>
//             ))}
//           </div>
//         </div>
//       </div>
//     );
//   }

//   if (!records || records.length === 0) {
//     return (
//       <div className='bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-xl border border-gray-100/50 dark:border-gray-700/50'>
//         <div className='flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6'>
//           <div className='w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg'>
//             <span className='text-white text-sm sm:text-lg'>📝</span>
//           </div>
//           <div>
//             <h3 className='text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100'>
//               Expense History
//             </h3>
//             <p className='text-xs text-gray-500 dark:text-gray-400 mt-0.5'>
//               Your spending timeline
//             </p>
//           </div>
//         </div>
//         <div className='text-center py-6 sm:py-8'>
//           <div className='w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/50 dark:to-green-900/50 rounded-2xl flex items-center justify-center mx-auto mb-4'>
//             <span className='text-2xl sm:text-3xl'>📊</span>
//           </div>
//           <h4 className='text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200 mb-2'>
//             No Expense Records Found
//           </h4>
//           <p className='text-gray-600 dark:text-gray-400 max-w-md mx-auto text-sm'>
//             Start tracking your expenses to see your spending history and
//             patterns here.
//           </p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className='bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-xl border border-gray-100/50 dark:border-gray-700/50 hover:shadow-2xl transition-shadow duration-300'>
//       {/* Header */}
//       <div className='flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6'>
//         <div className='w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg'>
//           <span className='text-white text-sm sm:text-lg'>📝</span>
//         </div>
//         <div className='flex-1'>
//           <h3 className='text-lg sm:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent'>
//             Expense History
//           </h3>
//           <p className='text-xs text-gray-500 dark:text-gray-400 mt-0.5'>
//             {filteredAndSortedRecords.length} of {records.length} records
//           </p>
//         </div>
//         <button
//           onClick={loadRecords}
//           className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200'
//           title='Refresh records'
//         >
//           <span className='text-lg'>🔄</span>
//         </button>
//       </div>

//       {/* Search Bar */}
//       <div className='mb-4'>
//         <div className='relative'>
//           <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
//             <span className='text-gray-400'>🔍</span>
//           </div>
//           <input
//             type='text'
//             placeholder='Search by description, category, or amount...'
//             value={searchQuery}
//             onChange={(e) => setSearchQuery(e.target.value)}
//             className='w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all duration-200 text-sm'
//           />
//         </div>
//       </div>

//       {/* Filters */}
//       <div className='mb-6 space-y-3'>
//         {/* Date and Sort Filters */}
//         <div className='flex flex-wrap gap-2'>
//           {/* Date Filter */}
//           <div className='flex bg-gray-50 dark:bg-gray-700/50 rounded-xl p-1'>
//             {FILTER_OPTIONS.map((option) => (
//               <button
//                 key={option.value}
//                 onClick={() => setDateFilter(option.value)}
//                 className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
//                   dateFilter === option.value
//                     ? 'bg-emerald-500 text-white shadow-sm'
//                     : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
//                 }`}
//               >
//                 <span>{option.icon}</span>
//                 <span className='hidden sm:inline'>{option.label}</span>
//               </button>
//             ))}
//           </div>

//           {/* Sort Filter */}
//           <div className='flex bg-gray-50 dark:bg-gray-700/50 rounded-xl p-1'>
//             {SORT_OPTIONS.map((option) => (
//               <button
//                 key={option.value}
//                 onClick={() => setSortBy(option.value)}
//                 className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
//                   sortBy === option.value
//                     ? 'bg-blue-500 text-white shadow-sm'
//                     : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
//                 }`}
//               >
//                 <span>{option.icon}</span>
//                 <span className='hidden sm:inline'>{option.label}</span>
//               </button>
//             ))}
//           </div>
//         </div>

//         {/* Items per page */}
//         <div className='flex items-center gap-2'>
//           <span className='text-sm text-gray-600 dark:text-gray-300'>Show:</span>
//           <select
//             value={itemsPerPage}
//             onChange={(e) => setItemsPerPage(e.target.value === 'all' ? 'all' : Number(e.target.value))}
//             className='px-2 py-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none'
//           >
//             {ITEMS_PER_PAGE_OPTIONS.map((option) => (
//               <option key={option} value={option}>
//                 {option === 'all' ? 'All items' : `${option} items`}
//               </option>
//             ))}
//           </select>
//         </div>
//       </div>

//       {/* Records Grid */}
//       {filteredAndSortedRecords.length === 0 ? (
//         <div className='text-center py-8'>
//           <div className='w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4'>
//             <span className='text-2xl'>🔍</span>
//           </div>
//           <h4 className='text-lg font-bold text-gray-800 dark:text-gray-200 mb-2'>
//             No Records Found
//           </h4>
//           <p className='text-gray-600 dark:text-gray-400 text-sm'>
//             Try adjusting your filters or search query.
//           </p>
//         </div>
//       ) : (
//         <>
//           <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 mb-6'>
//             {paginatedRecords.map((record: Record) => (
//               <RecordItem key={record.id} record={record} />
//             ))}
//           </div>

//           {/* Pagination */}
//           {totalPages > 1 && itemsPerPage !== 'all' && (
//             <div className='flex items-center justify-between'>
//               <div className='text-sm text-gray-600 dark:text-gray-300'>
//                 Showing {(currentPage - 1) * (itemsPerPage as number) + 1}-{Math.min(currentPage * (itemsPerPage as number), filteredAndSortedRecords.length)} of {filteredAndSortedRecords.length}
//               </div>
//               <div className='flex items-center gap-2'>
//                 <button
//                   onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
//                   disabled={currentPage === 1}
//                   className='px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors duration-200'
//                 >
//                   ← Previous
//                 </button>
//                 <div className='flex items-center gap-1'>
//                   {[...Array(Math.min(5, totalPages))].map((_, i) => {
//                     const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
//                     if (page > totalPages) return null;
//                     return (
//                       <button
//                         key={page}
//                         onClick={() => setCurrentPage(page)}
//                         className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors duration-200 ${
//                           currentPage === page
//                             ? 'bg-emerald-500 text-white'
//                             : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
//                         }`}
//                       >
//                         {page}
//                       </button>
//                     );
//                   })}
//                 </div>
//                 <button
//                   onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
//                   disabled={currentPage === totalPages}
//                   className='px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors duration-200'
//                 >
//                   Next →
//                 </button>
//               </div>
//             </div>
//           )}
//         </>
//       )}
//     </div>
//   );
// };

// export default RecordHistory;