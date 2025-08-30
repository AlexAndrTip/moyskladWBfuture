// src/views/TovaryPage/composables/useProducts.js
import { ref, watch, computed } from 'vue';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function useProducts(selectedIntegrationId, getToken, msFilter) {
  const products = ref([]);
  const productsLoading = ref(false);
  const productsError = ref('');
  const currentPage = ref(1);
  const totalPages = ref(1);
  const totalProducts = ref(0);
  const productsPerPage = ref(20);
  const pageInput = ref(1);
  const searchTerm = ref('');
  let searchTimeout = null;

  const fetchProducts = async () => {
    if (!selectedIntegrationId.value) {
      products.value = [];
      productsLoading.value = false;
      productsError.value = '';
      currentPage.value = 1;
      totalPages.value = 1;
      totalProducts.value = 0;
      return;
    }

    productsLoading.value = true;
    productsError.value = '';
    
    try {
      const params = {
        page: currentPage.value,
        limit: productsPerPage.value,
        searchTerm: searchTerm.value,
        msFilter: msFilter.value,
      };

      // Определяем URL в зависимости от выбранной интеграции
      const url = selectedIntegrationId.value === 'all' 
        ? `${API_BASE_URL}/products/all`
        : `${API_BASE_URL}/products/${selectedIntegrationId.value}`;

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${getToken()}` },
        params
      });
      
      if (response.data.success) {
        products.value = response.data.products;
        currentPage.value = response.data.currentPage;
        totalPages.value = response.data.totalPages;
        totalProducts.value = response.data.totalProducts;
        pageInput.value = currentPage.value;
      } else {
        productsError.value = response.data.message || 'Ошибка при загрузке товаров.';
        products.value = [];
      }
    } catch (error) {
      console.error('Fetch products error:', error);
      
      // Проверяем, является ли это ошибкой авторизации пользователя
      if (error.response?.status === 401) {
        // Это ошибка авторизации пользователя, не токена WB
        productsError.value = 'Ошибка авторизации. Пожалуйста, войдите в систему заново.';
        products.value = [];
      } else {
        // Другие ошибки (сеть, сервер и т.д.)
        productsError.value = error.response?.data?.message || 'Ошибка при загрузке товаров.';
        products.value = [];
      }
    } finally {
      productsLoading.value = false;
    }
  };

  const changePage = (page) => {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page;
      fetchProducts();
    }
  };

  const onProductsPerPageChange = () => {
    currentPage.value = 1;
    fetchProducts();
  };

  const goToPage = () => {
    const page = parseInt(pageInput.value);
    if (!isNaN(page) && page >= 1 && page <= totalPages.value) {
      changePage(page);
    } else {
      alert(`Пожалуйста, введите номер страницы от 1 до ${totalPages.value}.`);
      pageInput.value = currentPage.value;
    }
  };

  const debouncedSearch = () => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    searchTimeout = setTimeout(() => {
      currentPage.value = 1;
      fetchProducts();
    }, 300);
  };

  const clearSearch = () => {
    searchTerm.value = '';
    currentPage.value = 1;
    fetchProducts();
  };

  watch(selectedIntegrationId, (newVal, oldVal) => {
    if (newVal && newVal !== oldVal) {
      currentPage.value = 1;
      searchTerm.value = '';
      fetchProducts();
    }
  });

  return {
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
  };
}
