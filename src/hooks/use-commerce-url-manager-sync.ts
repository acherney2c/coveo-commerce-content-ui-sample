import { useEffect, useRef, useState } from 'react';
import type { UrlManager } from '@coveo/headless/commerce';
import { useLocation, useNavigate } from 'react-router-dom';

interface ControllerWithUrlManager {
  urlManager(props: { initialState: { fragment: string } }): UrlManager;
  summary(): {
    state: {
      firstRequestExecuted: boolean;
    };
  };
}

const normalizeFragment = (fragment: string) =>
  new URLSearchParams(fragment).toString();

export function useCommerceUrlManagerSync<T extends ControllerWithUrlManager>(
  controller: T | null
) {
  const location = useLocation();
  const navigate = useNavigate();
  const [urlManager, setUrlManager] = useState<UrlManager | null>(null);
  const urlManagerRef = useRef<UrlManager | null>(null);
  const locationRef = useRef(location);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    if (!controller) {
      urlManagerRef.current = null;
      setUrlManager(null);
      return;
    }

    const summary = controller.summary();
    const getFragment = () => locationRef.current.search.slice(1);
    const initialFragment = location.search.slice(1);
    const nextUrlManager = controller.urlManager({
      initialState: {
        fragment: initialFragment,
      },
    });

    urlManagerRef.current = nextUrlManager;
    setUrlManager(nextUrlManager);

    const unsubscribe = nextUrlManager.subscribe(() => {
      const currentLocation = locationRef.current;
      const currentFragment = getFragment();
      const nextFragment = nextUrlManager.state.fragment;

      if (
        normalizeFragment(currentFragment) === normalizeFragment(nextFragment)
      ) {
        return;
      }

      navigate(
        {
          pathname: currentLocation.pathname,
          search: nextFragment ? `?${nextFragment}` : '',
        },
        { replace: !summary.state.firstRequestExecuted }
      );
    });

    if (getFragment()) {
      nextUrlManager.synchronize(getFragment());
    }

    return () => {
      unsubscribe();

      if (urlManagerRef.current === nextUrlManager) {
        urlManagerRef.current = null;
      }

      setUrlManager((current) =>
        current === nextUrlManager ? null : current
      );
    };
  }, [controller, navigate]);

  useEffect(() => {
    const currentUrlManager = urlManagerRef.current;
    if (!currentUrlManager) {
      return;
    }

    const nextFragment = location.search.slice(1);
    if (
      normalizeFragment(currentUrlManager.state.fragment) ===
      normalizeFragment(nextFragment)
    ) {
      return;
    }

    currentUrlManager.synchronize(nextFragment);
  }, [location.search]);

  return urlManager;
}