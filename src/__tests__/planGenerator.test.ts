import { describe, it, expect } from 'vitest';
import { generateStudyPlan, PlanGeneratorInput } from '@/lib/planGenerator';

const baseInput: PlanGeneratorInput = {
  aircraftVariantId: 'c172sp-g1000',
  airportType: 'towered',
  airspace: 'D',
  conditions: {
    night: false,
    windy: false,
    crosswindPractice: false,
    shortField: false,
    softField: false,
  },
  passengers: false,
  daysSinceFlight: 60,
};

describe('generateStudyPlan', () => {
  it('returns a plan with 4 sections', () => {
    const plan = generateStudyPlan(baseInput);
    expect(plan.sections).toHaveLength(4);
  });

  it('plan sections have required titles', () => {
    const plan = generateStudyPlan(baseInput);
    const titles = plan.sections.map(s => s.title);
    expect(titles).toContain('Systems Review');
    expect(titles).toContain('Normal Procedures');
    expect(titles).toContain('Airport Operations');
    expect(titles).toContain('Emergency Quick Hits');
  });

  it('each section has items', () => {
    const plan = generateStudyPlan(baseInput);
    for (const section of plan.sections) {
      expect(section.items.length).toBeGreaterThan(0);
    }
  });

  it('all items have kind="tagGroup", a tag, and a label', () => {
    const plan = generateStudyPlan(baseInput);
    for (const section of plan.sections) {
      for (const item of section.items) {
        expect(item.kind).toBe('tagGroup');
        expect(typeof item.tag).toBe('string');
        expect(item.tag.length).toBeGreaterThan(0);
        expect(typeof item.label).toBe('string');
        expect(item.label.length).toBeGreaterThan(0);
      }
    }
  });

  it('estTotalMinutes > 0', () => {
    const plan = generateStudyPlan(baseInput);
    expect(plan.estTotalMinutes).toBeGreaterThan(0);
  });

  it('includes night-ops tags when night=true', () => {
    const plan = generateStudyPlan({
      ...baseInput,
      conditions: { ...baseInput.conditions, night: true },
    });
    const allTags = plan.sections.flatMap(s => s.items.map(i => i.tag));
    // night-related tags should appear
    const hasNight = allTags.some(t =>
      ['night-ops', 'lighting', 'pitot-static', 'night-departure', 'airport-lighting'].includes(t)
    );
    expect(hasNight).toBe(true);
  });

  it('includes crosswind tag when crosswindPractice=true', () => {
    const plan = generateStudyPlan({
      ...baseInput,
      conditions: { ...baseInput.conditions, crosswindPractice: true },
    });
    const allTags = plan.sections.flatMap(s => s.items.map(i => i.tag));
    expect(allTags).toContain('crosswind');
  });

  it('includes short-field tag when shortField=true', () => {
    const plan = generateStudyPlan({
      ...baseInput,
      conditions: { ...baseInput.conditions, shortField: true },
    });
    const allTags = plan.sections.flatMap(s => s.items.map(i => i.tag));
    expect(allTags).toContain('short-field');
  });

  it('includes passenger-briefing when passengers=true', () => {
    const plan = generateStudyPlan({ ...baseInput, passengers: true });
    const allTags = plan.sections.flatMap(s => s.items.map(i => i.tag));
    expect(allTags).toContain('passenger-briefing');
  });

  it('does NOT include passenger-briefing when passengers=false', () => {
    const plan = generateStudyPlan({ ...baseInput, passengers: false });
    const allTags = plan.sections.flatMap(s => s.items.map(i => i.tag));
    expect(allTags).not.toContain('passenger-briefing');
  });

  it('uid is empty string (caller must set)', () => {
    const plan = generateStudyPlan(baseInput);
    expect(plan.uid).toBe('');
  });

  it('title contains "Quick Refresh" for <30 days since flight', () => {
    const plan = generateStudyPlan({ ...baseInput, daysSinceFlight: 15 });
    expect(plan.title).toContain('Quick Refresh');
  });

  it('title contains "Rust Removal Plan" for 90–179 days', () => {
    const plan = generateStudyPlan({ ...baseInput, daysSinceFlight: 120 });
    expect(plan.title).toContain('Rust Removal Plan');
  });

  it('title contains "Full Comeback Plan" for 180+ days', () => {
    const plan = generateStudyPlan({ ...baseInput, daysSinceFlight: 200 });
    expect(plan.title).toContain('Full Comeback Plan');
  });

  it('title includes "Crosswind" suffix when crosswindPractice=true', () => {
    const plan = generateStudyPlan({
      ...baseInput,
      daysSinceFlight: 10,
      conditions: { ...baseInput.conditions, crosswindPractice: true },
    });
    expect(plan.title).toContain('Crosswind');
  });

  it('handles very rusty pilot (>180 days) — extra emergency items', () => {
    const plan = generateStudyPlan({ ...baseInput, daysSinceFlight: 200 });
    const emergencySection = plan.sections.find(s => s.title === 'Emergency Quick Hits')!;
    const tags = emergencySection.items.map(i => i.tag);
    // vacuum-failure only appears for >180 days
    expect(tags).toContain('vacuum-failure');
  });

  it('non-towered airport includes ctaf tag', () => {
    const plan = generateStudyPlan({ ...baseInput, airportType: 'nonTowered' });
    const allTags = plan.sections.flatMap(s => s.items.map(i => i.tag));
    expect(allTags).toContain('ctaf');
  });

  it('inputs.aircraftVariantId matches the input', () => {
    const plan = generateStudyPlan(baseInput);
    expect(plan.inputs.aircraftVariantId).toBe('c172sp-g1000');
  });

  it('inputs.daysSinceLastFlight matches the input', () => {
    const plan = generateStudyPlan(baseInput);
    expect(plan.inputs.daysSinceLastFlight).toBe(60);
  });

  it('no duplicate tags within any section', () => {
    const plan = generateStudyPlan(baseInput);
    for (const section of plan.sections) {
      const tags = section.items.map(i => i.tag);
      const unique = [...new Set(tags)];
      expect(tags).toHaveLength(unique.length);
    }
  });
});
