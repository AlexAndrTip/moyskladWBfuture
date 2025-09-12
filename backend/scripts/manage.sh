#!/bin/bash

# Скрипт управления контейнерами

set -e

case "$1" in
    "start")
        echo "🚀 Запуск всех контейнеров..."
        docker-compose up -d
        ;;
    "stop")
        echo "🛑 Остановка всех контейнеров..."
        docker-compose down
        ;;
    "restart")
        echo "🔄 Перезапуск всех контейнеров..."
        docker-compose restart
        ;;
    "logs")
        service=${2:-backend}
        echo "📋 Логи сервиса: $service"
        docker-compose logs -f $service
        ;;
    "status")
        echo "📊 Статус контейнеров:"
        docker-compose ps
        ;;
    "build")
        echo "🔨 Пересборка образов..."
        docker-compose build --no-cache
        ;;
    "shell")
        service=${2:-backend}
        echo "🐚 Подключение к контейнеру: $service"
        docker-compose exec $service sh
        ;;
    "mongo")
        echo "🍃 Подключение к MongoDB..."
        docker-compose exec mongodb mongosh -u admin -p password123 --authenticationDatabase admin
        ;;
    "redis")
        echo "🔴 Подключение к Redis..."
        docker-compose exec redis redis-cli -a redis123
        ;;
    "backup")
        echo "💾 Создание бэкапа MongoDB..."
        timestamp=$(date +%Y%m%d_%H%M%S)
        docker-compose exec mongodb mongodump --username admin --password password123 --authenticationDatabase admin --db moysklad_wb --out /backup
        docker cp moysklad-mongodb:/backup ./backup_$timestamp
        echo "✅ Бэкап создан: backup_$timestamp"
        ;;
    "restore")
        backup_dir=${2}
        if [ -z "$backup_dir" ]; then
            echo "❌ Укажите директорию с бэкапом: ./manage.sh restore backup_20240101_120000"
            exit 1
        fi
        echo "📥 Восстановление из бэкапа: $backup_dir"
        docker cp $backup_dir moysklad-mongodb:/restore
        docker-compose exec mongodb mongorestore --username admin --password password123 --authenticationDatabase admin --db moysklad_wb /restore/moysklad_wb
        echo "✅ Восстановление завершено"
        ;;
    "update")
        echo "🔄 Обновление проекта..."
        git pull
        docker-compose build --no-cache
        docker-compose up -d
        echo "✅ Обновление завершено"
        ;;
    *)
        echo "🛠️ Управление контейнерами MoyskladWB"
        echo ""
        echo "Использование: $0 {команда}"
        echo ""
        echo "Команды:"
        echo "  start                    - Запустить все контейнеры"
        echo "  stop                     - Остановить все контейнеры"
        echo "  restart                  - Перезапустить все контейнеры"
        echo "  logs [service]           - Показать логи (по умолчанию: backend)"
        echo "  status                   - Показать статус контейнеров"
        echo "  build                    - Пересобрать образы"
        echo "  shell [service]          - Подключиться к контейнеру"
        echo "  mongo                    - Подключиться к MongoDB"
        echo "  redis                    - Подключиться к Redis"
        echo "  backup                   - Создать бэкап MongoDB"
        echo "  restore <backup_dir>     - Восстановить из бэкапа"
        echo "  update                   - Обновить проект из Git"
        echo ""
        echo "Примеры:"
        echo "  $0 start"
        echo "  $0 logs backend"
        echo "  $0 shell backend"
        echo "  $0 backup"
        echo "  $0 restore backup_20240101_120000"
        ;;
esac
