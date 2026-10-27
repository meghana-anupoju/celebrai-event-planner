# CelebrAI — Your AI Celebration Planner

**PromptWars Virtual · Challenge 5: Celebration & Event Planner**

CelebrAI helps people plan weddings, birthdays, anniversaries, college events, and community celebrations. It turns event details into a personalized plan with a budget allocation, preparation timeline, vendor checklist, creative ideas, and risk notes. Budget Rescue helps users rebalance an over-budget plan.

## Why this project fits the challenge

- **Personalized event planning:** event type, date, location, guest count, theme, priorities, and special requests shape the plan.
- **Budget planning:** itemized allocations add up to the requested budget, with explicit estimates and contingency.
- **Budget Rescue:** deterministically reallocates flexible categories when a user needs to rethink spending; it does not make vendor bookings or quotes.
- **Timeline:** date-based preparation tasks can be marked complete.
- **Vendor checklist:** track vendors through To contact, Contacted, and Booked states.
- **Personalized ideas:** suggestions are tailored to the selected event type and theme.
- **Privacy-conscious local persistence:** plans are saved in the current browser's local storage, not a remote database. When live AI is enabled, event details are sent to Google Gemini for generation.
- **AI integration:** Gemini is called only from a server-side API route. A local demo plan is available without an API key.

## Tech stack

- Next.js 14 App Router and React 18
- TypeScript
- Google Generative AI SDK (Gemini)
- Zod input validation
- Vitest unit tests
- Browser local storage for MVP persistence

## Run locally

Prerequisites: Node.js 20 or newer and npm.

```bash
npm install
cp .env.example .env.local
# Add your Gemini API key to .env.local (optional for demo mode)
npm run dev
```

Open `http://localhost:3000`.

Without a key, the app generates a deterministic demo plan. For live generation, create a Gemini API key through Google AI Studio and set `GEMINI_API_KEY` in `.env.local`.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | Only for live AI | Server-side Gemini API key. Never expose it with a `NEXT_PUBLIC_` prefix. |
| `GEMINI_MODEL` | No | Model name; defaults to `gemini-2.5-flash`. |

Do not commit `.env`, `.env.local`, API keys, or deployment secrets.

## Tests and checks

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

The test suite covers schema validation, event-type validation, budget-total invariants, demo plan structure, and Budget Rescue totals. Run these commands in the target Node/npm environment before submitting; do not treat the presence of tests as proof that they passed.

## Deploy on one platform (Vercel)

1. Push this repository to a **public** GitHub repository.
2. Import the repository into Vercel as a Next.js project.
3. In Vercel project settings, add `GEMINI_API_KEY` and optionally `GEMINI_MODEL` under Environment Variables.
4. Deploy and test the generated plan route and UI on the deployed URL.
5. Keep the repository public and ensure the video link is unlisted on YouTube or accessible to viewers in Google Drive.

The frontend and `/api/plan` server route deploy together. No separate backend host is needed.

## Repository size

Keep the Git repository under the competition's 10 MB limit. Do not commit `node_modules`, `.next`, `out`, coverage reports, recordings, or large screenshots. The generated demo poster/video should be linked in the submission rather than stored in this source repository unless needed.

## Security and limitations

- API keys are read from server-side environment variables.
- API request data is validated with Zod and bounded by field limits.
- The API returns a generic error to clients and avoids returning provider internals.
- User plans stay in browser local storage. Anyone using the same browser profile may be able to access them; avoid entering sensitive personal information on shared devices.
- When `GEMINI_API_KEY` is configured, event details—including optional notes—are sent to Google Gemini. Use the local demo mode if you do not want event details sent to the AI provider.
- AI output and sample vendor information are suggestions, not verified quotes, reviews, availability, or bookings.
- Costs are estimates. Confirm prices, taxes, vendor terms, accessibility arrangements, and local requirements directly.
- For production use, add rate limiting at the edge, stronger generated-output schema validation, and a clear privacy/retention policy.

## Accessibility

The UI includes associated form labels, semantic headings and sections, keyboard focus styles, accessible names for navigation, status/error announcements, responsive layouts, and reduced-motion support. Please verify keyboard navigation and contrast after any visual customization.

## License

MIT. See `LICENSE`.
