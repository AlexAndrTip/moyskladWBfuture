<template>
  <div class="tovary-page-container">
    <h2>Карточки Товаров WB</h2>

    <DemoBlock>
      <IntegrationSelector
        :loading-integrations="loadingIntegrations"
        :integrations-error="integrationsError"
        :integration-links="integrationLinks"
        v-model:selected-integration-id="selectedIntegrationId"
        @integration-change="onIntegrationChange"
      />

    <div v-if="selectedIntegrationId && !loadingIntegrations && (selectedIntegrationId === 'all' || !tokenChecking)">


      <BulkActionsBar
        v-if="products.length > 0 && hasSelectedProducts"
        :products-count="getSelectedProductsCount"
        :selected-all-pages="selectedAllPages"
        :total-products="totalProducts"
        @open-bulk-edit-modal="openBulkEditModal"
      />

      <!-- Форма поиска и фильтров -->
      <form class="search-filter-form" @submit.prevent>
        <input
          v-model="searchTerm"
          type="text"
          placeholder="Поиск по названию, артикулу..."
          class="search-input"
          @input="debouncedSearch"
        />
        <select v-model="msFilter" @change="onMsFilterChange" class="ms-filter-select">
          <option value="">Все товары</option>
          <option value="exists">Есть в МС</option>
          <option value="not_exists">Нет в МС</option>
        </select>
        <select v-model="complectFilter" @change="onComplectFilterChange" class="complect-filter-select">
          <option value="">Все товары</option>
          <option value="true">Комплекты</option>
          <option value="false">Не комплекты</option>
        </select>
        <button type="button" class="reset-btn" @click="resetFilters">Сбросить</button>
      </form>

      <SelectionControls
        v-if="selectedIntegrationId === 'all' || !tokenError"
        :products-count-on-page="products.length"
        :are-all-products-selected-on-page="areAllProductsSelectedOnPage"
        :total-pages="totalPages"
        :selected-all-pages="selectedAllPages"
        :total-products="totalProducts"
        @select-all-pages="selectAllProductsOnAllPages"
        @clear-all-selection="clearAllPageSelection"
      />

      <IndividualActionStatus
        v-if="selectedIntegrationId === 'all' || !tokenError"
        :message="individualActionMessage"
        :type="individualActionMessageType"
        :ms-href="individualActionMsHref"
        @clear="clearIndividualActionMessage"
      />

      <div v-if="(products.length || productsLoading) && (selectedIntegrationId === 'all' || !tokenError)" class="products-header">
        <h3>Список товаров:</h3>
        <button v-if="selectedIntegrationId !== 'all'" @click="triggerManualSync" :disabled="syncInProgress" class="refresh-button inline-refresh">
          <i :class="syncInProgress ? 'fas fa-sync fa-spin' : 'fas fa-sync-alt'"></i>
        </button>
      </div>
      <p v-if="productsLoading" class="loading-message">Загрузка товаров...</p>
      <p v-if="productsError" class="error-message">{{ productsError }}</p>

      <!-- Ошибка токена -->
      <div v-if="selectedIntegrationId !== 'all' && tokenError" class="token-error-container">
        <div class="token-error-content">
          <div class="token-error-icon">⚠️</div>
          <div class="token-error-message">
            <h4>Ошибка проверки токена WB</h4>
            <p>{{ tokenError.message }}</p>
            <div class="token-error-actions">
              <button @click="checkToken(selectedIntegrationId)" :disabled="tokenChecking" class="token-error-btn">
                {{ tokenChecking ? 'Проверка...' : 'Проверить токен' }}
              </button>
              <router-link to="/dashboard/wb-kabinety" class="token-error-link">
                Перейти к настройкам WB кабинетов
              </router-link>
            </div>
          </div>
        </div>
      </div>

      <!-- Проверка токена -->
      <div v-if="selectedIntegrationId !== 'all' && tokenChecking" class="token-checking-container">
        <div class="token-checking-content">
          <div class="token-checking-spinner"></div>
          <p>Проверка токена WB API...</p>
        </div>
      </div>

      <PaginationControls
        v-if="totalPages > 1 && (selectedIntegrationId === 'all' || !tokenError)"
        :current-page="currentPage"
        :total-pages="totalPages"
        :selected-all-pages="selectedAllPages"
        v-model:products-per-page="productsPerPage"
        v-model:page-input="pageInput"
        @change-page="changePage"
        @go-to-page="goToPage"
        @update:products-per-page="onProductsPerPageChange"
        :is-top="true"
        :is-page-loading="isPageLoading(currentPage)"
      />

      <div v-if="products.length > 0 && (selectedIntegrationId === 'all' || !tokenError)" class="products-list">
        <!-- Индикатор загрузки при смене страницы -->
        <div v-if="isPageLoading(currentPage)" class="page-loading-overlay">
          <div class="loading-content">
            <div class="loading-spinner large"></div>
            <p class="loading-message">Загрузка страницы {{ currentPage }}...</p>
          </div>
        </div>

        <div class="product-item header">
          <input type="checkbox" :checked="selectedAllPages || areAllProductsSelectedOnPage" @change="toggleSelectAllProducts" />
          <div class="header-image">Фото</div>
          <div class="header-info">Название / Артикул WB / Артикул продавца</div>
          <div class="header-sizes">Размеры</div>
          <div class="header-complect">Комплект</div>
          <div class="header-actions">Действия</div>
        </div>
        <ProductListItem
          v-for="product in products"
          :key="product.nmID"
          :product="product"
          :is-selected="selectedAllPages || selectedProductIds.includes(product._id)"
          :is-action-in-progress="isActionInProgress"
          :show-integration-info="selectedIntegrationId === 'all'"
          :integration-links="integrationLinks"
          @toggle-complect="handleToggleComplectFromChild" @toggle-select="onIndividualCheckboxChange"
          @create-in-ms="createInMs"
          @create-variants="createVariants"
          @link-to-product="linkToProduct"
          @unlink-product="unlinkProduct"
          @open-image-modal="openImageModal"
        />
      </div>
      <p v-else-if="!productsLoading && !productsError && (selectedIntegrationId === 'all' || !tokenError) && !products.length && searchTerm">Нет товаров, соответствующих вашему поиску.</p>
      <p v-else-if="!productsLoading && !productsError && (selectedIntegrationId === 'all' || !tokenError) && !products.length">Нет товаров для этой интеграции.</p>

      <PaginationControls
        v-if="totalPages > 1 && (selectedIntegrationId === 'all' || !tokenError)"
        :current-page="currentPage"
        :total-pages="totalPages"
        :selected-all-pages="selectedAllPages"
        v-model:products-per-page="productsPerPage"
        v-model:page-input="pageInput"
        @change-page="changePage"
        @go-to-page="goToPage"
        @update:products-per-page="onProductsPerPageChange"
        :is-top="false"
        :is-page-loading="isPageLoading(currentPage)"
      />
    </div>

    <BulkEditModal
      :is-open="isBulkEditModalOpen"
      :selected-product-count="getSelectedProductsCount"
      :selected-all-pages="selectedAllPages"
      :total-products="totalProducts"
      :bulk-action-in-progress="bulkActionInProgress"
      @close="closeBulkEditModal"
      @bulk-create-in-ms="bulkCreateInMs"
      @bulk-create-variants="bulkCreateVariants"
      @bulk-unlink-products="bulkUnlinkProducts"
    />

    <LinkToProductModal
      :is-open="isLinkToProductModalOpen"
      :integration-link-id="currentWbProductForLinking?.integrationLink || selectedIntegrationId"
      :get-token="getToken"
      :wb-product="currentWbProductForLinking"
      @close="closeLinkToProductModal"
      @product-linked="handleProductLinked"
    />

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
import { computed, watch, ref } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

// Импорт компонентов
import IntegrationSelector from './components/IntegrationSelector.vue';
import BulkActionsBar from './components/BulkActionsBar.vue';
import SelectionControls from './components/SelectionControls.vue';
import IndividualActionStatus from './components/IndividualActionStatus.vue';
import SearchBar from './components/SearchBar.vue';
import PaginationControls from './components/PaginationControls.vue';
import ProductListItem from './components/ProductListItem.vue';
import BulkEditModal from './modals/BulkEditModal.vue';
import LinkToProductModal from './modals/LinkToProductModal.vue'; // Импортируем модалку
import ImageModal from './components/ImageModal.vue'; // Импортируем модалку для изображений
import DemoBlock from '../../components/DemoBlock.vue';

// Импорт Composables
import { useIntegrationLinks } from './composables/useIntegrationLinks.js';
import { useProductsOptimized } from './composables/useProductsOptimized.js';
import { useProductActions } from './composables/useProductActions.js';
import { useBulkActions } from './composables/useBulkActions.js';
import { useSelectionOptimized } from './composables/useSelectionOptimized.js';
import { useTokenCheck } from './composables/useTokenCheck.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const router = useRouter();

const getToken = () => localStorage.getItem('token');
const msFilter = ref(''); // '', 'exists', 'not_exists'
const complectFilter = ref(''); // '', 'true', 'false'

// Состояние для модального окна изображений
const isImageModalOpen = ref(false);
const currentImageData = ref({ imageUrl: '', productTitle: '' });

const onMsFilterChange = () => {
  fetchProducts(); // просто перезапускаем запрос с текущими фильтрами
};

const onComplectFilterChange = () => {
  fetchProducts(); // просто перезапускаем запрос с текущими фильтрами
};

const resetFilters = () => {
  searchTerm.value = '';
  msFilter.value = '';
  complectFilter.value = '';
  fetchProducts();
};

// Функции для работы с модальным окном изображений
const openImageModal = (imageData) => {
  currentImageData.value = imageData;
  isImageModalOpen.value = true;
};

const closeImageModal = () => {
  isImageModalOpen.value = false;
  currentImageData.value = { imageUrl: '', productTitle: '' };
};

// Использование composables
const {
  integrationLinks,
  loadingIntegrations,
  integrationsError,
  selectedIntegrationId,
} = useIntegrationLinks(getToken);

// Проверка токена
const {
  tokenValid,
  tokenChecking,
  tokenError,
  checkToken,
  resetTokenCheck
} = useTokenCheck(getToken);

const {
  products,
  productsLoading,
  productsError,
  currentPage,
  totalPages,
  totalProducts,
  productsPerPage,
  pageInput,
  searchTerm,
  fetchProducts,
  changePage,
  onProductsPerPageChange,
  goToPage,
  quickGoToPage,
  debouncedSearch,
  clearSearch,
  isPageLoading,
  getAllProductsForBulkActions,
} = useProductsOptimized(selectedIntegrationId, getToken, msFilter, complectFilter);


const {
  selectedProductIds,
  selectedAllPages,
  areAllProductsSelectedOnPage,
  toggleSelectAllProducts,
  onIndividualCheckboxChange,
  selectAllProductsOnAllPages,
  clearAllPageSelection,
  resetSelection,
  getAllSelectedProducts,
  getSelectedProductsCount,
  hasSelectedProducts,
  executeBulkAction,
  bulkActionInProgress,
} = useSelectionOptimized(products, totalPages, totalProducts, currentPage, getAllProductsForBulkActions);


// Вспомогательная функция для обновления продукта в списке после индивидуального действия
const updateProductInList = (productId, callback) => {
  const index = products.value.findIndex(p => p._id === productId);
  if (index !== -1) {
    const updatedProduct = { ...products.value[index] };
    callback(updatedProduct);
    products.value[index] = updatedProduct;
  }
};

const {
  individualActionMessage,
  individualActionMessageType,
  individualActionMsHref,
  pendingActions,
  isActionInProgress,
  clearIndividualActionMessage,
  createInMs,
  createVariants,
  linkToProduct,
  unlinkProduct,
  toggleComplect,
  // НОВЫЕ СОСТОЯНИЯ И ФУНКЦИИ ИЗ useProductActions для модалки связывания
  isLinkToProductModalOpen,
  currentWbProductForLinking,
  handleProductLinked,
  closeLinkToProductModal,
} = useProductActions(getToken, selectedIntegrationId, updateProductInList, products);


const {
  isBulkEditModalOpen,
  openBulkEditModal,
  closeBulkEditModal,
  bulkCreateInMs,
  bulkCreateVariants,
  bulkUnlinkProducts,
} = useBulkActions(getToken, selectedIntegrationId, getAllSelectedProducts, fetchProducts);


// --- НОВАЯ ФУНКЦИЯ ДЛЯ ОБРАБОТКИ СОБЫТИЯ ОТ ProductListItem ---
const handleToggleComplectFromChild = (productId, complectValue) => {
  console.log('TovaryPage: Получено событие toggle-complect от ProductListItem.');
  console.log('productId:', productId, 'complectValue:', complectValue);
  toggleComplect(productId, complectValue); // Вызываем функцию из composable
};


// --- КОД ДЛЯ КНОПКИ "ОБНОВИТЬ" ---
const syncInProgress = ref(false);

const triggerManualSync = async () => {
  if (!selectedIntegrationId.value) {
    alert('Пожалуйста, выберите интеграцию для синхронизации.');
    return;
  }

  // Проверяем токен перед синхронизацией
  await checkToken(selectedIntegrationId.value);
  if (!tokenValid.value) {
    alert('Ошибка проверки токена WB, синхронизация невозможна. Пожалуйста, обновите токен в настройках WB кабинетов.');
    return;
  }

  syncInProgress.value = true;
  individualActionMessage.value = 'Запущена синхронизация товаров с Wildberries... Это может занять некоторое время.';
  individualActionMessageType.value = 'info';
  individualActionMsHref.value = '';

  try {
    const response = await axios.post(`${API_BASE_URL}/products/sync-now`, {
      integrationLinkId: selectedIntegrationId.value
    }, {
      headers: { Authorization: `Bearer ${getToken()}` },
      timeout: 300000 // 5 минут таймаут для синхронизации
    });

    individualActionMessage.value = `Синхронизация завершена: ${response.data.message}`;
    individualActionMessageType.value = 'success';
    console.log('Результаты ручной синхронизации:', response.data.details);

    // Обновляем список товаров после синхронизации
    await fetchProducts();
  } catch (error) {
    console.error('Ошибка ручной синхронизации:', error);
    
    // Проверяем, является ли это ошибкой авторизации пользователя
    if (error.response?.status === 401) {
      individualActionMessage.value = 'Ошибка авторизации. Пожалуйста, войдите в систему заново.';
    } else {
      individualActionMessage.value = `Ошибка синхронизации: ${error.response?.data?.message || error.message}`;
    }
    individualActionMessageType.value = 'error';
  } finally {
    syncInProgress.value = false;
  }
};
// --- КОНЕЦ КОДА КНОПКИ ---


// Обработчики, которые координируют работу composables
const onIntegrationChange = async () => {
  if (selectedIntegrationId.value) {
    if (selectedIntegrationId.value === 'all') {
      // Для "Все интеграции" не проверяем токен, сразу загружаем товары
      currentPage.value = 1;
      searchTerm.value = '';
      resetSelection(); // Сброс выбора при смене интеграции
      resetTokenCheck(); // Сбрасываем проверку токена
      fetchProducts();
    } else {
      // Для конкретной интеграции проверяем токен
      await checkToken(selectedIntegrationId.value);
      // Затем загружаем товары только если токен валиден
      if (tokenValid.value) {
        currentPage.value = 1;
        searchTerm.value = '';
        resetSelection(); // Сброс выбора при смене интеграции
        fetchProducts();
      }
    }
  } else {
    resetTokenCheck();
  }
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
</script>

<style scoped>
/* Общие стили для страницы */
.tovary-page-container {
  padding: 25px;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  min-height: 400px;
  text-align: left;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

h2 {
  color: #1976d2;
  margin-bottom: 30px;
  text-align: center;
  font-size: 2.2em;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(25, 118, 210, 0.2);
  background: linear-gradient(135deg, #1976d2 0%, #42a5f5 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

h3 {
  margin-bottom: 15px;
  color: #1976d2;
  font-size: 1.3em;
  font-weight: 600;
}

.loading-message, .error-message {
  text-align: center;
  margin-top: 20px;
  padding: 15px 20px;
  border-radius: 8px;
  font-weight: 500;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.loading-message {
  color: #1976d2;
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border: 1px solid #90caf9;
}

.error-message {
  color: #dc3545;
  font-weight: bold;
  background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
  border: 1px solid #f44336;
}

.products-list {
  margin-top: 20px;
  border: 1px solid #dee2e6;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background: white;
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

.page-loading-overlay .loading-spinner.large {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Красивые стили для формы поиска и фильтров */
.search-filter-form {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  border: 1px solid #dee2e6;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.search-input,
.ms-filter-select,
.complect-filter-select {
  padding: 10px 15px;
  border: 1px solid #ced4da;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s ease;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.search-input:focus,
.ms-filter-select:focus,
.complect-filter-select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
  transform: translateY(-1px);
}

.search-input {
  min-width: 250px;
  flex: 1;
}

.ms-filter-select,
.complect-filter-select {
  min-width: 160px;
}

.reset-btn {
  background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(108, 117, 125, 0.3);
}

.reset-btn:hover {
  background: linear-gradient(135deg, #5a6268 0%, #495057 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(108, 117, 125, 0.4);
}

/* Красивые стили для заголовка списка товаров */
.products-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 20px 0 15px;
  padding: 15px 20px;
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border-radius: 10px;
  border: 1px solid #90caf9;
  box-shadow: 0 2px 6px rgba(33, 150, 243, 0.2);
}

.products-header h3 {
  margin: 0;
  color: #1976d2;
  font-weight: 600;
}

.inline-refresh {
  background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
  border: none;
  cursor: pointer;
  font-size: 18px;
  padding: 8px 12px;
  color: white;
  border-radius: 8px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 123, 255, 0.3);
}

.inline-refresh:hover:not(:disabled) {
  background: linear-gradient(135deg, #0056b3 0%, #004085 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 123, 255, 0.4);
}

.inline-refresh:disabled {
  background: #cccccc;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.product-item.header {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  font-weight: bold;
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 15px 20px;
  border-bottom: 2px solid #dee2e6;
  display: grid; /* Важно, чтобы тут был grid, т.к. он задается в ProductListItem */
  grid-template-columns: 40px 80px 3fr 2fr 1fr 3fr; /* 6 колонок для страницы товаров */
  gap: 15px;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-radius: 8px 8px 0 0;
}

/* Удален .header-controls, так как кнопка перемещена */
/* .header-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
} */

/* Стили для кнопки "Обновить" (только иконка) */
.refresh-button {
  background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
  color: white;
  padding: 12px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.2em;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 123, 255, 0.3);
}

.refresh-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #0056b3 0%, #004085 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 123, 255, 0.4);
}

.refresh-button:disabled {
  background: #cccccc;
  cursor: not-allowed;
  opacity: 0.8;
  transform: none;
  box-shadow: none;
}



.products-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 20px 0 10px;
}

.products-header h3 {
  margin: 0;
}

.inline-refresh {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  padding: 4px 8px;
  color: #333;
}


/* Адаптивность */
@media (max-width: 768px) {
  .tovary-page-container {
    padding: 15px;
    border-radius: 12px;
  }
  
  .product-item.header {
    grid-template-columns: 40px 60px 1fr;
    padding: 12px 15px;
  }
  
  .product-item.header .header-sizes,
  .product-item.header .header-actions {
    display: none;
  }
  
  /* Адаптивность для формы фильтров */
  .search-filter-form {
    flex-direction: column;
    align-items: stretch;
    padding: 15px;
    gap: 12px;
  }
  
  .search-input, .ms-filter-select, .complect-filter-select {
    width: 100%;
    min-width: auto;
  }
  
  .bulk-actions-bar {
    width: 100%;
    justify-content: center;
  }
  
  .products-header {
    padding: 12px 15px;
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }
  
  h2 {
    font-size: 1.8em;
    margin-bottom: 20px;
  }
}

/* Стили для ошибки токена */
.token-error-container {
  background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
  border: 2px solid #ffc107;
  border-radius: 12px;
  padding: 20px;
  margin: 20px 0;
  box-shadow: 0 4px 12px rgba(255, 193, 7, 0.2);
}

.token-error-content {
  display: flex;
  align-items: flex-start;
  gap: 15px;
}

.token-error-icon {
  font-size: 24px;
  flex-shrink: 0;
  margin-top: 2px;
}

.token-error-message h4 {
  color: #856404;
  margin: 0 0 10px 0;
  font-size: 18px;
  font-weight: 600;
}

.token-error-message p {
  color: #856404;
  margin: 0 0 15px 0;
  line-height: 1.5;
  font-size: 14px;
}

.token-error-actions {
  margin-top: 15px;
}

.token-error-btn {
  background-color: #007bff;
  color: white;
  padding: 8px 15px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.3s ease;
  margin-right: 10px;
  white-space: nowrap;
}

.token-error-btn:hover:not(:disabled) {
  background-color: #0056b3;
}

.token-error-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
  opacity: 0.8;
}

.token-error-link {
  display: inline-block;
  background-color: #ffc107;
  color: #212529;
  padding: 10px 20px;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s ease;
  border: 1px solid #e0a800;
}

.token-error-link:hover {
  background-color: #e0a800;
  color: #212529;
  text-decoration: none;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(255, 193, 7, 0.3);
}

/* Стили для контейнера проверки токена */
.token-checking-container {
  text-align: center;
  margin-top: 20px;
  color: #555;
}

.token-checking-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.token-checking-spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: #007bff; /* Синий цвет для спиннера */
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Стили для формы поиска и фильтров */
.search-filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 18px;
}

.search-input, .ms-filter-select, .complect-filter-select {
  padding: 7px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

.search-input {
  min-width: 200px;
}

.ms-filter-select, .complect-filter-select {
  min-width: 140px;
}

.reset-btn {
  background: #e0e0e0;
  color: #333;
  padding: 7px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.reset-btn:hover {
  background: #bdbdbd;
}
</style>
