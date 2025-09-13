# Система очередей задач

## Описание

Система очередей предназначена для асинхронной обработки задач обновления цен и остатков товаров. Использует Redis для хранения очередей и обеспечивает масштабируемость через воркеры.

## Архитектура

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Server    │───▶│   Redis Queue   │───▶│  Worker Service │
│                 │    │                 │    │                 │
│ - Контроллеры   │    │ - Очереди задач │    │ - Обработчики   │
│ - Сервисы       │    │ - Статусы       │    │ - Воркеры       │
│ - Маршруты      │    │ - Результаты    │    │ - Мониторинг    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Компоненты

### 1. Модели задач
- `QueueTask.js` - модель задачи очереди
- `QueueJob.js` - модель задания

### 2. Сервисы
- `queueService.js` - основной сервис для работы с очередями
- `taskProcessor.js` - процессор задач
- `workerService.js` - сервис воркера

### 3. Контроллеры
- `queueController.js` - управление очередями
- `taskController.js` - управление задачами

### 4. Маршруты
- `queueRoutes.js` - API для очередей

### 5. Воркеры
- `priceUpdateWorker.js` - воркер обновления цен
- `remainsUpdateWorker.js` - воркер обновления остатков

## Типы задач

### 1. Обновление цен WB
```javascript
{
  type: 'WB_PRICE_UPDATE',
  data: {
    cabinetId: 'cabinet_id',
    userId: 'user_id',
    limit: 100,
    offset: 0
  }
}
```

### 2. Обновление остатков WB
```javascript
{
  type: 'WB_REMAINS_UPDATE',
  data: {
    cabinetId: 'cabinet_id',
    userId: 'user_id'
  }
}
```

### 3. Обновление цен МС
```javascript
{
  type: 'MS_PRICE_UPDATE',
  data: {
    integrationId: 'integration_id',
    userId: 'user_id'
  }
}
```

## Использование

### Добавление задачи в очередь
```javascript
const queueService = require('./queueService');
await queueService.addTask('WB_PRICE_UPDATE', {
  cabinetId: 'cabinet_id',
  userId: 'user_id'
});
```

### Запуск воркера
```bash
node src/queue/workers/priceUpdateWorker.js
```

## Мониторинг

- Статистика очередей
- Статусы задач
- Логи обработки
- Метрики производительности

## Масштабирование

- Горизонтальное масштабирование воркеров
- Балансировка нагрузки
- Приоритизация задач
- Retry механизм
