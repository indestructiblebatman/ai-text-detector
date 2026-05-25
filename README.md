# AI Text Detector

A Next.js web app that analyzes text to detect AI-generated content with sentence-by-sentence breakdown.

## Features

- **Text Analysis**: Paste any text (assignments, essays, etc.) and get AI detection analysis
- **Overall Score**: See an overall AI likelihood percentage with a color-coded progress bar
- **Sentence Breakdown**: Each sentence is highlighted based on AI likelihood (high, medium, low, or human)
- **Verdict Summary**: Get a 2-3 sentence plain English summary of the findings
- **Responsive Design**: Works seamlessly on mobile and desktop
- **Real-time**: Results appear immediately after analysis
- **Clean UI**: Minimal, modern design with Tailwind CSS

## Tech Stack

- **Next.js 14** with App Router
- **Tailwind CSS** for styling
- **Anthropic SDK** for Claude API integration
- **JavaScript** (no TypeScript)

## Prerequisites

You need an Anthropic API key to use this app. Get one at [https://console.anthropic.com/](https://console.anthropic.com/)

## Setup Instructions

1. **Clone or copy the project** to your desired location

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create a `.env.local` file** in the root directory and add your API key:
   ```bash
   ANTHROPIC_API_KEY=your_api_key_here
   ```
   
   (You can also copy from `.env.local.example` and fill in your key)

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser** and go to [http://localhost:3000](http://localhost:3000)

## How to Use

1. Paste your text into the textarea
2. Click the "Analyze" button
3. View the results:
   - Overall AI likelihood percentage
   - Color-coded progress bar (red = high, amber = medium, green = low)
   - Verdict summary
   - Sentence-by-sentence breakdown with color highlighting

## Project Structure

```
app/
  ├── page.js              # Main UI component
  ├── layout.js            # Root layout with metadata
  ├── globals.css          # Global styles
  └── api/
      └── detect/
          └── route.js     # Claude API endpoint
.env.local                 # Environment variables (create this file)
.env.local.example         # Example environment variables
package.json              # Dependencies
```

## Environment Variables

- `ANTHROPIC_API_KEY`: Your Anthropic API key (required)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## API Endpoint

**POST `/api/detect`**

Sends text to Claude for AI detection analysis.

**Request**:
```json
{
  "text": "Your text to analyze"
}
```

**Response**:
```json
{
  "overall_score": 75,
  "verdict": "This text shows strong indicators of AI generation...",
  "sentences": [
    {
      "text": "First sentence here.",
      "level": "high"
    },
    {
      "text": "Second sentence here.",
      "level": "medium"
    }
  ]
}
```

Sentence levels: `"human"`, `"low"`, `"medium"`, `"high"`

## Notes

- The app uses Claude 3.5 Sonnet for analysis
- API calls may take a few seconds depending on text length
- Results are based on Claude's analysis and should be used as a guide, not absolute truth

## Quick notes about magic links

- If you use passwordless email sign-in, some email clients may open links in a preview/webview which can prematurely consume magic links. If a link says "expired" or "invalid", copy the link and paste it into a full browser window.
- The app uses an intermediate `/auth/complete` page to avoid preview prefetch issues. If you see an expired link, click "Resend login link" on the sign-in page and open the new link directly in your browser.

## Running the usage smoke test

There is a small smoke test script to validate the `/api/usage` endpoint. With your dev server running, run:

```bash
node scripts/test-usage.js
```

It will print the HTTP status and response body. Expect `401` when not authenticated.

## License

MIT

