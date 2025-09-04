# API Себестоимости МойСклад

Этот документ описывает API для работы с себестоимостью товаров из МойСклад.

## Обзор

API себестоимости позволяет получать и обновлять себестоимость товаров из МойСклад. Себестоимость получается из отчета по остаткам и сохраняется в поле `costPriceMS` для каждого размера товара.

## Базовый URL

```
https://api.moysklad.ru/api/remap/1.2/report/stock/all
```

## Аутентификация

Все запросы требуют токен МойСклад в заголовке `Authorization`:

```
Authorization: Bearer {token}
```

## Эндпоинты

### 1. Обновление себестоимости для всех интеграций

**PUT** `/api/ms-costs/all`

Обновляет себестоимость для всех интеграций с токенами МойСклад.

#### Пример запроса

```bash
curl -X PUT \
  http://localhost:3900/api/ms-costs/all \
  -H 'Authorization: Bearer {jwt_token}' \
  -H 'Content-Type: application/json'
```

#### Пример ответа

```json
{
  "success": true,
  "message": "Обновление себестоимости для всех интеграций завершено",
  "data": {
    "totalIntegrations": 3,
    "totalUpdated": 45,
    "totalErrors": 2,
    "results": [
      {
        "integrationId": "64f8a1b2c3d4e5f6a7b8c9d0",
        "integrationName": "Интеграция 1",
        "updatedCount": 15,
        "errorCount": 1,
        "totalProducts": 16
      }
    ]
  }
}
```

### 2. Обновление себестоимости для всех товаров интеграции

**PUT** `/api/ms-costs/:integrationId`

Обновляет себестоимость для всех товаров указанной интеграции.

#### Параметры пути

- `integrationId` (string, обязательный) - ID интеграции

#### Пример запроса

```bash
curl -X PUT \
  http://localhost:3900/api/ms-costs/64f8a1b2c3d4e5f6a7b8c9d0 \
  -H 'Authorization: Bearer {jwt_token}' \
  -H 'Content-Type: application/json'
```

#### Пример ответа

```json
{
  "success": true,
  "message": "Обновление себестоимости завершено",
  "data": {
    "updatedCount": 15,
    "errorCount": 2,
    "totalProducts": 17,
    "errors": [
      {
        "productId": "64f8a1b2c3d4e5f6a7b8c9d1",
        "nmID": "12345",
        "error": "Товар не найден в МойСклад"
      }
    ]
  }
}
```

### 2. Обновление себестоимости для конкретного товара

**PUT** `/api/ms-costs/:integrationId/product/:productId`

Обновляет себестоимость для конкретного товара.

#### Параметры пути

- `integrationId` (string, обязательный) - ID интеграции
- `productId` (string, обязательный) - ID товара

#### Пример запроса

```bash
curl -X PUT \
  http://localhost:3900/api/ms-costs/64f8a1b2c3d4e5f6a7b8c9d0/product/64f8a1b2c3d4e5f6a7b8c9d2 \
  -H 'Authorization: Bearer {jwt_token}' \
  -H 'Content-Type: application/json'
```

#### Пример ответа

```json
{
  "success": true,
  "message": "Себестоимость товара обновлена",
  "data": {
    "success": true,
    "message": "Себестоимость обновлена",
    "updates": {
      "sizes.0.costPriceMS": 1250.50
    }
  }
}
```

### 3. Получение статистики по себестоимости

**GET** `/api/ms-costs/:integrationId/stats`

Получает статистику по себестоимости для указанной интеграции.

#### Параметры пути

- `integrationId` (string, обязательный) - ID интеграции

#### Пример запроса

```bash
curl -X GET \
  http://localhost:3900/api/ms-costs/64f8a1b2c3d4e5f6a7b8c9d0/stats \
  -H 'Authorization: Bearer {jwt_token}'
```

#### Пример ответа

```json
{
  "success": true,
  "data": {
    "totalProducts": 17,
    "totalSizes": 34,
    "sizesWithMsCosts": 28,
    "sizesWithoutMsCosts": 6,
    "costCoverage": "82.35"
  }
}
```

## Структура данных

### Себестоимость в размере товара

```json
{
  "sizes": [
    {
      "chrtID": "12345",
      "techSize": "M",
      "ms_href": "https://api.moysklad.ru/api/remap/1.2/entity/product/...",
      "costPriceMS": 1250.50
    }
  ]
}
```

### Поле `costPriceMS`

- **Тип**: Number
- **Описание**: Себестоимость товара из МойСклад в рублях
- **Источник**: Отчет по остаткам МойСклад (`/report/stock/all`)
- **Примечание**: МойСклад отдает цену в копейках, поэтому значение автоматически делится на 100

## Обработка ошибок

### HTTP статусы

- `200` - Успешное выполнение
- `400` - Неверные параметры запроса
- `401` - Не авторизован
- `403` - Доступ запрещен
- `404` - Интеграция или товар не найдены
- `500` - Внутренняя ошибка сервера

### Формат ошибки

```json
{
  "success": false,
  "message": "Описание ошибки"
}
```

## Логика работы

1. **Получение себестоимости**: API делает запрос к МойСклад для получения отчета по остаткам всех товаров
2. **Фильтрация**: Извлекаются только товары, которые есть в локальной БД
3. **Обновление**: Для каждого размера товара обновляется поле `costPriceMS`
4. **Сохранение**: Изменения сохраняются в БД

## Ограничения

- Токен МойСклад должен быть настроен для интеграции
- Товар должен иметь поле `ms_href` в размерах
- Себестоимость обновляется только при наличии изменений

## Примеры использования

### Обновление себестоимости для всех товаров

```javascript
const response = await fetch('/api/ms-costs/64f8a1b2c3d4e5f6a7b8c9d0', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const result = await response.json();
console.log(`Обновлено товаров: ${result.data.updatedCount}`);
```

### Получение статистики

```javascript
const response = await fetch('/api/ms-costs/64f8a1b2c3d4e5f6a7b8c9d0/stats', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const stats = await response.json();
console.log(`Покрытие себестоимостью: ${stats.data.costCoverage}%`);
```
