import { Request, Response, NextFunction } from 'express';
import { usersService } from './users.service';

export class UsersController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await usersService.listUsers();
      res.json(users);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await usersService.getUserById(req.params.id);
      res.json(user);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await usersService.updateUser(req.params.id, req.body);
      res.json(user);
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await usersService.deleteUser(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
