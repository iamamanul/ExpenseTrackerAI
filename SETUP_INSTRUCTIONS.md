# Setup Instructions - AI Insights with Budget Feature

## Quick Start

### 1. Run Database Migration
```bash
npx prisma migrate dev
npx prisma generate
```

This will:
- Add `monthlyBudget` field to User table
- Update Prisma client

### 2. Restart Development Server
```bash
npm run dev
```

### 3. Set Your Monthly Budget
1. Go to "Add New Expense" section
2. Click on "Set Monthly Budget" (bottom of the form)
3. Enter your monthly budget (e.g., 50000)
4. Click "Save"

### 4. View AI Insights
1. Go to "AI Insights" section
2. You'll see:
   - Budget status card (if budget is set)
   - AI-generated insights
   - Budget-aware recommendations

### 5. Get AI Advice
1. Click on any insight action button
2. AI will provide formatted advice (no JSON)
3. Advice considers your budget

## Features

### ✅ Monthly Budget Setting
- Set budget in "Add New Expense" section
- Budget persists in database
- Easy to update

### ✅ Budget Analysis
- Real-time budget vs spending
- Visual progress bar
- Color-coded status
- Monthly projection

### ✅ AI-Powered Insights
- Budget-aware analysis
- Spending pattern detection
- Category optimization
- Cost-saving opportunities

### ✅ Clean AI Advice
- No JSON formatting
- Readable text format
- Bullet points
- Actionable steps

## What's Fixed

1. **JSON Format Issue** ✅
   - AI responses are cleaned and formatted
   - No JSON objects in advice
   - Clean, readable text

2. **Budget Integration** ✅
   - Budget setting in AddNewRecord
   - Budget analysis in AI Insights
   - Budget-aware AI recommendations

3. **Better Advice Format** ✅
   - Plain text format
   - Proper bullet points
   - Clear sections
   - No code blocks

4. **Budget vs Spending** ✅
   - Visual progress bar
   - Status indicators
   - Remaining budget display
   - Monthly projections

## API Configuration

Make sure your `.env.local` has:
```bash
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
```

At least one API key is required for AI features.

## Troubleshooting

### Migration Fails
If migration fails, run:
```bash
npx prisma db push
npx prisma generate
```

### Budget Not Showing
1. Check if budget is set in "Add New Expense"
2. Verify migration ran successfully
3. Check browser console for errors

### AI Advice Shows JSON
1. Check server logs for errors
2. Verify API keys are correct
3. The formatAnswer function should clean responses

## Next Steps

1. Set your monthly budget
2. Add some expenses
3. View AI insights
4. Get budget-aware advice
5. Monitor your spending

## Support

If you encounter issues:
1. Check server logs
2. Verify API keys
3. Check database connection
4. Verify migration ran successfully

