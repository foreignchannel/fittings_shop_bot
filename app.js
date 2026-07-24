const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

let products = [];
let cart = {};

// Ваша рабочая ссылка на Google Sheets API
const PRODUCTS_API_URL = "https://script.google.com/macros/s/AKfycbx6aXJ7YJmmOFIlEeBgEwgyBg9I5GVeDUFURA6Ri5nMpJi_GGM7cQjBN8o2bz_djSrS/exec";

// Блок объявления переменных DOM-элементов
const productsGrid = document.getElementById('products-grid');
const cartSummary = document.getElementById('cart-summary');
const totalPriceEl = document.getElementById('total-price');
const cityInput = document.getElementById('city');
const submitBtn = document.getElementById('submit-order-btn');

// Загрузка товаров с использованием мгновенного кэширования (SWR)
async function loadProducts() {
    // 1. Пытаемся мгновенно загрузить товары из локального кэша телефона
    const cachedData = localStorage.getItem('fittings_products_cache');
    if (cachedData) {
        try {
            products = JSON.parse(cachedData);
            renderProducts();
            updateCart();
            hidePreloader(); // Сразу же убираем экран загрузки!
        } catch (e) {
            console.error("Ошибка чтения кэша:", e);
        }
    }

    // 2. В фоновом режиме делаем запрос к Google Таблице за свежими остатками
    try {
        const response = await fetch(PRODUCTS_API_URL);
        if (!response.ok) throw new Error('Ошибка фоновой загрузки');
        const freshProducts = await response.json();
        
        products = freshProducts;
        localStorage.setItem('fittings_products_cache', JSON.stringify(freshProducts));
        
        // Тихо обновляем витрину свежими данными
        renderProducts();
        updateCart();
    } catch (error) {
        console.error("Ошибка обновления данных из Google:", error);
        
        // Если кэша вообще не было и сеть упала — только тогда показываем ошибку
        if (products.length === 0 && productsGrid) {
            productsGrid.innerHTML = `
                <div class="col-span-2 text-center py-8">
                    <p class="text-red-400/80 text-xs font-medium">Ошибка загрузки каталога товаров</p>
                    <p class="text-[10px] text-zinc-600 mt-1">Пожалуйста, проверьте подключение к сети</p>
                </div>
            `;
        }
    } finally {
        // На случай самого первого входа (когда кэша еще нет) убираем прелоадер после завершения запроса
        hidePreloader();
    }
}

// Плавное удаление прелоадера
function hidePreloader() {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        preloader.classList.add('opacity-0');
        setTimeout(() => preloader.remove(), 500);
    }
}

// Рендеринг карточек товаров на витрине
function renderProducts() {
    if (!productsGrid) return;
    
    productsGrid.innerHTML = products.map(product => {
        const isOutOfStock = product.stock <= 0;
        const currentQty = cart[product.id] || 0;
        const unit = product.unit || 'шт.';
        
        // Светлые полупрозрачные плашки с черным текстом (высокий контраст и читаемость)
        const stockBadge = isOutOfStock 
            ? `<span class="absolute top-2 left-2 bg-red-200/85 backdrop-blur-[2px] px-2 py-0.5 rounded-lg text-[9px] text-red-950 font-bold tracking-wider uppercase border border-red-300/20 shadow-sm">Нет</span>`
            : `<span class="absolute top-2 left-2 bg-white/85 backdrop-blur-[2px] px-2 py-0.5 rounded-lg text-[9px] text-zinc-950 font-bold tracking-wider uppercase border border-white/30 shadow-sm">Осталось: ${product.stock} ${unit}</span>`;
        const opacityClass = isOutOfStock ? 'opacity-40' : '';

        return `
            <div class="group relative bg-[#1C1C1E] border border-zinc-800/40 rounded-[24px] p-3 flex flex-col justify-between transition-all duration-300 hover:border-[#C67C4E]/30 hover:shadow-[0_12px_40px_rgba(0,0,0,0.35),0_8px_20px_rgba(198,124,78,0.06)] ${opacityClass}">
                <div>
                    <!-- Изображение -->
                    <div class="relative w-full aspect-square bg-zinc-950/80 rounded-[18px] overflow-hidden mb-3">
                        <img src="${product.image}" alt="${product.name}" loading="lazy" 
                             class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                             onerror="this.src='https://placehold.co/300x300/1c1c1e/3f3f46?text=Fittings_shop'">
                        ${stockBadge}
                    </div>
                    
                    <h3 class="font-semibold text-sm text-zinc-100 leading-snug px-1 h-10 overflow-hidden">${product.name}</h3>
                    <p class="text-[11px] text-zinc-500 mt-1 px-1">Размер: ${product.size}</p>
                </div>
                
                <!-- Цена + Счетчик -->
                <div class="mt-4 pt-3 border-t border-zinc-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-1">
                    <span class="text-base font-bold text-[#C67C4E]">
                        ${product.price} ₽<span class="text-[10px] font-normal text-zinc-500"> / ${unit}</span>
                    </span>
                    <div class="flex items-center bg-zinc-950 rounded-xl p-0.5 border border-zinc-800/80 w-full sm:w-auto justify-between">
                        <button onclick="changeQty(${product.id}, -1)" ${isOutOfStock ? 'disabled' : ''} 
                                class="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-[#C67C4E] hover:bg-zinc-900 disabled:opacity-30 active:scale-90 transition-all font-bold text-sm">-</button>
                        <span id="qty-${product.id}" class="text-xs font-semibold w-6 text-center text-zinc-100">${currentQty}</span>
                        <button onclick="changeQty(${product.id}, 1)" ${isOutOfStock ? 'disabled' : ''} 
                                class="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-[#C67C4E] hover:bg-zinc-900 disabled:opacity-30 active:scale-90 transition-all font-bold text-sm">+</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Изменение количества товара
window.changeQty = function(id, delta) {
    const product = products.find(p => p.id === id);
    if (!product || product.stock <= 0) return;

    if (!cart[id]) cart[id] = 0;
    
    const unit = product.unit || 'шт.';
    
    if (delta > 0 && cart[id] >= product.stock) {
        alert(`Извините, на складе осталось только ${product.stock} ${unit}`);
        return;
    }

    cart[id] += delta;
    if (cart[id] <= 0) delete cart[id];
    
    const qtyEl = document.getElementById(`qty-${id}`);
    if (qtyEl) qtyEl.textContent = cart[id] || 0;
    
    updateCart();
}

// Обновление отображения корзины
function updateCart() {
    if (!cartSummary || !totalPriceEl) return;
    
    let total = 0;
    
    const cartItems = Object.entries(cart).map(([id, qty]) => {
        const product = products.find(p => p.id === parseInt(id));
        if (product) {
            const itemTotal = product.price * qty;
            total += itemTotal;
            
            const unit = product.unit || 'шт.';
            
            return `
                <div class="flex items-center justify-between bg-[#131313]/50 backdrop-blur-md border border-zinc-800/40 rounded-2xl p-3 shadow-sm">
                    <div class="flex items-center space-x-3">
                        <img src="${product.image}" alt="${product.name}" 
                             class="w-12 h-12 object-cover rounded-xl bg-zinc-900 border border-zinc-800/50" 
                             onerror="this.src='https://placehold.co/100x100/1c1c1e/3f3f46?text=Нет+фото'">
                        <div>
                            <h4 class="text-xs font-bold text-zinc-100 leading-tight">${product.name}</h4>
                            <p class="text-[10px] text-zinc-500 mt-1">${product.size} • ${product.price} ₽</p>
                        </div>
                    </div>
                    <div class="text-right flex flex-col items-end">
                        <span class="text-xs font-bold text-[#C67C4E]">${itemTotal} ₽</span>
                        <span class="text-[10px] text-zinc-500 mt-1">${qty} ${unit}</span>
                    </div>
                </div>
            `;
        }
        return "";
    }).filter(item => item !== "");
    
    if (cartItems.length === 0) {
        cartSummary.innerHTML = `
            <div class="text-center py-8 border border-dashed border-zinc-800/60 rounded-2xl">
                <span class="text-zinc-600 text-xl">🛒</span>
                <p class="text-xs text-zinc-500 mt-2">Корзина пуста. Добавьте товары выше.</p>
            </div>
        `;
    } else {
        cartSummary.innerHTML = cartItems.join('\n');
    }
    
    totalPriceEl.textContent = `${total} ₽`;
}

// Отправка заказа
if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
        const city = cityInput ? cityInput.value.trim() : "";
        const cartItems = Object.entries(cart).map(([id, qty]) => {
            const product = products.find(p => p.id === parseInt(id));
            return {
                name: product.name,
                size: product.size,
                price: product.price,
                qty: qty,
                total: product.price * qty
            };
        });

        if (cartItems.length === 0) {
            alert('Пожалуйста, выберите хотя бы один товар.');
            return;
        }

        if (!city) {
            alert('Пожалуйста, укажите город доставки.');
            return;
        }

        const user = tg.initDataUnsafe?.user || {};
        const orderData = {
            user: {
                id: user.id || null,
                first_name: user.first_name || 'Не указано',
                last_name: user.last_name || '',
                username: user.username || ''
            },
            city: city,
            items: cartItems,
            totalPrice: cartItems.reduce((acc, item) => acc + item.total, 0)
        };

        submitBtn.disabled = true;
        submitBtn.textContent = 'ОТПРАВКА...';

        try {
            const response = await fetch('/api/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });

            if (response.ok) {
                alert('Заказ успешно оформлен!');
                tg.close();
            } else {
                throw new Error('Ошибка сервера');
            }
        } catch (error) {
            alert('Ошибка при отправке заказа. Пожалуйста, попробуйте еще раз.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'ОФОРМИТЬ ЗАКАЗ';
        }
    });
}

// Запуск фоновой и локальной загрузки
loadProducts();