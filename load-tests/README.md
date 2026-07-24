# Load testing (k6)

One simple script, GET requests only (dashboard, directory, leave, holidays, overtime, attendance
pages). Safe to run repeatedly, since it never creates or changes any data.

**Heads up:** there's no separate local Supabase for this project. `SUPABASE_URL` is the same real,
hosted database the live app uses, even when you're testing on `localhost`. That's exactly why this
script only reads data.

## Setup

1. Build and run the app in production mode (not `next dev`, which is much slower and gives
   misleading numbers):
   ```bash
   npm run build
   npm run start
   ```
2. Have a test account's email/password handy (any real login works, but a throwaway account you
   don't mind seeing "last active" timestamps on is nicer).

## Run it

```bash
k6 run -e SUPABASE_URL=https://your-project.supabase.co -e SUPABASE_ANON_KEY=your-anon-key -e TEST_EMAIL=you@example.com -e TEST_PASSWORD=yourpassword load-tests/load-test.js
```

`SUPABASE_URL`/`SUPABASE_ANON_KEY` are the same values as `NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_ANON_KEY` in your `.env.local`.

Defaults to 50 virtual users for 1 minute. Change either with `-e VUS=100 -e DURATION=3m`. If your
app isn't on port 3000, add `-e BASE_URL=http://localhost:PORT`.

Check the summary k6 prints at the end: `http_req_failed` should be close to 0%, and
`http_req_duration` (p95) tells you how fast the app actually feels under that load.
