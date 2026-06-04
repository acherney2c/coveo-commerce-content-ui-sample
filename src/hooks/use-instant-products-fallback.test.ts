import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInstantProductsFallback } from './use-instant-products-fallback';
import type { Product } from '@coveo/headless/commerce';

// Mock product for testing
const mockProduct = {
    permanentid: 'test-123',
    ec_name: 'Test Product',
    ec_product_id: 'PROD-123',
    additionalFields: {},
    children: [],
    totalNumberOfChildren: 0,
} as unknown as Product;

describe('useInstantProductsFallback', () => {
    describe('Race Condition Prevention', () => {
        it('should trigger fallback when loading completes with no products and suggestions exist', async () => {
            const onFallback = vi.fn();

            // Initial state: loading, no products
            const { result, rerender } = renderHook(
                (props) => useInstantProductsFallback(props),
                {
                    initialProps: {
                        products: [] as Product[],
                        isLoading: true,
                        suggestions: ['drill bit', 'drill press'],
                        currentQuery: 'drill',
                        onFallback,
                    },
                }
            );

            // Loading completes with no products — fallback should fire
            await act(async () => {
                rerender({
                    products: [],
                    isLoading: false,
                    suggestions: ['drill bit', 'drill press'],
                    currentQuery: 'drill',
                    onFallback,
                });
            });

            expect(onFallback).toHaveBeenCalledWith('drill bit');
            expect(result.current.shouldShowNoResults).toBe(false);
        });

        it('should trigger fallback only after products are confirmed for the current query', async () => {
            const onFallback = vi.fn();

            const { result, rerender } = renderHook(
                (props) => useInstantProductsFallback(props),
                {
                    initialProps: {
                        products: [] as Product[],
                        isLoading: true,
                        suggestions: ['drill bit', 'drill press'],
                        currentQuery: 'drill',
                        onFallback,
                    },
                }
            );

            // First: loading completes with no products (confirms query)
            rerender({
                products: [],
                isLoading: false,
                suggestions: ['drill bit', 'drill press'],
                currentQuery: 'drill',
                onFallback,
            });

            // Allow effects to run
            await act(async () => { });

            // Now fallback should trigger because query is confirmed
            expect(onFallback).toHaveBeenCalledWith('drill bit');
            expect(result.current.isShowingFallback).toBe(false); // Not yet, products haven't arrived
        });

        it('should show fallback message after correction products arrive', async () => {
            const onFallback = vi.fn();

            const { result, rerender } = renderHook(
                (props) => useInstantProductsFallback(props),
                {
                    initialProps: {
                        products: [] as Product[],
                        isLoading: true,
                        suggestions: ['drill bit'],
                        currentQuery: 'drill',
                        onFallback,
                    },
                }
            );

            // Loading completes with no products - triggers fallback
            rerender({
                products: [],
                isLoading: false,
                suggestions: ['drill bit'],
                currentQuery: 'drill',
                onFallback,
            });

            await act(async () => { });
            expect(onFallback).toHaveBeenCalledWith('drill bit');

            // Fallback query sent, new products arrive
            rerender({
                products: [mockProduct],
                isLoading: false,
                suggestions: ['drill bit'],
                currentQuery: 'drill bit', // Query changed to fallback
                onFallback,
            });

            await act(async () => { });

            // Should now show fallback state
            expect(result.current.isShowingFallback).toBe(true);
            expect(result.current.originalQuery).toBe('drill');
            expect(result.current.correctionQuery).toBe('drill bit');
        });
    });

    describe('No Results Display', () => {
        it('should show no results when products empty and no suggestions available', async () => {
            const onFallback = vi.fn();

            const { result, rerender } = renderHook(
                (props) => useInstantProductsFallback(props),
                {
                    initialProps: {
                        products: [] as Product[],
                        isLoading: true,
                        suggestions: [], // No suggestions!
                        currentQuery: 'xyz123unknown',
                        onFallback,
                    },
                }
            );

            // Loading completes with no products and no suggestions
            rerender({
                products: [],
                isLoading: false,
                suggestions: [],
                currentQuery: 'xyz123unknown',
                onFallback,
            });

            await act(async () => { });

            // Should show "no results" since there are no suggestions to fall back to
            expect(onFallback).not.toHaveBeenCalled();
            expect(result.current.shouldShowNoResults).toBe(true);
        });
    });

    describe('Query Changes', () => {
        it('should not trigger fallback when user is still typing', async () => {
            const onFallback = vi.fn();

            const { rerender } = renderHook(
                (props) => useInstantProductsFallback(props),
                {
                    initialProps: {
                        products: [] as Product[],
                        isLoading: true,
                        suggestions: ['drill'],
                        currentQuery: 'd',
                        onFallback,
                    },
                }
            );

            // User types more characters quickly
            rerender({
                products: [],
                isLoading: false,
                suggestions: ['drill'],
                currentQuery: 'dr', // Query changed!
                onFallback,
            });

            await act(async () => { });

            // Should NOT trigger fallback because query changed
            // The confirmed query ('d') doesn't match current query ('dr')
            expect(onFallback).not.toHaveBeenCalled();
        });
    });
});
