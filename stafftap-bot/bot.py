import telebot
import os
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from database import engine, SessionLocal, init_db
from models import User, BotSetting, UserRole, Payment, CommissionSetting
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timedelta
from datetime import datetime, timezone
from apscheduler.schedulers.background import BackgroundScheduler
load_dotenv()
TOKEN = os.getenv("TELEGRAM_TOKEN")
WEB_APP_URL = os.getenv("WEB_APP_URL")
YOOKASSA_TOKEN = os.getenv("YOOKASSA_SECRET_KEY")  

bot = telebot.TeleBot(TOKEN)
init_db()

admin_states = {}
payment_states = {}

def get_setting(db: Session, key: str, default: str = None) -> str:
    setting = db.query(BotSetting).filter(BotSetting.key == key).first()
    if setting:
        return setting.value
    elif default is not None:
        new_setting = BotSetting(key=key, value=default)
        db.add(new_setting)
        db.commit()
        return default
    return None

def update_setting(db: Session, key: str, value: str):
    setting = db.query(BotSetting).filter(BotSetting.key == key).first()
    if setting:
        setting.value = value
    else:
        setting = BotSetting(key=key, value=value)
        db.add(setting)
    db.commit()

def is_admin(db: Session, telegram_id: int) -> bool:
    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    return user and user.role == UserRole.admin

def get_user_by_email(db: Session, email: str) -> User:
    return db.query(User).filter(User.email == email).first()

def get_user_by_telegram_id(db: Session, telegram_id: int) -> User:
    return db.query(User).filter(User.telegram_id == telegram_id).first()

def is_user_blocked(db: Session, telegram_id: int) -> bool:
    user = get_user_by_telegram_id(db, telegram_id)
    if not user:
        return False
        
    
    if user.blocked_until and user.blocked_until > datetime.utcnow():
        return True
    return False

def check_and_unblock_users():
    with SessionLocal() as db:
        now = datetime.now(timezone.utc)
        users_to_unblock = db.query(User).filter(
            User.is_blocked == True,
            User.blocked_until <= now
        ).all()
        
        for user in users_to_unblock:
            user.is_blocked = False
            user.blocked_until = None
            user.block_reason = None
            
            try:
                bot.send_message(user.telegram_id, "✅ Ваша блокировка автоматически снята!")
            except Exception as e:
                print(f"Ошибка отправки сообщения пользователю {user.id}: {str(e)}")
        
        db.commit()

def calculate_payment_amount(amount: float) -> tuple[Decimal, Decimal]:
    amount_dec = Decimal(str(amount)).quantize(Decimal('0.01'))
    
    with SessionLocal() as db:
        setting = db.query(CommissionSetting).first()
        if not setting or not setting.is_active:
            return (amount_dec, Decimal('0.00'))
        
        if setting.commission_type == 'percentage':
            commission = (amount_dec) * (setting.value / Decimal('100'))
            commission = commission.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            
            if setting.min_amount is not None and commission < setting.min_amount:
                commission = setting.min_amount
                
            total_amount = (amount_dec + commission).quantize(Decimal('0.01'))
            return (total_amount, commission)
        
        elif setting.commission_type == 'fixed':
            commission = setting.value
            total_amount = (amount_dec + commission).quantize(Decimal('0.01'))
            return (total_amount, commission)
    
    return (amount_dec, Decimal('0.00'))

def initialize_settings():
    with SessionLocal() as db:
        welcome = db.query(BotSetting).filter(BotSetting.key == "welcome_message").first()
        if not welcome:
            default_welcome = (
                "StaffTap — твой быстрый способ найти проверенных сотрудников или работу на день!"
            )
            db.add(BotSetting(key="welcome_message", value=default_welcome))
            db.commit()
        
        if db.query(CommissionSetting).count() == 0:
            default_commission = CommissionSetting(
                is_active=False,
                commission_type='percentage',
                value=0.0,
                min_amount=0.0
            )
            db.add(default_commission)
            db.commit()

initialize_settings()

@bot.message_handler(commands=['start'])
def send_welcome(message):
    with SessionLocal() as db:
        
        if is_user_blocked(db, message.from_user.id):
            user = get_user_by_telegram_id(db, message.from_user.id)
            msg = f"⛔ Ваш аккаунт заблокирован до {user.blocked_until.strftime('%d.%m.%Y %H:%M')} по московскому времени."
            if user.block_reason:
                msg += f"\nПричина: {user.block_reason}"
            bot.send_message(message.chat.id, msg)
            return
        
        welcome_message = get_setting(db, "welcome_message")
    
    markup = telebot.types.InlineKeyboardMarkup(row_width=1)
    
    
    with SessionLocal() as db:
        if not is_user_blocked(db, message.from_user.id):
            btn_app = telebot.types.InlineKeyboardButton(
                text="Открыть приложение",
                web_app=telebot.types.WebAppInfo(url=WEB_APP_URL)
            )
            markup.add(btn_app)
    
    btn_pay = telebot.types.InlineKeyboardButton(
        text="Пополнить баланс",
        callback_data="pay_balance"
    )
    markup.add(btn_pay)
    
    bot.send_message(
        message.chat.id,
        welcome_message,
        reply_markup=markup
    )

@bot.callback_query_handler(func=lambda call: call.data == "pay_balance")
def handle_pay_callback(call):
    with SessionLocal() as db:
        if is_user_blocked(db, call.from_user.id):
            user = get_user_by_telegram_id(db, call.from_user.id)
            msg = f"⛔ Ваш аккаунт заблокирован до {user.blocked_until.strftime('%d.%m.%Y %H:%M')}."
            if user.block_reason:
                msg += f"\nПричина: {user.block_reason}"
            bot.send_message(call.message.chat.id, msg)
            return
    
    bot.send_message(call.message.chat.id, "💰 Введите сумму пополнения в рублях (например: 1000):")
    payment_states[call.from_user.id] = {"state": "waiting_pay_amount"}

@bot.message_handler(func=lambda message: message.from_user.id in payment_states)
def handle_pay_amount(message):
    """Обработка введенной суммы для пополнения"""
    user_id = message.from_user.id
    state_data = payment_states.get(user_id)
    
    if not state_data or state_data["state"] != "waiting_pay_amount":
        return
        
    try:
        amount = float(message.text.strip())
        if amount <= 0:
            bot.send_message(message.chat.id, "❌ Сумма должна быть положительной.")
            return

        total_amount, commission = calculate_payment_amount(amount)
        
        description = f"Пополнение баланса на {amount} руб."
        if commission > 0:
            description += f" (комиссия {commission:.2f} руб.)"

        prices = [telebot.types.LabeledPrice(
            label="Пополнение баланса", 
            amount=int(total_amount * 100)  
        )]

        bot.send_invoice(
            message.chat.id,
            title="Пополнение баланса",
            description=description,
            invoice_payload=f"balance_topup_{amount}",
            provider_token=YOOKASSA_TOKEN,
            currency="RUB",
            prices=prices,
            start_parameter="balance_topup"
        )
        
        del payment_states[user_id]
        
    except ValueError:
        bot.send_message(message.chat.id, "❌ Неверный формат суммы. Введите число.")

@bot.message_handler(commands=['pay'])
def handle_pay_command(message):
    """Обработчик команды пополнения баланса"""
    with SessionLocal() as db:
        if is_user_blocked(db, message.from_user.id):
            user = get_user_by_telegram_id(db, message.from_user.id)
            msg = f"⛔ Ваш аккаунт заблокирован до {user.blocked_until.strftime('%d.%m.%Y %H:%M')}."
            if user.block_reason:
                msg += f"\nПричина: {user.block_reason}"
            bot.reply_to(message, msg)
            return
            
    try:
        parts = message.text.split()
        if len(parts) < 2:
            bot.reply_to(message, "ℹ️ Использование: /pay <сумма>")
            return

        amount = float(parts[1])
        if amount <= 0:
            bot.reply_to(message, "❌ Сумма должна быть положительной.")
            return

        total_amount, commission = calculate_payment_amount(amount)
        
        description = f"Пополнение баланса на {amount} руб."
        if commission > 0:
            description += f" (комиссия {commission:.2f} руб.)"

        prices = [telebot.types.LabeledPrice(
            label="Пополнение баланса", 
            amount=int(total_amount * 100)
        )]

        bot.send_invoice(
            message.chat.id,
            title="Пополнение баланса",
            description=description,
            invoice_payload=f"balance_topup_{amount}",
            provider_token=YOOKASSA_TOKEN,
            currency="RUB",
            prices=prices,
            start_parameter="balance_topup"
        )
    except ValueError:
        bot.reply_to(message, "❌ Неверный формат суммы. Введите число.")

@bot.pre_checkout_query_handler(func=lambda query: True)
def pre_checkout_handler(pre_checkout_query):
    """Подтверждение платежа"""
    bot.answer_pre_checkout_query(pre_checkout_query.id, ok=True)

@bot.message_handler(content_types=['successful_payment'])
def successful_payment_handler(message):
    """Обработка успешного платежа"""
    payment_info = message.successful_payment
    payload = payment_info.invoice_payload
    
    try:
        total_amount = Decimal(str(payment_info.total_amount / 100)).quantize(Decimal('0.01'))
        
        if payload.startswith("balance_topup_"):
            amount = Decimal(payload.split('_')[2]).quantize(Decimal('0.01'))
    except Exception as e:
        bot.reply_to(message, f"⚠️ Ошибка обработки платежа: {str(e)}")
        return

    with SessionLocal() as db:
        user = get_user_by_telegram_id(db, message.from_user.id)
        if not user:
            bot.reply_to(message, "⚠️ Пользователь не найден.")
            return

        _, commission = calculate_payment_amount(float(amount))

        payment = Payment(
            user_id=user.id,
            amount=amount,
            commission=commission,
            status="succeeded",
            payment_id=payment_info.provider_payment_charge_id,
            is_processed=True
        )
        db.add(payment)

        user.balance += amount
        db.commit()

    bot.send_message(message.chat.id, f"✅ Ваш баланс успешно пополнен на {amount:.2f} руб.!")

@bot.message_handler(commands=['admin'])
def admin_panel(message):
    with SessionLocal() as db:
        if not is_admin(db, message.from_user.id):
            bot.reply_to(message, "⛔ У вас нет прав администратора!")
            return

    markup = telebot.types.ReplyKeyboardMarkup(resize_keyboard=True)
    btn1 = telebot.types.KeyboardButton("Назначить администратора")
    btn2 = telebot.types.KeyboardButton("Изменить приветствие")
    btn3 = telebot.types.KeyboardButton("Заблокировать пользователя")
    btn4 = telebot.types.KeyboardButton("Разблокировать пользователя")
    btn5 = telebot.types.KeyboardButton("Статистика")
    btn6 = telebot.types.KeyboardButton("Настройки комиссии")  
    markup.add(btn1, btn2, btn3, btn4, btn5, btn6)
    
    bot.send_message(message.chat.id, "⚙️ Админ-панель:", reply_markup=markup)

@bot.message_handler(func=lambda message: message.text == "Назначить администратора")
def make_admin_start(message):
    with SessionLocal() as db:
        if not is_admin(db, message.from_user.id):
            return
    
    admin_states[message.from_user.id] = {"state": "waiting_admin_email"}
    bot.send_message(message.chat.id, "✉️ Введите email пользователя:")

@bot.message_handler(func=lambda message: message.text == "Изменить приветствие")
def change_welcome_start(message):
    with SessionLocal() as db:
        if not is_admin(db, message.from_user.id):
            return
    
    admin_states[message.from_user.id] = {"state": "waiting_welcome_text"}
    bot.send_message(message.chat.id, "📝 Введите новое приветственное сообщение:")

@bot.message_handler(func=lambda message: message.text == "Заблокировать пользователя")
def block_user_start(message):
    with SessionLocal() as db:
        if not is_admin(db, message.from_user.id):
            return
    
    admin_states[message.from_user.id] = {
        "state": "waiting_block_email",
        "step": 1  
    }
    bot.send_message(message.chat.id, "✉️ Введите email пользователя:")

@bot.message_handler(func=lambda message: message.text == "Разблокировать пользователя")
def unblock_user_start(message):
    with SessionLocal() as db:
        if not is_admin(db, message.from_user.id):
            return
    
    admin_states[message.from_user.id] = {"state": "waiting_unblock_email"}
    bot.send_message(message.chat.id, "✉️ Введите email пользователя для разблокировки:")

@bot.message_handler(func=lambda message: message.text == "Статистика")
def show_stats(message):
    with SessionLocal() as db:
        if not is_admin(db, message.from_user.id):
            return
        
        total_users = db.query(User).count()
        employers = db.query(User).filter(User.role == UserRole.employer).count()
        workers = db.query(User).filter(User.role == UserRole.worker).count()
        admins = db.query(User).filter(User.role == UserRole.admin).count()
        blocked = db.query(User).filter(User.is_blocked == True).count()
        
        stats = (
            "📊 Статистика системы:\n\n"
            f"👥 Всего пользователей: {total_users}\n"
            f"👔 Работодателей: {employers}\n"
            f"👷 Работников: {workers}\n"
            f"👑 Администраторов: {admins}\n"
            f"🚫 Заблокированных: {blocked}"
        )
        
        bot.send_message(message.chat.id, stats)

@bot.message_handler(func=lambda message: message.text == "Настройки комиссии")
def commission_settings(message):
    with SessionLocal() as db:
        if not is_admin(db, message.from_user.id):
            return
        
        commission = db.query(CommissionSetting).first()
        if not commission:
            bot.send_message(message.chat.id, "⚠️ Настройки комиссии не найдены")
            return
            
        status = "✅ Включена" if commission.is_active else "❌ Отключена"
        commission_type = "Процентная" if commission.commission_type == "percentage" else "Фиксированная"
        min_info = f"\nМинимальная комиссия: {commission.min_amount:.2f} руб." if commission.min_amount else ""
        
        info = (
            "⚙️ Текущие настройки комиссии:\n\n"
            f"Статус: {status}\n"
            f"Тип комиссии: {commission_type}\n"
            f"Размер: {commission.value}{'%' if commission.commission_type == 'percentage' else ' руб.'}"
            f"{min_info}"
        )
        
        markup = telebot.types.InlineKeyboardMarkup()
        btn_toggle = telebot.types.InlineKeyboardButton(
            text="Включить/выключить" if not commission.is_active else "Включить/выключить",
            callback_data="toggle_commission"
        )
        btn_edit = telebot.types.InlineKeyboardButton(
            text="Изменить параметры",
            callback_data="edit_commission"
        )
        markup.add(btn_toggle, btn_edit)
        
        bot.send_message(message.chat.id, info, reply_markup=markup)

@bot.callback_query_handler(func=lambda call: call.data == "toggle_commission")
def toggle_commission(call):
    with SessionLocal() as db:
        if not is_admin(db, call.from_user.id):
            bot.answer_callback_query(call.id, "⛔ Доступ запрещен")
            return
            
        commission = db.query(CommissionSetting).first()
        if commission:
            commission.is_active = not commission.is_active
            db.commit()
            status = "включена" if commission.is_active else "выключена"
            bot.answer_callback_query(call.id, f"✅ Комиссия {status}")
            
            commission_settings(call.message)
        else:
            bot.answer_callback_query(call.id, "⚠️ Настройки не найдены")

@bot.callback_query_handler(func=lambda call: call.data == "edit_commission")
def edit_commission_start(call):
    with SessionLocal() as db:
        if not is_admin(db, call.from_user.id):
            bot.answer_callback_query(call.id, "⛔ Доступ запрещен")
            return
            
        admin_states[call.from_user.id] = {
            "state": "waiting_commission_type",
            "message_id": call.message.message_id
        }
        
        markup = telebot.types.InlineKeyboardMarkup()
        btn_percent = telebot.types.InlineKeyboardButton(
            text="Процентная",
            callback_data="commission_percentage"
        )
        btn_fixed = telebot.types.InlineKeyboardButton(
            text="Фиксированная",
            callback_data="commission_fixed"
        )
        markup.add(btn_percent, btn_fixed)
        
        bot.edit_message_text(
            "📊 Выберите тип комиссии:",
            call.message.chat.id,
            call.message.message_id,
            reply_markup=markup
        )

@bot.callback_query_handler(func=lambda call: call.data.startswith("commission_"))
def set_commission_type(call):
    c_type = call.data.split('_')[1]
    with SessionLocal() as db:
        if not is_admin(db, call.from_user.id):
            bot.answer_callback_query(call.id, "⛔ Доступ запрещен")
            return
            
        admin_states[call.from_user.id] = {
            "state": "waiting_commission_value",
            "type": c_type,
            "message_id": call.message.message_id
        }
        
        text = "Введите размер комиссии (в процентах):" if c_type == "percentage" else "Введите размер комиссии (в рублях):"
        bot.edit_message_text(
            text,
            call.message.chat.id,
            call.message.message_id
        )

@bot.message_handler(func=lambda message: message.from_user.id in admin_states)
def handle_admin_actions(message):
    user_id = message.from_user.id
    state_data = admin_states.get(user_id)
    
    if not state_data:
        return
    
    with SessionLocal() as db:
        if not is_admin(db, user_id):
            del admin_states[user_id]
            return

        state = state_data.get("state")
        text = message.text.strip()
        
        try:
            if state == "waiting_admin_email":
                user = get_user_by_email(db, text)
                
                if not user:
                    bot.send_message(message.chat.id, "❌ Пользователь не найден")
                elif user.role == UserRole.admin:
                    bot.send_message(message.chat.id, "ℹ️ Пользователь уже администратор")
                else:
                    user.role = UserRole.admin
                    db.commit()
                    bot.send_message(message.chat.id, "✅ Пользователь назначен администратором")
                
                del admin_states[user_id]
            
            elif state == "waiting_welcome_text":
                update_setting(db, "welcome_message", text)
                bot.send_message(message.chat.id, "✅ Приветствие обновлено")
                del admin_states[user_id]
            
            elif state == "waiting_block_email":
                email = text
                state_data["email"] = email
                state_data["state"] = "waiting_block_duration"
                state_data["step"] = 2  
                bot.send_message(message.chat.id, "⏳ Введите срок блокировки в днях (0 для бессрочной):")
            
            elif state == "waiting_block_duration":
                try:
                    days = int(text)
                    email = state_data["email"]
                    
                    with SessionLocal() as db:
                        user = get_user_by_email(db, email)
                        if not user:
                            bot.send_message(message.chat.id, "❌ Пользователь не найден")
                        else:
                            
                            if days > 0:
                                blocked_until = datetime.utcnow() + timedelta(days=days)
                                duration_msg = f"до {blocked_until.strftime('%d.%m.%Y %H:%M')}"
                            else:
                                blocked_until = None
                                duration_msg = "бессрочно"
                            
                            user.is_blocked = True
                            user.blocked_until = blocked_until
                            
                            
                            state_data["state"] = "waiting_block_reason"
                            state_data["step"] = 3  
                            state_data["blocked_until"] = blocked_until
                            bot.send_message(message.chat.id, f"📝 Введите причину блокировки (или 'нет' если не нужно):")
                            
                except ValueError:
                    bot.send_message(message.chat.id, "❌ Неверный формат числа. Введите целое число дней.")
            
            elif state == "waiting_block_reason":
                reason = text if text.lower() != "нет" else None
                email = state_data["email"]
                blocked_until = state_data["blocked_until"]
                
                with SessionLocal() as db:
                    user = get_user_by_email(db, email)
                    if user:
                        user.block_reason = reason
                        db.commit()
                        
                        duration_msg = "бессрочно" if blocked_until is None else f"до {blocked_until.strftime('%d.%m.%Y %H:%M')}"
                        msg = f"✅ Пользователь {email} заблокирован {duration_msg}."
                        if reason:
                            msg += f"\nПричина: {reason}"
                        
                        bot.send_message(message.chat.id, msg)
                
                del admin_states[user_id]
            
            elif state == "waiting_unblock_email":
                email = text
                with SessionLocal() as db:
                    user = get_user_by_email(db, email)
                    if not user:
                        bot.send_message(message.chat.id, "❌ Пользователь не найден")
                    elif not user.is_blocked:
                        bot.send_message(message.chat.id, "ℹ️ Пользователь не заблокирован")
                    else:
                        
                        user.is_blocked = False
                        user.blocked_until = None
                        user.block_reason = None
                        db.commit()
                        bot.send_message(message.chat.id, "✅ Пользователь разблокирован")
                
                del admin_states[user_id]
                
            elif state == "waiting_commission_value":
                value = float(text)
                commission = db.query(CommissionSetting).first()
                if commission:
                    commission.commission_type = state_data["type"]
                    commission.value = value
                    db.commit()
                    bot.send_message(message.chat.id, "✅ Настройки комиссии обновлены")
                else:
                    bot.send_message(message.chat.id, "⚠️ Настройки комиссии не найдены")
                
                del admin_states[user_id]
                
                
                if state_data["type"] == "percentage":
                    admin_states[user_id] = {"state": "waiting_min_commission"}
                    bot.send_message(message.chat.id, "Введите минимальную сумму комиссии (руб.) или 0, если не нужна:")
        
            elif state == "waiting_min_commission":
                min_value = float(text)
                commission = db.query(CommissionSetting).first()
                if commission:
                    commission.min_amount = min_value
                    db.commit()
                    bot.send_message(message.chat.id, f"✅ Минимальная комиссия установлена: {min_value:.2f} руб.")
                else:
                    bot.send_message(message.chat.id, "⚠️ Настройки комиссии не найдены")
                
                del admin_states[user_id]
        
        except ValueError:
            bot.send_message(message.chat.id, "❌ Неверный формат числа")
        except Exception as e:
            db.rollback()
            bot.send_message(message.chat.id, f"⚠️ Ошибка: {str(e)}")





scheduler = BackgroundScheduler()

scheduler.add_job(check_and_unblock_users, 'interval', minutes=180)
scheduler.start()

if __name__ == "__main__":
    print("Бот запущен...")
    
    check_and_unblock_users()
    bot.polling()


