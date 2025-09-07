# WB Statistics API - Остатки FBY

## Описание

Этот модуль предоставляет API для получения остатков FBY (Fulfillment by Wildberries) через официальный Statistics API Wildberries. В отличие от существующего API остатков, который работает через отчеты, этот API позволяет получать данные напрямую.

## Основные возможности

- Получение остатков FBY через `statistics-api.wildberries.ru`
- Группировка остатков по баркодам (суммирование по всем складам)
- Обновление поля `stockFBY` в базе данных
- Фильтрация данных по различным параметрам
- Статистика по остаткам FBY

## API Endpoints

### 1. Обновить остатки для всех кабинетов

**POST** `/api/wb-statistics/update-all-stocks`

Обновляет остатки FBY для всех кабинетов пользователя.

**Тело запроса:**
```json
{
  "dateFrom": "2024-01-01", // Опционально, по умолчанию - сегодня
  "filters": {              // Опционально
    "warehouseName": "Склад 1",
    "supplierArticle": "ART001",
    "nmId": 123456,
    "barcode": "1234567890123",
    "category": "Одежда",
    "subject": "Футболки",
    "brand": "Nike",
    "techSize": "M"
  }
}
```

**Ответ:**
```json
{
  "message": "Обновление остатков FBY через Statistics API завершено. Обработано кабинетов: 2",
  "summary": {
    "totalCabinets": 2,
    "successfulCabinets": 2,
    "failedCabinets": 0,
    "totalUpdatedProducts": 150
  },
  "results": [
    {
      "cabinetId": "64a1b2c3d4e5f6789abcdef0",
      "cabinetName": "Основной кабинет",
      "success": true,
      "dateFrom": "2024-01-15",
      "total": 200,
      "uniqueBarcodes": 150,
      "processed": 150,
      "updated": 150,
      "notFound": 0,
      "errors": null
    }
  ]
}
```

### 2. Обновить остатки для конкретного кабинета

**POST** `/api/wb-statistics/update-stocks/:cabinetId`

Обновляет остатки FBY для указанного кабинета.

**Параметры:**
- `cabinetId` - ID кабинета WB

**Тело запроса:** Аналогично предыдущему endpoint

### 3. Получить отфильтрованные остатки (без сохранения в БД)

**GET** `/api/wb-statistics/stocks/:cabinetId`

Получает отфильтрованные остатки FBY без сохранения в базу данных.

**Параметры:**
- `cabinetId` - ID кабинета WB

**Query параметры:**
- `dateFrom` - Дата начала (формат: YYYY-MM-DD)
- `warehouseName` - Название склада
- `supplierArticle` - Артикул продавца
- `nmId` - Артикул WB
- `barcode` - Баркод
- `quantity` - Количество
- `category` - Категория
- `subject` - Предмет
- `brand` - Бренд
- `techSize` - Размер
- `Price` - Цена
- `Discount` - Скидка

**Пример запроса:**
```
GET /api/wb-statistics/stocks/64a1b2c3d4e5f6789abcdef0?dateFrom=2024-01-15&brand=Nike&techSize=M
```

### 4. Получить статистику остатков FBY

**GET** `/api/wb-statistics/stats`

Возвращает статистику по остаткам FBY.

**Ответ:**
```json
{
  "overall": {
    "totalProducts": 500,
    "totalWithStock": 350,
    "totalStockQuantity": 15000,
    "avgStockQuantity": 30,
    "maxStockQuantity": 1000,
    "minStockQuantity": 0
  },
  "byCabinet": [
    {
      "cabinetId": "64a1b2c3d4e5f6789abcdef0",
      "cabinetName": "Основной кабинет",
      "totalProducts": 300,
      "totalWithStock": 200,
      "totalStockQuantity": 8000
    }
  ]
}
```

### 5. Тестирование API

**GET** `/api/wb-statistics/test/:cabinetId`

Тестовый endpoint для проверки работы Statistics API.

**Параметры:**
- `cabinetId` - ID кабинета WB

**Query параметры:**
- `dateFrom` - Дата начала (опционально)

## Структура данных

### Поля в ответе Statistics API

```json
{
  "lastChangeDate": "2024-01-15T10:30:00",
  "warehouseName": "Склад 1",
  "supplierArticle": "ART001",
  "nmId": 123456,
  "barcode": "1234567890123",
  "quantity": 50,
  "inWayToClient": 5,
  "inWayFromClient": 2,
  "quantityFull": 57,
  "category": "Одежда",
  "subject": "Футболки",
  "brand": "Nike",
  "techSize": "M",
  "Price": 1500,
  "Discount": 10,
  "isSupply": true,
  "isRealization": true,
  "SCCode": "SC001"
}
```

### Обновление в базе данных

Для каждого уникального баркода:
1. Суммируются все `quantity` по всем складам
2. Ищется товар в БД по баркоду в поле `sizes.skus`
3. Обновляется поле `stockFBY` в соответствующем размере
4. Устанавливается `lastStockUpdate` в текущее время

## Обработка ошибок

### HTTP статус коды

- **200** - Успешный запрос
- **400** - Неправильный запрос (неверные параметры)
- **401** - Не авторизован (недействительный токен)
- **404** - Кабинет не найден
- **429** - Слишком много запросов
- **500** - Ошибка сервера

### Типичные ошибки

1. **Недействительный токен WB API**
   ```json
   {
     "message": "Недействительный или просроченный токен WB API"
   }
   ```

2. **Неправильный запрос**
   ```json
   {
     "message": "Неправильный запрос к WB Statistics API. Проверьте параметры"
   }
   ```

3. **Таймаут подключения**
   ```json
   {
     "message": "Таймаут подключения к WB Statistics API. Проверьте сеть"
   }
   ```

## Логирование

Все операции логируются с префиксом `[WB_STATISTICS_SERVICE]` и `[WB_STATISTICS_CONTROLLER]`.

Примеры логов:
```
[WB_STATISTICS_SERVICE] Получаем остатки FBY через Statistics API
[WB_STATISTICS_SERVICE] Параметры запроса: { dateFrom: '2024-01-15' }
[WB_STATISTICS_SERVICE] Получено 200 записей остатков
[WB_STATISTICS_SERVICE] Сгруппировано 150 уникальных баркодов
[WB_STATISTICS_SERVICE] Обновлен остаток FBY для товара 123456, размер M: 50 шт.
```

## Использование

### Пример обновления остатков для всех кабинетов

```javascript
const response = await fetch('/api/wb-statistics/update-all-stocks', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    dateFrom: '2024-01-15',
    filters: {
      brand: 'Nike'
    }
  })
});

const result = await response.json();
console.log('Обновлено товаров:', result.summary.totalUpdatedProducts);
```

### Пример получения отфильтрованных остатков

```javascript
const response = await fetch('/api/wb-statistics/stocks/64a1b2c3d4e5f6789abcdef0?dateFrom=2024-01-15&brand=Nike', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const result = await response.json();
console.log('Найдено записей:', result.totalRecords);
```

## Отличия от существующего API остатков

| Характеристика | Statistics API | Существующий API остатков |
|----------------|----------------|---------------------------|
| URL | `statistics-api.wildberries.ru` | `seller-analytics-api.wildberries.ru` |
| Метод получения | Прямой запрос | Через отчеты (асинхронно) |
| Скорость | Быстро | Медленно (ожидание отчета) |
| Фильтрация | Встроенная | Нет |
| Ограничения | Стандартные лимиты API | Ограничения отчетов |

## Безопасность

- Все endpoints требуют аутентификации
- Токены WB API не логируются
- Проверка прав доступа к кабинетам
- Валидация входных параметров
