import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearchSuggestionsDropdown } from './use-search-suggestions-dropdown.js';

/**
 * Creates a minimal mock of a SearchBox/StandaloneSearchBox controller
 * with enough surface to drive the hook under test.
 */
function createMockSearchBoxController(initial = '') {
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());
  const ctrl: any = {
    state: {
      value: initial,
      suggestions: [] as Array<{ rawValue: string; highlightedValue: string }>,
      isLoading: false,
      isLoadingSuggestions: false,
    },
    subscribe(cb: () => void) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    updateText: vi.fn((value: string) => {
      ctrl.state = { ...ctrl.state, value };
      notify();
    }),
    showSuggestions: vi.fn(),
    clear: vi.fn(() => {
      ctrl.state = { ...ctrl.state, value: '', suggestions: [] };
      notify();
    }),
    submit: vi.fn(),
    selectSuggestion: vi.fn(),
    /** Test helper: emit a state change to subscribers */
    emit(patch: Partial<typeof ctrl.state>) {
      ctrl.state = { ...ctrl.state, ...patch };
      notify();
    },
  };
  return ctrl;
}

describe('useSearchSuggestionsDropdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls showSuggestions and opens the dropdown on focus', () => {
    const searchBoxController = createMockSearchBoxController();

    const { result } = renderHook(() =>
      useSearchSuggestionsDropdown({ searchBoxController })
    );

    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.handleFocus();
    });

    expect(searchBoxController.showSuggestions).toHaveBeenCalledTimes(1);
    expect(result.current.isOpen).toBe(true);
  });

  describe('close triggers and re-focus reopen', () => {
    it('closes on click-outside (mousedown outside containerRef)', () => {
      const searchBoxController = createMockSearchBoxController();

      const { result } = renderHook(() =>
        useSearchSuggestionsDropdown({ searchBoxController })
      );

      act(() => {
        result.current.handleFocus();
      });
      expect(result.current.isOpen).toBe(true);

      act(() => {
        document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('does NOT close on mousedown inside containerRef', () => {
      const searchBoxController = createMockSearchBoxController();
      const container = document.createElement('div');
      document.body.appendChild(container);

      const { result } = renderHook(() =>
        useSearchSuggestionsDropdown({ searchBoxController })
      );

      (result.current.containerRef as any).current = container;

      act(() => {
        result.current.handleFocus();
      });
      expect(result.current.isOpen).toBe(true);

      act(() => {
        container.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      });

      expect(result.current.isOpen).toBe(true);

      document.body.removeChild(container);
    });

    it('closes on Escape keydown', () => {
      const searchBoxController = createMockSearchBoxController();

      const { result } = renderHook(() =>
        useSearchSuggestionsDropdown({ searchBoxController })
      );

      act(() => {
        result.current.handleFocus();
      });
      expect(result.current.isOpen).toBe(true);

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('closes on selectSuggestion', () => {
      const searchBoxController = createMockSearchBoxController();

      const { result } = renderHook(() =>
        useSearchSuggestionsDropdown({ searchBoxController })
      );

      act(() => {
        result.current.handleFocus();
      });
      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.handleSelectSuggestion({ rawValue: 'test', highlightedValue: 'test' });
      });

      expect(result.current.isOpen).toBe(false);
      expect(searchBoxController.selectSuggestion).toHaveBeenCalledWith('test');
    });

    it('closes on submit', () => {
      const searchBoxController = createMockSearchBoxController('query');

      const { result } = renderHook(() =>
        useSearchSuggestionsDropdown({ searchBoxController })
      );

      act(() => {
        result.current.handleFocus();
      });
      expect(result.current.isOpen).toBe(true);

      const preventDefault = vi.fn();
      act(() => {
        result.current.handleSubmit({ preventDefault } as any);
      });

      expect(result.current.isOpen).toBe(false);
      expect(preventDefault).toHaveBeenCalled();
    });

    it('closes on clear', () => {
      const searchBoxController = createMockSearchBoxController('query');

      const { result } = renderHook(() =>
        useSearchSuggestionsDropdown({ searchBoxController })
      );

      act(() => {
        result.current.handleFocus();
      });
      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.handleClear();
      });

      expect(result.current.isOpen).toBe(false);
      expect(searchBoxController.clear).toHaveBeenCalled();
    });

    it('re-focus reopens after close', () => {
      const searchBoxController = createMockSearchBoxController();

      const { result } = renderHook(() =>
        useSearchSuggestionsDropdown({ searchBoxController })
      );

      act(() => {
        result.current.handleFocus();
      });
      expect(result.current.isOpen).toBe(true);

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      });
      expect(result.current.isOpen).toBe(false);

      act(() => {
        result.current.handleFocus();
      });
      expect(result.current.isOpen).toBe(true);
      expect(searchBoxController.showSuggestions).toHaveBeenCalledTimes(2);
    });
  });

  describe('handleChange drives only Query Suggestions (updateText)', () => {
    it('debounces updateText so Query Suggestions fire at any length, ungated', () => {
      const searchBoxController = createMockSearchBoxController();

      const { result } = renderHook(() =>
        useSearchSuggestionsDropdown({ searchBoxController, debounceMs: 300 })
      );

      act(() => {
        result.current.handleChange('dr');
      });
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // updateText fires (Query Suggestions ungated, even at 2 chars). The hook
      // does not touch any suggestion source's controller — Filter Suggestions
      // and Instant Products drive themselves off the committed Effective Query.
      expect(searchBoxController.updateText).toHaveBeenCalledWith('dr');
    });

    it('opens the dropdown immediately on keystroke (before the debounce fires)', () => {
      const searchBoxController = createMockSearchBoxController();

      const { result } = renderHook(() =>
        useSearchSuggestionsDropdown({ searchBoxController, debounceMs: 300 })
      );

      act(() => {
        result.current.handleChange('a');
      });

      expect(result.current.isOpen).toBe(true);
    });
  });

  describe('no-flash / hold-through-loading', () => {
    it('stays open when suggestions transition from populated → loading → empty', () => {
      const searchBoxController = createMockSearchBoxController();

      const { result } = renderHook(() =>
        useSearchSuggestionsDropdown({ searchBoxController })
      );

      act(() => {
        result.current.handleFocus();
      });
      expect(result.current.isOpen).toBe(true);

      act(() => {
        searchBoxController.emit({
          suggestions: [{ rawValue: 'popular', highlightedValue: 'popular' }],
          isLoadingSuggestions: false,
        });
      });
      expect(result.current.isOpen).toBe(true);

      act(() => {
        searchBoxController.emit({ isLoadingSuggestions: true });
      });
      expect(result.current.isOpen).toBe(true);

      act(() => {
        searchBoxController.emit({ suggestions: [], isLoadingSuggestions: false });
      });

      // Hook stays open — content-gating is the dropdown's job, not the hook's.
      expect(result.current.isOpen).toBe(true);
    });

    it('stays open when focus triggers showSuggestions but model returns empty', () => {
      const searchBoxController = createMockSearchBoxController();

      const { result } = renderHook(() =>
        useSearchSuggestionsDropdown({ searchBoxController })
      );

      act(() => {
        result.current.handleFocus();
      });
      expect(result.current.isOpen).toBe(true);

      act(() => {
        searchBoxController.emit({ suggestions: [], isLoadingSuggestions: false });
      });

      // isOpen is purely intent-driven — doesn't react to content.
      expect(result.current.isOpen).toBe(true);
    });
  });

  describe('debounce behavior — focus is immediate, typing is debounced', () => {
    it('handleFocus calls showSuggestions immediately (no timer)', () => {
      const searchBoxController = createMockSearchBoxController('test');

      const { result } = renderHook(() =>
        useSearchSuggestionsDropdown({ searchBoxController, debounceMs: 300 })
      );

      act(() => {
        result.current.handleFocus();
      });

      expect(result.current.isOpen).toBe(true);
      expect(searchBoxController.showSuggestions).toHaveBeenCalledTimes(1);
    });

    it('handleChange does NOT call updateText until debounce elapses', () => {
      const searchBoxController = createMockSearchBoxController();

      const { result } = renderHook(() =>
        useSearchSuggestionsDropdown({ searchBoxController, debounceMs: 300 })
      );

      act(() => {
        result.current.handleChange('dri');
      });

      expect(searchBoxController.updateText).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(searchBoxController.updateText).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(searchBoxController.updateText).toHaveBeenCalledWith('dri');
    });
  });
});
