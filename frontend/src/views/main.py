# main.py
import logging
import asyncio
# import downloader_yt_dpl # Эту строку можно удалить, если downloader_yt_dpl больше не используется напрямую здесь

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import (
    Application,
    CommandHandler,
    CallbackQueryHandler,
    ContextTypes
)

from config import BOT_TOKEN
from user_db import (
    init_db,
    add_user,
    get_user_status,
    request_access_handler,
    approve_or_decline_handler,
    get_user_access_list
)
# Импорты ConversationHandler, которые были возвращены
from download_video import download_video_conversation
from getaudio import extract_audio_conversation
from AudioTotext import extract_text_conversation
from tts import tts_conversation
from scenario import scenario_conversation
from tts_processor import tts_processor_conversation
from generate_video_conversation import generate_video_conversation


logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)


async def go_back_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    if query:
        try:
            await query.answer()
        except Exception as e:
            logger.warning(f"⚠️ query.answer() error: {e}")
        try:
            await query.message.delete()
        except Exception as e:
            logger.info(f"Не удалось удалить сообщение при возврате назад: {e}")

    context.user_data.clear()
    logger.info(f"User {update.effective_user.id}: navigated back, user_data cleared.")
    source_for_menu = query or update.message or update
    await show_main_menu(source_for_menu)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    context.user_data.clear()
    add_user(user)
    status = get_user_status(user.id)

    if status == 'approved':
        await update.message.reply_text(
            "Привет! Я бот, который поможет тебе с обработкой видео, аудио и сценариев. "
            "Выбери действие из меню ниже:"
        )
        await show_main_menu(update.message)
    elif status == 'pending':
        await update.message.reply_text("Ваш запрос уже отправлен администратору. Ожидайте.")
    else:
        keyboard = [
            [InlineKeyboardButton("Запросить доступ", callback_data='request_access')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await update.message.reply_text(
            "У вас нет доступа. Нажмите кнопку ниже, чтобы запросить доступ.",
            reply_markup=reply_markup
        )


async def show_main_menu(source_update_obj):
    keyboard = [
        [
            InlineKeyboardButton("📥 Скачать видео", callback_data='download_video'),
            InlineKeyboardButton("🔊 Извлечь аудио", callback_data='extract_audio')
        ],
        [
            InlineKeyboardButton("📝 Извлечь текст", callback_data='extract_text'),
            InlineKeyboardButton("🗣️ Озвучить", callback_data='tts_initiate')
        ],
        [
            InlineKeyboardButton("🎬 Сценарий для Reels (4 шт.)", callback_data='generate_script')
        ],
        [
            InlineKeyboardButton("📹 Сгенерировать видео с аватаром", callback_data='generate_video')
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    menu_text = "Выберите действие:"
    if hasattr(source_update_obj, 'reply_text'):
        await source_update_obj.reply_text(menu_text, reply_markup=reply_markup)
    else:
        await source_update_obj.message.reply_text(menu_text, reply_markup=reply_markup)


async def handle_command_as_callback(update: Update, context: ContextTypes.DEFAULT_TYPE, callback_data_str: str):
    """
    Универсальная функция для обработки команд, которая имитирует вызов CallbackQuery.
    Это позволит запустить ConversationHandler, который настроен на CallbackQueryHandler.
    """
    user_id = update.effective_user.id
    allowed = get_user_access_list(user_id)

    if callback_data_str not in allowed:
        await update.message.reply_text(f"❌ У вас нет прав на '{callback_data_str}'.")
        return

    # Создаем фиктивный объект CallbackQuery.
    # Добавляем все необходимые атрибуты, которые могут быть проверены CallbackQueryHandler.
    # Устанавливаем их в None, если они не применимы для имитации.
    fake_query = type('obj', (object,), {
        'id': f'fake_{update.update_id}',
        'from_user': update.effective_user,
        'message': update.message,
        'chat_instance': 'fake_chat_instance',
        'data': callback_data_str,
        'answer': lambda *args, **kwargs: None, # Пустая функция для answer
        # Добавляем отсутствующие атрибуты, которые могут проверяться в Telegram.ext:
        'game_short_name': None,
        'inline_message_id': None,
        'chat_instance': 'fake_chat_instance', # Обычно есть для квери
        'from_user': update.effective_user, # Убеждаемся, что from_user корректен
        'chat': update.effective_chat # Добавляем chat, если вдруг требуется
    })()

    # Создаем фиктивный Update объект, который будет содержать наш CallbackQuery
    fake_update = Update(update_id=update.update_id, callback_query=fake_query)

    # Отправляем его в очередь обработки Application
    await context.application.update_queue.put(fake_update)
    logger.info(f"User {user_id}: Command '{callback_data_str}' simulated as CallbackQuery.")


async def download_video_command_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await handle_command_as_callback(update, context, 'download_video')

async def extract_audio_command_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await handle_command_as_callback(update, context, 'extract_audio')

async def extract_text_command_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await handle_command_as_callback(update, context, 'extract_text')

async def tts_initiate_command_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await handle_command_as_callback(update, context, 'tts_initiate')

async def generate_script_command_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await handle_command_as_callback(update, context, 'generate_script')

async def generate_video_command_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await handle_command_as_callback(update, context, 'generate_video')


async def on_startup(app: Application) -> None:
    logger.info("Бот запущен!")
    # logger.info("on_startup: запускаем background task process_queue()")
    # app.bot_data["process_queue_task"] = asyncio.create_task(downloader_yt_dpl.process_queue())
    # Эти строки больше не нужны, так как нет очереди


async def on_shutdown(app: Application) -> None:
    logger.info("Бот выключается!")
    # logger.info("on_shutdown: завершаем background task process_queue()")
    # task = app.bot_data.get("process_queue_task")
    # if task:
    #     task.cancel()
    #     try:
    #         await task
    #     except asyncio.CancelledError:
    #         logger.info("✅ process_queue завершён корректно")
    # Эти строки больше не нужны, так как нет очереди


def main():
    init_db()

    application = (
        Application
        .builder()
        .token(BOT_TOKEN)
        .post_init(on_startup)
        .post_shutdown(on_shutdown)
        .build()
    )

    application.add_handler(CommandHandler('start', start))
    application.add_handler(CallbackQueryHandler(go_back_handler, pattern=r'^go_back$'))
    application.add_handler(CallbackQueryHandler(request_access_handler, pattern=r'^request_access$'))
    application.add_handler(CallbackQueryHandler(approve_or_decline_handler, pattern=r'^(approve|decline)_\d+$'))


    application.add_handler(download_video_conversation)
    application.add_handler(extract_audio_conversation)
    application.add_handler(extract_text_conversation)
    application.add_handler(tts_conversation)
    application.add_handler(scenario_conversation)
    application.add_handler(tts_processor_conversation)
    application.add_handler(generate_video_conversation)

    application.run_polling()


if __name__ == '__main__':
    main()
