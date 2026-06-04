import { normalizeFieldName } from '../utils/coveo-field.js';

interface GroupByValue {
  value: string;
  numberOfResults: number;
}

interface SearchResponseWithGroupBy {
  groupByResults?: Array<{
    field: string;
    values: GroupByValue[];
  }>;
}

interface TabConfig {
  key: string;
  countField?: string;
  countValue: string;
}

/**
 * Derives per-tab counts from a search response's groupByResults.
 * Pure function — no side effects.
 */
export function deriveContentTabCounts(
  response: SearchResponseWithGroupBy,
  tabConfigs: ReadonlyArray<TabConfig>,
  fallbackField: string,
): Record<string, number> {
  return Object.fromEntries(
    tabConfigs.map((tabConfig) => {
      const countField = normalizeFieldName(tabConfig.countField ?? fallbackField);
      const groupByResult = response.groupByResults?.find(
        ({ field }) => normalizeFieldName(field) === countField,
      );
      const count =
        groupByResult?.values.find(({ value }) => value === tabConfig.countValue)
          ?.numberOfResults ?? 0;

      return [tabConfig.key, count];
    }),
  );
}
