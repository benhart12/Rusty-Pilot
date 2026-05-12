import { describe, it, expect } from 'vitest';
import { ROUTES, plan, moduleRoute, drillSession } from '@/lib/routes';

// -------------------------------------------------------
// ROUTES constants
// -------------------------------------------------------

describe('ROUTES constants', () => {
  it('home is "/"', () => {
    expect(ROUTES.home).toBe('/');
  });

  it('login is "/login"', () => {
    expect(ROUTES.login).toBe('/login');
  });

  it('onboarding is "/onboarding"', () => {
    expect(ROUTES.onboarding).toBe('/onboarding');
  });

  it('dashboard is "/dashboard"', () => {
    expect(ROUTES.dashboard).toBe('/dashboard');
  });

  it('aircraft is "/aircraft"', () => {
    expect(ROUTES.aircraft).toBe('/aircraft');
  });

  it('assessment is "/assessment"', () => {
    expect(ROUTES.assessment).toBe('/assessment');
  });

  it('scenario is "/scenario"', () => {
    expect(ROUTES.scenario).toBe('/scenario');
  });

  it('modules is "/modules"', () => {
    expect(ROUTES.modules).toBe('/modules');
  });

  it('progress is "/progress"', () => {
    expect(ROUTES.progress).toBe('/progress');
  });

  it('settings is "/settings"', () => {
    expect(ROUTES.settings).toBe('/settings');
  });

  it('all values are strings starting with "/"', () => {
    for (const value of Object.values(ROUTES)) {
      expect(typeof value).toBe('string');
      expect(value.startsWith('/')).toBe(true);
    }
  });
});

// -------------------------------------------------------
// plan() builder
// -------------------------------------------------------

describe('plan()', () => {
  it('returns /plan/<id>', () => {
    expect(plan('abc123')).toBe('/plan/abc123');
  });

  it('encodes special characters in id', () => {
    expect(plan('hello world')).toBe('/plan/hello%20world');
  });

  it('encodes slash in id', () => {
    expect(plan('a/b')).toBe('/plan/a%2Fb');
  });

  it('throws on empty id', () => {
    expect(() => plan('')).toThrow();
  });

  it('returns string starting with /plan/', () => {
    const result = plan('test-id');
    expect(result.startsWith('/plan/')).toBe(true);
  });
});

// -------------------------------------------------------
// moduleRoute() builder
// -------------------------------------------------------

describe('moduleRoute()', () => {
  it('returns /modules/<id>', () => {
    expect(moduleRoute('eng-001')).toBe('/modules/eng-001');
  });

  it('encodes special characters in id', () => {
    expect(moduleRoute('eng 001')).toBe('/modules/eng%20001');
  });

  it('throws on empty id', () => {
    expect(() => moduleRoute('')).toThrow();
  });

  it('returns string starting with /modules/', () => {
    const result = moduleRoute('fuel-sys');
    expect(result.startsWith('/modules/')).toBe(true);
  });
});

// -------------------------------------------------------
// drillSession() builder
// -------------------------------------------------------

describe('drillSession()', () => {
  it('returns /drill/session with no params', () => {
    expect(drillSession()).toBe('/drill/session');
  });

  it('returns /drill/session with empty params object', () => {
    expect(drillSession({})).toBe('/drill/session');
  });

  it('appends query string for type and moduleId', () => {
    const result = drillSession({ type: 'flashcard', moduleId: 'eng-001' });
    expect(result.startsWith('/drill/session?')).toBe(true);
    expect(result).toContain('type=flashcard');
    expect(result).toContain('moduleId=eng-001');
  });

  it('appends single param correctly', () => {
    const result = drillSession({ type: 'mcq' });
    expect(result).toBe('/drill/session?type=mcq');
  });

  it('URL-encodes param values with spaces', () => {
    const result = drillSession({ label: 'hello world' });
    expect(result).toContain('label=hello+world');
  });
});
