import { describe, it, expect } from 'vitest';
import { calculateOvertimeMinutes, formatMinutesToDisplay } from '../../src/services/time-calculator.js';

describe('Time Calculator Service (Unit)', () => {
  it('calculates regular shift duration within same day', () => {
    // 18:00 to 20:30 = 2h 30m = 150m, 0m break
    const minutes = calculateOvertimeMinutes('18:00', '20:30', 0);
    expect(minutes).toBe(150);
  });

  it('deducts break duration correctly', () => {
    // 18:00 to 21:00 = 3h = 180m, minus 30m break = 150m
    const minutes = calculateOvertimeMinutes('18:00', '21:00', 30);
    expect(minutes).toBe(150);
  });

  it('handles overnight shifts crossing midnight correctly', () => {
    // 22:00 to 02:30 = 4h 30m = 270m, 0m break
    const minutes = calculateOvertimeMinutes('22:00', '02:30', 0);
    expect(minutes).toBe(270);
  });

  it('handles overnight shift crossing midnight with break', () => {
    // 22:00 to 02:30 = 270m, minus 30m break = 240m (4 hours)
    const minutes = calculateOvertimeMinutes('22:00', '02:30', 30);
    expect(minutes).toBe(240);
  });

  it('throws error when net duration is 0 or negative', () => {
    expect(() => calculateOvertimeMinutes('18:00', '18:00', 0)).toThrow();
    expect(() => calculateOvertimeMinutes('18:00', '19:00', 60)).toThrow();
    expect(() => calculateOvertimeMinutes('18:00', '19:00', 90)).toThrow();
  });

  it('throws error for invalid time format', () => {
    expect(() => calculateOvertimeMinutes('25:00', '18:00', 0)).toThrow();
    expect(() => calculateOvertimeMinutes('18:00', '18:65', 0)).toThrow();
    expect(() => calculateOvertimeMinutes('invalid', '18:00', 0)).toThrow();
  });

  it('formats minutes into human readable string', () => {
    expect(formatMinutesToDisplay(150)).toBe('2h 30m');
    expect(formatMinutesToDisplay(60)).toBe('1h 00m');
    expect(formatMinutesToDisplay(45)).toBe('0h 45m');
    expect(formatMinutesToDisplay(-90)).toBe('-1h 30m');
  });
});
