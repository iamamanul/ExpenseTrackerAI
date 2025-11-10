'use client';

import { useState, useEffect, useCallback } from 'react';

interface Insight {
  id: string;
  type: 'success' | 'warning' | 'info' | 'tip';
  title: string;
  message: string;
  action?: string;
  confidence: number;
  category?: string;
  amount?: number;
}

const AIInsightsNew = () => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);
  const [aiAnswer, setAiAnswer] = useState<Record<string, { answer: string; isLoading: boolean }>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [budget, setBudget] = useState<{
    monthly: number;
    current: number;
    remaining: number;
    percentage: string;
  } | null>(null);

  // Load insights
  const loadInsights = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/insights');
      if (!response.ok) {
        throw new Error('Failed to load insights');
      }
      const data = await response.json();
      setInsights(data.insights || []);
      setBudget(data.budget || null);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading insights:', error);
      setInsights([
        {
          id: 'error',
          type: 'warning',
          title: 'Unable to Load Insights',
          message: 'There was an error loading your AI insights. Please try again later.',
          action: 'Retry',
          confidence: 0.5,
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get AI answer for an insight
  const getAIAnswer = useCallback(async (insight: Insight) => {
    if (aiAnswer[insight.id]?.answer) {
      // Toggle answer
      setExpandedInsight(expandedInsight === insight.id ? null : insight.id);
      return;
    }

    if (!insight.action) return;

    // Set loading state
    setAiAnswer(prev => ({
      ...prev,
      [insight.id]: { answer: '', isLoading: true }
    }));
    setExpandedInsight(insight.id);

    try {
      // Build comprehensive question with budget context
      let question = `Financial Insight: ${insight.title}\n\nContext: ${insight.message}\n\nAction needed: ${insight.action}`;
      
      // Add budget context if available
      if (budget) {
        question += `\n\nBudget Context:
- Monthly Budget: ₹${budget.monthly.toFixed(2)}
- Current Spending: ₹${budget.current.toFixed(2)}
- Remaining Budget: ₹${budget.remaining.toFixed(2)}
- Budget Usage: ${budget.percentage}%`;
      }
      
      question += `\n\nPlease provide specific, practical steps to address this financial situation. Include:
1. Immediate actions I can take
2. Budget recommendations based on my current spending
3. Long-term planning advice
4. Cost-saving opportunities

Keep the advice actionable, specific to Indian financial practices, and consider my budget constraints. Use plain text format (no JSON, no code blocks).`;

      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI answer');
      }

      const data = await response.json();
      setAiAnswer(prev => ({
        ...prev,
        [insight.id]: { answer: data.answer || 'Unable to generate answer.', isLoading: false }
      }));
    } catch (error) {
      console.error('Error getting AI answer:', error);
      setAiAnswer(prev => ({
        ...prev,
        [insight.id]: { 
          answer: 'I apologize, but I\'m unable to provide a detailed answer at the moment. Please try again later or consult with a financial advisor for personalized guidance.', 
          isLoading: false 
        }
      }));
    }
  }, [aiAnswer, expandedInsight]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  // Get insight icon
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'tip': return '💡';
      case 'info': return 'ℹ️';
      default: return '🤖';
    }
  };

  // Get insight colors
  const getInsightColors = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-l-green-500 bg-green-50/50 dark:bg-green-900/20';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/20';
      case 'tip':
        return 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/20';
      case 'info':
        return 'border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20';
      default:
        return 'border-l-gray-500 bg-gray-50/50 dark:bg-gray-800/50';
    }
  };

  // Get button colors
  const getButtonColors = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30';
      case 'warning':
        return 'text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/30';
      case 'tip':
        return 'text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30';
      case 'info':
        return 'text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30';
      default:
        return 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50';
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  // Format last updated
  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Just now';
    const diffMs = Date.now() - lastUpdated.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return lastUpdated.toLocaleDateString();
  };

  // Format AI answer - clean up and format nicely
  const formatAnswer = (answer: string): string => {
    if (!answer) return '';
    
    let formatted = answer.trim();
    
    // Remove JSON objects if present
    if (formatted.startsWith('{')) {
      try {
        const parsed = JSON.parse(formatted);
        if (parsed.answer) formatted = parsed.answer;
        else if (parsed.text) formatted = parsed.text;
        else if (parsed.response) formatted = parsed.response;
        else if (typeof parsed === 'string') formatted = parsed;
      } catch {
        // Not valid JSON, try to extract text
        const match = formatted.match(/"answer":\s*"([^"]+)"/);
        if (match) formatted = match[1].replace(/\\n/g, '\n');
      }
    }
    
    // Remove markdown code blocks
    formatted = formatted.replace(/```json\n?/g, '');
    formatted = formatted.replace(/```\n?/g, '');
    formatted = formatted.replace(/```[a-z]*\n?/g, '');
    
    // Remove inline code markers
    formatted = formatted.replace(/`([^`]+)`/g, '$1');
    
    // Remove JSON array markers
    if (formatted.startsWith('[') && formatted.endsWith(']')) {
      try {
        const parsed = JSON.parse(formatted);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (typeof parsed[0] === 'string') {
            formatted = parsed.join('\n');
          } else if (parsed[0].answer) {
            formatted = parsed[0].answer;
          }
        }
      } catch {
        // Not valid JSON array
      }
    }
    
    // Remove quote wrappers
    formatted = formatted.replace(/^["']|["']$/g, '');
    formatted = formatted.replace(/\\"/g, '"');
    formatted = formatted.replace(/\\n/g, '\n');
    
    // Remove common prefixes
    formatted = formatted.replace(/^(Answer|Response|Advice|Recommendation):\s*/i, '');
    
    // Format lists - convert numbered and bulleted lists to consistent format
    formatted = formatted.replace(/^\d+[\.\)]\s+/gm, '• ');
    formatted = formatted.replace(/^[-*]\s+/gm, '• ');
    
    // Ensure proper line breaks
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    
    // Clean up extra spaces
    formatted = formatted.replace(/[ \t]+/g, ' ');
    
    return formatted.trim();
  };

  if (isLoading) {
    return (
      <div className='bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-xl border border-gray-100/50 dark:border-gray-700/50'>
        <div className='flex items-center gap-3 mb-6'>
          <div className='w-10 h-10 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg'>
            <span className='text-white text-lg'>🤖</span>
          </div>
          <div className='flex-1'>
            <h3 className='text-xl font-bold text-gray-900 dark:text-gray-100'>
              AI Insights
            </h3>
            <p className='text-xs text-gray-500 dark:text-gray-400'>
              Analyzing your expenses...
            </p>
          </div>
          <div className='w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin'></div>
        </div>
        <div className='space-y-4'>
          {[1, 2, 3].map((i) => (
            <div key={i} className='animate-pulse bg-gray-100 dark:bg-gray-700 p-4 rounded-xl'>
              <div className='h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-2'></div>
              <div className='h-3 bg-gray-200 dark:bg-gray-600 rounded w-full'></div>
              <div className='h-3 bg-gray-200 dark:bg-gray-600 rounded w-2/3 mt-2'></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className='bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-xl border border-gray-100/50 dark:border-gray-700/50 hover:shadow-2xl transition-shadow'>
      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <div className='flex items-center gap-3'>
          <div className='w-10 h-10 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg'>
            <span className='text-white text-lg'>🤖</span>
          </div>
          <div>
            <h3 className='text-xl font-bold text-gray-900 dark:text-gray-100'>
              AI Insights
            </h3>
            <div className='flex items-center gap-2 mt-1'>
              <p className='text-xs text-gray-500 dark:text-gray-400'>
                Powered by AI
              </p>
              {lastUpdated && (
                <span className='text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full'>
                  {formatLastUpdated()}
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={loadInsights}
          disabled={isLoading}
          className='w-8 h-8 bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500 hover:from-emerald-700 hover:via-green-600 hover:to-teal-600 text-white rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50'
          title='Refresh insights'
        >
          <span className='text-sm'>🔄</span>
        </button>
      </div>

      {/* Budget Overview Card */}
      {budget && (
        <div className='mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-800'>
          <div className='flex items-center justify-between mb-3'>
            <div className='flex items-center gap-2'>
              <span className='text-xl'>💰</span>
              <h4 className='font-bold text-gray-900 dark:text-gray-100'>Monthly Budget Status</h4>
            </div>
            <span className={`text-sm font-bold px-3 py-1 rounded-full ${
              parseFloat(budget.percentage) > 100
                ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                : parseFloat(budget.percentage) > 80
                ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300'
                : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
            }`}>
              {budget.percentage}%
            </span>
          </div>
          <div className='grid grid-cols-3 gap-4 text-center'>
            <div>
              <p className='text-xs text-gray-600 dark:text-gray-400 mb-1'>Budget</p>
              <p className='font-bold text-gray-900 dark:text-gray-100'>{formatCurrency(budget.monthly)}</p>
            </div>
            <div>
              <p className='text-xs text-gray-600 dark:text-gray-400 mb-1'>Spent</p>
              <p className='font-bold text-gray-900 dark:text-gray-100'>{formatCurrency(budget.current)}</p>
            </div>
            <div>
              <p className='text-xs text-gray-600 dark:text-gray-400 mb-1'>Remaining</p>
              <p className={`font-bold ${
                budget.remaining < 0
                  ? 'text-red-600 dark:text-red-400'
                  : budget.remaining < budget.monthly * 0.2
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-green-600 dark:text-green-400'
              }`}>
                {formatCurrency(budget.remaining)}
              </p>
            </div>
          </div>
          {/* Progress Bar */}
          <div className='mt-3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden'>
            <div
              className={`h-full transition-all duration-300 ${
                parseFloat(budget.percentage) > 100
                  ? 'bg-red-500'
                  : parseFloat(budget.percentage) > 80
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(parseFloat(budget.percentage), 100)}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Insights Grid */}
      {insights.length === 0 ? (
        <div className='text-center py-8'>
          <p className='text-gray-500 dark:text-gray-400'>No insights available</p>
        </div>
      ) : (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
          {insights.map((insight) => {
            const isExpanded = expandedInsight === insight.id;
            const answerData = aiAnswer[insight.id];

            return (
              <div
                key={insight.id}
                className={`relative overflow-hidden rounded-xl p-4 border-l-4 transition-all duration-200 hover:shadow-lg ${getInsightColors(insight.type)}`}
              >
                {/* Insight Header */}
                <div className='flex items-start gap-3 mb-3'>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    insight.type === 'success' ? 'bg-green-100 dark:bg-green-900/50' :
                    insight.type === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/50' :
                    insight.type === 'tip' ? 'bg-blue-100 dark:bg-blue-900/50' :
                    'bg-emerald-100 dark:bg-emerald-900/50'
                  }`}>
                    <span className='text-lg'>{getInsightIcon(insight.type)}</span>
                  </div>
                  <div className='flex-1 min-w-0'>
                    <h4 className='font-bold text-gray-900 dark:text-gray-100 text-sm mb-1'>
                      {insight.title}
                    </h4>
                    {insight.category && (
                      <span className='inline-block px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium mb-2'>
                        {insight.category}
                      </span>
                    )}
                    {insight.amount && (
                      <span className='inline-block px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-medium ml-2'>
                        {formatCurrency(insight.amount)}
                      </span>
                    )}
                  </div>
                  {insight.confidence < 0.8 && (
                    <span className='text-xs text-gray-500 dark:text-gray-400'>
                      {Math.round(insight.confidence * 100)}%
                    </span>
                  )}
                </div>

                {/* Insight Message */}
                <p className='text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-3'>
                  {insight.message}
                </p>

                {/* Action Button */}
                {insight.action && (
                  <button
                    onClick={() => getAIAnswer(insight)}
                    disabled={answerData?.isLoading}
                    className={`w-full px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${getButtonColors(insight.type)} ${
                      isExpanded ? 'bg-white/50 dark:bg-gray-700/50' : ''
                    }`}
                  >
                    <div className='flex items-center justify-center gap-2'>
                      <span>{insight.action}</span>
                      {answerData?.isLoading ? (
                        <div className='w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin'></div>
                      ) : (
                        <span>{isExpanded ? '🔼' : '🔽'}</span>
                      )}
                    </div>
                  </button>
                )}

                {/* AI Answer */}
                {isExpanded && answerData && !answerData.isLoading && answerData.answer && (
                  <div className='mt-4 p-4 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-600'>
                    <div className='flex items-start gap-3'>
                      <div className='w-8 h-8 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md'>
                        <span className='text-white text-sm'>🤖</span>
                      </div>
                      <div className='flex-1'>
                        <h5 className='font-bold text-gray-900 dark:text-gray-100 text-sm mb-3 flex items-center gap-2'>
                          <span>AI Financial Advice</span>
                          <span className='text-xs font-normal text-gray-500 dark:text-gray-400'>✨ Personalized</span>
                        </h5>
                        <div className='prose prose-sm max-w-none'>
                          <p className='text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-line'>
                            {formatAnswer(answerData.answer)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className='mt-6 pt-4 border-t border-gray-200 dark:border-gray-700'>
        <div className='flex items-center justify-between text-sm text-gray-600 dark:text-gray-400'>
          <p>💡 Click on action buttons to get personalized AI advice</p>
          <button
            onClick={loadInsights}
            className='px-4 py-2 bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500 hover:from-emerald-700 hover:via-green-600 hover:to-teal-600 text-white rounded-lg font-medium text-sm shadow-lg hover:shadow-xl transition-all duration-200'
          >
            Refresh Insights
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIInsightsNew;

