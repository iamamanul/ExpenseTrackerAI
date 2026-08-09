'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getAIInsights } from '@/app/actions/getAIInsights';
import { generateInsightAnswer } from '@/app/actions/generateInsightAnswer';

export interface InsightData {
  id: string;
  type: 'warning' | 'info' | 'success' | 'tip';
  title: string;
  message: string;
  action?: string;
  confidence?: number;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  '💡 How can I save ₹2,000 this month?',
  '📊 What is my highest expense category?',
  '🛒 Where am I spending the most money?',
  '🎯 Give me a 30-day budget strategy',
];

export default function AIInsights() {
  const [insights, setInsights] = useState<InsightData[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(true);
  const [question, setQuestion] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isAskingAI, setIsAskingAI] = useState(false);
  const [activeTab, setActiveTab] = useState<'insights' | 'chat'>('insights');

  const chatStreamRef = useRef<HTMLDivElement>(null);

  // Fetch AI Insights securely from Server Action
  const fetchInsights = useCallback(async () => {
    setIsLoadingInsights(true);
    try {
      const data = await getAIInsights();
      setInsights(data);
    } catch (err) {
      console.error('Failed to load AI insights:', err);
    } finally {
      setIsLoadingInsights(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  // Scroll ONLY the inner chat stream container, never the outer window
  useEffect(() => {
    if (activeTab === 'chat' && chatStreamRef.current) {
      chatStreamRef.current.scrollTo({
        top: chatStreamRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [chatMessages, activeTab, isAskingAI]);

  const handleAskQuestion = async (queryText?: string) => {
    const q = (queryText || question).trim();
    if (!q || isAskingAI) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!queryText) setQuestion('');
    setIsAskingAI(true);
    setActiveTab('chat');

    try {
      const aiResponseText = await generateInsightAnswer(q);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error('AI Q&A error:', error);
      const errorMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: 'Sorry, I ran into an error generating an answer. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAskingAI(false);
    }
  };

  const getTypeStyles = (type: InsightData['type']) => {
    switch (type) {
      case 'warning':
        return {
          border: 'border-amber-500/30 dark:border-amber-500/40',
          bg: 'bg-amber-50/70 dark:bg-amber-950/20',
          badgeBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700',
          icon: '⚠️',
        };
      case 'success':
        return {
          border: 'border-emerald-500/30 dark:border-emerald-500/40',
          bg: 'bg-emerald-50/70 dark:bg-emerald-950/20',
          badgeBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
          icon: '🎉',
        };
      case 'tip':
        return {
          border: 'border-blue-500/30 dark:border-blue-500/40',
          bg: 'bg-blue-50/70 dark:bg-blue-950/20',
          badgeBg: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
          icon: '💡',
        };
      case 'info':
      default:
        return {
          border: 'border-indigo-500/30 dark:border-indigo-500/40',
          bg: 'bg-indigo-50/70 dark:bg-indigo-950/20',
          badgeBg: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700',
          icon: '✨',
        };
    }
  };

  const renderFormattedText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} className="font-semibold text-emerald-600 dark:text-emerald-400">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-3.5 sm:p-6 shadow-xl border border-gray-100 dark:border-gray-700/60 transition-all">
      {/* Responsive Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-gray-200/60 dark:border-gray-700/60">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-11 sm:h-11 bg-gradient-to-tr from-emerald-500 via-teal-500 to-green-500 rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/20 text-lg sm:text-xl text-white font-bold flex-shrink-0">
            🤖
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-gray-900 via-emerald-800 to-teal-900 dark:from-white dark:via-emerald-300 dark:to-teal-200 bg-clip-text text-transparent">
                AI Financial Assistant
              </h2>
              <span className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[9px] sm:text-[10px] uppercase tracking-wider font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full shadow-xs">
                Pro
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
              Smart spending analysis & personal AI financial advisor
            </p>
          </div>
        </div>

        {/* Mobile-optimized Segmented Control Tab Switcher */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <div className="bg-gray-100 dark:bg-gray-900/90 p-1 rounded-xl flex gap-1 border border-gray-200/60 dark:border-gray-700/60 flex-1 sm:flex-none">
            <button
              onClick={() => setActiveTab('insights')}
              className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all text-center ${
                activeTab === 'insights'
                  ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              💡 Smart Insights
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all text-center ${
                activeTab === 'chat'
                  ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              💬 AI Chat {chatMessages.length > 0 && `(${chatMessages.length})`}
            </button>
          </div>

          <button
            onClick={fetchInsights}
            disabled={isLoadingInsights}
            title="Refresh Insights"
            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-gray-700 dark:hover:text-emerald-400 transition-all disabled:opacity-50 flex-shrink-0"
          >
            <svg
              className={`w-4 h-4 ${isLoadingInsights ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Responsive Content */}
      <div className="mt-4 sm:mt-5">
        {activeTab === 'insights' ? (
          <div>
            {isLoadingInsights ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 py-4 sm:py-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-700/40 h-28 sm:h-32 rounded-2xl border border-gray-200/40 dark:border-gray-700/40 p-4 flex flex-col justify-between">
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/3"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : insights.length === 0 ? (
              <div className="text-center py-8 sm:py-10 bg-gray-50/50 dark:bg-gray-900/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 px-3">
                <span className="text-2xl sm:text-3xl block mb-2">📥</span>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">No expense records found to generate insights.</p>
                <p className="text-[11px] sm:text-xs text-gray-400 dark:text-gray-500 mt-1">Add your first expense record above to unlock custom AI analysis.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {insights.map((insight) => {
                  const style = getTypeStyles(insight.type);
                  return (
                    <div
                      key={insight.id}
                      className={`p-3.5 sm:p-5 rounded-2xl border ${style.border} ${style.bg} backdrop-blur-sm shadow-xs hover:shadow-md transition-all flex flex-col justify-between group`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-base sm:text-lg">{style.icon}</span>
                            <h3 className="font-bold text-xs sm:text-base text-gray-900 dark:text-gray-100">
                              {insight.title}
                            </h3>
                          </div>
                          {insight.confidence && (
                            <span className="text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-md bg-white/70 dark:bg-gray-800/70 text-gray-500 dark:text-gray-400 border border-gray-200/50 dark:border-gray-700/50">
                              {Math.round(insight.confidence * 100)}% match
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                          {insight.message}
                        </p>
                      </div>

                      {insight.action && (
                        <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-2">
                          <span className={`text-[11px] sm:text-xs font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border ${style.badgeBg} truncate`}>
                            💡 {insight.action}
                          </span>
                          <button
                            onClick={() => handleAskQuestion(`Tell me more about: ${insight.title}`)}
                            className="text-[11px] sm:text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 flex-shrink-0"
                          >
                            Ask AI →
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Mobile-Optimized Conversational AI Chat Tab */
          <div className="flex flex-col h-[380px] sm:h-[440px] bg-gray-50/60 dark:bg-gray-900/40 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-3 sm:p-4">
            {/* Stream Window */}
            <div ref={chatStreamRef} className="flex-1 overflow-y-auto space-y-3 pr-1 sm:pr-2 custom-scrollbar">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-2 sm:mb-3 text-lg sm:text-xl">
                    💬
                  </div>
                  <h4 className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-gray-100">Ask ExpenseTracker AI Anything</h4>
                  <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 max-w-xs sm:max-w-sm mt-1 mb-3">
                    Get instant advice about your spending, savings tips, or category breakdowns based on your logged expenses.
                  </p>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Bot Avatar Icon for AI Messages */}
                    {msg.sender === 'ai' && (
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center text-xs font-bold shadow-xs flex-shrink-0 mt-0.5">
                        🤖
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] sm:max-w-[75%] p-3 sm:p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                        msg.sender === 'user'
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-xs'
                          : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200/80 dark:border-gray-700/80 rounded-tl-xs'
                      }`}
                    >
                      <div className="whitespace-pre-line">{renderFormattedText(msg.text)}</div>
                      <span
                        className={`text-[9px] block text-right mt-1 opacity-75 ${
                          msg.sender === 'user' ? 'text-emerald-100' : 'text-gray-400'
                        }`}
                      >
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                ))
              )}

              {/* Bot Typing Loader */}
              {isAskingAI && (
                <div className="flex items-start gap-2 justify-start">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center text-xs font-bold shadow-xs flex-shrink-0 animate-pulse">
                    🤖
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-2xl rounded-tl-xs border border-gray-200/80 dark:border-gray-700/80 shadow-xs">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                    <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium">Analyzing finances...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Prompts Touch Carousel */}
            <div className="py-2 flex gap-1.5 overflow-x-auto no-scrollbar touch-pan-x">
              {QUICK_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAskQuestion(prompt)}
                  disabled={isAskingAI}
                  className="whitespace-nowrap text-[10px] sm:text-[11px] font-medium bg-white dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 border border-gray-200 dark:border-gray-700 px-2.5 py-1 rounded-full transition-all flex-shrink-0 shadow-2xs disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskQuestion();
              }}
              className="flex gap-1.5 sm:gap-2 pt-2 border-t border-gray-200/60 dark:border-gray-700/60"
            >
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask about budget, savings, or spending..."
                disabled={isAskingAI}
                className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={isAskingAI || !question.trim()}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-1 shadow-md shadow-emerald-600/20 flex-shrink-0"
              >
                <span>Ask</span>
                <span>✨</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}