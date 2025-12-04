// Sécurité intégrée - IIFE pour encapsuler le code
(function() {
    'use strict';
    
    // Configuration de sécurité
    const SECURITY_CONFIG = {
        MAX_CART_ITEMS: 1000,
        MAX_ITEM_QUANTITY: 1000,
        MAX_ADDRESS_LENGTH: 200,
        MIN_ADDRESS_LENGTH: 10,
        RATE_LIMIT_MS: 1000, // 1 seconde entre les actions
        ALLOWED_DOMAINS: ['telegram.org', 't.me'],
        MAX_ACTIONS_PER_MINUTE: 30,
        MAX_TOTAL_PRICE: 10000
    };
    
    // Variables de sécurité
    let lastActionTime = 0;
    let actionCount = 0;
    let securityLogs = [];
    
    // Fonction de rate limiting
    function checkRateLimit() {
        const now = Date.now();
        if (now - lastActionTime < SECURITY_CONFIG.RATE_LIMIT_MS) {
            console.warn('Action trop rapide, ignorée');
            return false;
        }
        
        // Reset counter every minute
        if (now - lastActionTime > 60000) {
            actionCount = 0;
        }
        
        if (actionCount >= SECURITY_CONFIG.MAX_ACTIONS_PER_MINUTE) {
            console.warn('Trop d\'actions par minute');
            return false;
        }
        
        lastActionTime = now;
        actionCount++;
        return true;
    }
    
    // Validation sécurisée des entrées
    function sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        return input
            .replace(/[<>"'&]/g, '') // Supprimer caractères dangereux
            .trim()
            .substring(0, 500); // Limiter la longueur
    }
    
    // Validation des quantités
    function validateQuantity(qty) {
        const num = parseFloat(String(qty).replace(',', '.'));
        return num > 0 && num <= SECURITY_CONFIG.MAX_ITEM_QUANTITY && Number.isFinite(num) ? num : 1;
    }
    
    // Protection contre les manipulations DOM
    function protectDOM() {
        // Désactiver console en production
        if (window.location.hostname !== 'localhost') {
            console.log = console.warn = console.error = function() {};
        }
        
        // Bloquer F12, Ctrl+Shift+I, etc.
        document.addEventListener('keydown', function(e) {
            if (e.key === 'F12' || 
                (e.ctrlKey && e.shiftKey && e.key === 'I') ||
                (e.ctrlKey && e.shiftKey && e.key === 'C') ||
                (e.ctrlKey && e.key === 'u')) {
                e.preventDefault();
                return false;
            }
        });
        
        // Bloquer clic droit
        document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
        });
    }
    
    // Validation de l'origine Telegram
    function validateTelegramOrigin() {
        const referrer = document.referrer;
        const isValidOrigin = SECURITY_CONFIG.ALLOWED_DOMAINS.some(domain => 
            referrer.includes(domain)
        );
        
        if (!isValidOrigin && window.location.hostname !== 'localhost') {
            console.warn('Origine non autorisée');
        }
    }
    
    // Chiffrement simple pour les données sensibles
    function simpleEncrypt(text) {
        return btoa(encodeURIComponent(text));
    }
    
    function simpleDecrypt(encoded) {
        try {
            return decodeURIComponent(atob(encoded));
        } catch {
            return '';
        }
    }
    
    // Log de sécurité
    function securityLog(action, details) {
        const logEntry = {
            timestamp: Date.now(),
            action: action,
            details: details,
            userAgent: navigator.userAgent.substring(0, 100)
        };
        securityLogs.push(logEntry);
        
        // Garder seulement les 100 derniers logs
        if (securityLogs.length > 100) {
            securityLogs = securityLogs.slice(-100);
        }
        
        console.log(`🛡️ Security: ${action}`, details);
    }
    
    // Exposer les fonctions sécurisées globalement
    window.SecurityUtils = {
        checkRateLimit,
        sanitizeInput,
        validateQuantity,
        simpleEncrypt,
        simpleDecrypt,
        securityLog
    };
    
    // Initialiser la protection
    protectDOM();
    validateTelegramOrigin();
    
    console.log('🛡️ Sécurité initialisée');
})();

// Code principal de l'application
const tg = window.Telegram.WebApp;
const restaurantUsername = 'LEMIEL54'; // Votre username sans @

// Configuration initiale
tg.ready();
tg.expand();

// Variables globales pour les données du menu
let menuData = {};
let restaurantConfig = {};

// Fonction pour charger la configuration depuis config.json
async function loadConfig() {
    try {
        const response = await fetch('./config.json');
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        const config = await response.json();
        
        // Stocker les données globalement
        restaurantConfig = config.restaurant;
        menuData = config.products;
        Object.keys(menuData).forEach(cat => {
            menuData[cat] = menuData[cat].map(p => {
                if (p.customPrices) {
                    const normalized = {};
                    Object.entries(p.customPrices).forEach(([k, v]) => {
                        const nk = String(k).replace(',', '.');
                        normalized[nk] = v;
                    });
                    p.customPrices = normalized;
                }
                return p;
            });
        });
        
        console.log('Configuration chargée avec succès');
        return config;
    } catch (error) {
        console.error('Erreur lors du chargement de la configuration:', error);
        // Fallback vers des données par défaut en cas d'erreur
        return loadDefaultConfig();
    }
}

// Configuration par défaut en cas d'erreur de chargement
function loadDefaultConfig() {
    console.warn('Utilisation de la configuration par défaut');
    restaurantConfig = {
        name: "Restaurant Menu",
        currency: "€",
        delivery_fee: 2.50,
        min_order: 15.00
    };
    
    menuData = {
        pizza: [
            {
                id: 1,
                name: "Pizza Margherita",
                description: "Tomate, mozzarella, basilic frais, huile d'olive",
                price: 12.90,
                emoji: "🍕",
                image: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400&h=300&fit=crop",
                category: "pizza",
                isNew: false,
                isPromo: true,
                video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                customPrices: {
                    1: 20.00,
                    2: 30.00,
                    5: 65.00,
                    10: 120.00,
                    25: 280.00,
                    50: 520.00,
                    100: 980.00
                }
            },
            {
                id: 2,
                name: "Pizza Pepperoni",
                description: "Tomate, mozzarella, pepperoni épicé",
                price: 15.90,
                emoji: "🍕",
                image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&h=300&fit=crop",
                category: "pizza",
                isNew: true,
                video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
                customPrices: {
                    1: 25.00,
                    2: 40.00,
                    5: 85.00,
                    10: 150.00,
                    25: 350.00,
                    50: 650.00,
                    100: 1200.00
                }
            },
            {
                id: 3,
                name: "Pizza Quattro Stagioni",
                description: "Tomate, mozzarella, jambon, champignons, artichauts, olives",
                price: 17.90,
                emoji: "🍕",
                image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop",
                category: "pizza",
                isNew: false,
                video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
                customPrices: {
                    1: 22.00,
                    2: 38.00,
                    5: 80.00,
                    10: 145.00,
                    25: 330.00,
                    50: 620.00,
                    100: 1150.00
                }
            }
        ],
        pasta: [
            {
                id: 4,
                name: "Spaghetti Carbonara",
                description: "Spaghetti, œufs, parmesan, pancetta, poivre noir",
                price: 13.90,
                emoji: "🍝",
                image: "https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=400&h=300&fit=crop",
                category: "pasta",
                isNew: false,
                video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                customPrices: {
                    1: 15.00,
                    2: 28.00,
                    5: 60.00,
                    10: 110.00,
                    25: 250.00,
                    50: 480.00,
                    100: 900.00
                }
            },
            {
                id: 5,
                name: "Penne Arrabbiata",
                description: "Penne, tomate épicée, ail, piment, basilic",
                price: 11.90,
                emoji: "🍝",
                image: "https://images.unsplash.com/photo-1572441713132-51c75654db73?w=400&h=300&fit=crop",
                category: "pasta",
                isNew: false,
                video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
                customPrices: {
                    1: 14.00,
                    2: 26.00,
                    5: 55.00,
                    10: 100.00,
                    25: 230.00,
                    50: 440.00,
                    100: 820.00
                }
            },
            {
                id: 6,
                name: "Lasagnes Maison",
                description: "Pâtes, viande hachée, béchamel, parmesan",
                price: 16.90,
                emoji: "🍝",
                image: "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=400&h=300&fit=crop",
                category: "pasta",
                isNew: true,
                video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
                customPrices: {
                    1: 18.00,
                    2: 32.00,
                    5: 70.00,
                    10: 130.00,
                    25: 300.00,
                    50: 580.00,
                    100: 1100.00
                }
            }
        ],
        dessert: [
            {
                id: 7,
                name: "Tiramisu",
                description: "Mascarpone, café, cacao, biscuits savoiardi",
                price: 6.90,
                emoji: "🍰",
                image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=300&fit=crop",
                category: "dessert",
                isNew: false,
                video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                customPrices: {
                    1: 8.00,
                    2: 15.00,
                    5: 35.00,
                    10: 65.00,
                    25: 150.00,
                    50: 290.00,
                    100: 550.00
                }
            },
            {
                id: 8,
                name: "Panna Cotta",
                description: "Crème vanillée, coulis de fruits rouges",
                price: 5.90,
                emoji: "🍮",
                image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop",
                category: "dessert",
                isNew: false,
                video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
                customPrices: {
                    1: 7.00,
                    2: 13.00,
                    5: 30.00,
                    10: 55.00,
                    25: 125.00,
                    50: 240.00,
                    100: 450.00
                }
            }
        ],
        boisson: [
            {
                id: 9,
                name: "Coca-Cola",
                description: "33cl",
                price: 2.50,
                emoji: "🥤",
                image: "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400&h=300&fit=crop",
                category: "boisson",
                isNew: false,
                video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                customPrices: {
                    1: 3.00,
                    2: 5.50,
                    5: 12.00,
                    10: 22.00,
                    25: 50.00,
                    50: 95.00,
                    100: 180.00
                }
            },
            {
                id: 10,
                name: "Eau Minérale",
                description: "50cl",
                price: 2.00,
                emoji: "💧",
                image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=300&fit=crop",
                category: "boisson",
                isNew: false,
                video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
                customPrices: {
                    1: 2.50,
                    2: 4.50,
                    5: 10.00,
                    10: 18.00,
                    25: 40.00,
                    50: 75.00,
                    100: 140.00
                }
            },
            {
                id: 11,
                name: "Vin Rouge Maison",
                description: "Verre 12cl - Chianti Classico",
                price: 4.50,
                emoji: "🍷",
                image: "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=400&h=300&fit=crop",
                category: "boisson",
                isNew: true,
                video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
                customPrices: {
                    1: 5.50,
                    2: 10.00,
                    5: 22.00,
                    10: 40.00,
                    25: 90.00,
                    50: 170.00,
                    100: 320.00
                }
            }
        ]
    };
    
    return { restaurant: restaurantConfig, products: menuData };
}

// État du panier
let cart = [];
let currentCategory = 'all';

// Variables pour les éléments DOM (seront initialisées après le chargement)
let userInfo, menuGrid, cartSummary, cartItems, cartTotal, checkoutBtn, categoryBtns;

// Fonction pour afficher les informations utilisateur
function displayUserInfo() {
    const user = tg.initDataUnsafe?.user;
    if (user) {
        const safeName = window.SecurityUtils.sanitizeInput(user.first_name || 'Utilisateur');
        userInfo.textContent = `Bienvenue ${safeName} ! 👋`;
    } else {
        userInfo.textContent = 'Mode développement - Bienvenue ! 👋';
    }
}

// Fonction pour ajuster l'affichage des images selon leurs proportions
function adjustImageDisplay(img) {
    if (!img || !img.naturalWidth || !img.naturalHeight) {
        return;
    }
    
    const aspectRatio = img.naturalWidth / img.naturalHeight;
    const container = img.closest('.product-image');
    
    if (!container) {
        return;
    }
    
    // Supprimer les classes existantes
    container.classList.remove('portrait', 'landscape', 'square');
    img.classList.remove('fit-cover', 'fit-contain', 'fit-fill', 'fit-scale-down');
    
    // Déterminer le type d'image et appliquer les styles appropriés
    if (aspectRatio < 0.8) {
        // Image portrait (hauteur > largeur)
        container.classList.add('portrait');
        img.classList.add('fit-contain');
    } else if (aspectRatio > 1.2) {
        // Image paysage (largeur > hauteur)
        container.classList.add('landscape');
        img.classList.add('fit-cover');
    } else {
        // Image carrée ou proche du carré
        container.classList.add('square');
        img.classList.add('fit-cover');
    }
    
    // Log pour debug (optionnel)
    console.log(`Image ${img.src}: ${img.naturalWidth}x${img.naturalHeight}, ratio: ${aspectRatio.toFixed(2)}, type: ${aspectRatio < 0.8 ? 'portrait' : aspectRatio > 1.2 ? 'landscape' : 'square'}`);
}

// Fonction pour ajuster l'affichage des images de détail
function adjustDetailImageDisplay(img) {
    if (!img || !img.naturalWidth || !img.naturalHeight) {
        return;
    }
    
    const aspectRatio = img.naturalWidth / img.naturalHeight;
    img.classList.remove('fit-cover', 'fit-contain', 'fit-fill', 'fit-scale-down');
    img.classList.add('fit-contain');
    img.style.width = '100%';
    img.style.height = 'auto';
    img.style.maxHeight = '65vh';
    
    const container = img.closest('.product-detail-image');
    if (container) {
        container.classList.remove('portrait', 'landscape', 'square');
        if (aspectRatio < 0.8) {
            container.classList.add('portrait');
        } else if (aspectRatio > 1.2) {
            container.classList.add('landscape');
        } else {
            container.classList.add('square');
        }
    }
}

// Fonction pour créer une carte produit avec vraie image
function createProductCard(product) {
    const safeName = window.SecurityUtils.sanitizeInput(product.name);
    const safeDescription = window.SecurityUtils.sanitizeInput(product.description);
    const safePrice = parseFloat(product.price) || 0;
    const safeEmoji = window.SecurityUtils.sanitizeInput(product.emoji);
    
    // Déterminer quel badge afficher
    let badgeHtml = '';
    if (product.isNew) {
        badgeHtml = '<div class="new-badge">Nouveau</div>';
    } else if (product.isPromo) {
        badgeHtml = '<div class="promo-badge">Promo</div>';
    }
    
    return `
        <div class="product-card" data-category="${product.category}">
            <div class="product-image" onclick="openProductDetail(${product.id})" style="cursor: pointer;">
                <img src="${product.image}" alt="${safeName}" class="product-img" 
                     onload="adjustImageDisplay(this)"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                <div class="product-emoji-fallback" style="display: none;">
                    ${safeEmoji}
                </div>
                ${badgeHtml}
            </div>
            <div class="product-info">
                <h3 class="product-name" onclick="openProductDetail(${product.id})" style="cursor: pointer;">${safeName}</h3>
                <p class="product-description">${safeDescription}</p>
                <div class="product-footer">
                    <button class="add-to-cart-btn" onclick="openProductDetail(${product.id})" style="width: 100%;">
                        👁️ Voir détails
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Fonction pour afficher tous les produits
function displayProducts() {
    let html = '';
    Object.values(menuData).flat().forEach(product => {
        html += createProductCard(product);
    });
    menuGrid.innerHTML = html;
}

// Fonction pour filtrer par catégorie
function filterByCategory(category) {
    if (!window.SecurityUtils.checkRateLimit()) {
        return;
    }
    
    const safeCategory = window.SecurityUtils.sanitizeInput(category);
    currentCategory = safeCategory;
    const productCards = document.querySelectorAll('.product-card');
    
    productCards.forEach(card => {
        const cardCategory = card.dataset.category;
        if (safeCategory === 'all' || cardCategory === safeCategory) {
            card.classList.remove('hidden');
        } else {
            card.classList.add('hidden');
        }
    });
    
    // Mettre à jour les boutons de catégorie
    categoryBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === safeCategory) {
            btn.classList.add('active');
        }
    });
    
    window.SecurityUtils.securityLog('category_filter', { category: safeCategory });
}

// Variable globale pour stocker l'ID du produit actuel
let currentProductId = null;

// Fonction pour ouvrir la page de détail produit
function openProductDetail(productId) {
    if (!window.SecurityUtils.checkRateLimit()) {
        return;
    }
    
    // Validation de l'ID du produit
    if (!productId || typeof productId !== 'number' || productId <= 0) {
        console.warn('ID produit invalide:', productId);
        return;
    }
    
    const product = Object.values(menuData).flat().find(p => p.id === productId);
    if (!product) {
        console.warn('Produit non trouvé:', productId);
        return;
    }
    
    // Stocker l'ID du produit actuel
    currentProductId = productId;
    
    // Remplir les informations du produit
    const detailPage = document.getElementById('product-detail-page');
    const detailImg = document.getElementById('detail-product-img');
    const detailEmoji = document.getElementById('detail-product-emoji');
    const detailName = document.getElementById('detail-product-name');
    const detailDescription = document.getElementById('detail-product-description');
    const productVideo = document.getElementById('product-video');
    const videoSource = document.getElementById('video-source');
    
    // Sécuriser les données
    const safeName = window.SecurityUtils.sanitizeInput(product.name);
    const safeDescription = window.SecurityUtils.sanitizeInput(product.description);
    const safePrice = parseFloat(product.price) || 0;
    const safeEmoji = window.SecurityUtils.sanitizeInput(product.emoji);
    
    // Remplir les éléments
    detailName.textContent = safeName;
    detailDescription.textContent = safeDescription;
    
    // Générer dynamiquement les boutons de quantité basés sur customPrices
    const quantityBubblesContainer = document.querySelector('.quantity-bubbles');
    if (quantityBubblesContainer && product.customPrices) {
        // Vider le conteneur existant
        quantityBubblesContainer.innerHTML = '';
        
        // Obtenir les quantités disponibles depuis customPrices
        const entries = Object.entries(product.customPrices)
            .map(([key, val]) => {
                const qty = parseFloat(String(key).replace(',', '.'));
                return { qty, price: parseFloat(val) };
            })
            .filter(e => e.qty > 0 && Number.isFinite(e.qty) && Number.isFinite(e.price))
            .sort((a, b) => a.qty - b.qty);
        entries.forEach(({ qty, price }) => {
            const bubbleDiv = document.createElement('div');
            bubbleDiv.className = 'quantity-bubble';
            bubbleDiv.setAttribute('data-qty', qty);
            bubbleDiv.onclick = () => addToCartWithQuantity(currentProductId, qty);
            bubbleDiv.innerHTML = `
                <span class="bubble-qty">${qty}g</span>
                <span class="bubble-price">${price.toFixed(2)}€</span>
            `;
            quantityBubblesContainer.appendChild(bubbleDiv);
        });
    } else {
        // Fallback vers le système par défaut si pas de customPrices
        const quantities = [1, 2, 5, 10, 25, 50, 100];
        quantities.forEach(qty => {
            const priceElement = document.getElementById(`price-${qty}`);
            if (priceElement) {
                let totalPrice;
                if (product.customPrices && product.customPrices[qty]) {
                    totalPrice = product.customPrices[qty].toFixed(2);
                } else {
                    totalPrice = (safePrice * qty).toFixed(2);
                }
                priceElement.textContent = `${totalPrice}€`;
            }
        });
    }
    
    // Gérer l'image
    detailImg.src = product.image;
    detailImg.alt = safeName;
    detailImg.onload = function() {
        adjustDetailImageDisplay(this);
    };
    detailImg.onerror = function() {
        this.style.display = 'none';
        detailEmoji.style.display = 'flex';
        detailEmoji.textContent = safeEmoji;
    };
    
    // Gérer la vidéo
    if (product.video) {
        const videoContainer = document.querySelector('.video-container');
        
        // Vérifier si c'est une URL Imgur
        if (product.video.includes('imgur.com')) {
            console.log('URL Imgur détectée:', product.video);
            
            // Extraire l'ID de l'album ou de l'image Imgur
            let imgurId = '';
            if (product.video.includes('/a/')) {
                // Album: https://imgur.com/a/ztRRYlc
                imgurId = product.video.split('/a/')[1].split('?')[0].split('/')[0];
            } else {
                // Image simple: https://imgur.com/ztRRYlc
                const match = product.video.match(/imgur\.com\/([a-zA-Z0-9]+)/);
                if (match) {
                    imgurId = match[1];
                }
            }
            
            console.log('Imgur ID:', imgurId);
            
            // Créer un conteneur pour la vidéo/GIF sans interface Imgur
            videoContainer.innerHTML = `
                <div style="text-align: center; padding: 20px; background: #000; border-radius: 12px;">
                    <div id="imgur-content-${imgurId}" style="width: 100%; height: 400px; display: flex; align-items: center; justify-content: center; color: white;">
                        <div style="text-align: center;">
                            <div style="margin-bottom: 10px;">📹</div>
                            <div>Chargement du contenu Imgur...</div>
                        </div>
                    </div>
                </div>
            `;
            
            // Fonction pour charger le contenu direct depuis Imgur
            async function loadImgurContent(id) {
                try {
                    // Essayer d'abord avec l'URL directe du GIF/MP4
                    const directUrls = [
                        `https://i.imgur.com/${id}.mp4`,
                        `https://i.imgur.com/${id}.gifv`,
                        `https://i.imgur.com/${id}.gif`,
                        `https://i.imgur.com/${id}.webm`
                    ];
                    
                    const container = document.getElementById(`imgur-content-${id}`);
                    if (!container) return;
                    
                    // Tester chaque URL pour trouver celle qui fonctionne
                    for (const url of directUrls) {
                        try {
                            const response = await fetch(url, { method: 'HEAD' });
                            if (response.ok) {
                                console.log('URL Imgur directe trouvée:', url);
                                
                                if (url.includes('.mp4') || url.includes('.webm')) {
                                    // Vidéo
                                    container.innerHTML = `
                                        <video controls autoplay muted loop style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px;">
                                            <source src="${url}" type="video/${url.includes('.mp4') ? 'mp4' : 'webm'}">
                                            Votre navigateur ne supporte pas cette vidéo.
                                        </video>
                                    `;
                                } else {
                                    // GIF/Image
                                    container.innerHTML = `
                                        <img src="${url}" alt="Contenu Imgur" style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px;">
                                    `;
                                }
                                return;
                            }
                        } catch (e) {
                            continue;
                        }
                    }
                    
                    // Si aucune URL directe ne fonctionne, fallback vers l'embed
                    console.log('Fallback vers embed Imgur');
                    container.innerHTML = `
                        <iframe src="https://imgur.com/${id}/embed?pub=true&ref=https%3A%2F%2Fimgur.com&w=540" 
                                width="100%" 
                                height="400" 
                                frameborder="0" 
                                scrolling="no" 
                                allowfullscreen
                                style="border-radius: 8px;">
                        </iframe>
                    `;
                    
                } catch (error) {
                    console.error('Erreur lors du chargement Imgur:', error);
                    const container = document.getElementById(`imgur-content-${id}`);
                    if (container) {
                        container.innerHTML = `
                            <div style="color: #ff6b6b; text-align: center;">
                                <div style="margin-bottom: 10px;">❌</div>
                                <div>Erreur de chargement du contenu Imgur</div>
                            </div>
                        `;
                    }
                }
            }
            
            // Charger le contenu
            loadImgurContent(imgurId);
        } else if (product.video.includes('youtube.com') || product.video.includes('youtu.be')) {
            // Support pour YouTube
            let youtubeId;
            if (product.video.includes('youtube.com/watch?v=')) {
                youtubeId = product.video.split('v=')[1].split('&')[0];
            } else if (product.video.includes('youtu.be/')) {
                youtubeId = product.video.split('youtu.be/')[1].split('?')[0];
            }
            
            if (youtubeId) {
                const embedUrl = `https://www.youtube.com/embed/${youtubeId}`;
                videoContainer.innerHTML = `
                    <iframe src="${embedUrl}" 
                            width="100%" 
                            height="315" 
                            frameborder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowfullscreen>
                    </iframe>
                `;
             }
         } else {
            // URL directe vers un fichier vidéo (MP4, etc.)
            videoContainer.innerHTML = `
                <video id="product-video" controls preload="metadata" poster="${product.image}">
                    <source src="${product.video}" type="video/mp4">
                    Votre navigateur ne supporte pas la lecture de vidéos.
                </video>
            `;
         }
    }
    
    // Masquer le menu principal et afficher la page de détail
    document.querySelector('main').style.display = 'none';
    document.querySelector('.category-nav').style.display = 'none';
    detailPage.style.display = 'block';
    
    // Log de sécurité
    window.SecurityUtils.securityLog('product_detail_opened', { productId: productId });
}

// Nouvelle fonction pour ajouter au panier avec quantité spécifique
function addToCartWithQuantity(productId, quantity) {
    if (!window.SecurityUtils.checkRateLimit()) {
        return;
    }
    
    // Validation des paramètres
    if (!productId || typeof productId !== 'number' || productId <= 0) {
        console.warn('ID produit invalide:', productId);
        return;
    }
    
    const validQuantity = window.SecurityUtils.validateQuantity(quantity);
    if (validQuantity !== quantity) {
        console.warn('Quantité ajustée:', quantity, '->', validQuantity);
    }
    
    const product = Object.values(menuData).flat().find(p => p.id === productId);
    if (!product) {
        console.warn('Produit non trouvé:', productId);
        return;
    }
    
    // Ajouter la quantité spécifiée au panier
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        // Ajouter la quantité
        existingItem.quantity = existingItem.quantity + validQuantity;
    } else {
        cart.push({ ...product, quantity: validQuantity });
    }
    
    // Mettre à jour l'affichage du panier
    updateCartDisplay();
    
    // Afficher un message de confirmation
    const productName = window.SecurityUtils.sanitizeInput(product.name);
    showNotification(`${validQuantity} x ${productName} ajouté(s) au panier !`);
    
    // Feedback haptique
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
    }
    
    // Log de sécurité
    window.SecurityUtils.securityLog('add_to_cart_quantity', { 
        productId: productId, 
        quantity: validQuantity,
        productName: product.name 
    });
}

// Fonction pour fermer la page de détail produit
function closeProductDetail() {
    if (!window.SecurityUtils.checkRateLimit()) {
        return;
    }
    
    const detailPage = document.getElementById('product-detail-page');
    const productVideo = document.getElementById('product-video');
    const videoContainer = document.querySelector('.video-container');
    
    // Arrêter la vidéo si elle existe
    if (productVideo) {
        productVideo.pause();
        productVideo.currentTime = 0;
    }
    
    // Réinitialiser le conteneur vidéo avec l'élément video par défaut
    videoContainer.innerHTML = `
        <video id="product-video" controls preload="metadata" poster="">
            <source id="video-source" src="" type="video/mp4">
            Votre navigateur ne supporte pas la lecture de vidéos.
        </video>
    `;
    
    // Masquer la page de détail et afficher le menu principal
    detailPage.style.display = 'none';
    document.querySelector('main').style.display = 'block';
    document.querySelector('.category-nav').style.display = 'flex';
    
    // Réafficher le panier s'il contient des éléments
    if (cart.length > 0) {
        const cartSummary = document.getElementById('cart-summary');
        if (cartSummary) {
            cartSummary.style.display = 'block';
        }
    }
    
    // Log de sécurité
    window.SecurityUtils.securityLog('product_detail_closed', {});
}

// Fonction pour ajouter au panier (VERSION SÉCURISÉE)
function addToCart(productId) {
    // Vérification du rate limiting
    if (!window.SecurityUtils.checkRateLimit()) {
        console.warn('Action trop rapide - addToCart ignoré');
        return;
    }
    
    // Validation de l'ID du produit
    if (!productId || typeof productId !== 'number' || productId <= 0) {
        console.warn('ID produit invalide:', productId);
        return;
    }
    
    // Vérification de la limite du panier
    if (cart.length >= 50) {
        if (tg.showAlert) {
            tg.showAlert('Panier plein ! Maximum 50 articles.');
        }
        return;
    }
    
    const product = Object.values(menuData).flat().find(p => p.id === productId);
    if (!product) {
        console.warn('Produit non trouvé:', productId);
        return;
    }
    
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        // Pas de limite de quantité
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    
    updateCartDisplay();
    
    // Feedback haptique
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
    }
    
    // Animation du bouton
    const btn = event.target;
    if (btn) {
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            btn.style.transform = 'scale(1)';
        }, 150);
    }
    
    // Log de sécurité
    window.SecurityUtils.securityLog('add_to_cart', { productId: productId, productName: product.name });
}

// Fonction pour mettre à jour l'affichage du panier (VERSION SÉCURISÉE)
function updateCartDisplay() {
    if (cart.length === 0) {
        cartSummary.style.display = 'none';
        return;
    }
    
    // Vérification de sécurité sur le panier
    if (cart.length > 50) {
        console.warn('Panier trop volumineux, limitation appliquée');
        cart = cart.slice(0, 50);
    }
    
    cartSummary.style.display = 'block';
    
    let html = '';
    let total = 0;
    
    cart.forEach(item => {
        // Validation des données de l'article
        const safeName = window.SecurityUtils.sanitizeInput(item.name || '');
        const safePrice = parseFloat(item.price) || 0;
        const safeQuantity = window.SecurityUtils.validateQuantity(item.quantity);
        const safeEmoji = window.SecurityUtils.sanitizeInput(item.emoji || '🍽️');
        
        if (safePrice <= 0 || safeQuantity <= 0) {
            console.warn('Article invalide ignoré:', item);
            return;
        }
        
        // Utiliser le prix personnalisé si disponible, sinon calculer avec le prix de base
        let itemTotal;
        if (item.customPrices && item.customPrices[safeQuantity]) {
            itemTotal = item.customPrices[safeQuantity];
        } else {
            itemTotal = safePrice * safeQuantity;
        }
        total += itemTotal;
        
        // Calculer le prix unitaire effectif
        let unitPrice;
        if (item.customPrices && item.customPrices[safeQuantity]) {
            unitPrice = item.customPrices[safeQuantity] / safeQuantity;
        } else {
            unitPrice = safePrice;
        }
        
        html += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${safeEmoji} ${safeName}</div>
                    <div class="cart-item-price">Quantité: ${safeQuantity} - Prix: ${itemTotal.toFixed(2)}€</div>
                </div>
                <div class="cart-item-controls">
                    <button class="quantity-btn" onclick="updateQuantity(${item.id}, -1)">−</button>
                    <span class="quantity-display">${safeQuantity}</span>
                    <button class="quantity-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                </div>
            </div>
        `;
    });
    
    // Validation du total
    if (total > 10000) {
        console.warn('Total suspicieusement élevé:', total);
        if (tg.showAlert) {
            tg.showAlert('Erreur dans le calcul du total.');
        }
        return;
    }
    
    cartItems.innerHTML = html;
    cartTotal.textContent = total.toFixed(2) + '€';
    
    window.SecurityUtils.securityLog('cart_update', { itemCount: cart.length, total: total });
}

// Fonction pour vider complètement le panier (VERSION SÉCURISÉE)
function clearCart() {
    // Vérification du rate limiting
    if (!window.SecurityUtils.checkRateLimit()) {
        console.warn('Action trop rapide - clearCart ignoré');
        return;
    }
    
    // Demander confirmation avant de vider le panier
    if (cart.length === 0) {
        if (tg.showAlert) {
            tg.showAlert('Le panier est déjà vide.');
        }
        return;
    }
    
    // Confirmation avec l'utilisateur
    if (tg.showConfirm) {
        tg.showConfirm('Êtes-vous sûr de vouloir vider complètement votre panier ?', function(confirmed) {
            if (confirmed) {
                performClearCart();
            }
        });
    } else {
        // Fallback si showConfirm n'est pas disponible
        if (confirm('Êtes-vous sûr de vouloir vider complètement votre panier ?')) {
            performClearCart();
        }
    }
}

// Fonction interne pour effectuer le vidage du panier
function performClearCart() {
    const itemCount = cart.length;
    cart = [];
    updateCartDisplay();
    
    // Feedback haptique
    if (tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('success');
    }
    
    // Log de sécurité
    window.SecurityUtils.securityLog('cart_cleared', { previousItemCount: itemCount });
    
    console.log('Panier vidé avec succès');
}

// Fonction pour mettre à jour la quantité (VERSION SÉCURISÉE)
function updateQuantity(productId, change) {
    // Vérification du rate limiting
    if (!window.SecurityUtils.checkRateLimit()) {
        console.warn('Action trop rapide - updateQuantity ignoré');
        return;
    }
    
    // Validation des paramètres
    const safeProductId = parseInt(productId);
    const safeChange = parseInt(change);
    
    if (!safeProductId || safeProductId !== productId || safeProductId <= 0) {
        console.warn('ID produit invalide:', productId);
        return;
    }
    
    if (isNaN(safeChange) || Math.abs(safeChange) > 5) {
        console.warn('Changement de quantité invalide:', change);
        return;
    }
    
    const item = cart.find(item => item.id === productId);
    if (!item) {
        console.warn('Article non trouvé dans le panier:', productId);
        return;
    }
    
    const newQuantity = item.quantity + safeChange;
    
    // Vérifications de sécurité sur la nouvelle quantité
    if (newQuantity < 0) {
        console.warn('Tentative de quantité négative');
        return;
    }
    
    // Pas de limite de quantité maximale
    
    item.quantity = newQuantity;
    
    if (item.quantity <= 0) {
        cart = cart.filter(cartItem => cartItem.id !== productId);
        window.SecurityUtils.securityLog('item_removed', { productId: productId });
    } else {
        window.SecurityUtils.securityLog('quantity_updated', { productId: productId, newQuantity: newQuantity });
    }
    
    updateCartDisplay();
    
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
}

// Fonction pour formater le message de commande (SÉCURISÉE)
function formatOrderMessage(orderData) {
    const safeAddress = window.SecurityUtils.sanitizeInput(orderData.deliveryAddress);
    const safeTotal = parseFloat(orderData.total) || 0;
    
    if (safeTotal <= 0 || safeTotal > 10000) {
        console.warn('Total invalide pour la commande:', safeTotal);
        return null;
    }
    
    const orderText = `🛒 NOUVELLE COMMANDE\n\n` +
        `📍 Adresse de livraison: ${safeAddress}\n\n` +
        `📋 Détails de la commande:\n` +
        orderData.items.map(item => {
            const safeName = window.SecurityUtils.sanitizeInput(item.name);
            const safeQty = window.SecurityUtils.validateQuantity(item.quantity);
            const safeItemTotal = parseFloat(item.total) || 0;
            return `• ${safeName} x${safeQty} = ${safeItemTotal.toFixed(2)}€`;
        }).join('\n') +
        `\n\n💰 TOTAL: ${safeTotal.toFixed(2)}€\n` +
        `🕐 Commandé le: ${new Date(orderData.timestamp).toLocaleString('fr-FR')}`;
    
    return encodeURIComponent(orderText);
}

// Fonction pour afficher les notifications (SÉCURISÉE)
function showNotification(message) {
    const safeMessage = window.SecurityUtils.sanitizeInput(message);
    
    if (safeMessage.length > 200) {
        console.warn('Message de notification trop long');
        return;
    }
    
    // Utiliser l'API Telegram si disponible
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.showAlert) {
        window.Telegram.WebApp.showAlert(safeMessage);
    } else {
        // Fallback pour les tests en dehors de Telegram
        alert(safeMessage);
    }
    
    // Ajouter un effet de vibration si disponible
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
}

// Fonction pour préparer les données de commande (SÉCURISÉE)
function prepareOrderData(deliveryAddress) {
    const safeAddress = window.SecurityUtils.sanitizeInput(deliveryAddress);
    
    if (safeAddress.length < 10 || safeAddress.length > 200) {
        console.warn('Adresse invalide:', safeAddress);
        return null;
    }
    
    const total = cart.reduce((sum, item) => {
        const safePrice = parseFloat(item.price) || 0;
        const safeQty = window.SecurityUtils.validateQuantity(item.quantity);
        
        // Utiliser le prix personnalisé si disponible
        let itemTotal;
        if (item.customPrices && item.customPrices[safeQty]) {
            itemTotal = item.customPrices[safeQty];
        } else {
            itemTotal = safePrice * safeQty;
        }
        
        return sum + itemTotal;
    }, 0);
    
    if (total <= 0 || total > 10000) {
        console.warn('Total de commande invalide:', total);
        return null;
    }
    
    return {
        items: cart.map(item => {
            const safePrice = parseFloat(item.price) || 0;
            const safeQty = window.SecurityUtils.validateQuantity(item.quantity);
            
            // Utiliser le prix personnalisé si disponible
            let itemTotal;
            if (item.customPrices && item.customPrices[safeQty]) {
                itemTotal = item.customPrices[safeQty];
            } else {
                itemTotal = safePrice * safeQty;
            }
            
            return {
                name: window.SecurityUtils.sanitizeInput(item.name),
                quantity: safeQty,
                price: safePrice,
                total: itemTotal
            };
        }),
        total: total,
        deliveryAddress: safeAddress,
        timestamp: Date.now()
    };
}

// Fonction pour envoyer la commande au restaurant (SÉCURISÉE)
function sendOrderToRestaurant(orderData) {
    if (!orderData) {
        console.warn('Données de commande invalides');
        return;
    }
    
    const message = formatOrderMessage(orderData);
    if (!message) {
        console.warn('Impossible de formater le message de commande');
        return;
    }
    
    const telegramUrl = `https://t.me/${restaurantUsername}?text=${message}`;
    
    // Validation de l'URL
    try {
        new URL(telegramUrl);
    } catch (e) {
        console.warn('URL Telegram invalide');
        return;
    }
    
    window.SecurityUtils.securityLog('order_sent', { 
        total: orderData.total, 
        itemCount: orderData.items.length 
    });
    
    window.open(telegramUrl, '_blank');
}

// Fonction pour afficher le modal d'adresse moderne (SÉCURISÉE)
function showAddressModal() {
    return new Promise((resolve, reject) => {
        const modal = document.getElementById('address-modal');
        const input = document.getElementById('address-input');
        const confirmBtn = document.getElementById('confirm-address');
        const cancelBtn = document.getElementById('cancel-address');
        
        if (!modal || !input || !confirmBtn || !cancelBtn) {
            reject(new Error('Éléments du modal non trouvés'));
            return;
        }
        
        // Réinitialiser le modal
        input.value = '';
        confirmBtn.disabled = true;
        modal.style.display = 'flex';
        
        // Focus sur l'input
        setTimeout(() => input.focus(), 100);
        
        // Validation en temps réel
        function validateInput() {
            const address = window.SecurityUtils.sanitizeInput(input.value.trim());
            confirmBtn.disabled = address.length < 15;
        }
        
        input.addEventListener('input', validateInput);
        
        // Gestion de la confirmation
        function handleConfirm() {
            const address = window.SecurityUtils.sanitizeInput(input.value.trim());
            
            if (address.length < 15) {
                if (tg.showAlert) {
                    tg.showAlert('L\'adresse doit contenir au moins 15 caractères.');
                }
                return;
            }
            
            if (address.length > 200) {
                if (tg.showAlert) {
                    tg.showAlert('L\'adresse est trop longue (max 200 caractères).');
                }
                return;
            }
            
            cleanup();
            modal.style.display = 'none';
            window.SecurityUtils.securityLog('address_confirmed', { addressLength: address.length });
            resolve(address);
        }
        
        // Gestion de l'annulation
        function handleCancel() {
            cleanup();
            modal.style.display = 'none';
            window.SecurityUtils.securityLog('address_cancelled', {});
            reject(new Error('Adresse annulée par l\'utilisateur'));
        }
        
        // Nettoyage des event listeners
        function cleanup() {
            input.removeEventListener('input', validateInput);
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            input.removeEventListener('keypress', handleKeyPress);
            modal.removeEventListener('click', handleModalClick);
        }
        
        // Gestion des touches
        function handleKeyPress(e) {
            if (e.key === 'Enter' && !confirmBtn.disabled) {
                handleConfirm();
            } else if (e.key === 'Escape') {
                handleCancel();
            }
        }
        
        // Fermeture en cliquant à l'extérieur
        function handleModalClick(e) {
            if (e.target === modal) {
                handleCancel();
            }
        }
        
        // Ajouter les event listeners
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
        input.addEventListener('keypress', handleKeyPress);
        modal.addEventListener('click', handleModalClick);
    });
}

// Fonction de checkout (VERSION SÉCURISÉE)
async function checkout() {
    // Vérification du rate limiting
    if (!window.SecurityUtils.checkRateLimit()) {
        console.warn('Action trop rapide - checkout ignoré');
        return;
    }
    
    // Validation du panier
    if (!cart || cart.length === 0) {
        if (tg.showAlert) {
            tg.showAlert('Votre panier est vide.');
        }
        return;
    }
    
    if (cart.length > 50) {
        console.warn('Panier trop volumineux pour checkout');
        if (tg.showAlert) {
            tg.showAlert('Panier trop volumineux. Veuillez réduire le nombre d\'articles.');
        }
        return;
    }
    
    // Validation des articles du panier
    const validCart = cart.filter(item => {
        const validPrice = parseFloat(item.price) > 0;
        const validQuantity = parseFloat(item.quantity) > 0;
        const validName = item.name && item.name.trim().length > 0;
        
        return validPrice && validQuantity && validName;
    });
    
    if (validCart.length !== cart.length) {
        console.warn('Articles invalides détectés et supprimés');
        cart = validCart;
        updateCartDisplay();
    }
    
    if (cart.length === 0) {
        if (tg.showAlert) {
            tg.showAlert('Aucun article valide dans le panier.');
        }
        return;
    }
    
    try {
        // Obtenir l'adresse de livraison via le modal
        const deliveryAddress = await showAddressModal();
        
        // Feedback haptique
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('heavy');
        }
        
        // Préparer les données de commande
        const orderData = prepareOrderData(deliveryAddress);
        if (!orderData) {
            if (tg.showAlert) {
                tg.showAlert('Erreur lors de la préparation de la commande.');
            }
            return;
        }
        
        // Envoyer la commande
        sendOrderToRestaurant(orderData);
        
        // Vider le panier après envoi
        cart = [];
        updateCartDisplay();
        
        window.SecurityUtils.securityLog('checkout_completed', { 
            total: orderData.total,
            itemCount: orderData.items.length
        });
        
    } catch (error) {
        if (error.message !== 'Adresse annulée par l\'utilisateur') {
            console.error('Erreur lors du checkout:', error);
            if (tg.showAlert) {
                tg.showAlert('Une erreur s\'est produite. Veuillez réessayer.');
            }
        }
        window.SecurityUtils.securityLog('checkout_error', { error: error.message });
    }
}

// Initialisation sécurisée de l'application
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Charger la configuration en premier
        await loadConfig();
        
        // Initialiser les variables DOM
        userInfo = document.getElementById('user-info');
        menuGrid = document.getElementById('menu-grid');
        cartSummary = document.getElementById('cart-summary');
        cartItems = document.getElementById('cart-items');
        cartTotal = document.getElementById('cart-total');
        checkoutBtn = document.getElementById('checkout-btn');
        categoryBtns = document.querySelectorAll('.category-btn');
        
        // Vérifier que tous les éléments sont présents
        const requiredElements = [menuGrid, cartSummary, cartItems, cartTotal, checkoutBtn];
        const missingElements = requiredElements.filter(el => !el);
        
        if (missingElements.length > 0) {
            console.error('Éléments DOM manquants détectés');
            return;
        }
        
        // Afficher les informations utilisateur
        if (userInfo) {
            displayUserInfo();
        }
        
        // Afficher les produits (après chargement de la config)
        displayProducts();
        
        // Ajouter les event listeners pour les catégories
        categoryBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const category = this.dataset.category;
                filterByCategory(category);
            });
        });
        
        // Event listener pour le checkout
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', checkout);
        }
        
        // Event listener pour vider le panier
        const clearCartBtn = document.getElementById('clear-cart-btn');
        if (clearCartBtn) {
            clearCartBtn.addEventListener('click', clearCart);
        }
        
        // Initialiser l'affichage du panier
        updateCartDisplay();
        
        // Initialiser la navigation en bas
        initBottomNavigation();
        
        window.SecurityUtils.securityLog('app_initialized', { timestamp: Date.now() });
        
        console.log('🍕 Application initialisée avec succès et sécurisée!');
        
    } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
        window.SecurityUtils.securityLog('init_error', { error: error.message });
    }
});

// Fonction pour initialiser la navigation en bas
function initBottomNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const container = document.querySelector('.container');
    const infoPage = document.getElementById('info-page');
    const mainContent = document.querySelector('main');
    const cartSummary = document.querySelector('.cart-summary');
    const categoryNav = document.querySelector('.category-nav');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const page = this.dataset.page;
            
            // Retirer la classe active de tous les éléments
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Ajouter la classe active à l'élément cliqué
            this.classList.add('active');
            
            // Gérer l'affichage des pages
            switch(page) {
                case 'menu':
                    container.classList.remove('info-page-active');
                    if (infoPage) infoPage.style.display = 'none';
                    if (mainContent) mainContent.style.display = 'block';
                    if (categoryNav) categoryNav.style.display = 'flex';
                    // Réafficher le panier s'il contient des éléments
                    if (cart.length > 0 && cartSummary) {
                        cartSummary.style.display = 'block';
                    }
                    break;
                    
                case 'info':
                    container.classList.add('info-page-active');
                    if (infoPage) infoPage.style.display = 'block';
                    if (mainContent) mainContent.style.display = 'none';
                    if (categoryNav) categoryNav.style.display = 'none';
                    if (cartSummary) cartSummary.style.display = 'none';
                    break;
                    
                case 'canal':
                    // Ouvrir le canal Telegram
                    if (window.Telegram && window.Telegram.WebApp) {
                        window.Telegram.WebApp.openTelegramLink('https://dympt.org/joinchat/JuLVf6_RWUB23gDjNMd44Q');
                    } else {
                        window.open('https://t.me/+1ucagzAd9_YxZDE0', '_blank');
                    }
                    break;
                    
                case 'contact':
                    // Ouvrir la conversation directe avec le vendeur
                    const contactMessage = encodeURIComponent('👋 Bonjour ! J\'ai une question concernant votre menu.');
                    const contactUrl = `https://t.me/${restaurantUsername}?text=${contactMessage}`;
                    
                    if (window.Telegram && window.Telegram.WebApp) {
                        window.Telegram.WebApp.openTelegramLink(contactUrl);
                    } else {
                        window.open(contactUrl, '_blank');
                    }
                    break;
            }
            
            // Ajouter un effet de vibration si disponible
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
            }
        });
    });
}
