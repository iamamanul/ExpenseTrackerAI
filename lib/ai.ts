// lib/ai.ts - Enhanced AI Engine with Groq (Llama-3.1), Gemini 1.5 Flash, JSON sanitization, and Smart Data-Driven Fallbacks

export interface InsightData {
  id: string;
  type: 'warning' | 'info' | 'success' | 'tip';
  title: string;
  message: string;
  action?: string;
  confidence?: number;
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

// Robust JSON sanitizer to strip markdown fences (```json ... ```)
const cleanAndParseJson = <T>(content: string): T => {
  let cleaned = content.trim();
  // Strip starting ```json or ```
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  // Strip ending ```
  cleaned = cleaned.replace(/\s*```$/i, '');
  cleaned = cleaned.trim();

  // Find array or object bounds if LLM added preamble text
  const firstChar = cleaned.charAt(0);
  if (firstChar !== '[' && firstChar !== '{') {
    const arrayStart = cleaned.indexOf('[');
    const objectStart = cleaned.indexOf('{');
    if (arrayStart !== -1 && (objectStart === -1 || arrayStart < objectStart)) {
      const arrayEnd = cleaned.lastIndexOf(']');
      if (arrayEnd !== -1) cleaned = cleaned.substring(arrayStart, arrayEnd + 1);
    } else if (objectStart !== -1) {
      const objectEnd = cleaned.lastIndexOf('}');
      if (objectEnd !== -1) cleaned = cleaned.substring(objectStart, objectEnd + 1);
    }
  }

  return JSON.parse(cleaned) as T;
};

// Create AI prompt for insights
const createInsightPrompt = (records: Record<string, unknown>[]) => {
  const summaryData = records.slice(0, 30).map(r => ({
    text: r.description || r.text,
    amount: r.amount,
    category: r.category,
    date: r.date
  }));

  return `You are an elite personal financial advisor. Analyze these user expense records: ${JSON.stringify(summaryData)}.

Return ONLY a valid JSON array of 3-4 distinct financial insights. Each insight object MUST contain:
- id: string (unique identifier like "insight-1")
- type: 'warning' | 'info' | 'success' | 'tip'
- title: string (concise punchy title)
- message: string (clear actionable insight referencing actual spending habits, numbers, or categories in Indian Rupees ₹)
- action: string (short recommendation)
- confidence: number (between 0.85 and 1.0)

Rules:
1. Always format monetary values in Indian Rupees (₹).
2. Highlight spending spikes, top categories, and saving recommendations.
3. Output strictly valid JSON array. Do not include markdown text outside JSON.`;
};

// Create AI prompt for question answering with real user data context
const createAnswerPrompt = (question: string, records: Record<string, unknown>[] = []) => {
  const context = records.length > 0 
    ? `User's Expense History (Recent ${records.length} transactions): ${JSON.stringify(records.slice(0, 25))}`
    : `User has not recorded expenses yet.`;

  return `You are ExpenseTracker AI, an intelligent personal finance expert.
${context}

User Question: "${question}"

Instructions:
- Provide accurate, specific, encouraging, and practical financial advice.
- Refer to actual numbers or categories from their expense history if available.
- Always use Indian Rupees (₹) for currency amounts.
- Format key points nicely using bullet points and **bold text** where appropriate.
- Keep response under 180 words.`;
};

// Groq API Helper (Uses updated llama-3.1-8b-instant model)
const tryGroqInsights = async (records: Record<string, unknown>[]): Promise<InsightData[]> => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY missing');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: 'You are a financial advisor AI. Output valid JSON array only.' },
        { role: 'user', content: createInsightPrompt(records) }
      ],
      temperature: 0.5,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Groq HTTP ${response.status}: ${err?.error?.message || response.statusText}`);
  }

  const data: GroqResponse = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from Groq');

  return cleanAndParseJson<InsightData[]>(content);
};

// Gemini API Helper
const tryGeminiInsights = async (records: Record<string, unknown>[]): Promise<InsightData[]> => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY missing');

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: createInsightPrompt(records) }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 1000 },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Gemini HTTP ${response.status}: ${err?.error?.message || response.statusText}`);
  }

  const data: GeminiResponse = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error('Empty response from Gemini');

  return cleanAndParseJson<InsightData[]>(content);
};

// Smart mathematical fallback generator for insights when AI APIs are unavailable
const generateSmartCalculatedInsights = (records: Record<string, unknown>[]): InsightData[] => {
  if (!records || records.length === 0) {
    return [
      {
        id: 'calc-welcome',
        type: 'info',
        title: 'Welcome to ExpenseTracker AI!',
        message: 'Add your expenses to receive smart AI insights, spending alerts, and tailored budget tips.',
        action: 'Add your first expense',
        confidence: 1.0,
      },
      {
        id: 'calc-tip',
        type: 'tip',
        title: 'Smart Categorization Ready',
        message: 'Type any description (like "Starbucks coffee" or "Uber trip") and let AI auto-categorize your expenses.',
        action: 'Try AI auto-category',
        confidence: 1.0,
      }
    ];
  }

  const insights: InsightData[] = [];
  let totalAmount = 0;
  const categoryTotals: Record<string, number> = {};
  let maxExpense = { amount: 0, title: '' };

  records.forEach((r) => {
    const amt = Number(r.amount) || 0;
    const cat = String(r.category || 'Other');
    const txt = String(r.description || r.text || 'Expense');

    totalAmount += amt;
    categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;

    if (amt > maxExpense.amount) {
      maxExpense = { amount: amt, title: txt };
    }
  });

  // Top spending category
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  if (sortedCategories.length > 0) {
    const [topCat, topAmt] = sortedCategories[0];
    const percentage = Math.round((topAmt / totalAmount) * 100);
    insights.push({
      id: 'calc-top-category',
      type: percentage > 40 ? 'warning' : 'info',
      title: `Dominant Category: ${topCat}`,
      message: `You spent ₹${topAmt.toLocaleString('en-IN')} on ${topCat}, which accounts for ${percentage}% of your total recorded expenses (₹${totalAmount.toLocaleString('en-IN')}).`,
      action: percentage > 40 ? `Set a monthly limit for ${topCat}` : `Review ${topCat} expenses`,
      confidence: 0.95,
    });
  }

  // Highest single expense
  if (maxExpense.amount > 0) {
    insights.push({
      id: 'calc-highest-expense',
      type: 'warning',
      title: `Highest Single Expense`,
      message: `Your largest single payment was ₹${maxExpense.amount.toLocaleString('en-IN')} for "${maxExpense.title}".`,
      action: 'Evaluate necessity of high-value purchases',
      confidence: 0.92,
    });
  }

  // General savings tip
  const avgTransaction = Math.round(totalAmount / records.length);
  insights.push({
    id: 'calc-avg-spending',
    type: 'tip',
    title: 'Average Transaction Velocity',
    message: `Across your ${records.length} transactions, your average spend per item is ₹${avgTransaction.toLocaleString('en-IN')}. Setting a weekly threshold of ₹${Math.round(avgTransaction * 3)} can boost savings.`,
    action: 'Create weekly budget goals',
    confidence: 0.90,
  });

  // Success summary
  insights.push({
    id: 'calc-summary',
    type: 'success',
    title: 'Financial Tracking Active',
    message: `You have logged ₹${totalAmount.toLocaleString('en-IN')} across ${Object.keys(categoryTotals).length} categories. Consistent tracking improves financial clarity by over 30%.`,
    action: 'Keep logging daily',
    confidence: 0.98,
  });

  return insights;
};

// MAIN FUNCTION: Generate expense insights
export async function generateExpenseInsights(records: Record<string, unknown>[]): Promise<InsightData[]> {
  if (!records || records.length === 0) {
    return generateSmartCalculatedInsights([]);
  }

  // 1. Try Groq (Llama-3.1-8b-instant)
  try {
    const insights = await tryGroqInsights(records);
    if (Array.isArray(insights) && insights.length > 0) {
      console.log('✅ AI Insights generated successfully with Groq Llama 3.1');
      return insights;
    }
  } catch (error) {
    console.warn('⚠️ Groq AI Insights unavailable, attempting Gemini fallback:', (error as Error).message);
  }

  // 2. Try Gemini Flash
  try {
    const insights = await tryGeminiInsights(records);
    if (Array.isArray(insights) && insights.length > 0) {
      console.log('✅ AI Insights generated successfully with Gemini Flash');
      return insights;
    }
  } catch (error) {
    console.warn('⚠️ Gemini AI Insights unavailable:', (error as Error).message);
  }

  // 3. Fallback to smart calculated metrics (Guarantees zero downtime UI)
  console.log('ℹ️ Utilizing Smart Data Analysis Fallback for AI Insights');
  return generateSmartCalculatedInsights(records);
}

// MAIN FUNCTION: Generate AI Answer for user financial question
export async function generateInsightAnswer(question: string, records: Record<string, unknown>[] = []): Promise<string> {
  if (!question || question.trim().length === 0) {
    return 'Please enter a valid financial question.';
  }

  const promptText = createAnswerPrompt(question, records);

  // 1. Try Groq
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: 'You are an expert Indian personal finance advisor. Be clear, practical, and use ₹ currency.' },
            { role: 'user', content: promptText }
          ],
          temperature: 0.6,
          max_tokens: 300,
        }),
      });

      if (response.ok) {
        const data: GroqResponse = await response.json();
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text) return text;
      }
    } catch (err) {
      console.warn('Groq answer generation failed:', err);
    }
  }

  // 2. Try Gemini
  const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 300 },
        }),
      });

      if (response.ok) {
        const data: GeminiResponse = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) return text;
      }
    } catch (err) {
      console.warn('Gemini answer generation failed:', err);
    }
  }

  // 3. Smart Rule-Based Financial Answer Fallback
  const totalSpend = records.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
  const qLower = question.toLowerCase();

  if (qLower.includes('save') || qLower.includes('saving')) {
    return `💡 **Smart Savings Advice:** Based on your current spending of ₹${totalSpend.toLocaleString('en-IN')}, aim to follow the **50/30/20 rule**: 50% for needs, 30% for wants, and 20% directly into automated savings or mutual funds. Try reducing non-essential category spending by 10% this month!`;
  }

  if (qLower.includes('highest') || qLower.includes('biggest') || qLower.includes('most')) {
    if (records.length > 0) {
      const highest = [...records].sort((a, b) => Number(b.amount) - Number(a.amount))[0];
      return `📊 **Expense Analysis:** Your highest single expense recorded is **${highest.description || highest.text}** for **₹${Number(highest.amount).toLocaleString('en-IN')}** under category *${highest.category}*.`;
    }
  }

  return `💰 **Financial Analysis:** You currently have ${records.length} expense transactions totaling ₹${totalSpend.toLocaleString('en-IN')}. For optimal budget management, keep track of daily variable expenses and review weekly category trends.`;
}

// MAIN FUNCTION: Suggest expense category
export async function suggestExpenseCategory(description: string): Promise<{ category?: string; error?: string }> {
  if (!description || description.trim().length === 0) {
    return { error: 'Description cannot be empty' };
  }

  const desc = description.trim().toLowerCase();

  // Rule-based instant classifier (fast & offline capable)
  const categoryRules: Record<string, string[]> = {
    Food: ['coffee', 'starbucks', 'zomato', 'swiggy', 'restaurant', 'food', 'lunch', 'dinner', 'breakfast', 'pizza', 'burger', 'meal', 'grocery', 'supermarket', 'd-mart', 'blinkit', 'zepto'],
    Transportation: ['uber', 'ola', 'rapido', 'taxi', 'bus', 'train', 'metro', 'fuel', 'petrol', 'diesel', 'gas', 'parking', 'flight', 'irctc'],
    Shopping: ['amazon', 'flipkart', 'myntra', 'clothes', 'shoes', 'mall', 'shop', 'dress', 'electronics', 'furniture'],
    Entertainment: ['movie', 'cinema', 'bookmyshow', 'netflix', 'spotify', 'prime', 'game', 'concert', 'event', 'party'],
    Bills: ['bill', 'electricity', 'water', 'wifi', 'internet', 'broadband', 'phone', 'recharge', 'rent', 'maintenance', 'emi', 'subscription'],
    Healthcare: ['doctor', 'hospital', 'medicine', 'pharmacy', 'apollo', 'medical', 'test', 'clinic', 'dental'],
  };

  for (const [cat, keywords] of Object.entries(categoryRules)) {
    if (keywords.some((k) => desc.includes(k))) {
      return { category: cat };
    }
  }

  // Groq classifier fallback
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content: 'Classify expense into strictly one of: Food, Transportation, Shopping, Entertainment, Bills, Healthcare, Other. Output only the single category name.'
            },
            { role: 'user', content: description }
          ],
          temperature: 0.1,
          max_tokens: 15,
        }),
      });

      if (response.ok) {
        const data: GroqResponse = await response.json();
        const cat = data.choices?.[0]?.message?.content?.trim();
        const validCategories = ['Food', 'Transportation', 'Shopping', 'Entertainment', 'Bills', 'Healthcare', 'Other'];
        const matched = validCategories.find(c => c.toLowerCase() === cat?.toLowerCase());
        if (matched) return { category: matched };
      }
    } catch {
      // Continue to default
    }
  }

  return { category: 'Other' };
}