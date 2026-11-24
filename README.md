# الیت (Elite)

A team of six AI agents that helps the admin check an almost-finished product before it is delivered to the client.

| # | Step | Agent | What happens |
|---|------|-------|--------------|
| 1 | Source | Kaveh, Code & Product Analyst | Admin adds a Git URL and/or a markdown file; Kaveh reads the repo and summarises the product |
| 2 | Features | Niloufar, Feature Analyst | Lists existing features (required / optional); admin ticks, adds, removes, approves |
| 3 | User journeys | Arash, User Journey Designer | Journeys for each approved feature; admin ticks, adds, removes, approves |
| 4 | Acceptance criteria | Sara, Acceptance Criteria Engineer | Given/When/Then criteria; admin adds/removes, finalises |
| 5 | Approve criteria | Behrad, QA Reviewer | Pre-reviews each criterion against the code; admin passes / fails / skips each one |
| 6 | Report | Mahsa, Delivery Reporter | Final report: done vs required vs optional, percentages, recommendation |

```
apps/
  web/   Next.js 16 (App Router, Tailwind, RTL, Vazirmatn)  -> http://localhost:3000
  api/   NestJS 11                                           -> http://localhost:3001/api
```

## Local setup

```bash
npm install
copy apps\api\.env.example apps\api\.env      # Windows (cp on mac/linux)
npm run dev
```

Log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `apps/api/.env`
(in development, if they're empty, the defaults are `admin@elite.app` / `admin123`).

Without `OPENAI_API_KEY` the agents run in **demo mode**: Kaveh still reads the real GitHub repo,
and the other agents produce template output, so the whole flow can be tried.

## API

All routes except `/api/health` and `/api/auth/login` need `Authorization: Bearer <token>`.

| Method | Route | Agent |
|--------|-------|-------|
| POST | `/api/auth/login` | – |
| GET | `/api/auth/me` | – |
| POST | `/api/sources/analyze` | Kaveh |
| POST | `/api/agents/features` | Niloufar |
| POST | `/api/agents/journeys` | Arash |
| POST | `/api/agents/criteria` | Sara |
| POST | `/api/agents/review` | Behrad |
| POST | `/api/agents/report` | Mahsa |

The API is stateless for now (the browser stores products in localStorage and sends context with each call),
so it runs on serverless as is. When the database is added, products move to the API.

## Deploy to Vercel (one project)

`vercel.json` uses **Vercel Services**: one project, one domain.
`/api/*` goes to the NestJS service (`apps/api`), everything else to the Next.js service (`apps/web`).

1. Import the repo in Vercel as a single project (Root Directory: the repo root).
2. Add environment variables: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `AUTH_SECRET`, `OPENAI_API_KEY`
   (optional: `OPENAI_MODEL`, `OPENAI_BASE_URL`, `GITHUB_TOKEN`).
   `NEXT_PUBLIC_API_URL` and `WEB_ORIGIN` are not needed: web and API share the domain.
3. Deploy. Login is refused until `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `AUTH_SECRET` are set.
