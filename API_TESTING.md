# API тестирование для AMO CRM → Google Sheets интеграции

Все команды curl для тестирования API endpoints.

## Основные эндпоинты

### Health Check
```bash
curl -X GET "http://localhost:3000/health" \
  -H "Content-Type: application/json"
```

### Status системы
```bash
curl -X GET "http://localhost:3000/status" \
  -H "Content-Type: application/json"
```

### Тест подключения к AMO CRM
```bash
curl -X GET "http://localhost:3000/test/amocrm" \
  -H "Content-Type: application/json"
```

### Тест подключения к Google Sheets
```bash
curl -X GET "http://localhost:3000/test/google-sheets" \
  -H "Content-Type: application/json"
```

### Health Check вебхука
```bash
curl -X GET "http://localhost:3000/webhook/health" \
  -H "Content-Type: application/json"
```

## Синхронизация

### Ручная синхронизация конкретной сделки
```bash
curl -X POST "http://localhost:3000/sync/deal/123456" \
  -H "Content-Type: application/json"
```

### Обновление токена
```bash
curl -X POST "http://localhost:3000/token/refresh" \
  -H "Content-Type: application/json"
```

## Тестирование вебхука

### Имитация вебхука от AMO CRM
```bash
curl -X POST "http://localhost:3000/webhook/amocrm" \
  -H "Content-Type: application/json" \
  -d '{
    "leads": [
      {
        "id": 123456,
        "name": "Тестовая сделка",
        "price": 50000,
        "status_id": 142,
        "pipeline_id": 3198174,
        "responsible_user_id": 8051110,
        "created_at": 1641024000,
        "updated_at": 1641024000
      }
    ]
  }'
```

## Для Railway (продакшн)

Замените `localhost:3000` на ваш Railway URL:

### Health Check
```bash
curl -X GET "https://your-app-name.up.railway.app/health" \
  -H "Content-Type: application/json"
```

### Status системы
```bash
curl -X GET "https://your-app-name.up.railway.app/status" \
  -H "Content-Type: application/json"
```

### Тест AMO CRM
```bash
curl -X GET "https://your-app-name.up.railway.app/test/amocrm" \
  -H "Content-Type: application/json"
```

### Тест Google Sheets
```bash
curl -X GET "https://your-app-name.up.railway.app/test/google-sheets" \
  -H "Content-Type: application/json"
```

### Ручная синхронизация
```bash
curl -X POST "https://your-app-name.up.railway.app/sync/deal/123456" \
  -H "Content-Type: application/json"
```

## Ожидаемые ответы

### Успешный health check
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 123.456,
  "environment": "production"
}
```

### Успешный status
```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 123.456,
  "environment": "production",
  "services": {
    "amocrm": "OK",
    "googleSheets": "OK"
  },
  "tokens": {
    "hasAccessToken": true,
    "hasRefreshToken": true,
    "lastRefreshTime": "2024-01-01T11:00:00.000Z"
  },
  "googleSheets": {
    "totalRows": 100,
    "dataRows": 99,
    "activeDeals": 95,
    "deletedDeals": 4
  }
}
```

### Успешная синхронизация
```json
{
  "success": true,
  "action": "updated",
  "dealId": "123456",
  "dealName": "Тестовая сделка",
  "row": 25,
  "processingTime": "1234ms",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Коды ошибок

- `200` - Успешно
- `400` - Неверный запрос / неверные данные
- `401` - Ошибка авторизации (проблема с токенами)
- `403` - Доступ запрещен
- `404` - Сделка не найдена
- `429` - Превышен лимит запросов
- `500` - Внутренняя ошибка сервера
- `503` - Сервис недоступен
