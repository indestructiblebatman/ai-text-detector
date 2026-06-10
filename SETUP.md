# Local Setup — Verascript

## Prerequisites

- Node.js 18+
- An Anthropic API key — [console.anthropic.com](https://console.anthropic.com)
- A Supabase project — [supabase.com](https://supabase.com)

---

## Installation

1. **Clone the repo**

   ```bash
   git clone https://github.com/indestructiblebatman/ai-text-detector.git
   cd ai-text-detector
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Create a `.env.local` file** in the root directory

   ```bash
   cp .env.local.example .env.local
   ```

   Then fill in the required values (see Environment Variables below).

4. **Run the development server**

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key (required) |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key |

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

---

## API Endpoint

**POST `/api/detect`**

Sends text to Claude for AI detection analysis.

**Request**
```json
{
  "text": "Your text to analyse"
}
```

**Response**
```json
{
  "overall_score": 75,
  "verdict": "This text shows strong indicators of AI generation...",
  "sentences": [
    { "text": "First sentence here.", "level": "high" },
    { "text": "Second sentence here.", "level": "medium" }
  ]
}
```

Sentence levels: `"human"` `"low"` `"medium"` `"high"`

---

## Usage Smoke Test

With your dev server running, validate the `/api/usage` endpoint:

```bash
node scripts/test-usage.js
```

Expect `401` when not authenticated.

---

## Magic Link Notes

If you use the OTP/passwordless email sign-in and a link appears expired or invalid:

- Some email clients open links in a preview webview that prematurely consumes the token
- Copy the link and paste it directly into a full browser window
- The app uses an intermediate `/auth/complete` page to reduce preview prefetch issues
- Use "Resend login link" on the sign-in page and open the new link directly

---

## Deployment

The app is deployed on Vercel with CI/CD via GitHub. Pushing to `main` triggers a production deploy automatically. Environment variables must be set in the Vercel project dashboard.
