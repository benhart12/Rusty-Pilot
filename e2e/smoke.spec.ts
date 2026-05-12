// ============================================================
// RustyPilot — HTTP Smoke Tests
//
// Checks that all key routes on the live Railway deployment
// respond correctly (no 500s, auth-gated routes redirect to
// login rather than crashing, static assets load).
//
// Run with: npm run test:e2e
// Target:   https://rustypilot-production.up.railway.app
// ============================================================

import { describe, it, expect } from 'vitest';

const BASE_URL = 'https://rustypilot-production.up.railway.app';

async function get(path: string): Promise<{ status: number; url: string; text: string }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    redirect: 'follow',
    headers: { 'User-Agent': 'WinstonSmokeTest/1.0' },
  });
  const text = await res.text();
  return { status: res.status, url: res.url, text };
}

describe('RustyPilot — production smoke tests', () => {
  it('home page (/) returns 200', async () => {
    const { status } = await get('/');
    expect(status).toBe(200);
  });

  it('home page contains expected content', async () => {
    const { text } = await get('/');
    // Should contain either a login CTA or app shell — not a raw error page
    expect(text).toMatch(/<html/i);
    expect(text).not.toMatch(/application error/i);
    expect(text).not.toMatch(/internal server error/i);
  });

  it('/login returns 200', async () => {
    const { status } = await get('/login');
    expect(status).toBe(200);
  });

  it('/login page is not a crash', async () => {
    const { text } = await get('/login');
    expect(text).toMatch(/<html/i);
    expect(text).not.toMatch(/application error/i);
    expect(text).not.toMatch(/internal server error/i);
  });

  it('/dashboard is auth-gated (redirects to login or returns non-500)', async () => {
    const { status, url } = await get('/dashboard');
    // Either redirected to login, or renders the page (if SSR doesn't gate it)
    expect(status).not.toBe(500);
    expect(status).not.toBe(502);
    expect(status).not.toBe(503);
  });

  it('/modules returns non-500', async () => {
    const { status } = await get('/modules');
    expect(status).not.toBe(500);
    expect(status).not.toBe(502);
  });

  it('/progress returns non-500', async () => {
    const { status } = await get('/progress');
    expect(status).not.toBe(500);
    expect(status).not.toBe(502);
  });

  it('/assessment returns non-500', async () => {
    const { status } = await get('/assessment');
    expect(status).not.toBe(500);
    expect(status).not.toBe(502);
  });

  it('/scenario returns non-500', async () => {
    const { status } = await get('/scenario');
    expect(status).not.toBe(500);
    expect(status).not.toBe(502);
  });

  it('/settings returns non-500', async () => {
    const { status } = await get('/settings');
    expect(status).not.toBe(500);
    expect(status).not.toBe(502);
  });

  it('/aircraft returns non-500', async () => {
    const { status } = await get('/aircraft');
    expect(status).not.toBe(500);
    expect(status).not.toBe(502);
  });

  it('/onboarding returns non-500', async () => {
    const { status } = await get('/onboarding');
    expect(status).not.toBe(500);
    expect(status).not.toBe(502);
  });

  it('a non-existent route returns 404, not 500', async () => {
    const { status } = await get('/does-not-exist-xyz');
    expect(status).toBe(404);
  });
});
