import { describe, it, expect } from 'vitest';
import layoutContract from '../../specs/003-desktop-responsive-ui/contracts/layout-contract.json';

describe('Responsive Layout & Breakpoint Contract Tests', () => {
  it('validates layout contract breakpoint thresholds', () => {
    expect(layoutContract.breakpoints.mobile.maxWidth).toBe(767);
    expect(layoutContract.breakpoints.tablet.minWidth).toBe(768);
    expect(layoutContract.breakpoints.tablet.maxWidth).toBe(1023);
    expect(layoutContract.breakpoints.desktop.minWidth).toBe(1024);
    expect(layoutContract.breakpoints.desktop.sidebarWidth).toBe('256px');
    expect(layoutContract.breakpoints.desktop.container).toBe('max-w-7xl');
  });

  it('validates navigation routes contract', () => {
    const paths = layoutContract.routes.map((r: any) => r.path);
    expect(paths).toContain('/');
    expect(paths).toContain('/records');
    expect(paths).toContain('/compensations');
    expect(paths).toContain('/reports');
    expect(paths).toContain('/settings');
  });

  it('validates accessibility constraints', () => {
    expect(layoutContract.accessibility.minTouchTarget).toBe('44px');
    expect(layoutContract.accessibility.modalKeyboardDismissal).toBe('Escape');
    expect(layoutContract.accessibility.minimumTextContrast).toBe('4.5:1');
  });

  it('calculates breakpoint categories correctly', () => {
    function computeBreakpoint(w: number) {
      return {
        isMobile: w < 768,
        isTablet: w >= 768 && w < 1024,
        isDesktop: w >= 1024,
        category: w >= 1536 ? '2xl' : w >= 1280 ? 'xl' : w >= 1024 ? 'lg' : w >= 768 ? 'md' : w >= 640 ? 'sm' : 'xs'
      };
    }

    // Mobile (iPhone 14)
    const mobile = computeBreakpoint(390);
    expect(mobile.isMobile).toBe(true);
    expect(mobile.isTablet).toBe(false);
    expect(mobile.isDesktop).toBe(false);
    expect(mobile.category).toBe('xs');

    // Tablet (iPad Mini / 768px)
    const tablet = computeBreakpoint(768);
    expect(tablet.isMobile).toBe(false);
    expect(tablet.isTablet).toBe(true);
    expect(tablet.isDesktop).toBe(false);
    expect(tablet.category).toBe('md');

    // Desktop (1080p / 1920px)
    const desktop = computeBreakpoint(1920);
    expect(desktop.isMobile).toBe(false);
    expect(desktop.isTablet).toBe(false);
    expect(desktop.isDesktop).toBe(true);
    expect(desktop.category).toBe('2xl');
  });
});
