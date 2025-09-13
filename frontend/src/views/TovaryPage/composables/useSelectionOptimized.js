// src/views/TovaryPage/composables/useSelectionOptimized.js
import { ref, computed } from 'vue';

export function useSelectionOptimized(products, totalPages, totalProducts, currentPage, getAllProductsForBulkActions) {
  const selectedProductIds = ref([]);
  const selectedAllPages = ref(false);
  const bulkActionInProgress = ref(false);

  const areAllProductsSelectedOnPage = computed(() => {
    return products.value.length > 0 && selectedProductIds.value.length === products.value.length;
  });

  const toggleSelectAllProducts = () => {
    if (selectedAllPages.value) {
      clearAllPageSelection();
    } else if (areAllProductsSelectedOnPage.value) {
      selectedProductIds.value = [];
    } else {
      selectedProductIds.value = products.value.map(p => p._id);
    }
  };

  const onIndividualCheckboxChange = (event, productId) => {
    if (selectedAllPages.value) {
      selectedAllPages.value = false;
      // Если было выбрано все на всех страницах, сначала включаем текущую страницу
      selectedProductIds.value = products.value.map(p => p._id);
      if (event.target.checked) {
        if (!selectedProductIds.value.includes(productId)) {
          selectedProductIds.value.push(productId);
        }
      } else {
        selectedProductIds.value = selectedProductIds.value.filter(id => id !== productId);
      }
    } else {
      if (event.target.checked) {
        selectedProductIds.value.push(productId);
      } else {
        selectedProductIds.value = selectedProductIds.value.filter(id => id !== productId);
      }
    }
  };

  const selectAllProductsOnAllPages = () => {
    selectedProductIds.value = []; // Очищаем выбор на текущей странице, так как теперь выбрано все
    selectedAllPages.value = true;
  };

  const clearAllPageSelection = () => {
    selectedProductIds.value = [];
    selectedAllPages.value = false;
  };

  // Сброс выбора при смене страницы или интеграции
  const resetSelection = () => {
    selectedProductIds.value = [];
    selectedAllPages.value = false;
  };

  // Функция для получения всех выбранных товаров (включая "выбрать все")
  const getAllSelectedProducts = async () => {
    if (selectedAllPages.value) {
      // Если выбрано "все страницы", загружаем все товары по текущим фильтрам
      console.log('[SELECTION] Получаем все товары для массовых действий...');
      const allProducts = await getAllProductsForBulkActions();
      console.log(`[SELECTION] Получено ${allProducts.length} товаров для массовых действий`);
      return allProducts;
    } else {
      // Если выбраны только товары на текущей странице
      return products.value.filter(p => selectedProductIds.value.includes(p._id));
    }
  };

  // Функция для получения количества выбранных товаров
  const getSelectedProductsCount = computed(() => {
    if (selectedAllPages.value) {
      return totalProducts.value;
    } else {
      return selectedProductIds.value.length;
    }
  });

  // Функция для проверки, есть ли выбранные товары
  const hasSelectedProducts = computed(() => {
    return selectedAllPages.value || selectedProductIds.value.length > 0;
  });

  // Функция для выполнения массового действия
  const executeBulkAction = async (actionFunction) => {
    if (!hasSelectedProducts.value) {
      console.warn('[SELECTION] Нет выбранных товаров для массового действия');
      return { success: false, message: 'Нет выбранных товаров' };
    }

    bulkActionInProgress.value = true;
    
    try {
      const selectedProducts = await getAllSelectedProducts();
      console.log(`[SELECTION] Выполняем массовое действие для ${selectedProducts.length} товаров`);
      
      const result = await actionFunction(selectedProducts);
      
      // Сбрасываем выбор после успешного выполнения
      if (result.success) {
        resetSelection();
      }
      
      return result;
    } catch (error) {
      console.error('[SELECTION] Ошибка при выполнении массового действия:', error);
      return { success: false, message: error.message || 'Ошибка при выполнении действия' };
    } finally {
      bulkActionInProgress.value = false;
    }
  };

  return {
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
  };
}
