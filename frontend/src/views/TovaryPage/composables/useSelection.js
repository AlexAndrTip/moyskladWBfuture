// src/views/TovaryPage/composables/useSelection.js
import { ref, computed } from 'vue';

export function useSelection(products, totalPages, totalProducts, currentPage) {
  const selectedProductIds = ref([]);
  const selectedAllPages = ref(false);

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

  return {
    selectedProductIds,
    selectedAllPages,
    areAllProductsSelectedOnPage,
    toggleSelectAllProducts,
    onIndividualCheckboxChange,
    selectAllProductsOnAllPages,
    clearAllPageSelection,
    resetSelection,
  };
}
