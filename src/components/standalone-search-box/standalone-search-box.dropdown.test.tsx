import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StandaloneSearchBox from './standalone-search-box.js';

/**
 * Dropdown visibility and stability tests for the new focus-driven model.
 *
 * The dropdown is now content-gated: it opens on focus/type but only renders
 * when there's content (suggestions or loading). Below minChars only the Query
 * Suggestions column shows. Above minChars all three columns show.
 */

const DEBOUNCE_MS = 300;

function createStandaloneController(initial = '') {
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());
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
      notify();
    }),
    showSuggestions: vi.fn(),
    clear: vi.fn(() => {
      ctrl.state = { ...ctrl.state, value: '', suggestions: [] };
      notify();
    }),
    submit: vi.fn(),
    selectSuggestion: vi.fn(),
    afterRedirection: vi.fn(),
    emit(patch: Partial<typeof ctrl.state>) {
      ctrl.state = { ...ctrl.state, ...patch };
      notify();
    },
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
    cleanup();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('shows the dropdown on focus when Popular Queries (suggestions) are returned', () => {
    const { container, standaloneSearchBoxController } = renderBox();
    const input = screen.getByTitle('Search query');

    // Focus the input
    act(() => {
      fireEvent.focus(input);
    });

    // Simulate controller returning suggestions (Popular Queries)
    act(() => {
      standaloneSearchBoxController.emit({
        suggestions: [{ rawValue: 'popular query', highlightedValue: 'popular query' }],
        isLoadingSuggestions: false,
      });
    });

    expect(container.querySelector('.search-dropdown')).not.toBeNull();
    expect(screen.getByText('Query Suggestions')).toBeInTheDocument();
  });

  it('keeps the dropdown mounted when typing another above-threshold character', () => {
    const { container, standaloneSearchBoxController } = renderBox();
    const input = screen.getByTitle('Search query');

    // Focus and type to threshold
    act(() => {
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: 'dri' } });
    });

    // Debounce fires, controller returns suggestions
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_MS);
    });
    act(() => {
      standaloneSearchBoxController.emit({
        suggestions: [{ rawValue: 'drill', highlightedValue: 'drill' }],
        isLoadingSuggestions: false,
      });
    });

    const dropdownBefore = container.querySelector('.search-dropdown');
    expect(dropdownBefore).not.toBeNull();

    // Type one more character — dropdown stays mounted (same DOM node)
    act(() => {
      fireEvent.change(input, { target: { value: 'dril' } });
    });

    const dropdownAfter = container.querySelector('.search-dropdown');
    expect(dropdownAfter).not.toBeNull();
    expect(dropdownAfter).toBe(dropdownBefore);
  });

  it('below minChars shows only the Query Suggestions column (no filter/products)', () => {
    const { container, standaloneSearchBoxController } = renderBox();
    const input = screen.getByTitle('Search query');

    act(() => {
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: 'dr' } });
    });

    // Controller returns suggestions at 2 chars
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_MS);
    });
    act(() => {
      standaloneSearchBoxController.emit({
        value: 'dr',
        suggestions: [{ rawValue: 'drill', highlightedValue: 'drill' }],
        isLoadingSuggestions: false,
      });
    });

    expect(container.querySelector('.search-dropdown')).not.toBeNull();
    expect(screen.getByText('Query Suggestions')).toBeInTheDocument();
    // Filter Suggestions and Instant Products columns should not be rendered
    expect(screen.queryByText('Filter Suggestions')).toBeNull();
  });

  it('hides the dropdown when content settles empty (no flash on transient empty)', () => {
    const { container, standaloneSearchBoxController } = renderBox();
    const input = screen.getByTitle('Search query');

    // Focus — no suggestions returned
    act(() => {
      fireEvent.focus(input);
    });

    // Controller returns empty suggestions (settled)
    act(() => {
      standaloneSearchBoxController.emit({
        suggestions: [],
        isLoadingSuggestions: false,
      });
    });

    // Content-gated: no dropdown painted
    expect(container.querySelector('.search-dropdown')).toBeNull();
  });

  it('closes on Escape and reopens on re-focus', () => {
    const { container, standaloneSearchBoxController } = renderBox();
    const input = screen.getByTitle('Search query');

    act(() => {
      fireEvent.focus(input);
    });
    act(() => {
      standaloneSearchBoxController.emit({
        suggestions: [{ rawValue: 'popular', highlightedValue: 'popular' }],
        isLoadingSuggestions: false,
      });
    });
    expect(container.querySelector('.search-dropdown')).not.toBeNull();

    // Escape closes
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    expect(container.querySelector('.search-dropdown')).toBeNull();

    // Re-focus reopens
    act(() => {
      fireEvent.focus(input);
    });
    // Suggestions still in state from before
    expect(container.querySelector('.search-dropdown')).not.toBeNull();
  });
});
