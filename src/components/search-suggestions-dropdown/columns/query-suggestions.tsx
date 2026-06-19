// This is a reference/sample implementation. Accessibility is intentionally left
// for implementers to address in their production code.
import type { Suggestion } from '@coveo/headless/commerce';

export interface QuerySuggestionsProps {
  suggestions: Suggestion[];
  /** Whether QuerySuggest is loading (shows "Loading..." instead of "None"). */
  isLoading: boolean;
  onSelect: (suggestion: Suggestion) => void;
}

/**
 * Self-contained Query Suggestions column. Purely presentational — Query
 * Suggestions are driven by the search box's own `updateText`, so this column
 * only renders the list and reports selections.
 */
export default function QuerySuggestions(props: QuerySuggestionsProps) {
  const { suggestions, isLoading, onSelect } = props;

  return (
    <div className="list-group shadow">
      <div className="list-group-item text-muted small">Query Suggestions</div>
      {suggestions.length > 0 ? (
        suggestions.map((suggestion) => (
          <button
            key={suggestion.rawValue}
            type="button"
            className="list-group-item list-group-item-action"
            title={suggestion.rawValue}
            // Accessibility: dangerouslySetInnerHTML renders highlighted HTML from
            // the Coveo API. In production, pair this with an aria-label for screen
            // readers and ensure the HTML is sanitised server-side.
            // eslint-disable-next-line jsx-a11y/control-has-associated-label
            dangerouslySetInnerHTML={{ __html: suggestion.highlightedValue }}
            onClick={() => onSelect(suggestion)}
          />
        ))
      ) : (
        <div className="list-group-item text-muted">
          {isLoading ? 'Loading...' : 'None'}
        </div>
      )}
    </div>
  );
}
