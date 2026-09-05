import { db } from '../../database/data-source';
import { UserRole, UserStatus } from '../../database/entities';

export class UsersService {
  async listUsers() {
    return db.users.map(u => ({
      id: u.id,
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      role: u.role,
      status: u.status,
      createdAt: u.created_at,
      updatedAt: u.updated_at
    }));
  }

  async getUserById(id: string) {
    const u = db.users.find(user => user.id === id);
    if (!u) throw new Error('User not found');
    return {
      id: u.id,
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      role: u.role,
      status: u.status,
      createdAt: u.created_at,
      updatedAt: u.updated_at
    };
  }

  async updateUser(id: string, updates: { role?: UserRole; status?: UserStatus; firstName?: string; lastName?: string }) {
    const user = db.users.find(u => u.id === id);
    if (!user) throw new Error('User not found');

    if (updates.role) user.role = updates.role;
    if (updates.status) user.status = updates.status;
    if (updates.firstName) user.first_name = updates.firstName;
    if (updates.lastName) user.last_name = updates.lastName;
    user.updated_at = new Date();

    await db.createAuditLog({
      action: 'USER_UPDATED',
      resourceType: 'user',
      resourceId: user.id,
      changes: updates
    });

    return this.getUserById(id);
  }

  async deleteUser(id: string) {
    const user = db.users.find(u => u.id === id);
    if (!user) throw new Error('User not found');

    user.status = 'inactive';
    user.deleted_at = new Date();
    user.updated_at = new Date();

    await db.createAuditLog({
      action: 'USER_DELETED',
      resourceType: 'user',
      resourceId: user.id
    });

    return { success: true, message: 'User deactivated successfully' };
  }
}

export const usersService = new UsersService();
