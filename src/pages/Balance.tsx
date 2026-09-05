import { useState } from 'react';
import {
  DollarSign, Wallet, CreditCard, Printer, AlertCircle,
  Plus, Minus, CheckCircle, XCircle, FileText
} from 'lucide-react';
import { useOrdersStore } from '../store/ordersStore';
import { useShiftStore } from '../store/shiftStore';
import { useAuthStore } from '../store/authStore';
import { formatMoney, formatSum, formatDateTime } from '../utils/format';
import { cashTotal, cashlessTotal, ordersOfDay, revenue, paidOrders } from '../utils/stats';

export default function Balance() {
  const orders = useOrdersStore((s) => s.orders);
  const currentShift = useShiftStore((s) => s.currentShift);
  const shifts = useShiftStore((s) => s.shifts);
  const openShift = useShiftStore((s) => s.openShift);
  const closeShift = useShiftStore((s) => s.closeShift);
  const addDeposit = useShiftStore((s) => s.addDeposit);
  const addWithdrawal = useShiftStore((s) => s.addWithdrawal);
  const getExpectedCash = useShiftStore((s) => s.getExpectedCash);
  const currentUser = useAuthStore((s) => s.currentUser);
  const canCloseShift = useAuthStore((s) => s.canCloseShift);

  const [showOpenShift, setShowOpenShift] = useState(false);
  const [showCloseShift, setShowCloseShift] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdrawal, setShowWithdrawal] = useState(false);

  const [startCash, setStartCash] = useState(0);
  const [endCash, setEndCash] = useState(0);
  const [depositAmount, setDepositAmount] = useState(0);
  const [withdrawalAmount, setWithdrawalAmount] = useState(0);
  const [note, setNote] = useState('');

  // ТЕКУЩИЕ ДАННЫЕ ЗА СЕГОДНЯ
  const todayOrders = ordersOfDay(orders, new Date());
  const todayPaidOrders = paidOrders(todayOrders);
  const todayCash = cashTotal(todayPaidOrders);
  const todayCashless = cashlessTotal(todayPaidOrders);
  const todayRevenue = revenue(todayPaidOrders);

  // ИСТОРИЯ СМЕН (ПОСЛЕДНИЕ 10)
  const recentShifts = shifts.slice(0, 10);

  // ОЖИДАЕМАЯ НАЛИЧНОСТЬ
  const expectedCash = currentShift ? getExpectedCash() : 0;

  // X-ОТЧЁТ (БЕЗ ЗАКРЫТИЯ)
  const handlePrintXReport = () => {
    setTimeout(() => window.print(), 100);
  };

  // ОТКРЫТИЕ СМЕНЫ
  const handleOpenShift = () => {
    if (!currentUser) return;
    openShift(currentUser.name, startCash);
    setStartCash(0);
    setShowOpenShift(false);
  };

  // ЗАКРЫТИЕ СМЕНЫ (Z-ОТЧЁТ)
  const handleCloseShift = () => {
    if (!currentUser) return;
    closeShift(currentUser.name, endCash);
    setEndCash( 0);
    setShowCloseShift(false);
  };

  // ВНЕСЕНИЕ
  const handleDeposit = () => {
    if (!currentUser || depositAmount <= 0) return;
    addDeposit(depositAmount, note, currentUser.name);
    setDepositAmount(0);
    setNote('');
    setShowDeposit(false);
  };

  // ИНКАССАЦИЯ
  const handleWithdrawal = () => {
    if (!currentUser || withdrawalAmount <= 0) return;
    addWithdrawal(withdrawalAmount, note, currentUser.name);
    setWithdrawalAmount(0);
    setNote('');
    setShowWithdrawal(false);
  };

  return (
    <div style={{ width: '100%' }}>
      {/* ЗАГОЛОВОК */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, marginBottom: '8px' }}>
          Баланс
        </h1>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
          Кассовая книга, X/Z-отчёты, инкассация
        </p>
      </div>

      {/* СТАТУС СМЕНЫ */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0, marginBottom: '8px' }}>
              {currentShift ? 'Смена открыта' : 'Смена закрыта'}
            </h2>
            {currentShift && (
              <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>
                Открыл: {currentShift.openedBy} · {formatDateTime(currentShift.openedAt)}
              </p>
            )}
          </div>
          <div>
            {currentShift ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handlePrintXReport}
                  className="btn btn-secondary"
                  style={{ fontSize: '13px' }}
                >
                  <Printer size={14} /> X-отчёт
                </button>
                {canCloseShift() && (
                  <button
                    onClick={() => setShowCloseShift(true)}
                    className="btn btn-danger"
                    style={{ fontSize: '13px' }}
                  >
                    <XCircle size={14} /> Закрыть смену
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowOpenShift(true)}
                className="btn btn-primary"
                style={{ fontSize: '13px' }}
              >
                <CheckCircle size={14} /> Открыть смену
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ИТОГИ ЗА ДЕНЬ */}
      <div className="grid grid-4" style={{ marginBottom: '20px' }}>
        <SummaryTile
          title="Заказов сегодня"
          value={String(todayPaidOrders.length)}
          icon={<FileText size={24} />}
        />
        <SummaryTile
          title="Выручка"
          value={formatSum(todayRevenue)}
          icon={<DollarSign size={24} />}
          color="#10B981"
        />
        <SummaryTile
          title="Наличные"
          value={formatSum(todayCash)}
          icon={<Wallet size={24} />}
          color="#F59E0B"
        />
        <SummaryTile
          title="Безналичные"
          value={formatSum(todayCashless)}
          icon={<CreditCard size={24} />}
          color="#8B5CF6"
        />
      </div>

      {/* КАССА (ЕСЛИ СМЕНА ОТКРЫТА) */}
      {currentShift && (
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '20px' }}>
          {/* ОСТАТОК В КАССЕ */}
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0, marginBottom: '16px' }}>
              Остаток в кассе
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280', fontSize: '13px' }}>Начальный остаток</span>
                <span style={{ fontWeight: '600' }}>{formatMoney(currentShift.startCash)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280', fontSize: '13px' }}>Наличные продажи</span>
                <span style={{ fontWeight: '600', color: '#10B981' }}>+{formatMoney(currentShift.cashSales)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280', fontSize: '13px' }}>Внесения</span>
                <span style={{ fontWeight: '600', color: '#10B981' }}>
                  +{formatMoney(currentShift.deposits.reduce((s, d) => s + d.amount, 0))}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280', fontSize: '13px' }}>Инкассации</span>
                <span style={{ fontWeight: '600', color: '#EF4444' }}>
                  -{formatMoney(currentShift.withdrawals.reduce((s, w) => s + w.amount, 0))}
                </span>
              </div>
              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: '600' }}>Ожидаемый остаток</span>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#5B6BFF' }}>
                    {formatSum(expectedCash)}
                  </span>
                </div>
              </div>
            </div>

            {/* ДЕЙСТВИЯ */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button
                onClick={() => setShowDeposit(true)}
                className="btn btn-secondary"
                style={{ flex: 1, fontSize: '13px' }}
              >
                <Plus size={14} /> Внесение
              </button>
              <button
                onClick={() => setShowWithdrawal(true)}
                className="btn btn-secondary"
                style={{ flex: 1, fontSize: '13px' }}
              >
                <Minus size={14} /> Инкассация
              </button>
            </div>
          </div>

          {/* ИСТОРИЯ ОПЕРАЦИЙ */}
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0, marginBottom: '16px' }}>
              Операции за смену
            </h3>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {currentShift.deposits.length === 0 && currentShift.withdrawals.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                  Нет операций
                </p>
              ) : (
                [...currentShift.deposits.map(d => ({ ...d, type: 'deposit' as const })),
                 ...currentShift.withdrawals.map(w => ({ ...w, type: 'withdrawal' as const }))]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((op) => (
                    <div
                      key={op.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 0',
                        borderBottom: '1px solid #f3f4f6',
                      }}
                    >
                      <div>
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: '500' }}>
                          {op.type === 'deposit' ? 'Внесение' : 'Инкассация'}
                        </p>
                        <p style={{ margin: 0, fontSize: '11px', color: '#6b7280' }}>
                          {op.note} · {op.by}
                        </p>
                      </div>
                      <span style={{
                        fontWeight: '600',
                        color: op.type === 'deposit' ? '#10B981' : '#EF4444',
                      }}>
                        {op.type === 'deposit' ? '+' : '-'}{formatMoney(op.amount)}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ИСТОРИЯ СМЕН */}
      <div className="card">
        <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0, marginBottom: '16px' }}>
          История смен
        </h3>
        {recentShifts.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
            Нет закрытых смен
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Статус</th>
                  <th>Открыл</th>
                  <th>Открыта</th>
                  <th>Закрыта</th>
                  <th>Продажи</th>
                  <th>Наличные</th>
                  <th>Безналичные</th>
                  <th>Заказов</th>
                </tr>
              </thead>
              <tbody>
                {recentShifts.map((shift) => (
                  <tr key={shift.id}>
                    <td>
                      <span className={`badge ${shift.status === 'open' ? 'badge-warning' : 'badge-success'}`}>
                        {shift.status === 'open' ? 'Открыта' : 'Закрыта'}
                      </span>
                    </td>
                    <td>{shift.openedBy}</td>
                    <td style={{ fontSize: '12px' }}>{formatDateTime(shift.openedAt)}</td>
                    <td style={{ fontSize: '12px' }}>{shift.closedAt ? formatDateTime(shift.closedAt) : '—'}</td>
                    <td style={{ fontWeight: '600' }}>{formatSum(shift.totalSales)}</td>
                    <td>{formatSum(shift.cashSales)}</td>
                    <td>{formatSum(shift.cashlessSales)}</td>
                    <td>{shift.ordersCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* МОДАЛКИ */}
      {showOpenShift && (
        <Modal onClose={() => setShowOpenShift(false)} title="Открыть смену">
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
              Начальный остаток в кассе
            </label>
            <input
              type="number"
              value={startCash || ''}
              onChange={(e) => setStartCash(Number(e.target.value))}
              placeholder="0"
              style={{ width: '100%', fontSize: '16px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setShowOpenShift(false)} className="btn btn-secondary" style={{ flex: 1 }}>
              Отмена
            </button>
            <button onClick={handleOpenShift} className="btn btn-primary" style={{ flex: 1 }}>
              Открыть смену
            </button>
          </div>
        </Modal>
      )}

      {showCloseShift && (
        <Modal onClose={() => setShowCloseShift(false)} title="Закрыть смену (Z-отчёт)">
          <div style={{ marginBottom: '16px' }}>
            <div style={{ background: '#F3F4F6', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Ожидаемый остаток</p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{formatSum(expectedCash)}</p>
            </div>
            <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
              Фактический остаток в кассе
            </label>
            <input
              type="number"
              value={endCash || ''}
              onChange={(e) => setEndCash(Number(e.target.value))}
              placeholder="0"
              style={{ width: '100%', fontSize: '16px' }}
            />
            {endCash > 0 && (
              <p style={{
                fontSize: '13px',
                marginTop: '8px',
                color: endCash === expectedCash ? '#10B981' : Math.abs(endCash - expectedCash) < 1000 ? '#F59E0B' : '#EF4444',
              }}>
                {endCash === expectedCash ? '✓ Сумма совпадает' :
                 endCash > expectedCash ? `Излишек: +${formatSum(endCash - expectedCash)}` :
                 `Недостача: -${formatSum(expectedCash - endCash)}`}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setShowCloseShift(false)} className="btn btn-secondary" style={{ flex: 1 }}>
              Отмена
            </button>
            <button onClick={handleCloseShift} className="btn btn-danger" style={{ flex: 1 }}>
              Закрыть смену
            </button>
          </div>
        </Modal>
      )}

      {showDeposit && (
        <Modal onClose={() => setShowDeposit(false)} title="Внесение в кассу">
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
              Сумма
            </label>
            <input
              type="number"
              value={depositAmount || ''}
              onChange={(e) => setDepositAmount(Number(e.target.value))}
              placeholder="0"
              style={{ width: '100%', fontSize: '16px' }}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
              Примечание
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Например: размен из банка"
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setShowDeposit(false)} className="btn btn-secondary" style={{ flex: 1 }}>
              Отмена
            </button>
            <button onClick={handleDeposit} className="btn btn-primary" style={{ flex: 1 }} disabled={depositAmount <= 0}>
              Внести
            </button>
          </div>
        </Modal>
      )}

      {showWithdrawal && (
        <Modal onClose={() => setShowWithdrawal(false)} title="Инкассация">
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
              Сумма
            </label>
            <input
              type="number"
              value={withdrawalAmount || ''}
              onChange={(e) => setWithdrawalAmount(Number(e.target.value))}
              placeholder="0"
              style={{ width: '100%', fontSize: '16px' }}
            />
            {withdrawalAmount > expectedCash && (
              <p style={{ fontSize: '12px', color: '#EF4444', marginTop: '4px' }}>
                <AlertCircle size={12} style={{ marginRight: '4px' }} />
                Сумма превышает остаток в кассе
              </p>
            )}
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
              Примечание
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Например: сдача в банк"
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setShowWithdrawal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
              Отмена
            </button>
            <button
              onClick={handleWithdrawal}
              className="btn btn-danger"
              style={{ flex: 1 }}
              disabled={withdrawalAmount <= 0}
            >
              Изъять
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// КОМПОНЕНТЫ
function SummaryTile({ title, value, icon, color }: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p className="text-muted" style={{ fontSize: '12px', margin: 0, marginBottom: '8px' }}>{title}</p>
          <p style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{value}</p>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, rgba(91,107,255,0.15), rgba(170,59,255,0.1))',
          padding: '10px',
          borderRadius: '12px',
          color: color || 'var(--primary)',
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div
      onClick={onClose}
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
        style={{ width: '100%', maxWidth: '400px', padding: '24px' }}
      >
        <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0, marginBottom: '20px' }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}
