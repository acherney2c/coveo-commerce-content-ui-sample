// This is a reference/sample implementation. Accessibility is intentionally left
// for implementers to address in their production code.
/* eslint-disable jsx-a11y/control-has-associated-label */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  CategoryFacetSearchResult,
  CategoryFilterSuggestions,
  FilterSuggestions,
  FilterSuggestionsGenerator,
  InstantProducts,
  RegularFacetSearchResult,
  StandaloneSearchBox as HeadlessStandaloneSearchBox,
  StandaloneSearchBoxState,
  Suggestion,
} from '@coveo/headless/commerce';
import InstantProductsComponent from '../instant-products/instant-products.js';
import FilterSuggestionsGeneratorComponent from '../filter-suggestions/filter-suggestions-generator.js';

export const buildStandaloneRedirectSearch = (
  existingSearch: string,
  query: string
) => {
  const params = new URLSearchParams(existingSearch);

  if (query) {
    params.set('q', query);
  } else {
    params.delete('q');
  }

  const search = params.toString().replace(/\+/g, '%20');
  return search ? `?${search}` : '';
};

interface IStandaloneSearchBoxProps {
  standaloneSearchBoxController: HeadlessStandaloneSearchBox;
  instantProductsController: InstantProducts;
  filterSuggestionsGeneratorController: FilterSuggestionsGenerator;
  /** Milliseconds to wait after the last keystroke before querying controllers. Default: 300 */
  debounceMs?: number;
  /** Minimum characters required before controller updates fire while typing. Submit bypasses this gate. Default: 3 */
  minChars?: number;
}

export default function StandaloneSearchBox(props: IStandaloneSearchBoxProps) {
  const {
    standaloneSearchBoxController,
    instantProductsController,
    filterSuggestionsGeneratorController,
    debounceMs = 300,
    minChars = 3,
  } = props;
  const [state, setState] = useState<StandaloneSearchBoxState>(
    standaloneSearchBoxController.state
  );
  const [inputValue, setInputValue] = useState(
    standaloneSearchBoxController.state.value
  );
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks the last value we observed from the controller to avoid overwriting
  // in-progress user input during unrelated controller state updates (e.g. loading).
  const controllerValueRef = useRef(standaloneSearchBoxController.state.value);

  useEffect(() => {
    const unsubscribe = standaloneSearchBoxController.subscribe(() => {
      const newState = standaloneSearchBoxController.state;
      setState(newState);

      // Only sync inputValue when the controller's value actually changes to avoid
      // overwriting in-progress typing during unrelated updates (loading, etc.).
      if (newState.value !== controllerValueRef.current) {
        controllerValueRef.current = newState.value;
        setInputValue(newState.value);
      }

      // Navigate to route when redirect URL is updated in state.
      if (newState.redirectTo) {
        const redirectUrl = new URL(newState.redirectTo, window.location.origin);

        navigate({
          pathname: redirectUrl.pathname,
          search: buildStandaloneRedirectSearch(
            redirectUrl.search,
            newState.value
          ),
          hash: redirectUrl.hash,
        });
        standaloneSearchBoxController.afterRedirection();
      }
    });
    return () => unsubscribe();
  }, [standaloneSearchBoxController, navigate]);

  // Cancel any pending debounce on unmount
  useEffect(() => {
    return () => cancelDebounce();
  }, []);

  const cancelDebounce = () => {
    if (debounceTimer.current !== null) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
  };

  const updateControllers = (value: string) => {
    standaloneSearchBoxController.updateText(value);
    filterSuggestionsGeneratorController.filterSuggestions.forEach(
      (controller) => {
        controller.updateQuery(value);
      }
    );
    setDropdownVisible(true);
  };

  const handleChange = (value: string) => {
    if (value === '') {
      clear();
      return;
    }

    setInputValue(value);

    cancelDebounce();

    if (value.trim().length < minChars) {
      setDropdownVisible(false);
      return;
    }

    // Hide the dropdown while waiting for the debounce so stale suggestions are
    // not shown; updateControllers re-shows it when the debounce fires.
    setDropdownVisible(false);

    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null;
      updateControllers(value);
    }, debounceMs);
  };

  const clear = () => {
    cancelDebounce();
    setInputValue('');
    setDropdownVisible(false);
    searchInputRef.current?.focus();
    standaloneSearchBoxController.clear();
    filterSuggestionsGeneratorController.filterSuggestions.forEach(
      (controller) => {
        controller.clear();
      }
    );
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedValue = inputValue.trim();
    if (trimmedValue === '') {
      clear();
      return;
    }
    // Normalize the visible input to the trimmed value so trailing/leading
    // whitespace is removed from the field on submit.
    setInputValue(trimmedValue);
    searchInputRef.current?.focus();
    // Flush any pending debounce so the controller is always in sync with
    // the visible input before submitting, regardless of debounceMs/minChars.
    cancelDebounce();
    updateControllers(trimmedValue);
    standaloneSearchBoxController.submit();
    setDropdownVisible(false);
  };

  const selectSuggestion = (suggestion: Suggestion) => {
    cancelDebounce();
    standaloneSearchBoxController.selectSuggestion(suggestion.rawValue);
    setDropdownVisible(false);
  };

  const selectFilterSuggestion = ({
    controller,
    value,
  }: {
    controller: FilterSuggestions | CategoryFilterSuggestions;
    value: RegularFacetSearchResult | CategoryFacetSearchResult;
  }) => {
    cancelDebounce();
    // Not on search page so we cannot use 'controller.select(value)' method.
    // Instead we retrieve parameters to redirect to search page.
    const parameters =
      controller.type === 'hierarchical'
        ? controller.getSearchParameters(value as CategoryFacetSearchResult)
        : controller.getSearchParameters(value as RegularFacetSearchResult);

    navigate(`/search?${parameters}`);
    setDropdownVisible(false);
  };

  return (
    <div className="row search-box">
      <div className="col-12">
        <form onSubmit={submit}>
          <div className="mb-3">
            <div className="input-group">
              <span className="input-group-text">Search</span>
              <input
                ref={searchInputRef}
                className="form-control"
                name="value"
                title="Search query"
                type="text"
                value={inputValue}
                onChange={(e) => handleChange(e.target.value)}
              />
              <button
                className="btn btn-outline-secondary"
                type="button"
                disabled={
                  state.isLoading ||
                  state.isLoadingSuggestions ||
                  inputValue.trim() === ''
                }
                onClick={clear}
              >
                Clear
              </button>
              <button
                className="btn btn-outline-secondary"
                type="submit"
                disabled={
                  state.isLoading ||
                  state.isLoadingSuggestions ||
                  inputValue.trim() === ''
                }
              >
                Submit
              </button>
            </div>

            {dropdownVisible && (
              <div className="position-relative mt-2">
                <div className="search-dropdown">
                  <div className="row g-2">
                    <div className="col-12 col-md-4">
                      <div className="list-group shadow">
                        <div className="list-group-item text-muted small">
                          Query Suggestions
                        </div>

                        {state.suggestions.length > 0 ? (
                          state.suggestions.map((suggestion) => (
                            <button
                              key={suggestion.rawValue}
                              type="button"
                              className="list-group-item list-group-item-action"
                              title={suggestion.rawValue}
                              dangerouslySetInnerHTML={{
                                __html: suggestion.highlightedValue,
                              }}
                              onClick={() => selectSuggestion(suggestion)}
                            />
                          ))
                        ) : (
                          <div className="list-group-item">None</div>
                        )}
                      </div>
                    </div>
                    <div className="col-12 col-md-4">
                      <FilterSuggestionsGeneratorComponent
                        controller={filterSuggestionsGeneratorController}
                        onClickFilterSuggestion={selectFilterSuggestion}
                      />
                    </div>
                    <div className="col-12 col-md-4">
                      <InstantProductsComponent
                        controller={instantProductsController}
                        querySuggestions={state.suggestions.map(s => s.rawValue)}
                        currentQuery={state.value}
                        isLoadingSuggestions={state.isLoadingSuggestions}
                        minChars={minChars}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
