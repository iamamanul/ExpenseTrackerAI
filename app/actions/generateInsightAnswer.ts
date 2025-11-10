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

    // Check environment variables for debugging
    const hasGroqKey = !!process.env.GROQ_API_KEY;
    const hasGeminiKey = !!process.env.GEMINI_API_KEY;
    
    console.log('🔍 API Key Status:', {
      hasGroqKey,
      hasGeminiKey,
      groqKeyLength: process.env.GROQ_API_KEY?.length || 0,
      geminiKeyLength: process.env.GEMINI_API_KEY?.length || 0,
    });

    if (!hasGroqKey && !hasGeminiKey) {
      throw new Error('No API keys configured. Please set GROQ_API_KEY or GEMINI_API_KEY in your .env.local file.');
    }

    // Now, call the actual AI function from lib/ai.ts with the question
    // The logic for fetching expenses was removed because the new AI function in lib/ai.ts handles everything and doesn't need the expense data passed to it this way.
    console.log('🚀 Calling AI service with question:', question.substring(0, 100) + '...');
    console.log('📝 Full question length:', question.length);
    
    try {
      const answer = await generateAnswerFromAI(question);
      console.log('✅ AI service returned answer:', answer.substring(0, 100) + '...');
      console.log('📏 Answer length:', answer.length);
      return answer;
    } catch (aiError) {
      console.error('❌ AI service error in generateInsightAnswer:', aiError);
      console.error('🔍 AI error details:', {
        message: aiError instanceof Error ? aiError.message : String(aiError),
        stack: aiError instanceof Error ? aiError.stack : 'No stack'
      });
      throw aiError; // Re-throw to be caught by outer catch
    }

  } catch (error) {
    // Handle any errors that occur
    console.error('❌ Error generating insight answer:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Re-throw the error so the client can handle it properly
    throw error;
  }
}