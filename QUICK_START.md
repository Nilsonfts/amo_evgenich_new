# 🚀 Quick Start - AMO CRM → Google Sheets

## Мгновенный запуск (2 минуты)

### 1. 📥 Запуск локально
```bash
# Установка и запуск
npm install
npm start

# Или через скрипт
./start.sh
```

Сервер запустится на `http://localhost:3000`

### 2. ✅ Проверка работы
```bash
# Быстрая проверка
curl http://localhost:3000/health

# Полный статус
curl http://localhost:3000/status

# Автотест
./test.sh
```

### 3. 🔗 Настройка вебхука в AMO CRM

**URL**: `https://your-railway-app.up.railway.app/webhook/amocrm`

**Настройки**:
- События: ✅ Сделка создана, ✅ Сделка изменена  
- Фильтр: Воронка = "ЕВГ СПБ"
- Метод: POST
- Формат: JSON

### 4. 📊 Google Sheets

Таблица: `https://docs.google.com/spreadsheets/d/1tD89CZMI8KqaHBx0gmGsHpc9eKYvpuk3OnCOpDYMDdE`

Автоматически создастся структура:
| A | B | C | D | E | F | G | H | I | J | K | L | M |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ID | Название | Бюджет | Создано | Изменено | Этап | Ответственный | Контакт | Телефон | Email | Компания | Статус | Источник |

## 🧪 Быстрый тест

### Имитация webhook от AMO CRM:
```bash
curl -X POST http://localhost:3000/webhook/amocrm \
  -H "Content-Type: application/json" \
  -d @test-webhook-data.json
```

### Ручная синхронизация сделки:
```bash
curl -X POST http://localhost:3000/sync/deal/123456
```

## 🔧 Важные endpoints

- `GET /health` - Проверка работы
- `GET /status` - Полная диагностика  
- `POST /webhook/amocrm` - Webhook URL для AMO CRM
- `POST /sync/deal/:id` - Ручная синхронизация
- `GET /test/amocrm` - Тест AMO CRM подключения
- `GET /test/google-sheets` - Тест Google Sheets

## 🚨 Если что-то не работает

### 1. Проверьте переменные окружения в Railway:
- `AMO_ACCESS_TOKEN` ✅
- `AMO_REFRESH_TOKEN` ✅  
- `GOOGLE_CREDENTIALS` ✅
- `GOOGLE_SHEET_ID` ✅

### 2. Проверьте подключения:
```bash
curl https://your-app.railway.app/test/amocrm
curl https://your-app.railway.app/test/google-sheets
```

### 3. Посмотрите логи в Railway:
`Project → Deployments → View Logs`

### 4. Обновите токен:
```bash
curl -X POST https://your-app.railway.app/token/refresh
```

## 🎯 Готово!

После успешной настройки:
1. ✅ Сделки из воронки "ЕВГ СПБ" автоматически попадают в Google Sheets
2. ✅ Обновления сделок синхронизируются в реальном времени  
3. ✅ Токены обновляются автоматически
4. ✅ Все события логируются

**Webhook URL для AMO CRM**: `https://your-app.railway.app/webhook/amocrm`
