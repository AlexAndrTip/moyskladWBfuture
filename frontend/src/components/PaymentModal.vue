<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <h3>Оплата подписки</h3>
      <img :src="imageSrc" alt="QR" class="qr-img" />
      <p class="payload"><a :href="payload" target="_blank">Ссылка для оплаты</a></p>
      <p class="timer">Действительно ещё: {{ minutes }}:{{ seconds }}</p>
      <button class="btn" @click="$emit('close')">Закрыть</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';

const props = defineProps({
  isOpen: Boolean,
  imageSrc: String,
  payload: String,
  qrcId: String,
  lifetime: { type: Number, default: 300 } // секунд
});

const emit = defineEmits(['close','paid']);

const remaining = ref(props.lifetime);
let intervalId;
let pollId;

const minutes = computed(() => String(Math.floor(remaining.value / 60)).padStart(2, '0'));
const seconds = computed(() => String(remaining.value % 60).padStart(2, '0'));

function startTimer() {
  remaining.value = props.lifetime;
  intervalId = setInterval(() => {
    if (remaining.value > 0) remaining.value--; else clearInterval(intervalId);
  }, 1000);
}

function startPolling() {
  if (!props.qrcId) return;
  const token = localStorage.getItem('token');
  pollId = setInterval(async () => {
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_BASE_URL}/payment/${props.qrcId}/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await resp.json();
      if (data.status === 'Accepted') {
        clearInterval(pollId);
        clearInterval(intervalId);
        emit('paid');
      } else if (['Rejected', 'TimedOut'].includes(data.status)) {
        clearInterval(pollId);
        clearInterval(intervalId);
        emit('close');
      }
    } catch (e) { console.error('poll error', e); }
  }, 10000);
}

watch(() => props.isOpen, (val) => {
  if (val) { startTimer(); startPolling(); } else { clearInterval(intervalId); clearInterval(pollId); }
});

onMounted(() => { if (props.isOpen) { startTimer(); startPolling(); } });

onBeforeUnmount(() => { clearInterval(intervalId); clearInterval(pollId); });
</script>

<style scoped>
.modal-overlay {position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.5);display:flex;justify-content:center;align-items:center;z-index:1000;}
.modal-content {background:#fff;padding:20px;border-radius:8px;text-align:center;max-width:400px;width:90%;}
.qr-img {width:250px;height:250px;margin:10px auto;}
.timer {font-size:18px;margin:10px 0;font-weight:bold;}
.btn {background:#007bff;color:#fff;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;}
.payload a{color:#007bff;word-break:break-all;}
</style> 