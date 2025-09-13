<template>
  <div class="pagination-container" :class="{'top-pagination': isTop, 'bottom-pagination': !isTop}">
    <!-- Индикатор загрузки страницы -->
    <div v-if="isPageLoading" class="page-loading-indicator">
      <div class="loading-spinner small"></div>
      <span class="loading-text">Загрузка страницы...</span>
    </div>

    <div class="pagination-main-row">
      <!-- Кнопки навигации -->
      <div class="pagination-nav">
        <button 
          @click="emit('change-page', currentPage - 1)" 
          :disabled="currentPage === 1 || selectedAllPages"
          class="pagination-btn prev-btn"
        >
          <i class="fas fa-chevron-left"></i>
          Предыдущая
        </button>
        
        <span class="page-info">Страница {{ currentPage }} из {{ totalPages }}</span>
        
        <button 
          @click="emit('change-page', currentPage + 1)" 
          :disabled="currentPage === totalPages || selectedAllPages"
          class="pagination-btn next-btn"
        >
          Следующая
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>

      <!-- Опции пагинации -->
      <div class="pagination-options">
        <div class="items-per-page">
          <label :for="`items-per-page-${isTop ? 'top' : 'bottom'}`">Товаров на странице:</label>
          <select 
            :id="`items-per-page-${isTop ? 'top' : 'bottom'}`" 
            :value="productsPerPage" 
            @change="e => emit('update:productsPerPage', Number(e.target.value))"
            class="items-select"
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>

        <div class="go-to-page">
          <label :for="`go-to-page-${isTop ? 'top' : 'bottom'}`">Перейти к странице:</label>
          <input 
            type="number" 
            :id="`go-to-page-${isTop ? 'top' : 'bottom'}`" 
            :value="pageInput" 
            @input="e => emit('update:pageInput', Number(e.target.value))" 
            @keyup.enter="emit('go-to-page')"
            :min="1" 
            :max="totalPages" 
            class="page-input"
          />
          <button @click="emit('go-to-page')" class="go-btn">Перейти</button>
        </div>
      </div>
    </div>

    <!-- Индикатор прогресса для больших списков -->
    <div v-if="totalPages > 100" class="progress-indicator">
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: `${(currentPage / totalPages) * 100}%` }"
        ></div>
      </div>
      <p class="progress-text">
        {{ Math.round((currentPage / totalPages) * 100) }}% ({{ currentPage }} из {{ totalPages }})
      </p>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

defineProps({
  currentPage: Number,
  totalPages: Number,
  selectedAllPages: Boolean,
  productsPerPage: Number,
  pageInput: Number,
  isTop: {
    type: Boolean,
    default: false,
  },
  isPageLoading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['change-page', 'update:productsPerPage', 'update:pageInput', 'go-to-page']);
</script>

<style scoped>
.pagination-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 20px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  border: 1px solid #dee2e6;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.top-pagination {
  margin-bottom: 20px;
}

.bottom-pagination {
  margin-top: 30px;
}

/* Индикатор загрузки страницы */
.page-loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px;
  background: rgba(0, 123, 255, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(0, 123, 255, 0.3);
}

.loading-spinner.small {
  width: 16px;
  height: 16px;
  border: 2px solid #e3f2fd;
  border-top: 2px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  color: #007bff;
  font-size: 14px;
  font-weight: 500;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Основная строка пагинации */
.pagination-main-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

/* Кнопки навигации */
.pagination-nav {
  display: flex;
  align-items: center;
  gap: 15px;
}

.pagination-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(0, 123, 255, 0.3);
  height: 36px;
  font-size: 14px;
}

.pagination-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #0056b3 0%, #004085 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 123, 255, 0.4);
}

.pagination-btn:disabled {
  background: #cccccc;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.page-info {
  font-size: 14px;
  color: #495057;
  font-weight: 600;
  white-space: nowrap;
  padding: 8px 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #dee2e6;
  height: 36px;
  display: flex;
  align-items: center;
  box-sizing: border-box;
}

/* Опции пагинации */
.pagination-options {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.items-per-page,
.go-to-page {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pagination-options label {
  color: #495057;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}

.items-select {
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 14px;
  background-color: white;
  cursor: pointer;
  min-width: 80px;
  height: 36px;
  transition: border-color 0.3s ease;
}

.items-select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.page-input {
  width: 70px;
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 14px;
  text-align: center;
  height: 36px;
  transition: border-color 0.3s ease;
  box-sizing: border-box;
}

.page-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.go-btn {
  background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%);
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(40, 167, 69, 0.3);
  height: 36px;
  font-size: 14px;
}

.go-btn:hover {
  background: linear-gradient(135deg, #1e7e34 0%, #155724 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(40, 167, 69, 0.4);
}

/* Индикатор прогресса для больших списков */
.progress-indicator {
  margin-top: 10px;
  padding: 15px;
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border-radius: 8px;
  border: 1px solid #90caf9;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #2196f3, #42a5f5);
  border-radius: 4px;
  transition: width 0.5s ease;
  box-shadow: 0 1px 3px rgba(33, 150, 243, 0.3);
}

.progress-text {
  margin: 0;
  text-align: center;
  color: #1976d2;
  font-weight: 500;
  font-size: 14px;
}

/* Адаптивность */
@media (max-width: 768px) {
  .pagination-container {
    padding: 15px;
  }
  
  .pagination-main-row {
    flex-direction: column;
    gap: 15px;
  }
  
  .pagination-nav {
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .pagination-options {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
  }
  
  .items-per-page,
  .go-to-page {
    justify-content: center;
  }
}
</style>
