<template>
  <div v-if="isVisible" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>Оформление подписки</h2>
        <button class="close-button" @click="closeModal">&times;</button>
      </div>
      
      <div class="modal-body">
        <div v-if="isLoading" class="loading">
          <p>Загрузка планов подписки...</p>
        </div>
        
        <div v-else-if="error" class="error">
          <p>{{ error }}</p>
        </div>
        
        <div v-else class="subscription-plans">
          <p class="description">
            Выберите подходящий план подписки для доступа ко всем функциям системы
          </p>

          <!-- Управление лимитами -->
          <div class="limits-controls">
            <div class="limit-item">
              <span>Кабинеты WB:</span>
              <button class="limit-btn" @click="decrementWbCabinets" :disabled="wbCabinetsCount <= minWbLimit">-</button>
              <span class="limit-value">{{ wbCabinetsCount }}</span>
              <button class="limit-btn" @click="incrementWbCabinets">+</button>
            </div>
            <div class="limit-item">
              <span>Кабинеты МС:</span>
              <button class="limit-btn" @click="decrementMsStorages" :disabled="msStoragesCount <= minMsLimit">-</button>
              <span class="limit-value">{{ msStoragesCount }}</span>
              <button class="limit-btn" @click="incrementMsStorages">+</button>
            </div>
          </div>

          <!-- Отладочная информация -->
          <div v-if="plans.length === 0 && !isLoading" class="debug-info">
            <p>Планы не загружены. Количество планов: {{ plans.length }}</p>
            <p>Ошибка: {{ error }}</p>
          </div>
          
          <div class="plans-grid">
            <div 
              v-for="plan in plans" 
              :key="plan.id"
              class="plan-card"
              :class="{ 'selected': selectedPlan?.id === plan.id }"
              @click="selectPlan(plan)"
            >
              <div class="plan-header">
                <h3>{{ plan.name }}</h3>
                <div v-if="plan.discount > 0" class="discount-badge">
                  -{{ plan.discount }}%
                </div>
              </div>
              
              <div class="plan-price">
                <div class="final-price">{{ formatPrice(getFinalPrice(plan)) }} ₽</div>
                <div v-if="plan.discount > 0" class="original-price">
                  {{ formatPrice(plan.price + ((Math.max(msStoragesCount - minMsLimit, 0) * 750 + Math.max(wbCabinetsCount - minWbLimit, 0) * 500) * plan.months)) }} ₽
                </div>
              </div>
              
              <div v-if="getSavings(plan) > 0" class="savings">
                Экономия: {{ formatPrice(getSavings(plan)) }} ₽
              </div>
              
              <div class="plan-features">
                <ul>
                  <li>Полный доступ ко всем функциям</li>
                  <li>Неограниченное количество товаров</li>
                  <li>Приоритетная поддержка</li>
                  <li>Автоматическая синхронизация</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div class="selected-plan-info" v-if="selectedPlan">
            <h4>Выбранный план: {{ selectedPlan.name }}</h4>
            <p>Стоимость: {{ formatPrice(getFinalPrice(selectedPlan)) }} ₽</p>
            <p v-if="getSavings(selectedPlan) > 0">
              Экономия: {{ formatPrice(getSavings(selectedPlan)) }} ₽
            </p>
          </div>
          
          <div class="modal-actions">
            <button 
              class="btn btn-secondary" 
              @click="closeModal"
              :disabled="isProcessing"
            >
              Отмена
            </button>
            <button 
              class="btn btn-primary" 
              @click="processSubscription"
              :disabled="!selectedPlan || isProcessing"
            >
              {{ isProcessing ? 'Обработка...' : 'Оформить подписку' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import axios from 'axios';

const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'subscription-updated']);

const plans = ref([]);
const selectedPlan = ref(null);
const isLoading = ref(false);
const isProcessing = ref(false);
const error = ref('');

// Добавляем реактивные значения лимитов
const wbCabinetsCount = ref(3);
const msStoragesCount = ref(3);

// Минимальные значения, рассчитываемые на основе текущего количества сущностей (≥3)
const minWbLimit = ref(3);
const minMsLimit = ref(3);

const formatPrice = (price) => {
  return new Intl.NumberFormat('ru-RU').format(price);
};

const loadPlans = async () => {
  isLoading.value = true;
  error.value = '';
  
  try {
    const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/subscription/plans`;
    console.log('Loading subscription plans from:', apiUrl);
    const response = await axios.get(apiUrl);
    console.log('Subscription plans response:', response.data);
    plans.value = response.data;
  } catch (err) {
    console.error('Error loading subscription plans:', err);
    console.error('Error details:', err.response?.data);
    error.value = `Ошибка загрузки планов подписки: ${err.response?.data?.message || err.message}`;
  } finally {
    isLoading.value = false;
  }
};

const selectPlan = (plan) => {
  selectedPlan.value = plan;
};

const processSubscription = async () => {
  if (!selectedPlan.value) return;
  
  isProcessing.value = true;
  error.value = '';
  
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${import.meta.env.VITE_API_BASE_URL}/subscription/update`,
      { 
        months: selectedPlan.value.months,
        maxStorages: msStoragesCount.value,
        maxWbCabinets: wbCabinetsCount.value
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    // Уведомляем родительский компонент об обновлении подписки
    emit('subscription-updated', response.data.subscription);
    closeModal();
    
    // Показываем уведомление об успехе
    alert('Подписка успешно оформлена!');
    
  } catch (err) {
    console.error('Error processing subscription:', err);
    if (err.response?.data?.message) {
      error.value = err.response.data.message;
    } else {
      error.value = 'Ошибка оформления подписки. Попробуйте позже.';
    }
  } finally {
    isProcessing.value = false;
  }
};

const closeModal = () => {
  selectedPlan.value = null;
  error.value = '';
  emit('close');
};

// Загрузка лимитов пользователя
const loadUserLimits = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;
    const resp = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/limits`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    // Минимумы – максимум между 3 и фактическим количеством объектов
    minWbLimit.value = Math.max(3, resp.data.currentWbCabinets || 0);
    minMsLimit.value = Math.max(3, resp.data.currentStorages || 0);

    // Начальные значения – стартуем с фактического количества (минимума)
    wbCabinetsCount.value = minWbLimit.value;
    msStoragesCount.value = minMsLimit.value;
  } catch (err) {
    console.error('Error loading user limits:', err);
  }
};

// Изменение значений (кнопки +/-)
function incrementWbCabinets() { wbCabinetsCount.value++; }
function decrementWbCabinets() { if (wbCabinetsCount.value > minWbLimit.value) wbCabinetsCount.value--; }
function incrementMsStorages() { msStoragesCount.value++; }
function decrementMsStorages() { if (msStoragesCount.value > minMsLimit.value) msStoragesCount.value--; }

// Вычисление итоговой цены с учётом лимитов и скидки
const getFinalPrice = (plan) => {
  if (!plan) return 0;
  // Базовая стоимость (уже за months без скидки)
  const basePrice = plan.price;
  const extraStorages = Math.max(0, msStoragesCount.value - minMsLimit.value);
  const extraCabinets = Math.max(0, wbCabinetsCount.value - minWbLimit.value);
  const extraCost = (extraStorages * 750 + extraCabinets * 500) * plan.months;
  const rawCost = basePrice + extraCost;
  const discounted = Math.round(rawCost * (1 - plan.discount / 100));
  return discounted;
};

const getSavings = (plan) => {
  if (!plan) return 0;
  const extraStorages = Math.max(0, msStoragesCount.value - minMsLimit.value);
  const extraCabinets = Math.max(0, wbCabinetsCount.value - minWbLimit.value);
  const original = plan.price + (extraStorages * 750 + extraCabinets * 500) * plan.months;
  return original - getFinalPrice(plan);
};

// Обновляем loadPlans вызов чтобы после загрузки лимитов пересчитать цены
const loadInitialData = async () => {
  await loadUserLimits();
  await loadPlans();
};

// Заменяем вызовы loadPlans на loadInitialData
watch(() => props.isVisible, (newValue) => {
  if (newValue) {
    loadInitialData();
  }
});

onMounted(() => {
  if (props.isVisible) {
    loadInitialData();
  }
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  max-width: 800px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 30px;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  margin: 0;
  color: #333;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  color: #333;
}

.modal-body {
  padding: 30px;
}

.loading, .error {
  text-align: center;
  padding: 40px;
}

.error {
  color: #e74c3c;
}

.description {
  text-align: center;
  color: #666;
  margin-bottom: 30px;
  font-size: 16px;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.plan-card {
  border: 2px solid #eee;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.plan-card:hover {
  border-color: #4CAF50;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.2);
}

.plan-card.selected {
  border-color: #4CAF50;
  background-color: #f8fff8;
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.plan-header h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.discount-badge {
  background-color: #e74c3c;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.plan-price {
  margin-bottom: 15px;
}

.final-price {
  font-size: 24px;
  font-weight: bold;
  color: #4CAF50;
}

.original-price {
  font-size: 14px;
  color: #999;
  text-decoration: line-through;
}

.savings {
  color: #e74c3c;
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 15px;
}

.plan-features ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.plan-features li {
  padding: 5px 0;
  color: #666;
  font-size: 14px;
  position: relative;
  padding-left: 20px;
}

.plan-features li::before {
  content: "✓";
  position: absolute;
  left: 0;
  color: #4CAF50;
  font-weight: bold;
}

.selected-plan-info {
  background-color: #f8fff8;
  border: 1px solid #4CAF50;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
  text-align: center;
}

.selected-plan-info h4 {
  margin: 0 0 10px 0;
  color: #4CAF50;
}

.selected-plan-info p {
  margin: 5px 0;
  color: #666;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: background-color 0.3s ease;
}

.btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #4CAF50;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #45a049;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #5a6268;
}

.debug-info {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 5px;
  padding: 15px;
  margin-bottom: 20px;
  color: #6c757d;
  font-size: 14px;
}

.debug-info p {
  margin: 5px 0;
}

.limits-controls {
  display: flex;
  justify-content: space-around;
  margin-bottom: 30px;
  padding: 15px;
  background-color: #f0f0f0;
  border-radius: 8px;
}

.limit-item {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #333;
  font-size: 16px;
  font-weight: bold;
}

.limit-btn {
  background-color: #eee;
  border: 1px solid #ccc;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.limit-btn:hover:not(:disabled) {
  background-color: #ddd;
}

.limit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.limit-value {
  font-weight: bold;
  color: #4CAF50;
}

@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    margin: 10px;
  }
  
  .modal-header,
  .modal-body {
    padding: 15px;
  }
  
  .plans-grid {
    grid-template-columns: 1fr;
  }
  
  .modal-actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
}
</style> 