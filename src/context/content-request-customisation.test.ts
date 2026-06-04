import {describe, it, expect} from 'vitest';
import {contentPreprocessRequest, type ContentGroupByOptions} from './content-request-customisation.js';

const OPTIONS: ContentGroupByOptions = {
  countGroupBys: [
    {field: '@objecttype', allowedValues: ['Article', 'FAQ']},
    {field: '@source', allowedValues: ['KnowledgeBase']},
  ],
  countGroupByFields: new Set(['objecttype', 'source']),
  sourceFilter: '(@source=="KnowledgeBase") OR (@source=="HelpCenter")',
};

function makeRequest(body: Record<string, unknown>) {
  return {body: JSON.stringify(body)};
}

describe('contentPreprocessRequest', () => {
  it('should pass through non-searchApiFetch requests unchanged', () => {
    const req = makeRequest({q: 'test'});
    const result = contentPreprocessRequest(req, 'analyticsFetch', {method: 'search'}, OPTIONS);
    expect(JSON.parse(result.body as string)).toEqual({q: 'test'});
  });

  it('should pass through non-search method requests unchanged', () => {
    const req = makeRequest({q: 'test'});
    const result = contentPreprocessRequest(req, 'searchApiFetch', {method: 'facet'}, OPTIONS);
    expect(JSON.parse(result.body as string)).toEqual({q: 'test'});
  });

  it('should inject countGroupBys when body has no existing groupBy', () => {
    const req = makeRequest({q: 'drill'});
    const result = contentPreprocessRequest(req, 'searchApiFetch', {method: 'search'}, OPTIONS);
    const body = JSON.parse(result.body as string);

    expect(body.groupBy).toHaveLength(2);
    expect(body.groupBy[0]).toEqual({
      field: '@objecttype',
      maximumNumberOfValues: 2,
      sortCriteria: 'occurrences',
      allowedValues: ['Article', 'FAQ'],
      queryOverride: 'drill',
      constantQueryOverride: OPTIONS.sourceFilter,
    });
    expect(body.groupBy[1]).toEqual({
      field: '@source',
      maximumNumberOfValues: 1,
      sortCriteria: 'occurrences',
      allowedValues: ['KnowledgeBase'],
      queryOverride: 'drill',
      constantQueryOverride: OPTIONS.sourceFilter,
    });
  });

  it('should replace existing groupBy entries that match countGroupByFields', () => {
    const req = makeRequest({
      q: 'paint',
      groupBy: [
        {field: '@objecttype', maximumNumberOfValues: 5},
        {field: '@author', maximumNumberOfValues: 10},
      ],
    });
    const result = contentPreprocessRequest(req, 'searchApiFetch', {method: 'search'}, OPTIONS);
    const body = JSON.parse(result.body as string);

    // @author preserved, @objecttype replaced, @source added
    expect(body.groupBy).toHaveLength(3);
    expect(body.groupBy[0].field).toBe('@author');
    expect(body.groupBy[1].field).toBe('@objecttype');
    expect(body.groupBy[1].queryOverride).toBe('paint');
    expect(body.groupBy[2].field).toBe('@source');
  });

  it('should use empty string for queryOverride when q is undefined', () => {
    const req = makeRequest({});
    const result = contentPreprocessRequest(req, 'searchApiFetch', {method: 'search'}, OPTIONS);
    const body = JSON.parse(result.body as string);

    expect(body.groupBy[0].queryOverride).toBe('');
  });

  it('should return request unchanged when body is missing', () => {
    const req = {body: undefined} as {body?: string | unknown; [key: string]: unknown};
    const result = contentPreprocessRequest(req, 'searchApiFetch', {method: 'search'}, OPTIONS);
    expect(result.body).toBeUndefined();
  });
});
