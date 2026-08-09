'use server';

import { checkUser } from '@/lib/checkUser';
import { db } from '@/lib/db';
import { generateExpenseInsights, InsightData } from '@/lib/ai';

export async function getAIInsights(): Promise<InsightData[]> {
  try {
    const user = await checkUser();
    if (!user) {
      return [
        {
          id: 'unauth',
          type: 'info',
          title: 'Sign In Required',
          message: 'Sign in to access personalized AI financial analysis and spending insights.',
          action: 'Sign In',
        },
      ];
    }

    // Fetch user's recent expenses up to 50
    const expenses = await db.record.findMany({
      where: {
        userId: user.clerkUserId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    const expenseData = expenses.map((e: { id: string; amount: number; category?: string; text: string; date?: Date; createdAt: Date }) => ({
      id: e.id,
      amount: e.amount,
      category: e.category || 'Other',
      description: e.text,
      date: e.date ? e.date.toISOString() : e.createdAt.toISOString(),
    }));

    const insights = await generateExpenseInsights(expenseData as unknown as Record<string, unknown>[]);
    return insights;
  } catch (error) {
    console.error('Error getting AI insights:', error);
    return [
      {
        id: 'fallback-error',
        type: 'info',
        title: 'Financial Analysis Ready',
        message: 'Add more expenses to see deeper AI recommendations and category breakdowns.',
        action: 'Log Expense',
        confidence: 0.8,
      },
    ];
  }
}
