// Тестовый скрипт для проверки логики группировки позиций
// Запуск: node scripts/testGrouping.js

// Имитируем данные отчета
const mockRows = [
  {
    barcode: '123456789',
    doc_type_name: 'Продажа',
    quantity: 1,
    retail_amount: 1000,
    ppvz_for_pay: 100
  },
  {
    barcode: '123456789',
    doc_type_name: 'Продажа',
    quantity: 2,
    retail_amount: 2000,
    ppvz_for_pay: 200
  },
  {
    barcode: '123456789',
    doc_type_name: 'Продажа',
    quantity: 1,
    retail_amount: 1500,
    ppvz_for_pay: 150
  },
  {
    barcode: '987654321',
    doc_type_name: 'Продажа',
    quantity: 1,
    retail_amount: 500,
    ppvz_for_pay: 50
  },
  {
    barcode: '123456789',
    doc_type_name: 'Возврат',
    quantity: 1,
    retail_amount: 800,
    ppvz_for_pay: 80
  }
];

console.log('=== ТЕСТ ГРУППИРОВКИ ПОЗИЦИЙ ===');
console.log(`Исходные данные: ${mockRows.length} строк`);

// Проверяем на дублирование товаров в отчете
const barcodeCounts = {};
mockRows.forEach(r => {
  if (r.barcode) {
    barcodeCounts[r.barcode] = (barcodeCounts[r.barcode] || 0) + 1;
  }
});

const duplicates = Object.entries(barcodeCounts).filter(([barcode, count]) => count > 1);
if (duplicates.length > 0) {
  console.log('\nОбнаружены дублирующиеся товары в отчете:');
  duplicates.forEach(([barcode, count]) => {
    console.log(`  Баркод ${barcode}: ${count} раз`);
  });
}

// Группируем позиции по товару (barcode) для избежания дублирования
const salesMap = new Map(); // key: barcode, value: aggregated position
const returnsMap = new Map(); // key: barcode, value: aggregated position

for (const r of mockRows) {
  if (!r.barcode) continue;

  const position = {
    assortment: {
      meta: { href: `https://api.moysklad.ru/api/remap/1.2/entity/product/${r.barcode}`, type: 'product', mediaType: 'application/json' },
    },
    quantity: r.quantity,
    price: Math.round((r.retail_amount || 0) * 100),
    vat: 0,
    reward: Math.round(((r.retail_amount || 0) - (r.ppvz_for_pay || 0)) * 100),
  };

  if (r.doc_type_name === 'Возврат') {
    // Группируем возвраты по товару
    if (returnsMap.has(r.barcode)) {
      const existing = returnsMap.get(r.barcode);
      const oldQuantity = existing.quantity;
      const oldPrice = existing.price;
      const oldReward = existing.reward;
      
      existing.quantity += r.quantity;
      existing.price += Math.round((r.retail_amount || 0) * 100);
      existing.reward += Math.round(((r.retail_amount || 0) - (r.ppvz_for_pay || 0)) * 100);
      
      console.log(`Группируем возврат ${r.barcode}: количество ${oldQuantity} + ${r.quantity} = ${existing.quantity}, цена ${oldPrice} + ${Math.round((r.retail_amount || 0) * 100)} = ${existing.price}`);
    } else {
      returnsMap.set(r.barcode, { ...position });
      console.log(`Добавляем новый возврат ${r.barcode}`);
    }
  } else if (r.doc_type_name === 'Продажа') {
    // Группируем продажи по товару
    if (salesMap.has(r.barcode)) {
      const existing = salesMap.get(r.barcode);
      const oldQuantity = existing.quantity;
      const oldPrice = existing.price;
      const oldReward = existing.reward;
      
      existing.quantity += r.quantity;
      existing.price += Math.round((r.retail_amount || 0) * 100);
      existing.reward += Math.round(((r.retail_amount || 0) - (r.ppvz_for_pay || 0)) * 100);
      
      console.log(`Группируем продажу ${r.barcode}: количество ${oldQuantity} + ${r.quantity} = ${existing.quantity}, цена ${oldPrice} + ${Math.round((r.retail_amount || 0) * 100)} = ${existing.price}`);
    } else {
      salesMap.set(r.barcode, { ...position });
      console.log(`Добавляем новую продажу ${r.barcode}`);
    }
  }
}

// Преобразуем Map в массивы
const sales = Array.from(salesMap.values());
const returns = Array.from(returnsMap.values());

console.log(`\n=== РЕЗУЛЬТАТ ГРУППИРОВКИ ===`);
console.log(`Сгруппировано позиций: продажи ${sales.length}, возвраты ${returns.length}`);
console.log(`До группировки было ${mockRows.length} строк`);

// Логируем детали группировки для отладки
if (sales.length > 0) {
  console.log('\nДетали группировки продаж:');
  sales.forEach((pos, index) => {
    console.log(`  ${index + 1}. Товар: ${pos.assortment.meta.href}, количество: ${pos.quantity}, цена: ${pos.price}, комиссия: ${pos.reward}`);
  });
}

if (returns.length > 0) {
  console.log('\nДетали группировки возвратов:');
  returns.forEach((pos, index) => {
    console.log(`  ${index + 1}. Товар: ${pos.assortment.meta.href}, количество: ${pos.quantity}, цена: ${pos.price}, комиссия: ${pos.reward}`);
  });
}

console.log('\n=== ДАННЫЕ ДЛЯ ОТПРАВКИ В МОЙСКЛАД ===');
console.log('Продажи:', JSON.stringify(sales, null, 2));
console.log('Возвраты:', JSON.stringify(returns, null, 2));
