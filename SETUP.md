# AI Tandem - Review Generator

A mobile-friendly Next.js app that generates personalized reviews for Alpentandem.de paragliding experiences using Grok AI.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure API Key

Create a `.env.local` file in the root directory:

```env
AI_SECRET_KEY=your_actual_xai_api_key_here
```

**Important:** Your xAI API key should start with `xai-`. If you don't have one:
1. Visit [x.ai](https://x.ai/) or [console.x.ai](https://console.x.ai/)
2. Sign up or log in
3. Generate an API key from your dashboard
4. The key format should be: `xai-xxxxxxxxxxxxxxxxxx`

### 3. Run the Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Usage

1. **Login**: Enter password `101010`
2. **Select**: Choose what you liked most (Pilots, Booking System, or Flight)
3. **Generate**: Click "Generate Review" to create an AI-powered review
4. **Copy**: Tap "Copy Review" to copy to clipboard
5. **Repeat**: Create multiple reviews with different focuses

## Troubleshooting

### 500 Error / Network Issues

If you get a 500 error when generating reviews:

1. **Check API Key Format**
   - Your key should start with `xai-`
   - Make sure there are no extra spaces or quotes in `.env.local`
   - Restart the dev server after changing `.env.local`

2. **Verify Network Access**
   - Ensure your computer can reach `api.x.ai`
   - Check if a firewall is blocking the connection
   - Try: `curl https://api.x.ai/v1/chat/completions` (should return 401, not connection error)

3. **Check xAI API Status**
   - Verify your API key is active
   - Check if you have API credits/quota remaining
   - Review xAI's API documentation for any changes

4. **Review Console Logs**
   - Open browser DevTools (F12) → Console tab
   - Check the terminal where `npm run dev` is running
   - Look for detailed error messages

### Common Issues

- **"API key not configured"**: Add `AI_SECRET_KEY` to `.env.local`
- **"getaddrinfo EAI_AGAIN"**: Network/DNS issue - check your internet connection
- **401 Unauthorized**: Invalid API key - verify your xAI credentials
- **429 Too Many Requests**: Rate limit exceeded - wait a moment and try again

## Technology Stack

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Grok AI (xAI)** - Review generation

## File Structure

```
/app
  /api/generate-review/route.ts  # API endpoint for Grok
  /page.tsx                       # Main app page
  /layout.tsx                     # Root layout
  /globals.css                    # Global styles
/components
  /AuthPage.tsx                   # Login page
  /ReviewPage.tsx                 # Review selection & display
```

## License

Private project for Alpentandem.de
