<template>
  <div class="tovary-page-container">
    <h2>Карточки Товаров WB</h2>

    <p v-if="loadingIntegrations" class="loading-message">Загрузка интеграций...</p>
    <p v-if="integrationsError" class="error-message">{{ integrationsError }}</p>

    <div v-if="!loadingIntegrations && integrationLinks.length > 0" class="integration-selector-section">
      <h3>Выберите Интеграцию:</h3>
      <select v-model="selectedIntegrationId" @change="onIntegrationChange" class="integration-select">
        <option value="" disabled>-- Выберите связку (Кабинет - Склад) --</option>
        <option v-for="link in integrationLinks" :key="link._id" :value="link._id">
          {{ link.wbCabinet.name }} - {{ link.storage.name }}
        </option>
      </select>
    </div>
    <div v-else-if="!loadingIntegrations && !integrationsError" class="no-integrations-message">
      <p>Пожалуйста, сначала создайте интеграционные связки на странице "Интеграции".</p>
      <router-link to="/dashboard/integracii" class="link-button">Перейти к Интеграциям</router-link>
    </div>

    <div v-if="selectedIntegrationId && !loadingIntegrations">
      <div v-if="products.length > 0 && (selectedProductIds.length > 0 || selectedAllPages)" class="bulk-actions-bar">
        <button @click="openBulkEditModal" class="bulk-edit-button">
          Массовое редактирование ({{ selectedAllPages ? totalProducts : selectedProductIds.length }} {{ selectedAllPages ? 'на всех страницах' : '' }})
        </button>
      </div>

      <div class="selection-controls">
        <div v-if="products.length > 0 && areAllProductsSelectedOnPage && totalPages > 1 && !selectedAllPages" class="select-all-pages-bar">
          <span></span> <button @click="selectAllProductsOnAllPages" class="action-btn select-all-global-btn">
            Выбрать все ({{ totalProducts }})
          </button>
        </div>
        <div v-if="selectedAllPages" class="select-all-pages-bar selected-global">
          <span>Выбрано все товаров: {{ totalProducts }}</span> <button @click="clearAllPageSelection" class="action-btn clear-all-global-btn">
            Очистить выбор
          </button>
        </div>
      </div>

      <h3 v-if="products.length || productsLoading">Список товаров:</h3>
      <p v-if="productsLoading" class="loading-message">Загрузка товаров...</p>
      <p v-if="productsError" class="error-message">{{ productsError }}</p>

      <div v-if="products.length > 0" class="products-list">
        <div class="product-item header">
          <input type="checkbox" :checked="selectedAllPages || areAllProductsSelectedOnPage" @change="toggleSelectAllProducts" />
          <div class="header-info">Название / Артикул WB / Артикул продавца</div>
          <div class="header-sizes">Размеры</div>
          <div class="header-actions">Действия</div>
        </div>
        <div v-for="product in products" :key="product.nmID" class="product-item">
          <input
            type="checkbox"
            :value="product._id"
            :checked="selectedAllPages || selectedProductIds.includes(product._id)"
            @change="event => onIndividualCheckboxChange(event, product._id)"
          />
          <div class="product-info">
            <strong>Название:</strong> {{ product.title }}<br/>
            <strong>Артикул WB:</strong> {{ product.nmID }}<br/>
            <strong>Артикул продавца:</strong> {{ product.vendorCode }}
          </div>
          <div class="product-sizes">
            <strong>Размеры:</strong>
            <ul>
              <li v-for="size in product.sizes" :key="size.chrtID">
                {{ size.techSize }} (SKUs: {{ size.skus ? size.skus.join(', ') : 'Нет' }})
              </li>
            </ul>
          </div>
          <div class="product-actions">
            <button @click="createInMs(product)" class="action-btn create-ms">Создать в МС</button>
            <button @click="createAsKit(product)" class="action-btn create-kit">Создать как комплект</button>
            <button @click="linkToProduct(product)" class="action-btn link-product">Связать с товаром</button>
            <button @click="unlinkProduct(product)" class="action-btn unlink-product">Удалить связку</button>
          </div>
        </div>
      </div>
      <p v-else-if="!productsLoading && !productsError">Нет товаров для этой интеграции.</p>

      <div v-if="totalPages > 1" class="pagination">
        <button @click="changePage(currentPage - 1)" :disabled="currentPage === 1 || selectedAllPages">Предыдущая</button>
        <span>Страница {{ currentPage }} из {{ totalPages }}</span>
        <button @click="changePage(currentPage + 1)" :disabled="currentPage === totalPages || selectedAllPages">Следующая</button>
      </div>
    </div>

    <div v-if="isBulkEditModalOpen" class="modal-overlay">
      <div class="modal-content">
        <h3>Массовое редактирование</h3>
        <p>Выбрано товаров: {{ selectedAllPages ? totalProducts : selectedProductIds.length }} {{ selectedAllPages ? 'на всех страницах' : '' }}</p>
        <div class="modal-actions-grid">
          <button @click="bulkCreateInMs" class="action-btn big-btn create-ms">Создать товары в МС</button>
          <button @click="bulkCreateAsKit" class="action-btn big-btn create-kit">Создать комплекты</button>
          <button @click="bulkUnlinkProducts" class="action-btn big-btn unlink-product">Удалить связки</button>
        </div>
        <button @click="closeBulkEditModal" class="cancel-button">Отмена</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const router = useRouter();

const integrationLinks = ref([]);
const loadingIntegrations = ref(true);
const integrationsError = ref('');

const selectedIntegrationId = ref('');

const products = ref([]);
const productsLoading = ref(false);
const productsError = ref('');
const currentPage = ref(1);
const totalPages = ref(1);
const totalProducts = ref(0);
const productsPerPage = 20;

const selectedProductIds = ref([]); // Массив для хранения ID выбранных товаров на текущей странице
const selectedAllPages = ref(false); // Флаг: выбраны ли все товары на всех страницах
const isBulkEditModalOpen = ref(false);

const getToken = () => localStorage.getItem('token');

// Вычисляемое свойство: выбраны ли все товары на ТЕКУЩЕЙ странице
const areAllProductsSelectedOnPage = computed(() => {
  return products.value.length > 0 && selectedProductIds.value.length === products.value.length;
});

// Переключение выбора всех товаров на ТЕКУЩЕЙ странице
const toggleSelectAllProducts = () => {
  if (selectedAllPages.value) {
    // If "all pages" was selected, clear it
    clearAllPageSelection();
  } else if (areAllProductsSelectedOnPage.value) {
    // If all on current page are selected, deselect them
    selectedProductIds.value = [];
  } else {
    // Select all on current page
    selectedProductIds.value = products.value.map(p => p._id);
  }
};

// Обработчик изменения индивидуального чекбокса
const onIndividualCheckboxChange = (event, productId) => {
  selectedAllPages.value = false; // Reset global selection if an individual checkbox is changed

  if (event.target.checked) {
    if (!selectedProductIds.value.includes(productId)) {
      selectedProductIds.value.push(productId);
    }
  } else {
    selectedProductIds.value = selectedProductIds.value.filter(id => id !== productId);
  }
};

// Выбрать все товары на ВСЕХ страницах
const selectAllProductsOnAllPages = () => {
  selectedProductIds.value = []; // Clear current page selection, as "all pages" is now active
  selectedAllPages.value = true;
};

// Очистить выбор со всех страниц
const clearAllPageSelection = () => {
  selectedProductIds.value = [];
  selectedAllPages.value = false;
};


// 1. Загрузка всех интеграционных связок при монтировании
const fetchIntegrationLinks = async () => {
  loadingIntegrations.value = true;
  integrationsError.value = '';
  try {
    const response = await axios.get(`${API_BASE_URL}/integration-links`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    integrationLinks.value = response.data;
    if (integrationLinks.value.length > 0) {
      selectedIntegrationId.value = integrationLinks.value[0]._id;
    }
  } catch (error) {
    integrationsError.value = error.response?.data?.message || 'Ошибка при загрузке интеграций.';
    console.error('Fetch integration links error:', error);
  } finally {
    loadingIntegrations.value = false;
  }
};

// 2. Загрузка товаров для выбранной интеграции
const fetchProducts = async () => {
  if (!selectedIntegrationId.value) {
    products.value = [];
    productsLoading.value = false;
    productsError.value = '';
    currentPage.value = 1;
    totalPages.value = 1;
    totalProducts.value = 0;
    selectedProductIds.value = [];
    selectedAllPages.value = false; // Сбрасываем глобальный выбор при смене интеграции
    return;
  }

  productsLoading.value = true;
  productsError.value = '';
  try {
    const response = await axios.get(`${API_BASE_URL}/products/${selectedIntegrationId.value}?page=${currentPage.value}&limit=${productsPerPage}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    products.value = response.data.products;
    currentPage.value = response.data.currentPage;
    totalPages.value = response.data.totalPages;
    totalProducts.value = response.data.totalProducts;
    // Do NOT clear selectedProductIds or selectedAllPages here
    // as it might be set for bulk actions across pages.
    // However, if selectedAllPages is true, individual checkboxes will be checked visually.
  } catch (error) {
    productsError.value = error.response?.data?.message || 'Ошибка при загрузке товаров.';
    console.error('Fetch products error:', error);
    products.value = [];
  } finally {
    productsLoading.value = false;
  }
};

// 3. Обработчик изменения выбранной интеграции
const onIntegrationChange = () => {
  currentPage.value = 1;
  selectedProductIds.value = []; // Clear selection when integration changes
  selectedAllPages.value = false; // Clear global selection when integration changes
  fetchProducts();
};

// 4. Изменение страницы пагинации
const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    // When changing page, we should clear selectedProductIds
    // because it only represents selections on the *current* page.
    selectedProductIds.value = [];
    // selectedAllPages flag should persist, and individual checkboxes will react to it.
    fetchProducts();
  }
};

// 5. Индивидуальные действия с товарами (заглушки)
const createInMs = (product) => {
  alert(`Создать в МС: ${product.title}`);
  console.log('Создать в МС:', product);
};

const createAsKit = (product) => {
  alert(`Создать как комплект: ${product.title}`);
  console.log('Создать как комплект:', product);
};

const linkToProduct = (product) => {
  alert(`Связать с товаром: ${product.title}`);
  console.log('Связать с товаром:', product);
};

const unlinkProduct = (product) => {
  alert(`Удалить связку: ${product.title}`);
  console.log('Удалить связку:', product);
};


// 6. Действия для массового редактирования
const openBulkEditModal = () => {
  if (selectedProductIds.value.length === 0 && !selectedAllPages.value) {
    alert('Пожалуйста, выберите хотя бы один товар или выберите все товары на всех страницах.');
    return;
  }
  isBulkEditModalOpen.value = true;
};

const closeBulkEditModal = () => {
  isBulkEditModalOpen.value = false;
};

const bulkCreateInMs = () => {
  if (selectedAllPages.value) {
    alert(`Создать в МС (массово) все ${totalProducts.value} товаров.`);
  } else {
    alert(`Создать в МС (массово) для ${selectedProductIds.value.length} выбранных товаров.`);
  }
  console.log('Массовое создание в МС для ID:', selectedProductIds.value, 'Выбраны все страницы:', selectedAllPages.value);
  closeBulkEditModal();
  clearAllPageSelection(); // Clear selection after bulk action
};

const bulkCreateAsKit = () => {
  if (selectedAllPages.value) {
    alert(`Создать комплекты (массово) для всех ${totalProducts.value} товаров.`);
  } else {
    alert(`Создать комплекты (массово) для ${selectedProductIds.value.length} выбранных товаров.`);
  }
  console.log('Массовое создание комплектов для ID:', selectedProductIds.value, 'Выбраны все страницы:', selectedAllPages.value);
  closeBulkEditModal();
  clearAllPageSelection(); // Clear selection after bulk action
};

const bulkUnlinkProducts = () => {
  if (selectedAllPages.value) {
    alert(`Удалить связки (массово) для всех ${totalProducts.value} товаров.`);
  } else {
    alert(`Удалить связки (массово) для ${selectedProductIds.value.length} выбранных товаров.`);
  }
  console.log('Массовое удаление связок для ID:', selectedProductIds.value, 'Выбраны все страницы:', selectedAllPages.value);
  closeBulkEditModal();
  clearAllPageSelection(); // Clear selection after bulk action
};


// Watcher для отслеживания изменения selectedIntegrationId
watch(selectedIntegrationId, (newVal, oldVal) => {
  if (newVal && newVal !== oldVal) {
    currentPage.value = 1;
    fetchProducts();
  }
}, { immediate: true });

onMounted(() => {
  fetchIntegrationLinks();
});
</script>



<style scoped>
/* Ваши существующие стили */
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

.loading-message, .error-message {
  text-align: center;
  margin-top: 20px;
  color: #666;
}
.error-message {
  color: #dc3545;
  font-weight: bold;
}

.no-integrations-message {
  padding: 20px;
  border: 1px dashed #ccc;
  border-radius: 8px;
  background-color: #f0f0f0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  margin-top: 30px;
}
.no-integrations-message p {
  margin: 0;
}
.link-button {
  background-color: #007bff;
  color: white;
  padding: 10px 15px;
  border-radius: 5px;
  text-decoration: none;
  transition: background-color 0.3s ease;
}
.link-button:hover {
  background-color: #0056b3;
}

.integration-selector-section {
  margin-bottom: 30px;
}
.integration-selector-section h3 {
  margin-bottom: 15px;
  color: #555;
  font-size: 1.2em;
}
.integration-select {
  width: 100%;
  padding: 10px 15px;
  border: 1px solid #dcdfe6;
  border-radius: 5px;
  font-size: 1em;
  box-sizing: border-box;
  background-color: #ffffff;
  appearance: none;
  background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2C197.9c-3.6%2C3.6-8.3%2C5.4-13.1%2C5.4s-9.5-1.8-13.1-5.4L146.2%2C77.4L32.6%2C197.9c-3.6%2C3.6-8.3%2C5.4-13.1%2C5.4s-9.5-1.8-13.1-5.4c-7.3-7.3-7.3-19.1%2C0-26.4L133%2C50.9c7.3-7.3%2C19.1-7.3%2C26.4%2C0l119.6%2C119.6C294.3%2C178.9%2C294.3%2C190.7%2C287%2C197.9z%22%2F%3E%3C%2Fsvg%3E');
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 12px;
}

/* Стили для панели массовых действий */
.bulk-actions-bar {
  background-color: #e6f7ff;
  border: 1px solid #91d5ff;
  border-radius: 8px;
  padding: 15px 20px;
  margin-bottom: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
}
.bulk-edit-button {
  background-color: #1890ff;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1em;
  font-weight: bold;
  transition: background-color 0.3s ease;
}
.bulk-edit-button:hover {
  background-color: #40a9ff;
}

/* Стили для панели "Выбрать все на всех страницах" */
.selection-controls {
    display: flex;
    justify-content: flex-start; /* Выравнивание к левому краю */
    align-items: center;
    margin-bottom: 15px; /* Отступ от списка товаров */
}
.select-all-pages-bar {
    background-color: #fffbe6; /* Желтоватый фон */
    border: 1px solid #ffe58f;
    border-radius: 8px;
    padding: 8px 12px; /* Меньше паддинг */
    display: flex;
    justify-content: flex-start; /* Выравнивание к левому краю */
    align-items: center;
    gap: 10px; /* Меньше отступ */
    flex-wrap: wrap;
    text-align: left;
    font-size: 0.9em; /* Меньше шрифт */
    color: #8c6b00; /* Темный текст для желтого фона */
}
.select-all-pages-bar.selected-global {
    background-color: #f6ffed; /* Зеленоватый фон */
    border-color: #b7eb8f;
    color: #389e08; /* Темный текст для зеленого фона */
}

.select-all-global-btn, .clear-all-global-btn {
    background-color: #1890ff;
    color: white;
    padding: 6px 12px; /* Меньше паддинг */
    border: none;
    border-radius: 4px; /* Меньше радиус */
    cursor: pointer;
    font-size: 0.85em; /* Меньше шрифт */
    transition: background-color 0.3s ease;
    font-weight: bold;
    white-space: nowrap; /* Не переносить текст */
}
.select-all-global-btn:hover {
    background-color: #40a9ff;
}
.clear-all-global-btn {
    background-color: #faad14;
}
.clear-all-global-btn:hover {
    background-color: #d48806;
}


.products-list {
  margin-top: 30px; /* Увеличим отступ сверху, если нет selection-controls */
  border: 1px solid #eee;
  border-radius: 5px;
  overflow: hidden;
}

.product-item {
  display: grid;
  grid-template-columns: 40px 3fr 2fr 3fr;
  gap: 15px;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  background-color: #f9f9f9;
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
}
.product-item:last-child {
  border-bottom: none;
}
.product-item input[type="checkbox"] {
  transform: scale(1.3);
  cursor: pointer;
}

.product-info strong {
  color: #333;
  min-width: 150px;
  display: inline-block;
  margin-right: 5px;
}
.product-info br {
  display: block;
}

.product-sizes ul {
  list-style: none;
  padding: 0;
  margin-top: 5px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.product-sizes li {
  background-color: #e2e6ea;
  padding: 5px 10px;
  border-radius: 3px;
  font-size: 0.9em;
  color: #495057;
}

.product-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}
.action-btn {
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85em;
  transition: background-color 0.2s ease, transform 0.1s ease;
  white-space: nowrap;
}
.action-btn:hover {
  transform: translateY(-1px);
}
/* Индивидуальные цвета кнопок */
.create-ms { background-color: #5cb85c; color: white; }
.create-ms:hover { background-color: #4cae4c; }
.create-kit { background-color: #f0ad4e; color: white; }
.create-kit:hover { background-color: #ec971f; }
.link-product { background-color: #5bc0de; color: white; }
.link-product:hover { background-color: #31b0d5; }
.unlink-product { background-color: #d9534f; color: white; }
.unlink-product:hover { background-color: #c9302c; }


.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 30px;
  padding: 15px;
  background-color: #f0f2f5;
  border-radius: 8px;
}
.pagination button {
  background-color: #007bff;
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}
.pagination button:hover:not(:disabled) {
  background-color: #0056b3;
}
.pagination button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}
.pagination span {
  font-size: 1.1em;
  color: #555;
  font-weight: 500;
}

/* Стили для модального окна массового редактирования */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease-out;
}

.modal-content {
  background-color: #ffffff;
  padding: 35px 40px;
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  width: 95%;
  max-width: 600px;
  text-align: left;
  animation: slideIn 0.3s ease-out;
}

.modal-content h3 {
  margin-top: 0;
  margin-bottom: 30px;
  color: #333;
  text-align: center;
  font-size: 1.8em;
  font-weight: 600;
}

.modal-content p {
    text-align: center;
    margin-bottom: 25px;
    font-size: 1.1em;
    color: #666;
}

.modal-actions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
    margin-top: 30px;
    margin-bottom: 30px;
}

.big-btn {
    padding: 15px 20px;
    font-size: 1.1em;
    font-weight: bold;
}

.modal-content .cancel-button {
  background-color: #909399;
  color: white;
  padding: 13px 28px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 17px;
  font-weight: 600;
  transition: background-color 0.3s ease, transform 0.2s ease;
  display: block;
  width: 100%;
  max-width: 200px;
  margin: 0 auto;
}
.modal-content .cancel-button:hover {
  background-color: #a6a9ad;
  transform: translateY(-2px);
}

/* Анимации */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from { transform: translateY(-50px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Адаптивность */
@media (max-width: 768px) {
  .product-item {
    grid-template-columns: 40px 1fr;
    flex-direction: column;
    align-items: flex-start;
  }
  .product-item.header {
    grid-template-columns: 40px 1fr;
  }
  .product-item .header-sizes,
  .product-item .header-actions {
    display: none;
  }
  .product-sizes, .product-actions {
    width: 100%;
    margin-top: 10px;
  }
  .product-actions {
    justify-content: flex-start;
  }
  .modal-actions-grid {
    grid-template-columns: 1fr;
  }
}
</style>
