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
          <select v-model="complectFilter" @change="onComplectFilterChange" class="complect-filter">
            <option value="">Все товары</option>
            <option value="true">Комплекты</option>
            <option value="false">Не комплекты</option>
          </select>
          <button type="button" class="reset-btn" @click="resetFilters">Сбросить</button>
        </form>

        <!-- Заголовок таблицы -->
        <div class="product-item header">
          <div>Выбрать</div>
          <div class="header-image">Фото</div>
          <div>Информация</div>
          <div>Баркод</div>
          <div>Комплект</div>
          <div>Цены</div>
          <div>Остатки</div>
        </div>

        <!-- Список товаров -->
        <div v-if="loadingProducts" class="loading-section">
          <p class="loading-message">Загрузка товаров...</p>
          <div class="loading-spinner"></div>
        </div>

        <div v-else-if="products.length === 0" class="no-products-message">
          <p>Товары не найдены</p>
        </div>

        <div v-else class="products-list">
          <ProductListItem
            v-for="product in products"
            :key="product.nmID"
            :product="product"
            :is-selected="false"
            :is-action-in-progress="isActionInProgress"
            :show-integration-info="selectedIntegrationId === 'all'"
            :integration-links="integrationLinks"
            :show-actions="false"
            @open-image-modal="openImageModal"
            @toggle-complect="() => {}"
            @toggle-select="() => {}"
            @create-in-ms="() => {}"
            @create-variants="() => {}"
            @link-to-product="() => {}"
            @unlink-product="() => {}"
          />
        </div>

        <!-- Пагинация -->
        <div v-if="totalPages > 1" class="pagination-section">
          <div class="pagination-info">
            Страница {{ currentPage }} из {{ totalPages }} (всего товаров: {{ totalProducts }})
          </div>
          <div class="pagination-controls">
            <button 
              @click="changePage(currentPage - 1)" 
              :disabled="currentPage === 1"
              class="pagination-btn"
            >
              Предыдущая
            </button>
            <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
            <button 
              @click="changePage(currentPage + 1)" 
              :disabled="currentPage === totalPages"
              class="pagination-btn"
            >
              Следующая
            </button>
          </div>
        </div>
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
import { useProducts } from '../TovaryPage/composables/useProducts.js';
import IntegrationSelector from '../TovaryPage/components/IntegrationSelector.vue';
import ProductListItem from '../TovaryPage/components/ProductListItem.vue';
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
const complectFilter = ref(''); // '', 'true', 'false'

// Состояние для товаров (будет синхронизировано с composable)
const products = ref([]);
const loadingProducts = ref(false);
const productsError = ref('');
const totalProducts = ref(0);
const totalPages = ref(1);
const currentPage = ref(1);
const tokenError = ref('');

// Использование composable для товаров
const {
  products: productsFromComposable,
  loadingProducts: loadingProductsFromComposable,
  productsError: productsErrorFromComposable,
  totalProducts: totalProductsFromComposable,
  totalPages: totalPagesFromComposable,
  currentPage: currentPageFromComposable,
  fetchProducts: fetchProductsFromComposable,
} = useProducts(selectedIntegrationId, getToken, searchTerm, msFilter, complectFilter);

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

// Функция для загрузки товаров
const fetchProducts = async () => {
  await fetchProductsFromComposable();
};

// Обработчики
const onIntegrationChange = () => {
  // Сброс фильтров при смене интеграции
  searchTerm.value = '';
  msFilter.value = '';
  complectFilter.value = '';
  // Сброс страницы
  currentPage.value = 1;
  // Загрузка товаров будет выполнена автоматически через composable
};

const onMsFilterChange = () => {
  // Сброс страницы при изменении фильтра
  currentPage.value = 1;
  // Фильтрация будет выполнена автоматически через composable
};

const onComplectFilterChange = () => {
  // Сброс страницы при изменении фильтра
  currentPage.value = 1;
  // Фильтрация будет выполнена автоматически через composable
};

const onSearchChange = () => {
  // Сброс страницы при изменении поиска
  currentPage.value = 1;
  // Поиск будет выполнен автоматически через composable
};

const resetFilters = () => {
  searchTerm.value = '';
  msFilter.value = '';
  complectFilter.value = '';
  // Сброс страницы
  currentPage.value = 1;
  // Сброс будет выполнен автоматически через composable
};

const changePage = (page) => {
  // Пагинация будет выполнена автоматически через composable
  // Нужно обновить currentPage в composable
  if (page >= 1 && page <= totalPages.value) {
    // Обновляем страницу в composable
    currentPageFromComposable.value = page;
  }
};

const resetSelection = () => {
  // В этой странице нет выбора товаров, но функция нужна для совместимости
};

// Функция-заглушка для isActionInProgress
const isActionInProgress = () => false;

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

/* Форма поиска и фильтров */
.search-filter-form {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  align-items: center;
}

.search-input,
.ms-filter,
.complect-filter {
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
  grid-template-columns: 60px 80px 3fr 2fr 1fr 2fr 2fr;
  gap: 15px;
  align-items: center;
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

/* Пагинация */
.pagination-section {
  margin-top: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
}

.pagination-info {
  color: #666;
  font-size: 14px;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pagination-btn {
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.pagination-btn:hover:not(:disabled) {
  background-color: #0056b3;
}

.pagination-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.page-info {
  font-weight: bold;
  color: #333;
}

/* Адаптивность */
@media (max-width: 768px) {
  .search-filter-form {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-input,
  .ms-filter,
  .complect-filter {
    min-width: auto;
  }
  
  .product-item.header {
    grid-template-columns: 60px 80px 1fr;
    font-size: 12px;
  }
  
  .pagination-section {
    flex-direction: column;
    text-align: center;
  }
}
</style> 