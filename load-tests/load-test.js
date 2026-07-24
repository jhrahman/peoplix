// Simple k6 load test for Peoplix. Only makes GET requests, so it's safe to run repeatedly
// against the real Supabase project, even from localhost - there's no separate local database
// for this app, so "local" just means "your machine," not "safe to mutate data on."
//
// Set these env vars first, then run:
//   k6 run -e SUPABASE_URL=https://xxxx.supabase.co -e SUPABASE_ANON_KEY=xxxx \
//          -e TEST_EMAIL=you@example.com -e TEST_PASSWORD=yourpassword \
//          load-tests/load-test.js
//
// Before running: build and start the app in production mode (not `next dev`, which is much
// slower and would give misleading numbers):
//   npm run build && npm run start

import http from "k6/http";
import encoding from "k6/encoding";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const SUPABASE_URL = __ENV.SUPABASE_URL;
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY;
const TEST_EMAIL = __ENV.TEST_EMAIL;
const TEST_PASSWORD = __ENV.TEST_PASSWORD;

export const options = {
  vus: Number(__ENV.VUS || 50),
  duration: __ENV.DURATION || "1m",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1500"],
  },
};

// Runs once before the load starts (not once per virtual user), so we're not spamming Supabase's
// login endpoint with 50+ simultaneous sign-ins - every VU just reuses this one session, same as
// 50 people who are already logged in and clicking around.
export function setup() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error(
      "Set SUPABASE_URL, SUPABASE_ANON_KEY, TEST_EMAIL, and TEST_PASSWORD env vars first - see load-tests/README.md",
    );
  }

  const res = http.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    { headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" } },
  );
  if (res.status !== 200) {
    throw new Error(`Login failed: HTTP ${res.status} - ${res.body}`);
  }

  // Rebuilds the same session cookie @supabase/ssr sets after a real browser login
  // (see lib/supabase/server.ts in the main app), so the app treats this like a logged-in user.
  const session = JSON.parse(res.body);
  const projectRef = SUPABASE_URL.replace(/^https?:\/\//, "").split(".")[0];
  const cookieValue = "base64-" + encoding.b64encode(JSON.stringify(session), "rawurl");

  return { cookieHeader: `sb-${projectRef}-auth-token=${cookieValue}` };
}

const PAGES = ["/", "/directory", "/leave", "/holidays", "/overtime", "/attendance"];

export default function browse(data) {
  const page = PAGES[Math.floor(Math.random() * PAGES.length)];
  const res = http.get(`${BASE_URL}${page}`, {
    headers: { Cookie: data.cookieHeader },
    tags: { name: page },
  });

  check(res, { "status is 200": (r) => r.status === 200 });
  sleep(1);
}
