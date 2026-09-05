import { Minus, Plus } from 'lucide-react';
import type { Product } from '../data/products';
import { useStockStore } from '../store/stockStore';

// КАРТОЧКА ТОВАРА С УВЕЛИЧЕНИЕМ И УМЕНЬШЕНИЕМ КОЛИЧЕСТВА
export default function ProductCard({ product }: { product: Product }) {
  const stock = useStockStore((s) => s.stock[product.id] ?? 0);
  const increase = useStockStore((s) => s.increase);
  const decrease = useStockStore((s) => s.decrease);

  const stockColor = stock > 10 ? '#10B981' : stock > 0 ? '#F59E0B' : '#EF4444';

  return (
    <div
      className="card"
      style={{
        transition: 'transform 0.2s, box-shadow 0.2s',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 12px rgba(0,0,0,0.12)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
      }}
    >
      {/* ФОТО */}
      <div
        style={{
          width: '100%',
          height: '100px',
          backgroundColor: '#f3f4f6',
          borderRadius: '6px',
          marginBottom: '10px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src={product.image}
          alt={product.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>

      {/* НАЗВАНИЕ */}
      <p
        style={{
          fontSize: '12px',
          fontWeight: '600',
          margin: 0,
          marginBottom: '6px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={product.name}
      >
        {product.name}
      </p>

      {/* ЦЕНА */}
      <p
        style={{
          fontSize: '13px',
          fontWeight: 'bold',
          color: 'var(--primary)',
          margin: 0,
          marginBottom: '8px',
        }}
      >
        {product.price.toLocaleString()}
      </p>

      {/* КОЛИЧЕСТВО ТОВАРА — ПОЛНОСТЬЮ */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
          marginTop: 'auto',
        }}
      >
        <span style={{ fontSize: '11px', color: '#6b7280' }}>Остаток:</span>
        <span style={{ fontSize: '13px', fontWeight: 'bold', color: stockColor }}>
          {stock.toLocaleString()} шт
        </span>
      </div>

      {/* УМЕНЬШИТЬ / УВЕЛИЧИТЬ */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <button
          onClick={() => decrease(product.id)}
          disabled={stock === 0}
          className="btn btn-secondary btn-small"
          title="Уменьшить количество"
          style={{
            padding: '4px 8px',
            fontSize: '11px',
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: stock === 0 ? 0.5 : 1,
            cursor: stock === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          <Minus size={12} />
        </button>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 'bold',
            minWidth: '34px',
            textAlign: 'center',
          }}
        >
          {stock}
        </span>
        <button
          onClick={() => increase(product.id)}
          className="btn btn-primary btn-small"
          title="Увеличить количество"
          style={{
            padding: '4px 8px',
            fontSize: '11px',
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
}
