// Simple k6 load test for Peoplix. Only makes GET requests, so it's safe to run repeatedly
// against the real Supabase project, even from localhost - there's no separate local database
// for this app, so "local" just means "your machine," not "safe to mutate data on."
//
// Set these env vars first, then run:
//   k6 run -e TEST_EMAIL=you@example.com -e TEST_PASSWORD=yourpassword load-tests/load-test.js
//
// Before running: build and start the app in production mode (not `next dev`, which is much
// slower and would give misleading numbers):
//   npm run build && npm run start

import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
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

// Runs once before the load starts (not once per virtual user), so we're not spamming the login
// endpoint with 50+ simultaneous sign-ins - every VU just reuses this one token, same as
// 50 people who are already logged in and clicking around.
export function setup() {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error("Set TEST_EMAIL and TEST_PASSWORD env vars first - see load-tests/README.md");
  }

  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    { headers: { "Content-Type": "application/json" }, tags: { name: "/api/auth/login" } },
  );
  if (res.status !== 200) {
    throw new Error(`Login failed: HTTP ${res.status} - ${res.body}`);
  }

  // POST /api/auth/login returns the tokens in the response body as well as setting the session
  // cookie, so there's no Supabase cookie encoding to reconstruct here (which is what this script
  // used to do). The app accepts this token as `Authorization: Bearer ...` on every page and every
  // /api/* route - see lib/supabase/server.ts.
  return { accessToken: res.json("data.access_token") };
}

const PAGES = ["/", "/directory", "/leave", "/holidays", "/overtime", "/attendance"];

export default function browse(data) {
  const page = PAGES[Math.floor(Math.random() * PAGES.length)];
  const res = http.get(`${BASE_URL}${page}`, {
    headers: { Authorization: `Bearer ${data.accessToken}` },
    tags: { name: page },
  });

  check(res, { "status is 200": (r) => r.status === 200 });
  sleep(1);
}
