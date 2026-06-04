import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  buildCart,
  buildContext,
  type Cart,
  type CommerceEngine,
  type Context,
} from '@coveo/headless/commerce';
import { getEngine } from './context/engine.js';
import { registerCartPersistence } from './utils/cart-utils.js';
import { environment } from './environments/environment.js';
import HomePage from './pages/home-page.js';
import SearchPage from './pages/search-page.js';
import ListingPage from './pages/listing-page.js';
import ProductPage from './pages/product-page.js';
import CartPage from './pages/cart-page.js';

// Store options from environment config
const STORE_OPTIONS = environment.storeOptions ?? [];

// Helper to get/set selected store from localStorage
const getStoredStoreCode = (): string => {
  if (STORE_OPTIONS.length === 0) return '';
  return localStorage.getItem('selectedStoreCode') || STORE_OPTIONS[0].code;
};

const setStoredStoreCode = (code: string): void => {
  localStorage.setItem('selectedStoreCode', code);
};

function App() {
  const [engine, setEngine] = useState<CommerceEngine | null>(null);
  const [cartController, setCartController] = useState<Cart | null>(null);
  const [contextController, setContextController] = useState<Context | null>(null);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [selectedStoreCode, setSelectedStoreCode] = useState(getStoredStoreCode());
  const [isEngineLoading, setIsEngineLoading] = useState(false);

  const productListingUrls = environment.listing.urls;
  const organizationId = environment.organizationId;
  const trackingId = environment.analytics.trackingId;
  const adminConsoleUrl = `https://platform.cloud.coveo.com/admin/#${organizationId}/organization/organization-navigation`;
  
  const cmhListingsUrl = () => {    
    return `https://commerce-au.cloud.coveo.com/#/${organizationId}/listings?trackingId=${trackingId}`;
  };

  useEffect(() => {
    setIsEngineLoading(true);
    let unsubscribePersistence: (() => void) | undefined;
    let unsubscribeBadge: (() => void) | undefined;
    let cancelled = false;

    getEngine(selectedStoreCode)
      .then((engine) => {
        if (cancelled) return;
        setEngine(engine);

        const cart = buildCart(engine);
        setCartController(cart);

        // Persist cart state via the single owner.
        unsubscribePersistence = registerCartPersistence(cart);

        // Reflect items seeded from storage immediately, then track changes.
        setCartItemCount(cart.state.items.length);
        unsubscribeBadge = cart.subscribe(() => {
          setCartItemCount(cart.state.items.length);
        });

        const context = buildContext(engine);
        setContextController(context);
        setIsEngineLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Failed to initialize commerce engine', error);
        setIsEngineLoading(false);
      });

    return () => {
      cancelled = true;
      unsubscribePersistence?.();
      unsubscribeBadge?.();
    };
  }, [selectedStoreCode]);

  const handleStoreChange = (newStoreCode: string) => {
    if (newStoreCode !== selectedStoreCode) {
      setStoredStoreCode(newStoreCode);
      setSelectedStoreCode(newStoreCode);
      // Force page reload to reinitialize with new token
      window.location.reload();
    }
  };

  if (!engine || !cartController || !contextController || isEngineLoading) {
    return <div className="container mt-4">Loading...</div>;
  }

  return (
    <Router>
      <Navigation
        cartItemCount={cartItemCount}
        productListingUrls={productListingUrls}
        organizationId={organizationId}
        trackingId={trackingId}
        adminConsoleUrl={adminConsoleUrl}
        cmhListingsUrl={cmhListingsUrl}
        selectedStoreCode={selectedStoreCode}
        onStoreChange={handleStoreChange}
      />
      <div className="container">
        <div className="row">
          <div className="col-12">
            <div className="mt-4">
              <Routes>
                <Route
                  path="/"
                  element={
                    <HomePage
                      engine={engine}
                      cartController={cartController}
                      contextController={contextController}
                    />
                  }
                />
                <Route
                  path="/search"
                  element={
                    <SearchPage
                      engine={engine}
                      cartController={cartController}
                      contextController={contextController}
                    />
                  }
                />
                <Route
                  path="/listing/:url"
                  element={
                    <ListingPage
                      engine={engine}
                      cartController={cartController}
                      contextController={contextController}
                    />
                  }
                />
                <Route
                  path="/product/:id/*"
                  element={
                    <ProductPage
                      engine={engine}
                      cartController={cartController}
                      contextController={contextController}
                    />
                  }
                />
                <Route
                  path="/cart"
                  element={
                    <CartPage
                      engine={engine}
                      cartController={cartController}
                      contextController={contextController}
                    />
                  }
                />
              </Routes>
            </div>
          </div>
        </div>
      </div>
    </Router>
  );
}

interface NavigationProps {
  cartItemCount: number;
  productListingUrls: string[];
  organizationId: string;
  trackingId: string;
  adminConsoleUrl: string;
  cmhListingsUrl: () => string;
  selectedStoreCode: string;
  onStoreChange: (storeCode: string) => void;
}

function Navigation(props: NavigationProps) {
  const { cartItemCount, productListingUrls, organizationId, trackingId, adminConsoleUrl, cmhListingsUrl, selectedStoreCode, onStoreChange } = props;
  const [showListings, setShowListings] = useState(false);
  const [showStoreSelector, setShowStoreSelector] = useState(false);
  const location = useLocation();

  const toggleStoreSelector = () => {
    setShowStoreSelector(!showStoreSelector);
  };

  const handleStoreSelect = (storeCode: string) => {
    setShowStoreSelector(false);
    onStoreChange(storeCode);
  };

  const selectedStore = STORE_OPTIONS.find(s => s.code === selectedStoreCode) || STORE_OPTIONS[0];

  const toggleListings = () => {
    setShowListings(!showListings);
  };

  return (
    <nav className="navbar navbar-expand bg-body-tertiary">
      <div className="container-fluid">
        <Link className="navbar-brand" to="/" aria-label="Home">
          Headless Commerce & Content React Demo
        </Link>
        <div className="collapse navbar-collapse">
          <div className="navbar-nav">
            <Link
              className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
              to="/"
              aria-label="Home Page"
            >
              Home Page
            </Link>
            <Link
              className={`nav-link ${location.pathname === '/search' ? 'active' : ''}`}
              to="/search"
              aria-label="Search Page"
            >
              Search Page
            </Link>
            <li className="nav-item dropdown">
              <button
                className={`nav-link dropdown-toggle ${showListings ? 'show' : ''}`}
                aria-expanded={showListings}
                aria-label="Listing Pages"
                onClick={toggleListings}
              >
                Listing Pages
              </button>
              <ul className={`dropdown-menu ${showListings ? 'show' : ''}`}>
                <li>
                  <h6 className="dropdown-header d-flex align-items-center justify-content-between gap-2">
                    <span>Listing URLs</span>
                    <a
                      className="btn btn-sm btn-link"
                      href={cmhListingsUrl()}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Manage in Merchandising Hub"
                    >
                      Manage in Merchandising Hub
                    </a>
                  </h6>
                </li>
                {productListingUrls.length > 0 ? (
                  productListingUrls.map((url, index) => (
                    <li key={index}>
                      <Link
                        className="dropdown-item small"
                        to={`/listing/${encodeURIComponent(url)}`}
                        onClick={toggleListings}
                      >
                        {url}
                      </Link>
                    </li>
                  ))
                ) : (
                  <li>
                    <p className="m-0 px-3 py-2 small">
                      Configure <code>listing.urls</code> in{' '}
                      <code>src/environments/environment.ts</code> to
                      browse Product Listing Pages. URLs must match those configured
                      in Coveo Merchandising Hub.
                    </p>
                  </li>
                )}
              </ul>
            </li>
            <Link
              className={`nav-link ${location.pathname === '/cart' ? 'active' : ''}`}
              to="/cart"
              aria-label="Cart Page"
            >
              Cart Page ({cartItemCount})
            </Link>
          </div>
        </div>
        <div className="navbar-nav d-flex align-items-center gap-2">
          {STORE_OPTIONS.length > 0 && (
            <li className="nav-item dropdown">
              <button
                className={`nav-link dropdown-toggle ${showStoreSelector ? 'show' : ''}`}
                aria-expanded={showStoreSelector}
                aria-label="Select Store"
                onClick={toggleStoreSelector}
              >
                <span className="badge text-bg-primary">
                  Store: {selectedStore.label}
                </span>
              </button>
              <ul className={`dropdown-menu dropdown-menu-end ${showStoreSelector ? 'show' : ''}`}>
                <li>
                  <h6 className="dropdown-header">Select Store View</h6>
                </li>
                {STORE_OPTIONS.map((store) => (
                  <li key={store.id}>
                    <button
                      className={`dropdown-item ${store.code === selectedStoreCode ? 'active' : ''}`}
                      onClick={() => handleStoreSelect(store.code)}
                    >
                      {store.label}
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          )}
          <span className="nav-link">
            <span className="badge text-bg-light border">
              Tracking ID: {trackingId}
            </span>
          </span>
          <a
            className="nav-link"
            href={adminConsoleUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Administration Console"
          >
            <span className="badge text-bg-light border">
              Org ID: {organizationId}
            </span>
          </a>
        </div>
      </div>
    </nav>
  );
}

export default App;
