import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StandaloneSearchBox from './standalone-search-box.js';

/**
 * Regression coverage for the search dropdown re-render bug.
 *
 * The dropdown hosts all three suggestion boxes (Query Suggestions, Filter
 * Suggestions, Instant Products) inside a single `{dropdownVisible && (...)}`
 * block. Once the dropdown is shown, typing a further character that is still
 * above the minChars threshold must NOT unmount/remount that block — otherwise
 * all three boxes flash and re-render on every keystroke even when the
 * suggestions are unchanged.
 */

const DEBOUNCE_MS = 300;
const MIN_CHARS = 3;

function createStandaloneController(initial = '') {
  const listeners = new Set<() => void>();
  const ctrl: any = {
    state: {
      value: initial,
      suggestions: [] as Array<{ rawValue: string; highlightedValue: string }>,
      isLoading: false,
      isLoadingSuggestions: false,
      redirectTo: '',
    },
    subscribe(cb: () => void) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    updateText: vi.fn((value: string) => {
      ctrl.state = { ...ctrl.state, value };
      listeners.forEach((l) => l());
    }),
    clear: vi.fn(() => {
      ctrl.state = { ...ctrl.state, value: '' };
      listeners.forEach((l) => l());
    }),
    submit: vi.fn(),
    selectSuggestion: vi.fn(),
    afterRedirection: vi.fn(),
  };
  return ctrl;
}

function createFilterSuggestionsGenerator() {
  const listeners = new Set<() => void>();
  return {
    filterSuggestions: [] as unknown[],
    subscribe(cb: () => void) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  } as any;
}

function createInstantProducts() {
  const listeners = new Set<() => void>();
  return {
    state: { products: [] as unknown[], isLoading: false },
    subscribe(cb: () => void) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    updateQuery: vi.fn(),
    interactiveProduct: vi.fn(() => ({ select: vi.fn() })),
  } as any;
}

function renderBox() {
  const standaloneSearchBoxController = createStandaloneController();
  const filterSuggestionsGeneratorController = createFilterSuggestionsGenerator();
  const instantProductsController = createInstantProducts();

  const view = render(
    <MemoryRouter>
      <StandaloneSearchBox
        standaloneSearchBoxController={standaloneSearchBoxController}
        instantProductsController={instantProductsController}
        filterSuggestionsGeneratorController={filterSuggestionsGeneratorController}
        debounceMs={DEBOUNCE_MS}
        minChars={MIN_CHARS}
      />
    </MemoryRouter>
  );

  return { ...view, standaloneSearchBoxController };
}

describe('StandaloneSearchBox dropdown stability', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Unmount first so the component's debounce-cancel cleanup runs; any
    // remaining timers then fire against nothing (no out-of-act state updates).
    cleanup();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('keeps the dropdown (all three boxes) mounted when typing another above-threshold character', () => {
    const { container } = renderBox();
    const input = screen.getByTitle('Search query');

    // Type to the threshold, then let the debounce fire so the dropdown shows.
    act(() => {
      fireEvent.change(input, { target: { value: 'dri' } });
    });
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_MS);
    });

    const dropdownBefore = container.querySelector('.search-dropdown');
    expect(dropdownBefore).not.toBeNull();
    expect(screen.getByText('Query Suggestions')).toBeInTheDocument();

    // Type one more character (still above threshold). The dropdown must remain
    // mounted as the SAME DOM node — it should update in place, not flash away.
    act(() => {
      fireEvent.change(input, { target: { value: 'dril' } });
    });

    const dropdownAfter = container.querySelector('.search-dropdown');
    expect(dropdownAfter).not.toBeNull();
    // Same node identity proves React kept it mounted (no unmount/remount).
    expect(dropdownAfter).toBe(dropdownBefore);
  });

  it('hides the dropdown only when the input drops below the threshold', () => {
    const { container } = renderBox();
    const input = screen.getByTitle('Search query');

    act(() => {
      fireEvent.change(input, { target: { value: 'dri' } });
    });
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_MS);
    });
    expect(container.querySelector('.search-dropdown')).not.toBeNull();

    // Backspace below the threshold: dropdown should hide.
    act(() => {
      fireEvent.change(input, { target: { value: 'dr' } });
    });
    expect(container.querySelector('.search-dropdown')).toBeNull();
  });
});
