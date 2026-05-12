import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { daysSince, rustLevel, readinessScore } from '@/lib/scoring';

// -------------------------------------------------------
// daysSince
// -------------------------------------------------------

describe('daysSince', () => {
  it('returns 0 for today (UTC)', () => {
    const now = new Date();
    const todayIso = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
    expect(daysSince(todayIso)).toBe(0);
  });

  it('returns 1 for yesterday', () => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 1);
    const iso = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    expect(daysSince(iso)).toBe(1);
  });

  it('returns 30 for a date 30 days ago', () => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 30);
    const iso = d.toISOString().split('T')[0];
    expect(daysSince(iso)).toBe(30);
  });

  it('returns 365 for a date 365 days ago', () => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 365);
    const iso = d.toISOString().split('T')[0];
    expect(daysSince(iso)).toBe(365);
  });

  it('returns 0 for a future date (clamps to 0)', () => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 5);
    const iso = d.toISOString().split('T')[0];
    expect(daysSince(iso)).toBe(0);
  });
});

// -------------------------------------------------------
// rustLevel
// -------------------------------------------------------

describe('rustLevel', () => {
  it('returns Fresh for 0 days', () => {
    const result = rustLevel(0);
    expect(result.label).toBe('Fresh');
    expect(result.colorHint).toBe('green');
  });

  it('returns Fresh for 29 days', () => {
    expect(rustLevel(29).label).toBe('Fresh');
  });

  it('returns Warming Up for 30 days', () => {
    const result = rustLevel(30);
    expect(result.label).toBe('Warming Up');
    expect(result.colorHint).toBe('yellow');
  });

  it('returns Warming Up for 89 days', () => {
    expect(rustLevel(89).label).toBe('Warming Up');
  });

  it('returns Rusty for 90 days', () => {
    const result = rustLevel(90);
    expect(result.label).toBe('Rusty');
    expect(result.colorHint).toBe('orange');
  });

  it('returns Rusty for 179 days', () => {
    expect(rustLevel(179).label).toBe('Rusty');
  });

  it('returns Very Rusty for 180 days', () => {
    const result = rustLevel(180);
    expect(result.label).toBe('Very Rusty');
    expect(result.colorHint).toBe('red');
  });

  it('returns Very Rusty for 500 days', () => {
    expect(rustLevel(500).label).toBe('Very Rusty');
  });

  it('clamps negative days to 0 (Fresh)', () => {
    expect(rustLevel(-10).label).toBe('Fresh');
  });

  it('returns non-empty explanation', () => {
    expect(rustLevel(0).explanation.length).toBeGreaterThan(0);
    expect(rustLevel(60).explanation.length).toBeGreaterThan(0);
    expect(rustLevel(120).explanation.length).toBeGreaterThan(0);
    expect(rustLevel(200).explanation.length).toBeGreaterThan(0);
  });
});

// -------------------------------------------------------
// readinessScore
// -------------------------------------------------------

describe('readinessScore', () => {
  it('returns max score for an ideal fresh pilot', () => {
    const result = readinessScore({
      daysSinceFlight: 0,
      landings90: 10,
      nightLandings90: 3,
      toweredRecent: true,
      confidence1to5: 5,
    });
    expect(result.score).toBe(100);
    expect(result.breakdown.length).toBeGreaterThan(0);
  });

  it('returns 0 for a maximally rusty pilot with no currency', () => {
    const result = readinessScore({
      daysSinceFlight: 999,
      landings90: 0,
      nightLandings90: 0,
      toweredRecent: false,
      confidence1to5: 1,
    });
    expect(result.score).toBe(0);
  });

  it('score increases with more landings', () => {
    const base = {
      daysSinceFlight: 60,
      nightLandings90: 0,
      toweredRecent: false,
      confidence1to5: 3,
    };
    const low = readinessScore({ ...base, landings90: 0 });
    const high = readinessScore({ ...base, landings90: 10 });
    expect(high.score).toBeGreaterThan(low.score);
  });

  it('towered airport adds 10 points', () => {
    const base = {
      daysSinceFlight: 60,
      landings90: 5,
      nightLandings90: 0,
      confidence1to5: 3,
    };
    const noTower = readinessScore({ ...base, toweredRecent: false });
    const tower = readinessScore({ ...base, toweredRecent: true });
    expect(tower.score - noTower.score).toBe(10);
  });

  it('score is clamped to [0, 100]', () => {
    const result = readinessScore({
      daysSinceFlight: 0,
      landings90: 100,
      nightLandings90: 100,
      toweredRecent: true,
      confidence1to5: 5,
    });
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('breakdown contains recency, landingCurrency, nightCurrency, toweredOps, selfConfidence', () => {
    const result = readinessScore({
      daysSinceFlight: 30,
      landings90: 5,
      nightLandings90: 1,
      toweredRecent: true,
      confidence1to5: 4,
    });
    const keys = result.breakdown.map(b => b.key);
    expect(keys).toContain('recency');
    expect(keys).toContain('landingCurrency');
    expect(keys).toContain('nightCurrency');
    expect(keys).toContain('toweredOps');
    expect(keys).toContain('selfConfidence');
  });

  it('night currency: 0 landings → 0 pts', () => {
    const result = readinessScore({
      daysSinceFlight: 0,
      landings90: 10,
      nightLandings90: 0,
      toweredRecent: true,
      confidence1to5: 5,
    });
    const night = result.breakdown.find(b => b.key === 'nightCurrency')!;
    expect(night.points).toBe(0);
  });

  it('night currency: 1-2 landings → 4 pts', () => {
    const result = readinessScore({
      daysSinceFlight: 0,
      landings90: 10,
      nightLandings90: 2,
      toweredRecent: true,
      confidence1to5: 5,
    });
    const night = result.breakdown.find(b => b.key === 'nightCurrency')!;
    expect(night.points).toBe(4);
  });

  it('night currency: 3+ landings → 10 pts', () => {
    const result = readinessScore({
      daysSinceFlight: 0,
      landings90: 10,
      nightLandings90: 3,
      toweredRecent: true,
      confidence1to5: 5,
    });
    const night = result.breakdown.find(b => b.key === 'nightCurrency')!;
    expect(night.points).toBe(10);
  });

  it('recency decays linearly to 0 at 180 days', () => {
    const result180 = readinessScore({
      daysSinceFlight: 180,
      landings90: 0,
      nightLandings90: 0,
      toweredRecent: false,
      confidence1to5: 1,
    });
    const recency = result180.breakdown.find(b => b.key === 'recency')!;
    expect(recency.points).toBe(0);
  });

  it('landings < 3 → 0 landing pts (not current)', () => {
    const result = readinessScore({
      daysSinceFlight: 0,
      landings90: 2,
      nightLandings90: 0,
      toweredRecent: false,
      confidence1to5: 1,
    });
    const landing = result.breakdown.find(b => b.key === 'landingCurrency')!;
    expect(landing.points).toBe(0);
  });
});
