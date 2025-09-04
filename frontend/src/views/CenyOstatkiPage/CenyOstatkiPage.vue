<template>
  <div class="ceny-ostatki-page-container">
    <h2>Цены и остатки товаров</h2>

    <DemoBlock>
      <!-- Селектор интеграций -->
      <IntegrationSelector
        :loading-integrations="loadingIntegrations"
        :integrations-error="integrationsError"
        :integration-links="integrationLinks"
        :selected-integration-id="selectedIntegrationId"
        @update:selected-integration-id="(value) => selectedIntegrationId = value"
        @integration-change="onIntegrationChange"
      />

      <!-- Сообщения об ошибках -->
      <p v-if="tokenError" class="error-message">{{ tokenError }}</p>
      <p v-if="productsError" class="error-message">{{ productsError }}</p>

      <!-- Основной контент -->
      <div v-if="selectedIntegrationId && !loadingIntegrations && !tokenError" class="products-section">
        <!-- Форма поиска и фильтров -->
        <form class="search-filter-form" @submit.prevent>
          <input
            v-model="searchTerm"
            type="text"
            placeholder="Поиск по названию или артикулу"
            class="search-input"
            @input="onSearchChange"
          />
          <select v-model="msFilter" @change="onMsFilterChange" class="ms-filter">
            <option value="">Все товары</option>
            <option value="exists">Выгружены в МС</option>
            <option value="not_exists">Не выгружены в МС</option>
          </select>

          <button type="button" class="reset-btn" @click="resetFilters">Сбросить</button>
        </form>

        <!-- Верхняя пагинация -->
        <PaginationControls
          v-if="totalPages > 1"
          :current-page="currentPage"
          :total-pages="totalPages"
          :selected-all-pages="false"
          v-model:products-per-page="productsPerPage"
          v-model:page-input="pageInput"
          @change-page="changePage"
          @go-to-page="goToPage"
          @update:products-per-page="onProductsPerPageChange"
          :is-top="true"
        />

        <!-- Индикатор прогресса для больших списков -->
        <div v-if="totalPages > 100" class="progress-indicator">
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: `${(currentPage / totalPages) * 100}%` }"
            ></div>
          </div>
          <p class="progress-text">
            Страница {{ currentPage }} из {{ totalPages }} ({{ Math.round((currentPage / totalPages) * 100) }}%)
          </p>
        </div>

        <!-- Заголовок таблицы -->
        <div class="product-item header no-actions">
          <div class="header-image">Фото</div>
          <div>Информация</div>
          <div>Размеры</div>
          <div>Баркоды</div>
          <div>Цены</div>
          <div>Остатки</div>
        </div>

        <!-- Список товаров -->
        <div v-if="loadingProducts && products.length === 0" class="loading-section">
          <p class="loading-message">Загрузка товаров...</p>
          <div class="loading-spinner"></div>
        </div>

        <div v-else-if="products.length === 0" class="no-products-message">
          <p>Товары не найдены</p>
        </div>

        <div v-else class="products-list">
          <!-- Индикатор загрузки при смене страницы -->
          <div v-if="isPageLoading(currentPage)" class="page-loading-overlay">
            <div class="loading-content">
              <div class="loading-spinner large"></div>
              <p class="loading-message">Загрузка страницы {{ currentPage }}...</p>
            </div>
          </div>
          
          <ProductListItemCenyOstatki
            v-for="product in products"
            :key="product.nmID"
            :product="product"
            :show-integration-info="selectedIntegrationId === 'all'"
            :integration-links="integrationLinks"
            @open-image-modal="openImageModal"
          />
        </div>

        <!-- Индикатор загрузки для текущей страницы -->
        <div v-if="isPageLoading(currentPage)" class="page-loading-indicator">
          <div class="loading-content">
            <div class="loading-spinner large"></div>
            <p class="loading-message">Загрузка страницы {{ currentPage }}...</p>
            <p class="loading-subtitle">Пожалуйста, подождите</p>
          </div>
        </div>

        <!-- Нижняя пагинация -->
        <PaginationControls
          v-if="totalPages > 1"
          :current-page="currentPage"
          :total-pages="totalPages"
          :selected-all-pages="false"
          v-model:products-per-page="productsPerPage"
          v-model:page-input="pageInput"
          @change-page="changePage"
          @go-to-page="goToPage"
          @update:products-per-page="onProductsPerPageChange"
          :is-top="false"
        />
      </div>

      <!-- Модальное окно для изображений -->
      <ImageModal
        :is-open="isImageModalOpen"
        :image-url="currentImageData.imageUrl"
        :product-title="currentImageData.productTitle"
        @close="closeImageModal"
      />
    </DemoBlock>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import axios from 'axios';
import { useIntegrationLinks } from '../TovaryPage/composables/useIntegrationLinks.js';
import { useProductsForCenyOstatki } from './composables/useProductsForCenyOstatki.js';
import IntegrationSelector from '../TovaryPage/components/IntegrationSelector.vue';
import ProductListItemCenyOstatki from './components/ProductListItemCenyOstatki.vue';
import PaginationControls from '../TovaryPage/components/PaginationControls.vue';
import ImageModal from '../TovaryPage/components/ImageModal.vue';
import DemoBlock from '../../components/DemoBlock.vue';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Состояние для модального окна изображений
const isImageModalOpen = ref(false);
const currentImageData = ref({ imageUrl: '', productTitle: '' });

// Функции для работы с модальным окном изображений
const openImageModal = (imageData) => {
  currentImageData.value = imageData;
  isImageModalOpen.value = true;
};

const closeImageModal = () => {
  isImageModalOpen.value = false;
  currentImageData.value = { imageUrl: '', productTitle: '' };
};

// Получение токена
const getToken = () => localStorage.getItem('token');

// Использование composables
const {
  integrationLinks,
  loadingIntegrations,
  integrationsError,
  selectedIntegrationId,
} = useIntegrationLinks(getToken);

// Состояние для фильтров
const searchTerm = ref('');
const msFilter = ref(''); // '', 'exists', 'not_exists'

// Состояние для товаров (будет синхронизировано с composable)
const products = ref([]);
const loadingProducts = ref(false);
const productsError = ref('');
const totalProducts = ref(0);
const totalPages = ref(1);
const currentPage = ref(1);
const productsPerPage = ref(20);
const pageInput = ref(1);
const tokenError = ref('');

// Использование composable для товаров
const {
  products: productsFromComposable,
  productsLoading: loadingProductsFromComposable,
  productsError: productsErrorFromComposable,
  totalProducts: totalProductsFromComposable,
  totalPages: totalPagesFromComposable,
  currentPage: currentPageFromComposable,
  productsPerPage: productsPerPageFromComposable,
  pageInput: pageInputFromComposable,
  fetchProducts: fetchProductsFromComposable,
  changePage: changePageFromComposable,
  onProductsPerPageChange: onProductsPerPageChangeFromComposable,
  goToPage: goToPageFromComposable,
  debouncedSearch: debouncedSearchFromComposable,
  clearSearch: clearSearchFromComposable,
  isPageLoading: isPageLoadingFromComposable,
  isPageLoaded: isPageLoadedFromComposable,
  clearCache: clearCacheFromComposable,
} = useProductsForCenyOstatki(selectedIntegrationId, getToken, msFilter, searchTerm);

// Синхронизируем состояние с composable
watch(productsFromComposable, (newProducts) => {
  products.value = newProducts;
});

watch(loadingProductsFromComposable, (newLoading) => {
  loadingProducts.value = newLoading;
});

watch(productsErrorFromComposable, (newError) => {
  productsError.value = newError;
});

watch(totalProductsFromComposable, (newTotal) => {
  totalProducts.value = newTotal;
});

watch(totalPagesFromComposable, (newTotalPages) => {
  totalPages.value = newTotalPages;
});

watch(currentPageFromComposable, (newPage) => {
  currentPage.value = newPage;
});

watch(productsPerPageFromComposable, (newPerPage) => {
  productsPerPage.value = newPerPage;
});

watch(pageInputFromComposable, (newPageInput) => {
  pageInput.value = newPageInput;
});

// Функции для работы с кэшем и состоянием страниц
const isPageLoading = (page) => isPageLoadingFromComposable(page);
const isPageLoaded = (page) => isPageLoadedFromComposable(page);
const clearCache = () => clearCacheFromComposable();

// Функция для загрузки товаров
const fetchProducts = async () => {
  await fetchProductsFromComposable();
};

// Обработчики
const onIntegrationChange = () => {
  // Сброс фильтров при смене интеграции
  searchTerm.value = '';
  msFilter.value = '';
  // Сброс будет выполнен автоматически через composable
  clearSearchFromComposable();
};

const onMsFilterChange = () => {
  // Сброс страницы при изменении фильтра
  currentPage.value = 1;
  // Фильтрация будет выполнена автоматически через composable
  fetchProductsFromComposable();
};



const onSearchChange = () => {
  // Используем debouncedSearch из composable
  debouncedSearchFromComposable();
};

const resetFilters = () => {
  searchTerm.value = '';
  msFilter.value = '';
  // Сброс будет выполнен автоматически через composable
  clearSearchFromComposable();
};

const changePage = (page) => {
  changePageFromComposable(page);
};

const onProductsPerPageChange = (newProductsPerPage) => {
  onProductsPerPageChangeFromComposable(newProductsPerPage);
};

const goToPage = () => {
  goToPageFromComposable();
};

const resetSelection = () => {
  // В этой странице нет выбора товаров, но функция нужна для совместимости
};



// Функция для установки первой интеграции по умолчанию
const setDefaultIntegration = () => {
  if (integrationLinks.value.length > 0 && !selectedIntegrationId.value) {
    selectedIntegrationId.value = integrationLinks.value[0]._id;
  }
};

// Следим за изменением выбранной интеграции
watch(selectedIntegrationId, onIntegrationChange);

// Следим за загрузкой интеграций и устанавливаем первую по умолчанию
watch(integrationLinks, (newLinks) => {
  if (newLinks.length > 0 && !selectedIntegrationId.value) {
    setDefaultIntegration();
  }
}, { immediate: true });

onMounted(() => {
  // Composable сам загрузит товары при изменении selectedIntegrationId
});
</script>

<style scoped>
/* Общие стили для страницы */
.ceny-ostatki-page-container {
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  min-height: 400px;
  text-align: left;
}

/* Индикатор загрузки страницы */
.page-loading-indicator {
  text-align: center;
  padding: 40px 20px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  margin: 20px 0;
  border: 2px solid #dee2e6;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.page-loading-indicator::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { left: -100%; }
  100% { left: 100%; }
}

.page-loading-indicator .loading-content {
  position: relative;
  z-index: 1;
}

.page-loading-indicator .loading-message {
  margin: 0 0 8px 0;
  color: #495057;
  font-size: 18px;
  font-weight: 600;
}

.page-loading-indicator .loading-subtitle {
  margin: 0;
  color: #6c757d;
  font-size: 14px;
  font-style: italic;
}

.page-loading-indicator .loading-spinner.large {
  width: 50px;
  height: 50px;
  border-width: 4px;
  margin: 0 auto 20px auto;
  border-color: #007bff;
  border-top-color: transparent;
  animation: spin 1s linear infinite;
}

h2 {
  color: #333;
  margin-bottom: 25px;
  text-align: center;
}

h3 {
  margin-bottom: 15px;
  color: #555;
  font-size: 1.2em;
}

.loading-message, .error-message {
  text-align: center;
  margin-top: 20px;
  color: #666;
}

.error-message {
  color: #dc3545;
  font-weight: bold;
}

/* Индикатор прогресса для больших списков */
.progress-indicator {
  margin: 20px 0;
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

/* Форма поиска и фильтров */
.search-filter-form {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  align-items: center;
}

.search-input,
.ms-filter {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  min-width: 150px;
}

.search-input {
  flex: 1;
  min-width: 200px;
}

.reset-btn {
  padding: 8px 16px;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.reset-btn:hover {
  background-color: #5a6268;
}

/* Заголовок таблицы */
.product-item.header {
  background-color: #f0f2f5;
  font-weight: bold;
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 10px 20px;
  border-bottom: 2px solid #ccc;
  display: grid;
  grid-template-columns: 60px 80px 3fr 2fr 2fr 2fr;
  gap: 15px;
  align-items: center;
}

/* Специальная структура заголовка для страницы цен и остатков */
.product-item.header.no-actions {
  grid-template-columns: 80px 3fr 2fr 2fr 2fr 2fr;
  align-items: center;
  background-color: #f0f2f5;
  font-weight: bold;
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 10px 20px;
  border-bottom: 2px solid #ccc;
}

.header-image {
  text-align: center;
  font-weight: bold;
}

/* Список товаров */
.products-list {
  border: 1px solid #eee;
  border-radius: 5px;
  overflow: hidden;
  position: relative;
  transition: all 0.3s ease;
}

/* Overlay индикатор загрузки для списка товаров */
.page-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  border-radius: 5px;
  opacity: 0;
  animation: fadeIn 0.3s ease forwards;
}

@keyframes fadeIn {
  to { opacity: 1; }
}

.page-loading-overlay .loading-content {
  text-align: center;
}

.page-loading-overlay .loading-message {
  margin: 15px 0 0 0;
  color: #495057;
  font-size: 16px;
  font-weight: 500;
}

/* Загрузка */
.loading-section {
  text-align: center;
  padding: 40px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 20px auto;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.no-products-message {
  text-align: center;
  padding: 40px;
  color: #666;
  font-style: italic;
}



/* Адаптивность */
@media (max-width: 768px) {
  .search-filter-form {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-input,
  .ms-filter {
    min-width: auto;
  }
  
  .product-item.header {
    grid-template-columns: 80px 1fr;
    font-size: 12px;
  }
  
  .product-item.header.no-actions {
    grid-template-columns: 80px 1fr;
  }
}
</style> 