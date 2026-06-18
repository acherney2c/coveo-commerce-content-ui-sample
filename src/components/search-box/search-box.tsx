// This is a reference/sample implementation. Accessibility is intentionally left
// for implementers to address in their production code.
/* eslint-disable jsx-a11y/control-has-associated-label */
import { useEffect, useRef, useState } from 'react';
import type {
  CategoryFacetSearchResult,
  CategoryFilterSuggestions,
  FilterSuggestions,
  FilterSuggestionsGenerator,
  InstantProducts,
  RegularFacetSearchResult,
  SearchBox as HeadlessSearchBox,
  SearchBoxState,
  Suggestion,
} from '@coveo/headless/commerce';
import InstantProductsComponent from '../instant-products/instant-products.js';
import FilterSuggestionsGeneratorComponent from '../filter-suggestions/filter-suggestions-generator.js';
import './search-box.css';

interface ISearchBoxProps {
  searchBoxController: HeadlessSearchBox;
  instantProductsController: InstantProducts;
  filterSuggestionsGeneratorController: FilterSuggestionsGenerator;
  /** Milliseconds to wait after the last keystroke before querying controllers. Default: 300 */
  debounceMs?: number;
  /** Minimum number of characters required before querying controllers. Default: 3 */
  minChars?: number;
}

export default function SearchBox(props: ISearchBoxProps) {
  const {
    searchBoxController,
    instantProductsController,
    filterSuggestionsGeneratorController,
    debounceMs = 300,
    minChars = 3,
  } = props;

  const [state, setState] = useState<SearchBoxState>(searchBoxController.state);
  const [inputValue, setInputValue] = useState(searchBoxController.state.value);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks the last value we observed from the controller to avoid overwriting
  // in-progress user input during unrelated controller state updates (e.g. loading).
  const controllerValueRef = useRef(searchBoxController.state.value);

  useEffect(() => {
    const unsubscribe = searchBoxController.subscribe(() => {
      const s = searchBoxController.state;
      setState(s);
      // Only sync inputValue when the controller's value actually changes to avoid
      // overwriting in-progress typing during unrelated updates (loading, etc.).
      if (s.value !== controllerValueRef.current) {
        controllerValueRef.current = s.value;
        setInputValue(s.value);
      }
    });
    return () => unsubscribe();
  }, [searchBoxController]);

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
    searchBoxController.updateText(value);
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

    if (value.length < minChars) {
      setDropdownVisible(false);
      return;
    }

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
    searchBoxController.clear();
    filterSuggestionsGeneratorController.filterSuggestions.forEach(
      (controller) => {
        controller.clear();
      }
    );
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue === '') {
      return;
    }
    searchInputRef.current?.focus();
    // Flush any pending debounce so the controller is always in sync with
    // the visible input before submitting, regardless of debounceMs/minChars.
    cancelDebounce();
    updateControllers(inputValue);
    searchBoxController.submit();
    setDropdownVisible(false);
  };

  const selectSuggestion = (suggestion: Suggestion) => {
    cancelDebounce();
    searchBoxController.selectSuggestion(suggestion.rawValue);
    setDropdownVisible(false);
  };

  const selectFilterSuggestion = (
    controller: FilterSuggestions | CategoryFilterSuggestions,
    value: RegularFacetSearchResult | CategoryFacetSearchResult
  ) => {
    cancelDebounce();
    controller.type === 'hierarchical'
      ? controller.select(value as CategoryFacetSearchResult)
      : controller.select(value as RegularFacetSearchResult);
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
                  inputValue === ''
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
                  inputValue === ''
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
                        onClickFilterSuggestion={(args) =>
                          selectFilterSuggestion(args.controller, args.value)
                        }
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
