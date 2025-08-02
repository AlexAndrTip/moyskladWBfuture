# Настройка системы регистрации с email подтверждением

## Обзор

Система регистрации включает в себя:
- Регистрацию новых пользователей с подтверждением email
- Автоматическую отправку email с ссылкой для подтверждения
- Защиту от входа неподтвержденных пользователей
- Возможность повторной отправки email подтверждения
- Сброс пароля через email

## Настройка SMTP для отправки email

### 1. Для Gmail

1. Включите двухфакторную аутентификацию в вашем Google аккаунте
2. Создайте пароль приложения:
   - Перейдите в настройки безопасности Google
   - Найдите "Пароли приложений"
   - Создайте новый пароль для "Почта"
3. Скопируйте сгенерированный пароль

### 2. Создание файла .env

Создайте файл `.env` в корне папки `backend` со следующим содержимым:

```env
# Настройки базы данных
MONGODB_URI=mongodb://localhost:27017/moyskladwb

# JWT секрет (замените на свой секретный ключ)
JWT_SECRET=your_super_secret_jwt_key_here

# Настройки SMTP для отправки email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_from_google

# URL фронтенда для ссылок в email
FRONTEND_URL=http://localhost:5173

# Режим разработки (автоматическое подтверждение email)
NODE_ENV=development
```

### 3. Альтернативные SMTP провайдеры

#### Yandex
```env
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_USER=your_email@yandex.ru
SMTP_PASS=your_app_password
```

#### Mail.ru
```env
SMTP_HOST=smtp.mail.ru
SMTP_PORT=465
SMTP_USER=your_email@mail.ru
SMTP_PASS=your_app_password
```

#### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your_email@outlook.com
SMTP_PASS=your_password
```

## Режимы работы

### Режим разработки (NODE_ENV=development)
- Email автоматически подтверждается при регистрации
- Пользователь сразу получает токен для входа
- Удобно для тестирования без настройки SMTP

### Режим продакшена (NODE_ENV=production)
- Требуется подтверждение email для входа
- SMTP должен быть обязательно настроен
- Без подтверждения email пользователь не может войти в систему

## API Endpoints

### Регистрация
```
POST /api/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123"
}
```

### Подтверждение email
```
GET /api/auth/verify-email?token=verification_token
```

### Повторная отправка email подтверждения
```
POST /api/auth/resend-verification
Content-Type: application/json

{
  "email": "test@example.com"
}
```

### Запрос сброса пароля
```
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "test@example.com"
}
```

### Сброс пароля
```
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset_token",
  "newPassword": "newpassword123"
}
```

### Регистрация админа (для первого админа)
```
POST /api/auth/register-admin
Content-Type: application/json

{
  "username": "admin",
  "email": "admin@example.com",
  "password": "adminpassword123",
  "role": "admin"
}
```

## Безопасность

1. **Пароли**: Автоматически хешируются с помощью bcrypt
2. **Токены**: JWT токены с истечением через 1 час
3. **Email токены**: Действительны 24 часа для подтверждения
4. **Токены сброса пароля**: Действительны 1 час
5. **Валидация**: Проверка формата email, длины пароля, уникальности username/email

## Устранение неполадок

### Ошибка "SMTP не настроен"
- Проверьте наличие файла `.env`
- Убедитесь, что переменные `SMTP_USER` и `SMTP_PASS` установлены
- Проверьте правильность пароля приложения

### Email не отправляется
- Проверьте настройки SMTP (хост, порт, логин, пароль)
- Убедитесь, что двухфакторная аутентификация включена (для Gmail)
- Проверьте, что пароль приложения создан правильно

### Пользователь не может войти после регистрации
- Проверьте, подтвержден ли email
- В режиме разработки email подтверждается автоматически
- В продакшене пользователь должен перейти по ссылке из email

## Тестирование

1. Зарегистрируйте нового пользователя
2. Проверьте получение email (или автоматическое подтверждение в режиме разработки)
3. Попробуйте войти в систему
4. Протестируйте повторную отправку email подтверждения
5. Протестируйте сброс пароля

## Фронтенд интеграция

Фронтенд уже настроен для работы с новой системой регистрации:
- Страница регистрации: `/register`
- Страница подтверждения email: `/verify-email`
- Ссылки между страницами входа и регистрации
- Обработка ошибок и успешных сообщений 