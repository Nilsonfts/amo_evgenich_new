#!/bin/bash

# Скрипт для первого запуска и тестирования интеграции AMO CRM → Google Sheets

echo "🚀 Запуск интеграции AMO CRM → Google Sheets"
echo "============================================"

# Проверяем наличие Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен"
    exit 1
fi

# Проверяем наличие npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm не установлен"
    exit 1
fi

echo "✅ Node.js $(node --version)"
echo "✅ npm $(npm --version)"

# Устанавливаем зависимости если нужно
if [ ! -d "node_modules" ]; then
    echo "📦 Установка зависимостей..."
    npm install
fi

# Создаем папку для логов
mkdir -p logs

# Запускаем сервер
echo "🌟 Запуск сервера..."
echo "📊 Health check: http://localhost:3000/health"
echo "📈 Status: http://localhost:3000/status"
echo "🔗 Webhook URL: http://localhost:3000/webhook/amocrm"
echo ""
echo "Нажмите Ctrl+C для остановки"
echo "============================================"

npm start
