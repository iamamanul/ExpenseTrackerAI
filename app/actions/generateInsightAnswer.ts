'use server';

import { checkUser } from '@/lib/checkUser';
import { db } from '@/lib/db';
import { generateInsightAnswer as generateAnswerFromAI } from '@/lib/ai';

export async function generateInsightAnswer(question: string): Promise<string> {
  try {
    const user = await checkUser();
    if (!user) {
      return 'Please sign in to ask questions about your expenses.';
    }

    // Fetch user's recent records for context
    const expenses = await db.record.findMany({
      where: {
        userId: user.clerkUserId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 40,
    });

    const expenseRecords = expenses.map((e: { text: string; amount: number; category: string; date?: Date; createdAt: Date }) => ({
      description: e.text,
      amount: e.amount,
      category: e.category,
      date: (e.date || e.createdAt).toISOString(),
    }));

    const answer = await generateAnswerFromAI(question, expenseRecords);
    return answer;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error('Error generating insight answer:', error);
    return `I'm unable to process your request right now. (${errorMessage})`;
  }
}