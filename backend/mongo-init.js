// Скрипт инициализации MongoDB
db = db.getSiblingDB('moysklad_wb');

// Создание пользователя для приложения
db.createUser({
  user: 'moysklad_user',
  pwd: 'moysklad_password',
  roles: [
    {
      role: 'readWrite',
      db: 'moysklad_wb'
    }
  ]
});

// Создание индексов для оптимизации
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "username": 1 }, { unique: true });
db.products.createIndex({ "nmID": 1 });
db.products.createIndex({ "user": 1, "nmID": 1 });
db.products.createIndex({ "wbCabinet": 1 });
db.products.createIndex({ "integrationLink": 1 });
db.queuetasks.createIndex({ "status": 1, "priority": -1, "createdAt": 1 });
db.queuetasks.createIndex({ "userId": 1, "status": 1 });
db.queuetasks.createIndex({ "type": 1, "status": 1 });

print('MongoDB инициализирован успешно');
