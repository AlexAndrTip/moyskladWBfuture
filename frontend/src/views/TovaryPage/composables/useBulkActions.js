// src/views/TovaryPage/composables/useBulkActions.js
import { ref } from 'vue';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function useBulkActions(getToken, selectedIntegrationId, selectedProductIds, selectedAllPages, totalProducts, fetchProducts) {
  const isBulkEditModalOpen = ref(false);
  const bulkActionInProgress = ref(false);

  const openBulkEditModal = () => {
    // Проверяем, что выбрана конкретная интеграция, а не "Все интеграции"
    if (selectedIntegrationId.value === 'all') {
      alert('Для выполнения массовых действий необходимо выбрать конкретную интеграцию.');
      return;
    }

    if (selectedProductIds.value.length === 0 && !selectedAllPages.value) {
      alert('Пожалуйста, выберите хотя бы один товар или выберите все товары на всех страницах.');
      return;
    }
    isBulkEditModalOpen.value = true;
  };

  const closeBulkEditModal = () => {
    isBulkEditModalOpen.value = false;
  };

  const bulkCreateInMs = async () => {
    bulkActionInProgress.value = true;

    try {
      // Получаем товары по выбранному критерию
      // Эту часть можно упростить, так как бэкенд `create-in-ms` уже умеет обрабатывать `productIds` или `selectedAllPages`
      // но оставлю пока так, если вам нужна предварительная фильтрация по complect на фронте.
      const productResponse = await axios.post(`${API_BASE_URL}/products/get-by-selection`, {
        integrationLinkId: selectedIntegrationId.value,
        selectedAllPages: selectedAllPages.value,
        productIds: selectedProductIds.value,
      }, {
        headers: { Authorization: `Bearer ${getToken()}` },
        timeout: 120000,
      });

      const allProducts = productResponse.data || [];
      const bundleProducts = allProducts.filter(p => p.complect === true);
      const normalProducts = allProducts.filter(p => p.complect === false);

      const results = [];

      if (normalProducts.length > 0) {
        const response = await axios.post(`${API_BASE_URL}/products/create-in-ms`, {
          integrationLinkId: selectedIntegrationId.value,
          productIds: normalProducts.map(p => p._id),
          // Нет selectedAllPages здесь, так как мы явно передаем productIds
        }, {
          headers: { Authorization: `Bearer ${getToken()}` },
          timeout: 300000,
        });
        results.push(...response.data.results);
      }

      if (bundleProducts.length > 0) {
        const response = await axios.post(`${API_BASE_URL}/products/create-bundle`, {
          integrationLinkId: selectedIntegrationId.value,
          productIds: bundleProducts.map(p => p._id),
          // Нет selectedAllPages здесь, так как мы явно передаем productIds
        }, {
          headers: { Authorization: `Bearer ${getToken()}` },
          timeout: 300000,
        });
        results.push(...response.data.results);
      }

      // Подсчёт итогов
      const successCount = results.filter(r => r.status === 'success').length;
      const errorCount = results.filter(r => r.status === 'error').length;
      const skippedCount = results.filter(r => r.status === 'skipped').length;

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

    // Подготавливаем payload для запроса на бэкенд
    let payload = {
      integrationLinkId: selectedIntegrationId.value,
    };

    if (selectedAllPages.value) {
      payload.selectedAllPages = true;
    } else {
      payload.productIds = selectedProductIds.value;
    }

    console.log('Отправка запроса на массовое создание модификаций с payload:', payload);

    try {
      const response = await axios.post(`${API_BASE_URL}/products/create-variants-in-ms`, payload, {
        headers: { Authorization: `Bearer ${getToken()}` },
        timeout: 300000, // Установите подходящий таймаут для массовых операций (5 минут)
      });

      const results = response.data.results || [];
      const successCount = results.filter(r => r.status === 'success').length;
      const partialErrorCount = results.filter(r => r.status === 'partial_error').length;
      const errorCount = results.filter(r => r.status === 'error').length;
      const skippedCount = results.filter(r => r.status === 'skipped').length;

      let summaryMessage = `Массовое создание модификаций завершено: Успешно: ${successCount}`;
      if (partialErrorCount > 0) summaryMessage += `, Частичные ошибки: ${partialErrorCount}`;
      if (errorCount > 0) summaryMessage += `, Ошибок: ${errorCount}`;
      if (skippedCount > 0) summaryMessage += `, Пропущено: ${skippedCount}`;
      alert(summaryMessage);

      // После завершения операции, обновим список товаров на странице
      // Это критически важно, чтобы отобразить новые ms_href для модификаций
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

    let payload = { integrationLinkId: selectedIntegrationId.value };
    if (selectedAllPages.value) {
      payload.selectedAllPages = true;
    } else {
      payload.productIds = selectedProductIds.value;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/products/bulk-unlink`, payload, {
        headers: { Authorization: `Bearer ${getToken()}` },
        timeout: 300000,
      });

      const successCount = response.data.results.filter(r => r.status === 'success').length;
      const errorCount = response.data.results.filter(r => r.status === 'error').length;

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
