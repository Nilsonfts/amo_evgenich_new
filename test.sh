#!/bin/bash

# Скрипт для тестирования всех эндпоинтов интеграции

BASE_URL="http://localhost:3000"
if [ "$1" = "railway" ]; then
    BASE_URL="https://your-app-name.up.railway.app"
    echo "🚀 Тестирование Railway деплоя: $BASE_URL"
else
    echo "🔧 Тестирование локального сервера: $BASE_URL"
    echo "   Для тестирования Railway используйте: ./test.sh railway"
fi

echo "============================================"

# Функция для выполнения curl запроса
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo "📝 $description"
    echo "   $method $endpoint"
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json")
    fi
    
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTP_CODE:/d')
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo "   ✅ HTTP $http_code"
        echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
    else
        echo "   ❌ HTTP $http_code"
        echo "$body"
    fi
    
    echo ""
}

# Основные тесты
echo "🏥 HEALTH CHECKS"
echo "============================================"

test_endpoint "GET" "/health" "" "Проверка состояния сервера"
test_endpoint "GET" "/status" "" "Полный статус системы"
test_endpoint "GET" "/webhook/health" "" "Проверка вебхука"

echo "🔌 CONNECTION TESTS"
echo "============================================"

test_endpoint "GET" "/test/amocrm" "" "Тест подключения к AMO CRM"
test_endpoint "GET" "/test/google-sheets" "" "Тест подключения к Google Sheets"

echo "🔄 TOKEN MANAGEMENT"
echo "============================================"

test_endpoint "POST" "/token/refresh" "" "Обновление токена AMO CRM"

echo "📊 WEBHOOK SIMULATION"
echo "============================================"

# Читаем тестовые данные
if [ -f "test-webhook-data.json" ]; then
    webhook_data=$(cat test-webhook-data.json)
    test_endpoint "POST" "/webhook/amocrm" "$webhook_data" "Имитация вебхука AMO CRM"
else
    echo "❌ Файл test-webhook-data.json не найден"
fi

echo "⚙️ MANUAL SYNC"
echo "============================================"

# Тест ручной синхронизации (замените на реальный ID сделки)
test_endpoint "POST" "/sync/deal/123456" "" "Ручная синхронизация сделки 123456"

echo "🎯 RATE LIMITING TEST"
echo "============================================"

echo "📝 Тест ограничения скорости (5 быстрых запросов)"
for i in {1..5}; do
    echo "   Запрос $i..."
    curl -s -o /dev/null -w "HTTP %{http_code} - %{time_total}s\n" "$BASE_URL/health"
done

echo ""
echo "✅ Тестирование завершено!"
echo "============================================"

# Показать инструкции для настройки вебхука
echo ""
echo "📋 НАСТРОЙКА ВЕБХУКА В AMO CRM:"
echo "URL: $BASE_URL/webhook/amocrm"
echo "Метод: POST"
echo "События: Сделка создана, Сделка изменена"
echo "Фильтр: Воронка = 'ЕВГ СПБ'"
echo ""
echo "📋 ПОЛЕЗНЫЕ КОМАНДЫ:"
echo "curl -X GET '$BASE_URL/status'"
echo "curl -X POST '$BASE_URL/sync/deal/DEAL_ID'"
echo "curl -X POST '$BASE_URL/webhook/amocrm' -d @test-webhook-data.json"
