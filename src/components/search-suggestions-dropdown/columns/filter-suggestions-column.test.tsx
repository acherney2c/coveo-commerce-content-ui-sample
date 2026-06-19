import { render, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FilterSuggestionsColumn from './filter-suggestions-column.js';

function createFilterGen(count = 2) {
  const filters = Array.from({ length: count }, (_, i) => ({
    updateQuery: vi.fn(),
    clear: vi.fn(),
    state: { facetId: `facet-${i}`, displayName: `Facet ${i}`, values: [] },
    subscribe: vi.fn(() => () => {}),
    type: 'regular',
  }));
  return {
    filterSuggestions: filters,
    subscribe: vi.fn(() => () => {}),
  } as any;
}

describe('FilterSuggestionsColumn', () => {
  afterEach(() => cleanup());

  it('drives updateQuery on every filter controller when committedQuery is set', () => {
    const controller = createFilterGen(2);

    render(
      <FilterSuggestionsColumn
        controller={controller}
        committedQuery="kayak"
        onSelect={vi.fn()}
      />
    );

    expect(controller.filterSuggestions[0].updateQuery).toHaveBeenCalledWith('kayak');
    expect(controller.filterSuggestions[1].updateQuery).toHaveBeenCalledWith('kayak');
  });

  it('re-drives only when committedQuery changes', () => {
    const controller = createFilterGen(1);

    const { rerender } = render(
      <FilterSuggestionsColumn controller={controller} committedQuery="kayak" onSelect={vi.fn()} />
    );
    expect(controller.filterSuggestions[0].updateQuery).toHaveBeenCalledTimes(1);

    // Re-render with the same committedQuery → no extra drive.
    rerender(
      <FilterSuggestionsColumn controller={controller} committedQuery="kayak" onSelect={vi.fn()} />
    );
    expect(controller.filterSuggestions[0].updateQuery).toHaveBeenCalledTimes(1);

    // New committedQuery → drive again.
    rerender(
      <FilterSuggestionsColumn controller={controller} committedQuery="canoe" onSelect={vi.fn()} />
    );
    expect(controller.filterSuggestions[0].updateQuery).toHaveBeenCalledTimes(2);
    expect(controller.filterSuggestions[0].updateQuery).toHaveBeenLastCalledWith('canoe');
  });

  it('clears the filter controllers when committedQuery is null', () => {
    const controller = createFilterGen(1);

    render(
      <FilterSuggestionsColumn controller={controller} committedQuery={null} onSelect={vi.fn()} />
    );

    expect(controller.filterSuggestions[0].updateQuery).not.toHaveBeenCalled();
    expect(controller.filterSuggestions[0].clear).toHaveBeenCalled();
  });
});
