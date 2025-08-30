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
        v-if="products.length > 0 && (selectedProductIds.length > 0 || selectedAllPages)"
        :products-count="selectedProductIds.length"
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
      />

      <div v-if="products.length > 0 && (selectedIntegrationId === 'all' || !tokenError)" class="products-list">
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
      />
    </div>

    <BulkEditModal
      :is-open="isBulkEditModalOpen"
      :selected-product-count="selectedProductIds.length"
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
import DemoBlock from '../../components/DemoBlock.vue';

// Импорт Composables
import { useIntegrationLinks } from './composables/useIntegrationLinks.js';
import { useProducts } from './composables/useProducts.js';
import { useProductActions } from './composables/useProductActions.js';
import { useBulkActions } from './composables/useBulkActions.js';
import { useSelection } from './composables/useSelection.js';
import { useTokenCheck } from './composables/useTokenCheck.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const router = useRouter();

const getToken = () => localStorage.getItem('token');
const msFilter = ref(''); // '', 'exists', 'not_exists'
const complectFilter = ref(''); // '', 'true', 'false'

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
  debouncedSearch,
  clearSearch,
} = useProducts(selectedIntegrationId, getToken, msFilter, complectFilter);


const {
  selectedProductIds,
  selectedAllPages,
  areAllProductsSelectedOnPage,
  toggleSelectAllProducts,
  onIndividualCheckboxChange,
  selectAllProductsOnAllPages,
  clearAllPageSelection,
  resetSelection,
} = useSelection(products, totalPages, totalProducts, currentPage);


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
  bulkActionInProgress,
  openBulkEditModal,
  closeBulkEditModal,
  bulkCreateInMs,
  bulkCreateVariants,
  bulkUnlinkProducts,
} = useBulkActions(getToken, selectedIntegrationId, selectedProductIds, selectedAllPages, totalProducts, fetchProducts, products);


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

// Следим за изменением выбранной интеграции
watch(selectedIntegrationId, onIntegrationChange);
</script>

<style scoped>
/* Общие стили для страницы */
.tovary-page-container {
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  min-height: 400px;
  text-align: left;
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

.products-list {
  margin-top: 20px;
  border: 1px solid #eee;
  border-radius: 5px;
  overflow: hidden;
}

.product-item.header {
  background-color: #f0f2f5;
  font-weight: bold;
  position: sticky;
  top: 0;
  z-index: 10;
  padding-top: 10px;
  padding-bottom: 10px;
  border-bottom: 2px solid #ccc;
  display: grid; /* Важно, чтобы тут был grid, т.к. он задается в ProductListItem */
  grid-template-columns: 40px 80px 3fr 2fr 1fr 3fr; /* Добавляем колонку для фото */
  gap: 15px;
  align-items: center;
  padding-left: 20px;
  padding-right: 20px;
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
  background-color: #007bff; /* Синий цвет */
  color: white;
  padding: 10px; /* Равный padding для квадратной кнопки */
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1.2em; /* Увеличенный размер иконки */
  transition: background-color 0.3s ease, transform 0.1s ease;
  display: flex; /* Для центрирования иконки */
  align-items: center;
  justify-content: center;
}

.refresh-button:hover:not(:disabled) {
  background-color: #0056b3;
  transform: translateY(-1px);
}

.refresh-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
  opacity: 0.8;
  transform: none;
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
  .product-item.header {
    grid-template-columns: 40px 60px 1fr;
  }
  .product-item.header .header-sizes,
  .product-item.header .header-actions {
    display: none;
  }
  /* Адаптивность для формы фильтров */
  .search-filter-form {
    flex-direction: column; /* Элементы в столбец на маленьких экранах */
    align-items: stretch; /* Растягивание по ширине */
  }
  .search-input, .ms-filter-select, .complect-filter-select {
    width: 100%; /* Все элементы занимают всю ширину */
  }
  .bulk-actions-bar {
    width: 100%; /* Панель массовых действий также занимает всю ширину */
    justify-content: center;
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
