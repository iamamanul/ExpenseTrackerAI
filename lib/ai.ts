// lib/ai.ts - Fixed with Better Error Handling and Independent API Fallback

export interface InsightData {
  id: string;
  type: 'warning' | 'info' | 'success' | 'tip';
  title: string;
  message: string;
  action?: string;
  confidence?: number;
}

interface ApiConfig {
  id: string;
  name: string;
  provider: string;
  limits: string;
  maxTokens: number;
  endpoint: string;
  model: string;
}

interface GroqResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

interface HealthCheckResult {
  api: string;
  status: 'healthy' | 'rate_limited' | 'error';
  error?: string;
}

// Define API configurations for independent services
const API_CONFIGS: ApiConfig[] = [
  {
    id: 'groq',
    name: 'Groq Llama 3',
    provider: 'Groq',
    limits: 'Higher rate limits',
    maxTokens: 800,
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama3-8b-8192'
  },
  {
    id: 'gemini',
    name: 'Google Gemini 1.5 Flash',
    provider: 'Google',
    limits: 'Good free tier',
    maxTokens: 800,
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent',
    model: 'gemini-1.5-flash-latest'
  }
];

// Helper function to create AI prompt for insights
const createInsightPrompt = (records: Record<string, unknown>[]) => {
  return `Analyze these expense records and provide 2-3 financial insights in JSON format: ${JSON.stringify(records.slice(-10))}. 

Return ONLY a valid JSON array with objects containing:
- id: string (unique identifier)
- type: 'warning' | 'info' | 'success' | 'tip'
- title: string (concise insight title)
- message: string (detailed explanation)
- action: string (optional - actionable advice)
- confidence: number (0-1, optional)

Focus on spending patterns, budget recommendations, and actionable advice. Use Indian Rupee (₹) currency only.

Return only valid JSON array, no additional text.`;
};

// Helper function to create AI prompt for answers
const createAnswerPrompt = (question: string) => {
  return `You are a helpful financial advisor. Answer this financial question: ${question}. 

Requirements:
- Use Indian Rupees (₹) for all currency amounts
- Provide practical, actionable advice
- Keep response under 150 words
- Be specific and helpful
- Focus on actionable steps

Question: ${question}`;
};

// FIXED: Helper function to try Groq API with better error handling
const tryGroqAPI = async (records: Record<string, unknown>[]): Promise<InsightData[]> => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('Groq API key is not configured in environment variables');
  }

  console.log('🚀 Trying Groq Llama 3 API...');
  
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama3-8b-8192',
      messages: [
        {
          role: 'system',
          content: 'You are a financial advisor AI. Always respond with valid JSON only.'
        },
        {
          role: 'user', 
          content: createInsightPrompt(records)
        }
      ],
      temperature: 0.7,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    const errorData: { error?: { message?: string } } = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
    throw new Error(`Groq API failed: ${response.status} - ${errorMessage}`);
  }

  const data: GroqResponse = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('No content received from Groq API');
  }

  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) {
      throw new Error('Response is not an array');
    }
    console.log('✅ Groq Llama 3 succeeded');
    return parsed;
  } catch (parseError) {
    console.error('❌ Failed to parse JSON from Groq:', content);
    throw new Error(`Invalid JSON response from Groq API: ${(parseError as Error).message}`);
  }
};

// FIXED: Helper function to try Gemini API with better error handling
const tryGeminiAPI = async (records: Record<string, unknown>[]): Promise<InsightData[]> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is not configured in environment variables');
  }

  console.log('🚀 Trying Google Gemini API...');
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: createInsightPrompt(records)
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800,
        candidateCount: 1,
      },
    }),
  });

  if (!response.ok) {
    const errorData: { error?: { message?: string } } = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
    throw new Error(`Gemini API failed: ${response.status} - ${errorMessage}`);
  }

  const data: GeminiResponse = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!content) {
    throw new Error('No content received from Gemini API');
  }

  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) {
      throw new Error('Response is not an array');
    }
    console.log('✅ Google Gemini succeeded');
    return parsed;
  } catch (parseError) {
    console.error('❌ Failed to parse JSON from Gemini:', content);
    throw new Error(`Invalid JSON response from Gemini API: ${(parseError as Error).message}`);
  }
};

// FIXED: Helper function to try Groq for answers with better error handling
const tryGroqAnswer = async (question: string): Promise<string> => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('Groq API key is not configured in environment variables');
  }

  console.log('🚀 Trying Groq for answer...');
  
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama3-8b-8192',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful financial advisor. Be concise, practical, and use Indian Rupees (₹) for currency.'
        },
        {
          role: 'user',
          content: createAnswerPrompt(question)
        }
      ],
      temperature: 0.7,
      max_tokens: 200,
    }),
  });

  if (!response.ok) {
    const errorData: { error?: { message?: string } } = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
    throw new Error(`Groq Answer API failed: ${response.status} - ${errorMessage}`);
  }

  const data: GroqResponse = await response.json();
  const answer = data.choices?.[0]?.message?.content;
  
  if (!answer) {
    throw new Error('No answer received from Groq API');
  }

  console.log('✅ Groq answer succeeded');
  return answer.trim();
};

// FIXED: Helper function to try Gemini for answers with better error handling
const tryGeminiAnswer = async (question: string): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is not configured in environment variables');
  }

  console.log('🚀 Trying Gemini for answer...');
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: createAnswerPrompt(question)
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 200,
        candidateCount: 1,
      },
    }),
  });

  if (!response.ok) {
    const errorData: { error?: { message?: string } } = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
    throw new Error(`Gemini Answer API failed: ${response.status} - ${errorMessage}`);
  }

  const data: GeminiResponse = await response.json();
  const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!answer) {
    throw new Error('No answer received from Gemini API');
  }

  console.log('✅ Gemini answer succeeded');
  return answer.trim();
};

// MAIN FUNCTION: Generate expense insights with independent API fallback
export async function generateExpenseInsights(records: Record<string, unknown>[]): Promise<InsightData[]> {
  if (!records || records.length === 0) {
    return [{
      id: 'no-data',
      type: 'info',
      title: 'No Data Available',
      message: 'Add some expense records to get AI-powered insights.',
      action: 'Add your first expense',
    }];
  }

  const errors: string[] = [];
  
  // Try Groq first (usually faster and more reliable)
  try {
    const insights = await tryGroqAPI(records);
    
    // Add confidence score and validate insights
    const enhancedInsights = insights
      .filter(insight => insight && insight.title && insight.message) // Filter out invalid insights
      .map(insight => ({
        ...insight,
        confidence: insight.confidence || 0.9,
        id: insight.id || `groq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }));
    
    if (enhancedInsights.length > 0) {
      console.log('🎉 Successfully generated insights using Groq Llama 3');
      return enhancedInsights;
    } else {
      throw new Error('No valid insights returned from Groq API');
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Groq: ${errorMessage}`);
    console.log('❌ Groq API failed:', errorMessage);
    
    // Check error type for better logging
    if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('rate limit')) {
      console.log('⚠️ Rate limit hit on Groq, trying Gemini...');
    } else if (errorMessage.includes('500') || errorMessage.includes('503')) {
      console.log('🔧 Server error on Groq, trying Gemini...');
    } else if (errorMessage.includes('API key')) {
      console.log('🔑 API key issue on Groq, trying Gemini...');
    } else {
      console.log('💥 Unknown error on Groq, trying Gemini...');
    }
  }
  
  // Fallback to Gemini
  try {
    console.log('🔄 Falling back to Google Gemini...');
    const insights = await tryGeminiAPI(records);
    
    // Add confidence score and validate insights
    const enhancedInsights = insights
      .filter(insight => insight && insight.title && insight.message) // Filter out invalid insights
      .map(insight => ({
        ...insight,
        confidence: insight.confidence || 0.85,
        id: insight.id || `gemini-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }));
    
    if (enhancedInsights.length > 0) {
      console.log('🎉 Successfully generated insights using Google Gemini (fallback)');
      return enhancedInsights;
    } else {
      throw new Error('No valid insights returned from Gemini API');
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Gemini: ${errorMessage}`);
    console.log('❌ Gemini API also failed:', errorMessage);
  }
  
  // If both APIs failed, throw comprehensive error with all details
  const allErrors = errors.join(' | ');
  console.error('💥 All AI APIs failed:', allErrors);
  throw new Error(`All AI APIs failed: ${allErrors}`);
}

// MAIN FUNCTION: Generate answers with independent API fallback
export async function generateInsightAnswer(question: string): Promise<string> {
  if (!question || question.trim().length === 0) {
    throw new Error('Question cannot be empty');
  }

  const errors: string[] = [];
  
  // Try Groq first for answers
  try {
    const answer = await tryGroqAnswer(question);
    if (answer && answer.trim().length > 0) {
      console.log('🎉 Successfully generated answer using Groq Llama 3');
      return answer;
    } else {
      throw new Error('Empty answer received from Groq');
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Groq: ${errorMessage}`);
    console.log('❌ Groq answer failed:', errorMessage);
    
    if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('rate limit')) {
      console.log('⚠️ Rate limit on Groq answer, trying Gemini...');
    } else if (errorMessage.includes('API key')) {
      console.log('🔑 API key issue on Groq answer, trying Gemini...');
    } else {
      console.log('🔄 Groq answer error, trying Gemini...');
    }
  }
  
  // Fallback to Gemini for answers
  try {
    console.log('🔄 Falling back to Gemini for answer...');
    const answer = await tryGeminiAnswer(question);
    if (answer && answer.trim().length > 0) {
      console.log('🎉 Successfully generated answer using Gemini (fallback)');
      return answer;
    } else {
      throw new Error('Empty answer received from Gemini');
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Gemini: ${errorMessage}`);
    console.log('❌ Gemini answer also failed:', errorMessage);
  }
  
  // If both APIs failed, throw comprehensive error
  const allErrors = errors.join(' | ');
  console.error('💥 All answer APIs failed:', allErrors);
  throw new Error(`All answer APIs failed: ${allErrors}`);
}

// Export API info for debugging/UI purposes
export const getAPIInfo = () => API_CONFIGS;

// ENHANCED: Helper function to check API health with timeout and better error handling
export async function checkAPIHealth(apiId?: string, timeoutMs: number = 10000): Promise<HealthCheckResult[]> {
  const apisToCheck = apiId 
    ? API_CONFIGS.filter(a => a.id === apiId)
    : API_CONFIGS;
  
  const healthChecks = await Promise.allSettled(
    apisToCheck.map(async (apiConfig) => {
      const checkPromise = async (): Promise<HealthCheckResult> => {
        try {
          if (apiConfig.id === 'groq') {
            const apiKey = process.env.GROQ_API_KEY;
            if (!apiKey) {
              throw new Error('API key not configured');
            }

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'llama3-8b-8192',
                messages: [{ role: 'user', content: 'Hello' }],
                max_tokens: 10,
              }),
            });
            
            if (response.ok) {
              return { api: apiConfig.name, status: 'healthy' as const };
            } else if (response.status === 429) {
              return { api: apiConfig.name, status: 'rate_limited' as const };
            } else {
              const errorData: { error?: { message?: string } } = await response.json().catch(() => ({}));
              return { 
                api: apiConfig.name, 
                status: 'error' as const, 
                error: errorData.error?.message || `HTTP ${response.status}`
              };
            }
            
          } else if (apiConfig.id === 'gemini') {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
              throw new Error('API key not configured');
            }

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contents: [{ parts: [{ text: 'Hello' }] }],
                generationConfig: { maxOutputTokens: 10 },
              }),
            });
            
            if (response.ok) {
              return { api: apiConfig.name, status: 'healthy' as const };
            } else if (response.status === 429) {
              return { api: apiConfig.name, status: 'rate_limited' as const };
            } else {
              const errorData: { error?: { message?: string } } = await response.json().catch(() => ({}));
              return { 
                api: apiConfig.name, 
                status: 'error' as const, 
                error: errorData.error?.message || `HTTP ${response.status}`
              };
            }
          }
          
          return {
            api: apiConfig.name,
            status: 'error' as const,
            error: 'Unknown API type'
          };
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return {
            api: apiConfig.name,
            status: errorMessage.includes('429') || errorMessage.toLowerCase().includes('rate limit') 
              ? 'rate_limited' as const 
              : 'error' as const,
            error: errorMessage
          };
        }
      };

      // Add timeout to health check
      return Promise.race([
        checkPromise(),
        new Promise<HealthCheckResult>((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), timeoutMs)
        )
      ]);
    })
  );
  
  return healthChecks.map((result, index) => 
    result.status === 'fulfilled' 
      ? result.value 
      : { 
          api: apisToCheck[index].name, 
          status: 'error' as const, 
          error: (result.reason as Error)?.message || 'Health check failed' 
        }
  );
}

// Helper function to create category suggestion prompt
const createCategoryPrompt = (description: string) => {
  return `Based on this expense description: "${description}"

Suggest the most appropriate category from these options:
- Food
- Transportation  
- Shopping
- Entertainment
- Bills
- Healthcare
- Other

Return ONLY the category name, nothing else. Choose the single best match.

Examples:
- "coffee at starbucks" → Food
- "uber ride to work" → Transportation
- "netflix subscription" → Entertainment
- "medicine from pharmacy" → Healthcare
- "electricity bill payment" → Bills
- "bought new shoes" → Shopping

Description: ${description}
Category:`;
};

// Helper function to try Groq for category suggestion
const tryGroqCategory = async (description: string): Promise<string> => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('Groq API key is not configured in environment variables');
  }

  console.log('🚀 Trying Groq for category suggestion...');
  
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama3-8b-8192',
      messages: [
        {
          role: 'system',
          content: 'You are a category classifier. Return only the category name from the given options. Be precise and concise.'
        },
        {
          role: 'user',
          content: createCategoryPrompt(description)
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent categorization
      max_tokens: 50,
    }),
  });

  if (!response.ok) {
    const errorData: { error?: { message?: string } } = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
    throw new Error(`Groq Category API failed: ${response.status} - ${errorMessage}`);
  }

  const data: GroqResponse = await response.json();
  const category = data.choices?.[0]?.message?.content?.trim();
  
  if (!category) {
    throw new Error('No category received from Groq API');
  }

  // Validate that the category is one of our expected values
  const validCategories = ['Food', 'Transportation', 'Shopping', 'Entertainment', 'Bills', 'Healthcare', 'Other'];
  const normalizedCategory = validCategories.find(cat => 
    cat.toLowerCase() === category.toLowerCase()
  ) || 'Other';

  console.log('✅ Groq category suggestion succeeded:', normalizedCategory);
  return normalizedCategory;
};

// Helper function to try Gemini for category suggestion
const tryGeminiCategory = async (description: string): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is not configured in environment variables');
  }

  console.log('🚀 Trying Gemini for category suggestion...');
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: createCategoryPrompt(description)
        }]
      }],
      generationConfig: {
        temperature: 0.3, // Lower temperature for consistent categorization
        maxOutputTokens: 50,
        candidateCount: 1,
      },
    }),
  });

  if (!response.ok) {
    const errorData: { error?: { message?: string } } = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
    throw new Error(`Gemini Category API failed: ${response.status} - ${errorMessage}`);
  }

  const data: GeminiResponse = await response.json();
  const category = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  
  if (!category) {
    throw new Error('No category received from Gemini API');
  }

  // Validate that the category is one of our expected values
  const validCategories = ['Food', 'Transportation', 'Shopping', 'Entertainment', 'Bills', 'Healthcare', 'Other'];
  const normalizedCategory = validCategories.find(cat => 
    cat.toLowerCase() === category.toLowerCase()
  ) || 'Other';

  console.log('✅ Gemini category suggestion succeeded:', normalizedCategory);
  return normalizedCategory;
};

// MAIN FUNCTION: Suggest expense category with API fallback
export async function suggestExpenseCategory(description: string): Promise<{ category?: string; error?: string }> {
  if (!description || description.trim().length === 0) {
    return { error: 'Description cannot be empty' };
  }

  // Clean up the description
  const cleanDescription = description.trim().toLowerCase();
  
  // Simple rule-based fallback for common cases (works offline)
  const getSimpleCategory = (desc: string): string => {
    const foodKeywords = ['coffee', 'food', 'restaurant', 'lunch', 'dinner', 'breakfast', 'pizza', 'burger', 'meal', 'snack', 'grocery', 'market'];
    const transportKeywords = ['uber', 'taxi', 'bus', 'train', 'metro', 'fuel', 'gas', 'petrol', 'parking', 'flight', 'car'];
    const shoppingKeywords = ['shop', 'buy', 'purchase', 'store', 'mall', 'online', 'amazon', 'flipkart', 'clothes', 'shoes'];
    const entertainmentKeywords = ['movie', 'cinema', 'netflix', 'spotify', 'game', 'concert', 'show', 'party', 'club'];
    const billsKeywords = ['bill', 'electricity', 'water', 'internet', 'phone', 'rent', 'emi', 'subscription', 'insurance'];
    const healthcareKeywords = ['doctor', 'hospital', 'medicine', 'pharmacy', 'medical', 'health', 'clinic', 'dentist'];

    if (foodKeywords.some(keyword => desc.includes(keyword))) return 'Food';
    if (transportKeywords.some(keyword => desc.includes(keyword))) return 'Transportation';
    if (shoppingKeywords.some(keyword => desc.includes(keyword))) return 'Shopping';
    if (entertainmentKeywords.some(keyword => desc.includes(keyword))) return 'Entertainment';
    if (billsKeywords.some(keyword => desc.includes(keyword))) return 'Bills';
    if (healthcareKeywords.some(keyword => desc.includes(keyword))) return 'Healthcare';
    
    return 'Other';
  };

  const errors: string[] = [];
  
  // Try Groq first for category suggestion
  try {
    const category = await tryGroqCategory(description);
    console.log('🎉 Successfully suggested category using Groq Llama 3:', category);
    return { category };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Groq: ${errorMessage}`);
    console.log('❌ Groq category suggestion failed:', errorMessage);
    
    if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('rate limit')) {
      console.log('⚠️ Rate limit on Groq category, trying Gemini...');
    } else if (errorMessage.includes('API key')) {
      console.log('🔑 API key issue on Groq category, trying Gemini...');
    } else {
      console.log('🔄 Groq category error, trying Gemini...');
    }
  }
  
  // Fallback to Gemini for category suggestion
  try {
    console.log('🔄 Falling back to Gemini for category...');
    const category = await tryGeminiCategory(description);
    console.log('🎉 Successfully suggested category using Gemini (fallback):', category);
    return { category };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Gemini: ${errorMessage}`);
    console.log('❌ Gemini category suggestion also failed:', errorMessage);
  }
  
  // If both AI APIs failed, use simple rule-based approach
  console.log('🔄 Both AI APIs failed, using rule-based category suggestion...');
  const simpleCategory = getSimpleCategory(cleanDescription);
  console.log('✅ Rule-based category suggestion:', simpleCategory);
  
  return { 
    category: simpleCategory,
    // Don't show the AI errors to user, just use the rule-based result
  };
}