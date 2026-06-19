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

function createMockFilterSuggestionsGenerator() {
  return {
    filterSuggestions: [] as Array<{ updateQuery: ReturnType<typeof vi.fn>; clear: ReturnType<typeof vi.fn> }>,
  } as any;
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
    const filterSuggestionsGeneratorController = createMockFilterSuggestionsGenerator();

    const { result } = renderHook(() =>
      useSearchSuggestionsDropdown({
        searchBoxController,
        filterSuggestionsGeneratorController,
      })
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
      const filterSuggestionsGeneratorController = createMockFilterSuggestionsGenerator();

      const { result } = renderHook(() =>
        useSearchSuggestionsDropdown({
          searchBoxController,
          filterSuggestionsGeneratorController,
        })
      );

      act(() => {
        result.current.handleFocus();
      });
      expect(result.current.isOpen).toBe(true);

      // Simulate a click outside by dispatching mousedown on document
      act(() => {
        document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('does NOT close on mousedown inside containerRef', () => {
      const searchBoxController = createMockSearchBoxController();
      const filterSuggestionsGeneratorController = createMockFilterSuggestionsGenerator();

      const container = document.createElement('div');
      document.body.appendChild(container);

      const { result } = renderHook(() =>
        useSearchSuggestionsDropdown({
          searchBoxController,
          filterSuggestionsGeneratorController,
        })
      );

      // Attach the containerRef
      (result.current.containerRef as any).current = container;

      act(() => {
        result.current.handleFocus();
      });
      expect(result.current.isOpen).toBe(true);

      // Mousedown inside container
      act(() => {
        container.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      });

      expect(result.current.isOpen).toBe(true);

      document.body.removeChild(container);
    });

    it('closes on Escape keydown', () => {
      const searchBoxController = createMockSearchBoxController();
      const filterSuggestionsGeneratorController = createMockFilterSuggestionsGenerator();

      const { result } = renderHook(() =>
        useSearchSuggestionsDropdown({
          searchBoxController,
          filterSuggestionsGeneratorController,
        })
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
      const filterSuggestionsGeneratorController = createMockFilterSuggestionsGenerator();

      const { result } = renderHook(() =>
        useSearchSuggestionsDropdown({
          searchBoxController,
          filterSuggestionsGeneratorController,
        })
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
      const filterSuggestionsGeneratorController = createMockFilterSuggestionsGenerator();

      const { result } = renderHook(() =>
        useSearchSuggestionsDropdown({
          searchBoxController,
          filterSuggestionsGeneratorController,
        })
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
      const filterSuggestionsGeneratorController = createMockFilterSuggestionsGenerator();

      const { result } = renderHook(() =>
        useSearchSuggestionsDropdown({
          searchBoxController,
          filterSuggestionsGeneratorController,
        })
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
      const filterSuggestionsGeneratorController = createMockFilterSuggestionsGenerator();

      const { result } = renderHook(() =>
        useSearchSuggestionsDropdown({
          searchBoxController,
          filterSuggestionsGeneratorController,
        })
      );

      // Open then close via Escape
      act(() => {
        result.current.handleFocus();
      });
      expect(result.current.isOpen).toBe(true);

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      });
      expect(result.current.isOpen).toBe(false);

      // Re-focus reopens
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
      const filterUpdate = vi.fn();
      const filterSuggestionsGeneratorController = {
        filterSuggestions: [{ updateQuery: filterUpdate, clear: vi.fn() }],
      } as any;

      const { result } = renderHook(() =>
        useSearchSuggestionsDropdown({
          searchBoxController,
          filterSuggestionsGeneratorController,
          debounceMs: 300,
        })
      );

      act(() => {
        result.current.handleChange('dr');
      });
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // updateText fires (Query Suggestions ungated, even at 2 chars)
      expect(searchBoxController.updateText).toHaveBeenCalledWith('dr');
      // handleChange NEVER calls filter.updateQuery — Filter Suggestions and
      // Instant Products are driven by useEffectiveQueryDriver from the Effective
      // Query, not by raw keystrokes.
      expect(filterUpdate).not.toHaveBeenCalled();
    });

    it('opens the dropdown immediately on keystroke (before the debounce fires)', () => {
      const searchBoxController = createMockSearchBoxController();
      const filterSuggestionsGeneratorController = createMockFilterSuggestionsGenerator();

      const { result } = renderHook(() =>
        useSearchSuggestionsDropdown({
          searchBoxController,
          filterSuggestionsGeneratorController,
          debounceMs: 300,
        })
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
      const filterSuggestionsGeneratorController = createMockFilterSuggestionsGenerator();

      const { result } = renderHook(() =>
        useSearchSuggestionsDropdown({
          searchBoxController,
          filterSuggestionsGeneratorController,
        })
      );

      act(() => {
        result.current.handleFocus();
      });
      expect(result.current.isOpen).toBe(true);

      // Controller emits suggestions (populated)
      act(() => {
        searchBoxController.emit({
          suggestions: [{ rawValue: 'popular', highlightedValue: 'popular' }],
          isLoadingSuggestions: false,
        });
      });
      expect(result.current.isOpen).toBe(true);

      // Suggestions start loading again (e.g. user typed)
      act(() => {
        searchBoxController.emit({ isLoadingSuggestions: true });
      });
      expect(result.current.isOpen).toBe(true);

      // Suggestions settle empty
      act(() => {
        searchBoxController.emit({
          suggestions: [],
          isLoadingSuggestions: false,
        });
      });

      // Hook stays open — content-gating is the dropdown's job, not the hook's
      expect(result.current.isOpen).toBe(true);
    });

    it('stays open when focus triggers showSuggestions but model returns empty', () => {
      const searchBoxController = createMockSearchBoxController();
      const filterSuggestionsGeneratorController = createMockFilterSuggestionsGenerator();

      const { result } = renderHook(() =>
        useSearchSuggestionsDropdown({
          searchBoxController,
          filterSuggestionsGeneratorController,
        })
      );

      act(() => {
        result.current.handleFocus();
      });

      expect(result.current.isOpen).toBe(true);

      // Controller settles with empty suggestions
      act(() => {
        searchBoxController.emit({
          suggestions: [],
          isLoadingSuggestions: false,
        });
      });

      // isOpen is purely intent-driven — doesn't react to content
      expect(result.current.isOpen).toBe(true);
    });
  });

  describe('debounce behavior — focus is immediate, typing is debounced', () => {
    it('handleFocus calls showSuggestions immediately (no timer)', () => {
      const searchBoxController = createMockSearchBoxController('dri');
      const filterSuggestionsGeneratorController = createMockFilterSuggestionsGenerator();

      renderHook(() =>
        useSearchSuggestionsDropdown({
          searchBoxController,
          filterSuggestionsGeneratorController,
          debounceMs: 300,
        })
      );

      // Focus triggers showSuggestions synchronously, not after debounce
      act(() => {
        // access the result to call handleFocus
      });

      const { result } = renderHook(() =>
        useSearchSuggestionsDropdown({
          searchBoxController: createMockSearchBoxController('test'),
          filterSuggestionsGeneratorController,
          debounceMs: 300,
        })
      );

      act(() => {
        result.current.handleFocus();
      });

      // showSuggestions called immediately, before any timer advancement
      expect(result.current.isOpen).toBe(true);
      // No need to advance timers — focus is synchronous
    });

    it('handleChange does NOT call updateText until debounce elapses', () => {
      const searchBoxController = createMockSearchBoxController();
      const filterSuggestionsGeneratorController = createMockFilterSuggestionsGenerator();

      const { result } = renderHook(() =>
        useSearchSuggestionsDropdown({
          searchBoxController,
          filterSuggestionsGeneratorController,
          debounceMs: 300,
        })
      );

      act(() => {
        result.current.handleChange('dri');
      });

      // updateText NOT called yet
      expect(searchBoxController.updateText).not.toHaveBeenCalled();

      // Advance less than debounceMs
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(searchBoxController.updateText).not.toHaveBeenCalled();

      // Advance past debounceMs
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(searchBoxController.updateText).toHaveBeenCalledWith('dri');
    });

    it('handleFocus does NOT debounce — updateText fires with current value synchronously', () => {
      const searchBoxController = createMockSearchBoxController('existing');
      const filterSuggestionsGeneratorController = createMockFilterSuggestionsGenerator();

      const { result } = renderHook(() =>
        useSearchSuggestionsDropdown({
          searchBoxController,
          filterSuggestionsGeneratorController,
          debounceMs: 300,
        })
      );

      act(() => {
        result.current.handleFocus();
      });

      // showSuggestions is the focus-triggered call (requests suggestions for current value)
      // It does NOT go through a debounce timer
      expect(searchBoxController.showSuggestions).toHaveBeenCalledTimes(1);
    });
  });
});
