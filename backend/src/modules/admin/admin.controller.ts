import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { adminService } from './admin.service';
import { db } from '../../database/data-source';
import { CryptoUtil } from '../../utils/crypto';
import { bruteForceGuard } from '../../utils/bruteForceGuard';

export class AdminController {
  static async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const metrics = await adminService.getDashboardMetrics();
      res.json(metrics);
    } catch (err) {
      next(err);
    }
  }

  static async getClients(req: Request, res: Response, next: NextFunction) {
    try {
      const clients = await adminService.getClients();
      res.json(clients);
    } catch (err) {
      next(err);
    }
  }

  static async getClientDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const client = await adminService.getClientDetail(req.params.id);
      res.json(client);
    } catch (err) {
      next(err);
    }
  }

  static async toggleClientStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;
      const result = await adminService.toggleClientStatus(req.params.id, status);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async bulkGenerateLicenses(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.bulkGenerateLicenses(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getReports(req: Request, res: Response, next: NextFunction) {
    try {
      const reports = await adminService.getReports();
      res.json(reports);
    } catch (err) {
      next(err);
    }
  }

  static async getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const analytics = await adminService.getAnalytics();
      res.json(analytics);
    } catch (err) {
      next(err);
    }
  }

  static async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(db.auditLogs.slice(0, 50));
    } catch (err) {
      next(err);
    }
  }

  static async resetClientCredentials(req: Request, res: Response, next: NextFunction) {
    try {
      const schema = z.object({
        newPassword: z.string().min(6).optional()
      });
      const { newPassword } = schema.parse(req.body);
      const password = newPassword || CryptoUtil.generateTempPassword();

      const client = db.clients.find(c => c.id === req.params.id);
      if (!client) return res.status(404).json({ error: 'NotFound', message: 'Client not found' });

      const user = db.users.find(u => u.id === client.user_id);
      if (!user) return res.status(404).json({ error: 'NotFound', message: 'Client user not found' });

      user.password_hash = await CryptoUtil.hashPassword(password);
      user.original_password = password;
      user.updated_at = new Date();

      await db.createAuditLog({
        userId: req.user?.userId,
        action: 'CLIENT_CREDENTIALS_RESET',
        resourceType: 'user',
        resourceId: user.id
      });

      res.json({
        success: true,
        email: user.email,
        password
      });
    } catch (err) {
      next(err);
    }
  }

  static async unlockClient(req: Request, res: Response, next: NextFunction) {
    try {
      const client = db.clients.find(c => c.id === req.params.id);
      if (!client) return res.status(404).json({ error: 'NotFound', message: 'Client not found' });

      const user = db.users.find(u => u.id === client.user_id);
      if (!user) return res.status(404).json({ error: 'NotFound', message: 'Client user not found' });

      const before = await db.getLoginAttemptByEmail(user.email);
      await bruteForceGuard.reset(user.email);
      const cleared = before ? 1 : 0;

      await db.createAuditLog({
        userId: req.user?.userId,
        action: 'CLIENT_UNLOCKED',
        resourceType: 'user',
        resourceId: user.id,
        changes: { cleared }
      });

      res.json({ success: true, message: 'Login lockouts cleared for client', cleared });
    } catch (err) {
      next(err);
    }
  }
}
