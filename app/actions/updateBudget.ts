'use server';

import { checkUser } from '@/lib/checkUser';
import { db } from '@/lib/db';

export async function updateMonthlyBudget(budget: number) {
  try {
    const user = await checkUser();
    if (!user) {
      return { error: 'User not authenticated' };
    }

    if (budget < 0) {
      return { error: 'Budget must be a positive number' };
    }

    await db.user.update({
      where: {
        clerkUserId: user.clerkUserId,
      },
      data: {
        monthlyBudget: budget,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating budget:', error);
    return { error: 'Failed to update budget' };
  }
}

export async function getMonthlyBudget() {
  try {
    const user = await checkUser();
    if (!user) {
      return { budget: null, error: 'User not authenticated' };
    }

    const userData = await db.user.findUnique({
      where: {
        clerkUserId: user.clerkUserId,
      },
      select: {
        monthlyBudget: true,
      },
    });

    return { budget: userData?.monthlyBudget || null };
  } catch (error) {
    console.error('Error getting budget:', error);
    return { budget: null, error: 'Failed to get budget' };
  }
}

