<template>
  <div v-if="isLoading" class="demo-block">
    <div class="demo-overlay">
      <div class="demo-content">
        <div class="loading-spinner"></div>
        <p>Загрузка информации о подписке...</p>
      </div>
    </div>
  </div>
  <div v-else-if="isDemo" class="demo-block">
    <div class="demo-overlay">
      <div class="demo-content">
        <div class="demo-icon">🔒</div>
        <h3>Функция недоступна в демо версии</h3>
        <p>Для использования этой функции необходимо обновить подписку.</p>
        <div class="demo-actions">
          <button @click="showUpgradeModal" class="upgrade-button">
            Обновить подписку
          </button>
        </div>
      </div>
    </div>
  </div>
  <div v-else>
    <slot />
  </div>
</template>

<script setup>
import { useSubscription } from '../composables/useSubscription';

const { isDemo, isLoading } = useSubscription();

const showUpgradeModal = () => {
  // Здесь можно добавить логику для показа модального окна обновления подписки
  alert('Для обновления подписки обратитесь к администратору.');
};
</script>

<style scoped>
.demo-block {
  position: relative;
  min-height: 200px;
}

.demo-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: 8px;
}

.demo-content {
  text-align: center;
  padding: 40px;
  max-width: 400px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.demo-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.demo-content h3 {
  color: #333;
  margin-bottom: 15px;
  font-size: 20px;
}

.demo-content p {
  color: #666;
  margin-bottom: 25px;
  line-height: 1.5;
}

.demo-actions {
  margin-top: 20px;
}

.upgrade-button {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.upgrade-button:hover {
  background-color: #218838;
}
</style> 