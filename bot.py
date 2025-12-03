import logging
import hashlib
import hmac
import time
from collections import defaultdict
from functools import wraps
from telegram import Update, WebAppInfo, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, ContextTypes

# Configuration sécurisée
BOT_TOKEN = "8085521442:AAF4NTocF5npu4wAZdfEmK69IhBhsL12fso"
WEB_APP_URL = "https://mini-app-peaky-3ehb.vercel.app"

# Variables de sécurité intégrées
SECURITY_CONFIG = {
    'MAX_REQUESTS_PER_HOUR': 100,
    'RATE_LIMIT_WINDOW': 3600,
    'MAX_MESSAGE_LENGTH': 1000,
    'ALLOWED_DOMAINS': ['telegram.org', 't.me', 'vercel.app'],
    'BLOCKED_KEYWORDS': ['script', 'javascript', 'eval', 'function', 'alert']
}

# Stockage en mémoire pour rate limiting
user_requests = defaultdict(list)
blocked_users = set()

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

def validate_telegram_data(data, bot_token):
    """Valide l'authenticité des données Telegram"""
    try:
        auth_date = int(data.get('auth_date', 0))
        if time.time() - auth_date > 3600:  # Données trop anciennes
            return False
            
        check_hash = data.pop('hash', '')
        data_check_string = '\n'.join([f"{k}={v}" for k, v in sorted(data.items())])
        secret_key = hashlib.sha256(bot_token.encode()).digest()
        calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
        
        return calculated_hash == check_hash
    except Exception as e:
        logging.error(f"Erreur validation Telegram: {e}")
        return False

def rate_limit_check(user_id):
    """Vérifie le rate limiting pour un utilisateur"""
    if user_id in blocked_users:
        return False
        
    now = time.time()
    user_reqs = user_requests[user_id]
    
    # Nettoyer les anciennes requêtes
    user_reqs[:] = [req_time for req_time in user_reqs if now - req_time < SECURITY_CONFIG['RATE_LIMIT_WINDOW']]
    
    if len(user_reqs) >= SECURITY_CONFIG['MAX_REQUESTS_PER_HOUR']:
        blocked_users.add(user_id)
        logging.warning(f"Utilisateur {user_id} bloqué pour trop de requêtes")
        return False
        
    user_reqs.append(now)
    return True

def sanitize_input(text):
    """Nettoie et valide les entrées utilisateur"""
    if not text or len(text) > SECURITY_CONFIG['MAX_MESSAGE_LENGTH']:
        return None
        
    # Vérifier les mots-clés suspects
    text_lower = text.lower()
    for keyword in SECURITY_CONFIG['BLOCKED_KEYWORDS']:
        if keyword in text_lower:
            logging.warning(f"Mot-clé suspect détecté: {keyword}")
            return None
            
    return text.strip()

def security_middleware(func):
    """Décorateur de sécurité pour toutes les fonctions"""
    @wraps(func)
    async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE):
        user = update.effective_user
        user_id = user.id if user else None
        
        # Log de sécurité
        logging.info(f"Requête de {user_id} ({user.username if user else 'Inconnu'})")
        
        # Vérifier rate limiting
        if not rate_limit_check(user_id):
            await update.message.reply_text(
                "⚠️ Trop de requêtes. Veuillez patienter avant de réessayer."
            )
            return
            
        # Valider le message
        if update.message and update.message.text:
            sanitized = sanitize_input(update.message.text)
            if sanitized is None:
                await update.message.reply_text(
                    "⚠️ Message non valide détecté."
                )
                return
                
        try:
            return await func(update, context)
        except Exception as e:
            logging.error(f"Erreur dans {func.__name__}: {e}")
            await update.message.reply_text(
                "❌ Une erreur s'est produite. Veuillez réessayer."
            )
            
    return wrapper

@security_middleware
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Commande /start sécurisée qui lance la Mini-App avec options multiples"""
    web_app = WebAppInfo(url=WEB_APP_URL)
    
    # Créer un clavier inline avec plusieurs options - Canal et Contact en haut, Carte mise en valeur en bas
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("📢 Canal Officiel", url="https://t.me/+1ucagzAd9_YxZDE0"), 
         InlineKeyboardButton("💬 Nous contacter", url="https://t.me/LEMIEL54")],
        [InlineKeyboardButton("📖 VOIR LA CARTE 📖", web_app=web_app)]
    ])
    
    # Message d'accueil avec image et texte simplifié
    await update.message.reply_photo(
        photo="blob:https://imgur.com/3cb15440-0de0-4686-8a96-ba1c782a4fde",
        caption="*💎 Bienvenue chez LeMiel !*\n\nSi vous souhaitez faire une commande ou nous contacter, utilisez les options ci-dessous.",
        parse_mode="Markdown",
        reply_markup=keyboard
    )

@security_middleware
async def menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Commande /menu sécurisée pour accéder directement au menu"""
    web_app = WebAppInfo(url=WEB_APP_URL)
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("🍕 Voir le Menu", web_app=web_app)]
    ])
    
    await update.message.reply_text(
        "🍽️ Consultez notre menu :",
        reply_markup=keyboard
    )

@security_middleware
async def security_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Commande pour vérifier le statut de sécurité (admin uniquement)"""
    user_id = update.effective_user.id
    
    # Liste des admins (remplacez par vos IDs)
    ADMIN_IDS = [123456789]  # Remplacez par votre ID Telegram
    
    if user_id not in ADMIN_IDS:
        await update.message.reply_text("❌ Accès refusé.")
        return
        
    total_requests = sum(len(reqs) for reqs in user_requests.values())
    blocked_count = len(blocked_users)
    
    status_msg = f"""🛡️ **Statut de Sécurité**
    
📊 Requêtes totales: {total_requests}
🚫 Utilisateurs bloqués: {blocked_count}
⏰ Fenêtre de limitation: {SECURITY_CONFIG['RATE_LIMIT_WINDOW']}s
🔢 Max requêtes/heure: {SECURITY_CONFIG['MAX_REQUESTS_PER_HOUR']}
    """
    
    await update.message.reply_text(status_msg, parse_mode='Markdown')

async def post_init(application: Application):
    """Fonction exécutée après l'initialisation du bot"""
    # Simuler l'exécution de la commande security au démarrage
    # Créer un faux update pour appeler la fonction security_status
    logging.info("Exécution automatique de la commande security au démarrage...")
    
    # Récupérer les statistiques de sécurité
    total_requests = sum(len(reqs) for reqs in user_requests.values())
    blocked_count = len(blocked_users)
    
    status_msg = f"""🛡️ **Statut de Sécurité au démarrage**
    
📊 Requêtes totales: {total_requests}
🚫 Utilisateurs bloqués: {blocked_count}
⏰ Fenêtre de limitation: {SECURITY_CONFIG['RATE_LIMIT_WINDOW']}s
🔢 Max requêtes/heure: {SECURITY_CONFIG['MAX_REQUESTS_PER_HOUR']}
    """
    
    logging.info(status_msg)

def main():
    """Fonction principale avec gestion d'erreurs renforcée"""
    try:
        # Créer l'application sans utiliser directement l'Updater
        builder = Application.builder()
        application = builder.token(BOT_TOKEN).post_init(post_init).build()
        
        # Handlers sécurisés
        application.add_handler(CommandHandler("start", start))
        application.add_handler(CommandHandler("menu", menu))
        application.add_handler(CommandHandler("security", security_status))
        
        logging.info("🛡️ Bot LeMiel démarré avec sécurité renforcée")
        
        # Démarrer le bot avec des paramètres explicites
        application.run_polling(allowed_updates=["message", "callback_query"])
        
    except Exception as e:
        logging.critical(f"Erreur critique au démarrage: {e}")
        raise

if __name__ == '__main__':
    main()
