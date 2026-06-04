# Coveo Headless Commerce React Sample

A React-based example implementation demonstrating **Coveo Headless Commerce and Content**. This project provides a fully functional search, product listing, product detail, and cart experience powered by the Coveo Commerce API and Content Search powered by Coveo Search API..

## Features

- **Search Page** – Full-text product search with facets, did-you-mean, sort, and pagination.
- **Product Listing Pages** – Category/URL-based listings managed via the Coveo Merchandising Hub.
- **Product Detail Page** – Individual product view with recommendations.
- **Cart Page** – Client-side cart with local storage persistence.
- **Recommendations** – Slot-based recommendations on home, cart, listing, and product pages.
- **Multi-Store Support** – Optional store selector with dictionary field context for regional pricing.
- **Server-Side Token Generation** – An Express server generates scoped search tokens so API keys are never exposed to the browser.

> **⚠️ Demo Only** – The token server (`server/server.ts`) is intentionally minimal. It does **not** implement user authentication or rate limiting. Before any non-local deployment, protect the `/token` endpoint with your application's session/auth layer and a rate limiter. See the [coveocc SAP Commerce Connector](https://github.com/coveo/coveo-sap-commerce-connector/tree/v4/coveo/coveocc) for a production reference that gates token generation behind OAuth2.
>
> The `/token` endpoint accepts an optional `?store=` query parameter used for `dictionaryFieldContext` (store-specific pricing). When you enable this feature, **validate the store code against an allowlist** of known stores before passing it to the Coveo API — otherwise any caller can request pricing scoped to arbitrary store contexts in your org.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, React Router 6, Bootstrap 5 |
| State / API | `@coveo/headless` (Commerce controllers) |
| Server | Express 4, `@coveo/platform-client` |
| Build | Vite 5, TypeScript 5.6 |
| Testing | Vitest, Testing Library, Playwright |

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9 (or equivalent package manager)
- A Coveo organisation with Commerce enabled and an API key with the **Impersonate** privilege.

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```dotenv
ORGANIZATION_ID=<your Coveo org ID>
API_KEY=<API key with Impersonate privilege>
USER_EMAIL=<email for the search token identity>
PLATFORM_URL=https://platform-au.cloud.coveo.com
PLATFORM_ENVIRONMENT=prod
SERVER_PORT=3021
```

> **Note:** The `.env` file contains secrets and must **never** be committed to source control.

### 3. (Optional) Adjust the environment configuration

Frontend settings such as `organizationId`, `trackingId`, listing URLs, store options, and recommendation slot IDs are defined in:

- [`src/environments/environment.ts`](src/environments/environment.ts) – frontend configuration

### 4. Start the application

**Sample mode** (default — no `.env` needed):

```bash
npm run dev
```

This starts only the Vite dev server. The app uses Coveo's built-in sample org (`useSampleConfig: true` in `environment.ts`).

**Your own org** (requires `.env` with API key, set `useSampleConfig: false` in `environment.ts`):

```bash
npm start
```

This runs two processes concurrently:

| Process | URL | Description |
|---------|-----|-------------|
| **Token Server** (Express) | `http://localhost:3021` | Generates Coveo search tokens via `/token` |
| **Dev Server** (Vite) | `http://localhost:4200` | Serves the React application with HMR |

### 5. Open the app

Navigate to **http://localhost:4200** in your browser.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start only the Vite dev server (sample mode, no `.env` needed) |
| `npm start` | Start both the token server and the Vite dev server (your own org) |
| `npm run start:server` | Start only the Express token server |
| `npm run build` | Create a production build |
| `npm run preview` | Preview the production build |
| `npm test` | Run unit tests (Vitest) |

## Project Structure

```
headless-commerce-react-sample/
├── server/                      # Express token server
│   ├── server.ts                # Server entry point
│   └── middlewares/
│       ├── environmentCheck.ts  # Validates required env vars
│       ├── errorHandler.ts      # Global error handler
│       └── searchToken.ts       # Token generation & store context
├── src/
│   ├── App.tsx                  # Root component with routing & navigation
│   ├── index.tsx                # Application entry point
│   ├── context/
│   │   └── engine.ts            # Coveo Commerce engine initialisation
│   ├── environments/
│   │   └── environment.ts       # Frontend configuration
│   ├── components/              # Reusable UI components
│   │   ├── breadcrumb-manager/
│   │   ├── cart/
│   │   ├── facets/
│   │   ├── product-list/
│   │   ├── recommendations-interface/
│   │   ├── search-box/
│   │   ├── sort/
│   │   └── ...
│   ├── pages/                   # Route-level page components
│   │   ├── home-page.tsx
│   │   ├── search-page.tsx
│   │   ├── listing-page.tsx
│   │   ├── product-page.tsx
│   │   └── cart-page.tsx
│   └── utils/                   # Helper utilities
├── .env.example                 # Template for required env vars
├── package.json
├── tsconfig.json
├── vite.config.js
└── vitest.config.ts
```

## How It Works

1. **Token Server** – On page load the React app requests a search token from `GET /token`. The Express server uses `@coveo/platform-client` to generate a scoped token (with optional `dictionaryFieldContext` for store-specific pricing) and returns it to the client.
2. **Commerce Engine** – The Coveo Headless Commerce engine is initialised in [`src/context/engine.ts`](src/context/engine.ts) with the token. It manages all API calls, state, and analytics automatically.
3. **Controllers** – Each page builds Headless controllers (search, listing, product, cart, recommendations) and subscribes to state changes to re-render the UI.
4. **Token Renewal** – When an access token expires, the engine calls `renewAccessToken` to transparently fetch a new one from the token server.

## Multi-Store Pricing

If `storeOptions` is configured in the environment file, a store selector appears in the navigation bar. Selecting a store:

1. Sends the store code as a query parameter to `/token?store=<code>`.
2. The token middleware maps the code to a `dictionaryFieldContext` value (e.g. `ec_price`, `ec_promo_price`).
3. The Commerce API returns pricing specific to that store context.
