<template>
  <div class="product-item-ceny-ostatki">
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
    
    <!-- Селектор размеров -->
    <div class="sizes-section">
      <SizeSelector
        :sizes="product.sizes || []"
        :selected-size-id="selectedSizeId"
        @size-change="onSizeChange"
      />
    </div>
    
    <!-- Баркоды для выбранного размера -->
    <div class="barcodes-section">
      <strong>Баркоды:</strong>
      <div v-if="selectedSize && selectedSize.skus && selectedSize.skus.length > 0" class="barcode-list">
        <span v-for="sku in selectedSize.skus" :key="sku" class="barcode-item">
          {{ sku }}
        </span>
      </div>
      <div v-else class="no-barcodes">
        Выберите размер для просмотра баркодов
      </div>
    </div>
    
    <!-- Цены для выбранного размера -->
    <div class="prices-section">
      <strong>Цены:</strong>
      <div v-if="selectedSize" class="price-list">
        <div class="price-item">
          <span class="price-label">WB:</span> 
          <span class="price-value">{{ formatPrice(selectedSize.priceWB) }}</span>
        </div>
        <div class="price-item">
          <span class="price-label">Акция клуб:</span> 
          <span class="price-value">{{ formatPrice(selectedSize.clubDiscountedPriceWB) }}</span>
        </div>
        <div class="price-item">
          <span class="price-label">Акция:</span> 
          <span class="price-value">{{ formatPrice(selectedSize.discountedPriceWB) }}</span>
        </div>
        <div class="price-item">
          <span class="price-label">МС:</span> 
          <span class="price-value">{{ formatPrice(selectedSize.priceMS) }}</span>
        </div>
        <div class="price-item">
          <span class="price-label">Себестоимость:</span> 
          <span class="price-value">{{ formatPrice(selectedSize.costPriceMS) }}</span>
        </div>
      </div>
      <div v-else class="no-prices">
        Выберите размер для просмотра цен
      </div>
    </div>
    
    <!-- Остатки для выбранного размера -->
    <div class="stocks-section">
      <strong>Остатки:</strong>
      <div v-if="selectedSize" class="stock-list">
        <div class="stock-item">
          <span class="stock-label">МС:</span> 
          <span class="stock-value">{{ formatStock(selectedSize.stockMS) }}</span>
        </div>
        <div class="stock-item">
          <span class="stock-label">FBS:</span> 
          <span class="stock-value">{{ formatStock(selectedSize.stockFBS) }}</span>
        </div>
        <div class="stock-item">
          <span class="stock-label">FBY WB:</span> 
          <span class="stock-value">{{ formatStock(selectedSize.stockFBY) }}</span>
        </div>
      </div>
      <div v-else class="no-stocks">
        Выберите размер для просмотра остатков
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, computed, ref, watch } from 'vue';
import SizeSelector from './SizeSelector.vue';

const props = defineProps({
  product: Object,
  showIntegrationInfo: {
    type: Boolean,
    default: false
  },
  integrationLinks: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['open-image-modal']);

// Состояние для выбранного размера
const selectedSizeId = ref(null);

// Вычисляем выбранный размер
const selectedSize = computed(() => {
  if (!selectedSizeId.value || !props.product.sizes) return null;
  return props.product.sizes.find(size => size.chrtID === selectedSizeId.value);
});

// Обработчик изменения размера
const onSizeChange = (sizeId) => {
  selectedSizeId.value = sizeId;
};

// Устанавливаем первый размер по умолчанию при загрузке товара
const setDefaultSize = () => {
  if (props.product.sizes && props.product.sizes.length > 0) {
    selectedSizeId.value = props.product.sizes[0].chrtID;
  }
};

// Следим за изменением товара и устанавливаем размер по умолчанию
watch(() => props.product, () => {
  setDefaultSize();
}, { immediate: true });

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

// Функция для форматирования цен
const formatPrice = (price) => {
  if (typeof price !== 'number' || price <= 0) {
    return '—';
  }
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
};

// Функция для форматирования остатков
const formatStock = (stock) => {
  if (typeof stock !== 'number' || stock < 0) {
    return '—';
  }
  return stock.toString();
};
</script>

<style scoped>
.product-item-ceny-ostatki {
  display: grid;
  grid-template-columns: 80px 3fr 2fr 2fr 2fr 2fr;
  gap: 15px;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  align-items: start;
  background-color: white;
}

.product-item-ceny-ostatki:hover {
  background-color: #f8f9fa;
}

.product-image {
  text-align: center;
}

.product-thumbnail {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid #ddd;
}

.no-image-placeholder {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 4px;
  color: #6c757d;
  font-size: 12px;
  text-align: center;
}

.product-info {
  line-height: 1.6;
}

.ms-link {
  margin-top: 8px;
}

.ms-exists-label {
  background-color: #d4edda;
  color: #155724;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.sizes-section {
  display: flex;
  flex-direction: column;
}

.barcodes-section,
.prices-section,
.stocks-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.barcode-list,
.price-list,
.stock-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.barcode-item {
  padding: 4px 8px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  color: #495057;
}

.price-item,
.stock-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  background-color: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #dee2e6;
}

.price-label,
.stock-label {
  font-size: 12px;
  color: #6c757d;
}

.price-value,
.stock-value {
  font-weight: 600;
  color: #007bff;
  font-size: 12px;
}

.no-barcodes,
.no-prices,
.no-stocks {
  color: #6c757d;
  font-style: italic;
  font-size: 12px;
  text-align: center;
  padding: 8px;
  background-color: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #dee2e6;
}

/* Адаптивность */
@media (max-width: 1200px) {
  .product-item-ceny-ostatki {
    grid-template-columns: 80px 2fr 1fr 1fr 1fr 1fr;
    gap: 10px;
    padding: 10px 15px;
  }
}

@media (max-width: 768px) {
  .product-item-ceny-ostatki {
    grid-template-columns: 1fr;
    gap: 15px;
    padding: 15px;
  }
  
  .product-image {
    text-align: center;
  }
  
  .product-thumbnail,
  .no-image-placeholder {
    width: 80px;
    height: 80px;
  }
}
</style>
