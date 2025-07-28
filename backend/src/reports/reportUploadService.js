const axios = require('axios');
const Report = require('../models/Report');
const IntegrationLink = require('../models/IntegrationLink');
const Product = require('../models/Product'); // Для проверки баркодов перед загрузкой отчёта

/**
 * Загружает отчет за период в БД для пользователя и интеграции
 * @param {Object} params
 * @param {string} params.userId - ID пользователя
 * @param {string} params.integrationLinkId - ID интеграционной связки
 * @param {string} params.reportId - ID отчета (например, 140725200725)
 * @param {string} params.dateFrom - Начальная дата периода (YYYY-MM-DD)
 * @param {string} params.dateTo - Конечная дата периода (YYYY-MM-DD)
 * @returns {Promise<{count: number, saved: number, updated: number}>}
 */
async function uploadReportToDB({ userId, integrationLinkId, reportId, dateFrom, dateTo }) {
  console.log('[REPORT_SERVICE] Начинаем загрузку отчета:', { userId, integrationLinkId, reportId, dateFrom, dateTo });
  
  // 1. Получаем токен WB для интеграции
  const integrationLink = await IntegrationLink.findById(integrationLinkId).populate('wbCabinet', 'token');
  if (!integrationLink) throw new Error('Интеграция не найдена');
  const wbToken = integrationLink.wbCabinet?.token;
  if (!wbToken) throw new Error('Токен WB не найден');
  
  console.log('[REPORT_SERVICE] Токен WB получен, делаем запрос к API');

  // 2. Запрашиваем отчет у WB API
  const url = 'https://statistics-api.wildberries.ru/api/v5/supplier/reportDetailByPeriod';
  const response = await axios.get(url, {
    headers: { 
      'Authorization': `Bearer ${wbToken}`,
      'Content-Type': 'application/json'
    },
    params: {
      dateFrom,
      dateTo,
      limit: 100000
    },
    timeout: 30000
  });
  
  console.log('[REPORT_SERVICE] Ответ от WB API получен, статус:', response.status);
  
  const data = response.data;
  if (!Array.isArray(data)) {
    console.error('[REPORT_SERVICE] Некорректный ответ WB API:', data);
    throw new Error('Некорректный ответ WB API');
  }

  // --- Предварительная валидация баркодов ---
  console.log('[REPORT_SERVICE] Начинаю валидацию баркодов отчёта');
  // Получаем все barcodes (skus) из коллекции Product для текущего пользователя и интеграции
  const products = await Product.find(
    { user: userId, integrationLink: integrationLinkId },
    { 'sizes.skus': 1 }
  ).lean();

  const existingBarcodesSet = new Set();
  for (const prod of products) {
    if (Array.isArray(prod.sizes)) {
      for (const size of prod.sizes) {
        if (Array.isArray(size.skus)) {
          size.skus.forEach((sku) => existingBarcodesSet.add(String(sku)));
        }
      }
    }
  }

  console.log('[REPORT_SERVICE] В БД найдено уникальных barcode:', existingBarcodesSet.size);

  // Проверяем только те строки, где barcode присутствует (не пустой)
  const rowsWithBarcode = data.filter(
    (row) => row.barcode && String(row.barcode).trim() !== ''
  );

  const missingRows = rowsWithBarcode.filter(
    (row) => !existingBarcodesSet.has(String(row.barcode))
  );

  if (missingRows.length > 0) {
    const firstMissing = missingRows[0];
    const errorMsg = `Не удалось зашрузить отчёт "${reportId}", товар ${firstMissing.subject_name}, barcode ${firstMissing.barcode}, ${firstMissing.sa_name} - не найден в БД. Перейдите во вкладку товаров и нажмите - обновить. Проверьте наличие карточки товара в ЛК WB`;
    console.error('[REPORT_SERVICE] Валидация не пройдена. Пример отсутствующего товара:', firstMissing);
    throw new Error(errorMsg);
  }
  
  console.log('[REPORT_SERVICE] Получено записей от WB:', data.length);

  // 3. Сохраняем данные в БД
  let saved = 0;
  let updated = 0;
  
  // Сначала удаляем старые записи для этого отчета
  const deleteResult = await Report.deleteMany({
    user: userId,
    integrationlinks_id: integrationLinkId,
    Report_id: reportId
  });
  console.log('[REPORT_SERVICE] Удалено старых записей:', deleteResult.deletedCount);
  
  console.log('[REPORT_SERVICE] Начинаем сохранение', data.length, 'записей...');
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    try {
      // Логируем каждую 50-ю запись для отслеживания прогресса
      if (i % 50 === 0) {
        console.log(`[REPORT_SERVICE] Обрабатываем запись ${i + 1}/${data.length}`);
      }
      
      // Маппинг полей из WB API в нашу модель
      const reportData = {
        user: userId,
        integrationlinks_id: integrationLinkId,
        Report_id: reportId,
        date_from: dateFrom,
        date_to: dateTo,
        
        // Маппинг полей из WB API
        realizationreport_id: row.realizationreport_id,
        barcode: row.barcode,
        create_dt: row.create_dt,
        currency_name: row.currency_name,
        subject_name: row.subject_name,
        nm_id: row.nm_id,
        brand_name: row.brand_name,
        sa_name: row.sa_name,
        ts_name: row.ts_name,
        doc_type_name: row.doc_type_name,
        quantity: row.quantity,
        retail_price: row.retail_price,
        retail_amount: row.retail_amount,
        sale_percent: row.sale_percent,
        commission_percent: row.commission_percent,
        office_name: row.office_name,
        supplier_oper_name: row.supplier_oper_name,
        order_dt: row.order_dt,
        sale_dt: row.sale_dt,
        rr_dt: row.rr_dt,
        shk_id: row.shk_id,
        retail_price_withdisc_rub: row.retail_price_withdisc_rub,
        delivery_amount: row.delivery_amount,
        return_amount: row.return_amount,
        delivery_rub: row.delivery_rub,
        gi_box_type_name: row.gi_box_type_name,
        product_discount_for_report: row.product_discount_for_report,
        supplier_promo: row.supplier_promo,
        rid: row.rid,
        ppvz_spp_prc: row.ppvz_spp_prc,
        ppvz_kvw_prc_base: row.ppvz_kvw_prc_base,
        ppvz_kvw_prc: row.ppvz_kvw_prc,
        sup_rating_prc_up: row.sup_rating_prc_up,
        is_kgvp_v2: row.is_kgvp_v2,
        ppvz_sales_commission: row.ppvz_sales_commission,
        ppvz_for_pay: row.ppvz_for_pay,
        ppvz_reward: row.ppvz_reward,
        acquiring_fee: row.acquiring_fee,
        acquiring_percent: row.acquiring_percent,
        acquiring_bank: row.acquiring_bank,
        ppvz_vw: row.ppvz_vw,
        ppvz_vw_nds: row.ppvz_vw_nds,
        bonus_type_name: row.bonus_type_name,
        sticker_id: row.sticker_id,
        penalty: row.penalty,
        additional_payment: row.additional_payment,
        rebill_logistic_cost: row.rebill_logistic_cost,
        storage_fee: row.storage_fee,
        deduction: row.deduction,
        acceptance: row.acceptance,
        srid: row.srid,
        report_type: row.report_type,
        lineSum: row.lineSum || 0
      };
      
      // Создаем новую запись
      await Report.create(reportData);
      saved++;
      
    } catch (error) {
      console.error('[REPORT_SERVICE] Ошибка сохранения записи:', error);
      console.error('[REPORT_SERVICE] Данные записи:', row);
      // Продолжаем обработку других записей
    }
  }
  
  console.log('[REPORT_SERVICE] Загрузка завершена. Сохранено:', saved, 'Обновлено:', updated);
  
  // Проверяем, сколько записей действительно сохранено в БД
  const actualCount = await Report.countDocuments({
    user: userId,
    integrationlinks_id: integrationLinkId,
    Report_id: reportId
  });
  console.log('[REPORT_SERVICE] Фактически сохранено в БД:', actualCount);
  
  return { count: data.length, saved, updated };
}

module.exports = { uploadReportToDB }; 