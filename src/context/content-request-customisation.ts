/**
 * Content Search API preprocessRequest customisation.
 *
 * Injects per-content-tab `groupBy` clauses into search requests so the UI can
 * display result counts for each content tab without issuing separate queries.
 * The groupBy entries use `queryOverride` and `constantQueryOverride` to scope
 * counts to the current user query filtered by the content source expression.
 */

import { normalizeFieldName } from '../utils/coveo-field.js';

export interface ContentCountGroupBy {
  field: string;
  allowedValues: string[];
}

export interface ContentGroupByOptions {
  /** The groupBy definitions derived from content search tab config. */
  countGroupBys: ContentCountGroupBy[];
  /** Set of normalised field names used by countGroupBys (for dedup filtering). */
  countGroupByFields: Set<string>;
  /** The combined source filter expression (OR of all tab cqExpressions). */
  sourceFilter: string;
  /** Whether to emit debug logging. */
  debug?: boolean;
}

export function contentPreprocessRequest<T extends {body?: unknown}>(
  request: T,
  clientOrigin: string,
  metadata: unknown,
  options: ContentGroupByOptions
): T {
  if (clientOrigin !== 'searchApiFetch') {
    return request;
  }

  if ((metadata as {method?: string} | undefined)?.method !== 'search') {
    return request;
  }

  if (!request.body) {
    return request;
  }

  let parsed: unknown;
  try {
    parsed =
      typeof request.body === 'string'
        ? JSON.parse(request.body)
        : request.body;
  } catch {
    return request;
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return request;
  }

  const body = parsed as {
    q?: string;
    groupBy?: Array<Record<string, unknown>>;
  };

  const groupBy = Array.isArray(body.groupBy) ? body.groupBy : [];
  const countGroupBys = options.countGroupBys.map(({field, allowedValues}) => ({
    field,
    maximumNumberOfValues: allowedValues.length,
    sortCriteria: 'occurrences',
    allowedValues,
    queryOverride: body.q ?? '',
    constantQueryOverride: options.sourceFilter,
  }));

  const nextBody = {
    ...body,
    groupBy: [
      ...groupBy.filter(
        (entry) => !options.countGroupByFields.has(
          normalizeFieldName(String(entry.field ?? ''))
        )
      ),
      ...countGroupBys,
    ],
  };

  if (options.debug) {
    console.debug('[content-search-request][search]', {
      groupByCount: nextBody.groupBy.length,
      includesAllContentCountGroupBys: options.countGroupBys.every(({field}) =>
        nextBody.groupBy.some(
          (entry) => normalizeFieldName(String(entry.field ?? '')) === normalizeFieldName(field)
        )
      ),
    });
  }

  request.body = JSON.stringify(nextBody);
  return request;
}
