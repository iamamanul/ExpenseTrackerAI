'use server';

import { checkUser } from '@/lib/checkUser';
// We import the function from lib/ai and give it a new name 'generateAnswerFromAI' to avoid confusion
import { generateInsightAnswer as generateAnswerFromAI } from '@/lib/ai';

// This is the server action that your component calls
export async function generateInsightAnswer(question: string): Promise<string> {
  try {
    // First, check if the user is logged in
    const user = await checkUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Now, call the actual AI function from lib/ai.ts with the question
    // The logic for fetching expenses was removed because the new AI function in lib/ai.ts handles everything and doesn't need the expense data passed to it this way.
    const answer = await generateAnswerFromAI(question);
    return answer;

  } catch (error) {
    // Handle any errors that occur
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    console.error('Error generating insight answer:', error);
    // Return a user-friendly error message
    return `I'm unable to provide a detailed answer at the moment. The AI service reported: ${errorMessage}`;
  }
}