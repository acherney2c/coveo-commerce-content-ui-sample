import 'isomorphic-fetch';
import 'abortcontroller-polyfill/dist/abortcontroller-polyfill-only.js';

import { Request, Response, NextFunction } from 'express';
import {
  PlatformClient,
  RestUserIdType,
  TokenModel,
} from '@coveo/platform-client';

/**
 * Optional: map incoming store codes to dictionary field context values.
 * Uncomment and populate if your org needs to remap codes before passing to the API.
 *
 * const STORE_CODE_MAP: Record<string, string> = {
 *   'frontend-code': 'index-value',
 * };
 */

export function ensureTokenGenerated(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Read store code from ?store= query param. Passed straight through as the
  // dictionaryFieldContext value — no mapping required unless your index values
  // differ from what the frontend sends.
  const storeCode = (req.query.store as string) || '';

  const platform: PlatformClient =
    req.app.locals.platform ||
    new PlatformClient({
      host: process.env.PLATFORM_URL,
      organizationId: process.env.ORGANIZATION_ID,
      accessToken: process.env.API_KEY!,
    });

  platform.search
    .createToken({
      userIds: [
        {
          name: process.env.USER_EMAIL!,
          provider: 'Email Security Provider',
          type: RestUserIdType.User,
        },
      ],

      /**
       * Optional: enforce a dictionaryFieldContext for store-specific field values.
       * Uncomment and adjust the field name to match your index schema.
       *
       * dictionaryFieldContext: storeCode ? {
       *   'ec_price': storeCode,
       * } : {},
       */
    } as Parameters<typeof platform.search.createToken>[0] & {
      dictionaryFieldContext?: Record<string, string>;
    })
    .then((data: TokenModel) => {
      req.body = req.body || {};
      req.body.token = data.token;
      next();
    })
    .catch((err) => {
      next(err);
    });

  if (!req.app.locals.platform) {
    req.app.locals.platform = platform;
  }
}
