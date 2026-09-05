import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { subscriptionsService } from './subscriptions.service';

const createPlanSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['monthly', 'half_yearly', 'yearly']),
  price: z.number().positive(),
  currency: z.string().optional(),
  features: z.record(z.any()),
  maxUsers: z.number().optional(),
  maxLocations: z.number().optional(),
  description: z.string().optional()
});

export class SubscriptionsController {
  static async getPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const plans = await subscriptionsService.getPlans();
      res.json(plans);
    } catch (err) {
      next(err);
    }
  }

  static async getAllPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const plans = await subscriptionsService.getAllPlans();
      res.json(plans);
    } catch (err) {
      next(err);
    }
  }

  static async createPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createPlanSchema.parse(req.body);
      const plan = await subscriptionsService.createPlan(validated);
      res.status(201).json(plan);
    } catch (err) {
      next(err);
    }
  }

  static async updatePlan(req: Request, res: Response, next: NextFunction) {
    try {
      const plan = await subscriptionsService.updatePlan(req.params.id, req.body);
      res.json(plan);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const clientId = req.body.clientId || req.user?.clientId;
      if (!clientId) {
        return res.status(400).json({ error: 'BadRequest', message: 'Client ID is required' });
      }
      const { planId, autoRenew } = req.body;
      const result = await subscriptionsService.createSubscription(clientId, planId, autoRenew);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getMy(req: Request, res: Response, next: NextFunction) {
    try {
      const clientId = req.user?.clientId;
      if (!clientId) {
        return res.status(400).json({ error: 'BadRequest', message: 'No client profile associated with this account' });
      }
      const subscriptions = await subscriptionsService.getMySubscriptions(clientId);
      res.json(subscriptions);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const subscription = await subscriptionsService.getSubscriptionById(req.params.id);
      res.json(subscription);
    } catch (err) {
      next(err);
    }
  }

  static async renew(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await subscriptionsService.renewSubscription(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await subscriptionsService.cancelSubscription(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async toggleAutoRenew(req: Request, res: Response, next: NextFunction) {
    try {
      const { autoRenew } = req.body;
      const result = await subscriptionsService.toggleAutoRenew(req.params.id, autoRenew);
      res.json({ message: 'Auto-renew updated', autoRenew: result.auto_renew });
    } catch (err) {
      next(err);
    }
  }

  static async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const history = await subscriptionsService.getSubscriptionHistory(req.params.id);
      res.json(history);
    } catch (err) {
      next(err);
    }
  }
}
