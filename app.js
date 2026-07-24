const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

let products = [];
let cart = {};

const productsGrid = document.getElementById('products-grid');
const cartSummary = document.getElementById('cart-summary');
const totalPriceEl = document.getElementById('total-price');
const cityInput = document.getElementById('city');
const submitBtn = document.getElementById('submit-order-btn');

async function loadProducts() {
    try {
        const response = await fetch('products.json');
        if (!response.ok) throw new Error('Ошибка загрузки');
        products = await response.json();
        renderProducts();
        updateCart();
    } catch (error) {
        console.error(error);
        productsGrid.innerHTML = `
            <div class="col-span-2 text-center py-8">
                <p class="text-red-400/80 text-xs font-medium">Ошибка загрузки каталога товаров</p>
                <p class="text-[10px] text-zinc-600 mt-1">Пожалуйста, убедитесь, что файл products.json находится в корне проекта</p>
            </div>
        `;
    } finally {
        // Гарантированно убираем экран загрузки после завершения (даже при ошибке)
        const preloader = document.getElementById('preloader');
        if (preloader) {
            preloader.classList.add('opacity-0');
            setTimeout(() => preloader.remove(), 500);
        }
    }
}

// Рендеринг карточек в стиле референса (с оптимизацией производительности)
function renderProducts() {
    productsGrid.innerHTML = products.map(product => {
        const isOutOfStock = product.stock <= 0;
        const currentQty = cart[product.id] || 0;
        
        // Полупрозрачный матовый стеклянный бейдж (с использованием backdrop-blur)
        const stockBadge = isOutOfStock 
            ? `<span class="absolute top-2.5 left-2.5 bg-red-950/40 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] text-red-300 font-semibold border border-red-500/20 shadow-lg">Нет в наличии</span>`
            : `<span class="absolute top-2.5 left-2.5 bg-[#131313]/55 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] text-[#C67C4E] font-semibold border border-white/5 shadow-md">Осталось: ${product.stock} шт</span>`;

        const opacityClass = isOutOfStock ? 'opacity-40' : '';

        return `
            <!-- Карточки имеют непрозрачный фон для избежания сильных лагов рендеринга на старых телефонах -->
            <div class="group relative bg-[#1C1C1E] border border-zinc-800/40 rounded-[24px] p-3 flex flex-col justify-between transition-all duration-300 hover:border-[#C67C4E]/30 hover:shadow-[0_12px_40px_rgba(0,0,0,0.35),0_8px_20px_rgba(198,124,78,0.06)] ${opacityClass}">
                <div>
                    <!-- Квадратное фото товара с ленивой загрузкой -->
                    <div class="relative w-full aspect-square bg-zinc-950/80 rounded-[18px] overflow-hidden mb-3">
                        <img src="${product.image}" alt="${product.name}" loading="lazy" 
                             class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                             onerror="this.src='https://placehold.co/300x300/1c1c1e/3f3f46?text=Fittings_shop'">
                        ${stockBadge}
                    </div>
                    
                    <!-- Крупные читаемые шрифты для названий -->
                    <h3 class="font-semibold text-sm text-zinc-100 leading-snug px-1 h-10 overflow-hidden">${product.name}</h3>
                    <p class="text-[11px] text-zinc-500 mt-1 px-1">Размер: ${product.size}</p>
                </div>
                
                <!-- Контроллер количества и цена -->
                <div class="mt-4 pt-3 border-t border-zinc-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-1">
                    <span class="text-base font-bold text-[#C67C4E]">${product.price} ₽</span>
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

window.changeQty = function(id, delta) {
    const product = products.find(p => p.id === id);
    if (!product || product.stock <= 0) return;

    if (!cart[id]) cart[id] = 0;
    
    if (delta > 0 && cart[id] >= product.stock) {
        alert(`Извините, на складе осталось только ${product.stock} шт.`);
        return;
    }

    cart[id] += delta;
    if (cart[id] <= 0) delete cart[id];
    
    const qtyEl = document.getElementById(`qty-${id}`);
    if (qtyEl) qtyEl.textContent = cart[id] || 0;
    
    updateCart();
}

// Обновление корзины с отрисовкой визуальных плашек и миниатюр
function updateCart() {
    let total = 0;
    
    const cartItems = Object.entries(cart).map(([id, qty]) => {
        const product = products.find(p => p.id === parseInt(id));
        if (product) {
            const itemTotal = product.price * qty;
            total += itemTotal;
            
            // Дизайнерские плашки в корзине с миниатюрой
            return `
                <div class="flex items-center justify-between bg-[#131313]/50 backdrop-blur-md border border-zinc-800/40 rounded-2xl p-3 shadow-md">
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
                        <span class="text-[10px] text-zinc-500 mt-1">${qty} шт.</span>
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

submitBtn.addEventListener('click', async () => {
    const city = cityInput.value.trim();
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

loadProducts();