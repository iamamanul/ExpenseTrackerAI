// Fixed AIInsights component with working AI answers

'use client';

import { useState, useEffect, useCallback } from 'react'; // Fix 6: Imported useCallback
import { getAIInsights } from '@/app/actions/getAIInsights';

interface InsightData {
  id: string;
  type: 'warning' | 'info' | 'success' | 'tip';
  title: string;
  message: string;
  action?: string;
  confidence?: number;
}

interface AIAnswer {
  insightId: string;
  answer: string;
  isLoading: boolean;
}

type APIProvider = 'groq' | 'gemini';

// Model information for display
// Fix 1: Removed unused MODEL_INFO constant
// const MODEL_INFO = {
//   'groq': 'Groq Llama',
//   'gemini': 'Google Gemini'
// };

// Helper function to convert dollar symbols to rupee symbols
const convertCurrencyInText = (text: string): string => {
  return text.replace(/\$/g, '₹');
};

// CHECK: API key availability
const checkAPIKeys = () => {
  const groqKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
  const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  console.log('🔍 API Key Check:');
  console.log('Groq Key Available:', !!groqKey, groqKey ? `Length: ${groqKey.length}` : 'Missing');
  console.log('Gemini Key Available:', !!geminiKey, geminiKey ? `Length: ${geminiKey.length}` : 'Missing');

  return { groqKey: !!groqKey, geminiKey: !!geminiKey };
};

// FIXED: Direct API call functions with better error handling
const callGroqAPI = async (question: string): Promise<string> => {
  const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('Groq API key not found. Set NEXT_PUBLIC_GROQ_API_KEY in your environment.');
  }

  console.log('🚀 Calling Groq API directly...');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama3-8b-8192',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful financial advisor specializing in Indian personal finance. Use Indian Rupees (₹) for all amounts. Be practical, concise, and actionable in your advice.'
        },
        {
          role: 'user',
          content: `Financial question: ${question}\n\nPlease provide specific, actionable financial advice in under 120 words. Focus on practical steps the person can take immediately.`
        }
      ],
      temperature: 0.7,
      max_tokens: 150,
    }),
  });

  console.log('📡 Groq Response Status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Groq Error Response:', errorText);

    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a few minutes.');
    } else if (response.status === 401) {
      throw new Error('Invalid API key. Please check your GROQ_API_KEY.');
    } else if (response.status >= 500) {
      throw new Error('Groq service temporarily unavailable. Please try again.');
    }

    throw new Error(`Groq API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('📦 Groq Response:', data);

  const answer = data.choices?.[0]?.message?.content;
  if (!answer) {
    throw new Error('No answer content received from Groq');
  }

  console.log('✅ Groq Success');
  return answer.trim();
};

const callGeminiAPI = async (question: string): Promise<string> => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key not found. Set NEXT_PUBLIC_GEMINI_API_KEY in your environment.');
  }

  console.log('🚀 Calling Gemini API directly...');

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `You are a financial advisor for Indian users. Answer this question with practical advice using Indian Rupees (₹):

Question: ${question}

Requirements:
- Use Indian Rupees (₹) for currency
- Provide 2-3 specific, actionable steps
- Keep response under 120 words  
- Focus on practical implementation
- Be encouraging but realistic`
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 150,
      },
    }),
  });

  console.log('📡 Gemini Response Status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Gemini Error Response:', errorText);

    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a few minutes.');
    } else if (response.status === 400) {
      throw new Error('Invalid request. Please check your question.');
    } else if (response.status >= 500) {
      throw new Error('Gemini service temporarily unavailable. Please try again.');
    }

    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('📦 Gemini Response:', data);

  const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!answer) {
    throw new Error('No answer content received from Gemini');
  }

  console.log('✅ Gemini Success');
  return answer.trim();
};

// FIXED: Generate AI answer with proper fallback logic
const generateAIAnswer = async (question: string, preferredAPI: APIProvider): Promise<{ answer: string, usedAPI: APIProvider }> => {
  const timeoutMs = 15000; // 15 second timeout

  const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout - API took too long to respond')), ms)
      )
    ]);
  };

  // Try preferred API first
  let primaryError: Error;
  try {
    console.log(`🚀 Trying preferred API: ${preferredAPI}`);

    let answer: string;
    if (preferredAPI === 'groq') {
      answer = await withTimeout(callGroqAPI(question), timeoutMs);
    } else {
      answer = await withTimeout(callGeminiAPI(question), timeoutMs);
    }

    return { answer, usedAPI: preferredAPI };

  } catch (error: unknown) { // Fix 2: Replaced 'any' with 'unknown'
    const errorMessage = error instanceof Error ? error.message : String(error);
    primaryError = new Error(errorMessage);
    console.log(`❌ ${preferredAPI} failed:`, errorMessage);

    // Try fallback API
    const fallbackAPI: APIProvider = preferredAPI === 'groq' ? 'gemini' : 'groq';

    try {
      console.log(`🔄 Falling back to: ${fallbackAPI}`);

      let answer: string;
      if (fallbackAPI === 'groq') {
        answer = await withTimeout(callGroqAPI(question), timeoutMs);
      } else {
        answer = await withTimeout(callGeminiAPI(question), timeoutMs);
      }

      return { answer, usedAPI: fallbackAPI };

    } catch (fallbackError: unknown) { // Fix 3: Replaced 'any' with 'unknown'
      const fallbackErrorMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      console.log(`❌ ${fallbackAPI} also failed:`, fallbackErrorMessage);

      // Both APIs failed - provide helpful error message
      const { groqKey, geminiKey } = checkAPIKeys();

      if (!groqKey && !geminiKey) {
        throw new Error('No API keys configured. Please add NEXT_PUBLIC_GROQ_API_KEY or NEXT_PUBLIC_GEMINI_API_KEY to your environment variables.');
      } else if (!groqKey) {
        throw new Error(`Gemini API failed: ${fallbackErrorMessage}. Consider adding NEXT_PUBLIC_GROQ_API_KEY as a backup.`);
      } else if (!geminiKey) {
        throw new Error(`Groq API failed: ${primaryError.message}. Consider adding NEXT_PUBLIC_GEMINI_API_KEY as a backup.`);
      } else {
        throw new Error(`Both APIs failed. Groq: ${primaryError.message} | Gemini: ${fallbackErrorMessage}`);
      }
    }
  }
};

const AIInsights = () => {
  const [insights, setInsights] = useState<InsightData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [aiAnswers, setAiAnswers] = useState<AIAnswer[]>([]);
  const [preferredAPI, setPreferredAPI] = useState<APIProvider>('groq');
  const [lastUsedAPI, setLastUsedAPI] = useState<APIProvider | null>(null);
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const [modelStatus, setModelStatus] = useState<{
    'groq': 'unknown' | 'working' | 'failed',
    'gemini': 'unknown' | 'working' | 'failed'
  }>({
    'groq': 'unknown',
    'gemini': 'unknown'
  });

  // Check environment on mount
  useEffect(() => {
    console.log('🔍 Environment Debug:');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    checkAPIKeys();
  }, []);

  // Fix 6: Wrapped loadInsights in useCallback
  const loadInsights = useCallback(async () => {
    setIsLoading(true);
    setCurrentModel(null);
    try {
      console.log('🔄 Loading AI insights...');
      const newInsights = await getAIInsights();
      setInsights(newInsights);
      setLastUpdated(new Date());
      setLastUsedAPI(preferredAPI);
      setCurrentModel('');

      // Update model status - server succeeded
      setModelStatus(prev => ({
        ...prev,
        [preferredAPI]: 'working'
      }));

    } catch (error: unknown) { // Fix 4: Replaced 'any' with 'unknown'
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to load AI insights:', error);

      // Update model status to show failure
      setModelStatus({
        'groq': 'failed',
        'gemini': 'failed'
      });

      // Fallback to mock data
      setInsights([
        {
          id: 'fallback-1',
          type: 'info',
          title: 'AI Insights Unavailable',
          message: `Unable to generate AI insights: ${errorMessage}. Please check your API configuration.`,
          action: 'Retry or check settings',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [preferredAPI]); // Dependency for useCallback

  // FIXED: Handle action click with working AI calls
  const handleActionClick = async (insight: InsightData) => {
    if (!insight.action) return;

    console.log('🎯 Action clicked for insight:', insight.id, insight.title);

    // Check if answer exists (toggle functionality)
    const existingAnswer = aiAnswers.find((a) => a.insightId === insight.id);
    if (existingAnswer) {
      console.log('🗑️ Removing existing answer');
      setAiAnswers((prev) => prev.filter((a) => a.insightId !== insight.id));
      return;
    }

    // Add loading state
    console.log('⏳ Adding loading state');
    setAiAnswers((prev) => [
      ...prev,
      {
        insightId: insight.id,
        answer: '',
        isLoading: true,
      },
    ]);

    try {
      // Generate comprehensive question
      const question = `Financial Insight: ${insight.title}
      
Context: ${insight.message}
Action needed: ${insight.action}

Please provide specific, practical steps to address this financial situation. Include:
1. Immediate actions to take
2. Budget recommendations  
3. Long-term planning advice

Keep the advice actionable and specific to Indian financial practices.`;

      console.log('❓ Generated question for AI');

      // Call AI API directly
      const { answer, usedAPI } = await generateAIAnswer(question, preferredAPI);

      console.log('💾 Saving successful answer to state...');

      // Update answer in state
      setAiAnswers((prev) =>
        prev.map((a) =>
          a.insightId === insight.id ? {
            ...a,
            answer: convertCurrencyInText(answer),
            isLoading: false
          } : a
        )
      );

      // Update model status
      setModelStatus(prev => ({
        ...prev,
        [usedAPI]: 'working'
      }));

      setLastUsedAPI(usedAPI);

      console.log('✅ Answer generation completed successfully');

    } catch (error: unknown) { // Fix 5: Replaced 'any' with 'unknown'
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('💥 Answer generation failed:', error);

      // Provide helpful error message based on error type
      let displayErrorMessage = 'Unable to generate AI answer.';
      let debugInfo = '';

      if (errorMessage?.includes('API key')) {
        displayErrorMessage = '🔑 API Configuration Issue';
        debugInfo = 'Please set up your API keys in environment variables (NEXT_PUBLIC_GROQ_API_KEY or NEXT_PUBLIC_GEMINI_API_KEY).';
      } else if (errorMessage?.includes('Rate limit') || errorMessage?.includes('429')) {
        displayErrorMessage = '⏱️ Rate Limit Reached';
        debugInfo = 'API rate limit exceeded. Please wait a few minutes before trying again.';
      } else if (errorMessage?.includes('timeout')) {
        displayErrorMessage = '🌐 Request Timeout';
        debugInfo = 'The API request took too long. Please check your internet connection and try again.';
      } else if (errorMessage?.includes('500') || errorMessage?.includes('503')) {
        displayErrorMessage = '🔧 Service Temporarily Unavailable';
        debugInfo = 'The AI service is experiencing temporary issues. Please try again in a few minutes.';
      } else {
        displayErrorMessage = '❌ Unexpected Error';
        debugInfo = errorMessage || 'An unknown error occurred while generating the answer.';
      }

      // For the specific insight, provide manual advice
      let manualAdvice = 'Consider consulting with a financial advisor for personalized guidance.';

      if (insight.title.toLowerCase().includes('food') || insight.title.toLowerCase().includes('dining')) {
        manualAdvice = 'Try meal planning, cooking at home more often, and setting a monthly dining budget. Track your food expenses for a week to identify spending patterns.';
      } else if (insight.title.toLowerCase().includes('transportation')) {
        manualAdvice = 'Create a separate transportation budget including fuel, maintenance, and insurance. Consider carpooling or public transport for routine trips to reduce costs.';
      } else if (insight.title.toLowerCase().includes('health')) {
        manualAdvice = 'Build an emergency health fund, compare insurance options, and consider preventive care to avoid larger medical expenses later.';
      }

      setAiAnswers((prev) =>
        prev.map((a) =>
          a.insightId === insight.id
            ? {
              ...a,
              answer: `${displayErrorMessage}\n\n${debugInfo}\n\nGeneral Advice for "${insight.title}": ${manualAdvice}`,
              isLoading: false,
            }
            : a
        )
      );

      // Update model status to show failure
      setModelStatus(prev => ({
        ...prev,
        [preferredAPI]: 'failed'
      }));
    }
  };

  const toggleAPI = () => {
    const newAPI = preferredAPI === 'groq' ? 'gemini' : 'groq';
    setPreferredAPI(newAPI);
    console.log(`🔄 Switched to ${newAPI} API`);
  };

  useEffect(() => {
    loadInsights();
  }, [loadInsights]); // Fix 6: Added loadInsights to dependency array

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning': return '⚠️';
      case 'success': return '✅';
      case 'tip': return '💡';
      case 'info': return 'ℹ️';
      default: return '🤖';
    }
  };

  const getInsightColors = (type: string) => {
    switch (type) {
      case 'warning': return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'success': return 'border-l-green-500 bg-green-50 dark:bg-green-900/20';
      case 'tip': return 'border-l-emerald-500 bg-emerald-50 dark:bg-emerald-900/20';
      case 'info': return 'border-l-emerald-500 bg-emerald-50 dark:bg-emerald-900/20';
      default: return 'border-l-gray-500 bg-gray-50 dark:bg-gray-800/50';
    }
  };

  const getButtonColors = (type: string) => {
    switch (type) {
      case 'warning': return 'text-yellow-700 dark:text-yellow-300 hover:text-yellow-800 dark:hover:text-yellow-200';
      case 'success': return 'text-green-700 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200';
      case 'tip': return 'text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200';
      case 'info': return 'text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200';
      default: return 'text-gray-700 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200';
    }
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Loading...';

    const now = new Date();
    const diffMs = now.getTime() - lastUpdated.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return lastUpdated.toLocaleDateString('en-US');
  };

  const getModelStatusIcon = (model: keyof typeof modelStatus) => {
    const status = modelStatus[model];
    switch (status) {
      case 'working': return '✅';
      case 'failed': return '❌';
      default: return '❓';
    }
  };

  if (isLoading) {
    return (
      <div className='bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-xl border border-gray-100/50 dark:border-gray-700/50'>
        <div className='flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6'>
          <div className='w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg'>
            <span className='text-white text-sm sm:text-lg'>🤖</span>
          </div>
          <div className='flex-1'>
            <h3 className='text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100'>
              AI Insights
            </h3>
            <p className='text-xs text-gray-500 dark:text-gray-400 mt-0.5'>
              Loading financial insights...
            </p>
          </div>
          <div className='flex items-center gap-1 sm:gap-2'>
            <div className='w-5 h-5 sm:w-6 sm:h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin'></div>
            <span className='text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-medium hidden sm:block'>
              Analyzing...
            </span>
          </div>
        </div>

        <div className='space-y-3 sm:space-y-4'>
          {[1, 2, 3].map((i) => (
            <div key={i} className='animate-pulse bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 p-3 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-600'>
              <div className='flex items-start gap-3 sm:gap-4'>
                <div className='w-6 h-6 sm:w-8 sm:h-8 bg-gray-200 dark:bg-gray-600 rounded-lg'></div>
                <div className='flex-1 space-y-2'>
                  <div className='h-3 bg-gray-200 dark:bg-gray-600 rounded-lg w-3/4'></div>
                  <div className='h-3 bg-gray-200 dark:bg-gray-600 rounded-lg w-full'></div>
                  <div className='h-3 bg-gray-200 dark:bg-gray-600 rounded-lg w-2/3'></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className='bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-xl border border-gray-100/50 dark:border-gray-700/50 hover:shadow-2xl'>
      <div className='flex items-center justify-between mb-4 sm:mb-6'>
        <div className='flex items-center gap-2 sm:gap-3'>
          <div className='w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg'>
            <span className='text-white text-sm sm:text-lg'>🤖</span>
          </div>
          <div>
            <h3 className='text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100'>
              AI Insights
            </h3>
            <div className='flex items-center gap-2'>
              <p className='text-xs text-gray-500 dark:text-gray-400 mt-0.5'>
                Powered by AI
              </p>
              {currentModel && (
                <span className='text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full'>
                  {currentModel}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          {/* API Toggle Button */}
          <button
            onClick={toggleAPI}
            title={`Switch to ${preferredAPI === 'groq' ? 'Gemini' : 'Groq Llama'} API`}
            className={`px-2 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
              preferredAPI === 'groq' 
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50' 
                : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50'
            }`}
          >
            {preferredAPI === 'groq' ? '🚀 Groq' : '🌟 Gemini'}
          </button>
          
          <div className='inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-full text-xs font-medium'>
            <span className='w-1.5 h-1.5 bg-emerald-500 dark:bg-emerald-400 rounded-full'></span>
            <span className='hidden sm:inline'>{formatLastUpdated()}</span>
            <span className='sm:hidden'>
              {formatLastUpdated().includes('ago')
                ? formatLastUpdated().replace(' ago', '')
                : formatLastUpdated()}
            </span>
          </div>
          <button
            onClick={loadInsights}
            className='w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500 hover:from-emerald-700 hover:via-green-600 hover:to-teal-600 text-white rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200'
            disabled={isLoading}
          >
            <span className='text-sm'>🔄</span>
          </button>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4'>
        {insights.map((insight) => {
          const currentAnswer = aiAnswers.find((a) => a.insightId === insight.id);

          return (
            <div key={insight.id} className={`relative overflow-hidden rounded-xl p-3 sm:p-4 border-l-4 hover:shadow-lg transition-all duration-200 ${getInsightColors(insight.type)}`}>
              <div className='flex items-start justify-between'>
                <div className='flex-1'>
                  <div className='flex items-center gap-2 sm:gap-3 mb-2'>
                    <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center ${
                      insight.type === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/50' :
                      insight.type === 'success' ? 'bg-green-100 dark:bg-green-900/50' :
                      insight.type === 'tip' ? 'bg-emerald-100 dark:bg-emerald-900/50' :
                      'bg-emerald-100 dark:bg-emerald-900/50'
                    }`}>
                      <span className='text-sm sm:text-lg'>{getInsightIcon(insight.type)}</span>
                    </div>
                    <div className='flex-1'>
                      <h4 className='font-bold text-gray-900 dark:text-gray-100 text-sm mb-0.5'>
                        {insight.title}
                      </h4>
                      {insight.confidence && (
                        <div className='flex items-center gap-2'>
                          {insight.confidence < 0.8 && (
                            <span className='inline-block px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 rounded-full text-xs font-medium'>
                              Preliminary
                            </span>
                          )}
                          <span className='text-xs text-gray-500 dark:text-gray-400'>
                            {Math.round(insight.confidence * 100)}% confidence
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className='text-gray-700 dark:text-gray-300 text-xs leading-relaxed mb-3'>
                    {insight.message}
                  </p>
                  {insight.action && (
                    <div className='text-left'>
                      <span
                        onClick={() => handleActionClick(insight)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-xs cursor-pointer transition-all duration-200 ${getButtonColors(insight.type)} hover:bg-white/50 dark:hover:bg-gray-700/50 ${
                          currentAnswer ? 'bg-white/50 dark:bg-gray-700/50' : ''
                        }`}
                      >
                        <span>{insight.action}</span>
                        {currentAnswer?.isLoading ? (
                          <div className='w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin'></div>
                        ) : (
                          <span className='text-xs'>{currentAnswer ? '🤖' : '🔍'}</span>
                        )}
                      </span>
                    </div>
                  )}

                  {/* AI Answer Display */}
                  {currentAnswer && (
                    <div className='mt-3 p-3 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-600'>
                      <div className='flex items-start gap-2'>
                        <div className='w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 rounded-lg flex items-center justify-center flex-shrink-0'>
                          <span className='text-white text-xs'>🤖</span>
                        </div>
                        <div className='flex-1'>
                          <h5 className='font-semibold text-gray-900 dark:text-gray-100 text-xs mb-1'>
                            AI Financial Advice:
                          </h5>
                          {currentAnswer.isLoading ? (
                            <div className='space-y-1'>
                              <div className='animate-pulse bg-gray-200 dark:bg-gray-600 h-2 rounded-lg w-full'></div>
                              <div className='animate-pulse bg-gray-200 dark:bg-gray-600 h-2 rounded-lg w-3/4'></div>
                              <div className='animate-pulse bg-gray-200 dark:bg-gray-600 h-2 rounded-lg w-1/2'></div>
                              <div className='text-xs text-gray-500 dark:text-gray-400 mt-2'>
                                🤖 Generating personalized advice...
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className='text-gray-700 dark:text-gray-300 text-xs leading-relaxed whitespace-pre-line'>
                                {currentAnswer.answer}
                              </p>
                              <div className='text-xs text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-gray-200 dark:border-gray-600'>
                                💡 Powered by {lastUsedAPI === 'groq' ? 'Groq Llama' : 'Google Gemini'}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className='mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-100 dark:border-gray-700'>
        <div className='flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0'>
          <div className='flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400'>
            
           
            
            {/* Model Status Indicators */}
            <div className='flex items-center gap-2 ml-2'>
              <div className='flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg'>
                <span className='text-xs'>Groq:</span>
                <span className='text-xs'>{getModelStatusIcon('groq')}</span>
              </div>
              <div className='flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg'>
                <span className='text-xs'>Gemini:</span>
                <span className='text-xs'>{getModelStatusIcon('gemini')}</span>
              </div>
            </div>
          </div>
          
          <div className='flex items-center gap-2'>
            {/* Current API Indicator */}
            <div className='hidden md:block text-xs text-gray-500 dark:text-gray-400'>
              Using: <span className='font-medium text-gray-700 dark:text-gray-300'>
                {preferredAPI === 'groq' ? 'Groq Llama' : 'Google Gemini'}
              </span>
            </div>
            
            <button
              onClick={loadInsights}
              className='px-3 py-1.5 bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500 hover:from-emerald-700 hover:via-green-600 hover:to-teal-600 text-white rounded-lg font-medium text-xs shadow-lg hover:shadow-xl transition-all duration-200'
            >
              <span className='sm:hidden'>Refresh</span>
              <span className='hidden sm:inline'>Refresh Insights →</span>
            </button>
          </div>
        </div>
        
        {/* Additional Help */}
        <div className='mt-2 text-center'>
          <div className='text-xs text-gray-500 dark:text-gray-400'>
            💡 Click on any action button to get personalized AI advice
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIInsights;