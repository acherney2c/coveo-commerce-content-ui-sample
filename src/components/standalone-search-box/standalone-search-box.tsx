import { useNavigate } from 'react-router-dom';
import type {
  CategoryFacetSearchResult,
  CategoryFilterSuggestions,
  FilterSuggestions,
  FilterSuggestionsGenerator,
  InstantProducts,
  RegularFacetSearchResult,
  StandaloneSearchBox as HeadlessStandaloneSearchBox,
} from '@coveo/headless/commerce';
import { useSearchSuggestionsDropdown } from '../../hooks/use-search-suggestions-dropdown.js';
import SearchSuggestionsDropdown from '../search-suggestions-dropdown/search-suggestions-dropdown.js';

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
  debounceMs?: number;
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

  const navigate = useNavigate();

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
    searchBoxController: standaloneSearchBoxController,
    filterSuggestionsGeneratorController,
    debounceMs,
    minChars,
    onRedirect: (redirectTo, value) => {
      const redirectUrl = new URL(redirectTo, window.location.origin);
      navigate({
        pathname: redirectUrl.pathname,
        search: buildStandaloneRedirectSearch(redirectUrl.search, value),
        hash: redirectUrl.hash,
      });
    },
  });

  const selectFilterSuggestion = (args: {
    controller: FilterSuggestions | CategoryFilterSuggestions;
    value: RegularFacetSearchResult | CategoryFacetSearchResult;
  }) => {
    const { controller, value } = args;
    const parameters =
      controller.type === 'hierarchical'
        ? controller.getSearchParameters(value as CategoryFacetSearchResult)
        : controller.getSearchParameters(value as RegularFacetSearchResult);

    navigate(`/search?${parameters}`);
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
            />
          </div>
        </form>
      </div>
    </div>
  );
}
