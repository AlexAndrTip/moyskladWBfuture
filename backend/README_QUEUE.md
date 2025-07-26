# Система очередей для загрузки отчетов

## Описание

Система очередей позволяет обрабатывать большие объемы данных отчетов WB без блокировки сервера. Используется библиотека Bull с Redis в качестве хранилища.

## Установка Redis

### Windows
1. Скачайте Redis для Windows: https://github.com/microsoftarchive/redis/releases
2. Установите Redis
3. Запустите Redis сервер: `redis-server`

### macOS
```bash
brew install redis
brew services start redis
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

## Установка зависимостей

```bash
cd backend
npm install
```

## Настройка переменных окружения

Добавьте в файл `.env`:

```env
# Redis настройки (опционально, используются значения по умолчанию)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

## Запуск

1. Убедитесь, что Redis запущен
2. Запустите backend: `npm start`

## API Endpoints

### Добавить задачу в очередь
```
POST /api/queue/report-upload
{
  "integrationLinkId": "...",
  "reportId": "...",
  "dateFrom": "2025-01-01",
  "dateTo": "2025-01-07"
}
```

### Получить статус задачи
```
GET /api/queue/job/:jobId
```

### Получить статистику очереди
```
GET /api/queue/stats
```

## Особенности

- Максимум 10 параллельных задач
- Автоматические повторы при ошибках (3 попытки)
- Экспоненциальная задержка между повторами
- Автоматическая очистка завершенных задач
- Graceful shutdown при остановке сервера

## Мониторинг

В консоли сервера отображаются логи:
- `[QUEUE_SERVICE]` - логи сервиса очередей
- `[REPORT_SERVICE]` - логи загрузки отчетов
- Статусы задач: waiting, active, completed, failed 