// backend/scripts/migrateProductSizesDirect.js
const { MongoClient } = require('mongodb');

// Конфигурация подключения к MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'wbms_db';
const COLLECTION_NAME = 'products';

async function migrateProductSizesDirect() {
  let client;
  
  try {
    console.log('🔌 Подключение к MongoDB...');
    console.log(`📡 URI подключения: ${MONGODB_URI}`);
    console.log(`🎯 База данных: ${DB_NAME}`);
    console.log(`📁 Коллекция: ${COLLECTION_NAME}`);
    
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Подключение к MongoDB установлено');

    const db = client.db(DB_NAME);
    
    // Проверяем доступные базы данных
    const adminDb = client.db('admin');
    const dbList = await adminDb.admin().listDatabases();
    console.log('📚 Доступные базы данных:');
    dbList.databases.forEach(db => {
      console.log(`   - ${db.name}`);
    });

    // Проверяем доступные коллекции
    const collections = await db.listCollections().toArray();
    console.log('📁 Доступные коллекции:');
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });

    const collection = db.collection(COLLECTION_NAME);
    
    // Находим все товары
    console.log('\n🔍 Поиск товаров в коллекции...');
    const products = await collection.find({}).toArray();
    console.log(`📦 Найдено товаров: ${products.length}`);

    if (products.length === 0) {
      console.log('⚠️  Товары не найдены в коллекции');
      return;
    }

    // Показываем пример первого товара
    console.log('\n📋 Пример первого товара:');
    console.log(`   ID: ${products[0]._id}`);
    console.log(`   Название: ${products[0].title || products[0].nmID}`);
    console.log(`   Количество размеров: ${products[0].sizes ? products[0].sizes.length : 0}`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const product of products) {
      try {
        let needsUpdate = false;
        const updatedSizes = [];
        
        // Проверяем каждый размер товара
        if (product.sizes && Array.isArray(product.sizes)) {
          for (const size of product.sizes) {
            const updatedSize = { ...size };
            
            // Добавляем новые поля, если их нет
            if (typeof size.priceWB === 'undefined') {
              updatedSize.priceWB = 0;
              needsUpdate = true;
            }
            if (typeof size.discountedPriceWB === 'undefined') {
              updatedSize.discountedPriceWB = 0;
              needsUpdate = true;
            }
            if (typeof size.clubDiscountedPriceWB === 'undefined') {
              updatedSize.clubDiscountedPriceWB = 0;
              needsUpdate = true;
            }
            if (typeof size.priceMS === 'undefined') {
              updatedSize.priceMS = 0;
              needsUpdate = true;
            }
            if (typeof size.costPriceMS === 'undefined') {
              updatedSize.costPriceMS = 0;
              needsUpdate = true;
            }
            if (typeof size.stockMS === 'undefined') {
              updatedSize.stockMS = 0;
              needsUpdate = true;
            }
            if (typeof size.stockFBS === 'undefined') {
              updatedSize.stockFBS = 0;
              needsUpdate = true;
            }
            if (typeof size.stockFBY === 'undefined') {
              updatedSize.stockFBY = 0;
              needsUpdate = true;
            }
            if (typeof size.lastPriceUpdate === 'undefined') {
              updatedSize.lastPriceUpdate = null;
              needsUpdate = true;
            }
            if (typeof size.lastStockUpdate === 'undefined') {
              updatedSize.lastStockUpdate = null;
              needsUpdate = true;
            }
            
            updatedSizes.push(updatedSize);
          }
        }

        // Если нужны изменения, обновляем товар
        if (needsUpdate) {
          await collection.updateOne(
            { _id: product._id },
            { $set: { sizes: updatedSizes } }
          );
          updatedCount++;
          console.log(`✅ Обновлен товар: ${product.title || product.nmID} (ID: ${product._id})`);
        }
      } catch (error) {
        console.error(`❌ Ошибка при обновлении товара ${product._id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Результаты миграции:');
    console.log(`✅ Обновлено товаров: ${updatedCount}`);
    console.log(`❌ Ошибок: ${errorCount}`);
    console.log(`📦 Всего товаров: ${products.length}`);

  } catch (error) {
    console.error('❌ Ошибка миграции:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Соединение с MongoDB закрыто');
    }
  }
}

// Запуск миграции
if (require.main === module) {
  migrateProductSizesDirect()
    .then(() => {
      console.log('🎉 Миграция завершена');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Критическая ошибка:', error);
      process.exit(1);
    });
}

module.exports = migrateProductSizesDirect; 