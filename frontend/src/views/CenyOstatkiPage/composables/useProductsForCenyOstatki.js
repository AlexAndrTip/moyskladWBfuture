// src/views/CenyOstatkiPage/composables/useProductsForCenyOstatki.js
import { ref, watch, computed } from 'vue';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function useProductsForCenyOstatki(selectedIntegrationId, getToken, msFilter, searchTerm) {
  const products = ref([]);
  const productsLoading = ref(false);
  const productsError = ref('');
  const currentPage = ref(1);
  const totalPages = ref(1);
  const totalProducts = ref(0);
  const productsPerPage = ref(20);
  const pageInput = ref(1);
  
  // Кэш для загруженных страниц
  const pageCache = ref(new Map());
  const loadingPages = ref(new Set());
  
  let searchTimeout = null;

  // Функция для получения ключа кэша
  const getCacheKey = (page, searchTerm, msFilter, productsPerPage) => {
    return `${page}_${searchTerm || ''}_${msFilter || ''}_${productsPerPage}`;
  };

  // Функция для очистки кэша при изменении фильтров
  const clearCache = () => {
    pageCache.value.clear();
    loadingPages.value.clear();
  };

  // Функция для управления размером кэша
  const manageCacheSize = () => {
    const cacheSize = pageCache.value.size;
    if (cacheSize > 50) { // Максимум 50 страниц в кэше
      // Удаляем самые старые записи
      const entries = Array.from(pageCache.value.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toDelete = entries.slice(0, cacheSize - 40); // Оставляем 40 страниц
      toDelete.forEach(([key]) => pageCache.value.delete(key));
      console.log(`[CACHE] Очищен кэш, удалено ${toDelete.length} старых страниц`);
    }
  };

  const fetchProducts = async (page = currentPage.value, forceRefresh = false) => {
    if (!selectedIntegrationId.value) {
      products.value = [];
      productsLoading.value = false;
      productsError.value = '';
      currentPage.value = 1;
      totalPages.value = 1;
      totalProducts.value = 0;
      return;
    }

    const cacheKey = getCacheKey(page, searchTerm.value, msFilter.value, productsPerPage.value);
    
    // Проверяем кэш, если не требуется принудительное обновление
    if (!forceRefresh && pageCache.value.has(cacheKey)) {
      console.log(`[CACHE] Загружаем страницу ${page} из кэша`);
      const cachedData = pageCache.value.get(cacheKey);
      products.value = cachedData.products;
      currentPage.value = page;
      totalPages.value = cachedData.totalPages;
      totalProducts.value = cachedData.totalProducts;
      pageInput.value = page;
      return;
    }

    // Проверяем, не загружается ли уже эта страница
    if (loadingPages.value.has(cacheKey)) {
      console.log(`[LOADING] Страница ${page} уже загружается`);
      return;
    }

    // Помечаем страницу как загружающуюся
    loadingPages.value.add(cacheKey);
    
    // Показываем общий индикатор загрузки только для первой загрузки
    if (page === 1) {
      productsLoading.value = true;
    }
    
    productsError.value = '';
    
    try {
      const params = {
        page: page,
        limit: productsPerPage.value,
        searchTerm: searchTerm.value,
        msFilter: msFilter.value,
      };

      // Определяем URL в зависимости от выбранной интеграции
      const url = selectedIntegrationId.value === 'all' 
        ? `${API_BASE_URL}/products/all`
        : `${API_BASE_URL}/products/${selectedIntegrationId.value}`;

      console.log(`[API] Загружаем страницу ${page} с параметрами:`, params);
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${getToken()}` },
        params
      });
      
      if (response.data.success) {
        const responseData = response.data;
        
        // Кэшируем результат
        pageCache.value.set(cacheKey, {
          products: responseData.products,
          totalPages: responseData.totalPages,
          totalProducts: responseData.totalProducts,
          timestamp: Date.now()
        });
        
        // Управляем размером кэша
        manageCacheSize();
        
        // Обновляем состояние только если это текущая страница
        if (page === currentPage.value) {
          products.value = responseData.products;
          currentPage.value = responseData.currentPage;
          totalPages.value = responseData.totalPages;
          totalProducts.value = responseData.totalProducts;
          pageInput.value = responseData.currentPage;
        }
        
        console.log(`[API] Страница ${page} загружена успешно, товаров: ${responseData.products.length}`);
        
        // Предзагружаем следующую страницу в фоне
        if (page < responseData.totalPages && !forceRefresh) {
          setTimeout(() => {
            preloadNextPage(page + 1);
          }, 100);
        }
      } else {
        productsError.value = response.data.message || 'Ошибка при загрузке товаров.';
        if (page === 1) {
          products.value = [];
        }
      }
    } catch (error) {
      console.error(`[API] Ошибка загрузки страницы ${page}:`, error);
      
      // Проверяем, является ли это ошибкой авторизации пользователя
      if (error.response?.status === 401) {
        productsError.value = 'Ошибка авторизации. Пожалуйста, войдите в систему заново.';
        if (page === 1) {
          products.value = [];
        }
      } else {
        // Другие ошибки (сеть, сервер и т.д.)
        productsError.value = error.response?.data?.message || 'Ошибка при загрузке товаров.';
        if (page === 1) {
          products.value = [];
        }
      }
    } finally {
      // Убираем страницу из загружающихся
      loadingPages.value.delete(cacheKey);
      
      // Скрываем общий индикатор загрузки
      if (page === 1) {
        productsLoading.value = false;
      }
    }
  };

  // Функция предзагрузки следующей страницы
  const preloadNextPage = async (page) => {
    if (page > totalPages.value || !selectedIntegrationId.value) return;
    
    const cacheKey = getCacheKey(page, searchTerm.value, msFilter.value, productsPerPage.value);
    
    // Проверяем, не загружена ли уже страница
    if (pageCache.value.has(cacheKey) || loadingPages.value.has(cacheKey)) return;
    
    console.log(`[PRELOAD] Предзагружаем страницу ${page}`);
    
    try {
      const params = {
        page: page,
        limit: productsPerPage.value,
        searchTerm: searchTerm.value,
        msFilter: msFilter.value,
      };

      const url = selectedIntegrationId.value === 'all' 
        ? `${API_BASE_URL}/products/all`
        : `${API_BASE_URL}/products/${selectedIntegrationId.value}`;

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${getToken()}` },
        params
      });
      
      if (response.data.success) {
        const responseData = response.data;
        
        // Кэшируем результат
        pageCache.value.set(cacheKey, {
          products: responseData.products,
          totalPages: responseData.totalPages,
          totalProducts: responseData.totalProducts,
          timestamp: Date.now()
        });
        
        // Управляем размером кэша
        manageCacheSize();
        
        console.log(`[PRELOAD] Страница ${page} предзагружена успешно`);
      }
    } catch (error) {
      console.log(`[PRELOAD] Ошибка предзагрузки страницы ${page}:`, error.message);
      // Не показываем ошибку пользователю для предзагрузки
    }
  };

  const changePage = (page) => {
    if (page >= 1 && page <= totalPages.value && page !== currentPage.value) {
      currentPage.value = page;
      fetchProducts(page);
    }
  };

  const onProductsPerPageChange = (newProductsPerPage) => {
    if (newProductsPerPage && newProductsPerPage !== productsPerPage.value) {
      productsPerPage.value = newProductsPerPage;
      currentPage.value = 1;
      clearCache(); // Очищаем кэш при изменении размера страницы
      fetchProducts(1, true); // Принудительно обновляем
    }
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

  // Функция для быстрого перехода на страницу (с предзагрузкой соседних)
  const quickGoToPage = async (page) => {
    if (page >= 1 && page <= totalPages.value && page !== currentPage.value) {
      currentPage.value = page;
      
      // Предзагружаем соседние страницы для быстрого перехода
      const pagesToPreload = [];
      if (page > 1) pagesToPreload.push(page - 1);
      if (page < totalPages.value) pagesToPreload.push(page + 1);
      
      // Загружаем текущую страницу
      await fetchProducts(page);
      
      // Предзагружаем соседние в фоне
      pagesToPreload.forEach(p => {
        setTimeout(() => preloadNextPage(p), 200);
      });
    }
  };

  const debouncedSearch = () => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    searchTimeout = setTimeout(() => {
      currentPage.value = 1;
      clearCache(); // Очищаем кэш при поиске
      fetchProducts(1, true); // Принудительно обновляем
    }, 300);
  };

  const clearSearch = () => {
    searchTerm.value = '';
    currentPage.value = 1;
    clearCache(); // Очищаем кэш при очистке поиска
    fetchProducts(1, true); // Принудительно обновляем
  };

  // Функция для проверки, загружается ли конкретная страница
  const isPageLoading = (page) => {
    const cacheKey = getCacheKey(page, searchTerm.value, msFilter.value, productsPerPage.value);
    return loadingPages.value.has(cacheKey);
  };

  // Функция для проверки, загружена ли конкретная страница
  const isPageLoaded = (page) => {
    const cacheKey = getCacheKey(page, searchTerm.value, msFilter.value, productsPerPage.value);
    return pageCache.value.has(cacheKey);
  };

  watch(selectedIntegrationId, (newVal, oldVal) => {
    if (newVal && newVal !== oldVal) {
      currentPage.value = 1;
      searchTerm.value = '';
      clearCache(); // Очищаем кэш при смене интеграции
      fetchProducts(1, true); // Принудительно обновляем
    }
  });

  // Очищаем кэш при изменении фильтров
  watch([msFilter, productsPerPage], () => {
    clearCache();
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
    quickGoToPage,
    debouncedSearch,
    clearSearch,
    isPageLoading,
    isPageLoaded,
    clearCache,
  };
} 