<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="closeModal">
    <div class="modal-content">
      <div class="modal-header">
        <div class="header-title">
          <h3>Детализация отчета № {{ reportId }}</h3>
          <span v-if="reportData.length" class="records-count">
            ({{ reportData.length }} записей)
          </span>
        </div>
        <div class="header-actions">
          <button @click="exportToExcel" class="export-excel-btn" :disabled="!reportData.length || exporting">
            <i v-if="!exporting" class="fas fa-file-excel"></i>
            <span v-if="exporting" class="loading-spinner"></span>
            {{ exporting ? 'Выгрузка...' : 'Excel' }}
          </button>
          <button @click="exportToCSV" class="export-csv-btn" :disabled="!reportData.length || exporting">
            <i v-if="!exporting" class="fas fa-file-csv"></i>
            <span v-if="exporting" class="loading-spinner"></span>
            {{ exporting ? 'Выгрузка...' : 'CSV' }}
          </button>
          <button class="modal-close-button" @click="closeModal">&times;</button>
        </div>
      </div>
      
      <div v-if="loading" class="loading-message">Загрузка данных...</div>
      <div v-if="error" class="error-message">{{ error }}</div>
      
      <div v-if="reportData && reportData.length > 0" class="report-data-container">
        
        <div class="table-container">
          <table class="report-table">
            <thead>
              <tr>
                <th v-for="field in fieldMapping" :key="field.key" class="table-header">
                  {{ field.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in reportData" :key="item._id" class="table-row">
                <td v-for="field in fieldMapping" :key="field.key" :class="getCellClass(field.key)">
                  {{ formatCellValue(item[field.key], field.key) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <div v-else-if="!loading && !error" class="no-data-message">
        <p>Данные для отчета не найдены</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, defineProps, defineEmits } from 'vue';
import axios from 'axios';
import * as XLSX from 'xlsx';

const props = defineProps({
  isOpen: Boolean,
  reportId: String,
  integrationLinkId: String,
  getToken: Function,
});

const emit = defineEmits(['close']);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const reportData = ref([]);
const loading = ref(false);
const error = ref('');
const exporting = ref(false);

// Маппинг русских названий к английским полям БД
const fieldMapping = [
  { key: 'Report_id', label: '№' },
  { key: 'realizationreport_id', label: 'Номер поставки' },
  { key: 'subject_name', label: 'Предмет' },
  { key: 'nm_id', label: 'Код номенклатуры' },
  { key: 'brand_name', label: 'Бренд' },
  { key: 'sa_name', label: 'Артикул поставщика' },
  { key: 'barcode', label: 'Баркод' },
  { key: 'doc_type_name', label: 'Тип документа' },
  { key: 'supplier_oper_name', label: 'Обоснование для оплаты' },
  { key: 'order_dt', label: 'Дата заказа покупателем' },
  { key: 'sale_dt', label: 'Дата продажи' },
  { key: 'quantity', label: 'Кол-во' },
  { key: 'retail_price', label: 'Цена розничная' },
  { key: 'retail_amount', label: 'Вайлдберриз реализовал Товар (Пр)' },
  { key: 'product_discount_for_report', label: 'Согласованный продуктовый дисконт, %' },
  { key: 'supplier_promo', label: 'Промокод, %' },
  { key: 'sale_percent', label: 'Итоговая согласованная скидка, %' },
  { key: 'retail_price_withdisc_rub', label: 'Цена розничная с учетом согласованной скидки' },
  { key: 'sup_rating_prc_up', label: 'Размер снижения кВВ из-за рейтинга, %' },
  { key: 'commission_percent', label: 'Размер изменения кВВ из-за акции, %' },
  { key: 'ppvz_spp_prc', label: 'Скидка постоянного Покупателя (СПП), %' },
  { key: 'ppvz_kvw_prc', label: 'Размер кВВ, %' },
  { key: 'ppvz_kvw_prc_base', label: 'Размер кВВ без НДС, % Базовый' },
  { key: 'ppvz_sales_commission', label: 'Итоговый кВВ без НДС, %' },
  { key: 'ppvz_reward', label: 'Вознаграждение с продаж до вычета услуг поверенного, без НДС' },
  { key: 'delivery_amount', label: 'Возмещение за выдачу и возврат товаров на ПВЗ' },
  { key: 'acquiring_fee', label: 'Эквайринг/Комиссии за организацию платежей' },
  { key: 'acquiring_percent', label: 'Размер комиссии за эквайринг/Комиссии за организацию платежей, %' },
  { key: 'acquiring_bank', label: 'Тип платежа за Эквайринг/Комиссии за организацию платежей' },
  { key: 'ppvz_vw', label: 'Вознаграждение Вайлдберриз (ВВ), без НДС' },
  { key: 'ppvz_vw_nds', label: 'НДС с Вознаграждения Вайлдберриз' },
  { key: 'ppvz_for_pay', label: 'К перечислению Продавцу за реализованный Товар' },
  { key: 'delivery_rub', label: 'Услуги по доставке товара покупателю' },
  { key: 'return_amount', label: 'Количество возврата' },
  { key: 'date_from', label: 'Дата начала действия фиксации' },
  { key: 'date_to', label: 'Дата конца действия фиксации' },
  { key: 'is_kgvp_v2', label: 'Признак услуги платной доставки' },
  { key: 'penalty', label: 'Общая сумма штрафов' },
  { key: 'additional_payment', label: 'Корректировка Вознаграждения Вайлдберриз (ВВ)' },
  { key: 'bonus_type_name', label: 'Виды логистики, штрафов и корректировок ВВ' },
  { key: 'sticker_id', label: 'Стикер МП' },
  { key: 'shk_id', label: 'Номер офиса' },
  { key: 'office_name', label: 'Наименование офиса доставки' },
  { key: 'rid', label: 'ИНН партнера' },
  { key: 'ts_name', label: 'Партнер' },
  { key: 'gi_box_type_name', label: 'Склад' },
  { key: 'currency_name', label: 'Страна' },
  { key: 'srid', label: 'Номер таможенной декларации' },
  { key: 'rebill_logistic_cost', label: 'Возмещение издержек по перевозке/по складским операциям с товаром' },
  { key: 'storage_fee', label: 'Хранение' },
  { key: 'deduction', label: 'Удержания' },
  { key: 'acceptance', label: 'Платная приемка' },
  { key: 'report_type', label: 'Фиксированный коэффициент склада по поставке' }
];

const fetchReportDetalization = async () => {
  if (!props.reportId || !props.integrationLinkId) return;

  loading.value = true;
  error.value = '';
  reportData.value = [];

  try {
    const token = props.getToken();
    const response = await axios.get(`${API_BASE_URL}/reports/detalization/${props.reportId}`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { integrationLinkId: props.integrationLinkId },
    });
    
    if (response.data.success) {
      reportData.value = response.data.reportData;
    } else {
      throw new Error(response.data.message || 'Не удалось загрузить детализацию отчета.');
    }
  } catch (err) {
    console.error('Ошибка загрузки детализации отчета:', err);
    error.value = err.response?.data?.message || err.message || 'Произошла ошибка при загрузке данных.';
  } finally {
    loading.value = false;
  }
};

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    fetchReportDetalization();
  }
});

const closeModal = () => {
  emit('close');
};

// Функция для экспорта в Excel (XLSX)
const exportToExcel = async () => {
  if (!reportData.value.length || exporting.value) return;
  
  exporting.value = true;
  
  try {
    // Создаем заголовки для Excel
    const headers = fieldMapping.map(field => field.label);
    
    // Создаем данные для Excel
    const excelData = reportData.value.map(item => {
      return fieldMapping.map(field => {
        const value = item[field.key];
        if (value === null || value === undefined || value === '') {
          return '';
        }
        
        // Форматируем числовые значения
        const numericFields = [
          'quantity', 'retail_price', 'retail_amount', 'product_discount_for_report',
          'supplier_promo', 'sale_percent', 'retail_price_withdisc_rub', 'sup_rating_prc_up',
          'commission_percent', 'ppvz_spp_prc', 'ppvz_kvw_prc', 'ppvz_kvw_prc_base',
          'ppvz_sales_commission', 'ppvz_reward', 'delivery_amount', 'acquiring_fee',
          'acquiring_percent', 'ppvz_vw', 'ppvz_vw_nds', 'ppvz_for_pay', 'delivery_rub',
          'return_amount', 'penalty', 'additional_payment', 'rebill_logistic_cost',
          'storage_fee', 'deduction', 'acceptance', 'report_type', 'shk_id'
        ];
        
        if (numericFields.includes(field.key)) {
          const numValue = Number(value);
          if (!isNaN(numValue)) {
            return numValue;
          }
        }
        
        return value;
      });
    });
    
    // Добавляем заголовки в начало данных
    const allData = [headers, ...excelData];
    
    // Создаем рабочую книгу Excel
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(allData);
    
    // Устанавливаем ширину столбцов
    const colWidths = fieldMapping.map(field => ({ wch: Math.max(field.label.length, 15) }));
    ws['!cols'] = colWidths;
    
    // Добавляем лист в книгу
    XLSX.utils.book_append_sheet(wb, ws, 'Детализация отчета');
    
    // Генерируем файл и скачиваем
    const fileName = `Детализация_отчета_${props.reportId}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
  } catch (error) {
    console.error('Ошибка при экспорте в Excel:', error);
    alert('Ошибка при экспорте файла Excel');
  } finally {
    exporting.value = false;
  }
};

// Функция для экспорта в CSV
const exportToCSV = async () => {
  if (!reportData.value.length || exporting.value) return;
  
  exporting.value = true;
  
  try {
    // Создаем заголовки для CSV
    const headers = fieldMapping.map(field => field.label);
    
    // Создаем данные для CSV
    const csvData = reportData.value.map(item => {
      return fieldMapping.map(field => {
        const value = item[field.key];
        if (value === null || value === undefined || value === '') {
          return '';
        }
        
        // Форматируем числовые значения
        const numericFields = [
          'quantity', 'retail_price', 'retail_amount', 'product_discount_for_report',
          'supplier_promo', 'sale_percent', 'retail_price_withdisc_rub', 'sup_rating_prc_up',
          'commission_percent', 'ppvz_spp_prc', 'ppvz_kvw_prc', 'ppvz_kvw_prc_base',
          'ppvz_sales_commission', 'ppvz_reward', 'delivery_amount', 'acquiring_fee',
          'acquiring_percent', 'ppvz_vw', 'ppvz_vw_nds', 'ppvz_for_pay', 'delivery_rub',
          'return_amount', 'penalty', 'additional_payment', 'rebill_logistic_cost',
          'storage_fee', 'deduction', 'acceptance', 'report_type', 'shk_id'
        ];
        
        if (numericFields.includes(field.key)) {
          const numValue = Number(value);
          if (!isNaN(numValue)) {
            return numValue;
          }
        }
        
        return value;
      });
    });
    
    // Добавляем заголовки в начало данных
    const allData = [headers, ...csvData];
    
    // Создаем CSV строку с правильным разделителем для Excel
    const csvContent = allData.map(row => 
      row.map(cell => {
        // Экранируем кавычки и оборачиваем в кавычки если есть запятая или перенос строки
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n') || cellStr.includes(';')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(';') // Используем точку с запятой как разделитель для лучшей совместимости с Excel
    ).join('\r\n'); // Используем Windows-style переносы строк
    
    // Создаем Blob с BOM для правильной кодировки UTF-8
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { 
      type: 'text/csv;charset=utf-8;' 
    });
    
    // Создаем ссылку для скачивания
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Детализация_отчета_${props.reportId}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Очищаем URL
    URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Ошибка при экспорте в CSV:', error);
    alert('Ошибка при экспорте файла CSV');
  } finally {
    exporting.value = false;
  }
};

// Функция для определения класса ячейки
const getCellClass = (fieldKey) => {
  const numericFields = [
    'quantity', 'retail_price', 'retail_amount', 'product_discount_for_report',
    'supplier_promo', 'sale_percent', 'retail_price_withdisc_rub', 'sup_rating_prc_up',
    'commission_percent', 'ppvz_spp_prc', 'ppvz_kvw_prc', 'ppvz_kvw_prc_base',
    'ppvz_sales_commission', 'ppvz_reward', 'delivery_amount', 'acquiring_fee',
    'acquiring_percent', 'ppvz_vw', 'ppvz_vw_nds', 'ppvz_for_pay', 'delivery_rub',
    'return_amount', 'penalty', 'additional_payment', 'rebill_logistic_cost',
    'storage_fee', 'deduction', 'acceptance', 'report_type', 'shk_id'
  ];
  
  if (numericFields.includes(fieldKey)) {
    return 'number-cell';
  }
  
  if (fieldKey === 'subject_name') {
    return 'product-name';
  }
  
  return '';
};

// Функция для форматирования значений ячеек
const formatCellValue = (value, fieldKey) => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  
  const numericFields = [
    'quantity', 'retail_price', 'retail_amount', 'product_discount_for_report',
    'supplier_promo', 'sale_percent', 'retail_price_withdisc_rub', 'sup_rating_prc_up',
    'commission_percent', 'ppvz_spp_prc', 'ppvz_kvw_prc', 'ppvz_kvw_prc_base',
    'ppvz_sales_commission', 'ppvz_reward', 'delivery_amount', 'acquiring_fee',
    'acquiring_percent', 'ppvz_vw', 'ppvz_vw_nds', 'ppvz_for_pay', 'delivery_rub',
    'return_amount', 'penalty', 'additional_payment', 'rebill_logistic_cost',
    'storage_fee', 'deduction', 'acceptance', 'report_type', 'shk_id'
  ];
  
  if (numericFields.includes(fieldKey)) {
    const numValue = Number(value);
    if (isNaN(numValue)) {
      return value;
    }
    return numValue.toFixed(2);
  }
  
  return value;
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1060;
}

.modal-content {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  width: 98%;
  max-width: 1800px;
  max-height: 95vh;
  display: flex;
  flex-direction: column;
  position: relative;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  border-bottom: 1px solid #eee;
  background-color: #f8f9fa;
  border-radius: 8px 8px 0 0;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.3em;
}

.records-count {
  color: #6c757d;
  font-size: 0.9em;
  font-weight: normal;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.export-excel-btn {
  background-color: #217346;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.9em;
  cursor: pointer;
  transition: background-color 0.3s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.export-excel-btn:hover:not(:disabled) {
  background-color: #1e6b3d;
}

.export-excel-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
}

.export-excel-btn i {
  font-size: 0.9em;
}

.export-csv-btn {
  background-color: #17a2b8;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.9em;
  cursor: pointer;
  transition: background-color 0.3s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.export-csv-btn:hover:not(:disabled) {
  background-color: #138496;
}

.export-csv-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
}

.export-csv-btn i {
  font-size: 0.9em;
}

.loading-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid #ffffff;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.modal-close-button {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #888;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close-button:hover {
  color: #333;
}

.loading-message, .error-message, .no-data-message {
  text-align: center;
  margin: 30px 0;
  font-size: 1.1em;
  padding: 20px;
}

.error-message {
  color: #dc3545;
}

.no-data-message {
  color: #6c757d;
}

.report-data-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.data-info {
  padding: 15px 25px;
  background-color: #e9ecef;
  border-bottom: 1px solid #dee2e6;
}

.data-info p {
  margin: 0;
  font-weight: 500;
  color: #495057;
}

.table-container {
  flex: 1;
  overflow: auto;
  padding: 0;
}

.report-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8em;
  min-width: 2000px;
}

.report-table th,
.report-table td {
  padding: 6px 8px;
  text-align: left;
  border-bottom: 1px solid #dee2e6;
  white-space: nowrap;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.report-table th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #495057;
  position: sticky;
  top: 0;
  z-index: 10;
  font-size: 0.75em;
}

.table-header {
  min-width: 120px;
}

.report-table tbody tr:hover {
  background-color: #f8f9fa;
}

.product-name {
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.number-cell {
  text-align: right;
  font-family: 'Courier New', monospace;
}

/* Стили для скроллбара */
.table-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.table-container::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.table-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.table-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style> 