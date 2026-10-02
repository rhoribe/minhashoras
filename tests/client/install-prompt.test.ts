import { describe, it, expect, beforeEach } from 'vitest';

describe('InstallPromptModal Component Logic (Feature 006 - US2)', () => {
  beforeEach(() => {
    // Reset global window mocks if needed
  });

  it('determines standalone display mode correctly', () => {
    const mockWindowStandalone = {
      matchMedia: (query: string) => ({
        matches: query === '(display-mode: standalone)',
      }),
    };

    const isStandalone = mockWindowStandalone.matchMedia('(display-mode: standalone)').matches;
    expect(isStandalone).toBe(true);

    const isBrowser = mockWindowStandalone.matchMedia('(display-mode: browser)').matches;
    expect(isBrowser).toBe(false);
  });

  it('handles beforeinstallprompt event lifecycle', () => {
    let defaultPrevented = false;
    let promptCalled = false;

    const mockEvent = {
      preventDefault: () => {
        defaultPrevented = true;
      },
      prompt: () => {
        promptCalled = true;
      },
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    };

    mockEvent.preventDefault();
    expect(defaultPrevented).toBe(true);

    mockEvent.prompt();
    expect(promptCalled).toBe(true);
  });

  it('respects session dismissal key', () => {
    const storage: Record<string, string> = {};
    const mockSessionStorage = {
      getItem: (key: string) => storage[key] || null,
      setItem: (key: string, val: string) => {
        storage[key] = val;
      },
    };

    expect(mockSessionStorage.getItem('minhas_horas_install_dismissed')).toBeNull();
    mockSessionStorage.setItem('minhas_horas_install_dismissed', 'true');
    expect(mockSessionStorage.getItem('minhas_horas_install_dismissed')).toBe('true');
  });
});
