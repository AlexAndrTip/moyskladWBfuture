<template>
  <div v-if="isVisible" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>{{ message.title }}</h2>
        <button class="close-button" @click="closeModal">&times;</button>
      </div>
      
      <div class="modal-body">
        <div class="subscription-required">
          <div class="icon">🔒</div>
          <p class="message">{{ message.message }}</p>
          
          <div class="features-list">
            <h3>С подпиской вы получите доступ к:</h3>
            <ul>
              <li>Управлению товарами</li>
              <li>Созданию и просмотру отчетов</li>
              <li>Управлению поставками</li>
              <li>Расширенной аналитике</li>
              <li>Приоритетной поддержке</li>
            </ul>
          </div>
          
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="closeModal">
              Позже
            </button>
            <button class="btn btn-primary" @click="openSubscriptionModal">
              {{ message.buttonText }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  },
  message: {
    type: Object,
    default: () => ({
      title: 'Требуется подписка',
      message: 'Для доступа к этой странице необходима активная подписка.',
      buttonText: 'Оформить подписку'
    })
  }
});

const emit = defineEmits(['close', 'open-subscription']);

const closeModal = () => {
  emit('close');
};

const openSubscriptionModal = () => {
  emit('open-subscription');
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 30px;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  margin: 0;
  color: #333;
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
}

.close-button:hover {
  color: #333;
}

.modal-body {
  padding: 30px;
}

.subscription-required {
  text-align: center;
}

.icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.message {
  color: #666;
  font-size: 16px;
  margin-bottom: 25px;
  line-height: 1.5;
}

.features-list {
  text-align: left;
  margin-bottom: 30px;
}

.features-list h3 {
  color: #333;
  margin-bottom: 15px;
  font-size: 18px;
}

.features-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.features-list li {
  padding: 8px 0;
  color: #666;
  font-size: 14px;
  position: relative;
  padding-left: 25px;
}

.features-list li::before {
  content: "✓";
  position: absolute;
  left: 0;
  color: #4CAF50;
  font-weight: bold;
  font-size: 16px;
}

.modal-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: background-color 0.3s ease;
}

.btn-primary {
  background-color: #4CAF50;
  color: white;
}

.btn-primary:hover {
  background-color: #45a049;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #5a6268;
}

@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    margin: 10px;
  }
  
  .modal-header,
  .modal-body {
    padding: 15px;
  }
  
  .modal-actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
}
</style> 