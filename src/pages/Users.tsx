import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, UserCheck, UserX, X } from 'lucide-react';
import { useAuthStore, type UserRole } from '../store/authStore';

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt?: string;
  lastLoginAt?: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор',
  manager: 'Менеджер зала',
  employee: 'Сотрудник / Официант',
  cashier: 'Кассир',
  waiter: 'Официант',
};

const ROLE_COLORS: Record<string, string> = {
  admin: '#EF4444',
  manager: '#8B5CF6',
  employee: '#10B981',
  cashier: '#5B6BFF',
  waiter: '#10B981',
};

interface FormData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

const emptyForm: FormData = { name: '', email: '', password: '', role: 'employee' };

export default function Users() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const currentUser = useAuthStore((s) => s.currentUser);

  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users?limit=100', {
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success && data.data?.items) {
        setUsers(data.data.items);
      }
    } catch (err) {
      console.error('Fetch users error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [accessToken]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  };

  const openEdit = (user: ApiUser) => {
    setEditingId(user.id);
    setForm({ name: user.name, email: user.email, password: '', role: user.role });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Введите имя');
      return;
    }
    if (!form.email.trim() || !form.email.includes('@')) {
      setError('Введите корректный email');
      return;
    }
    if (!editingId && (!form.password || form.password.length < 8)) {
      setError('Пароль должен быть не менее 8 символов и содержать буквы, цифры и спецсимволы');
      return;
    }

    setActionLoading(true);
    setError('');

    try {
      if (editingId) {
        const updatePayload: any = {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
        };

        const res = await fetch(`/api/users/${editingId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          credentials: 'include',
          body: JSON.stringify(updatePayload),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.message || data.error || 'Ошибка при обновлении пользователя');
          setActionLoading(false);
          return;
        }
      } else {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          credentials: 'include',
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password,
            role: form.role,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.message || data.error || 'Ошибка при создании пользователя');
          setActionLoading(false);
          return;
        }
      }

      setShowModal(false);
      setForm(emptyForm);
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Ошибка сети');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      const res = await fetch(`/api/users/${id}/toggle-active`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchUsers();
      } else {
        alert(data.error || 'Не удалось изменить статус пользователя');
      }
    } catch (err) {
      console.error('Toggle active error:', err);
    }
  };

  const handleDelete = async (user: ApiUser) => {
    if (confirm(`Удалить пользователя "${user.name}"?`)) {
      try {
        const res = await fetch(`/api/users/${user.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          credentials: 'include',
        });
        const data = await res.json();
        if (res.ok && data.success) {
          await fetchUsers();
        } else {
          alert(data.error || 'Не удалось удалить пользователя');
        }
      } catch (err) {
        console.error('Delete error:', err);
      }
    }
  };

  const stats = {
    total: users.length,
    active: users.filter((u) => u.active).length,
    admins: users.filter((u) => u.role === 'admin').length,
    managers: users.filter((u) => u.role === 'manager').length,
    employees: users.filter((u) => u.role === 'employee' || u.role === 'cashier' || u.role === 'waiter').length,
  };

  return (
    <div style={{ width: '100%' }}>
      {/* ЗАГОЛОВОК */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, marginBottom: '8px' }}>
            Пользователи
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
            Управление доступом к системе и ролями персонала
          </p>
        </div>
        <button onClick={openCreate} className="btn btn-primary" style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} /> Добавить сотрудника
        </button>
      </div>

      {/* СТАТИСТИКА */}
      <div className="grid grid-4" style={{ marginBottom: '20px' }}>
        <MiniStat label="Всего пользователей" value={stats.total} color="#5B6BFF" />
        <MiniStat label="Активных" value={stats.active} color="#10B981" />
        <MiniStat label="Администраторов" value={stats.admins} color="#EF4444" />
        <MiniStat label="Менеджеров / Персонал" value={stats.managers + stats.employees} color="#8B5CF6" />
      </div>

      {/* СПИСОК */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            Загрузка списка пользователей...
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>Email</th>
                <th>Роль</th>
                <th>Статус</th>
                <th style={{ width: '120px' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={{ opacity: user.active ? 1 : 0.5 }}>
                  <td style={{ fontWeight: '500' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: `${ROLE_COLORS[user.role] || '#5B6BFF'}20`,
                          color: ROLE_COLORS[user.role] || '#5B6BFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '13px',
                        }}
                      >
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span>{user.name}</span>
                    </div>
                  </td>
                  <td style={{ color: '#4B5563' }}>{user.email}</td>
                  <td>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: `${ROLE_COLORS[user.role] || '#5B6BFF'}15`,
                        color: ROLE_COLORS[user.role] || '#5B6BFF',
                      }}
                    >
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${user.active ? 'badge-success' : 'badge-danger'}`}>
                      {user.active ? 'Активен' : 'Заблокирован'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => openEdit(user)}
                        className="btn btn-secondary btn-small"
                        title="Редактировать"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(user.id)}
                        disabled={user.id === currentUser?.id}
                        className="btn btn-secondary btn-small"
                        title={user.active ? 'Заблокировать' : 'Разблокировать'}
                      >
                        {user.active ? <UserX size={14} /> : <UserCheck size={14} />}
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        disabled={user.id === currentUser?.id}
                        className="btn btn-danger btn-small"
                        title="Удалить"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* МОДАЛКА */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{ width: '100%', maxWidth: '440px', padding: '24px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                {editingId ? 'Редактировать пользователя' : 'Добавить пользователя'}
              </h3>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary btn-small">
                <X size={16} />
              </button>
            </div>

            {/* ИМЯ */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
                Имя сотрудника
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Иван Петров"
                style={{ width: '100%' }}
              />
            </div>

            {/* EMAIL */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="ivan@restaurant.com"
                style={{ width: '100%' }}
              />
            </div>

            {/* ПАРОЛЬ (только при создании) */}
            {!editingId && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
                  Пароль (мин. 8 символов, заглавная, строчная, цифра, спецсимвол)
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Pass123!"
                  style={{ width: '100%' }}
                />
              </div>
            )}

            {/* РОЛЬ */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
                Роль в системе
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['admin', 'manager', 'employee'] as UserRole[]).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setForm({ ...form, role })}
                    className={`btn btn-${form.role === role ? 'primary' : 'secondary'}`}
                    style={{ flex: 1, fontSize: '12px', padding: '8px 4px' }}
                  >
                    {ROLE_LABELS[role]}
                  </button>
                ))}
              </div>
            </div>

            {/* ОШИБКА */}
            {error && (
              <p style={{ color: '#EF4444', fontSize: '13px', margin: '0 0 16px', lineHeight: '1.4' }}>{error}</p>
            )}

            {/* КНОПКИ */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={actionLoading}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                {actionLoading ? 'Сохранение...' : editingId ? 'Сохранить' : 'Добавить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card">
      <p className="text-muted" style={{ fontSize: '12px', margin: 0, marginBottom: '6px' }}>{label}</p>
      <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color }}>{value}</p>
    </div>
  );
}

