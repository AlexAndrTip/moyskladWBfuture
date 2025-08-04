// backend/src/controllers/subscriptionController.js
const User = require('../models/User');

// @desc    Получить информацию о подписке пользователя
// @route   GET /api/subscription/status
// @access  Private
exports.getSubscriptionStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    const subscriptionStatus = user.getSubscriptionStatus();
    res.json(subscriptionStatus);
  } catch (error) {
    res.status(500).json({ 
      message: 'Ошибка сервера при получении статуса подписки', 
      error: error.message 
    });
  }
};

// @desc    Получить доступные планы подписки
// @route   GET /api/subscription/plans
// @access  Public
exports.getSubscriptionPlans = async (req, res) => {
  try {
    const basePrice = 3000; // Цена за месяц в рублях
    
    const plans = [
      {
        id: 1,
        name: '1 месяц',
        months: 1,
        price: basePrice,
        discount: 0,
        finalPrice: basePrice,
        savings: 0
      },
      {
        id: 3,
        name: '3 месяца',
        months: 3,
        price: basePrice * 3,
        discount: 5,
        finalPrice: Math.round(basePrice * 3 * 0.95),
        savings: Math.round(basePrice * 3 * 0.05)
      },
      {
        id: 6,
        name: '6 месяцев',
        months: 6,
        price: basePrice * 6,
        discount: 10,
        finalPrice: Math.round(basePrice * 6 * 0.9),
        savings: Math.round(basePrice * 6 * 0.1)
      },
      {
        id: 12,
        name: '12 месяцев',
        months: 12,
        price: basePrice * 12,
        discount: 15,
        finalPrice: Math.round(basePrice * 12 * 0.85),
        savings: Math.round(basePrice * 12 * 0.15)
      }
    ];

    res.json(plans);
  } catch (error) {
    res.status(500).json({ 
      message: 'Ошибка сервера при получении планов подписки', 
      error: error.message 
    });
  }
};

// @desc    Обновить подписку пользователя
// @route   POST /api/subscription/update
// @access  Private
exports.updateSubscription = async (req, res) => {
  try {
    const { months, maxStorages, maxWbCabinets } = req.body;
    
    if (!months || ![1, 3, 6, 12].includes(months)) {
      return res.status(400).json({ 
        message: 'Неверное количество месяцев. Доступные варианты: 1, 3, 6, 12' 
      });
    }

    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    // Обновляем подписку
    user.updateSubscription(months);
    await user.save();

    // Обновляем лимиты, если переданы значения и они >= 3
    if ((maxStorages && maxStorages >= 3) || (maxWbCabinets && maxWbCabinets >= 3)) {
      const Limit = require('../models/Limit');
      let limits = await Limit.findOne({ user: userId });
      if (!limits) {
        limits = await Limit.create({ user: userId });
      }
      if (maxStorages && maxStorages >= 3) limits.maxStorages = maxStorages;
      if (maxWbCabinets && maxWbCabinets >= 3) limits.maxWbCabinets = maxWbCabinets;
      await limits.save();
    }

    const subscriptionStatus = user.getSubscriptionStatus();
    
    res.json({
      message: 'Подписка успешно обновлена',
      subscription: subscriptionStatus
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Ошибка сервера при обновлении подписки', 
      error: error.message 
    });
  }
}; 