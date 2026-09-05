import { useState } from 'react';
import { Search, Filter, Plus, Edit2, Trash2, X } from 'lucide-react';
import { useProductsStore } from '../store/productsStore';
import { useStockStore } from '../store/stockStore';
import { useAuthStore } from '../store/authStore';
import { formatMoney } from '../utils/format';
import {
  FOOD_ROWS,
  DRINK_ROW,
  ROW_TITLES,
  OTHER_ROW_TITLE,
  DRINK_ROW_TITLE,
  CATEGORY_ORDER,
} from '../data/categoryRows';
import type { Product } from '../data/products';

export default function Products() {
  const products = useProductsStore((s) => s.products);
  const categories = useProductsStore((s) => s.categories);
  const addProduct = useProductsStore((s) => s.addProduct);
  const updateProduct = useProductsStore((s) => s.updateProduct);
  const deleteProduct = useProductsStore((s) => s.deleteProduct);
  const toggleProductActive = useProductsStore((s) => s.toggleProductActive);
  const canManageProducts = useAuthStore((s) => s.canManageProducts);

  const stock = useStockStore((s) => s.stock);
  const setStock = useStockStore((s) => s.setStock);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{
    name: string;
    price: number;
    category: string;
    stock: number;
    image: string;
    description: string;
  }>({
    name: '',
    price: 0,
    category: '',
    stock: 0,
    image: '',
    description: '',
  });

  const filteredProducts = products.filter((p) => {
    const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const byCategories = (ids: string[]) =>
    ids.flatMap((id) => filteredProducts.filter((p) => p.category === id));

  const productRows =
    selectedCategory === 'all'
      ? [
          ...FOOD_ROWS.map((ids, i) => ({ title: ROW_TITLES[i], items: byCategories(ids) })),
          {
            title: OTHER_ROW_TITLE,
            items: filteredProducts.filter((p) => !CATEGORY_ORDER.includes(p.category)),
          },
          { title: DRINK_ROW_TITLE, items: byCategories(DRINK_ROW) },
        ].filter((row) => row.items.length > 0)
      : [{ title: '', items: filteredProducts }];

  const totalStock = products.reduce((sum, p) => sum + (stock[p.id] ?? 0), 0);
  const shownStock = filteredProducts.reduce((sum, p) => sum + (stock[p.id] ?? 0), 0);
  const outOfStock = products.filter((p) => (stock[p.id] ?? 0) === 0).length;

  const sortedCategories = [...categories].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a.id);
    const bi = CATEGORY_ORDER.indexOf(b.id);
    return (ai === -1 ? CATEGORY_ORDER.length : ai) - (bi === -1 ? CATEGORY_ORDER.length : bi);
  });

  // МОДАЛКА
  const openCreate = () => {
    setEditingId(null);
    setForm({
      name: '',
      price: 0,
      category: categories[0]?.id || '',
      stock: 0,
      image: '/products/placeholder.jpg',
      description: '',
    });
    setShowModal(true);
  };

  const openEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      price: product.price,
      category: product.category,
      stock: stock[product.id] ?? 0,
      image: product.image,
      description: product.description || '',
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || form.price <= 0 || !form.category) {
      alert('Заполните все обязательные поля');
      return;
    }

    if (editingId) {
      updateProduct(editingId, {
        name: form.name.trim(),
        price: form.price,
        category: form.category,
        image: form.image,
        description: form.description.trim() || undefined,
      });
      setStock(editingId, form.stock);
    } else {
      addProduct({
        name: form.name.trim(),
        price: form.price,
        category: form.category,
        image: form.image,
        stock: form.stock,
        isActive: true,
        description: form.description.trim() || undefined,
      });
    }

    setShowModal(false);
  };

  const handleDelete = (product: Product) => {
    if (confirm(`Удалить товар "${product.name}"?`)) {
      deleteProduct(product.id);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {/* ЗАГОЛОВОК */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', margin: 0 }}>
          Товары
        </h1>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
          {filteredProducts.length} товаров найдено · {shownStock.toLocaleString()} шт на складе
        </p>
      </div>

      {/* ПОИСК И КНОПКИ */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '10px', color: '#9ca3af' }} size={16} />
          <input
            type="text"
            placeholder="Поиск..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 38px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '13px',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="btn btn-secondary"
          style={{ padding: '10px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Filter size={14} />
          Фильтр
        </button>
        {canManageProducts() && (
          <button
            onClick={openCreate}
            className="btn btn-primary"
            style={{ padding: '10px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={14} />
            Добавить товар
          </button>
        )}
      </div>

      {/* КАТЕГОРИИ */}
      {showFilters && (
        <div
          className="card"
          style={{
            marginBottom: '16px',
            padding: '12px',
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={() => setSelectedCategory('all')}
            className={`btn btn-${selectedCategory === 'all' ? 'primary' : 'secondary'}`}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            Все
          </button>
          {sortedCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`btn btn-${selectedCategory === category.id ? 'primary' : 'secondary'}`}
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              {category.name}
            </button>
          ))}
        </div>
      )}

      {/* ТОВАРЫ */}
      {filteredProducts.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {productRows.map((row) => (
            <div key={row.title || row.items[0]?.id}>
              {row.title && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px',
                  }}
                >
                  <p style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>{row.title}</p>
                  <p className="text-muted" style={{ fontSize: '12px', margin: 0 }}>
                    {row.items.length} товаров ·{' '}
                    {row.items.reduce((sum, p) => sum + (stock[p.id] ?? 0), 0).toLocaleString()} шт
                  </p>
                </div>
              )}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '16px',
                }}
              >
                {row.items.map((product) => (
                  <div key={product.id} className="card" style={{ padding: '12px' }}>
                    <div
                      style={{
                        width: '100%',
                        height: '120px',
                        background: '#f3f4f6',
                        borderRadius: '8px',
                        marginBottom: '12px',
                        overflow: 'hidden',
                      }}
                    >
                      <img
                        src={product.image}
                        alt={product.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/products/placeholder.jpg';
                        }}
                      />
                    </div>

                    <p style={{ fontWeight: '600', margin: 0, marginBottom: '4px', fontSize: '14px' }}>
                      {product.name}
                    </p>
                    <p style={{ color: '#6b7280', fontSize: '11px', margin: 0, marginBottom: '8px' }}>
                      {categories.find((c) => c.id === product.category)?.name}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: '700', color: '#10B981', fontSize: '14px' }}>
                        {formatMoney(product.price)} сум
                      </span>
                      <span style={{ fontSize: '12px', color: stock[product.id] > 0 ? '#6b7280' : '#EF4444' }}>
                        {stock[product.id] ?? 0} шт
                      </span>
                    </div>

                    {!product.isActive && (
                      <span className="badge badge-danger" style={{ fontSize: '11px', marginBottom: '8px' }}>
                        Неактивен
                      </span>
                    )}

                    {canManageProducts() && (
                      <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                        <button
                          onClick={() => openEdit(product)}
                          className="btn btn-secondary btn-small"
                          style={{ flex: 1, fontSize: '12px' }}
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => toggleProductActive(product.id)}
                          className={`btn btn-small ${product.isActive ? 'btn-secondary' : 'btn-primary'}`}
                          style={{ flex: 1, fontSize: '12px' }}
                        >
                          {product.isActive ? 'Выкл' : 'Вкл'}
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          className="btn btn-danger btn-small"
                          style={{ fontSize: '12px' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: '#6b7280', margin: 0 }}>Товары не найдены</p>
        </div>
      )}

      {/* СТАТИСТИКА */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
          gap: '12px',
          marginTop: '24px',
        }}
      >
        <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
          <p className="text-muted" style={{ fontSize: '11px', margin: 0, marginBottom: '6px' }}>
            Всего
          </p>
          <p style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--primary)', margin: 0 }}>
            {products.length}
          </p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
          <p className="text-muted" style={{ fontSize: '11px', margin: 0, marginBottom: '6px' }}>
            На складе
          </p>
          <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#10B981', margin: 0 }}>
            {totalStock.toLocaleString()} шт
          </p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
          <p className="text-muted" style={{ fontSize: '11px', margin: 0, marginBottom: '6px' }}>
            Закончились
          </p>
          <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#EF4444', margin: 0 }}>
            {outOfStock}
          </p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
          <p className="text-muted" style={{ fontSize: '11px', margin: 0, marginBottom: '6px' }}>
            Категорий
          </p>
          <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#8B5CF6', margin: 0 }}>
            {categories.length}
          </p>
        </div>
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
            style={{ width: '100%', maxWidth: '480px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                {editingId ? 'Редактировать товар' : 'Добавить товар'}
              </h3>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary btn-small">
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>
                  Название *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Название товара"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>
                    Цена (сум) *
                  </label>
                  <input
                    type="number"
                    value={form.price || ''}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    placeholder="0"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>
                    Остаток
                  </label>
                  <input
                    type="number"
                    value={form.stock || ''}
                    onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                    placeholder="0"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>
                  Категория *
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                >
                  <option value="">Выберите категорию</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>
                  URL изображения
                </label>
                <input
                  type="text"
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  placeholder="/products/product.jpg"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>
                  Описание
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Краткое описание"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                Отмена
              </button>
              <button onClick={handleSave} className="btn btn-primary" style={{ flex: 1 }}>
                {editingId ? 'Сохранить' : 'Добавить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
