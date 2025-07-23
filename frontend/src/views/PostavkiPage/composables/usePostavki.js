import { ref, watch, computed } from 'vue';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function usePostavki(selectedIntegrationId, getToken) {
  const postavki = ref([]);
  const postavkiLoading = ref(false);
  const postavkiError = ref('');
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
  
  const statusOptions = [
    '', 'Принято', 'Ожидает', 'Отгружено', 'Отменено', 'Ошибка', 'В обработке'
  ];

  let searchTimeout = null;

  const fetchPostavki = async () => {
    if (!selectedIntegrationId.value) {
      postavki.value = [];
      postavkiLoading.value = false;
      postavkiError.value = '';
      currentPage.value = 1;
      totalPages.value = 1;
      totalPostavki.value = 0;
      return;
    }

    postavkiLoading.value = true;
    postavkiError.value = '';
    try {
      const params = {
        page: currentPage.value,
        limit: postavkiPerPage.value,
        search: search.value,
        dateFrom: dateFrom.value,
        dateTo: dateTo.value,
        status: status.value,
        exported: exported.value,
      };
      
      const response = await axios.get(`${API_BASE_URL}/postavki/${selectedIntegrationId.value}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
        params
      });
      
      if (response.data.data) {
        postavki.value = response.data.data;
        currentPage.value = response.data.currentPage || 1;
        totalPages.value = response.data.totalPages || 1;
        totalPostavki.value = response.data.totalPostavki || response.data.data.length;
        pageInput.value = currentPage.value;
      } else {
        postavki.value = response.data;
        currentPage.value = 1;
        totalPages.value = 1;
        totalPostavki.value = response.data.length;
        pageInput.value = 1;
      }
    } catch (error) {
      postavkiError.value = error.response?.data?.message || 'Ошибка при загрузке поставок.';
      console.error('Fetch postavki error:', error);
      postavki.value = [];
    } finally {
      postavkiLoading.value = false;
    }
  };

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

  const refreshFromWB = async () => {
    if (!selectedIntegrationId.value) return;
    
    postavkiLoading.value = true;
    postavkiError.value = '';
    try {
      const params = {
        page: currentPage.value,
        limit: postavkiPerPage.value,
        search: search.value,
        dateFrom: dateFrom.value,
        dateTo: dateTo.value,
        status: status.value,
        exported: exported.value,
      };
      
      const response = await axios.post(`${API_BASE_URL}/postavki/${selectedIntegrationId.value}/refresh`, {}, {
        headers: { Authorization: `Bearer ${getToken()}` },
        params
      });
      
      if (response.data.data) {
        postavki.value = response.data.data;
        currentPage.value = response.data.currentPage || 1;
        totalPages.value = response.data.totalPages || 1;
        totalPostavki.value = response.data.totalPostavki || response.data.data.length;
        pageInput.value = currentPage.value;
      } else {
        postavki.value = response.data;
        currentPage.value = 1;
        totalPages.value = 1;
        totalPostavki.value = response.data.length;
        pageInput.value = 1;
      }
    } catch (error) {
      postavkiError.value = error.response?.data?.message || 'Ошибка обновления из WB';
    } finally {
      postavkiLoading.value = false;
    }
  };

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

  // Автоматический вызов fetchPostavki при изменении любого фильтра
  watch([dateFrom, dateTo, status, exported], () => {
    if (selectedIntegrationId.value) {
      currentPage.value = 1;
      fetchPostavki();
    }
  });

  return {
    postavki,
    postavkiLoading,
    postavkiError,
    currentPage,
    totalPages,
    totalPostavki,
    postavkiPerPage,
    pageInput,
    search,
    dateFrom,
    dateTo,
    status,
    exported,
    statusOptions,
    fetchPostavki,
    changePage,
    onPostavkiPerPageChange,
    goToPage,
    debouncedSearch,
    clearSearch,
    resetFilters,
    refreshFromWB,
  };
} 