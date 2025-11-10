# Debugging AI Insights - Step by Step Guide

## Current Status
- ✅ Insights are loading (console shows "✅ Insights loaded successfully: 2")
- ❓ Action button clicks may not be working

## Step 1: Check Browser Console
1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Click on an action button (e.g., "Add your first expense")
4. Look for these logs in the browser console:
   - `🎯 Action clicked for insight:`
   - `🔄 Calling generateInsightAnswer server action...`
   - `📥 Received answer from server:`
   - OR any error messages

## Step 2: Check Server Terminal
1. Look at your dev server terminal
2. When you click an action button, you should see:
   - `🔍 API Key Status:`
   - `🚀 Calling AI service with question:`
   - `🚀 Trying Groq [model]...`
   - `✅ Groq [model] succeeded` OR error messages

## Step 3: Test the Action Button
1. Make sure you're clicking on the action button text (e.g., "Add your first expense")
2. The button should show a loading spinner when clicked
3. After a few seconds, you should see either:
   - An AI-generated answer
   - An error message

## Step 4: Check Network Tab
1. Open Browser Developer Tools
2. Go to Network tab
3. Click an action button
4. Look for a request to `/` (POST request)
5. Check the response - it should show either:
   - Success with answer data
   - Error with error message

## Step 5: Common Issues

### Issue: Nothing happens when clicking
**Possible causes:**
- Button click handler not firing
- JavaScript error preventing execution
- Server action not being called

**Solution:**
- Check browser console for JavaScript errors
- Verify the button is clickable (not disabled)
- Check if there are any React errors

### Issue: Server action called but no response
**Possible causes:**
- API keys invalid
- All models failing
- Network timeout

**Solution:**
- Check server terminal for error logs
- Verify API keys in `.env.local`
- Check network connectivity

### Issue: Error message displayed
**Possible causes:**
- API key issues
- Rate limiting
- Model availability

**Solution:**
- Read the error message carefully
- Check server logs for detailed error
- Verify API keys are valid

## Step 6: Manual Test
Try this in your browser console:
```javascript
// This will test if the server action is accessible
fetch('/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: 'Test question'
  })
}).then(r => r.json()).then(console.log).catch(console.error)
```

## What to Share
If it's still not working, please share:
1. **Browser Console Logs** - Copy all logs when clicking the button
2. **Server Terminal Logs** - Copy all logs when clicking the button
3. **Network Tab** - Screenshot of the network request/response
4. **Error Message** - Any error message shown in the UI

## Expected Behavior
1. Click action button → Loading spinner appears
2. Server receives request → Logs show API calls
3. API responds → Answer appears in UI
4. OR error occurs → Error message appears in UI

## Quick Fixes to Try
1. **Clear browser cache** and refresh
2. **Restart dev server** completely
3. **Check `.env.local`** file exists and has correct keys
4. **Verify API keys** are valid at:
   - Groq: https://console.groq.com/
   - Gemini: https://aistudio.google.com/app/apikey

