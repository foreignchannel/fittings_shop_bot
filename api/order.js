export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { user, city, items, totalPrice } = req.body;
    const BOT_TOKEN = process.env.BOT_TOKEN;
    const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

    if (!BOT_TOKEN || !ADMIN_CHAT_ID) {
        return res.status(500).json({ error: 'Environment variables are missing' });
    }

    const itemsText = items.map(item => `• ${item.name} (${item.size}) x${item.qty} — ${item.total} ₽`).join('\n');
    
    // Сообщение сестре (администратору)
    const adminMessage = `
<b>🔔 Новый заказ!</b>

👤 <b>Клиент:</b> ${user.first_name} ${user.last_name || ''} (@${user.username || 'нет_юзернейма'})
📍 <b>Город:</b> ${city}

📦 <b>Товары:</b>
${itemsText}

💰 <b>Итого к оплате:</b> ${totalPrice} ₽
`;

    // Сообщение клиенту
    const customerMessage = `
<b>✅ Ваш заказ успешно оформлен!</b>

📦 <b>Детали заказа:</b>
${itemsText}

📍 <b>Доставка в г.:</b> ${city}
💰 <b>Итого к оплате:</b> ${totalPrice} ₽

Администратор свяжется с вами в ближайшее время для подтверждения. Спасибо за заказ!
`;

    try {
        // 1. Отправка администратору
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: ADMIN_CHAT_ID,
                text: adminMessage,
                parse_mode: 'HTML'
            })
        });

        // 2. Отправка покупателю (если известен его chat_id)
        if (user.id) {
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: user.id,
                    text: customerMessage,
                    parse_mode: 'HTML'
                })
            });
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Ошибка Telegram API:', error);
        return res.status(500).json({ error: 'Failed to send message' });
    }
}