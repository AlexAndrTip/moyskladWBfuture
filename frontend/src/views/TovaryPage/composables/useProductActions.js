// src/views/TovaryPage/composables/useProductActions.js
import { ref } from 'vue';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function useProductActions(getToken, selectedIntegrationId, updateProductInList, products) {
  const individualActionMessage = ref('');
  const individualActionMessageType = ref('');
  const individualActionMsHref = ref('');
  const pendingActions = ref({}); // { productId: 'actionType' }

  // НОВЫЕ СОСТОЯНИЯ ДЛЯ МОДАЛЬНОГО ОКНА СВЯЗЫВАНИЯ
  const isLinkToProductModalOpen = ref(false);
  // currentWbProductForLinking теперь будет хранить ВЕСЬ объект товара WB
  const currentWbProductForLinking = ref(null); // Товар WB, для которого открывается модалка

  const isActionInProgress = (productId, actionType) => {
    return pendingActions.value[productId] === actionType;
  };

  const clearIndividualActionMessage = () => {
    individualActionMessage.value = '';
    individualActionMessageType.value = '';
    individualActionMsHref.value = '';
  };

  const createInMs = async (product) => {
    clearIndividualActionMessage();
    pendingActions.value[product._id] = 'createMs';
    
    // Определяем интеграцию для товара
    const integrationLinkId = selectedIntegrationId.value === 'all' ? product.integrationLink : selectedIntegrationId.value;
    
    if (!integrationLinkId) {
      individualActionMessage.value = 'Не удалось определить интеграцию для товара.';
      individualActionMessageType.value = 'error';
      pendingActions.value[product._id] = null;
      return;
    }
    let sizeChrtIDToSend = null;
    let targetSizeTechSize = 'Общий';

    // --- ✅ Фильтр по complect ---
    if (product.complect === true) {
      await createBundleInMs(product);
      pendingActions.value[product._id] = null;
      return;
    }
    if (product.complect !== false) {
      individualActionMessage.value = `Товар "${product.title}" не может быть создан — неизвестный статус complect.`;
      individualActionMessageType.value = 'error';
      pendingActions.value[product._id] = null;
      return;
    }

    if (product.sizes.length === 1) {
      sizeChrtIDToSend = product.sizes[0].chrtID;
      targetSizeTechSize = product.sizes[0].techSize;
      if (product.sizes[0].ms_href) {
        individualActionMessage.value = `Размер "${targetSizeTechSize}" уже создан в МойСклад.`;
        individualActionMessageType.value = 'info';
        individualActionMsHref.value = product.sizes[0].ms_href;
        pendingActions.value[product._id] = null;
        return;
      }
    } else {
      individualActionMessage.value = `Товар "${product.title}" имеет несколько размеров. Создаётся общий товар в МойСклад без конкретного SKU/кода.`;
      individualActionMessageType.value = 'info';
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/products/create-in-ms`, {
        productId: product._id,
        sizeChrtID: sizeChrtIDToSend,
        integrationLinkId: integrationLinkId,
      }, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      individualActionMessage.value = `Успешно создан в МойСклад: "${response.data.title}" (NM ID: ${response.data.nmID}) ${response.data.sizeTechSize ? 'размер ' + response.data.sizeTechSize : ''}.`;
      individualActionMessageType.value = 'success';
      individualActionMsHref.value = response.data.ms_href;

      // Обновляем ссылку в существующем списке товаров
      updateProductInList(product._id, (p) => {
        if (sizeChrtIDToSend && p.sizes) {
          const targetSizeIndex = p.sizes.findIndex(s => s.chrtID === sizeChrtIDToSend);
          if (targetSizeIndex !== -1) {
            p.sizes[targetSizeIndex].ms_href = response.data.ms_href;
          }
        } else if (p.sizes && p.sizes.length === 1 && !sizeChrtIDToSend) {
          p.sizes[0].ms_href = response.data.ms_href;
        } else {
          p.ms_href_general = response.data.ms_href;
        }
      });

    } catch (error) {
      individualActionMessage.value = error.response?.data?.message || 'Ошибка создания в МойСклад.';
      individualActionMessageType.value = 'error';
      individualActionMsHref.value = '';
      console.error('Ошибка создания в МС:', error);
    } finally {
      pendingActions.value[product._id] = null;
    }
  };

  const createVariants = async (product) => {
    clearIndividualActionMessage();
    pendingActions.value[product._id] = 'createVariants';
    
    // Определяем интеграцию для товара
    const integrationLinkId = selectedIntegrationId.value === 'all' ? product.integrationLink : selectedIntegrationId.value;
    
    if (!integrationLinkId) {
      individualActionMessage.value = 'Не удалось определить интеграцию для товара.';
      individualActionMessageType.value = 'error';
      pendingActions.value[product._id] = null;
      return;
    }
    individualActionMessage.value = `Создание модификаций для "${product.title}"...`;
    individualActionMessageType.value = 'info';
    individualActionMsHref.value = '';

    console.log('Отправка запроса на создание модификаций для товара:', product);

    try {
      const response = await axios.post(`${API_BASE_URL}/products/create-variants-in-ms`, {
        productId: product._id,
        integrationLinkId: integrationLinkId,
      }, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (response.data.results && response.data.results.length > 0) {
          const productResult = response.data.results[0];
          if (productResult.variants && productResult.variants.length > 0) {
            updateProductInList(product._id, (p) => {
              productResult.variants.forEach(variant => {
                const sizeToUpdate = p.sizes.find(s => s.chrtID === variant.chrtID);
                if (sizeToUpdate && variant.status === 'success' && variant.ms_href) {
                  sizeToUpdate.ms_href = variant.ms_href;
                }
              });
            });
            individualActionMessage.value = `Модификации для "${product.title}" успешно созданы/обновлены.`;
            individualActionMessageType.value = 'success';
            individualActionMsHref.value = productResult.variants.find(v => v.ms_href)?.ms_href || '';
          } else {
            individualActionMessage.value = `Не удалось создать модификации для "${product.title}": ${productResult.message || 'нет данных о модификациях.'}`;
            individualActionMessageType.value = productResult.status === 'skipped' ? 'info' : 'warning';
          }
      } else {
          individualActionMessage.value = response.data.message || 'Модификации обработаны.';
          individualActionMessageType.value = 'success';
      }

    } catch (error) {
      individualActionMessage.value = error.response?.data?.message || 'Ошибка при создании модификаций.';
      individualActionMessageType.value = 'error';
      individualActionMsHref.value = '';
      console.error('Ошибка при создании модификаций:', error);
    } finally {
      pendingActions.value[product._id] = null;
    }
  };

  // ИЗМЕНЕННАЯ ФУНКЦИЯ linkToProduct
  const linkToProduct = (product) => {
    clearIndividualActionMessage();
    
    // Определяем интеграцию для товара
    const integrationLinkId = selectedIntegrationId.value === 'all' ? product.integrationLink : selectedIntegrationId.value;
    
    if (!integrationLinkId) {
      individualActionMessage.value = 'Не удалось определить интеграцию для товара.';
      individualActionMessageType.value = 'error';
      return;
    }
    
    // Сохраняем ВЕСЬ объект товара WB, для которого открываем модалку
    currentWbProductForLinking.value = product;
    isLinkToProductModalOpen.value = true; // Открываем модальное окно
    console.log('Открываем модалку "Связать с товаром" для:', product);
  };

  // НОВАЯ ФУНКЦИЯ: обработчик после выбора товара/модификации в модалке
  // Добавляем wbSizeChrtID (опционально) для случаев связывания модификаций
  const handleProductLinked = (wbProductId, updatedProductData, wbSizeChrtID = null) => {
    // Этот колбэк вызывается из LinkToProductModal.vue при успешном связывании
    // Нужно обновить соответствующий товар WB в списке TovaryPage
    updateProductInList(wbProductId, (p) => {
      if (wbSizeChrtID) {
        // Если был передан chrtID, значит, связывалась конкретная модификация WB
        const targetSize = p.sizes.find(s => s.chrtID === wbSizeChrtID);
        if (targetSize && updatedProductData.ms_href_linked) { // ms_href_linked будет содержать href для модификации
          targetSize.ms_href = updatedProductData.ms_href_linked;
        }
      } else {
        // Иначе, это был основной товар (или товар с одним размером)
        p.ms_href_general = updatedProductData.ms_href_general;
        // Если у товара были размеры и ms_href, также обновляем их
        if (p.sizes && updatedProductData.sizes) {
            updatedProductData.sizes.forEach(updatedSize => {
                const originalSize = p.sizes.find(s => s.chrtID === updatedSize.chrtID);
                if (originalSize) {
                    originalSize.ms_href = updatedSize.ms_href;
                }
            });
        }
      }
    });

    // Формируем сообщение в зависимости от того, что было связано
    let linkedItemName = currentWbProductForLinking.value.title;
    if (wbSizeChrtID) {
        const sizeInfo = currentWbProductForLinking.value.sizes.find(s => s.chrtID === wbSizeChrtID);
        if (sizeInfo) {
            linkedItemName += ` (размер: ${sizeInfo.techSize})`;
        }
    }

    individualActionMessage.value = `Товар "${linkedItemName}" успешно связан!`;
    individualActionMessageType.value = 'success';
    individualActionMsHref.value = updatedProductData.ms_href_linked || updatedProductData.ms_href_general || (updatedProductData.sizes?.[0]?.ms_href);

    currentWbProductForLinking.value = null; // Очищаем ссылку на WB товар
    isLinkToProductModalOpen.value = false; // Закрываем модальное окно
  };

  const closeLinkToProductModal = () => {
    isLinkToProductModalOpen.value = false;
    currentWbProductForLinking.value = null; // Очищаем ссылку
  };

  const unlinkProduct = async (product) => {
    clearIndividualActionMessage();
    pendingActions.value[product._id] = 'unlinkProduct';
    
    // Определяем интеграцию для товара
    const integrationLinkId = selectedIntegrationId.value === 'all' ? product.integrationLink : selectedIntegrationId.value;
    
    if (!integrationLinkId) {
      individualActionMessage.value = 'Не удалось определить интеграцию для товара.';
      individualActionMessageType.value = 'error';
      pendingActions.value[product._id] = null;
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/products/unlink`, {
        productId: product._id,
        integrationLinkId: integrationLinkId,
      }, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      individualActionMessage.value = response.data.message || `Связка для товара "${product.title}" успешно удалена.`;
      individualActionMessageType.value = 'success';
      individualActionMsHref.value = '';

      updateProductInList(product._id, (p) => {
        if (p.ms_href_general) {
          delete p.ms_href_general;
        }
        if (p.sizes) {
          p.sizes.forEach(size => {
            if (size.ms_href) {
              delete size.ms_href;
            }
          });
        }
      });

    } catch (error) {
      individualActionMessage.value = error.response?.data?.message || 'Ошибка при удалении связки с МойСклад.';
      individualActionMessageType.value = 'error';
      individualActionMsHref.value = '';
      console.error('Ошибка удаления связки:', error);
    } finally {
      pendingActions.value[product._id] = null;
    }
  };

  const createBundleInMs = async (product) => {
    // Определяем интеграцию для товара
    const integrationLinkId = selectedIntegrationId.value === 'all' ? product.integrationLink : selectedIntegrationId.value;
    
    if (!integrationLinkId) {
      individualActionMessage.value = 'Не удалось определить интеграцию для товара.';
      individualActionMessageType.value = 'error';
      return;
    }
    
    try {
      const response = await axios.post(`${API_BASE_URL}/products/create-bundle`, {
        productId: product._id,
        integrationLinkId: integrationLinkId,
      }, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      individualActionMessage.value = `Комплект "${response.data.title}" успешно создан в МойСклад.`;
      individualActionMessageType.value = 'success';
      individualActionMsHref.value = response.data.ms_href;

      updateProductInList(product._id, (p) => {
        p.ms_href_general = response.data.ms_href;
      });

    } catch (error) {
      individualActionMessage.value = error.response?.data?.message || 'Ошибка при создании комплекта в МойСклад.';
      individualActionMessageType.value = 'error';
      individualActionMsHref.value = '';
      console.error('Ошибка при создании комплекта:', error);
    }
  };

  const toggleComplect = async (productId, complectValue) => {
    clearIndividualActionMessage();
    pendingActions.value[productId] = 'updateComplect';
    
    // Находим товар в списке для определения интеграции
    const product = products.value.find(p => p._id === productId);
    if (!product) {
      individualActionMessage.value = 'Товар не найден.';
      individualActionMessageType.value = 'error';
      pendingActions.value[productId] = null;
      return;
    }
    
    // Определяем интеграцию для товара
    const integrationLinkId = selectedIntegrationId.value === 'all' ? product.integrationLink : selectedIntegrationId.value;
    
    if (!integrationLinkId) {
      individualActionMessage.value = 'Не удалось определить интеграцию для товара.';
      individualActionMessageType.value = 'error';
      pendingActions.value[productId] = null;
      return;
    }

    console.log('Отправка запроса на обновление комплекта:', { productId, complect: complectValue, integrationLinkId: selectedIntegrationId.value });

    try {
      const response = await axios.post(`${API_BASE_URL}/products/set-complect`, {
        productId,
        complect: complectValue,
        integrationLinkId: integrationLinkId,
      }, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      individualActionMessage.value = response.data.message;
      individualActionMessageType.value = 'success';

      updateProductInList(productId, (p) => {
        p.complect = complectValue;
      });

    } catch (error) {
      individualActionMessage.value = error.response?.data?.message || `Ошибка при обновлении статуса "Комплект".`;
      individualActionMessageType.value = 'error';
      console.error('Ошибка обновления комплекта:', error);
    } finally {
      pendingActions.value[productId] = null;
    }
  };

  return {
    individualActionMessage,
    individualActionMessageType,
    individualActionMsHref,
    pendingActions,
    isActionInProgress,
    clearIndividualActionMessage,
    createInMs,
    createVariants,
    linkToProduct, // Обновлено
    unlinkProduct,
    toggleComplect,
    isLinkToProductModalOpen, // НОВОЕ
    currentWbProductForLinking, // НОВОЕ (теперь хранит полный объект)
    handleProductLinked, // НОВОЕ
    closeLinkToProductModal, // НОВОЕ
  };
}
