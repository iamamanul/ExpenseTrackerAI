import AddNewRecord from '@/components/AddNewRecord';
import AIInsights from '@/components/AIInsights';
import Guest from '@/components/Guest';
import RecordChart from '@/components/RecordChart';
import { currentUser } from '@clerk/nextjs/server';
import RecordHistoryWrapper from '@/components/RecordHistoryWrapper';
import Image from 'next/image';

export default async function HomePage() {
  const user = await currentUser();
  if (!user) {
    return <Guest />;
  }
  return (
    <main className='bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans min-h-screen transition-colors duration-300'>
      {/* Main container */}
      <div className='max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8'>
        {/* Responsive grid */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-stretch'>
          
          {/* Left Column - Welcome Card */}
          <div className='h-full'>
            <div className='h-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 sm:p-6 lg:p-8 
                            rounded-2xl shadow-xl border border-gray-100/50 dark:border-gray-700/50 
                            hover:shadow-2xl flex flex-col gap-6'>
              
              {/* Top - User Info */}
              <div className='flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6'>
                <div className='relative flex-shrink-0'>
                  <Image
                    src={user.imageUrl}
                    alt={`${user.firstName}'s profile`}
                    className='w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-white dark:border-gray-600 shadow-lg'
                    width={80}
                    height={80}
                    priority
                  />
                  <div className='absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-green-400 to-green-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center'>
                    <span className='text-white text-xs'>✓</span>
                  </div>
                </div>

                <div className='flex-1 text-center sm:text-left'>
                  <div className='flex flex-col sm:flex-row items-center sm:items-start justify-center sm:justify-start gap-2 sm:gap-3 mb-3'>
                    <div className='w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg'>
                      <span className='text-white text-sm sm:text-lg'>👋</span>
                    </div>
                    <h2 className='text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100'>
                      Welcome Back, {user.firstName}!
                    </h2>
                  </div>
                  <p className='text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 sm:mb-6 max-w-md mx-auto sm:mx-0'>
                    Here&apos;s a quick overview of your recent expense activity.
                    Track your spending, analyze patterns, and manage your budget efficiently!
                  </p>

                  {/* Badges */}
                  <div className='flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center sm:justify-start'>
                    <div className='bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 border border-emerald-100 dark:border-emerald-800 px-3 py-2 rounded-xl flex items-center gap-2 justify-center sm:justify-start'>
                      <div className='w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg flex items-center justify-center flex-shrink-0'>
                        <span className='text-white text-xs'>📅</span>
                      </div>
                      <div className='text-center sm:text-left'>
                        <span className='text-xs font-medium text-gray-500 dark:text-gray-400 block'>
                          Joined
                        </span>
                        <span className='text-sm font-semibold text-gray-800 dark:text-gray-200'>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className='bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border border-green-100 dark:border-green-800 px-3 py-2 rounded-xl flex items-center gap-2 justify-center sm:justify-start'>
                      <div className='w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0'>
                        <span className='text-white text-xs'>⚡</span>
                      </div>
                      <div className='text-center sm:text-left'>
                        <span className='text-xs font-medium text-gray-500 dark:text-gray-400 block'>
                          Last Active
                        </span>
                        <span className='text-sm font-semibold text-gray-800 dark:text-gray-200'>
                          {user.lastActiveAt
                            ? new Date(user.lastActiveAt).toLocaleDateString()
                            : 'Today'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* NEW Section - Chart Icons Row */}
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="flex flex-col items-center bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 p-3 rounded-xl shadow">
                  <span className="text-2xl">📊</span>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Stats</span>
                </div>
                <div className="flex flex-col items-center bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 p-3 rounded-xl shadow">
                  <span className="text-2xl">📈</span>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Trends</span>
                </div>
                <div className="flex flex-col items-center bg-gradient-to-r from-pink-50 to-red-50 dark:from-pink-900/30 dark:to-red-900/30 p-3 rounded-xl shadow">
                  <span className="text-2xl">🥧</span>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Breakdown</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Add New Expense */}
          <div className='h-full'>
            <AddNewRecord className="h-full" />
          </div>
        </div>

        {/* Full-width sections */}
        <div className='mt-6 sm:mt-8 space-y-4 sm:space-y-6'>
          <RecordChart />
          <AIInsights />
        </div>
        <div className='mt-6 sm:mt-8 space-y-4 sm:space-y-6'>
          <RecordHistoryWrapper />
        </div>
      </div>
    </main>
  );
}