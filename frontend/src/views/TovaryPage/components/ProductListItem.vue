<template>
  <div class="product-item">
    <input
      type="checkbox"
      :value="product._id"
      :checked="isSelected"
      @change="event => emit('toggle-select', event, product._id)"
    />
    <div class="product-image">
      <img 
        v-if="product.photos && product.photos.length > 0 && product.photos[0].c246x328" 
        :src="product.photos[0].c246x328" 
        :alt="product.title"
        class="product-thumbnail"
        @error="handleImageError"
        @click="openImageModal"
      />
      <div v-else class="no-image-placeholder">
        <span>Нет фото</span>
      </div>
    </div>
    <div class="product-info">
      <strong>Название:</strong> {{ product.title }}<br/>
      <strong>Артикул WB:</strong> {{ product.nmID }}<br/>
      <strong>Артикул продавца:</strong> {{ product.vendorCode }}<br/>
      <strong v-if="showIntegrationInfo && product.integrationLink">Интеграция:</strong> {{ showIntegrationInfo && product.integrationLink ? getIntegrationName(product.integrationLink) : '' }}
      <div v-if="product.ms_href_general || (product.sizes && product.sizes.some(size => size.ms_href))" class="ms-link">
        <span class="ms-exists-label">
          в МС ✅
        </span>
      </div>
    </div>
    <div class="product-barcode">
      <strong>Баркод:</strong> {{ product.barcode || 'Нет' }}
    </div>
    <div v-if="product.sizes && product.sizes.length === 1" class="product-complect">
      <label class="complect-label">Комплект:</label>
      <input
        type="checkbox"
        :checked="product.complect"
        @change="handleComplectToggle"
        :disabled="
          isActionInProgress(product._id, 'updateComplect')
          || product.ms_href_general
          || (product.sizes && product.sizes.some(size => size.ms_href))
        "
        class="complect-checkbox"
      />
    </div>
    <div v-else class="product-complect-placeholder"></div>

    <div v-if="showActions" class="product-actions">
      <button @click="emit('create-in-ms', product)" class="action-btn create-ms" :disabled="isActionInProgress(product._id, 'createMs')">
        {{ isActionInProgress(product._id, 'createMs') ? 'Создаётся...' : 'Создать в МС' }}
      </button>
      <button
        v-if="product.sizes && product.sizes.length > 1 && !product.ms_href_general"
        @click="emit('create-variants', product)"
        class="action-btn create-kit"
        :disabled="isActionInProgress(product._id, 'createVariants') || product.sizes.every(size => size.ms_href)"
      >
        {{ isActionInProgress(product._id, 'createVariants') ? 'Создаются...' : 'Создать модификации' }}
      </button>

      <button
          v-else-if="product.sizes && product.sizes.length > 1 && product.ms_href_general && !product.sizes.every(size => size.ms_href)"
          @click="emit('create-variants', product)"
          class="action-btn create-kit"
          :disabled="isActionInProgress(product._id, 'createVariants') || product.sizes.every(size => size.ms_href)"
      >
          {{ isActionInProgress(product._id, 'createVariants') ? 'Создаются...' : 'Создать модификации' }}
      </button>

      <button @click="emit('link-to-product', product)" class="action-btn link-product" :disabled="isActionInProgress(product._id, 'linkProduct')">Связать с товаром</button>
      <button @click="emit('unlink-product', product)" class="action-btn unlink-product" :disabled="isActionInProgress(product._id, 'unlinkProduct')">Удалить связку</button>
    </div>
    
    <!-- Колонка для цен -->
    <div v-if="!showActions" class="product-prices">
      <div class="price-item">
        <strong>Цена на WB:</strong> <span class="price-value">—</span>
      </div>
      <div class="price-item">
        <strong>Цена в МС:</strong> <span class="price-value">—</span>
      </div>
      <div class="price-item">
        <strong>Себестоимость в МС:</strong> <span class="price-value">—</span>
      </div>
    </div>
    
    <!-- Колонка для остатков -->
    <div v-if="!showActions" class="product-stocks">
      <div class="stock-item">
        <strong>Остаток в МС:</strong> <span class="stock-value">—</span>
      </div>
      <div class="stock-item">
        <strong>Остаток FBS:</strong> <span class="stock-value">—</span>
      </div>
      <div class="stock-item">
        <strong>Остаток FBY WB:</strong> <span class="stock-value">—</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  product: Object,
  isSelected: Boolean,
  isActionInProgress: Function,
  showIntegrationInfo: {
    type: Boolean,
    default: false
  },
  showActions: {
    type: Boolean,
    default: true
  },
  integrationLinks: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits([
  'toggle-select',
  'create-in-ms',
  'create-variants',
  'link-to-product',
  'unlink-product',
  'toggle-complect',
  'open-image-modal',
]);

const handleComplectToggle = (event) => {
    console.log('ProductListItem: Чекбокс "Комплект" изменен.');
    console.log('ID товара:', props.product._id);
    console.log('Новое значение:', event.target.checked);
    emit('toggle-complect', props.product._id, event.target.checked);
};

const getIntegrationName = (integrationLinkId) => {
  const integration = props.integrationLinks.find(link => link._id === integrationLinkId);
  if (integration) {
    return `${integration.wbCabinet.name} - ${integration.storage.name}`;
  }
  return 'Неизвестная интеграция';
};

const handleImageError = (event) => {
  // При ошибке загрузки изображения заменяем на placeholder
  event.target.style.display = 'none';
  event.target.nextElementSibling.style.display = 'flex';
};

const openImageModal = () => {
  if (props.product.photos && props.product.photos.length > 0 && props.product.photos[0].big) {
    emit('open-image-modal', {
      imageUrl: props.product.photos[0].big,
      productTitle: props.product.title
    });
  }
};
</script>

<style scoped>
/* Ваши текущие стили */
.product-item {
  display: grid;
  grid-template-columns: 60px 80px 3fr 2fr 1fr 2fr 2fr; /* Обновленная структура с 7 колонками */
  gap: 15px;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  background-color: #f9f9f9;
}
.product-item.header {
  grid-template-columns: 60px 80px 3fr 2fr 1fr 2fr 2fr; /* Обновленная структура с 7 колонками */
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

.product-image {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
}

.product-thumbnail {
  max-width: 100%;
  max-height: 100%;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #eee;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.product-thumbnail:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.no-image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: #f8f9fa;
  border: 1px dashed #ccc;
  border-radius: 4px;
  color: #666;
  font-size: 12px;
  text-align: center;
}

.ms-link {
  margin-top: 5px;
  font-size: 0.9em;
}

.ms-exists-label {
  color: #28a745;
  font-weight: bold;
}

/* НОВЫЙ СТИЛЬ для иконки ✅ рядом с размером */
.ms-size-link-icon {
  color: #28a745; /* Зеленый цвет для галочки */
  font-weight: bold;
  margin-left: 5px; /* Небольшой отступ от текста размера */
}

.product-complect {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 0.9em;
  color: #555;
}

.complect-label {
  margin-bottom: 5px;
  font-weight: bold;
}

.complect-checkbox {
  transform: scale(1.3);
  cursor: pointer;
}
.complect-checkbox:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

/* НОВЫЕ СТИЛИ для плейсхолдера, чтобы сохранить сетку */
.product-complect-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-size: 0.8em;
    color: #999;
    min-height: 50px;
}

.product-barcode {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 0.9em;
  color: #555;
}
.complect-info {
    padding: 5px 0;
}

/* Стили для колонок с ценами и остатками */
.product-prices {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.price-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9em;
  padding: 4px 0;
}

.price-item strong {
  color: #495057;
  font-weight: 600;
}

.price-value {
  color: #6c757d;
  font-weight: 500;
}

/* Стили для колонки с остатками */
.product-stocks {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.stock-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9em;
  padding: 4px 0;
}

.stock-item strong {
  color: #495057;
  font-weight: 600;
}

.stock-value {
  color: #6c757d;
  font-weight: 500;
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
  /* Добавьте display: flex и align-items: center для выравнивания галочки */
  display: flex;
  align-items: center;
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
.action-btn:disabled {
  background-color: #cccccc !important;
  cursor: not-allowed;
  transform: none;
  opacity: 0.8;
}
.create-ms {
  background-color: #5cb85c;
  color: white;
}
.create-ms:hover {
  background-color: #4cae4c;
}
.create-kit {
  background-color: #f0ad4e;
  color: white;
}
.create-kit:hover {
  background-color: #ec971f;
}
.link-product {
  background-color: #5bc0de;
  color: white;
}
.link-product:hover {
  background-color: #31b0d5;
}
.unlink-product {
  background-color: #d9534f;
  color: white;
}
.unlink-product:hover {
  background-color: #c9302c;
}



.product-actions-disabled {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  background-color: #f8f9fa;
  border: 1px dashed #ccc;
  border-radius: 4px;
}

.actions-disabled-text {
  color: #666;
  font-size: 0.85em;
  font-style: italic;
}

@media (max-width: 768px) {
  .product-item {
    grid-template-columns: 60px 80px 1fr;
    flex-direction: column;
    align-items: flex-start;
  }
  .product-item.header {
    grid-template-columns: 60px 80px 1fr;
  }
  .product-item .header-sizes,
  .product-item .header-actions,
  .product-item .header-complect {
    display: none;
  }
  .product-sizes,
  .product-actions,
  .product-complect,
  .product-complect-placeholder,
  .product-prices,
  .product-stocks,
  .product-barcode {
    display: none;
  }
  .product-image {
    width: 60px;
    height: 60px;
  }
  .product-actions {
    justify-content: flex-start;
  }
}
</style>
