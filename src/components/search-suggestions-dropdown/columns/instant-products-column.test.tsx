import { render, screen, act, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import InstantProductsColumn from './instant-products-column.js';
import type { Product } from '@coveo/headless/commerce';

const product = {
  permanentid: 'p1',
  ec_name: 'Kayak Pro',
  ec_product_id: 'KP-1',
} as unknown as Product;

function createInstantProducts(initial: { products: Product[]; isLoading: boolean }) {
  const listeners = new Set<() => void>();
  const ctrl: any = {
    state: { ...initial },
    subscribe(cb: () => void) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    updateQuery: vi.fn(),
    interactiveProduct: vi.fn(() => ({ select: vi.fn() })),
    emit(patch: any) {
      ctrl.state = { ...ctrl.state, ...patch };
      listeners.forEach((l) => l());
    },
  };
  return ctrl;
}

function renderColumn(props: { committedQuery: string | null; typedQuery: string; controller: any }) {
  return render(
    <MemoryRouter>
      <InstantProductsColumn
        controller={props.controller}
        committedQuery={props.committedQuery}
        typedQuery={props.typedQuery}
      />
    </MemoryRouter>
  );
}

describe('InstantProductsColumn', () => {
  afterEach(() => cleanup());

  it('drives updateQuery with the committed query and re-drives only on change', () => {
    const controller = createInstantProducts({ products: [], isLoading: false });

    const { rerender } = renderColumn({ controller, committedQuery: 'kayak', typedQuery: 'kay' });
    expect(controller.updateQuery).toHaveBeenCalledTimes(1);
    expect(controller.updateQuery).toHaveBeenCalledWith('kayak');

    rerender(
      <MemoryRouter>
        <InstantProductsColumn controller={controller} committedQuery="kayak" typedQuery="kaya" />
      </MemoryRouter>
    );
    // Same committed query → no extra drive.
    expect(controller.updateQuery).toHaveBeenCalledTimes(1);
  });

  it('renders products and the "Showing results for" notice when the committed query differs from typed', () => {
    const controller = createInstantProducts({ products: [product], isLoading: false });
    renderColumn({ controller, committedQuery: 'kayak', typedQuery: 'kay' });

    expect(screen.getByText(/Kayak Pro/)).toBeInTheDocument();
    expect(screen.getByText(/Showing results for/)).toBeInTheDocument();
  });

  it('shows no notice when the committed query matches the typed query', () => {
    const controller = createInstantProducts({ products: [product], isLoading: false });
    renderColumn({ controller, committedQuery: 'kayak', typedQuery: 'kayak' });

    expect(screen.queryByText(/Showing results for/)).toBeNull();
  });

  it('shows "No results" only once the load settles empty for a committed query', () => {
    const controller = createInstantProducts({ products: [], isLoading: true });
    const { container } = renderColumn({ controller, committedQuery: 'xyz', typedQuery: 'xyz' });

    // Still loading: no "No results".
    expect(screen.queryByText(/No results found/)).toBeNull();

    act(() => {
      controller.emit({ isLoading: false });
    });

    expect(screen.getByText(/No results found/)).toBeInTheDocument();
    expect(container.textContent).toContain('xyz');
  });

  it('keeps products visible when typing continues (no flash)', () => {
    const controller = createInstantProducts({ products: [product], isLoading: false });

    const { rerender } = renderColumn({ controller, committedQuery: 'kayak', typedQuery: 'kay' });
    expect(screen.getByText(/Kayak Pro/)).toBeInTheDocument();

    // Typed query changes but committed query holds (same first suggestion).
    rerender(
      <MemoryRouter>
        <InstantProductsColumn controller={controller} committedQuery="kayak" typedQuery="kaya" />
      </MemoryRouter>
    );
    expect(screen.getByText(/Kayak Pro/)).toBeInTheDocument();
  });
});
