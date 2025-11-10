/**
 * AI Service - Clean implementation with proper error handling
 * Supports both Groq and Gemini APIs with automatic fallback
 */

interface ExpenseRecord {
  id: string;
  amount: number;
  category: string;
  description: string | null;
  date: string;
}

interface Insight {
  id: string;
  type: 'success' | 'warning' | 'info' | 'tip';
  title: string;
  message: string;
  action?: string;
  confidence: number;
  category?: string;
  amount?: number;
}

// Groq Models to try (in order of preference)
const GROQ_MODELS = [
  'llama-3.1-8b-instant',
  'llama-3.1-70b-versatile',
  'llama-3.3-70b-versatile',
  'mixtral-8x7b-32768',
];

// Gemini Models to try
const GEMINI_MODELS = [
  'gemini-1.5-flash',
  'gemini-pro',
];

/**
 * Call Groq API
 */
async function callGroqAPI(prompt: string, maxTokens: number = 1000): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY not configured');
  }

  for (const model of GROQ_MODELS) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: 'You are a financial advisor AI. Always respond with valid JSON only. Use Indian Rupees (₹) for currency.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        if (response.status === 404 || response.status === 400) {
          // Model not available, try next
          continue;
        }
        throw new Error(`Groq API error (${model}): ${response.status} - ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (content) {
        return content.trim();
      }
    } catch (error) {
      // Try next model
      if (model === GROQ_MODELS[GROQ_MODELS.length - 1]) {
        throw error;
      }
      continue;
    }
  }

  throw new Error('All Groq models failed');
}

/**
 * Call Gemini API
 */
async function callGeminiAPI(prompt: string, maxTokens: number = 1000): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  for (const model of GEMINI_MODELS) {
    for (const version of ['v1', 'v1beta']) {
      try {
        const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: maxTokens,
            },
          }),
        });

        if (!response.ok) {
          if (response.status === 404) {
            // Try next model/version
            continue;
          }
          const error = await response.json().catch(() => ({}));
          throw new Error(`Gemini API error (${model}/${version}): ${response.status} - ${JSON.stringify(error)}`);
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (content) {
          return content.trim();
        }
      } catch (error) {
        // Try next model/version
        if (model === GEMINI_MODELS[GEMINI_MODELS.length - 1] && version === 'v1beta') {
          throw error;
        }
        continue;
      }
    }
  }

  throw new Error('All Gemini models failed');
}

/**
 * Generate expense insights using AI
 */
export async function generateExpenseInsights(
  expenses: ExpenseRecord[],
  monthlyBudget?: number,
  currentMonthSpending?: number
): Promise<Insight[]> {
  if (!expenses || expenses.length === 0) {
    return getWelcomeInsights();
  }

  // Calculate basic statistics
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const categoryTotals = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);
  
  const avgAmount = totalAmount / expenses.length;
  const maxCategory = Object.entries(categoryTotals).reduce((a, b) => 
    a[1] > b[1] ? a : b
  );

  // Add budget context if available
  let budgetContext = '';
  if (monthlyBudget && currentMonthSpending !== undefined) {
    const budgetPercentage = (currentMonthSpending / monthlyBudget) * 100;
    const remaining = monthlyBudget - currentMonthSpending;
    budgetContext = `

Budget Information:
- Monthly Budget: ₹${monthlyBudget.toFixed(2)}
- Current Month Spending: ₹${currentMonthSpending.toFixed(2)}
- Budget Usage: ${budgetPercentage.toFixed(1)}%
- Remaining Budget: ₹${remaining.toFixed(2)}
- Status: ${budgetPercentage > 100 ? 'OVER BUDGET' : budgetPercentage > 80 ? 'NEARING LIMIT' : 'WITHIN BUDGET'}`;
  }

  // Create prompt
  const prompt = `Analyze these expense records and provide 3-5 financial insights in JSON format.

Expense Data:
- Total Expenses (Last 30 days): ₹${totalAmount.toFixed(2)}
- Number of Expenses: ${expenses.length}
- Average Expense: ₹${avgAmount.toFixed(2)}
- Top Category: ${maxCategory[0]} (₹${maxCategory[1].toFixed(2)})
- Categories: ${Object.keys(categoryTotals).join(', ')}
- Recent Expenses: ${JSON.stringify(expenses.slice(-10).map(e => ({
  amount: e.amount,
  category: e.category,
  description: e.description || 'N/A',
  date: e.date
})))}${budgetContext}

Return ONLY a valid JSON array with this exact structure:
[
  {
    "id": "unique-id",
    "type": "success" | "warning" | "info" | "tip",
    "title": "Short title",
    "message": "Detailed explanation",
    "action": "Optional actionable advice",
    "confidence": 0.0-1.0,
    "category": "Optional category name",
    "amount": Optional amount
  }
]

Focus on:
1. Spending patterns and trends${monthlyBudget ? ' (compare with budget)' : ''}
2. Category-wise analysis and optimization
3. Budget recommendations and adjustments${monthlyBudget ? ' (based on current budget)' : ''}
4. Cost-saving opportunities
5. Actionable financial advice${monthlyBudget && currentMonthSpending ? ' (considering budget status)' : ''}

${monthlyBudget ? `IMPORTANT: Consider the monthly budget (₹${monthlyBudget.toFixed(2)}) and current spending (₹${currentMonthSpending?.toFixed(2)}) in your analysis. Provide budget-specific recommendations.` : ''}

Use Indian Rupees (₹) for all amounts. Be practical and specific.`;

  const errors: string[] = [];

  // Try Groq first
  try {
    const response = await callGroqAPI(prompt, 1500);
    const insights = parseInsights(response);
    if (insights.length > 0) {
      return insights;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`Groq: ${message}`);
  }

  // Try Gemini as fallback
  try {
    const response = await callGeminiAPI(prompt, 1500);
    const insights = parseInsights(response);
    if (insights.length > 0) {
      return insights;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`Gemini: ${message}`);
  }

  // If both fail, return rule-based insights
  return generateRuleBasedInsights(expenses, categoryTotals, totalAmount, avgAmount);
}

/**
 * Generate answer to a financial question
 */
export async function generateFinancialAnswer(question: string, monthlyBudget?: number, currentSpending?: number): Promise<string> {
  let budgetContext = '';
  if (monthlyBudget && currentSpending !== undefined) {
    const percentage = (currentSpending / monthlyBudget) * 100;
    const remaining = monthlyBudget - currentSpending;
    budgetContext = `\n\nBudget Context:
- Monthly Budget: ₹${monthlyBudget.toFixed(2)}
- Current Spending: ₹${currentSpending.toFixed(2)}
- Spending Percentage: ${percentage.toFixed(1)}%
- Remaining Budget: ₹${remaining.toFixed(2)}
- Status: ${percentage > 100 ? 'OVER BUDGET' : percentage > 80 ? 'NEARING LIMIT' : 'WITHIN BUDGET'}`;
  }

  const prompt = `You are a financial advisor for Indian users. Answer this question with practical, actionable advice in plain text format (NO JSON, NO code blocks, just natural text).

Question: ${question}${budgetContext}

Requirements:
- Use Indian Rupees (₹) for currency
- Provide 3-5 specific, actionable steps
- Keep response between 100-200 words
- Use bullet points or numbered list for clarity
- Focus on practical implementation
- Be encouraging but realistic
- Use simple, clear language
- Format with line breaks for readability
- DO NOT use JSON format
- DO NOT use code blocks
- Write in natural, conversational tone

Provide your answer as plain text with clear sections:`;

  const errors: string[] = [];

  // Try Groq first
  try {
    const response = await callGroqAPI(prompt, 400);
    // Clean up response - remove JSON markers, code blocks, etc.
    return cleanAIResponse(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`Groq: ${message}`);
  }

  // Try Gemini as fallback
  try {
    const response = await callGeminiAPI(prompt, 400);
    // Clean up response
    return cleanAIResponse(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`Gemini: ${message}`);
  }

  throw new Error(`All AI services failed: ${errors.join('; ')}`);
}

/**
 * Clean AI response - remove JSON markers, code blocks, etc.
 */
function cleanAIResponse(response: string): string {
  let cleaned = response.trim();
  
  // Remove markdown code blocks
  cleaned = cleaned.replace(/```json\n?/g, '');
  cleaned = cleaned.replace(/```\n?/g, '');
  cleaned = cleaned.replace(/```[a-z]*\n?/g, '');
  
  // Remove JSON object markers if present
  if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed.answer) return parsed.answer;
      if (parsed.text) return parsed.text;
      if (parsed.response) return parsed.response;
    } catch {
      // Not valid JSON, continue
    }
  }
  
  // Remove "Answer:" or "Response:" prefixes
  cleaned = cleaned.replace(/^(Answer|Response|Advice):\s*/i, '');
  
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned.trim();
}

/**
 * Parse insights from AI response
 */
function parseInsights(response: string): Insight[] {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed.map((insight: Record<string, unknown>) => ({
          id: String(insight.id || `insight-${Date.now()}-${Math.random()}`),
          type: (insight.type as 'success' | 'warning' | 'info' | 'tip') || 'info',
          title: String(insight.title || 'Insight'),
          message: String(insight.message || ''),
          action: insight.action as string | undefined,
          confidence: typeof insight.confidence === 'number' ? insight.confidence : 0.8,
          category: insight.category as string | undefined,
          amount: insight.amount as number | undefined,
        }));
      }
    }
  } catch (error) {
    console.error('Failed to parse AI response:', error);
  }

  return [];
}

/**
 * Generate rule-based insights as fallback
 */
function generateRuleBasedInsights(
  expenses: ExpenseRecord[],
  categoryTotals: Record<string, number>,
  totalAmount: number,
  avgAmount: number
): Insight[] {
  const insights: Insight[] = [];
  const topCategory = Object.entries(categoryTotals).reduce((a, b) => 
    a[1] > b[1] ? a : b
  );
  
  const categories = Object.keys(categoryTotals);
  // Calculate days tracked from oldest to newest expense
  const sortedExpenses = [...expenses].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const oldestDate = sortedExpenses[0]?.date ? new Date(sortedExpenses[0].date) : new Date();
  const newestDate = sortedExpenses[sortedExpenses.length - 1]?.date ? new Date(sortedExpenses[sortedExpenses.length - 1].date) : new Date();
  const daysDiff = Math.ceil((newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysTracked = Math.max(1, daysDiff || 1);
  const dailyAverage = totalAmount / daysTracked;
  const monthlyEstimate = dailyAverage * 30;

  // High spending alert
  if (totalAmount > 10000) {
    insights.push({
      id: 'high-spending',
      type: 'warning',
      title: 'High Total Spending Detected',
      message: `Your total expenses over the last ${daysTracked} days are ₹${totalAmount.toFixed(2)}. This averages to ₹${dailyAverage.toFixed(2)} per day. Consider reviewing your spending patterns to identify areas for cost reduction.`,
      action: 'Get spending reduction tips',
      confidence: 0.9,
      amount: totalAmount,
    });
  } else if (totalAmount < 1000) {
    insights.push({
      id: 'low-spending',
      type: 'success',
      title: 'Great Spending Control',
      message: `Your total expenses are ₹${totalAmount.toFixed(2)} over ${daysTracked} days. You're maintaining good control over your spending! Keep tracking to maintain this discipline.`,
      action: 'Set savings goals',
      confidence: 0.85,
    });
  }

  // Category concentration analysis
  const topCategoryPercentage = (topCategory[1] / totalAmount) * 100;
  if (topCategoryPercentage > 40) {
    insights.push({
      id: 'category-concentration',
      type: 'info',
      title: `${topCategory[0]} Dominates Your Spending`,
      message: `${topCategory[0]} accounts for ₹${topCategory[1].toFixed(2)} (${topCategoryPercentage.toFixed(1)}%) of your total expenses. Consider diversifying your spending or finding ways to optimize costs in this category.`,
      action: `Get ${topCategory[0]} optimization tips`,
      confidence: 0.95,
      category: topCategory[0],
      amount: topCategory[1],
    });
  }

  // Category diversity
  if (categories.length >= 4) {
    insights.push({
      id: 'category-diversity',
      type: 'success',
      title: 'Well-Diversified Spending',
      message: `You're tracking expenses across ${categories.length} different categories: ${categories.join(', ')}. This diversity helps in better financial planning and budget allocation.`,
      action: 'View category breakdown',
      confidence: 0.8,
    });
  }

  // Average spending analysis
  insights.push({
    id: 'average-spending',
    type: 'info',
    title: 'Spending Pattern Analysis',
    message: `Your average expense per transaction is ₹${avgAmount.toFixed(2)}. You've recorded ${expenses.length} transactions over ${daysTracked} days, averaging ₹${dailyAverage.toFixed(2)} per day.`,
    action: 'Analyze spending trends',
    confidence: 0.9,
    amount: avgAmount,
  });

  // Monthly projection
  if (daysTracked >= 7) {
    insights.push({
      id: 'monthly-projection',
      type: 'tip',
      title: 'Monthly Spending Projection',
      message: `Based on your current spending rate of ₹${dailyAverage.toFixed(2)} per day, you're projected to spend approximately ₹${monthlyEstimate.toFixed(2)} this month. Set a monthly budget to ensure you stay within your financial goals.`,
      action: 'Create monthly budget plan',
      confidence: daysTracked >= 14 ? 0.9 : 0.7,
      amount: monthlyEstimate,
    });
  }

  // Spending frequency
  const transactionsPerDay = expenses.length / daysTracked;
  if (transactionsPerDay > 3) {
    insights.push({
      id: 'frequent-spending',
      type: 'warning',
      title: 'Frequent Small Transactions',
      message: `You're making an average of ${transactionsPerDay.toFixed(1)} transactions per day. Consider consolidating smaller purchases or reviewing if all expenses are necessary to better manage your cash flow.`,
      action: 'Review transaction frequency',
      confidence: 0.8,
    });
  }

  return insights;
}

/**
 * Get welcome insights for new users
 */
function getWelcomeInsights(): Insight[] {
  return [
    {
      id: 'welcome-1',
      type: 'info',
      title: 'Welcome to ExpenseTracker AI!',
      message: 'Start adding your expenses to get personalized AI insights about your spending patterns, budget recommendations, and financial advice.',
      action: 'Add your first expense',
      confidence: 1.0,
    },
    {
      id: 'welcome-2',
      type: 'tip',
      title: 'Track Regularly for Better Insights',
      message: 'For best results, log your expenses daily. This helps our AI provide more accurate insights and personalized recommendations.',
      action: 'Set daily reminders',
      confidence: 1.0,
    },
    {
      id: 'welcome-3',
      type: 'success',
      title: 'AI-Powered Financial Analysis',
      message: 'Our AI analyzes your spending patterns, identifies trends, and provides actionable advice to help you manage your finances better.',
      action: 'Learn more',
      confidence: 1.0,
    },
  ];
}

/**
 * Check if API keys are configured
 */
export function checkAPIKeys(): { hasGroq: boolean; hasGemini: boolean } {
  return {
    hasGroq: !!process.env.GROQ_API_KEY,
    hasGemini: !!process.env.GEMINI_API_KEY,
  };
}

