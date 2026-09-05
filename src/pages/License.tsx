import { useState } from 'react';
import { Key, CheckCircle, XCircle, ShieldCheck, RefreshCw, ExternalLink, Copy } from 'lucide-react';
import { useLicenseStore } from '../store/licenseStore';

export default function License() {
  const {
    licenseKey,
    status,
    planName,
    expiresAt,
    daysLeft,
    activations,
    companyName,
    loading,
    error,
    activateLicense,
    checkLicense,
    deactivateLicense
  } = useLicenseStore();

  const [inputKey, setInputKey] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    if (!inputKey.trim()) return;

    const res = await activateLicense(inputKey);
    if (res.success) {
      setSuccessMsg('Лицензия успешно активирована! Все функции кассы и CRM разблокированы.');
      setInputKey('');
    }
  };

  const handlePasteDemoKey = () => {
    setInputKey('A1B2-C3D4-E5F6-G7H8');
  };

  const handleCopyKey = () => {
    if (licenseKey) {
      navigator.clipboard.writeText(licenseKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formattedDate = expiresAt ? new Date(expiresAt).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }) : 'Не установлена';

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px' }}>
      {/* ЗАГОЛОВОК */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: '#111827' }}>
            Лицензия POS-терминала
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
            Управление лицензионным ключом и коммерческой подпиской ресторана
          </p>
        </div>
        <button
          onClick={() => checkLicense()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            backgroundColor: '#ffffff',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            color: '#374151'
          }}
        >
          <RefreshCw size={16} />
          <span>Проверить статус</span>
        </button>
      </div>

      {/* КАРТОЧКА ТЕКУЩЕЙ ЛИЦЕНЗИИ */}
      <div
        style={{
          background: status === 'active'
            ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
            : '#ffffff',
          color: status === 'active' ? '#ffffff' : '#111827',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
          border: status === 'active' ? '1px solid #334155' : '1px solid #e5e7eb',
          marginBottom: '24px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: status === 'active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: status === 'active' ? '#10b981' : '#ef4444'
                }}
              >
                <ShieldCheck size={22} />
              </div>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 10px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    backgroundColor: status === 'active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: status === 'active' ? '#34d399' : '#f87171',
                    border: status === 'active' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
                  }}
                >
                  {status === 'active' ? 'Лицензия активна' : 'Требуется активация'}
                </span>
              </div>
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 6px 0' }}>
              Тариф: {planName}
            </h2>
            <p style={{ fontSize: '13px', color: status === 'active' ? '#94a3b8' : '#6b7280', margin: 0 }}>
              Заведение: {companyName || 'Мой ресторан'}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '32px', fontWeight: 900, color: status === 'active' ? '#10b981' : '#ef4444', lineHeight: 1 }}>
              {daysLeft}
            </div>
            <span style={{ fontSize: '12px', color: status === 'active' ? '#94a3b8' : '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
              Дней осталось
            </span>
            <p style={{ fontSize: '12px', color: status === 'active' ? '#cbd5e1' : '#4b5563', margin: '4px 0 0 0' }}>
              До {formattedDate}
            </p>
          </div>
        </div>

        {/* КЛЮЧ ЛИЦЕНЗИИ */}
        {licenseKey && (
          <div
            style={{
              marginTop: '20px',
              padding: '12px 16px',
              borderRadius: '10px',
              backgroundColor: status === 'active' ? 'rgba(15, 23, 42, 0.6)' : '#f3f4f6',
              border: status === 'active' ? '1px solid #334155' : '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <span style={{ fontSize: '11px', color: status === 'active' ? '#94a3b8' : '#6b7280', display: 'block' }}>
                Лицензионный ключ этого терминала
              </span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '16px', letterSpacing: '0.08em', color: status === 'active' ? '#38bdf8' : '#1e293b' }}>
                {licenseKey}
              </span>
            </div>
            <button
              onClick={handleCopyKey}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: status === 'active' ? '#334155' : '#e5e7eb',
                color: status === 'active' ? '#ffffff' : '#374151',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              <Copy size={14} />
              <span>{copied ? 'Скопировано!' : 'Копировать'}</span>
            </button>
          </div>
        )}

        {/* ЛИМИТЫ ТЕРМИНАЛОВ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '18px', paddingTop: '16px', borderTop: status === 'active' ? '1px solid #334155' : '1px solid #e5e7eb' }}>
          <div>
            <span style={{ fontSize: '11px', color: status === 'active' ? '#94a3b8' : '#6b7280', display: 'block' }}>Кассовых станций:</span>
            <strong style={{ fontSize: '14px' }}>{activations} устройств</strong>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: status === 'active' ? '#94a3b8' : '#6b7280', display: 'block' }}>Обновление статуса:</span>
            <strong style={{ fontSize: '14px' }}>Автоматически онлайн</strong>
          </div>
        </div>
      </div>

      {/* ФОРМА БЫСТРОЙ АКТИВАЦИИ */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 8px 0', color: '#111827' }}>
          Ввести новый лицензионный ключ
        </h3>
        <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 16px 0' }}>
          Если вы продлили подписку или приобрели новый ключ у поставщика CRM, введите его ниже для мгновенной активации:
        </p>

        {error && (
          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <XCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', color: '#15803d', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleActivate} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '240px' }}>
            <input
              type="text"
              placeholder="XXXX-XXXX-XXXX-XXXX"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontFamily: 'monospace',
                fontSize: '15px',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !inputKey.trim()}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              fontWeight: 600,
              fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading || !inputKey.trim() ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Key size={16} />
            <span>{loading ? 'Активация...' : 'Активировать лицензию'}</span>
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>
            Тестируете систему?
          </span>
          <button
            type="button"
            onClick={handlePasteDemoKey}
            style={{
              background: 'none',
              border: 'none',
              color: '#4f46e5',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Вставить тестовый ключ (A1B2-C3D4-E5F6-G7H8)
          </button>
        </div>
      </div>

      {/* ОНЛАЙН ПОКУПКА / ПРОДЛЕНИЕ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 6px 0', color: '#111827' }}>
            Купить или продлить тариф
          </h4>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 16px 0' }}>
            Оплатите подписку онлайн банковской картой через портал самообслуживания. Ключ активируется моментально.
          </p>
          <a
            href="http://localhost:5173/login"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            <span>Портал биллинга и тарифов</span>
            <ExternalLink size={14} />
          </a>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 6px 0', color: '#111827' }}>
            Сброс / перенос лицензии
          </h4>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 16px 0' }}>
            Если этот кассовый компьютер списывается или меняется, вы можете отвязать лицензию для переноса:
          </p>
          <button
            onClick={() => {
              if (window.confirm('Отвязать лицензию от этого кассового терминала?')) {
                deactivateLicense();
              }
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #fca5a5',
              backgroundColor: '#fff1f2',
              color: '#b91c1c',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Сбросить лицензию на этом устройстве
          </button>
        </div>
      </div>
    </div>
  );
}
