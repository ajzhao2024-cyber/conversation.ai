# conversation.ai

`conversation.ai` turns a short topic into a polished, localized chat conversation. The site includes a public marketing page, an Instagram/WeChat-style Studio, PNG export, and a protected DeepSeek generation endpoint.

## Routes

- `/` marketing homepage
- `/studio/` multilingual conversation generator
- `/api/generate` DeepSeek-backed conversation endpoint

## Local setup

1. Use Node 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and fill in `DEEPSEEK_API_KEY`.
4. Run `npm run dev` and open the localhost URL Vercel prints.

The Studio presents an initial local preview. Press **Generate** to request a fresh structured conversation from the server.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | Yes | Server-only key for the DeepSeek Chat Completions API. |
| `DEEPSEEK_MODEL` | No | Defaults to `deepseek-v4-flash`. |
| `DEEPSEEK_BASE_URL` | No | Defaults to `https://api.deepseek.com`; override for a proxy or compatible gateway. |
| `UPSTASH_REDIS_REST_URL` | Production | Upstash REST endpoint for generation limits. |
| `UPSTASH_REDIS_REST_TOKEN` | Production | Upstash REST token for generation limits. |
| `ALLOWED_ORIGINS` | No | Comma-separated additional browser origins. |

The limiter permits six requests per IP per minute. In Vercel production, the endpoint fails closed with `503` when Upstash credentials are absent. Configure a Vercel Firewall rate-limit rule for `/api/generate` as a second protection layer.

## Deploy to Vercel

1. Import this repository into Vercel.
2. Add every value in `.env.example` to the appropriate Vercel environment. Keep `DEEPSEEK_API_KEY` server-only.
3. Run `npm run build` locally or let Vercel build the project.
4. Confirm `/`, `/studio/`, and `/api/generate` on the preview deployment.
5. Add a custom domain in the Vercel project only after its ownership is verified. The application does not hardcode a canonical domain.

## Verification

Run `npm test` for payload validation, renderer-safe response mapping, rate limiting, DeepSeek failure handling, and HTTP error states. Run `npm run build` with non-production test variables to validate the Vercel output.
