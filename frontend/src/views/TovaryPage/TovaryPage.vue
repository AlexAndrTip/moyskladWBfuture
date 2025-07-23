<template>
  <div class="tovary-page-container">
    <h2>Карточки Товаров WB</h2>

    <IntegrationSelector
      :loading-integrations="loadingIntegrations"
      :integrations-error="integrationsError"
      :integration-links="integrationLinks"
      v-model:selected-integration-id="selectedIntegrationId"
      @integration-change="onIntegrationChange"
    />

    <div v-if="selectedIntegrationId && !loadingIntegrations">

      <BulkActionsBar
        v-if="products.length > 0 && (selectedProductIds.length > 0 || selectedAllPages)"
        :products-count="selectedProductIds.length"
        :selected-all-pages="selectedAllPages"
        :total-products="totalProducts"
        @open-bulk-edit-modal="openBulkEditModal"
      />

      <div class="search-and-refresh-container">
        <SearchBar
          v-model:search-term="searchTerm"
          @search="debouncedSearch"
          @clear-search="clearSearch"
        />
      </div>

      <h5>Фильтр по выгрузке в МС:</h5>
      <select v-model="msFilter" @change="onMsFilterChange" class="ms-filter-select">
        <option value="">Все</option>
        <option value="exists">Есть в МС</option>
        <option value="not_exists">Нет в МС</option>
      </select>

      <SelectionControls
        :products-count-on-page="products.length"
        :are-all-products-selected-on-page="areAllProductsSelectedOnPage"
        :total-pages="totalPages"
        :selected-all-pages="selectedAllPages"
        :total-products="totalProducts"
        @select-all-pages="selectAllProductsOnAllPages"
        @clear-all-selection="clearAllPageSelection"
      />

      <IndividualActionStatus
        :message="individualActionMessage"
        :type="individualActionMessageType"
        :ms-href="individualActionMsHref"
        @clear="clearIndividualActionMessage"
      />

      <div v-if="products.length || productsLoading" class="products-header">
        <h3>Список товаров:</h3>
        <button @click="triggerManualSync" :disabled="syncInProgress" class="refresh-button inline-refresh">
          <i :class="syncInProgress ? 'fas fa-sync fa-spin' : 'fas fa-sync-alt'"></i>
        </button>
      </div>
      <p v-if="productsLoading" class="loading-message">Загрузка товаров...</p>
      <p v-if="productsError" class="error-message">{{ productsError }}</p>

      <PaginationControls
        v-if="totalPages > 1"
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

      <div v-if="products.length > 0" class="products-list">
        <div class="product-item header">
          <input type="checkbox" :checked="selectedAllPages || areAllProductsSelectedOnPage" @change="toggleSelectAllProducts" />
          <div class="header-info">Название / Артикул WB / Артикул продавца</div>
          <div class="header-sizes">Размеры</div>
          <div class="header-complect">Комплект</div> <div class="header-actions">Действия</div>
        </div>
        <ProductListItem
          v-for="product in products"
          :key="product.nmID"
          :product="product"
          :is-selected="selectedAllPages || selectedProductIds.includes(product._id)"
          :is-action-in-progress="isActionInProgress"
          @toggle-complect="handleToggleComplectFromChild" @toggle-select="onIndividualCheckboxChange"
          @create-in-ms="createInMs"
          @create-variants="createVariants"
          @link-to-product="linkToProduct"
          @unlink-product="unlinkProduct"
        />
      </div>
      <p v-else-if="!productsLoading && !productsError && !products.length && searchTerm">Нет товаров, соответствующих вашему поиску.</p>
      <p v-else-if="!productsLoading && !productsError && !products.length">Нет товаров для этой интеграции.</p>

      <PaginationControls
        v-if="totalPages > 1"
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
      :integration-link-id="selectedIntegrationId"
      :get-token="getToken"
      :wb-product="currentWbProductForLinking"
      @close="closeLinkToProductModal"
      @product-linked="handleProductLinked"
    />
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

// Импорт Composables
import { useIntegrationLinks } from './composables/useIntegrationLinks.js';
import { useProducts } from './composables/useProducts.js';
import { useProductActions } from './composables/useProductActions.js';
import { useBulkActions } from './composables/useBulkActions.js';
import { useSelection } from './composables/useSelection.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const router = useRouter();

const getToken = () => localStorage.getItem('token');
const msFilter = ref(''); // '', 'exists', 'not_exists'

const onMsFilterChange = () => {
  fetchProducts(); // просто перезапускаем запрос с текущими фильтрами
};

// Использование composables
const {
  integrationLinks,
  loadingIntegrations,
  integrationsError,
  selectedIntegrationId,
} = useIntegrationLinks(getToken);

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
} = useProducts(selectedIntegrationId, getToken, msFilter);


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
} = useProductActions(getToken, selectedIntegrationId, updateProductInList);


const {
  isBulkEditModalOpen,
  bulkActionInProgress,
  openBulkEditModal,
  closeBulkEditModal,
  bulkCreateInMs,
  bulkCreateVariants,
  bulkUnlinkProducts,
} = useBulkActions(getToken, selectedIntegrationId, selectedProductIds, selectedAllPages, totalProducts, fetchProducts);


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

    // После успешной синхронизации, обновим список товаров
    await fetchProducts();

  } catch (error) {
    individualActionMessage.value = error.response?.data?.message || 'Ошибка при синхронизации товаров.';
    individualActionMessageType.value = 'error';
    console.error('Ошибка ручной синхронизации:', error);
  } finally {
    syncInProgress.value = false;
  }
};
// --- КОНЕЦ КОДА КНОПКИ ---


// Обработчики, которые координируют работу composables
const onIntegrationChange = () => {
  currentPage.value = 1;
  searchTerm.value = '';
  resetSelection(); // Сброс выбора при смене интеграции
  fetchProducts();
};

// Вотчеры могут быть здесь, если они координируют разные composables
watch(selectedIntegrationId, (newVal, oldVal) => {
  if (newVal && newVal !== oldVal) {
    // Уже обрабатывается в useProducts, но можно добавить здесь дополнительные сбросы
    resetSelection();
  }
});
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
  grid-template-columns: 40px 3fr 2fr 1fr 3fr; /* Должен совпадать с ProductListItem, добавлено для "Комплект" */
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

/* Новый стиль для контейнера строки поиска и кнопки обновления */
.search-and-refresh-container {
  display: flex;
  gap: 10px; /* Отступ между строкой поиска и кнопкой */
  margin-bottom: 20px;
  margin-top: 10px;
  align-items: center; /* Выравнивание по центру по вертикали */
}

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

/* Изменения для SearchBar */
.search-bar {
  flex-grow: 1; /* Позволяет строке поиска занимать все доступное пространство */
  margin-bottom: 0; /* Убираем отступы, так как они теперь управляются родительским контейнером */
  margin-top: 0;
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
    grid-template-columns: 40px 1fr;
  }
  .product-item.header .header-sizes,
  .product-item.header .header-actions {
    display: none;
  }
  /* Адаптивность для нового контейнера */
  .search-and-refresh-container {
    flex-direction: column; /* Элементы в столбец на маленьких экранах */
    align-items: stretch; /* Растягивание по ширине */
  }
  .search-bar {
    width: 100%; /* Строка поиска занимает всю ширину */
  }
  .refresh-button {
    width: 100%; /* Кнопка занимает всю ширину */
  }
  .bulk-actions-bar {
    width: 100%; /* Панель массовых действий также занимает всю ширину */
    justify-content: center;
  }
}
</style>
