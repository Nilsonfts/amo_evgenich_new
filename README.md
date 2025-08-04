# 🔄 AMO CRM → Google Sheets Integration

**Автоматическая синхронизация сделок из AMO CRM в Google Таблицы через webhook**

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Railway](https://img.shields.io/badge/Deploy-Railway-purple.svg)](https://railway.app/)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen.svg)]()

## 🎯 Описание

Проект реализует вебхук-интеграцию между AMO CRM и Google Sheets для автоматической синхронизации сделок из воронки **"ЕВГ СПБ"** в режиме реального времени.

### ✨ Основные возможности:
- 🔗 **Webhook-обработчик** для AMO CRM
- 🎯 **Фильтрация** по воронке "ЕВГ СПБ" 
- 📊 **Автосинхронизация** с Google Sheets
- 🔄 **Автообновление** токенов AMO CRM
- 📝 **Детальное логирование** всех операций
- 🛡️ **Rate limiting** и защита API
- ⚡ **Retry логика** при ошибках
- 🏥 **Health checks** для мониторинга

## 🚀 Quick Start

```bash
# 1. Установка и запуск
npm install
npm start

# 2. Проверка работы  
curl http://localhost:3000/health

# 3. Автотест
./test.sh
```

**Webhook URL**: `https://your-app.railway.app/webhook/amocrm`

📖 **Подробные инструкции**: [QUICK_START.md](QUICK_START.md)

## 📊 Структура данных

### Экспортируемые поля:
| Поле | Описание | Источник |
|------|----------|----------|
| ID сделки | Уникальный идентификатор | AMO CRM |
| Название | Имя сделки | AMO CRM |
| Бюджет | Сумма в рублях | AMO CRM |
| Дата создания | ISO формат | AMO CRM |
| Дата изменения | ISO формат | AMO CRM |
| Этап | Название стадии | AMO CRM |
| Ответственный | Имя сотрудника | AMO CRM |
| Контакт | Имя контакта | AMO CRM |
| Телефон | Номер телефона | AMO CRM |
| Email | Электронная почта | AMO CRM |
| Компания | Название компании | AMO CRM |
| Статус | Активна/Удалена | Система |
| Источник | AMO CRM | Система |

## 🔧 API Endpoints

### Webhook
- `POST /webhook/amocrm` - Обработчик вебхука от AMO CRM

### Мониторинг  
- `GET /health` - Быстрая проверка состояния
- `GET /status` - Полная диагностика системы
- `GET /webhook/health` - Проверка вебхука

### Синхронизация
- `POST /sync/deal/:dealId` - Ручная синхронизация сделки
- `POST /token/refresh` - Обновление токена AMO CRM

### Тестирование
- `GET /test/amocrm` - Тест подключения к AMO CRM  
- `GET /test/google-sheets` - Тест подключения к Google Sheets

## 🏗️ Архитектура

```
src/
├── config/
│   └── logger.js           # Логирование Winston
├── controllers/
│   ├── webhookController.js # Обработка вебхуков
│   └── syncController.js    # Ручная синхронизация
├── services/
│   ├── amoService.js       # AMO CRM API
│   ├── googleService.js    # Google Sheets API  
│   └── tokenService.js     # Управление токенами
├── middleware/
│   └── rateLimiter.js      # Rate limiting
├── utils/
│   ├── helpers.js          # Вспомогательные функции
│   └── validators.js       # Валидация данных
└── server.js               # Express сервер
```

## 🛠️ Установка

### Локальная разработка
```bash
git clone <repository>
cd amo_evgenich_new
npm install
cp .env.example .env
# Настройте переменные в .env
npm start
```

### Railway деплой
Проект готов к деплою! Все переменные окружения уже настроены:

```bash
git push origin main
# Railway автоматически задеплоит
```

## 📋 Настройка

### 1. AMO CRM Webhook
- **URL**: `https://your-app.railway.app/webhook/amocrm`
- **События**: Сделка создана, Сделка изменена
- **Фильтр**: Воронка = "ЕВГ СПБ"
- **Метод**: POST, JSON

### 2. Google Sheets  
- **Таблица**: Автоматически создастся структура
- **Права**: Сервисный аккаунт должен иметь доступ "Редактор"
- **ID**: `1tD89CZMI8KqaHBx0gmGsHpc9eKYvpuk3OnCOpDYMDdE`

📖 **Подробная настройка**: [SETUP_GUIDE.md](SETUP_GUIDE.md)

## 🧪 Тестирование

### Автоматическое тестирование
```bash
./test.sh              # Локальный тест
./test.sh railway      # Тест Railway деплоя
```

### Ручное тестирование  
```bash
# Имитация webhook
curl -X POST http://localhost:3000/webhook/amocrm \
  -H "Content-Type: application/json" \
  -d @test-webhook-data.json

# Синхронизация сделки
curl -X POST http://localhost:3000/sync/deal/123456
```

📖 **API тестирование**: [API_TESTING.md](API_TESTING.md)

## 📊 Мониторинг

### Логирование
- **Консоль**: В режиме разработки
- **Файлы**: `logs/` директория  
- **Railway**: Встроенные логи платформы

### Метрики
- ✅ Успешные синхронизации
- ❌ Ошибки и их причины  
- 🔄 Обновления токенов
- 📈 Статистика обработки

### Health Checks
```bash
curl https://your-app.railway.app/health
curl https://your-app.railway.app/status  
```

## 🔒 Безопасность

### Защита
- 🛡️ **Rate limiting**: 100 req/min для webhook
- 🔐 **Валидация**: Все входящие данные
- 📝 **Санитизация**: Логи без токенов
- 🔄 **Retry**: Экспоненциальный backoff

### Токены
- 🔄 **Автообновление**: Каждый час
- 💾 **Безопасное хранение**: Переменные окружения
- 🔍 **Мониторинг**: Статус токенов в `/status`

## 🚀 Production Ready

### Готовые функции
- ✅ **Автоматические токены** - обновление каждый час
- ✅ **Обработка ошибок** - retry с backoff
- ✅ **Rate limiting** - защита от спама  
- ✅ **Логирование** - полная трассировка
- ✅ **Health checks** - мониторинг состояния
- ✅ **Валидация** - проверка всех данных
- ✅ **Документация** - полные инструкции

### Переменные окружения
Все токены и настройки уже сконфигурированы в Railway:
- `AMO_*` - Настройки AMO CRM
- `GOOGLE_*` - Настройки Google Sheets  
- `PORT`, `NODE_ENV` - Системные

## 📚 Документация

- 📖 [QUICK_START.md](QUICK_START.md) - Быстрый старт (2 минуты)
- 🛠️ [SETUP_GUIDE.md](SETUP_GUIDE.md) - Полная настройка  
- 🧪 [API_TESTING.md](API_TESTING.md) - Тестирование API
- 🚀 [DEPLOY_READY.md](DEPLOY_READY.md) - Готовность к деплою

## 🎯 Результат

После настройки:
1. 🔄 **Автосинхронизация**: Сделки из "ЕВГ СПБ" → Google Sheets
2. ⚡ **Реальное время**: Изменения синхронизируются мгновенно
3. 🔧 **Автономность**: Токены обновляются автоматически  
4. 📊 **Мониторинг**: Полная видимость процессов
5. 🛡️ **Надежность**: Обработка ошибок и повторы

**Webhook URL для AMO CRM**: `https://your-app.railway.app/webhook/amocrm`

---

💡 **Проект готов к продакшену и полностью автономен!**
