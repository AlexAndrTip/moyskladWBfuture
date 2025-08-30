<template>
  <div v-if="isOpen" class="image-modal-overlay" @click="closeModal">
    <div class="image-modal-content" @click.stop>
      <div class="image-modal-header">
        <h3>{{ productTitle }}</h3>
        <button class="close-button" @click="closeModal">&times;</button>
      </div>
      <div class="image-container">
        <img 
          :src="imageUrl" 
          :alt="productTitle"
          class="large-image"
          @error="handleImageError"
        />
        <div v-if="imageError" class="image-error">
          <span>Ошибка загрузки изображения</span>
        </div>
      </div>
      <div class="image-modal-footer">
        <p>Нажмите на изображение или кнопку "Закрыть" для выхода</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  isOpen: Boolean,
  imageUrl: String,
  productTitle: String
});

const emit = defineEmits(['close']);

const closeModal = () => {
  emit('close');
};

const handleImageError = () => {
  // Можно добавить логику для обработки ошибок загрузки
  console.error('Ошибка загрузки изображения:', props.imageUrl);
};
</script>

<style scoped>
.image-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  cursor: pointer;
}

.image-modal-content {
  background: white;
  border-radius: 8px;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  cursor: default;
}

.image-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
}

.image-modal-header h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.close-button:hover {
  background-color: #f0f0f0;
  color: #333;
}

.image-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  min-height: 400px;
  max-height: 70vh;
}

.large-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.2s;
}

.large-image:hover {
  transform: scale(1.02);
}

.image-error {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 200px;
  background-color: #f8f9fa;
  border: 2px dashed #ccc;
  border-radius: 8px;
  color: #666;
  font-size: 16px;
}

.image-modal-footer {
  padding: 15px 20px;
  border-top: 1px solid #eee;
  text-align: center;
  color: #666;
  font-size: 14px;
}

@media (max-width: 768px) {
  .image-modal-content {
    max-width: 95vw;
    max-height: 95vh;
  }
  
  .image-modal-header h3 {
    font-size: 16px;
  }
  
  .image-container {
    padding: 10px;
    min-height: 300px;
  }
}
</style> 