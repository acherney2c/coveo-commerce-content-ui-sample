import { describe, it, expect } from 'vitest';
import { commercePreprocessRequest } from './commerce-request-customisation.js';

const makeRequest = (body: unknown) => ({ url: 'https://example.com', body });

describe('commercePreprocessRequest', () => {
  it('passes non-commerce origins through untouched', () => {
    const request = makeRequest(JSON.stringify({ debug: false }));
    const result = commercePreprocessRequest(request, 'searchApiFetch', undefined, { debug: true });
    expect(result).toBe(request);
    expect(result.body).toBe(request.body);
  });

  it('passes through when the body is not a string', () => {
    const request = makeRequest({ already: 'parsed' });
    const result = commercePreprocessRequest(request, 'commerceApiFetch', undefined, { debug: true });
    expect(result.body).toEqual({ already: 'parsed' });
  });

  it('passes through when the body is not valid JSON', () => {
    const request = makeRequest('not-json{');
    const result = commercePreprocessRequest(request, 'commerceApiFetch', undefined, { debug: true });
    expect(result.body).toBe('not-json{');
  });

  it('passes through when the parsed body is not an object', () => {
    const request = makeRequest('null');
    const result = commercePreprocessRequest(request, 'commerceApiFetch', undefined, { debug: true });
    expect(result.body).toBe('null');
  });

  it('enables debug when the debug option is set', () => {
    const request = makeRequest(JSON.stringify({ context: {}, debug: false }));
    const result = commercePreprocessRequest(request, 'commerceApiFetch', undefined, { debug: true });
    expect(JSON.parse(result.body as string).debug).toBe(true);
  });

  it('does not force debug when the debug option is off', () => {
    const request = makeRequest(JSON.stringify({ context: {}, debug: false }));
    const result = commercePreprocessRequest(request, 'commerceApiFetch', undefined, { debug: false });
    expect(JSON.parse(result.body as string).debug).toBe(false);
  });

  it('expands hierarchical facets and leaves other facets untouched', () => {
    const request = makeRequest(
      JSON.stringify({
        context: {},
        facets: [
          { type: 'hierarchical', field: 'category' },
          { type: 'regular', field: 'brand' },
        ],
      })
    );
    const result = commercePreprocessRequest(request, 'commerceApiFetch', undefined, { debug: false });
    const { facets } = JSON.parse(result.body as string);
    expect(facets[0]).toMatchObject({ type: 'hierarchical', isFieldExpanded: true });
    expect(facets[1]).toEqual({ type: 'regular', field: 'brand' });
  });
});
