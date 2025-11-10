import { NextRequest, NextResponse } from 'next/server';
import { checkUser } from '@/lib/checkUser';
import { db } from '@/lib/db';
import { generateExpenseInsights, generateFinancialAnswer, checkAPIKeys } from '@/lib/ai-service';

/**
 * Calculate current month spending
 */
async function getCurrentMonthSpending(userId: string): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const expenses = await db.record.findMany({
    where: {
      userId: userId,
      date: {
        gte: startOfMonth,
      },
    },
  });
  
  return expenses.reduce((sum, expense) => sum + expense.amount, 0);
}

/**
 * GET /api/insights - Get AI insights for user's expenses
 */
export async function GET() {
  try {
    // Check authentication
    let user;
    try {
      user = await checkUser();
    } catch (authError) {
      console.error('Authentication error:', authError);
      // Return sample insights when auth fails
      return NextResponse.json({
        insights: [
          {
            id: 'welcome-1',
            type: 'tip' as const,
            title: 'Welcome to AI Insights',
            message: 'Sign in to get personalized financial insights based on your expenses.',
            action: 'Sign In',
            confidence: 0.9,
          },
          {
            id: 'setup-1',
            type: 'info' as const,
            title: 'Set Your Budget',
            message: 'Create a monthly budget to get better financial recommendations.',
            action: 'Learn More',
            confidence: 0.8,
          }
        ],
        budget: null,
      });
    }
    
    if (!user) {
      // Return sample insights for unauthenticated users
      return NextResponse.json({
        insights: [
          {
            id: 'welcome-2',
            type: 'tip' as const,
            title: 'Track Your Expenses',
            message: 'Start adding your expenses to get AI-powered financial insights.',
            action: 'Add Expense',
            confidence: 0.9,
          },
          {
            id: 'setup-2',
            type: 'info' as const,
            title: 'AI-Powered Analysis',
            message: 'Our AI will help you understand your spending patterns.',
            action: 'Learn More',
            confidence: 0.8,
          }
        ],
        budget: null,
      });
    }

    // Check API keys
    const apiKeys = checkAPIKeys();
    if (!apiKeys.hasGroq && !apiKeys.hasGemini) {
      return NextResponse.json({
        insights: [
          {
            id: 'api-key-missing',
            type: 'warning' as const,
            title: 'API Configuration Required',
            message: 'Please configure GROQ_API_KEY or GEMINI_API_KEY in your .env.local file to enable AI insights.',
            action: 'Configure API keys',
            confidence: 1.0,
          }
        ]
      });
    }

    // Get user data with budget
    const userData = await db.user.findUnique({
      where: {
        clerkUserId: user.clerkUserId,
      },
      select: {
        monthlyBudget: true,
      },
    });

    // Get user's expenses (last 30 days based on expense date)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const expenses = await db.record.findMany({
      where: {
        userId: user.clerkUserId,
        date: {
          gte: thirtyDaysAgo,
        },
      },
      orderBy: {
        date: 'desc',
      },
      take: 100,
    });

    // Get current month spending for budget comparison
    const currentMonthSpending = await getCurrentMonthSpending(user.clerkUserId);

    // Convert to format expected by AI service
    const expenseData = expenses.map((expense) => ({
      id: expense.id,
      amount: expense.amount,
      category: expense.category || 'Other',
      description: expense.text,
      date: expense.date.toISOString(), // Use expense date, not createdAt
    }));

    // Generate insights with budget context
    const monthlyBudget = userData?.monthlyBudget;
    const insights = await generateExpenseInsights(
      expenseData,
      monthlyBudget || undefined,
      monthlyBudget ? currentMonthSpending : undefined
    );

    // Add budget analysis insight if budget is set (only if not already added by AI)
    if (monthlyBudget && monthlyBudget > 0 && !insights.find(i => i.id === 'budget-analysis')) {
      const budgetPercentage = (currentMonthSpending / monthlyBudget) * 100;
      const remainingBudget = monthlyBudget - currentMonthSpending;
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
      const daysPassed = new Date().getDate();
      const projectedSpending = (currentMonthSpending / daysPassed) * daysInMonth;

      let budgetInsightType: 'success' | 'warning' | 'info' = 'info';
      let budgetMessage = '';
      let budgetAction = '';

      if (budgetPercentage > 100) {
        budgetInsightType = 'warning';
        budgetMessage = `You've exceeded your monthly budget of ₹${monthlyBudget.toFixed(2)}. Current spending: ₹${currentMonthSpending.toFixed(2)} (${budgetPercentage.toFixed(1)}% over budget). You've overspent by ₹${Math.abs(remainingBudget).toFixed(2)}.`;
        budgetAction = 'Get budget recovery plan';
      } else if (budgetPercentage > 80) {
        budgetInsightType = 'warning';
        budgetMessage = `You're approaching your monthly budget limit. Budget: ₹${monthlyBudget.toFixed(2)}, Current: ₹${currentMonthSpending.toFixed(2)} (${budgetPercentage.toFixed(1)}%). Remaining: ₹${remainingBudget.toFixed(2)}.`;
        budgetAction = 'Get spending reduction tips';
      } else {
        budgetInsightType = 'success';
        budgetMessage = `You're within budget! Monthly budget: ₹${monthlyBudget.toFixed(2)}, Current spending: ₹${currentMonthSpending.toFixed(2)} (${budgetPercentage.toFixed(1)}%). Remaining: ₹${remainingBudget.toFixed(2)}. Projected monthly spending: ₹${projectedSpending.toFixed(2)}.`;
        budgetAction = 'View budget details';
      }

      // Add budget insight at the beginning
      insights.unshift({
        id: 'budget-analysis',
        type: budgetInsightType,
        title: 'Monthly Budget Status',
        message: budgetMessage,
        action: budgetAction,
        confidence: 0.95,
        amount: currentMonthSpending,
      });
    }

    return NextResponse.json({ 
      insights,
      budget: monthlyBudget ? {
        monthly: monthlyBudget,
        current: currentMonthSpending,
        remaining: monthlyBudget - currentMonthSpending,
        percentage: ((currentMonthSpending / monthlyBudget) * 100).toFixed(1),
      } : null,
    });
  } catch (error) {
    console.error('Error generating insights:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      {
        error: 'Failed to generate insights',
        message: errorMessage,
        insights: [
          {
            id: 'error-fallback',
            type: 'warning' as const,
            title: 'Insights Temporarily Unavailable',
            message: `Unable to generate AI insights at the moment: ${errorMessage}. Please try again later.`,
            action: 'Retry',
            confidence: 0.5,
          }
        ]
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/insights - Get answer to a financial question
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await checkUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check API keys
    const apiKeys = checkAPIKeys();
    if (!apiKeys.hasGroq && !apiKeys.hasGemini) {
      return NextResponse.json(
        { error: 'API keys not configured' },
        { status: 500 }
      );
    }

    // Get question from request body
    const body = await request.json();
    const { question } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }

    // Get user budget and current spending for context
    const userData = await db.user.findUnique({
      where: {
        clerkUserId: user.clerkUserId,
      },
      select: {
        monthlyBudget: true,
      },
    });

    const monthlyBudget = userData?.monthlyBudget || undefined;
    const currentMonthSpending = monthlyBudget ? await getCurrentMonthSpending(user.clerkUserId) : undefined;

    // Generate answer with budget context
    const answer = await generateFinancialAnswer(question, monthlyBudget, currentMonthSpending);

    return NextResponse.json({ answer });
  } catch (error) {
    console.error('Error generating answer:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      {
        error: 'Failed to generate answer',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

