import { describe, it, expect } from 'vitest';
import { generateAllRuns } from './generateData';

describe('Training Data Generator & Processing', () => {
  it('should generate all 20 training runs correctly', () => {
    const runs = generateAllRuns();
    expect(runs.length).toBe(20);
  });

  it('should include a large dataset (1M points) in the generated runs', () => {
    const runs = generateAllRuns();
    const largeRun = runs.find(r => r.totalSteps === 1_000_000);
    
    expect(largeRun).toBeDefined();
    expect(largeRun?.data.length).toBe(1_000_000);
  });

  it('should correctly inject NaN and Infinity anomalies in specific runs', () => {
    const runs = generateAllRuns();
    const explodingRun = runs.find(r => r.hasNan);
    
    expect(explodingRun).toBeDefined();
    if (explodingRun) {
      const hasInvalidValues = explodingRun.data.some(
        d => isNaN(d.loss) || !isFinite(d.loss)
      );
      expect(hasInvalidValues).toBe(true);
    }
  });

  it('should mark runs with gaps or duplicates properly', () => {
    const runs = generateAllRuns();
    const gapRun = runs.find(r => r.hasGaps);
    
    expect(gapRun).toBeDefined();
  });
});