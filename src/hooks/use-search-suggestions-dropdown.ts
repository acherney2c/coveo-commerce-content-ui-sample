import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  SearchBox as HeadlessSearchBox,
  SearchBoxState,
  StandaloneSearchBox as HeadlessStandaloneSearchBox,
  Suggestion,
} from '@coveo/headless/commerce';

export interface UseSearchSuggestionsDropdownOptions {
  searchBoxController: HeadlessSearchBox | HeadlessStandaloneSearchBox;
  debounceMs?: number;
  onRedirect?: (redirectTo: string, value: string) => void;
}

export interface UseSearchSuggestionsDropdownResult {
  state: SearchBoxState;
  inputValue: string;
  isOpen: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  handleChange: (value: string) => void;
  handleFocus: () => void;
  handleSubmit: (e: React.FormEvent) => void;
  handleClear: () => void;
  handleSelectSuggestion: (s: Suggestion) => void;
  closeDropdown: () => void;
}

export function useSearchSuggestionsDropdown(
  options: UseSearchSuggestionsDropdownOptions
): UseSearchSuggestionsDropdownResult {
  const { searchBoxController, debounceMs = 300, onRedirect } = options;

  const [state, setState] = useState<SearchBoxState>(searchBoxController.state);
  const [inputValue, setInputValue] = useState(searchBoxController.state.value);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const controllerValueRef = useRef(searchBoxController.state.value);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = searchBoxController.subscribe(() => {
      const s = searchBoxController.state;
      setState(s);
      if (s.value !== controllerValueRef.current) {
        controllerValueRef.current = s.value;
        setInputValue(s.value);
      }
      // Standalone redirect reaction
      if (onRedirect && 'redirectTo' in s && (s as any).redirectTo) {
        onRedirect((s as any).redirectTo, s.value);
        (searchBoxController as any).afterRedirection();
      }
    });
    return () => unsubscribe();
  }, [searchBoxController, onRedirect]);

  // Click-outside: close when mousedown lands outside containerRef
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && containerRef.current.contains(e.target as Node)) {
        return;
      }
      setIsOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  // Escape key: close dropdown
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimer.current !== null) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const cancelDebounce = () => {
    if (debounceTimer.current !== null) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
  };

  const handleFocus = useCallback(() => {
    searchBoxController.showSuggestions();
    setIsOpen(true);
  }, [searchBoxController]);

  const handleChange = useCallback((value: string) => {
    if (value === '') {
      cancelDebounce();
      setInputValue('');
      setIsOpen(false);
      searchBoxController.clear();
      return;
    }
    setInputValue(value);
    setIsOpen(true);
    cancelDebounce();
    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null;
      searchBoxController.updateText(value);
    }, debounceMs);
  }, [searchBoxController, debounceMs]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    cancelDebounce();
    const trimmed = inputValue.trim();
    if (trimmed === '') {
      setIsOpen(false);
      searchBoxController.clear();
      return;
    }
    setInputValue(trimmed);
    searchBoxController.updateText(trimmed);
    searchBoxController.submit();
    setIsOpen(false);
  }, [searchBoxController, inputValue]);

  const handleClear = useCallback(() => {
    cancelDebounce();
    setInputValue('');
    setIsOpen(false);
    searchBoxController.clear();
    inputRef.current?.focus();
  }, [searchBoxController]);

  const handleSelectSuggestion = useCallback((s: Suggestion) => {
    cancelDebounce();
    searchBoxController.selectSuggestion(s.rawValue);
    setIsOpen(false);
  }, [searchBoxController]);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
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
  };
}
