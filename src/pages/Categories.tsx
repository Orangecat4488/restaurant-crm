import { useState } from 'react';
import { ArrowLeft, Plus, Edit2, X } from 'lucide-react';
import { useProductsStore, type Category } from '../store/productsStore';
import { useStockStore } from '../store/stockStore';
import { useAuthStore } from '../store/authStore';
import ProductCard from '../components/ProductCard';
import {
  FOOD_ROWS,
  DRINK_ROW,
  ROW_TITLES,
  OTHER_ROW_TITLE,
  DRINK_ROW_TITLE,
  CATEGORY_ORDER,
} from '../data/categoryRows';

export default function Categories() {
  const products = useProductsStore((s) => s.products);
  const categories = useProductsStore((s) => s.categories);
  const addCategory = useProductsStore((s) => s.addCategory);
  const updateCategory = useProductsStore((s) => s.updateCategory);
  const deleteCategory = useProductsStore((s) => s.deleteCategory);
  const canManageProducts = useAuthStore((s) => s.canManageProducts);

  const stock = useStockStore((s) => s.stock);

  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', image: '' });

  const getCategoryCount = (categoryId: string) =>
    products.filter((p) => p.category === categoryId).length;

  const getCategoryStock = (categoryId: string) =>
    products
      .filter((p) => p.category === categoryId)
      .reduce((sum, p) => sum + (stock[p.id] ?? 0), 0);

  const byIds = (ids: string[]) =>
    ids.map((id) => categories.find((c) => c.id === id)).filter((c): c is Category => !!c);

  const categoryRows = [
    ...FOOD_ROWS.map((ids, i) => ({ title: ROW_TITLES[i], items: byIds(ids) })),
    {
      title: OTHER_ROW_TITLE,
      items: categories.filter((c) => !CATEGORY_ORDER.includes(c.id)),
    },
    { title: DRINK_ROW_TITLE, items: byIds(DRINK_ROW) },
  ].filter((row) => row.items.length > 0);

  // МОДАЛКА
  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', image: '/categories/placeholder.jpg' });
    setShowModal(true);
  };

  const openEdit = (category: Category) => {
    setEditingId(category.id);
    setForm({ name: category.name, image: category.image });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      alert('Введите название категории');
      return;
    }

    if (editingId) {
      updateCategory(editingId, {
        name: form.name.trim(),
        image: form.image,
      });
    } else {
      addCategory({
        name: form.name.trim(),
        image: form.image,
      });
    }

    setShowModal(false);
  };

  const handleDelete = (category: Category) => {
    const count = getCategoryCount(category.id);
    if (count > 0) {
      alert(`Нельзя удалить категорию "${category.name}" — в ней ${count} товаров`);
      return;
    }
    if (confirm(`Удалить категорию "${category.name}"?`)) {
      deleteCategory(category.id);
    }
  };
  void handleDelete; // Suppress unused warning

  // ВНУТРИ КАТЕГОРИИ
  if (openCategory) {
    const category = categories.find((c) => c.id === openCategory);
    const categoryProducts = products.filter((p) => p.category === openCategory);

    return (
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button
            onClick={() => setOpenCategory(null)}
            className="btn btn-secondary"
            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <ArrowLeft size={16} />
            Назад
          </button>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>{category?.name}</h1>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
              {categoryProducts.length} товаров ·{' '}
              {getCategoryStock(openCategory).toLocaleString()} шт на складе
            </p>
          </div>
        </div>

        {categoryProducts.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '16px',
            }}
          >
            {categoryProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: '#6b7280', margin: 0 }}>Товары не найдены</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>Категории</h1>
          <p style={{ color: '#6b7280' }}>Все категории товаров в ресторане</p>
        </div>
        {canManageProducts() && (
          <button
            onClick={openCreate}
            className="btn btn-primary"
            style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={14} /> Добавить категорию
          </button>
        )}
      </div>

      {/* КАТЕГОРИИ ПО РЯДАМ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', marginBottom: '32px' }}>
        {categoryRows.map((row) => (
          <div key={row.title}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <p style={{ fontSize: '15px', fontWeight: '600', margin: 0 }}>{row.title}</p>
              <p className="text-muted" style={{ fontSize: '12px', margin: 0 }}>
                {row.items.reduce((sum, c) => sum + getCategoryStock(c.id), 0).toLocaleString()} шт
              </p>
            </div>

            <div className="grid grid-4">
              {row.items.map((category) => {
                const count = getCategoryCount(category.id);
                const categoryStock = getCategoryStock(category.id);
                return (
                  <div
                    key={category.id}
                    className="card"
                    style={{ padding: '12px' }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: '140px',
                        backgroundColor: '#f3f4f6',
                        borderRadius: '8px',
                        marginBottom: '12px',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <img
                        src={category.image}
                        alt={category.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>

                    <p style={{ fontSize: '15px', fontWeight: '600', margin: 0, marginBottom: '8px' }}>
                      {category.name}
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '4px',
                      }}
                    >
                      <p className="text-muted" style={{ fontSize: '12px', margin: 0 }}>Товаров:</p>
                      <span
                        style={{
                          backgroundColor: 'var(--primary)',
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      >
                        {count}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px',
                      }}
                    >
                      <p className="text-muted" style={{ fontSize: '12px', margin: 0 }}>На складе:</p>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: '700',
                          color: categoryStock > 0 ? '#10B981' : '#EF4444',
                        }}
                      >
                        {categoryStock.toLocaleString()} шт
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => setOpenCategory(category.id)}
                        className="btn btn-primary"
                        style={{ flex: 1, fontSize: '12px' }}
                      >
                        Открыть
                      </button>
                      {canManageProducts() && (
                        <button
                          onClick={() => openEdit(category)}
                          className="btn btn-secondary"
                          style={{ fontSize: '12px' }}
                        >
                          <Edit2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-3">
        <div className="card">
          <p className="text-muted" style={{ fontSize: '12px', marginBottom: '8px' }}>
            Всего категорий
          </p>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--primary)' }}>
            {categories.length}
          </p>
        </div>
        <div className="card">
          <p className="text-muted" style={{ fontSize: '12px', marginBottom: '8px' }}>
            Всего товаров
          </p>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#10B981' }}>{products.length}</p>
        </div>
        <div className="card">
          <p className="text-muted" style={{ fontSize: '12px', marginBottom: '8px' }}>
            На складе
          </p>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#8B5CF6' }}>
            {products.reduce((sum, p) => sum + (stock[p.id] ?? 0), 0).toLocaleString()} шт
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
            style={{ width: '100%', maxWidth: '400px', padding: '24px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                {editingId ? 'Редактировать категорию' : 'Добавить категорию'}
              </h3>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary btn-small">
                <X size={16} />
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>
                Название *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Название категории"
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>
                URL изображения
              </label>
              <input
                type="text"
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                placeholder="/categories/category.jpg"
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
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
