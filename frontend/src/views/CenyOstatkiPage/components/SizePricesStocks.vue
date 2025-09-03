<template>
  <div class="size-prices-stocks">
    <!-- Цены для выбранного размера -->
    <div class="prices-section">
      <h4>Цены для размера {{ selectedSize?.techSize }}</h4>
      <div class="price-grid">
        <div class="price-item">
          <strong>Цена на WB:</strong> 
          <span class="price-value">
            {{ formatPrice(selectedSize?.priceWB) }}
          </span>
        </div>
        <div class="price-item">
          <strong>Цена по акции клуб:</strong> 
          <span class="price-value">
            {{ formatPrice(selectedSize?.clubDiscountedPriceWB) }}
          </span>
        </div>
        <div class="price-item">
          <strong>Цена по акции:</strong> 
          <span class="price-value">
            {{ formatPrice(selectedSize?.discountedPriceWB) }}
          </span>
        </div>
        <div class="price-item">
          <strong>Цена в МС:</strong> 
          <span class="price-value">
            {{ formatPrice(selectedSize?.priceMS) }}
          </span>
        </div>
        <div class="price-item">
          <strong>Себестоимость в МС:</strong> 
          <span class="price-value">
            {{ formatPrice(selectedSize?.costPriceMS) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Остатки для выбранного размера -->
    <div class="stocks-section">
      <h4>Остатки для размера {{ selectedSize?.techSize }}</h4>
      <div class="stock-grid">
        <div class="stock-item">
          <strong>Остаток в МС:</strong> 
          <span class="stock-value">
            {{ formatStock(selectedSize?.stockMS) }}
          </span>
        </div>
        <div class="stock-item">
          <strong>Остаток FBS:</strong> 
          <span class="stock-value">
            {{ formatStock(selectedSize?.stockFBS) }}
          </span>
        </div>
        <div class="stock-item">
          <strong>Остаток FBY WB:</strong> 
          <span class="stock-value">
            {{ formatStock(selectedSize?.stockFBY) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Баркоды для выбранного размера -->
    <div class="barcodes-section">
      <h4>Баркоды для размера {{ selectedSize?.techSize }}</h4>
      <div class="barcode-list">
        <div v-if="selectedSize?.skus && selectedSize.skus.length > 0" class="barcode-items">
          <span v-for="sku in selectedSize.skus" :key="sku" class="barcode-item">
            {{ sku }}
          </span>
        </div>
        <div v-else class="no-barcodes">
          Баркоды отсутствуют
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, computed } from 'vue';

const props = defineProps({
  sizes: {
    type: Array,
    default: () => []
  },
  selectedSizeId: {
    type: [String, Number],
    default: null
  }
});

// Вычисляем выбранный размер
const selectedSize = computed(() => {
  if (!props.selectedSizeId || !props.sizes) return null;
  return props.sizes.find(size => size.chrtID === props.selectedSizeId);
});

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
.size-prices-stocks {
  padding: 15px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #f8f9fa;
  margin-top: 15px;
}

.prices-section,
.stocks-section,
.barcodes-section {
  margin-bottom: 20px;
}

.prices-section:last-child,
.stocks-section:last-child,
.barcodes-section:last-child {
  margin-bottom: 0;
}

h4 {
  margin: 0 0 10px 0;
  color: #495057;
  font-size: 16px;
  font-weight: 600;
}

.price-grid,
.stock-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.price-item,
.stock-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: white;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.price-value,
.stock-value {
  font-weight: 600;
  color: #007bff;
}

.barcode-list {
  margin-top: 10px;
}

.barcode-items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.barcode-item {
  padding: 6px 12px;
  background-color: white;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-family: monospace;
  font-size: 14px;
  color: #495057;
}

.no-barcodes {
  color: #6c757d;
  font-style: italic;
  padding: 10px;
  background-color: white;
  border-radius: 6px;
  border: 1px solid #e9ecef;
  text-align: center;
}

@media (max-width: 768px) {
  .price-grid,
  .stock-grid {
    grid-template-columns: 1fr;
  }
  
  .price-item,
  .stock-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
}
</style>
