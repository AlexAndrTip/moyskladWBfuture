<template>
  <div class="size-selector">
    <div class="size-buttons">
      <button
        v-for="size in sizes"
        :key="size.chrtID"
        :class="['size-button', { 'selected': selectedSizeId === size.chrtID }]"
        @click="selectSize(size.chrtID)"
      >
        {{ size.techSize }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  sizes: {
    type: Array,
    default: () => []
  },
  selectedSizeId: {
    type: [String, Number],
    default: null
  }
});

const emit = defineEmits(['size-change']);

const selectSize = (sizeId) => {
  emit('size-change', sizeId);
};
</script>

<style scoped>
.size-selector {
  margin-bottom: 15px;
}

.size-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.size-button {
  padding: 8px 16px;
  border: 2px solid #ddd;
  border-radius: 6px;
  background-color: #fff;
  color: #333;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  min-width: 60px;
  text-align: center;
}

.size-button:hover {
  border-color: #007bff;
  background-color: #f8f9fa;
}

.size-button.selected {
  border-color: #007bff;
  background-color: #007bff;
  color: white;
  box-shadow: 0 2px 4px rgba(0, 123, 255, 0.3);
}

.size-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}
</style>
