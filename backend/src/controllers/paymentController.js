const axios = require('axios');
const Limit = require('../models/Limit');
const Storage = require('../models/Storage');
const WbCabinet = require('../models/WbCabinet');
const Payment = require('../models/Payment');

// @desc Создать динамический QR-код для оплаты подписки
// @route POST /api/payment/subscription
// @access Private
exports.createSubscriptionPayment = async (req, res) => {
  try {
    const { sum } = req.body; // сумма в рублях
    if (!sum || sum <= 0) {
      return res.status(400).json({ message: 'Некорректная сумма' });
    }

    const token = process.env.MODULBANK_TOKEN;
    const retailPointId = process.env.MODUL_RETAILPOINT;

    if (!token || !retailPointId) {
      return res.status(500).json({ message: 'Сервер неправильно сконфигурирован для Modulbank' });
    }

    const amount = Math.round(sum); // Фронт передаёт рубли, Modulbank тоже ожидает рубли

    const username = req.user.username || req.user.email;
    const orderNumber = Date.now().toString();

    const extraInfo = `Оплата подписки Uniseller WBMS. Пользователь: ${username}. №${orderNumber}`;

    const body = {
      retailPointId,
      sum: amount,
      extraInfo,
      lifetime: 5,
      redirectUrl: process.env.FRONTEND_URL || 'http://217.15.53.224:5173/dashboard'
    };

    // Создаём QR
    const createResp = await axios.post('https://api.modulbank.ru/v1/sbp/qr-codes/dynamic', body, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const { qrcId, payload } = createResp.data;

    // Сохраняем в БД
    await Payment.create({
      qrcId,
      user: req.user.id,
      username,
      amount,
      status: 'Received'
    });

    // Запрашиваем изображение QR (PNG) и кодируем в base64
    const imgResp = await axios.get(`https://api.modulbank.ru/v1/sbp/qr-codes/${qrcId}/image`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'arraybuffer'
    });

    const base64Image = 'data:image/png;base64,' + Buffer.from(imgResp.data, 'binary').toString('base64');

    return res.json({ qrcId, payload, image: base64Image, lifetime: 300 });
  } catch (error) {
    console.error('[PAYMENT] Ошибка создания платежа:', error.response?.data || error.message);
    res.status(500).json({ message: 'Ошибка создания платежа', error: error.response?.data || error.message });
  }
};

// @desc Проверить статус платежа
// @route GET /api/payment/:qrcId/status
// @access Private
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { qrcId } = req.params;
    const token = process.env.MODULBANK_TOKEN;
    if (!token) return res.status(500).json({ message: 'Отсутствует токен Modulbank' });

    // Получаем запись
    const payment = await Payment.findOne({ qrcId });
    if (!payment) return res.status(404).json({ message: 'Платёж не найден' });

    // Запрос к Modulbank
    const resp = await axios.get(`https://api.modulbank.ru/v1/sbp/qr-codes/${qrcId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`[PAYMENT] Статус от Modulbank для ${qrcId}:`, resp.data);

    const { status, amount } = resp.data;

    // Сверяем сумму (в рублях)
    if (amount !== undefined && amount !== payment.amount) {
      console.warn(`[PAYMENT] Несоответствие суммы. Modulbank=${amount}, DB=${payment.amount}`);
      return res.status(400).json({ message: 'Несоответствие суммы платежа' });
    }

    // Обновляем статус, если изменился
    if (status && status !== payment.status) {
      payment.status = status;
      await payment.save();
    }

    return res.json({ status: payment.status });
  } catch (error) {
    console.error('[PAYMENT] check status error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Ошибка проверки статуса платежа', error: error.response?.data || error.message });
  }
}; 