#!/bin/bash

# Скрипт развертывания проекта на Linux сервере

set -e

echo "🚀 Развертывание проекта MoyskladWB на Linux сервере..."

# Проверка наличия Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Установите Docker и попробуйте снова."
    exit 1
fi

# Проверка наличия Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен. Установите Docker Compose и попробуйте снова."
    exit 1
fi

# Создание .env файла если его нет
if [ ! -f .env ]; then
    echo "📝 Создание .env файла из примера..."
    cp env.example .env
    echo "⚠️ Отредактируйте .env файл с вашими настройками!"
    echo "   nano .env"
    read -p "Нажмите Enter после редактирования .env файла..."
fi

# Создание директорий для логов
mkdir -p logs

# Остановка существующих контейнеров
echo "🛑 Остановка существующих контейнеров..."
docker-compose down

# Сборка образов
echo "🔨 Сборка Docker образов..."
docker-compose build --no-cache

# Запуск контейнеров
echo "🚀 Запуск контейнеров..."
docker-compose up -d

# Ожидание запуска сервисов
echo "⏳ Ожидание запуска сервисов..."
sleep 30

# Проверка статуса контейнеров
echo "📊 Статус контейнеров:"
docker-compose ps

# Проверка логов
echo "📋 Проверка логов backend:"
docker-compose logs --tail=20 backend

echo "✅ Развертывание завершено!"
echo ""
echo "🌐 Сервисы доступны по адресам:"
echo "   - Backend API: http://localhost:3900"
echo "   - MongoDB: localhost:27017"
echo "   - Redis: localhost:6379"
echo "   - Nginx: http://localhost:80"
echo ""
echo "📋 Полезные команды:"
echo "   docker-compose logs -f backend     # Логи backend"
echo "   docker-compose logs -f mongodb     # Логи MongoDB"
echo "   docker-compose logs -f redis       # Логи Redis"
echo "   docker-compose restart backend     # Перезапуск backend"
echo "   docker-compose down                # Остановка всех контейнеров"
echo "   docker-compose up -d               # Запуск всех контейнеров"
