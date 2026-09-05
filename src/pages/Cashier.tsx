// src/pages/Cashier.tsx
import { useState } from 'react';
import { Trash2, Plus, Minus, DollarSign, Printer, X, Search, Check } from 'lucide-react';
import { useOrderStore } from '../store/orderStore';
import { useOrdersStore } from '../store/ordersStore';
import { useStockStore } from '../store/stockStore';
import { products, categories } from '../data/products';
import type { Order, OrderType, PaymentMethod } from '../types/order';
import { ORDER_TYPE_LABELS, PAYMENT_LABELS } from '../types/order';
import { formatMoney, formatSum } from '../utils/format';
import Receipt from '../components/Receipt';
import './Cashier.css';

// ЖЁСТКИЙ ПОРЯДОК ВСЕХ КАТЕГОРИЙ (по id из ваших данных)
const CATEGORY_ORDER = [
  // 1. Салаты
  'salads',
  'seafood-salads',
  'vegetable-salads',

  // 2. Мясное и основные блюда
  'main-courses',
  'meat-snacks',
  'shashlik',
  'chicken',
  'cold-snacks',
  'hot-snacks',

  // 3. Супы и гарниры
  'cold-soups',
  'hot-soups',
  'garnishes',

  // 4. Хлеб
  'bread',

  // 5. Напитки и алкоголь
  'drinks',
  'beer',
  'mojito',
  'vodka',
  'cognac',
  'wine',

  // 6. Десерты
  'desserts',
];

const ORDER_TYPES: OrderType[] = ['dine-in', 'takeaway', 'delivery'];
const PAYMENTS: PaymentMethod[] = ['cash', 'card', 'click', 'payme', 'uzumbank'];
const QUICK_DISCOUNTS = [0, 5, 10, 15];
const QUICK_CASH = [50000, 100000, 200000, 500000];

export default function Cashier() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  // ЧЕК ПОСЛЕДНЕГО ОФОРМЛЕННОГО ЗАКАЗА
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  const {
    currentOrder,
    discount,
    discountPercent,
    serviceChargePercent,
    paymentMethod,
    orderType,
    tableNumber,
    guests,
    customerName,
    customerPhone,
    comment,
    paidAmount,
    addItem,
    removeItem,
    updateQuantity,
    setDiscount,
    setDiscountPercent,
    setServiceChargePercent,
    setPaymentMethod,
    setOrderType,
    setTableNumber,
    setGuests,
    setCustomerName,
    setCustomerPhone,
    setComment,
    setPaidAmount,
    getSubtotal,
    getDiscountAmount,
    getServiceCharge,
    getTotal,
    getChange,
    getItemsCount,
    clearOrder,
    completeOrder,
  } = useOrderStore();

  const stock = useStockStore((s) => s.stock);
  const markPrinted = useOrdersStore((s) => s.markPrinted);

  // Сортируем категории для кнопок фильтра
  const sortedCategories = [...categories].sort((a, b) => {
    const indexA = CATEGORY_ORDER.indexOf(a.id);
    const indexB = CATEGORY_ORDER.indexOf(b.id);
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  // Фильтрация товаров
  const filteredProducts = products.filter((p) => {
    const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  // Группировка с сортировкой по CATEGORY_ORDER
  const groupedProducts = () => {
    if (selectedCategory !== 'all') {
      return [{ category: null, items: filteredProducts }];
    }

    const availableCategoryIds = [...new Set(filteredProducts.map((p) => p.category))];

    const sortedCategoriesIds = availableCategoryIds.sort((a, b) => {
      const indexA = CATEGORY_ORDER.indexOf(a);
      const indexB = CATEGORY_ORDER.indexOf(b);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    return sortedCategoriesIds
      .map((catId) => {
        const category = categories.find((c) => c.id === catId);
        const items = filteredProducts.filter((p) => p.category === catId);
        return { category, items };
      })
      .filter((group) => group.items.length > 0);
  };

  const groups = groupedProducts();

  const subtotal = getSubtotal();
  const discountAmount = getDiscountAmount();
  const serviceCharge = getServiceCharge();
  const total = getTotal();
  const change = getChange();
  // НЕДОПЛАТА ПРИ РАСЧЁТЕ НАЛИЧНЫМИ
  const shortfall = paymentMethod === 'cash' && paidAmount > 0 ? Math.max(0, total - paidAmount) : 0;

  const handleAddToCart = (product: typeof products[0]) => {
    const available = stock[product.id] ?? 0;
    const inCart = currentOrder.find((i) => i.productId === product.id)?.quantity ?? 0;
    // НЕ ПРОДАЁМ БОЛЬШЕ, ЧЕМ ЕСТЬ НА СКЛАДЕ
    if (inCart >= available) return;

    addItem({
      id: `${product.id}-${Date.now()}`,
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      total: product.price,
    });
  };

  const handleCompleteOrder = (print: boolean) => {
    const order = completeOrder();
    if (!order) return;

    if (print) {
      markPrinted(order.id);
      setLastOrder({ ...order, printCount: order.printCount + 1 });
      setTimeout(() => window.print(), 150);
    } else {
      setLastOrder(order);
    }
  };

  return (
    <div className="cashier-container">
      {/* Блок товаров */}
      <div className="products-section">
        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Поиск товара..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="category-filters">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`btn ${selectedCategory === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Все товары
          </button>
          {sortedCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`btn ${selectedCategory === category.id ? 'btn-primary' : 'btn-secondary'}`}
              title={category.name}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className="products-grid-wrapper">
          {filteredProducts.length === 0 ? (
            <div className="empty-products">Товары не найдены</div>
          ) : (
            groups.map((group, idx) => (
              <div key={idx} className="product-group">
                {group.category && <h3 className="category-title">{group.category.name}</h3>}
                <div className="products-grid">
                  {group.items.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      stock={stock[product.id] ?? 0}
                      inCart={currentOrder.find((i) => i.productId === product.id)?.quantity ?? 0}
                      onAddToCart={handleAddToCart}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Блок корзины — расчёт как на POS-терминале */}
      <div className="cart-section">
        <h2 className="cart-header">
          Текущий заказ
          {currentOrder.length > 0 && (
            <span className="cart-header-count">
              {currentOrder.length} поз. · {getItemsCount()} шт
            </span>
          )}
        </h2>

        <div className="cart-items">
          {currentOrder.length === 0 ? (
            <p className="empty-cart">📋 Заказ пуст</p>
          ) : (
            currentOrder.map((item) => {
              const available = stock[item.productId] ?? 0;
              return (
                <div key={item.id} className="cart-item">
                  <div className="cart-item-info">
                    <div>
                      <p className="item-name">{item.name}</p>
                      <p className="item-price-detail">
                        {formatMoney(item.price)} сум × {item.quantity}
                      </p>
                    </div>
                    <button onClick={() => removeItem(item.productId)} className="remove-btn">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="item-quantity">
                    <button
                      onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                      className="btn btn-small btn-secondary"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="quantity-value">{item.quantity}</span>
                    <button
                      onClick={() =>
                        updateQuantity(item.productId, Math.min(available, item.quantity + 1))
                      }
                      disabled={item.quantity >= available}
                      className="btn btn-small btn-secondary"
                      title={item.quantity >= available ? 'Больше нет на складе' : 'Добавить'}
                    >
                      <Plus size={12} />
                    </button>
                    <span className="item-total">{formatMoney(item.total)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {currentOrder.length > 0 && (
          <div className="cart-footer">
            {/* ТИП ЗАКАЗА */}
            <div className="pos-field">
              <label>Тип заказа</label>
              <div className="pos-segmented">
                {ORDER_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setOrderType(type)}
                    className={`btn btn-small ${orderType === type ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {ORDER_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>

            {/* ЗАЛ ИЛИ КЛИЕНТ */}
            {orderType === 'dine-in' ? (
              <div className="pos-row">
                <div className="pos-field">
                  <label>Стол</label>
                  <input
                    type="number"
                    min="1"
                    value={tableNumber ?? ''}
                    placeholder="№"
                    onChange={(e) =>
                      setTableNumber(e.target.value === '' ? null : Number(e.target.value))
                    }
                  />
                </div>
                <div className="pos-field">
                  <label>Гостей</label>
                  <input
                    type="number"
                    min="1"
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value))}
                  />
                </div>
              </div>
            ) : (
              <div className="pos-row">
                <div className="pos-field">
                  <label>Клиент</label>
                  <input
                    type="text"
                    value={customerName}
                    placeholder="Имя"
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div className="pos-field">
                  <label>Телефон</label>
                  <input
                    type="text"
                    value={customerPhone}
                    placeholder="+998"
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* СКИДКА */}
            <div className="pos-field">
              <label>Скидка</label>
              <div className="pos-segmented">
                {QUICK_DISCOUNTS.map((percent) => (
                  <button
                    key={percent}
                    onClick={() => setDiscountPercent(percent)}
                    className={`btn btn-small ${
                      discountPercent === percent ? 'btn-primary' : 'btn-secondary'
                    }`}
                  >
                    {percent}%
                  </button>
                ))}
              </div>
            </div>

            <div className="pos-row">
              <div className="pos-field">
                <label>Скидка суммой</label>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
              </div>
              {orderType === 'dine-in' && (
                <div className="pos-field">
                  <label>Обслуживание, %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={serviceChargePercent}
                    onChange={(e) => setServiceChargePercent(Number(e.target.value))}
                  />
                </div>
              )}
            </div>

            {/* ОПЛАТА */}
            <div className="pos-field">
              <label>Способ оплаты</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              >
                {PAYMENTS.map((method) => (
                  <option key={method} value={method}>
                    {PAYMENT_LABELS[method]}
                  </option>
                ))}
              </select>
            </div>

            {/* ИТОГИ */}
            <div className="pos-summary">
              <div className="pos-summary-row">
                <span>Подытог</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="pos-summary-row pos-summary-minus">
                  <span>Скидка{discountPercent > 0 ? ` ${discountPercent}%` : ''}</span>
                  <span>-{formatMoney(discountAmount)}</span>
                </div>
              )}
              {serviceCharge > 0 && (
                <div className="pos-summary-row">
                  <span>Обслуживание {serviceChargePercent}%</span>
                  <span>{formatMoney(serviceCharge)}</span>
                </div>
              )}
            </div>

            <div className="total-block">
              <p className="total-label">Итого к оплате</p>
              <p className="total-value">{formatSum(total)}</p>
            </div>

            {/* НАЛИЧНЫЕ: ВНЕСЕНО И СДАЧА */}
            {paymentMethod === 'cash' && (
              <>
                <div className="pos-field">
                  <label>Получено наличными</label>
                  <input
                    type="number"
                    min="0"
                    value={paidAmount || ''}
                    placeholder={formatMoney(total)}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                  />
                </div>
                <div className="pos-segmented" style={{ marginBottom: '10px' }}>
                  <button onClick={() => setPaidAmount(total)} className="btn btn-small btn-secondary">
                    Ровно
                  </button>
                  {QUICK_CASH.filter((sum) => sum >= total).slice(0, 3).map((sum) => (
                    <button
                      key={sum}
                      onClick={() => setPaidAmount(sum)}
                      className="btn btn-small btn-secondary"
                    >
                      {formatMoney(sum)}
                    </button>
                  ))}
                </div>
                <div className={`pos-change ${shortfall > 0 ? 'pos-change-warn' : ''}`}>
                  {shortfall > 0 ? (
                    <>
                      <span>Не хватает</span>
                      <span>{formatSum(shortfall)}</span>
                    </>
                  ) : (
                    <>
                      <span>Сдача</span>
                      <span>{formatSum(change)}</span>
                    </>
                  )}
                </div>
              </>
            )}

            <div className="pos-field">
              <label>Комментарий</label>
              <input
                type="text"
                value={comment}
                placeholder="Например: без лука"
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            <div className="action-buttons">
              <button
                onClick={() => handleCompleteOrder(true)}
                disabled={shortfall > 0}
                className="btn btn-primary"
              >
                <Printer size={16} /> Оплатить и печать
              </button>
              <button
                onClick={() => handleCompleteOrder(false)}
                disabled={shortfall > 0}
                className="btn btn-secondary"
              >
                <DollarSign size={16} /> Оплатить
              </button>
            </div>

            <button onClick={clearOrder} className="btn cancel-btn">
              <X size={16} /> Отменить заказ
            </button>
          </div>
        )}
      </div>

      {/* ЧЕК ПОСЛЕ ОПЛАТЫ */}
      {lastOrder && (
        <div
          className="pos-modal-overlay"
          onClick={() => setLastOrder(null)}
        >
          <div className="pos-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pos-modal-head receipt-no-print">
              <div>
                <p className="pos-modal-title">
                  <Check size={18} /> Заказ #{lastOrder.number} оплачен
                </p>
                <p className="pos-modal-sub">
                  {formatSum(lastOrder.total)} · {PAYMENT_LABELS[lastOrder.paymentMethod]}
                  {lastOrder.changeAmount > 0 && ` · сдача ${formatSum(lastOrder.changeAmount)}`}
                </p>
              </div>
              <button onClick={() => setLastOrder(null)} className="btn btn-small btn-secondary">
                <X size={16} />
              </button>
            </div>

            <Receipt order={lastOrder} />

            <div className="pos-modal-actions receipt-no-print">
              <button
                onClick={() => {
                  markPrinted(lastOrder.id);
                  setLastOrder({ ...lastOrder, printCount: lastOrder.printCount + 1 });
                  setTimeout(() => window.print(), 150);
                }}
                className="btn btn-primary"
              >
                <Printer size={16} /> Печать чека
              </button>
              <button onClick={() => setLastOrder(null)} className="btn btn-secondary">
                Новый заказ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Карточка товара (цена внизу)
function ProductCard({
  product,
  stock,
  inCart,
  onAddToCart,
}: {
  product: typeof products[0];
  stock: number;
  inCart: number;
  onAddToCart: (product: typeof products[0]) => void;
}) {
  const available = stock - inCart;

  const handleCardClick = () => {
    if (available > 0) onAddToCart(product);
  };

  return (
    <div className="product-card" onClick={handleCardClick}>
      <div className="product-image">
        <img src={product.image} alt={product.name} />
      </div>
      <div className="product-info">
        <p className="product-name">{product.name}</p>
        <p className="product-category">{product.category}</p>
        <p className="product-stock">
          Остаток: {stock} шт{inCart > 0 && ` · в заказе ${inCart}`}
        </p>
      </div>
      <div className="product-footer">
        <span className="product-price">{formatMoney(product.price)} сум</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (available > 0) onAddToCart(product);
          }}
          disabled={available <= 0}
          className="btn btn-primary btn-add"
          title={available <= 0 ? 'Нет на складе' : 'Добавить в заказ'}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
