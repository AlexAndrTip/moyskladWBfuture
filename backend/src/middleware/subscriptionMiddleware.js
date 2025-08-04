const User = require('../models/User');

// Middleware для проверки подписки
exports.requireSubscription = (requiredType = 'basic') => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(401).json({ message: 'Пользователь не найден' });
      }

      const subscriptionStatus = user.getSubscriptionStatus();
      
      // Демо пользователи не могут использовать функции
      if (subscriptionStatus.type === 'demo') {
        return res.status(403).json({ 
          message: 'Эта функция недоступна в демо версии. Обновите подписку для доступа.',
          subscription: subscriptionStatus
        });
      }

      // Проверяем активность подписки
      if (subscriptionStatus.status !== 'active') {
        return res.status(403).json({ 
          message: 'Подписка неактивна. Обновите подписку для доступа.',
          subscription: subscriptionStatus
        });
      }

      // Проверяем тип подписки (если требуется определенный тип)
      if (requiredType === 'premium' && subscriptionStatus.type !== 'premium') {
        return res.status(403).json({ 
          message: 'Эта функция доступна только для премиум подписки.',
          subscription: subscriptionStatus
        });
      }

      next();
    } catch (error) {
      console.error('Subscription middleware error:', error);
      res.status(500).json({ message: 'Ошибка проверки подписки' });
    }
  };
};

// Middleware для получения информации о подписке (без блокировки)
exports.getSubscriptionInfo = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (user) {
      req.subscriptionInfo = user.getSubscriptionStatus();
    }
    
    next();
  } catch (error) {
    console.error('Get subscription info error:', error);
    next();
  }
}; 