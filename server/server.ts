/**
 * ⚠️  DEMO ONLY — NOT PRODUCTION CODE
 *
 * This Express server demonstrates the Coveo Search Token API integration
 * pattern. It intentionally omits production concerns including:
 *
 *  • User authentication (requests are unauthenticated / anonymous)
 *  • Rate limiting (no throttle on token minting)
 *  • HTTPS termination
 *
 * Before deploying beyond localhost, front this endpoint with your
 * application's session/auth layer and a rate limiter (e.g. express-rate-limit).
 * See the coveocc SAP Commerce Connector for a production reference that gates
 * token generation behind OAuth2 + an authenticated principal.
 */

import express from 'express';
import cors from 'cors';
import * as http from 'http';
import { config } from 'dotenv';
import { environmentCheck } from './middlewares/environmentCheck.js';
import { ensureTokenGenerated } from './middlewares/searchToken.js';
import { errorHandler } from './middlewares/errorHandler.js';
import * as fs from 'node:fs';

let env = '.env';

// Load specific configuration file if provided as argument.
if (
  process.env['npm_config_env'] &&
  fs.existsSync(`.env.${process.env['npm_config_env']}`)
) {
  env = `.env.${process.env['npm_config_env']}`;
}

config({
  path: env,
});

const app = express();

app.use(express.json());

// Restrict CORS to known storefront origins (no wildcard). Configure extra
// origins via ALLOWED_ORIGINS (comma-separated). The coveocc connector only
// exposes its token endpoint through OCC, behind OAuth2 and an origin
// allowlist — never to any origin.
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:4230')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins }));

/**
 * Define endpoint to retrieve search token.
 * Accepts optional 'store' query parameter for dictionaryFieldContext.
 */
app.get<Record<string, string>, any, { token: string }, { store?: string }>(
  '/token',
  environmentCheck,
  ensureTokenGenerated,
  (req, res) => {
    res.json({ token: req.body.token });
  },
);

// Error handler must be registered AFTER the routes so it can catch their
// errors. (Express identifies error middleware by its 4-arg arity, but only
// runs handlers registered downstream of where next(err) is called.)
app.use(errorHandler);

/**
 * Get port from environment and store in Express.
 */
const port = process.env['SERVER_PORT'] || '3011';
app.set('port', port);

/**
 * Create HTTP server.
 */
const server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */
app.listen(port, () => {
  console.log(`Search token server listening at http://localhost:${port}`);
});
