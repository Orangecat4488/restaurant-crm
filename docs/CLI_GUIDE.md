# ⌨️ Restaurant CRM CLI License Guide

Руководство по установке и использованию утилиты командной строки `crm-license`.

---

## 📦 Установка

```bash
# Локальная связка в репозитории:
cd cli
npm install
npm run build
npm link

# Теперь команда доступна глобально:
crm-license --version
```

---

## 🛠️ Команды

### 1. Активация лицензии (`activate`)
Активирует ключ на текущем POS-терминале с проверкой лимита активаций и срока действия.
```bash
crm-license activate A1B2-C3D4-E5F6-G7H8
```
**Результат:**
```text
⏳ Validating and activating license...
✅ License activated successfully!
Plan: Professional
Expires: 2026-08-31
Activations: 2/5
```

---

### 2. Проверка статуса (`status`)
Показывает информацию о текущей установленной лицензии, остатке дней и дате последней проверки.
```bash
crm-license status
```
**Результат:**
```text
📋 Current License Status:
Key:            A1B2-C3D4-E5F6-G7H8
Plan:           Professional
Status:         Active ✅
Expires:        2026-08-31
Days left:      180
Activations:    2/5
Last validated: 2026-03-04 02:00:00
```

---

### 3. Продление подписки (`renew`)
Продлевает подписку через платёжный шлюз.
```bash
crm-license renew
```

---

### 4. Деактивация (`deactivate`)
Удаляет лицензию с устройства и освобождает слот активации.
```bash
crm-license deactivate
# Либо с пропуском подтверждения:
crm-license deactivate --yes
```

---

### 5. Полная информация (`info`)
```bash
crm-license info
```

---

### 6. Вход в аккаунт (`login` / `logout`)
```bash
crm-license login
# Запрос email и пароля, сохранение зашифрованного токена

crm-license logout
# Очистка локальной сессии
```

---

## ⚙️ Глобальные флаги

- `--config, -c <FILE>`: Использовать альтернативный файл конфигурации (по умолчанию `~/.crm-license/config.json`).
- `--api <URL>`: Указать адрес сервера лицензирования (например, `--api https://api.crm-restaurant.com/api`).
- `--debug`: Включить расширенный вывод отладки.
- `--version, -v`: Версия утилиты.
- `--help, -h`: Справка по всем командам.
