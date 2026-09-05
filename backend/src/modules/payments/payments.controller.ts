import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { paymentsService } from './payments.service';

const createIntentSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().optional(),
  subscriptionId: z.string().optional(),
  description: z.string().optional()
});

export class PaymentsController {
  static async createIntent(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createIntentSchema.parse(req.body);
      const result = await paymentsService.createPaymentIntent({
        ...validated,
        clientId: req.user?.clientId
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async webhook(req: Request, res: Response, next: NextFunction) {
    try {
      const sig = req.headers['stripe-signature'] as string;
      const result = await paymentsService.handleWebhook(req.body, sig);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const isAdmin = req.user?.role === 'admin' || req.user?.role === 'manager';
      const clientId = isAdmin ? (req.query.clientId as string) : req.user?.clientId;

      const payments = await paymentsService.listPayments({
        clientId,
        status: req.query.status as string
      });
      res.json(payments);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const payment = await paymentsService.getPaymentById(req.params.id);
      res.json(payment);
    } catch (err) {
      next(err);
    }
  }

  static async refund(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await paymentsService.refundPayment(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
