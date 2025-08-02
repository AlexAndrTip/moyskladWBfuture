const nodemailer = require('nodemailer');
const path = require('path');
// Подстраховка: если FRONTEND_URL не задан, пробуем загрузить .env
if (!process.env.FRONTEND_URL) {
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
}

// Создаем транспортер для отправки email
const createTransporter = () => {
  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // true для 465, false для других портов
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    // Дополнительные настройки для лучшей совместимости
    tls: {
      rejectUnauthorized: false
    },
    // Таймауты
    connectionTimeout: 60000, // 60 секунд
    greetingTimeout: 30000,   // 30 секунд
    socketTimeout: 60000      // 60 секунд
  };

  // Если используется порт 465, включаем SSL
  if (config.port === 465) {
    config.secure = true;
  }

  console.log('SMTP Config:', {
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.auth.user
  });

  return nodemailer.createTransport(config);
};

// Проверка подключения к SMTP
const testSMTPConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('SMTP соединение успешно установлено');
    return true;
  } catch (error) {
    console.error('Ошибка проверки SMTP соединения:', error);
    return false;
  }
};

// Отправка email для подтверждения регистрации
const sendVerificationEmail = async (email, username, verificationToken) => {
  try {
    // Сначала проверяем соединение
    const isConnected = await testSMTPConnection();
    if (!isConnected) {
      console.error('Не удалось установить соединение с SMTP сервером');
      return false;
    }

    const transporter = createTransporter();
    
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
      from: `"МойСклад Wildberries" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Подтверждение регистрации - МойСклад Wildberries',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Добро пожаловать в систему МойСклад Wildberries!</h2>
          <p>Здравствуйте, <strong>${username}</strong>!</p>
          <p>Спасибо за регистрацию в нашей системе. Для завершения регистрации, пожалуйста, подтвердите ваш email адрес.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #4CAF50; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Подтвердить Email
            </a>
          </div>
          
          <p>Или скопируйте эту ссылку в браузер:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          
          <p><strong>Важно:</strong> Ссылка действительна в течение 24 часов.</p>
          
          <p>Если вы не регистрировались в нашей системе, просто проигнорируйте это письмо.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            Это автоматическое письмо, не отвечайте на него.
          </p>
        </div>
      `
    };

    console.log('Отправка email на:', email);
    const info = await transporter.sendMail(mailOptions);
    console.log('Email успешно отправлен:', info.messageId);
    return true;
  } catch (error) {
    console.error('Ошибка отправки email:', error);
    
    // Детальная диагностика ошибки
    if (error.code === 'ETIMEDOUT') {
      console.error('Таймаут соединения с SMTP сервером. Проверьте настройки сети и SMTP.');
    } else if (error.code === 'EAUTH') {
      console.error('Ошибка аутентификации SMTP. Проверьте логин и пароль.');
    } else if (error.code === 'ESOCKET') {
      console.error('Ошибка сокета SMTP. Проверьте настройки порта и безопасности.');
    }
    
    return false;
  }
};

// Отправка email для сброса пароля
const sendPasswordResetEmail = async (email, username, resetToken) => {
  try {
    // Сначала проверяем соединение
    const isConnected = await testSMTPConnection();
    if (!isConnected) {
      console.error('Не удалось установить соединение с SMTP сервером');
      return false;
    }

    const transporter = createTransporter();
    
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: `"МойСклад Wildberries" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Сброс пароля - МойСклад Wildberries',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Сброс пароля</h2>
          <p>Здравствуйте, <strong>${username}</strong>!</p>
          <p>Вы запросили сброс пароля для вашего аккаунта.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #dc3545; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Сбросить пароль
            </a>
          </div>
          
          <p>Или скопируйте эту ссылку в браузер:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          
          <p><strong>Важно:</strong> Ссылка действительна в течение 1 часа.</p>
          
          <p>Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            Это автоматическое письмо, не отвечайте на него.
          </p>
        </div>
      `
    };

    console.log('Отправка email для сброса пароля на:', email);
    const info = await transporter.sendMail(mailOptions);
    console.log('Email для сброса пароля успешно отправлен:', info.messageId);
    return true;
  } catch (error) {
    console.error('Ошибка отправки email для сброса пароля:', error);
    return false;
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  testSMTPConnection
}; 