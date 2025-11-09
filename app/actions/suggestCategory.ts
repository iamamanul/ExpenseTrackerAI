'use server';

import { suggestExpenseCategory } from '@/lib/ai';

export async function suggestCategory(description: string) {
  try {
    // Validate input
    if (!description || description.trim().length === 0) {
      return { error: 'Please enter a description first' };
    }

    if (description.trim().length > 200) {
      return { error: 'Description is too long (max 200 characters)' };
    }

    // Call the AI function
    const result = await suggestExpenseCategory(description.trim());

    if (result.error) {
      console.error('Category suggestion error:', result.error);
      return { error: 'Unable to suggest category at this time' };
    }

    if (result.category) {
      return { category: result.category };
    }

    // Fallback if no category is returned
    return { error: 'Unable to suggest category at this time' };
  } catch (error: unknown) { // Changed 'any' to 'unknown'
    console.error('Server action error in suggestCategory:', error);
    return { error: 'Unable to suggest category at this time' };
  }
}