import type { Order } from '../types/order';
import { ORDER_TYPE_LABELS, PAYMENT_LABELS } from '../types/order';
import { formatDate, formatMoney, formatTime } from '../utils/format';
import { itemsCount } from '../utils/stats';
import { VENUE } from '../data/venue';
import './Receipt.css';

// ПСЕВДО QR ИЗ ФИСКАЛЬНОГО НОМЕРА — БЕЗ ВНЕШНИХ БИБЛИОТЕК
function FakeQr({ seed }: { seed: string }) {
  const cells = Array.from({ length: 49 }, (_, i) => {
    const code = seed.charCodeAt(i % seed.length) + i * 7;
    // УГЛОВЫЕ МЕТКИ КАК У НАСТОЯЩЕГО QR
    const row = Math.floor(i / 7);
    const col = i % 7;
    const corner =
      (row < 2 && col < 2) || (row < 2 && col > 4) || (row > 4 && col < 2);
    return corner || code % 2 === 0;
  });

  return (
    <div className="receipt-qr" aria-label="QR-код чека">
      {cells.map((filled, i) => (filled ? <i key={i} /> : <span key={i} />))}
    </div>
  );
}

interface ReceiptProps {
  order: Order;
  // ЧЕК ДЛЯ ПЕЧАТИ ПОМЕЧАЕТСЯ КЛАССОМ, ЧТОБЫ ПРИНТЕР ВЗЯЛ ТОЛЬКО ЕГО
  forPrint?: boolean;
}

export default function Receipt({ order, forPrint = true }: ReceiptProps) {
  const count = itemsCount(order);
  const fiscal = `${order.receiptNumber}${order.number}`.padEnd(16, '0').slice(0, 16);
  // ПЕРВАЯ ПЕЧАТЬ — ОРИГИНАЛ, ДАЛЬШЕ КОПИИ
  const isCopy = order.printCount > 1;

  return (
    <div className={`receipt ${forPrint ? 'receipt-print' : ''}`}>
      {/* ШАПКА */}
      <div className="receipt-center">
        <p className="receipt-title">{VENUE.name}</p>
        <p style={{ margin: 0 }} className="receipt-muted">
          {VENUE.address}
        </p>
        <p style={{ margin: 0 }} className="receipt-muted">
          ИНН: {VENUE.inn}
        </p>
        <p style={{ margin: 0 }} className="receipt-muted">
          Тел: {VENUE.phone}
        </p>

        {order.status === 'refunded' && <span className="receipt-stamp">ВОЗВРАТ</span>}
        {order.status === 'cancelled' && <span className="receipt-stamp">ОТМЕНЁН</span>}
        {order.status === 'completed' && isCopy && (
          <span className="receipt-stamp receipt-stamp-copy">КОПИЯ</span>
        )}
      </div>

      <hr className="receipt-sep" />

      {/* РЕКВИЗИТЫ ЧЕКА */}
      <div className="receipt-row">
        <span>Чек № {order.receiptNumber}</span>
        <span>{formatDate(order.date)}</span>
      </div>
      <div className="receipt-row">
        <span>Заказ #{order.number}</span>
        <span>{formatTime(order.date)}</span>
      </div>
      <div className="receipt-row">
        <span>Кассир</span>
        <span>{order.cashier}</span>
      </div>
      <div className="receipt-row">
        <span>{ORDER_TYPE_LABELS[order.orderType]}</span>
        <span>
          {order.orderType === 'dine-in'
            ? `Стол ${order.tableNumber ?? '—'} · ${order.guests ?? 1} гост.`
            : order.customerPhone || order.customerName || 'Гость'}
        </span>
      </div>

      <hr className="receipt-sep" />

      {/* ПОЗИЦИИ */}
      <div className="receipt-row receipt-muted">
        <span>Кол × Цена</span>
        <span>Сумма</span>
      </div>
      <hr className="receipt-sep" />

      {order.items.map((item) => (
        <div key={item.id} style={{ marginBottom: '6px' }}>
          <p className="receipt-item-name" style={{ margin: 0 }}>
            {item.name}
          </p>
          <div className="receipt-row">
            <span>
              {item.quantity} × {formatMoney(item.price)}
            </span>
            <span>{formatMoney(item.total)}</span>
          </div>
        </div>
      ))}

      <hr className="receipt-sep" />

      {/* ИТОГИ */}
      <div className="receipt-row receipt-muted">
        <span>Позиций: {order.items.length}</span>
        <span>Кол-во: {count}</span>
      </div>
      <div className="receipt-row">
        <span>Подытог</span>
        <span>{formatMoney(order.subtotal)}</span>
      </div>
      {order.discount > 0 && (
        <div className="receipt-row">
          <span>Скидка{order.discountPercent > 0 ? ` ${order.discountPercent}%` : ''}</span>
          <span>-{formatMoney(order.discount)}</span>
        </div>
      )}
      {order.serviceCharge > 0 && (
        <div className="receipt-row">
          <span>Обслуживание {order.serviceChargePercent}%</span>
          <span>{formatMoney(order.serviceCharge)}</span>
        </div>
      )}

      <hr className="receipt-sep-strong" />
      <div className="receipt-row receipt-total">
        <span>ИТОГО</span>
        <span>{formatMoney(order.total)}</span>
      </div>
      <hr className="receipt-sep-strong" />

      {/* ОПЛАТА */}
      <div className="receipt-row">
        <span>{PAYMENT_LABELS[order.paymentMethod]}</span>
        <span>{formatMoney(order.paidAmount)}</span>
      </div>
      {order.changeAmount > 0 && (
        <div className="receipt-row">
          <span>Сдача</span>
          <span>{formatMoney(order.changeAmount)}</span>
        </div>
      )}

      {order.comment && (
        <>
          <hr className="receipt-sep" />
          <p style={{ margin: 0 }} className="receipt-muted">
            Комментарий: {order.comment}
          </p>
        </>
      )}

      <hr className="receipt-sep" />

      {/* ПОДВАЛ */}
      <div className="receipt-center">
        <p style={{ margin: 0, fontWeight: 700 }}>Спасибо за визит!</p>
        <p style={{ margin: 0 }} className="receipt-muted">
          Ждём вас снова
        </p>
        <FakeQr seed={fiscal} />
        <p style={{ margin: 0, fontSize: '11px' }} className="receipt-muted">
          ФП: {fiscal}
        </p>
        <p style={{ margin: 0, fontSize: '11px' }} className="receipt-muted">
          Печать № {Math.max(1, order.printCount)}
        </p>
      </div>
    </div>
  );
}
