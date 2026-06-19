import { render, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DropdownFilterSuggestions from './filter-suggestions.js';

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

describe('DropdownFilterSuggestions', () => {
  afterEach(() => cleanup());

  it('drives updateQuery on every filter controller when committedQuery is set', () => {
    const controller = createFilterGen(2);

    render(
      <DropdownFilterSuggestions
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
      <DropdownFilterSuggestions controller={controller} committedQuery="kayak" onSelect={vi.fn()} />
    );
    expect(controller.filterSuggestions[0].updateQuery).toHaveBeenCalledTimes(1);

    // Re-render with the same committedQuery → no extra drive.
    rerender(
      <DropdownFilterSuggestions controller={controller} committedQuery="kayak" onSelect={vi.fn()} />
    );
    expect(controller.filterSuggestions[0].updateQuery).toHaveBeenCalledTimes(1);

    // New committedQuery → drive again.
    rerender(
      <DropdownFilterSuggestions controller={controller} committedQuery="canoe" onSelect={vi.fn()} />
    );
    expect(controller.filterSuggestions[0].updateQuery).toHaveBeenCalledTimes(2);
    expect(controller.filterSuggestions[0].updateQuery).toHaveBeenLastCalledWith('canoe');
  });

  it('clears the filter controllers when committedQuery is null', () => {
    const controller = createFilterGen(1);

    render(
      <DropdownFilterSuggestions controller={controller} committedQuery={null} onSelect={vi.fn()} />
    );

    expect(controller.filterSuggestions[0].updateQuery).not.toHaveBeenCalled();
    expect(controller.filterSuggestions[0].clear).toHaveBeenCalled();
  });

  it('clean commit-on-select: updateQuery uses the Effective Query (First Suggestion), not the typed value', () => {
    const controller = createFilterGen(1);

    // committedQuery="kayak" is the Effective Query (First Suggestion for typed "kay").
    // The filter controller's updateQuery must receive "kayak" so that when
    // getSearchParameters() is called on selection, the committed search is the
    // clean First Suggestion — no partial typed text, no wildcard.
    render(
      <DropdownFilterSuggestions controller={controller} committedQuery="kayak" onSelect={vi.fn()} />
    );

    expect(controller.filterSuggestions[0].updateQuery).toHaveBeenCalledTimes(1);
    expect(controller.filterSuggestions[0].updateQuery).toHaveBeenCalledWith('kayak');
    // Specifically NOT called with the typed partial "kay":
    expect(controller.filterSuggestions[0].updateQuery).not.toHaveBeenCalledWith('kay');
  });
});
