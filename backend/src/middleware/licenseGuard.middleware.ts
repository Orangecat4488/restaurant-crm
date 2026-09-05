import { Request, Response, NextFunction } from 'express';
import { db } from '../database/data-source';
import { JwtUtil } from '../utils/jwt';

/**
 * Middleware that runs on every restaurant-api request and blocks the
 * call with HTTP 402 when no active license is bound to the requester.
 *
 * The client is identified by the JWT subject (userId). We look up the
 * client's most recent subscription and refuse the call if the license
 * is expired or revoked.
 */
export const licenseGuard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract bearer token manually so we can guard anonymous/CLI requests too
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing bearer token for restaurant API'
      });
    }
    const token = auth.split(' ')[1];
    const payload = JwtUtil.verifyAccessToken(token);

    const user = db.users.find(u => u.id === payload.userId);
    if (!user || user.status !== 'active' || user.deleted_at) {
      return res.status(401).json({ error: 'Unauthorized', message: 'User inactive' });
    }

    const client = db.clients.find(c => c.user_id === user.id);
    if (!client) {
      return res.status(402).json({
        error: 'NoLicense',
        message: 'No restaurant account is associated with this user'
      });
    }

    const subscription = db.subscriptions.find(s => s.client_id === client.id);
    if (!subscription) {
      return res.status(402).json({
        error: 'NoLicense',
        message: 'No license has been purchased yet'
      });
    }
    if (new Date() > new Date(subscription.expires_at) || subscription.status === 'expired') {
      return res.status(402).json({
        error: 'LicenseExpired',
        message: 'License expired. Please renew on the customer storefront.',
        expiresAt: subscription.expires_at
      });
    }
    if (subscription.status === 'suspended' || subscription.status === 'cancelled') {
      return res.status(402).json({
        error: 'LicenseSuspended',
        message: 'License is currently suspended. Contact support.'
      });
    }

    const license = db.licenses.find(l => l.subscription_id === subscription.id);
    if (license && license.status === 'revoked') {
      return res.status(402).json({
        error: 'LicenseRevoked',
        message: 'License has been revoked by the administrator.'
      });
    }

    (req as any).licenseContext = { clientId: client.id, subscription, license };
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
    }
    next(err);
  }
};