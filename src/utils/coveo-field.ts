/**
 * Normalizes a Coveo field reference to its bare form.
 *
 * Coveo field references appear two ways: `@`-prefixed (e.g. `@ec_name`) in
 * query and `groupBy` syntax, but bare (e.g. `ec_name`) in field registration
 * and result access. Normalizing strips the leading `@` to yield the bare form.
 */
export const normalizeFieldName = (field: string): string => field.replace(/^@/, '');
