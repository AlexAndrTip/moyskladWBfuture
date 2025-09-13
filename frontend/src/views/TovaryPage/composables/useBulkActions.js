// src/views/TovaryPage/composables/useBulkActions.js
import { ref } from 'vue';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function useBulkActions(getToken, selectedIntegrationId, getAllSelectedProducts, fetchProducts) {
  const isBulkEditModalOpen = ref(false);
  const bulkActionInProgress = ref(false);

  const openBulkEditModal = () => {
    isBulkEditModalOpen.value = true;
  };

  const closeBulkEditModal = () => {
    isBulkEditModalOpen.value = false;
  };

  const bulkCreateInMs = async () => {
    bulkActionInProgress.value = true;

    try {
      // Получаем все выбранные товары через оптимизированный composable
      const allProducts = await getAllSelectedProducts();
      
      if (!allProducts || allProducts.length === 0) {
        alert('Нет выбранных товаров для массового действия.');
        return;
      }

      // Группируем товары по интеграциям
      const productsByIntegration = {};
      allProducts.forEach(product => {
        const integrationId = selectedIntegrationId.value === 'all' ? product.integrationLink : selectedIntegrationId.value;
        if (!productsByIntegration[integrationId]) {
          productsByIntegration[integrationId] = [];
        }
        productsByIntegration[integrationId].push(product);
      });

      const allResults = [];

      // Выполняем действия для каждой интеграции отдельно
      for (const [integrationId, integrationProducts] of Object.entries(productsByIntegration)) {
        const bundleProducts = integrationProducts.filter(p => p.complect === true);
        const normalProducts = integrationProducts.filter(p => p.complect === false);

        if (normalProducts.length > 0) {
          const response = await axios.post(`${API_BASE_URL}/products/create-in-ms`, {
            integrationLinkId: integrationId,
            productIds: normalProducts.map(p => p._id),
          }, {
            headers: { Authorization: `Bearer ${getToken()}` },
            timeout: 300000,
          });
          allResults.push(...response.data.results);
        }

        if (bundleProducts.length > 0) {
          const response = await axios.post(`${API_BASE_URL}/products/create-bundle`, {
            integrationLinkId: integrationId,
            productIds: bundleProducts.map(p => p._id),
          }, {
            headers: { Authorization: `Bearer ${getToken()}` },
            timeout: 300000,
          });
          allResults.push(...response.data.results);
        }
      }

      // Подсчёт итогов
      const successCount = allResults.filter(r => r.status === 'success').length;
      const errorCount = allResults.filter(r => r.status === 'error').length;
      const skippedCount = allResults.filter(r => r.status === 'skipped').length;

      let summaryMessage = `Массовая операция завершена: Успешно: ${successCount}`;
      if (errorCount > 0) summaryMessage += `, Ошибок: ${errorCount}`;
      if (skippedCount > 0) summaryMessage += `, Пропущено: ${skippedCount}`;
      alert(summaryMessage);

      // Обновляем список товаров, чтобы увидеть изменения ms_href
      await fetchProducts();

    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Ошибка выполнения массовой операции.';
      alert(`Произошла ошибка при массовом создании товаров/комплектов: ${errorMessage}`);
      console.error('Ошибка bulkCreateInMs:', error);
    } finally {
      bulkActionInProgress.value = false;
      closeBulkEditModal();
    }
  };

  // --- НОВАЯ/ИЗМЕНЕННАЯ ФУНКЦИЯ bulkCreateVariants ---
  const bulkCreateVariants = async () => {
    bulkActionInProgress.value = true;

    try {
      let allProducts = [];
      
      if (selectedAllPages.value) {
        // Если выбраны все страницы, нужно получить все товары
        // Для "Все интеграции" это сложно, поэтому показываем предупреждение
        if (selectedIntegrationId.value === 'all') {
          alert('Массовые действия с "выбрать все страницы" в режиме "Все интеграции" не поддерживаются. Пожалуйста, выберите конкретную интеграцию.');
          return;
        }
        
        // Для конкретной интеграции получаем все товары
        const productResponse = await axios.post(`${API_BASE_URL}/products/get-by-selection`, {
          integrationLinkId: selectedIntegrationId.value,
          selectedAllPages: true,
          productIds: [],
        }, {
          headers: { Authorization: `Bearer ${getToken()}` },
          timeout: 120000,
        });
        allProducts = productResponse.data || [];
      } else {
        // Если выбраны конкретные товары, используем их
        allProducts = products.value.filter(p => selectedProductIds.value.includes(p._id));
      }

      // Группируем товары по интеграциям
      const productsByIntegration = {};
      allProducts.forEach(product => {
        const integrationId = selectedIntegrationId.value === 'all' ? product.integrationLink : selectedIntegrationId.value;
        if (!productsByIntegration[integrationId]) {
          productsByIntegration[integrationId] = [];
        }
        productsByIntegration[integrationId].push(product);
      });

      const allResults = [];

      // Выполняем действия для каждой интеграции отдельно
      for (const [integrationId, integrationProducts] of Object.entries(productsByIntegration)) {
        const response = await axios.post(`${API_BASE_URL}/products/create-variants-in-ms`, {
          integrationLinkId: integrationId,
          productIds: integrationProducts.map(p => p._id),
        }, {
          headers: { Authorization: `Bearer ${getToken()}` },
          timeout: 300000,
        });
        allResults.push(...response.data.results);
      }

      const successCount = allResults.filter(r => r.status === 'success').length;
      const partialErrorCount = allResults.filter(r => r.status === 'partial_error').length;
      const errorCount = allResults.filter(r => r.status === 'error').length;
      const skippedCount = allResults.filter(r => r.status === 'skipped').length;

      let summaryMessage = `Массовое создание модификаций завершено: Успешно: ${successCount}`;
      if (partialErrorCount > 0) summaryMessage += `, Частичные ошибки: ${partialErrorCount}`;
      if (errorCount > 0) summaryMessage += `, Ошибок: ${errorCount}`;
      if (skippedCount > 0) summaryMessage += `, Пропущено: ${skippedCount}`;
      alert(summaryMessage);

      await fetchProducts();

    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Ошибка выполнения массовой операции создания модификаций.';
      alert(`Произошла ошибка при массовом создании модификаций: ${errorMessage}`);
      console.error('Ошибка bulkCreateVariants:', error);
    } finally {
      bulkActionInProgress.value = false;
      closeBulkEditModal();
    }
  };
  // --- КОНЕЦ НОВОЙ/ИЗМЕНЕННОЙ ФУНКЦИИ bulkCreateVariants ---

  const bulkUnlinkProducts = async () => {
    bulkActionInProgress.value = true;

    try {
      let allProducts = [];
      
      if (selectedAllPages.value) {
        // Если выбраны все страницы, нужно получить все товары
        // Для "Все интеграции" это сложно, поэтому показываем предупреждение
        if (selectedIntegrationId.value === 'all') {
          alert('Массовые действия с "выбрать все страницы" в режиме "Все интеграции" не поддерживаются. Пожалуйста, выберите конкретную интеграцию.');
          return;
        }
        
        // Для конкретной интеграции получаем все товары
        const productResponse = await axios.post(`${API_BASE_URL}/products/get-by-selection`, {
          integrationLinkId: selectedIntegrationId.value,
          selectedAllPages: true,
          productIds: [],
        }, {
          headers: { Authorization: `Bearer ${getToken()}` },
          timeout: 120000,
        });
        allProducts = productResponse.data || [];
      } else {
        // Если выбраны конкретные товары, используем их
        allProducts = products.value.filter(p => selectedProductIds.value.includes(p._id));
      }

      // Группируем товары по интеграциям
      const productsByIntegration = {};
      allProducts.forEach(product => {
        const integrationId = selectedIntegrationId.value === 'all' ? product.integrationLink : selectedIntegrationId.value;
        if (!productsByIntegration[integrationId]) {
          productsByIntegration[integrationId] = [];
        }
        productsByIntegration[integrationId].push(product);
      });

      const allResults = [];

      // Выполняем действия для каждой интеграции отдельно
      for (const [integrationId, integrationProducts] of Object.entries(productsByIntegration)) {
        const response = await axios.post(`${API_BASE_URL}/products/bulk-unlink`, {
          integrationLinkId: integrationId,
          productIds: integrationProducts.map(p => p._id),
        }, {
          headers: { Authorization: `Bearer ${getToken()}` },
          timeout: 300000,
        });
        allResults.push(...response.data.results);
      }

      const successCount = allResults.filter(r => r.status === 'success').length;
      const errorCount = allResults.filter(r => r.status === 'error').length;

      let summaryMessage = `Массовое удаление связок завершено: Успешно: ${successCount}`;
      if (errorCount > 0) summaryMessage += `, Ошибок: ${errorCount}`;
      alert(summaryMessage);

      await fetchProducts();

    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Ошибка выполнения массового удаления связок.';
      alert(`Произошла ошибка при массовом удалении связок: ${errorMessage}`);
      console.error('Ошибка массового удаления связок:', error);
    } finally {
      bulkActionInProgress.value = false;
      closeBulkEditModal();
    }
  };

  return {
    isBulkEditModalOpen,
    bulkActionInProgress,
    openBulkEditModal,
    closeBulkEditModal,
    bulkCreateInMs,
    bulkCreateVariants,
    bulkUnlinkProducts,
  };
}
