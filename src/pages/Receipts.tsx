import { useMemo, useState } from 'react';
import { Printer, Search, RotateCcw, Copy, Wallet, CreditCard, ReceiptText } from 'lucide-react';
import { useOrdersStore } from '../store/ordersStore';
import type { Order } from '../types/order';
import { PAYMENT_LABELS, STATUS_BADGE, STATUS_LABELS } from '../types/order';
import { formatDate, formatMoney, formatSum, formatTime } from '../utils/format';
import {
  PERIOD_LABELS,
  cashTotal,
  cashlessTotal,
  filterByPeriod,
  itemsCount,
  revenue,
} from '../utils/stats';
import type { PeriodKey } from '../utils/stats';
import Receipt from '../components/Receipt';

const PERIODS: PeriodKey[] = ['today', 'week', 'month', 'all'];

export default function Receipts() {
  const orders = useOrdersStore((s) => s.orders);
  const markPrinted = useOrdersStore((s) => s.markPrinted);
  const refundOrder = useOrdersStore((s) => s.refundOrder);

  const [period, setPeriod] = useState<PeriodKey>('today');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const periodOrders = useMemo(() => filterByPeriod(orders, period), [orders, period]);

  const receipts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return periodOrders
      .filter((o) => {
        if (!query) return true;
        return (
          o.receiptNumber.includes(query) ||
          String(o.number).includes(query) ||
          (o.customerName || '').toLowerCase().includes(query) ||
          (o.cashier || '').toLowerCase().includes(query)
        );
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [periodOrders, search]);

  // ВЫБРАННЫЙ ЧЕК ВЫВОДИМ ИЗ СПИСКА: ЕСЛИ ВЫБОРА НЕТ ИЛИ ОН ОТФИЛЬТРОВАН — БЕРЁМ ПЕРВЫЙ
  const activeId =
    selectedId && receipts.some((o) => o.id === selectedId)
      ? selectedId
      : receipts[0]?.id ?? null;

  const selected = orders.find((o) => o.id === activeId) || null;

  const handlePrint = (order: Order) => {
    markPrinted(order.id);
    setTimeout(() => window.print(), 100);
  };

  return (
    <div style={{ width: '100%' }}>
      {/* ЗАГОЛОВОК */}
      <div className="receipt-no-print" style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, marginBottom: '8px' }}>
          Чеки
        </h1>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
          {PERIOD_LABELS[period]} · {receipts.length} чеков на {formatSum(revenue(receipts))}
        </p>
      </div>

      {/* ИТОГИ ПО КАССЕ */}
      <div className="grid grid-4 receipt-no-print" style={{ marginBottom: '20px' }}>
        <SummaryTile
          title="Чеков за период"
          value={String(receipts.filter((o) => o.status === 'completed').length)}
          icon={<ReceiptText size={26} />}
        />
        <SummaryTile
          title="Сумма чеков"
          value={formatSum(revenue(receipts))}
          icon={<ReceiptText size={26} />}
          color="#10B981"
        />
        <SummaryTile
          title="Наличными"
          value={formatSum(cashTotal(receipts))}
          icon={<Wallet size={26} />}
          color="#F59E0B"
        />
        <SummaryTile
          title="Безналичными"
          value={formatSum(cashlessTotal(receipts))}
          icon={<CreditCard size={26} />}
          color="#8B5CF6"
        />
      </div>

      {/* ПЕРИОД И ПОИСК */}
      <div
        className="receipt-no-print"
        style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}
      >
        {PERIODS.map((key) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className={`btn btn-${period === key ? 'primary' : 'secondary'}`}
            style={{ fontSize: '13px', padding: '8px 14px' }}
          >
            {PERIOD_LABELS[key]}
          </button>
        ))}
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <Search
            style={{ position: 'absolute', left: '12px', top: '10px', color: '#9ca3af' }}
            size={16}
          />
          <input
            type="text"
            placeholder="Номер чека, заказа, клиент, кассир..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '38px', fontSize: '13px' }}
          />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* СПИСОК ЧЕКОВ */}
        <div className="card receipt-no-print" style={{ padding: 0, overflow: 'hidden' }}>
          {receipts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <p className="text-muted" style={{ margin: 0 }}>
                Чеков за этот период нет
              </p>
            </div>
          ) : (
            <div style={{ maxHeight: '640px', overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Чек</th>
                    <th>Время</th>
                    <th>Позиций</th>
                    <th>Оплата</th>
                    <th>Сумма</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedId(order.id)}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: order.id === activeId ? '#eef2ff' : undefined,
                      }}
                    >
                      <td>
                        <span style={{ fontWeight: 600 }}>№ {order.receiptNumber}</span>
                        <br />
                        <span className="text-muted" style={{ fontSize: '11px' }}>
                          заказ #{order.number}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px' }}>
                        {formatTime(order.date)}
                        <br />
                        <span className="text-muted" style={{ fontSize: '11px' }}>
                          {formatDate(order.date)}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px' }}>{itemsCount(order)} шт</td>
                      <td style={{ fontSize: '13px' }}>{PAYMENT_LABELS[order.paymentMethod]}</td>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {formatMoney(order.total)}
                      </td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[order.status]}`}>
                          {STATUS_LABELS[order.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ПРЕДПРОСМОТР ЧЕКА */}
        <div style={{ position: 'sticky', top: '16px' }}>
          {selected ? (
            <>
              <Receipt order={selected} />
              <div
                className="receipt-no-print"
                style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}
              >
                <button
                  onClick={() => handlePrint(selected)}
                  className="btn btn-primary"
                  style={{ fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Printer size={14} /> Печать чека
                </button>
                <button
                  onClick={() => markPrinted(selected.id)}
                  className="btn btn-secondary"
                  style={{ fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  title="Отметить как копию, без печати"
                >
                  <Copy size={14} /> Копия чека
                </button>
                {selected.status === 'completed' && (
                  <button
                    onClick={() => {
                      if (confirm(`Оформить возврат по чеку № ${selected.receiptNumber}?`))
                        refundOrder(selected.id);
                    }}
                    className="btn btn-danger"
                    style={{ fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <RotateCcw size={14} /> Возврат по чеку
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="card" style={{ padding: '32px', width: '320px', textAlign: 'center' }}>
              <p className="text-muted" style={{ margin: 0 }}>
                Выберите чек в списке
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface SummaryTileProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color?: string;
}

function SummaryTile({ title, value, icon, color }: SummaryTileProps) {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p className="text-muted" style={{ fontSize: '12px', margin: 0, marginBottom: '8px' }}>
            {title}
          </p>
          <p style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{value}</p>
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
