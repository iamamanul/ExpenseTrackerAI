'use server';

import { checkUser } from '@/lib/checkUser';
import { db } from '@/lib/db';
// Fix 1: Renamed AIInsight to InsightData and removed ExpenseRecord from import
import { generateExpenseInsights, InsightData } from '@/lib/ai';

// Fix 2: Defined the ExpenseRecord type here, as it's not exported from lib/ai.ts
interface ExpenseRecord {
  id: string;
  amount: number;
  category: string;
  description: string | null;
  date: string;
}

// Fix 3: Updated the function's return type to use InsightData
export async function getAIInsights(): Promise<InsightData[]> {
  try {
    const user = await checkUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Check environment variables for debugging
    const hasGroqKey = !!process.env.GROQ_API_KEY;
    const hasGeminiKey = !!process.env.GEMINI_API_KEY;
    
    console.log('🔍 API Key Status in getAIInsights:', {
      hasGroqKey,
      hasGeminiKey,
      groqKeyLength: process.env.GROQ_API_KEY?.length || 0,
      geminiKeyLength: process.env.GEMINI_API_KEY?.length || 0,
    });

    // Get user's recent expenses (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const expenses = await db.record.findMany({
      where: {
        userId: user.clerkUserId,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Limit to recent 50 expenses for analysis
    });

    console.log(`📊 Found ${expenses.length} expenses for analysis`);

    if (expenses.length === 0) {
      // Return default insights for new users
      console.log('👋 No expenses found, returning welcome insights');
      return [
        {
          id: 'welcome-1',
          type: 'info',
          title: 'Welcome to ExpenseTracker AI!',
          message:
            'Start adding your expenses to get personalized AI insights about your spending patterns.',
          action: 'Add your first expense',
          confidence: 1.0,
        },
        {
          id: 'welcome-2',
          type: 'tip',
          title: 'Track Regularly',
          message:
            'For best results, try to log expenses daily. This helps our AI provide more accurate insights.',
          action: 'Set daily reminders',
          confidence: 1.0,
        },
      ];
    }

    // Convert to format expected by AI
      const expenseData: ExpenseRecord[] = expenses.map((expense: {
        id: string;
        amount: number;
        category?: string;
        text: string | null;
        createdAt: Date;
      }) => ({
      id: expense.id,
      amount: expense.amount,
      category: expense.category || 'Other',
      description: expense.text,
      date: expense.createdAt.toISOString(),
    }));

    console.log('🚀 Calling generateExpenseInsights with', expenseData.length, 'expenses');
    
    // ✅ Fix: Cast to Record<string, unknown>[] to satisfy generateExpenseInsights
    const insights = await generateExpenseInsights(
      expenseData as unknown as Record<string, unknown>[]
    );

    console.log('✅ Generated', insights.length, 'insights');
    return insights;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error getting AI insights:', error);
    console.error('Error details:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Check if it's an API key issue
    if (errorMessage.includes('API key') || errorMessage.includes('not configured')) {
      return [
        {
          id: 'error-api-key',
          type: 'warning',
          title: 'API Configuration Required',
          message:
            `Unable to generate AI insights: ${errorMessage}. Please set GROQ_API_KEY or GEMINI_API_KEY in your .env.local file.`,
          action: 'Check environment variables',
          confidence: 0.5,
        },
      ];
    }

    // Return fallback insights
    return [
      {
        id: 'error-1',
        type: 'warning',
        title: 'Insights Temporarily Unavailable',
        message:
          `We're having trouble analyzing your expenses right now: ${errorMessage}. Please try again in a few minutes.`,
        action: 'Retry analysis',
        confidence: 0.5,
      },
    ];
  }
}
