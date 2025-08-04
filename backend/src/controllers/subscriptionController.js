const User = require('../models/User');

// @desc    Получить информацию о подписке пользователя
// @route   GET /api/subscription
// @access  Private
exports.getSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    const subscriptionStatus = user.getSubscriptionStatus();
    
    res.json({
      subscription: subscriptionStatus
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ message: 'Ошибка получения информации о подписке' });
  }
};

// @desc    Обновить подписку пользователя (только для админов)
// @route   PUT /api/subscription/:userId
// @access  Private (Admin only)
exports.updateSubscription = async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, expiresAt } = req.body;

    // Проверяем, что текущий пользователь - админ
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещен. Требуются права администратора.' });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    // Обновляем подписку
    user.subscription.type = type || user.subscription.type;
    user.subscription.expiresAt = expiresAt ? new Date(expiresAt) : null;
    user.subscription.isActive = true;

    await user.save();

    const subscriptionStatus = user.getSubscriptionStatus();
    
    res.json({
      message: 'Подписка успешно обновлена',
      subscription: subscriptionStatus
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ message: 'Ошибка обновления подписки' });
  }
};

// @desc    Получить список всех подписок (только для админов)
// @route   GET /api/subscription/all
// @access  Private (Admin only)
exports.getAllSubscriptions = async (req, res) => {
  try {
    // Проверяем, что текущий пользователь - админ
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещен. Требуются права администратора.' });
    }

    const users = await User.find({}, 'username email subscription createdAt');
    
    const subscriptions = users.map(user => ({
      userId: user._id,
      username: user.username,
      email: user.email,
      subscription: user.getSubscriptionStatus(),
      createdAt: user.createdAt
    }));

    res.json({
      subscriptions
    });
  } catch (error) {
    console.error('Get all subscriptions error:', error);
    res.status(500).json({ message: 'Ошибка получения списка подписок' });
  }
}; 