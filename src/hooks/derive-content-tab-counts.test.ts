import { describe, it, expect } from 'vitest';
import { deriveContentTabCounts } from './derive-content-tab-counts.js';

describe('deriveContentTabCounts', () => {
  const tabConfigs = [
    { key: 'articles', countField: 'pagetype', countValue: 'Article' },
    { key: 'stores', countField: 'commonsource', countValue: 'Sample Stores' },
  ];

  it('returns counts from matching groupByResults', () => {
    const response = {
      groupByResults: [
        {
          field: 'pagetype',
          values: [
            { value: 'Article', numberOfResults: 5 },
            { value: 'Page', numberOfResults: 3 },
          ],
        },
        {
          field: 'commonsource',
          values: [{ value: 'Sample Stores', numberOfResults: 12 }],
        },
      ],
    };

    expect(deriveContentTabCounts(response, tabConfigs, 'commonsource')).toEqual({
      articles: 5,
      stores: 12,
    });
  });

  it('strips @-prefix from field names for matching', () => {
    const response = {
      groupByResults: [
        {
          field: '@pagetype',
          values: [{ value: 'Article', numberOfResults: 7 }],
        },
        {
          field: '@commonsource',
          values: [{ value: 'Sample Stores', numberOfResults: 2 }],
        },
      ],
    };

    expect(deriveContentTabCounts(response, tabConfigs, 'commonsource')).toEqual({
      articles: 7,
      stores: 2,
    });
  });

  it('strips @-prefix from tabConfig.countField as well', () => {
    const configsWithPrefix = [
      { key: 'articles', countField: '@pagetype', countValue: 'Article' },
    ];
    const response = {
      groupByResults: [
        {
          field: 'pagetype',
          values: [{ value: 'Article', numberOfResults: 9 }],
        },
      ],
    };

    expect(deriveContentTabCounts(response, configsWithPrefix, 'commonsource')).toEqual({
      articles: 9,
    });
  });

  it('uses fallbackField when countField is undefined', () => {
    const configsNoField = [
      { key: 'generic', countValue: 'SomeValue' },
    ];
    const response = {
      groupByResults: [
        {
          field: 'commonsource',
          values: [{ value: 'SomeValue', numberOfResults: 4 }],
        },
      ],
    };

    expect(deriveContentTabCounts(response, configsNoField, 'commonsource')).toEqual({
      generic: 4,
    });
  });

  it('returns 0 when countValue is not found in groupByResults', () => {
    const response = {
      groupByResults: [
        {
          field: 'pagetype',
          values: [{ value: 'Page', numberOfResults: 3 }],
        },
      ],
    };

    expect(deriveContentTabCounts(response, tabConfigs, 'commonsource')).toEqual({
      articles: 0,
      stores: 0,
    });
  });

  it('returns 0 for all tabs when groupByResults is undefined', () => {
    expect(deriveContentTabCounts({}, tabConfigs, 'commonsource')).toEqual({
      articles: 0,
      stores: 0,
    });
  });

  it('returns 0 for all tabs when groupByResults is empty', () => {
    expect(deriveContentTabCounts({ groupByResults: [] }, tabConfigs, 'commonsource')).toEqual({
      articles: 0,
      stores: 0,
    });
  });
});
