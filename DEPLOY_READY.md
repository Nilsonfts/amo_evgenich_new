# 🚀 Готовый проект: AMO CRM → Google Sheets интеграция

Ваш проект полностью готов к деплою на Railway! Все файлы созданы и настроены.

## ✅ Что готово:

### 📁 Структура проекта
```
amo_evgenich_new/
├── src/
│   ├── config/logger.js          # Логирование
│   ├── controllers/
│   │   ├── syncController.js     # Ручная синхронизация
│   │   └── webhookController.js  # Обработка вебхуков
│   ├── middleware/
│   │   └── rateLimiter.js        # Rate limiting
│   ├── services/
│   │   ├── amoService.js         # Работа с AMO CRM
│   │   ├── googleService.js      # Работа с Google Sheets
│   │   └── tokenService.js       # Управление токенами
│   ├── utils/
│   │   ├── helpers.js            # Вспомогательные функции
│   │   └── validators.js         # Валидация данных
│   └── server.js                 # Основной сервер
├── package.json                  # Зависимости
├── railway.json                  # Конфигурация Railway
├── README.md                     # Документация
├── SETUP_GUIDE.md               # Руководство по настройке
├── API_TESTING.md               # Тестирование API
├── start.sh                     # Скрипт запуска
├── test.sh                      # Скрипт тестирования
└── test-webhook-data.json       # Тестовые данные
```

### 🔧 Функциональность
- ✅ Webhook-обработчик для AMO CRM
- ✅ Фильтрация по воронке "ЕВГ СПБ"
- ✅ Синхронизация с Google Sheets
- ✅ Автоматическое обновление токенов AMO CRM
- ✅ Подробное логирование
- ✅ Rate limiting и защита
- ✅ Обработка ошибок и retry логика
- ✅ Health checks и мониторинг

### 📊 API Endpoints
- `POST /webhook/amocrm` - Webhook от AMO CRM
- `GET /health` - Проверка состояния
- `GET /status` - Полный статус системы
- `POST /sync/deal/:dealId` - Ручная синхронизация
- `GET /test/amocrm` - Тест AMO CRM
- `GET /test/google-sheets` - Тест Google Sheets
- `POST /token/refresh` - Обновление токена

## 🚀 Деплой на Railway

### 1. Подготовка
Ваш проект уже готов! Все переменные окружения настроены в Railway:
```env
AMO_ACCESS_TOKEN=...
AMO_CLIENT_ID=afa9bc07-3906-46a8-b92d-32c9094038b8
AMO_CLIENT_SECRET=...
AMO_DOMAIN=nebar.amocrm.ru
AMO_REDIRECT_URI=https://spb.evgenich.bar
AMO_REFRESH_TOKEN=...
GOOGLE_CREDENTIALS=...
GOOGLE_SHEET_ID=1tD89CZMI8KqaHBx0gmGsHpc9eKYvpuk3OnCOpDYMDdE
PORT=3000
```

### 2. Деплой
1. Закоммитьте все изменения:
```bash
git add .
git commit -m "Complete AMO CRM to Google Sheets integration"
git push origin main
```

2. Railway автоматически задеплоит проект при push в main ветку

### 3. После деплоя
1. Проверьте статус: `https://your-app.railway.app/health`
2. Получите URL вебхука: `https://your-app.railway.app/webhook/amocrm`
3. Настройте вебхук в AMO CRM (см. SETUP_GUIDE.md)

## 🧪 Локальное тестирование

### Запуск сервера
```bash
# Простой запуск
./start.sh

# Или через npm
npm start
```

### Тестирование всех функций
```bash
# Полное тестирование
./test.sh

# Тестирование Railway деплоя
./test.sh railway
```

### Ручное тестирование endpoints
```bash
# Health check
curl http://localhost:3000/health

# Status
curl http://localhost:3000/status

# Тест webhook
curl -X POST http://localhost:3000/webhook/amocrm \
  -H "Content-Type: application/json" \
  -d @test-webhook-data.json
```

## 📋 Настройка AMO CRM вебхука

После деплоя:

1. **URL**: `https://your-app.railway.app/webhook/amocrm`
2. **События**: "Сделка создана", "Сделка изменена"
3. **Фильтр**: Воронка = "ЕВГ СПБ"
4. **Метод**: POST
5. **Формат**: JSON

## 📊 Структура Google Таблицы

Таблица автоматически создаст заголовки:
- A: ID сделки
- B: Название сделки
- C: Бюджет
- D: Дата создания
- E: Дата изменения
- F: Этап
- G: Ответственный
- H: Контакт
- I: Телефон
- J: Email
- K: Компания
- L: Статус
- M: Источник

## 🔍 Мониторинг

### Логи Railway
1. Откройте проект в Railway
2. Перейдите в "Deployments"
3. Выберите активный деплой
4. Кликните "View Logs"

### Проверка работы
```bash
# Статус системы
curl https://your-app.railway.app/status

# Тест подключений
curl https://your-app.railway.app/test/amocrm
curl https://your-app.railway.app/test/google-sheets

# Ручная синхронизация
curl -X POST https://your-app.railway.app/sync/deal/123456
```

## ⚡ Основные особенности

### Автоматические функции
- 🔄 Обновление токенов каждый час
- 📝 Детальное логирование всех операций
- 🛡️ Rate limiting (100 req/min для webhook)
- 🔁 Retry логика для API вызовов
- 🏥 Health checks для мониторинга

### Безопасность
- ✅ Валидация всех входящих данных
- ✅ Санитизация логов (скрытие токенов)
- ✅ Rate limiting по IP
- ✅ Обработка ошибок без раскрытия деталей

### Производительность
- ⚡ Асинхронная обработка
- 📦 Batch операции для Google Sheets
- 🎯 Кэширование pipeline ID
- 🔄 Экспоненциальный backoff

## 🎯 Готово к продакшену!

Ваш проект полностью готов к использованию:
- Все токены настроены
- Вебхук готов к приему данных
- Google Sheets готова к записи
- Мониторинг и логирование настроены
- Документация готова

Просто задеплойте на Railway и настройте вебхук в AMO CRM! 🚀
