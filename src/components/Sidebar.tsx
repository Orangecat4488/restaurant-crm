import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  ShoppingCart,
  Package,
  Layers,
  DollarSign,
  Receipt,
  BarChart3,
  PieChart,
  Users,
  Key,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Главная', icon: <Home size={20} /> },
  { path: '/cashier', label: 'Кассир', icon: <ShoppingCart size={20} /> },
  { path: '/orders', label: 'Заказы', icon: <Receipt size={20} /> },
  { path: '/products', label: 'Товары', icon: <Package size={20} /> },
  { path: '/categories', label: 'Категории', icon: <Layers size={20} /> },
  { path: '/receipts', label: 'Чеки', icon: <PieChart size={20} /> },
  { path: '/balance', label: 'Баланс', icon: <DollarSign size={20} /> },
  { path: '/reports', label: 'Отчёты', icon: <BarChart3 size={20} /> },
  { path: '/users', label: 'Пользователи', icon: <Users size={20} />, adminOnly: true },
  { path: '/license', label: 'Лицензия', icon: <Key size={20} />, adminOnly: true },
];

export default function Sidebar() {
  const location = useLocation();
  const currentUser = useAuthStore((s) => s.currentUser);
  const isAdmin = currentUser?.role === 'admin';

  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside className="app-sidebar">
      <div className="sidebar-logo">
        <h1>POS</h1>
        <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0, marginTop: '2px' }}>
          Restaurant CRM
        </p>
      </div>

      <nav className="sidebar-nav">
        {visibleItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЕ ВНИЗУ */}
      <div style={{
        marginTop: 'auto',
        padding: '16px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
      }}>
        <p style={{ color: '#9ca3af', fontSize: '11px', margin: 0 }}>
          {currentUser?.name}
        </p>
      </div>
    </aside>
  );
}
