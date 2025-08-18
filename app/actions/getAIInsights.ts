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

    if (expenses.length === 0) {
      // Return default insights for new users
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
    const expenseData: ExpenseRecord[] = expenses.map((expense) => ({
      id: expense.id,
      amount: expense.amount,
      category: expense.category || 'Other',
      description: expense.text,
      date: expense.createdAt.toISOString(),
    }));

    // ✅ Fix: Cast to Record<string, unknown>[] to satisfy generateExpenseInsights
    const insights = await generateExpenseInsights(
      expenseData as unknown as Record<string, unknown>[]
    );

    return insights;
  } catch (error) {
    console.error('Error getting AI insights:', error);

    // Return fallback insights
    return [
      {
        id: 'error-1',
        type: 'warning',
        title: 'Insights Temporarily Unavailable',
        message:
          "We're having trouble analyzing your expenses right now. Please try again in a few minutes.",
        action: 'Retry analysis',
        confidence: 0.5,
      },
    ];
  }
}
