<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content">
      <button class="modal-close-button" @click="emit('close')">&times;</button>
      <h3>Выберите товар/модификацию в МойСклад для связывания</h3>

      <div class="wb-product-info" v-if="wbProduct">
        <h4>Связываемый товар WB: <strong>{{ wbProduct.title }} (NM ID: {{ wbProduct.nmID }})</strong></h4>
        <div v-if="wbProduct.sizes && wbProduct.sizes.length > 1" class="wb-sizes-selection">
          <label for="wb-size-select">Выберите размер WB для связывания (если применимо):</label>
          <select id="wb-size-select" v-model="selectedWbSizeChrtID" class="wb-size-select">
            <option value="">Весь товар (без привязки к конкретному размеру)</option>
            <option v-for="size in wbProduct.sizes" :key="size.chrtID" :value="size.chrtID">
              Размер: {{ size.techSize }} (chrtID: {{ size.chrtID }})
            </option>
          </select>
          <p class="info-message" v-if="selectedWbSizeChrtID">
            Выбран конкретный размер WB. Выбирайте соответствующую **модификацию** в МойСклад.
          </p>
          <p class="info-message" v-else>
            Выбран "Весь товар WB". Выбирайте соответствующий **товар** в МойСклад.
          </p>
        </div>
      </div>
      <hr/>

      <div class="display-mode-toggle">
        <button
          @click="displayMode = 'products'"
          :class="{ 'active': displayMode === 'products' }"
          class="mode-button"
        >
          Товары МС
        </button>
        <button
          @click="displayMode = 'modifications'"
          :class="{ 'active': displayMode === 'modifications' }"
          class="mode-button"
        >
          Модификации МС
        </button>
        <button
          @click="displayMode = 'bundles'"
          :class="{ 'active': displayMode === 'bundles' }"
          class="mode-button"
        >
          Комплекты МС
        </button>
      </div>

      <div v-if="displayMode === 'products'">
        <div class="modal-search-bar">
          <input
            type="text"
            v-model="msSearchTerm"
            placeholder="Поиск по названию или коду товара МС..."
            @input="debouncedMsSearch"
            class="search-input"
          />
          <button @click="clearMsSearch" class="clear-search-button">Очистить</button>
        </div>

        <p v-if="loadingMsProducts" class="loading-message">Загрузка товаров из МойСклад...</p>
        <p v-if="msProductsError" class="error-message">{{ msProductsError }}</p>

        <ul v-if="msProducts.length" class="ms-product-list">
          <li v-for="product in msProducts" :key="product.id" class="ms-product-item">
            <div class="product-info">
              <strong>{{ product.name }}</strong>
              <span v-if="product.code"> (Код: {{ product.code }})</span>
            </div>
            <button @click="selectMsProduct(product)" class="select-btn">Выбрать</button>
          </li>
        </ul>
        <p v-else-if="!loadingMsProducts && !msProductsError && msSearchTerm">
          Нет товаров, соответствующих вашему поиску в МойСклад.
        </p>
        <p v-else-if="!loadingMsProducts && !msProductsError">
          Нет товаров в МойСклад для отображения.
        </p>

        <div class="modal-pagination-controls" v-if="totalPagesMs > 1">
          <button @click="changeMsPage(currentPageMs - 1)" :disabled="currentPageMs === 1" class="page-button">
            &leftarrow;
          </button>
          <span>Страница {{ currentPageMs }} из {{ totalPagesMs }}</span>
          <button @click="changeMsPage(currentPageMs + 1)" :disabled="currentPageMs === totalPagesMs" class="page-button">
            &rightarrow;
          </button>
        </div>
      </div>

      <div v-else-if="displayMode === 'modifications'">
        <div class="modal-search-bar">
          <input
            type="text"
            v-model="msVariantsSearchTerm"
            placeholder="Поиск по названию или коду модификации МС..."
            @input="debouncedMsVariantsSearch"
            class="search-input"
          />
          <button @click="clearMsVariantsSearch" class="clear-search-button">Очистить</button>
        </div>

        <p v-if="loadingMsVariants" class="loading-message">Загрузка модификаций из МойСклад...</p>
        <p v-if="msVariantsError" class="error-message">{{ msVariantsError }}</p>

        <ul v-if="msVariants.length" class="ms-product-list">
          <li v-for="variant in msVariants" :key="variant.id" class="ms-product-item">
            <div class="product-info">
              <strong>{{ variant.name }}</strong>
              <span v-if="variant.code"> (Код: {{ variant.code }})</span>
              <span v-if="variant.product && variant.product.name"> (Товар: {{ variant.product.name }})</span>
            </div>
            <button @click="selectMsVariant(variant)" class="select-btn">Выбрать</button>
          </li>
        </ul>
        <p v-else-if="!loadingMsVariants && !msVariantsError && msVariantsSearchTerm">
          Нет модификаций, соответствующих вашему поиску в МойСклад.
        </p>
        <p v-else-if="!loadingMsVariants && !msVariantsError">
          Нет модификаций в МойСклад для отображения.
        </p>

        <div class="modal-pagination-controls" v-if="totalPagesMsVariants > 1">
          <button @click="changeMsVariantsPage(currentPageMsVariants - 1)" :disabled="currentPageMsVariants === 1" class="page-button">
            &leftarrow;
          </button>
          <span>Страница {{ currentPageMsVariants }} из {{ totalPagesMsVariants }}</span>
          <button @click="changeMsVariantsPage(currentPageMsVariants + 1)" :disabled="currentPageMsVariants === totalPagesMsVariants" class="page-button">
            &rightarrow;
          </button>
        </div>
      </div>

      <div v-else-if="displayMode === 'bundles'">
        <div class="modal-search-bar">
          <input
            type="text"
            v-model="msBundlesSearchTerm"
            placeholder="Поиск по названию или коду комплекта МС..."
            @input="debouncedMsBundlesSearch"
            class="search-input"
          />
          <button @click="clearMsBundlesSearch" class="clear-search-button">Очистить</button>
        </div>

        <p v-if="loadingMsBundles" class="loading-message">Загрузка комплектов из МойСклад...</p>
        <p v-if="msBundlesError" class="error-message">{{ msBundlesError }}</p>

        <ul v-if="msBundles.length" class="ms-product-list">
          <li v-for="bundle in msBundles" :key="bundle.id" class="ms-product-item">
            <div class="product-info">
              <strong>{{ bundle.name }}</strong>
              <span v-if="bundle.code"> (Код: {{ bundle.code }})</span>
            </div>
            <button @click="selectMsBundle(bundle)" class="select-btn">Выбрать</button>
          </li>
        </ul>
        <p v-else-if="!loadingMsBundles && !msBundlesError && msBundlesSearchTerm">
          Нет комплектов, соответствующих вашему поиску в МойСклад.
        </p>
        <p v-else-if="!loadingMsBundles && !msBundlesError">
          Нет комплектов в МойСклад для отображения.
        </p>

        <div class="modal-pagination-controls" v-if="totalPagesMsBundles > 1">
          <button @click="changeMsBundlesPage(currentPageMsBundles - 1)" :disabled="currentPageMsBundles === 1" class="page-button">
            &leftarrow;
          </button>
          <span>Страница {{ currentPageMsBundles }} из {{ totalPagesMsBundles }}</span>
          <button @click="changeMsBundlesPage(currentPageMsBundles + 1)" :disabled="currentPageMsBundles === totalPagesMsBundles" class="page-button">
            &rightarrow;
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, defineProps, defineEmits, computed } from 'vue';
import axios from 'axios';
import debounce from 'lodash.debounce';

const props = defineProps({
  isOpen: Boolean,
  integrationLinkId: String,
  getToken: Function,
  wbProduct: Object, // Теперь принимаем полный объект товара WB
});

const emit = defineEmits(['close', 'product-linked']);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// --- State for Products ---
const msProducts = ref([]);
const loadingMsProducts = ref(false);
const msProductsError = ref('');
const currentPageMs = ref(1);
const totalPagesMs = ref(0);
const totalMsProducts = ref(0);
const msSearchTerm = ref(''); // Search term for products

// --- State for Variants (Modifications) ---
const msVariants = ref([]);
const loadingMsVariants = ref(false);
const msVariantsError = ref('');
const currentPageMsVariants = ref(1);
const totalPagesMsVariants = ref(0);
const totalMsVariants = ref(0);
const msVariantsSearchTerm = ref(''); // Search term for variants

// --- State for Bundles ---
const msBundles = ref([]);
const loadingMsBundles = ref(false);
const msBundlesError = ref('');
const currentPageMsBundles = ref(1);
const totalPagesMsBundles = ref(0);
const totalMsBundles = ref(0);
const msBundlesSearchTerm = ref(''); // Search term for bundles

const itemsPerPage = 20; // Единый лимит товаров/модификаций на страницу

const displayMode = ref('products'); // 'products' or 'modifications'

// --- NEW STATE for WB Size Selection ---
const selectedWbSizeChrtID = ref(''); // chrtID выбранного размера WB для связывания

// Reset selectedWbSizeChrtID when modal opens or wbProduct changes
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    selectedWbSizeChrtID.value = ''; // Reset when modal opens
  }
});
watch(() => props.wbProduct, (newVal) => {
  if (newVal) {
    // If WB product has only one size, pre-select it implicitly (or keep empty for general if that's the default)
    if (newVal.sizes && newVal.sizes.length === 1) {
      selectedWbSizeChrtID.value = newVal.sizes[0].chrtID;
    } else {
      selectedWbSizeChrtID.value = ''; // Ensure it's reset for multi-size products
    }
  }
});

// --- Functions for Products ---
const fetchMsProducts = async () => {
  if (!props.isOpen || !props.integrationLinkId || displayMode.value !== 'products') {
    return;
  }

  loadingMsProducts.value = true;
  msProductsError.value = '';

  const offset = (currentPageMs.value - 1) * itemsPerPage;
  const limitForRequest = itemsPerPage;

  try {
    const response = await axios.get(`${API_BASE_URL}/products/moysklad-products`, {
      headers: { Authorization: `Bearer ${props.getToken()}` },
      params: {
        integrationLinkId: props.integrationLinkId,
        limit: limitForRequest,
        offset: offset,
        searchTerm: msSearchTerm.value,
      },
    });

    msProducts.value = response.data.products;
    totalMsProducts.value = response.data.total;
    totalPagesMs.value = Math.ceil(totalMsProducts.value / itemsPerPage);

  } catch (error) {
    msProductsError.value = error.response?.data?.message || 'Ошибка загрузки товаров из МойСклад.';
    console.error('Ошибка загрузки товаров МойСклад:', error);
  } finally {
    loadingMsProducts.value = false;
  }
};

const debouncedMsSearch = debounce(() => {
  currentPageMs.value = 1;
  fetchMsProducts();
}, 500);

const clearMsSearch = () => {
  msSearchTerm.value = '';
  currentPageMs.value = 1;
  fetchMsProducts();
};

const changeMsPage = (newPage) => {
  if (newPage >= 1 && newPage <= totalPagesMs.value) {
    currentPageMs.value = newPage;
    fetchMsProducts();
  }
};

const selectMsProduct = async (msProduct) => {
  if (!props.wbProduct) {
    alert('Ошибка: Не выбран товар WB для связывания.');
    return;
  }

  // Предупреждения для пользователя
  if (selectedWbSizeChrtID.value && msProduct.product) { // msProduct.product indicates it's a variant, not a main product
      alert('Вы выбрали конкретный размер WB, но пытаетесь связать его с основным товаром МойСклад. Пожалуйста, выберите модификацию МойСклад или отмените выбор размера WB.');
      return;
  }
  if (props.wbProduct.sizes && props.wbProduct.sizes.length > 1 && !selectedWbSizeChrtID.value && msProduct.product) {
      alert('Вы выбрали "Весь товар WB", но пытаетесь связать его с модификацией МойСклад. Пожалуйста, выберите товар МойСклад или укажите конкретный размер WB.');
      return;
  }

  let confirmationMessage = `Вы уверены, что хотите связать WB товар "${props.wbProduct.title}"`;
  if (selectedWbSizeChrtID.value) {
      const wbSize = props.wbProduct.sizes.find(s => s.chrtID === selectedWbSizeChrtID.value);
      confirmationMessage += ` (размер: "${wbSize.techSize}")`;
  }
  confirmationMessage += ` с товаром МойСклад "${msProduct.name}"?`;

  if (!confirm(confirmationMessage)) {
    return;
  }

  console.log(`Попытка связать WB товар ID: ${props.wbProduct._id} (Размер WB chrtID: ${selectedWbSizeChrtID.value || 'N/A'}) с МС товаром ID: ${msProduct.id}`);
  try {
    const response = await axios.post(`${API_BASE_URL}/products/link-product`, {
      wbProductId: props.wbProduct._id,
      msProductHref: msProduct.meta.href, // Отправляем href выбранного товара МС
      wbSizeChrtID: selectedWbSizeChrtID.value || null, // Отправляем chrtID, если выбрано
      integrationLinkId: props.integrationLinkId,
    }, {
      headers: { Authorization: `Bearer ${props.getToken()}` },
    });

    // На бэкенде предполагается, что response.data.updatedWbProduct будет содержать
    // либо ms_href_general, либо обновленные ms_href для конкретных размеров.
    // А также, в случае успешного связывания, response.data.ms_href_linked будет содержать
    // href, который нужно записать в соответствующее поле (ms_href_general или sizes[i].ms_href).

    let successMessage = `Товар "${props.wbProduct.title}"`;
    if (selectedWbSizeChrtID.value) {
        const wbSize = props.wbProduct.sizes.find(s => s.chrtID === selectedWbSizeChrtID.value);
        successMessage += ` (размер "${wbSize.techSize}")`;
    }
    successMessage += ` успешно связан с "${msProduct.name}" в МойСклад!`;

    alert(successMessage);
    // Передаем wbProduct._id и весь updatedWbProduct обратно в parent,
    // а также wbSizeChrtID для корректного обновления.
    emit('product-linked', props.wbProduct._id, response.data.updatedWbProduct, selectedWbSizeChrtID.value);
    emit('close');
  } catch (error) {
    alert(error.response?.data?.message || 'Ошибка связывания товаров.');
    console.error('Ошибка связывания:', error);
  }
};

// --- Functions for Variants (Modifications) ---
const fetchMsVariants = async () => {
  if (!props.isOpen || !props.integrationLinkId || displayMode.value !== 'modifications') {
    return;
  }

  loadingMsVariants.value = true;
  msVariantsError.value = '';

  const offset = (currentPageMsVariants.value - 1) * itemsPerPage;
  const limitForRequest = itemsPerPage;

  try {
    const response = await axios.get(`${API_BASE_URL}/products/moysklad-variants`, { // ИСПОЛЬЗУЕМ НОВЫЙ ЭНДПОИНТ
      headers: { Authorization: `Bearer ${props.getToken()}` },
      params: {
        integrationLinkId: props.integrationLinkId,
        limit: limitForRequest,
        offset: offset,
        searchTerm: msVariantsSearchTerm.value, // ИСПОЛЬЗУЕМ НОВОЕ ПОЛЕ ПОИСКА
      },
    });

    msVariants.value = response.data.variants; // Обрати внимание: response.data.variants
    totalMsVariants.value = response.data.total;
    totalPagesMsVariants.value = Math.ceil(totalMsVariants.value / itemsPerPage);

  } catch (error) {
    msVariantsError.value = error.response?.data?.message || 'Ошибка загрузки модификаций из МойСклад.';
    console.error('Ошибка загрузки модификаций МойСклад:', error);
  } finally {
    loadingMsVariants.value = false;
  }
};

const debouncedMsVariantsSearch = debounce(() => {
  currentPageMsVariants.value = 1;
  fetchMsVariants();
}, 500);

const clearMsVariantsSearch = () => {
  msVariantsSearchTerm.value = '';
  currentPageMsVariants.value = 1;
  fetchMsVariants();
};

const changeMsVariantsPage = (newPage) => {
  if (newPage >= 1 && newPage <= totalPagesMsVariants.value) {
    currentPageMsVariants.value = newPage;
    fetchMsVariants();
  }
};

const selectMsVariant = async (msVariant) => {
  if (!props.wbProduct) {
    alert('Ошибка: Не выбран товар WB для связывания.');
    return;
  }

  // Предупреждения для пользователя
  if (!selectedWbSizeChrtID.value) { // Если не выбран конкретный chrtID WB
    if (props.wbProduct.sizes && props.wbProduct.sizes.length > 1) { // И товар WB имеет несколько размеров
      alert('У товара WB несколько размеров. Пожалуйста, выберите конкретный размер WB из выпадающего списка, чтобы связать его с модификацией МойСклад.');
      return;
    } else if (props.wbProduct.sizes && props.wbProduct.sizes.length === 1) {
        // Если WB товар имеет только один размер, и не был выбран конкретный chrtID.
        // Автоматически берем chrtID единственного размера для связывания модификации.
        selectedWbSizeChrtID.value = props.wbProduct.sizes[0].chrtID;
    } else {
        alert('Для связывания с модификацией МойСклад необходимо, чтобы товар WB имел размеры.');
        return;
    }
  }

  let confirmationMessage = `Вы уверены, что хотите связать WB товар "${props.wbProduct.title}"`;
  let wbSizeInfo = '';
  if (selectedWbSizeChrtID.value) {
      const wbSize = props.wbProduct.sizes.find(s => s.chrtID === selectedWbSizeChrtID.value);
      if (wbSize) {
          wbSizeInfo = ` (размер: "${wbSize.techSize}")`;
      }
  }
  confirmationMessage += `${wbSizeInfo} с модификацией МойСклад "${msVariant.name}"?`;

  if (!confirm(confirmationMessage)) {
    return;
  }

  console.log(`Попытка связать WB товар ID: ${props.wbProduct._id} ${wbSizeInfo} с МС модификацией ID: ${msVariant.id}`);
  try {
    // Здесь мы передаем msProductHref как href модификации,
    // и wbSizeChrtID для указания, какой размер WB связываем.
    const response = await axios.post(`${API_BASE_URL}/products/link-product`, {
      wbProductId: props.wbProduct._id,
      msProductHref: msVariant.meta.href, // Отправляем href выбранной модификации МС
      wbSizeChrtID: selectedWbSizeChrtID.value, // Передаем chrtID выбранного размера WB
      integrationLinkId: props.integrationLinkId,
    }, {
      headers: { Authorization: `Bearer ${props.getToken()}` },
    });

    let successMessage = `Товар "${props.wbProduct.title}"`;
    successMessage += `${wbSizeInfo} успешно связан с модификацией "${msVariant.name}" в МойСклад!`;

    alert(successMessage);
    // Передаем wbProduct._id, весь updatedWbProduct и wbSizeChrtID
    emit('product-linked', props.wbProduct._id, response.data.updatedWbProduct, selectedWbSizeChrtID.value);
    emit('close');
  } catch (error) {
    alert(error.response?.data?.message || 'Ошибка связывания модификаций.');
    console.error('Ошибка связывания:', error);
  }
};

// --- Functions for Bundles ---
const fetchMsBundles = async () => {
  if (!props.isOpen || !props.integrationLinkId || displayMode.value !== 'bundles') {
    return;
  }

  loadingMsBundles.value = true;
  msBundlesError.value = '';

  const offset = (currentPageMsBundles.value - 1) * itemsPerPage;
  const limitForRequest = itemsPerPage;

  try {
    const response = await axios.get(`${API_BASE_URL}/products/moysklad-bundles`, {
      headers: { Authorization: `Bearer ${props.getToken()}` },
      params: {
        integrationLinkId: props.integrationLinkId,
        limit: limitForRequest,
        offset: offset,
        searchTerm: msBundlesSearchTerm.value,
      },
    });

    msBundles.value = response.data.bundles;
    totalMsBundles.value = response.data.total;
    totalPagesMsBundles.value = Math.ceil(totalMsBundles.value / itemsPerPage);

  } catch (error) {
    msBundlesError.value = error.response?.data?.message || 'Ошибка загрузки комплектов из МойСклад.';
    console.error('Ошибка загрузки комплектов МойСклад:', error);
  } finally {
    loadingMsBundles.value = false;
  }
};

const debouncedMsBundlesSearch = debounce(() => {
  currentPageMsBundles.value = 1;
  fetchMsBundles();
}, 500);

const clearMsBundlesSearch = () => {
  msBundlesSearchTerm.value = '';
  currentPageMsBundles.value = 1;
  fetchMsBundles();
};

const changeMsBundlesPage = (newPage) => {
  if (newPage >= 1 && newPage <= totalPagesMsBundles.value) {
    currentPageMsBundles.value = newPage;
    fetchMsBundles();
  }
};

const selectMsBundle = async (msBundle) => {
  if (!props.wbProduct) {
    alert('Ошибка: Не выбран товар WB для связывания.');
    return;
  }

  let confirmationMessage = `Вы уверены, что хотите связать WB товар "${props.wbProduct.title}" с комплектом МойСклад "${msBundle.name}"?`;

  if (!confirm(confirmationMessage)) {
    return;
  }

  console.log(`Попытка связать WB товар ID: ${props.wbProduct._id} с МС комплектом ID: ${msBundle.id}`);
  try {
    const response = await axios.post(`${API_BASE_URL}/products/link-product`, {
      wbProductId: props.wbProduct._id,
      msProductHref: msBundle.meta.href, // Отправляем href выбранного комплекта МС
      integrationLinkId: props.integrationLinkId,
    }, {
      headers: { Authorization: `Bearer ${props.getToken()}` },
    });

    let successMessage = `Товар "${props.wbProduct.title}" успешно связан с комплектом "${msBundle.name}" в МойСклад!`;
    alert(successMessage);
    // Передаем wbProduct._id, весь updatedWbProduct
    emit('product-linked', props.wbProduct._id, response.data.updatedWbProduct);
    emit('close');
  } catch (error) {
    alert(error.response?.data?.message || 'Ошибка связывания комплектов.');
    console.error('Ошибка связывания:', error);
  }
};

// --- Watchers ---
watch(() => [props.isOpen, props.integrationLinkId, displayMode.value], ([newIsOpen, newIntegrationId, newDisplayMode], [oldIsOpen, oldIntegrationId, oldDisplayMode]) => {
  if (newIsOpen) {
    if (newDisplayMode === 'products') {
      // Сбрасываем пагинацию и поиск для товаров, если поменялся integrationId или переключились на товары
      if (newIntegrationId !== oldIntegrationId || newDisplayMode !== oldDisplayMode || !msProducts.value.length) {
        currentPageMs.value = 1;
        msSearchTerm.value = '';
      }
      fetchMsProducts();
    } else if (newDisplayMode === 'modifications') {
      // Сбрасываем пагинацию и поиск для модификаций, если поменялся integrationId или переключились на модификации
      if (newIntegrationId !== oldIntegrationId || newDisplayMode !== oldDisplayMode || !msVariants.value.length) {
        currentPageMsVariants.value = 1;
        msVariantsSearchTerm.value = '';
      }
      fetchMsVariants();
    } else if (newDisplayMode === 'bundles') {
      // Сбрасываем пагинацию и поиск для комплектов, если поменялся integrationId или переключились на комплекты
      if (newIntegrationId !== oldIntegrationId || newDisplayMode !== oldDisplayMode || !msBundles.value.length) {
        currentPageMsBundles.value = 1;
        msBundlesSearchTerm.value = '';
      }
      fetchMsBundles();
    }
  }
});
</script>

<style scoped>
/* Все твои существующие стили остаются без изменений */
/* Убедись, что они применены к новым элементам внутри блока модификаций,
    используя те же классы, например, `ms-product-list`, `ms-product-item` и т.д. */

/* --- Existing styles (ensure they are still present) --- */
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
  z-index: 1000;
}

.modal-content {
  background: #fff;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 700px;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
}

.modal-close-button {
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #888;
}

.modal-close-button:hover {
  color: #333;
}

h3 {
  text-align: center;
  color: #333;
  margin-bottom: 20px;
}

.wb-product-info {
  background-color: #e6f7ff;
  border: 1px solid #91d5ff;
  border-radius: 4px;
  padding: 10px 15px;
  margin-bottom: 20px;
}

.wb-product-info h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #333;
}

.wb-sizes-selection {
  margin-top: 15px;
}

.wb-size-select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1em;
  margin-top: 5px;
  margin-bottom: 10px;
}

.info-message {
    font-size: 0.9em;
    color: #666;
    margin-top: 5px;
    margin-bottom: 15px;
    border-left: 3px solid #007bff;
    padding-left: 10px;
}

hr {
    border: none;
    border-top: 1px solid #eee;
    margin: 20px 0;
}

.display-mode-toggle {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
  gap: 10px;
}

.mode-button {
  padding: 10px 20px;
  border: 1px solid #007bff;
  border-radius: 5px;
  background-color: #fff;
  color: #007bff;
  cursor: pointer;
  font-size: 1em;
  transition: all 0.3s ease;
}

.mode-button:hover:not(.active) {
  background-color: #eaf5ff;
}

.mode-button.active {
  background-color: #007bff;
  color: white;
  font-weight: bold;
}

.modal-search-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.search-input {
  flex-grow: 1;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1em;
}

.clear-search-button {
  padding: 10px 15px;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.clear-search-button:hover {
  background-color: #d32f2f;
}

.loading-message, .error-message {
  text-align: center;
  margin: 20px 0;
  color: #666;
}

.error-message {
  color: #dc3545;
  font-weight: bold;
}

.ms-product-list {
  list-style: none;
  padding: 0;
  margin: 0;
  border: 1px solid #eee;
  border-radius: 4px;
  max-height: 40vh; /* Ограничиваем высоту списка */
  overflow-y: auto; /* Добавляем прокрутку для списка товаров */
}

.ms-product-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  border-bottom: 1px solid #eee;
}

.ms-product-item:last-child {
  border-bottom: none;
}

.ms-product-item:hover {
  background-color: #f7f7f7;
}

.product-info strong {
  color: #333;
}

.product-info span {
  color: #666;
  font-size: 0.9em;
}

.select-btn {
  padding: 8px 15px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.select-btn:hover {
  background-color: #0056b3;
}

.modal-pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
  gap: 15px;
}

.page-button {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.page-button:hover:not(:disabled) {
  background-color: #5a6268;
}

.page-button:disabled {
  background-color: #e2e6ea;
  cursor: not-allowed;
  opacity: 0.7;
}
</style>
