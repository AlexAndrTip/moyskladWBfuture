const mongoose = require('mongoose');

/**
 * Модель задачи очереди
 * Хранит информацию о задачах, их статусах и результатах
 */
const QueueTaskSchema = new mongoose.Schema({
  // Основная информация
  type: {
    type: String,
    required: true,
    enum: [
      'WB_PRICE_UPDATE',      // Обновление цен WB
      'WB_REMAINS_UPDATE',    // Обновление остатков WB
      'MS_PRICE_UPDATE',      // Обновление цен МС
      'MS_STOCK_UPDATE',      // Обновление остатков МС
      'WB_STATISTICS_UPDATE', // Обновление статистики WB
      'SYNC_PRODUCTS'         // Синхронизация товаров
    ]
  },
  
  // Данные задачи
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  
  // Пользователь, создавший задачу
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Статус задачи
  status: {
    type: String,
    enum: [
      'PENDING',     // Ожидает обработки
      'PROCESSING',  // Обрабатывается
      'COMPLETED',   // Завершена успешно
      'FAILED',      // Завершена с ошибкой
      'CANCELLED'    // Отменена
    ],
    default: 'PENDING'
  },
  
  // Приоритет задачи (1-10, где 10 - высший приоритет)
  priority: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },
  
  // Время создания
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  // Время начала обработки
  startedAt: {
    type: Date,
    default: null
  },
  
  // Время завершения
  completedAt: {
    type: Date,
    default: null
  },
  
  // Результат выполнения
  result: {
    success: {
      type: Boolean,
      default: null
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    error: {
      message: String,
      stack: String,
      code: String
    }
  },
  
  // Количество попыток выполнения
  attempts: {
    type: Number,
    default: 0
  },
  
  // Максимальное количество попыток
  maxAttempts: {
    type: Number,
    default: 3
  },
  
  // Воркер, обрабатывающий задачу
  workerId: {
    type: String,
    default: null
  },
  
  // Время следующей попытки (для retry)
  nextAttemptAt: {
    type: Date,
    default: null
  },
  
  // Метаданные
  metadata: {
    cabinetName: String,      // Название кабинета (для удобства)
    integrationName: String,  // Название интеграции
    estimatedDuration: Number, // Оценочное время выполнения в секундах
    tags: [String]            // Теги для группировки
  }
}, {
  timestamps: true
});

// Индексы для оптимизации запросов
QueueTaskSchema.index({ status: 1, priority: -1, createdAt: 1 });
QueueTaskSchema.index({ userId: 1, status: 1 });
QueueTaskSchema.index({ type: 1, status: 1 });
QueueTaskSchema.index({ nextAttemptAt: 1, status: 1 });
QueueTaskSchema.index({ workerId: 1, status: 1 });

// Виртуальные поля
QueueTaskSchema.virtual('duration').get(function() {
  if (this.startedAt && this.completedAt) {
    return this.completedAt - this.startedAt;
  }
  return null;
});

QueueTaskSchema.virtual('isRetryable').get(function() {
  return this.attempts < this.maxAttempts && this.status === 'FAILED';
});

// Методы
QueueTaskSchema.methods.markAsProcessing = function(workerId) {
  this.status = 'PROCESSING';
  this.startedAt = new Date();
  this.workerId = workerId;
  this.attempts += 1;
  return this.save();
};

QueueTaskSchema.methods.markAsCompleted = function(result) {
  this.status = 'COMPLETED';
  this.completedAt = new Date();
  this.result = {
    success: true,
    data: result
  };
  return this.save();
};

QueueTaskSchema.methods.markAsFailed = function(error) {
  this.status = 'FAILED';
  this.completedAt = new Date();
  this.result = {
    success: false,
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code || 'UNKNOWN_ERROR'
    }
  };
  
  // Если можно повторить, планируем следующую попытку
  if (this.isRetryable) {
    this.status = 'PENDING';
    this.completedAt = null;
    this.nextAttemptAt = new Date(Date.now() + Math.pow(2, this.attempts) * 1000); // Exponential backoff
  }
  
  return this.save();
};

QueueTaskSchema.methods.cancel = function() {
  this.status = 'CANCELLED';
  this.completedAt = new Date();
  return this.save();
};

// Статические методы
QueueTaskSchema.statics.getPendingTasks = function(limit = 10) {
  return this.find({
    status: 'PENDING',
    $or: [
      { nextAttemptAt: null },
      { nextAttemptAt: { $lte: new Date() } }
    ]
  })
  .sort({ priority: -1, createdAt: 1 })
  .limit(limit);
};

QueueTaskSchema.statics.getTasksByUser = function(userId, status = null) {
  const query = { userId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ createdAt: -1 });
};

QueueTaskSchema.statics.getTaskStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

QueueTaskSchema.statics.getTasksByType = function(type, status = null) {
  const query = { type };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ createdAt: -1 });
};

module.exports = mongoose.model('QueueTask', QueueTaskSchema);
