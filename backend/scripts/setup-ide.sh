#!/bin/bash

# Скрипт настройки IDE для удаленной разработки

set -e

echo "🔧 Настройка IDE для удаленной разработки..."

# Проверка SSH ключей
if [ ! -f ~/.ssh/id_rsa ]; then
    echo "🔑 Создание SSH ключей..."
    ssh-keygen -t rsa -b 4096 -C "$(whoami)@$(hostname)" -f ~/.ssh/id_rsa -N ""
    echo "✅ SSH ключи созданы"
else
    echo "✅ SSH ключи уже существуют"
fi

# Показ публичного ключа
echo "📋 Ваш публичный SSH ключ:"
echo "=================================="
cat ~/.ssh/id_rsa.pub
echo "=================================="
echo ""
echo "💡 Добавьте этот ключ в:"
echo "   - GitHub: Settings -> SSH and GPG keys"
echo "   - GitLab: Preferences -> SSH Keys"
echo ""

# Создание конфигурации SSH для клиента
echo "📝 Создание конфигурации SSH для клиента..."
cat > ~/ssh-config-client.txt << EOF
# Добавьте это в ~/.ssh/config на вашей локальной машине

Host moysklad-server
    HostName $(hostname -I | awk '{print $1}')
    User $(whoami)
    Port 22
    IdentityFile ~/.ssh/id_rsa
    ServerAliveInterval 60
    ServerAliveCountMax 3
EOF

echo "✅ Конфигурация SSH создана: ~/ssh-config-client.txt"
echo ""

# Создание инструкций для Cursor/VS Code
echo "📝 Создание инструкций для Cursor/VS Code..."
cat > ~/cursor-setup.txt << EOF
# Настройка Cursor/VS Code для удаленной разработки

## 1. Установка расширений
- Remote - SSH
- Remote - SSH: Editing Configuration Files
- Remote - Containers
- Docker

## 2. Подключение к серверу
1. Откройте Cursor/VS Code
2. Нажмите Ctrl+Shift+P
3. Выберите "Remote-SSH: Connect to Host"
4. Выберите "moysklad-server" (или введите: $(whoami)@$(hostname -I | awk '{print $1}'))
5. Откройте папку: /home/$(whoami)/projects/moyskladWBfuture

## 3. Настройка проекта
- Откройте терминал в Cursor/VS Code
- Выполните: ./scripts/manage.sh status
- Проверьте, что все контейнеры запущены

## 4. Полезные команды
- Ctrl+Shift+P -> "Remote-SSH: Connect to Host"
- Ctrl+Shift+P -> "Remote-SSH: Kill VS Code Server on Host"
- Ctrl+Shift+P -> "Remote-SSH: Restart VS Code Server"
EOF

echo "✅ Инструкции для Cursor/VS Code созданы: ~/cursor-setup.txt"
echo ""

# Создание инструкций для GitKraken
echo "📝 Создание инструкций для GitKraken..."
cat > ~/gitkraken-setup.txt << EOF
# Настройка GitKraken

## 1. Клонирование репозитория
1. Откройте GitKraken
2. File -> Clone Repo
3. Выберите GitHub/GitLab
4. Выберите ваш репозиторий
5. Укажите локальную папку

## 2. Настройка SSH ключей
1. Preferences -> Authentication
2. SSH Key -> Generate New Key
3. Или используйте существующий ключ
4. Добавьте публичный ключ в GitHub/GitLab

## 3. Настройка удаленного репозитория
- Remote URL: git@github.com:username/moyskladWBfuture.git
- Authentication: SSH Key
EOF

echo "✅ Инструкции для GitKraken созданы: ~/gitkraken-setup.txt"
echo ""

# Создание инструкций для Atom
echo "📝 Создание инструкций для Atom..."
cat > ~/atom-setup.txt << EOF
# Настройка Atom для удаленной разработки

## 1. Установка расширений
- remote-ftp
- ftp-remote-edit

## 2. Настройка подключения
1. Packages -> Remote-FTP -> Toggle
2. Настройте подключение:
   - Host: $(hostname -I | awk '{print $1}')
   - User: $(whoami)
   - Remote: /home/$(whoami)/projects/moyskladWBfuture
   - Local: /path/to/local/project
   - Protocol: SFTP
   - Port: 22

## 3. Альтернативный способ
1. Packages -> FTP Remote Edit -> Toggle
2. Настройте SFTP подключение
3. Используйте SSH ключи для аутентификации
EOF

echo "✅ Инструкции для Atom созданы: ~/atom-setup.txt"
echo ""

# Создание скрипта для быстрого подключения
echo "📝 Создание скрипта для быстрого подключения..."
cat > ~/connect-ide.sh << 'EOF'
#!/bin/bash

echo "🔧 Быстрое подключение к проекту MoyskladWB"
echo ""
echo "Выберите IDE:"
echo "1) Cursor/VS Code (Remote-SSH)"
echo "2) GitKraken"
echo "3) Atom (Remote-FTP)"
echo "4) Показать SSH ключ"
echo "5) Показать статус контейнеров"
echo ""

read -p "Введите номер (1-5): " choice

case $choice in
    1)
        echo "📋 Для подключения через Cursor/VS Code:"
        echo "1. Откройте Cursor/VS Code"
        echo "2. Ctrl+Shift+P -> Remote-SSH: Connect to Host"
        echo "3. Выберите: $(whoami)@$(hostname -I | awk '{print $1}')"
        echo "4. Откройте папку: /home/$(whoami)/projects/moyskladWBfuture"
        ;;
    2)
        echo "📋 Для подключения через GitKraken:"
        echo "1. Откройте GitKraken"
        echo "2. File -> Clone Repo"
        echo "3. Выберите ваш репозиторий"
        echo "4. Настройте SSH ключи в Preferences"
        ;;
    3)
        echo "📋 Для подключения через Atom:"
        echo "1. Установите расширение remote-ftp"
        echo "2. Packages -> Remote-FTP -> Toggle"
        echo "3. Настройте SFTP подключение к: $(hostname -I | awk '{print $1}')"
        ;;
    4)
        echo "🔑 Ваш публичный SSH ключ:"
        echo "=================================="
        cat ~/.ssh/id_rsa.pub
        echo "=================================="
        ;;
    5)
        echo "📊 Статус контейнеров:"
        cd /home/$(whoami)/projects/moyskladWBfuture
        ./scripts/manage.sh status
        ;;
    *)
        echo "❌ Неверный выбор"
        ;;
esac
EOF

chmod +x ~/connect-ide.sh
echo "✅ Скрипт быстрого подключения создан: ~/connect-ide.sh"
echo ""

# Создание алиасов для удобства
echo "📝 Создание алиасов для удобства..."
cat >> ~/.bashrc << 'EOF'

# Алиасы для проекта MoyskladWB
alias moysklad='cd /home/$(whoami)/projects/moyskladWBfuture'
alias moysklad-logs='cd /home/$(whoami)/projects/moyskladWBfuture && ./scripts/manage.sh logs'
alias moysklad-status='cd /home/$(whoami)/projects/moyskladWBfuture && ./scripts/manage.sh status'
alias moysklad-restart='cd /home/$(whoami)/projects/moyskladWBfuture && ./scripts/manage.sh restart'
alias moysklad-connect='~/connect-ide.sh'
EOF

echo "✅ Алиасы добавлены в ~/.bashrc"
echo ""

# Перезагрузка bashrc
source ~/.bashrc

echo "🎉 Настройка IDE завершена!"
echo ""
echo "📋 Созданные файлы:"
echo "   - ~/ssh-config-client.txt     - Конфигурация SSH для клиента"
echo "   - ~/cursor-setup.txt          - Инструкции для Cursor/VS Code"
echo "   - ~/gitkraken-setup.txt       - Инструкции для GitKraken"
echo "   - ~/atom-setup.txt            - Инструкции для Atom"
echo "   - ~/connect-ide.sh            - Скрипт быстрого подключения"
echo ""
echo "🚀 Полезные команды:"
echo "   moysklad                       - Перейти в папку проекта"
echo "   moysklad-status                - Показать статус контейнеров"
echo "   moysklad-logs                  - Показать логи"
echo "   moysklad-restart               - Перезапустить контейнеры"
echo "   moysklad-connect               - Быстрое подключение к IDE"
echo ""
echo "💡 Следующие шаги:"
echo "   1. Скопируйте публичный SSH ключ в GitHub/GitLab"
echo "   2. Настройте IDE согласно инструкциям"
echo "   3. Подключитесь к серверу через IDE"
echo "   4. Запустите проект: ./scripts/deploy.sh"
