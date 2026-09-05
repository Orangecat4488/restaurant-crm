import { useMemo, useState } from 'react';
import {
  Search,
  Printer,
  RotateCcw,
  XCircle,
  X,
  Receipt as ReceiptIcon,
  ShoppingBag,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { useOrdersStore } from '../store/ordersStore';
import type { Order, OrderStatus, OrderType, PaymentMethod } from '../types/order';
import {
  ORDER_TYPE_LABELS,
  PAYMENT_LABELS,
  STATUS_BADGE,
  STATUS_LABELS,
} from '../types/order';
import { formatDate, formatMoney, formatSum, formatTime } from '../utils/format';
import {
  PERIOD_LABELS,
  averageCheck,
  filterByPeriod,
  itemsCount,
  refundedTotal,
  revenue,
} from '../utils/stats';
import type { PeriodKey } from '../utils/stats';
import Receipt from '../components/Receipt';

const PER_PAGE = 12;

const PERIODS: PeriodKey[] = ['today', 'week', 'month', 'all'];
const STATUSES: OrderStatus[] = ['completed', 'pending', 'refunded', 'cancelled'];
const TYPES: OrderType[] = ['dine-in', 'takeaway', 'delivery'];
const PAYMENTS: PaymentMethod[] = ['cash', 'card', 'click', 'payme', 'uzumbank'];

interface StatTileProps {
  title: string;
  value: string | number;
  hint?: string;
  icon: React.ReactNode;
  color?: string;
}

function StatTile({ title, value, hint, icon, color }: StatTileProps) {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p className="text-muted" style={{ fontSize: '12px', margin: 0, marginBottom: '8px' }}>
            {title}
          </p>
          <p style={{ fontSize: '22px', fontWeight: 'bold', margin: 0 }}>{value}</p>
          {hint && (
            <p className="text-muted" style={{ fontSize: '12px', margin: 0, marginTop: '6px' }}>
              {hint}
            </p>
          )}
        </div>
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(91,107,255,0.15), rgba(170,59,255,0.1))',
            padding: '10px',
            borderRadius: '12px',
            color: color || 'var(--primary)',
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function Orders() {
  const orders = useOrdersStore((s) => s.orders);
  const refundOrder = useOrdersStore((s) => s.refundOrder);
  const cancelOrder = useOrdersStore((s) => s.cancelOrder);
  const markPrinted = useOrdersStore((s) => s.markPrinted);

  const [period, setPeriod] = useState<PeriodKey>('today');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | OrderStatus>('all');
  const [orderType, setOrderType] = useState<'all' | OrderType>('all');
  const [payment, setPayment] = useState<'all' | PaymentMethod>('all');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  // ЗАКАЗЫ ЗА ПЕРИОД — ОСНОВА ДЛЯ ПЛИТОК
  const periodOrders = useMemo(() => filterByPeriod(orders, period), [orders, period]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return periodOrders
      .filter((o) => {
        if (status !== 'all' && o.status !== status) return false;
        if (orderType !== 'all' && o.orderType !== orderType) return false;
        if (payment !== 'all' && o.paymentMethod !== payment) return false;
        if (!query) return true;
        return (
          String(o.number).includes(query) ||
          o.receiptNumber.includes(query) ||
          (o.customerName || '').toLowerCase().includes(query) ||
          (o.cashier || '').toLowerCase().includes(query) ||
          o.items.some((it) => it.name.toLowerCase().includes(query))
        );
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [periodOrders, search, status, orderType, payment]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageOrders = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const openOrder = orders.find((o) => o.id === openId) || null;

  const resetFilters = () => {
    setSearch('');
    setStatus('all');
    setOrderType('all');
    setPayment('all');
    setPage(1);
  };

  // ПЕЧАТЬ ЧЕКА: ВТОРАЯ И ДАЛЬШЕ — КОПИЯ
  const handlePrint = (order: Order) => {
    setOpenId(order.id);
    markPrinted(order.id);
    setTimeout(() => window.print(), 100);
  };

  const selectStyle = { fontSize: '13px', padding: '8px 10px', width: 'auto', minWidth: '130px' };

  return (
    <div style={{ width: '100%' }}>
      {/* ЗАГОЛОВОК */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, marginBottom: '8px' }}>
          Заказы
        </h1>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
          {PERIOD_LABELS[period]} · найдено {filtered.length} из {orders.length} заказов
        </p>
      </div>

      {/* ПЛИТКИ ЗА ПЕРИОД */}
      <div className="grid grid-4" style={{ marginBottom: '24px' }}>
        <StatTile
          title={`Заказов (${PERIOD_LABELS[period].toLowerCase()})`}
          value={periodOrders.filter((o) => o.status === 'completed').length}
          hint={`Всего записей: ${periodOrders.length}`}
          icon={<ShoppingBag size={28} />}
        />
        <StatTile
          title="Выручка"
          value={formatSum(revenue(periodOrders))}
          hint="Только оплаченные"
          icon={<DollarSign size={28} />}
          color="#10B981"
        />
        <StatTile
          title="Средний чек"
          value={formatSum(averageCheck(periodOrders))}
          icon={<TrendingUp size={28} />}
          color="#8B5CF6"
        />
        <StatTile
          title="Возвраты"
          value={periodOrders.filter((o) => o.status === 'refunded').length}
          hint={formatSum(refundedTotal(periodOrders))}
          icon={<RotateCcw size={28} />}
          color="#EF4444"
        />
      </div>

      {/* ПЕРИОД */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {PERIODS.map((key) => (
          <button
            key={key}
            onClick={() => {
              setPeriod(key);
              setPage(1);
            }}
            className={`btn btn-${period === key ? 'primary' : 'secondary'}`}
            style={{ fontSize: '13px', padding: '8px 14px' }}
          >
            {PERIOD_LABELS[key]}
          </button>
        ))}
      </div>

      {/* ФИЛЬТРЫ */}
      <div
        className="card"
        style={{
          marginBottom: '16px',
          padding: '12px',
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
          <Search
            style={{ position: 'absolute', left: '12px', top: '10px', color: '#9ca3af' }}
            size={16}
          />
          <input
            type="text"
            placeholder="Номер заказа, чек, клиент, кассир, блюдо..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{ paddingLeft: '38px', fontSize: '13px' }}
          />
        </div>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as typeof status);
            setPage(1);
          }}
          style={selectStyle}
        >
          <option value="all">Все статусы</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <select
          value={orderType}
          onChange={(e) => {
            setOrderType(e.target.value as typeof orderType);
            setPage(1);
          }}
          style={selectStyle}
        >
          <option value="all">Все типы</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {ORDER_TYPE_LABELS[t]}
            </option>
          ))}
        </select>

        <select
          value={payment}
          onChange={(e) => {
            setPayment(e.target.value as typeof payment);
            setPage(1);
          }}
          style={selectStyle}
        >
          <option value="all">Вся оплата</option>
          {PAYMENTS.map((p) => (
            <option key={p} value={p}>
              {PAYMENT_LABELS[p]}
            </option>
          ))}
        </select>

        <button onClick={resetFilters} className="btn btn-secondary" style={{ fontSize: '13px' }}>
          Сбросить
        </button>
      </div>

      {/* ТАБЛИЦА ЗАКАЗОВ */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {pageOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <p className="text-muted" style={{ margin: 0 }}>
              Заказы не найдены
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Заказ</th>
                  <th>Дата</th>
                  <th>Тип</th>
                  <th>Стол</th>
                  <th>Позиций</th>
                  <th>Оплата</th>
                  <th>Сумма</th>
                  <th>Статус</th>
                  <th style={{ textAlign: 'right' }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {pageOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => setOpenId(order.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <span style={{ fontWeight: 600 }}>#{order.number}</span>
                      <br />
                      <span className="text-muted" style={{ fontSize: '11px' }}>
                        чек {order.receiptNumber}
                      </span>
                    </td>
                    <td>
                      {formatDate(order.date)}
                      <br />
                      <span className="text-muted" style={{ fontSize: '11px' }}>
                        {formatTime(order.date)}
                      </span>
                    </td>
                    <td style={{ fontSize: '13px' }}>{ORDER_TYPE_LABELS[order.orderType]}</td>
                    <td style={{ fontSize: '13px' }}>
                      {order.orderType === 'dine-in' ? order.tableNumber ?? '—' : '—'}
                    </td>
                    <td style={{ fontSize: '13px' }}>
                      {order.items.length} / {itemsCount(order)} шт
                    </td>
                    <td style={{ fontSize: '13px' }}>{PAYMENT_LABELS[order.paymentMethod]}</td>
                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {formatMoney(order.total)}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[order.status]}`}>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => setOpenId(order.id)}
                          className="btn btn-secondary btn-small"
                          title="Открыть чек"
                        >
                          <ReceiptIcon size={14} />
                        </button>
                        <button
                          onClick={() => handlePrint(order)}
                          className="btn btn-secondary btn-small"
                          title="Печать чека"
                        >
                          <Printer size={14} />
                        </button>
                        {order.status === 'completed' && (
                          <button
                            onClick={() => {
                              if (confirm(`Оформить возврат по заказу #${order.number}?`))
                                refundOrder(order.id);
                            }}
                            className="btn btn-danger btn-small"
                            title="Возврат"
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* СТРАНИЦЫ */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            marginTop: '16px',
          }}
        >
          <button
            onClick={() => setPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="btn btn-secondary btn-small"
          >
            Назад
          </button>
          <span className="text-muted" style={{ fontSize: '13px' }}>
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="btn btn-secondary btn-small"
          >
            Вперёд
          </button>
        </div>
      )}

      {/* ОКНО ЗАКАЗА */}
      {openOrder && (
        <OrderModal
          order={openOrder}
          onClose={() => setOpenId(null)}
          onPrint={() => handlePrint(openOrder)}
          onRefund={() => {
            if (confirm(`Оформить возврат по заказу #${openOrder.number}?`))
              refundOrder(openOrder.id);
          }}
          onCancel={() => {
            if (confirm(`Отменить заказ #${openOrder.number}?`)) cancelOrder(openOrder.id);
          }}
        />
      )}
    </div>
  );
}

// ДЕТАЛИ ЗАКАЗА + ЧЕК
function OrderModal({
  order,
  onClose,
  onPrint,
  onRefund,
  onCancel,
}: {
  order: Order;
  onClose: () => void;
  onPrint: () => void;
  onRefund: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      onClick={onClose}
      className="receipt-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(17, 24, 39, 0.55)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '32px 16px',
        overflowY: 'auto',
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '14px',
          padding: '24px',
          width: '100%',
          maxWidth: '900px',
          boxShadow: '0 24px 48px rgba(0,0,0,0.25)',
        }}
      >
        {/* ШАПКА ОКНА */}
        <div
          className="receipt-no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '20px',
          }}
        >
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', margin: 0 }}>
              Заказ #{order.number}
            </h2>
            <p className="text-muted" style={{ fontSize: '13px', margin: 0, marginTop: '4px' }}>
              Чек {order.receiptNumber} · {formatDate(order.date)} {formatTime(order.date)} ·{' '}
              {order.cashier}
            </p>
          </div>
          <button onClick={onClose} className="btn btn-secondary btn-small" title="Закрыть">
            <X size={16} />
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto',
            gap: '24px',
            alignItems: 'start',
          }}
        >
          {/* ЛЕВАЯ ЧАСТЬ — СОСТАВ ЗАКАЗА */}
          <div className="receipt-no-print">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '10px',
                marginBottom: '16px',
              }}
            >
              <InfoBox label="Тип" value={ORDER_TYPE_LABELS[order.orderType]} />
              <InfoBox
                label="Стол / гости"
                value={
                  order.orderType === 'dine-in'
                    ? `${order.tableNumber ?? '—'} / ${order.guests ?? 1}`
                    : '—'
                }
              />
              <InfoBox label="Оплата" value={PAYMENT_LABELS[order.paymentMethod]} />
              <InfoBox label="Клиент" value={order.customerName || 'Гость'} />
            </div>

            <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
              <table>
                <thead>
                  <tr>
                    <th>Наименование</th>
                    <th style={{ textAlign: 'right' }}>Цена</th>
                    <th style={{ textAlign: 'right' }}>Кол-во</th>
                    <th style={{ textAlign: 'right' }}>Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontSize: '13px' }}>{item.name}</td>
                      <td style={{ textAlign: 'right', fontSize: '13px' }}>
                        {formatMoney(item.price)}
                      </td>
                      <td style={{ textAlign: 'right', fontSize: '13px' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {formatMoney(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ИТОГИ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px' }}>
              <TotalRow label="Подытог" value={formatSum(order.subtotal)} />
              {order.discount > 0 && (
                <TotalRow
                  label={`Скидка${order.discountPercent ? ` ${order.discountPercent}%` : ''}`}
                  value={`-${formatSum(order.discount)}`}
                  color="#EF4444"
                />
              )}
              {order.serviceCharge > 0 && (
                <TotalRow
                  label={`Обслуживание ${order.serviceChargePercent}%`}
                  value={formatSum(order.serviceCharge)}
                />
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '2px solid #111827',
                  paddingTop: '8px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                }}
              >
                <span>Итого</span>
                <span>{formatSum(order.total)}</span>
              </div>
              <TotalRow label="Внесено" value={formatSum(order.paidAmount)} />
              {order.changeAmount > 0 && (
                <TotalRow label="Сдача" value={formatSum(order.changeAmount)} color="#10B981" />
              )}
            </div>

            {/* ДЕЙСТВИЯ */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
              <button onClick={onPrint} className="btn btn-primary" style={{ fontSize: '13px' }}>
                <Printer size={14} /> Печать чека
              </button>
              {order.status === 'completed' && (
                <>
                  <button onClick={onRefund} className="btn btn-danger" style={{ fontSize: '13px' }}>
                    <RotateCcw size={14} /> Возврат
                  </button>
                  <button
                    onClick={onCancel}
                    className="btn btn-secondary"
                    style={{ fontSize: '13px' }}
                  >
                    <XCircle size={14} /> Отменить
                  </button>
                </>
              )}
              <span
                className={`badge ${STATUS_BADGE[order.status]}`}
                style={{ alignSelf: 'center' }}
              >
                {STATUS_LABELS[order.status]}
              </span>
            </div>
          </div>

          {/* ПРАВАЯ ЧАСТЬ — САМ ЧЕК */}
          <Receipt order={order} />
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '8px 10px',
        backgroundColor: '#f9fafb',
      }}
    >
      <p className="text-muted" style={{ fontSize: '11px', margin: 0 }}>
        {label}
      </p>
      <p style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>{value}</p>
    </div>
  );
}

function TotalRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span className="text-muted">{label}</span>
      <span style={{ fontWeight: 600, color }}>{value}</span>
    </div>
  );
}
