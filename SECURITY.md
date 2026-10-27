# Security notes

- Never commit API keys, `.env.local`, service-account files, or credentials.
- Gemini is called server-side only. Do not expose `GEMINI_API_KEY` to the browser.
- Treat model output as untrusted. Validate response shape and avoid rendering model-generated HTML.
- Do not enter sensitive personal information into event notes.
- Local storage is not encrypted and is accessible to scripts running in the same origin. Avoid shared-device use for private plans.
- Before production launch, configure request rate limiting, usage quotas, monitoring, and an abuse-reporting process.
- Report suspected security issues privately to the repository maintainer rather than posting secrets or exploit details publicly.
