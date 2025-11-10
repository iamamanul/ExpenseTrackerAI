# Environment Variables Setup for AI Insights

## Required Environment Variables

The AI Insights feature requires API keys from either Groq or Google Gemini (or both for fallback).

### Server-Side Environment Variables

Add these to your `.env.local` file in the root of your project:

```bash
# Groq API Key (Recommended - faster and more reliable)
GROQ_API_KEY=your_groq_api_key_here

# OR

# Google Gemini API Key (Alternative)
GEMINI_API_KEY=your_gemini_api_key_here

# OR use both for automatic fallback
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

### Important Notes

1. **Server-Side Only**: These variables are `GROQ_API_KEY` and `GEMINI_API_KEY` (NOT prefixed with `NEXT_PUBLIC_`)
   - They are only accessible on the server side for security
   - They should NOT be exposed to the browser/client

2. **File Location**: Create or edit `.env.local` in the root directory of your project (same level as `package.json`)

3. **Restart Required**: After adding or modifying environment variables, you must restart your Next.js development server:
   ```bash
   npm run dev
   ```

## Getting API Keys

### Groq API Key
1. Visit https://console.groq.com/
2. Sign up or log in
3. Go to API Keys section
4. Create a new API key
5. Copy the key and add it to `.env.local`

### Google Gemini API Key
1. Visit https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Create a new API key
4. Copy the key and add it to `.env.local`

## Verification

After setting up your environment variables:

1. Restart your development server
2. Check the server console logs when loading AI insights
3. You should see logs like:
   ```
   🔍 API Key Status: { hasGroqKey: true, hasGeminiKey: false, ... }
   ```

## Troubleshooting

### "API key not configured" Error
- Verify the variable names are exactly `GROQ_API_KEY` or `GEMINI_API_KEY`
- Check that the file is named `.env.local` (not `.env` or `.env.example`)
- Make sure you've restarted the development server after adding the keys
- Verify there are no extra spaces or quotes around the API key value

### "Rate limit exceeded" Error
- You've hit the API rate limit
- Wait a few minutes and try again
- Consider adding the other API key for automatic fallback

### "Invalid API key" Error
- Verify your API key is correct
- Check if the API key has expired or been revoked
- Generate a new API key and update `.env.local`

## Security Best Practices

- ✅ Never commit `.env.local` to version control (it's already in `.gitignore`)
- ✅ Never expose API keys in client-side code
- ✅ Use server actions (which we do) to keep API keys secure
- ✅ Rotate API keys periodically
- ✅ Use different keys for development and production

