import type {ContextOptions} from '@coveo/headless/commerce';

/**
 * Commerce API preprocessRequest customisation.
 *
 * Demonstrates two Coveo Commerce request-time transforms:
 * 1. Enables debug mode when the environment flag is set, returning additional
 *    diagnostic information in API responses.
 * 2. Expands hierarchical facets (isFieldExpanded: true) so idle/sibling values
 *    are returned alongside selected values — required for full category
 *    navigation trees.
 */
export function commercePreprocessRequest<T extends {body?: unknown}>(
  request: T,
  clientOrigin: string,
  _metadata: unknown,
  options: {debug: boolean}
): T {
  if (clientOrigin !== 'commerceApiFetch') {
    return request;
  }

  if (typeof request.body !== 'string') {
    return request;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(request.body);
  } catch {
    return request;
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return request;
  }

  const body = parsed as {
    context: ContextOptions;
    debug: boolean;
    facets?: Array<{type?: string; isFieldExpanded?: boolean; [key: string]: unknown}>;
  };

  if (options.debug) {
    body.debug = true;
  }

  if (body.facets) {
    body.facets = body.facets.map((facet) => {
      if (facet.type === 'hierarchical') {
        return {...facet, isFieldExpanded: true};
      }
      return facet;
    });
  }

  request.body = JSON.stringify(body);
  return request;
}
