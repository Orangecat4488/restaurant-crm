import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { licensesService } from './licenses.service';

const activateSchema = z.object({
  deviceFingerprint: z.string().min(3, 'Device fingerprint is required')
});

export class LicensesController {
  static async validate(req: Request, res: Response, next: NextFunction) {
    try {
      const key = req.params.key || req.body.key;
      if (!key) {
        return res.status(400).json({ error: 'BadRequest', message: 'License key is required' });
      }
      const result = await licensesService.validateLicense(key);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async activate(req: Request, res: Response, next: NextFunction) {
    try {
      const key = req.params.key || req.body.key;
      const { deviceFingerprint } = activateSchema.parse(req.body);
      const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

      const result = await licensesService.activateLicense(key, deviceFingerprint, ip);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const license = await licensesService.generateLicense(req.body);
      res.status(201).json({
        message: 'License key generated',
        licenseKey: license.key,
        license
      });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const license = await licensesService.getLicense(req.params.id);
      res.json(license);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const license = await licensesService.updateLicense(req.params.id, req.body);
      res.json({ message: 'License updated successfully', license });
    } catch (err) {
      next(err);
    }
  }

  static async revoke(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await licensesService.revokeLicense(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async deactivate(req: Request, res: Response, next: NextFunction) {
    try {
      const { key } = req.params;
      const { deviceFingerprint } = activateSchema.parse(req.body);
      const result = await licensesService.deactivateLicense(key, deviceFingerprint);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const list = await licensesService.listLicenses(req.query as any);
      res.json(list);
    } catch (err) {
      next(err);
    }
  }
}
