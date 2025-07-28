<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="closeModal">
    <div class="modal-content">
      <button class="modal-close-button" @click="closeModal">&times;</button>
      <h3 v-if="reportDetails">Детали отчета № {{ reportDetails.report_ids }}</h3>
      <div v-if="loading" class="loading-message">Загрузка данных...</div>
      <div v-if="error" class="error-message">{{ error }}</div>
      <div v-if="reportDetails" class="report-details-container">
        <div class="detail-grid">
          <div class="detail-item">
            <strong>№ отчета:</strong>
            <span>{{ reportDetails.report_ids }}</span>
          </div>
          <div class="detail-item">
            <strong>Юридическое лицо:</strong>
            <span>{{ reportDetails.jur_name }}</span>
          </div>
          <div class="detail-item">
            <strong>Период:</strong>
            <span>{{ reportDetails.period }}</span>
          </div>
          <div class="detail-item">
            <strong>Дата формирования:</strong>
            <span>{{ new Date(reportDetails.create_dt).toLocaleString() }}</span>
          </div>
          <div class="detail-item">
            <strong>Валюта:</strong>
            <span>{{ reportDetails.currency }}</span>
          </div>
        </div>

        <hr />

        <h4>Финансовые показатели</h4>
        <div class="detail-grid">
          <div class="detail-item">
            <strong>Продажа:</strong>
            <span>{{ reportDetails.total_retail_price.toFixed(2) }}</span>
          </div>
          <div class="detail-item">
            <strong>К перечислению за товар:</strong>
            <span>{{ reportDetails.total_ppvz_for_pay.toFixed(2) }}</span>
          </div>
          <div class="detail-item">
            <strong>Стоимость логистики:</strong>
            <span>{{ reportDetails.total_delivery_rub.toFixed(2) }}</span>
          </div>
        </div>

        <hr />

        <h4>Штрафы и удержания (в разработке)</h4>
        <div class="detail-grid placeholder-section">
          <div class="detail-item"><strong>Штраф:</strong><span>{{ reportDetails.penalty }}</span></div>
          <div class="detail-item"><strong>Повышенная логистика:</strong><span>{{ reportDetails.increased_logistics }}</span></div>
          <div class="detail-item"><strong>Другие виды штрафов:</strong><span>{{ reportDetails.other_fines }}</span></div>
          <div class="detail-item"><strong>Общая сумма штрафов:</strong><span>{{ reportDetails.total_fines }}</span></div>
          <div class="detail-item"><strong>Корректировка Вознаграждения:</strong><span>{{ reportDetails.reward_correction }}</span></div>
          <div class="detail-item"><strong>Вознаграждение Вайлдберриз (ВВ):</strong><span>{{ reportDetails.wb_reward }}</span></div>
          <div class="detail-item"><strong>Стоимость хранения:</strong><span>{{ reportDetails.storage_cost }}</span></div>
          <div class="detail-item"><strong>Стоимость платной приемки:</strong><span>{{ reportDetails.paid_acceptance_cost }}</span></div>
          <div class="detail-item"><strong>Прочие удержания/выплаты:</strong><span>{{ reportDetails.other_deductions_payouts }}</span></div>
          <div class="detail-item total-item"><strong>Итого к оплате:</strong><span>{{ reportDetails.total_to_pay }}</span></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, defineProps, defineEmits } from 'vue';
import axios from 'axios';

const props = defineProps({
  isOpen: Boolean,
  reportId: String,
  integrationLinkId: String,
  getToken: Function,
});

const emit = defineEmits(['close']);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const reportDetails = ref(null);
const loading = ref(false);
const error = ref('');

const fetchReportDetails = async () => {
  if (!props.reportId || !props.integrationLinkId) return;

  loading.value = true;
  error.value = '';
  reportDetails.value = null;

  try {
    const token = props.getToken();
    const response = await axios.get(`${API_BASE_URL}/reports/details/${props.reportId}`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { integrationLinkId: props.integrationLinkId },
    });
    if (response.data.success) {
      reportDetails.value = response.data.reportDetails;
    } else {
      throw new Error(response.data.message || 'Не удалось загрузить детали отчета.');
    }
  } catch (err) {
    console.error('Ошибка загрузки деталей отчета:', err);
    error.value = err.response?.data?.message || err.message || 'Произошла ошибка при загрузке данных.';
  } finally {
    loading.value = false;
  }
};

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    fetchReportDetails();
  }
});

const closeModal = () => {
  emit('close');
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
  z-index: 1050;
}

.modal-content {
  background: #fff;
  padding: 25px 35px;
  border-radius: 8px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
}

.modal-close-button {
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #888;
}

.modal-close-button:hover {
  color: #333;
}

h3 {
  text-align: center;
  color: #333;
  margin-top: 0;
  margin-bottom: 25px;
}

.loading-message, .error-message {
  text-align: center;
  margin: 30px 0;
  font-size: 1.1em;
}

.error-message {
  color: #dc3545;
}

.report-details-container {
  color: #333;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.detail-item {
  background-color: #f9f9f9;
  padding: 12px;
  border-radius: 5px;
  border-left: 4px solid #007bff;
  display: flex;
  flex-direction: column;
}

.detail-item strong {
  margin-bottom: 5px;
  color: #555;
  font-size: 0.9em;
}

.detail-item span {
  font-size: 1.05em;
  font-weight: 500;
}

.placeholder-section .detail-item {
    border-left-color: #6c757d;
    opacity: 0.7;
}

.total-item {
    font-weight: bold;
    border-top: 2px solid #ddd;
    margin-top: 10px;
    padding-top: 10px;
}

hr {
  border: none;
  border-top: 1px solid #eee;
  margin: 25px 0;
}
</style> 