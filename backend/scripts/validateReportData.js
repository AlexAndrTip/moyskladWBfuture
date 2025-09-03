const mongoose = require('mongoose');
const Report = require('../src/models/Report');
const Product = require('../src/models/Product');

// Конфигурация подключения к БД
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/moyskladWBfuture';

async function validateReportData(userId, reportId, integrationLinkId) {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Подключение к БД установлено');

    // Получаем все строки отчета
    const rows = await Report.find({
      user: userId,
      integrationlinks_id: integrationLinkId,
      Report_id: reportId,
    }).lean();

    console.log(`\n=== АНАЛИЗ ОТЧЕТА ${reportId} ===`);
    console.log(`Всего строк: ${rows.length}`);

    // Анализируем строки с нулевым количеством
    const zeroQuantityRows = rows.filter(r => r.quantity === 0 || r.quantity === null || r.quantity === undefined);
    console.log(`\nСтроки с нулевым количеством: ${zeroQuantityRows.length}`);
    
    if (zeroQuantityRows.length > 0) {
      console.log('Детали строк с нулевым количеством:');
      zeroQuantityRows.forEach((r, index) => {
        console.log(`  ${index + 1}. Штрихкод: ${r.barcode}, Тип: ${r.doc_type_name}, Количество: ${r.quantity}, Цена: ${r.retail_amount}, Комиссия: ${r.ppvz_for_pay}`);
      });
    }

    // Анализируем строки с отрицательными ценами
    const negativePriceRows = rows.filter(r => (r.retail_amount || 0) < 0);
    console.log(`\nСтроки с отрицательными ценами: ${negativePriceRows.length}`);
    
    if (negativePriceRows.length > 0) {
      console.log('Детали строк с отрицательными ценами:');
      negativePriceRows.forEach((r, index) => {
        console.log(`  ${index + 1}. Штрихкод: ${r.barcode}, Тип: ${r.doc_type_name}, Цена: ${r.retail_amount}`);
      });
    }

    // Анализируем строки без штрихкода
    const noBarcodeRows = rows.filter(r => !r.barcode);
    console.log(`\nСтроки без штрихкода: ${noBarcodeRows.length}`);
    
    if (noBarcodeRows.length > 0) {
      console.log('Детали строк без штрихкода:');
      noBarcodeRows.forEach((r, index) => {
        console.log(`  ${index + 1}. Тип: ${r.doc_type_name}, Количество: ${r.quantity}, Цена: ${r.retail_amount}`);
      });
    }

    // Анализируем типы документов
    const docTypes = {};
    rows.forEach(r => {
      const type = r.doc_type_name || 'Неизвестно';
      docTypes[type] = (docTypes[type] || 0) + 1;
    });
    
    console.log('\nРаспределение по типам документов:');
    Object.entries(docTypes).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    // Проверяем наличие товаров в БД
    const barcodes = [...new Set(rows.filter(r => r.barcode).map(r => r.barcode))];
    console.log(`\nУникальных штрихкодов: ${barcodes.length}`);
    
    const products = await Product.find({
      user: userId,
      integrationLink: integrationLinkId,
      'sizes.skus': { $in: barcodes }
    }).lean();
    
    console.log(`Найдено товаров в БД: ${products.length}`);
    
    const missingProducts = barcodes.filter(barcode => 
      !products.some(p => p.sizes?.some(s => s.skus?.includes(barcode)))
    );
    
    if (missingProducts.length > 0) {
      console.log(`\nШтрихкоды без товаров в БД: ${missingProducts.length}`);
      console.log('Список:', missingProducts.slice(0, 10));
    }

    // Проверяем MS ссылки
    const productsWithMSLinks = products.filter(p => p.ms_href_general);
    console.log(`\nТоваров с MS ссылками: ${productsWithMSLinks.length}`);
    
    const productsWithoutMSLinks = products.filter(p => !p.ms_href_general);
    if (productsWithoutMSLinks.length > 0) {
      console.log(`Товаров без MS ссылок: ${productsWithoutMSLinks.length}`);
      console.log('Примеры:', productsWithoutMSLinks.slice(0, 3).map(p => p.name || p.article));
    }

    // Имитируем создание позиций для МойСклад
    console.log('\n=== ИМИТАЦИЯ СОЗДАНИЯ ПОЗИЦИЙ ===');
    
    const sales = [];
    const returns = [];
    
    for (const r of rows) {
      if (!r.barcode) continue;
      
      const prod = products.find(p => 
        p.sizes?.some(s => s.skus?.includes(r.barcode))
      );
      
      if (!prod) {
        console.log(`  ❌ Товар не найден для штрихкода: ${r.barcode}`);
        continue;
      }
      
      if (!prod.ms_href_general) {
        console.log(`  ❌ Нет MS ссылки для товара: ${prod.name || prod.article}`);
        continue;
      }
      
      if (r.quantity === 0 || r.quantity === null || r.quantity === undefined) {
        console.log(`  ⚠️  Пропускаем позицию с нулевым количеством: ${r.barcode}`);
        continue;
      }
      
             // Рассчитываем комиссию правильно: комиссия = розничная цена - выплата продавцу
       let reward;
       if (r.doc_type_name === 'Продажа') {
         reward = Math.round(((r.retail_amount || 0) - (r.ppvz_for_pay || 0)) * 100);
       } else if (r.doc_type_name === 'Возврат') {
         reward = Math.round(((r.retail_amount || 0) - (r.ppvz_for_pay || 0)) * 100);
       } else {
         reward = Math.round(((r.retail_amount || 0) - (r.ppvz_for_pay || 0)) * 100);
       }

       const position = {
         assortment: {
           meta: { 
             href: prod.ms_href_general, 
             type: prod.complect ? 'bundle' : 'product', 
             mediaType: 'application/json' 
           },
         },
         quantity: r.quantity,
         price: Math.round((r.retail_amount || 0) * 100),
         vat: 0,
         reward: reward,
       };
      
      if (r.doc_type_name === 'Возврат') returns.push(position);
      else if (r.doc_type_name === 'Продажа') sales.push(position);
    }
    
    console.log(`\nПозиции для отправки в МойСклад:`);
    console.log(`  Продажи: ${sales.length}`);
    console.log(`  Возвраты: ${returns.length}`);
    
    if (sales.length > 0) {
      console.log('\nПримеры позиций продаж:');
      sales.slice(0, 3).forEach((pos, index) => {
        console.log(`  ${index + 1}. Количество: ${pos.quantity}, Цена: ${pos.price}, Комиссия: ${pos.reward}`);
      });
    }
    
    if (returns.length > 0) {
      console.log('\nПримеры позиций возвратов:');
      returns.slice(0, 3).forEach((pos, index) => {
        console.log(`  ${index + 1}. Количество: ${pos.quantity}, Цена: ${pos.price}, Комиссия: ${pos.reward}`);
      });
    }

    console.log('\n=== РЕЗУЛЬТАТ ВАЛИДАЦИИ ===');
    
    const hasErrors = zeroQuantityRows.length > 0 || negativePriceRows.length > 0 || noBarcodeRows.length > 0 || missingProducts.length > 0;
    
    if (hasErrors) {
      console.log('❌ В отчете найдены проблемы, которые могут помешать выгрузке в МойСклад:');
      if (zeroQuantityRows.length > 0) console.log(`  - ${zeroQuantityRows.length} строк с нулевым количеством`);
      if (negativePriceRows.length > 0) console.log(`  - ${negativePriceRows.length} строк с отрицательными ценами`);
      if (noBarcodeRows.length > 0) console.log(`  - ${noBarcodeRows.length} строк без штрихкода`);
      if (missingProducts.length > 0) console.log(`  - ${missingProducts.length} штрихкодов без товаров в БД`);
    } else {
      console.log('✅ Отчет готов к выгрузке в МойСклад');
    }
    
    if (sales.length === 0 && returns.length === 0) {
      console.log('❌ Нет позиций для отправки в МойСклад');
    }

  } catch (error) {
    console.error('Ошибка валидации:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Соединение с БД закрыто');
  }
}

// Пример использования
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length !== 3) {
    console.log('Использование: node validateReportData.js <userId> <reportId> <integrationLinkId>');
    console.log('Пример: node validateReportData.js 507f1f77bcf86cd799439011 report_001 507f1f77bcf86cd799439012');
    process.exit(1);
  }
  
  const [userId, reportId, integrationLinkId] = args;
  validateReportData(userId, reportId, integrationLinkId);
}

module.exports = { validateReportData };
