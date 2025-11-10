# AI Insights Troubleshooting Guide

## Recent Fixes Applied

### 1. Updated Model Names
- **Groq**: Now tries multiple models automatically:
  - `llama-3.1-8b-instant` (primary)
  - `llama-3.1-70b-versatile`
  - `llama-3.3-70b-versatile`
  - `mixtral-8x7b-32768`
  - `gemma2-9b-it`
  
- **Gemini**: Now tries multiple models and API versions:
  - `gemini-1.5-flash` with v1 API
  - `gemini-pro` with v1 API
  - `gemini-1.5-pro` with v1 API
  - Falls back to v1beta if v1 fails

### 2. Automatic Fallback
- Both APIs now automatically try multiple models/versions
- If one model fails, it automatically tries the next
- Detailed logging shows which model/version worked

### 3. Better Error Handling
- Server-side logging shows API key status
- Detailed error messages in console
- Client-side shows user-friendly error messages

## Testing the AI Insights

### Step 1: Check API Keys
Make sure your `.env.local` file has:
```bash
GROQ_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
```

### Step 2: Restart Server
After any changes, restart:
```bash
npm run dev
```

### Step 3: Test with Expenses
1. Add some expense records to your app
2. Go to the AI Insights section
3. Wait for insights to load
4. Click on any action button (e.g., "Add your first expense")
5. Check server console for logs

### Step 4: Check Server Logs
Look for these log messages:
- `🔍 API Key Status:` - Shows if keys are detected
- `🚀 Trying Groq [model]...` - Shows which models are being tried
- `✅ Groq [model] succeeded` - Shows which model worked
- `❌ Groq [model] failed:` - Shows why a model failed

## Common Issues

### Issue: "No expenses found, returning welcome insights"
**Solution**: This is normal if you have no expenses. Add some expenses to get real AI insights.

### Issue: "All Groq models failed"
**Possible causes**:
1. API key is invalid or expired
2. Rate limit exceeded (wait a few minutes)
3. Network connectivity issues

**Solution**:
1. Verify API key at https://console.groq.com/
2. Check server logs for specific error
3. Wait a few minutes if rate limited

### Issue: "All Gemini models failed"
**Possible causes**:
1. API key is invalid
2. Model not available in your region
3. API endpoint changed

**Solution**:
1. Verify API key at https://aistudio.google.com/app/apikey
2. Check server logs for specific error
3. The system will automatically try Groq as fallback

### Issue: Clicking action button shows error
**Solution**:
1. Check server console logs for the actual error
2. Verify API keys are set correctly
3. Check if you're hitting rate limits
4. Try again after a few minutes

## Debug Mode

To see detailed logs, check your server console. You should see:
- API key status (length, availability)
- Which models are being tried
- Success/failure for each model
- Final result or error message

## Getting Help

If issues persist:
1. Check server console logs
2. Verify API keys are valid
3. Test API keys directly with curl:
   ```bash
   # Test Groq
   curl https://api.groq.com/openai/v1/chat/completions \
     -H "Authorization: Bearer $GROQ_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model":"llama-3.1-8b-instant","messages":[{"role":"user","content":"Hello"}],"max_tokens":10}'
   
   # Test Gemini
   curl "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=$GEMINI_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
   ```

## Expected Behavior

1. **No Expenses**: Shows welcome insights with default messages
2. **With Expenses**: Shows AI-generated insights based on your spending
3. **Clicking Action**: Generates personalized AI advice using the APIs
4. **API Failure**: Shows fallback message with manual advice

## Next Steps

If you're still experiencing issues:
1. Share the exact error message from server logs
2. Verify API keys are working with curl commands above
3. Check if you have expenses in the database
4. Verify you're clicking the action buttons on insights

