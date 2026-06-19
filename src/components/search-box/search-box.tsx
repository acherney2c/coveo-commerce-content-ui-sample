import type {
  CategoryFacetSearchResult,
  CategoryFilterSuggestions,
  FilterSuggestions,
  FilterSuggestionsGenerator,
  InstantProducts,
  RegularFacetSearchResult,
  SearchBox as HeadlessSearchBox,
} from '@coveo/headless/commerce';
import { useSearchSuggestionsDropdown } from '../../hooks/use-search-suggestions-dropdown.js';
import SearchSuggestionsDropdown from '../search-suggestions-dropdown/search-suggestions-dropdown.js';
import './search-box.css';

interface ISearchBoxProps {
  searchBoxController: HeadlessSearchBox;
  instantProductsController: InstantProducts;
  filterSuggestionsGeneratorController: FilterSuggestionsGenerator;
  debounceMs?: number;
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

  const {
    state,
    inputValue,
    isOpen,
    containerRef,
    inputRef,
    handleChange,
    handleFocus,
    handleSubmit,
    handleClear,
    handleSelectSuggestion,
    closeDropdown,
  } = useSearchSuggestionsDropdown({
    searchBoxController,
    debounceMs,
  });

  const selectFilterSuggestion = (args: {
    controller: FilterSuggestions | CategoryFilterSuggestions;
    value: RegularFacetSearchResult | CategoryFacetSearchResult;
  }) => {
    const { controller, value } = args;
    controller.type === 'hierarchical'
      ? controller.select(value as CategoryFacetSearchResult)
      : controller.select(value as RegularFacetSearchResult);
    closeDropdown();
  };

  return (
    <div className="row search-box" ref={containerRef}>
      <div className="col-12">
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <div className="input-group">
              <span className="input-group-text">Search</span>
              <input
                ref={inputRef}
                className="form-control"
                name="value"
                title="Search query"
                type="text"
                value={inputValue}
                onChange={(e) => handleChange(e.target.value)}
                onFocus={handleFocus}
              />
              <button
                className="btn btn-outline-secondary"
                type="button"
                disabled={
                  state.isLoading ||
                  state.isLoadingSuggestions ||
                  inputValue.trim() === ''
                }
                onClick={handleClear}
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

            <SearchSuggestionsDropdown
              state={state}
              isOpen={isOpen}
              minChars={minChars}
              filterSuggestionsGeneratorController={filterSuggestionsGeneratorController}
              instantProductsController={instantProductsController}
              onSelectSuggestion={handleSelectSuggestion}
              onSelectFilterSuggestion={selectFilterSuggestion}
              onSelectProduct={closeDropdown}
            />
          </div>
        </form>
      </div>
    </div>
  );
}
