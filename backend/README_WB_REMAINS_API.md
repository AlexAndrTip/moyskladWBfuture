# API остатков FBY Wildberries

## Описание

API для получения и обновления остатков товаров на складах FBY (Fulfillment by Yandex) Wildberries. Позволяет запрашивать отчеты об остатках, отслеживать их готовность и обновлять данные в базе данных.

## Эндпоинты

### 1. Обновить остатки FBY для всех кабинетов

**POST** `/api/wb-remains/update-all`

Обновляет остатки FBY для всех WB кабинетов текущего пользователя.

**Заголовки:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Ответ:**
```json
{
  "message": "Обновление остатков FBY завершено. Обработано кабинетов: 2",
  "summary": {
    "totalCabinets": 2,
    "successfulCabinets": 2,
    "failedCabinets": 0,
    "totalUpdatedProducts": 150
  },
  "results": [
    {
      "cabinetId": "64f1a2b3c4d5e6f7g8h9i0j1",
      "cabinetName": "Мой WB Кабинет",
      "success": true,
      "total": 100,
      "processed": 100,
      "updated": 75,
      "notFound": 25,
      "errors": null
    }
  ]
}
```

### 2. Обновить остатки FBY для конкретного кабинета

**POST** `/api/wb-remains/update/:cabinetId`

Обновляет остатки FBY для указанного WB кабинета.

**Параметры:**
- `cabinetId` (string) - ID WB кабинета

**Заголовки:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Ответ:**
```json
{
  "message": "Остатки FBY для кабинета \"Мой WB Кабинет\" обновлены успешно",
  "cabinetId": "64f1a2b3c4d5e6f7g8h9i0j1",
  "cabinetName": "Мой WB Кабинет",
  "success": true,
  "total": 100,
  "processed": 100,
  "updated": 75,
  "notFound": 25,
  "errors": null
}
```

### 3. Получить статистику остатков FBY

**GET** `/api/wb-remains/stats`

Возвращает статистику по остаткам FBY для текущего пользователя.

**Заголовки:**
```
Authorization: Bearer <token>
```

**Ответ:**
```json
{
  "overall": {
    "totalProducts": 500,
    "totalWithStock": 300,
    "totalStockQuantity": 1500,
    "avgStockQuantity": 5.0,
    "maxStockQuantity": 50,
    "minStockQuantity": 1
  },
  "byCabinet": [
    {
      "cabinetId": "64f1a2b3c4d5e6f7g8h9i0j1",
      "cabinetName": "Мой WB Кабинет",
      "totalProducts": 250,
      "totalWithStock": 150,
      "totalStockQuantity": 750
    }
  ]
}
```

### 4. Тестовый метод для проверки API

**GET** `/api/wb-remains/test/:cabinetId`

Тестирует создание отчета остатков без скачивания данных.

**Параметры:**
- `cabinetId` (string) - ID WB кабинета

**Заголовки:**
```
Authorization: Bearer <token>
```

**Ответ:**
```json
{
  "message": "Тест API остатков прошел успешно",
  "cabinetId": "64f1a2b3c4d5e6f7g8h9i0j1",
  "cabinetName": "Мой WB Кабинет",
  "taskId": "219eaecf-e532-4bd8-9f15-8036ec1b042d",
  "note": "Отчет создан, но не скачан. Используйте полное обновление для получения данных."
}
```

## Процесс работы

### 1. Создание отчета
API отправляет запрос к WB API для создания отчета остатков:
```
GET https://seller-analytics-api.wildberries.ru/api/v1/warehouse_remains
```

### 2. Отслеживание статуса
Периодически проверяется статус отчета каждые 5 секунд:
```
GET https://seller-analytics-api.wildberries.ru/api/v1/warehouse_remains/tasks/{task_id}/status
```

Возможные статусы:
- `new` - новый отчет
- `processing` - обрабатывается
- `done` - готов
- `canceled` - отменен
- `purged` - удален

### 3. Скачивание данных
После готовности отчета скачиваются данные:
```
GET https://seller-analytics-api.wildberries.ru/api/v1/warehouse_remains/tasks/{task_id}/download
```

### 4. Обработка данных
Данные обрабатываются и сохраняются в БД в поле `stockFBY` для каждого размера товара.

## Структура данных отчета

```json
[
  {
    "brand": "Nike",
    "subjectName": "Кроссовки",
    "vendorCode": "NIKE-001",
    "nmId": 123456789,
    "barcode": "1234567890123",
    "techSize": "42",
    "volume": 0.1,
    "warehouses": [
      {
        "warehouseName": "Склад 1",
        "quantity": 10
      },
      {
        "warehouseName": "Склад 2", 
        "quantity": 5
      }
    ]
  }
]
```

## Обработка ошибок

### Ошибки авторизации
- `401` - Недействительный токен WB API
- `403` - Недостаточно прав для доступа к отчетам

### Ошибки API
- `404` - Отчет не найден
- `429` - Слишком много запросов
- `500` - Внутренняя ошибка сервера WB

### Ошибки обработки
- Товар не найден по баркоду
- Ошибка сохранения в БД
- Таймаут ожидания отчета

## Использование на фронтенде

### Кнопка обновления остатков
```vue
<button 
  type="button" 
  class="update-remains-btn" 
  @click="updateFbyRemains"
  :disabled="updatingRemains"
>
  <i v-if="updatingRemains" class="fas fa-spinner fa-spin"></i>
  <i v-else class="fas fa-sync-alt"></i>
  {{ updatingRemains ? 'Обновление...' : 'Обновить остатки FBY' }}
</button>
```

### Функция обновления
```javascript
const updateFbyRemains = async () => {
  try {
    updatingRemains.value = true;
    
    const response = await axios.post(
      `${API_BASE_URL}/api/wb-remains/update-all`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Обработка результата
    const { summary, results } = response.data;
    console.log(`Обновлено товаров: ${summary.totalUpdatedProducts}`);
    
    // Обновляем список товаров
    await fetchProducts();
    
  } catch (error) {
    console.error('Ошибка при обновлении остатков:', error);
  } finally {
    updatingRemains.value = false;
  }
};
```

## Тестирование

Для тестирования API используйте скрипт:
```bash
node scripts/testWbRemains.js
```

Убедитесь, что в `.env` файле указан `TEST_TOKEN` с валидным токеном пользователя.

## Ограничения

1. **Таймаут ожидания**: Максимум 5 минут ожидания готовности отчета
2. **Интервал проверки**: 5 секунд между проверками статуса
3. **Размер батча**: Обработка по одному товару за раз
4. **Лимиты WB API**: Соблюдайте лимиты запросов к WB API

## Логирование

Все операции логируются с префиксом `[WB_REMAINS_SERVICE]`:
- Создание отчетов
- Проверка статуса
- Скачивание данных
- Обработка результатов
- Ошибки

## Мониторинг

Рекомендуется мониторить:
- Количество успешных/неуспешных обновлений
- Время выполнения операций
- Ошибки API WB
- Количество обновленных товаров
