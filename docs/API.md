# 📡 Restaurant CRM Licensing API — Documentation

Полная спецификация REST API коммерческой системы лицензирования и управления подписками CRM ресторана.

---

## 🔐 Аутентификация и безопасность

- **Access Token**: JWT токен, срок жизни 15 минут. Передаётся в заголовке `Authorization: Bearer <access_token>`.
- **Refresh Token**: JWT токен, срок жизни 7 дней. Хранится в защищённых `httpOnly`, `sameSite: lax` Cookie или передаётся в теле запроса.
- **Хеширование паролей**: BCrypt (12 раундов).
- **Ролевая модель (RBAC)**: `admin`, `manager`, `employee`, `client`.
- **Защита от брутфорса**: 5 неверных попыток блокируют доступ на 30 минут.
- **Rate Limit**: 100 запросов за 15 минут на IP.

---

## 📋 Сводная таблица Endpoints

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Регистрация нового клиента |
| `POST` | `/api/auth/login` | Public | Вход в систему, выдача токенов |
| `POST` | `/api/auth/refresh` | Public | Обновление access-токена |
| `POST` | `/api/auth/logout` | Public / Auth | Инвалидация сессии |
| `GET` | `/api/auth/me` | Protected | Данные текущего пользователя |
| `PUT` | `/api/auth/profile` | Protected | Обновление профиля |
| `PUT` | `/api/auth/change-password` | Protected | Смена пароля с отзывом токенов |
| `GET` | `/api/licenses/:key/validate` | Public | Валидация лицензионного ключа |
| `POST` | `/api/licenses/:key/activate` | Public | Активация ключа на устройстве |
| `POST` | `/api/licenses/generate` | Admin | Ручная генерация ключа |
| `GET` | `/api/licenses/:id` | Protected | Детальная информация о лицензии |
| `PUT` | `/api/licenses/:id` | Admin | Редактирование параметров лицензии |
| `DELETE` | `/api/licenses/:id` | Admin | Отзыв лицензии |
| `GET` | `/api/licenses` | Admin | Список всех лицензий с фильтрами |
| `GET` | `/api/subscriptions/plans` | Public | Список активных тарифных планов |
| `GET` | `/api/subscriptions/plans/all` | Admin | Все планы (включая неактивные) |
| `POST` | `/api/subscriptions/plans` | Admin | Создание тарифного плана |
| `PUT` | `/api/subscriptions/plans/:id` | Admin | Редактирование тарифного плана |
| `GET` | `/api/subscriptions` | Client | Мои активные подписки |
| `POST` | `/api/subscriptions` | Protected | Оформление новой подписки |
| `GET` | `/api/subscriptions/:id` | Protected | Детали подписки |
| `POST` | `/api/subscriptions/:id/renew` | Protected | Продление подписки |
| `DELETE` | `/api/subscriptions/:id` | Protected | Отмена подписки |
| `PUT` | `/api/subscriptions/:id/auto-renew`| Protected | Переключение автопродления |
| `GET` | `/api/subscriptions/:id/history` | Protected | История платежей и аудит-логов |
| `POST` | `/api/payments/create-intent` | Protected | Создание Stripe PaymentIntent |
| `GET` | `/api/payments` | Protected | История платежей |
| `GET` | `/api/payments/:id` | Protected | Детали транзакции |
| `POST` | `/api/payments/:id/refund` | Admin | Возврат средств клиенту |
| `POST` | `/api/payments/webhook` | Webhook | Обработчик событий Stripe |
| `GET` | `/api/admin/dashboard` | Admin/Manager | Метрики MTD/YTD, графики |
| `GET` | `/api/admin/clients` | Admin/Manager | Список клиентов с балансами |
| `GET` | `/api/admin/clients/:id` | Admin/Manager | Карточка клиента и все его связи |
| `PUT` | `/api/admin/clients/:id/status` | Admin | Блокировка/разблокировка клиента |
| `POST` | `/api/admin/bulk-license` | Admin | Пакетная генерация ключей |
| `GET` | `/api/admin/reports` | Admin/Manager | Отчёты LTV, Churn rate, выручка |
| `GET` | `/api/admin/analytics` | Admin | Аналитика устройств и гео |
| `GET` | `/api/admin/audit-logs` | Admin | Журнал безопасности и действий |

---

## 📌 Примеры запросов и ответов

### 1. Регистрация клиента (`POST /api/auth/register`)

**Запрос:**
```json
{
  "email": "owner@italianbistro.com",
  "password": "SecurePassword123!",
  "firstName": "Luigi",
  "lastName": "Verdi",
  "companyName": "Verdi Italian Trattoria",
  "phone": "+1 555 987 6543",
  "city": "Boston",
  "country": "USA"
}
```

**Ответ (201 Created):**
```json
{
  "message": "Registration successful",
  "user": {
    "id": "c7a912e4-6b21-4f11-9a76-2e8bf53c4012",
    "email": "owner@italianbistro.com",
    "firstName": "Luigi",
    "lastName": "Verdi",
    "role": "client",
    "clientId": "d98124b1-8e01-44ab-b823-93cf024190c1",
    "companyName": "Verdi Italian Trattoria"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
}
```

---

### 2. Валидация лицензии (`GET /api/licenses/:key/validate`)

**Запрос:**
```http
GET /api/licenses/A1B2-C3D4-E5F6-G7H8/validate HTTP/1.1
Host: api.crm-restaurant.com
```

**Ответ (200 OK):**
```json
{
  "valid": true,
  "licenseId": "f0000000-0000-0000-0000-000000000005",
  "key": "A1B2-C3D4-E5F6-G7H8",
  "status": "active",
  "activations": 1,
  "maxActivations": 5,
  "expiresAt": "2026-08-31T00:00:00.000Z",
  "plan": {
    "id": "22222222-2222-2222-2222-222222222222",
    "name": "Professional",
    "type": "half_yearly",
    "features": {
      "locations": 5,
      "users": 20,
      "advancedReports": true,
      "support": "Priority",
      "customIntegrations": true
    },
    "maxUsers": 20,
    "maxLocations": 5
  },
  "client": {
    "companyName": "Bella Italia Bistro"
  }
}
```

---

### 3. Активация лицензии (`POST /api/licenses/:key/activate`)

**Запрос:**
```json
{
  "deviceFingerprint": "8a32b0f4d1c9e8a7"
}
```

**Ответ (200 OK):**
```json
{
  "success": true,
  "message": "License activated successfully",
  "key": "A1B2-C3D4-E5F6-G7H8",
  "plan": "Professional",
  "expiresAt": "2026-08-31T00:00:00.000Z",
  "activations": "2/5"
}
```
