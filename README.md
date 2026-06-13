# Verascript — AI Text Detection Tool

A full-stack web application that analyses text for AI-generated content, with sentence-level probability scoring and an inline rewrite interface.

**Live:** https://verascript.com](https://ai-text-detector-sigma.vercel.app

---

## What it does

Paste any text and Verascript returns:

- An overall AI likelihood score with a colour-coded progress bar
- Sentence-by-sentence breakdown (high / medium / low / human)
- A plain-English verdict summary
- Inline rewrite suggestions for flagged sentences

Built as a personal project to explore full-stack AI application development and production deployment patterns.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend & API routes | Next.js 14 (App Router) |
| AI detection & rewrites | Anthropic Claude API |
| Authentication | Supabase Auth (OTP, passwordless) |
| Database | Supabase Postgres |
| Styling | Tailwind CSS |
| Deployment | Vercel (CI/CD via GitHub) |

---

## Access Model

| Tier | Analyses | Price |
|---|---|---|
| Free | 5 / month | $0 |
| Pro | Unlimited | $12 / month |

---

## Project Structure

```
app/
  ├── page.js              # Main analysis UI
  ├── layout.js            # Root layout
  ├── globals.css          # Global styles
  └── api/
      └── detect/
          └── route.js     # Claude API endpoint
```

---

## Local Setup

See [SETUP.md](./SETUP.md) for full instructions.

---

## License

MIT
