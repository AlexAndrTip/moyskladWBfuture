// src/views/PostavkiPage/composables/usePostavki.js
import { ref, watch } from 'vue';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function usePostavki(selectedIntegrationId, getToken) {
  const postavki = ref([]);
  const loadingPostavki = ref(false);
  const postavkiError = ref('');
  const postavkiSummary = ref(null);
  
  // Пагинация
  const currentPage = ref(1);
  const totalPages = ref(1);
  const totalPostavki = ref(0);
  const postavkiPerPage = ref(20);
  const pageInput = ref(1);
  
  // Фильтры
  const search = ref('');
  const dateFrom = ref('');
  const dateTo = ref('');
  const status = ref('');
  const exported = ref('');
  
  let searchTimeout = null;

  const fetchPostavki = async () => {
    if (!selectedIntegrationId.value) {
      postavki.value = [];
      loadingPostavki.value = false;
      postavkiError.value = '';
      postavkiSummary.value = null;
      currentPage.value = 1;
      totalPages.value = 1;
      totalPostavki.value = 0;
      return;
    }

    loadingPostavki.value = true;
    postavkiError.value = '';
    try {
      // Формируем query параметры
      const params = {
        page: currentPage.value,
        limit: postavkiPerPage.value,
      };
      
      if (search.value) params.search = search.value;
      if (dateFrom.value) params.dateFrom = dateFrom.value;
      if (dateTo.value) params.dateTo = dateTo.value;
      if (status.value) params.status = status.value;
      if (exported.value) params.exported = exported.value;
      
      const response = await axios.get(`${API_BASE_URL}/postavki/${selectedIntegrationId.value}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
        params
      });
      
      if (response.data.data && response.data.summary) {
        postavki.value = response.data.data;
        postavkiSummary.value = response.data.summary;
        currentPage.value = response.data.currentPage || 1;
        totalPages.value = response.data.totalPages || 1;
        totalPostavki.value = response.data.totalPostavki || 0;
      } else {
        postavki.value = response.data;
        postavkiSummary.value = null;
        currentPage.value = 1;
        totalPages.value = 1;
        totalPostavki.value = postavki.value.length;
      }
      
      pageInput.value = currentPage.value;
    } catch (error) {
      postavkiError.value = error.response?.data?.message || 'Ошибка загрузки поставок';
      postavki.value = [];
      postavkiSummary.value = null;
    } finally {
      loadingPostavki.value = false;
    }
  };

  const refreshFromWB = async () => {
    if (!selectedIntegrationId.value) return;
    loadingPostavki.value = true;
    postavkiError.value = '';
    try {
      // Формируем query параметры для фильтров
      const params = {
        page: currentPage.value,
        limit: postavkiPerPage.value,
      };
      
      if (search.value) params.search = search.value;
      if (dateFrom.value) params.dateFrom = dateFrom.value;
      if (dateTo.value) params.dateTo = dateTo.value;
      if (status.value) params.status = status.value;
      if (exported.value) params.exported = exported.value;
      
      // Запрос на обновление из WB с учетом фильтров
      const response = await axios.post(`${API_BASE_URL}/postavki/${selectedIntegrationId.value}/refresh`, {}, {
        headers: { Authorization: `Bearer ${getToken()}` },
        params
      });
      
      // Обрабатываем ответ с обновленными данными
      if (response.data.data && response.data.summary) {
        postavki.value = response.data.data;
        postavkiSummary.value = response.data.summary;
        currentPage.value = response.data.currentPage || 1;
        totalPages.value = response.data.totalPages || 1;
        totalPostavki.value = response.data.totalPostavki || 0;
      } else {
        postavki.value = response.data;
        postavkiSummary.value = null;
        currentPage.value = 1;
        totalPages.value = 1;
        totalPostavki.value = postavki.value.length;
      }
      
      pageInput.value = currentPage.value;
    } catch (error) {
      postavkiError.value = error.response?.data?.message || 'Ошибка обновления из WB';
    } finally {
      loadingPostavki.value = false;
    }
  };

  // Функции пагинации
  const changePage = (page) => {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page;
      fetchPostavki();
    }
  };

  const onPostavkiPerPageChange = () => {
    currentPage.value = 1;
    fetchPostavki();
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

  // Debounced поиск
  const debouncedSearch = () => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    searchTimeout = setTimeout(() => {
      currentPage.value = 1;
      fetchPostavki();
    }, 300);
  };

  const clearSearch = () => {
    search.value = '';
    currentPage.value = 1;
    fetchPostavki();
  };

  const resetFilters = () => {
    search.value = '';
    dateFrom.value = '';
    dateTo.value = '';
    status.value = '';
    exported.value = '';
    currentPage.value = 1;
    fetchPostavki();
  };

  // Watchers для автоматического обновления при изменении фильтров
  watch([dateFrom, dateTo, status, exported], () => {
    currentPage.value = 1;
    fetchPostavki();
  });

  watch(search, () => {
    debouncedSearch();
  });

  watch(selectedIntegrationId, (newVal, oldVal) => {
    if (newVal && newVal !== oldVal) {
      currentPage.value = 1;
      search.value = '';
      dateFrom.value = '';
      dateTo.value = '';
      status.value = '';
      exported.value = '';
      fetchPostavki();
    }
  });

  return {
    // Данные
    postavki,
    loadingPostavki,
    postavkiError,
    postavkiSummary,
    
    // Пагинация
    currentPage,
    totalPages,
    totalPostavki,
    postavkiPerPage,
    pageInput,
    
    // Фильтры
    search,
    dateFrom,
    dateTo,
    status,
    exported,
    
    // Функции
    fetchPostavki,
    refreshFromWB,
    changePage,
    onPostavkiPerPageChange,
    goToPage,
    debouncedSearch,
    clearSearch,
    resetFilters,
  };
} 