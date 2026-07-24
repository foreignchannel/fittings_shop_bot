export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const BOT_TOKEN = process.env.BOT_TOKEN;
    const update = req.body;

    if (update && update.message && update.message.text) {
        const chatId = update.message.chat.id;
        const text = update.message.text;

        if (text === '/start') {
            // Динамически определяем домен вашего сайта на Vercel
            const host = req.headers.host; 
            const webAppUrl = `https://${host}`;

            const messageData = {
                chat_id: chatId,
                text: "👋 Добро пожаловать в Fittings_shop!\n\nНажмите на кнопку ниже, чтобы открыть наш каталог фурнитуры и быстро оформить заказ.",
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "🛍️ Открыть каталог",
                                web_app: { url: webAppUrl }
                            }
                        ]
                    ]
                }
            };

            try {
                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(messageData)
                });
            } catch (err) {
                console.error('Ошибка отправки приветствия:', err);
            }
        }
    }

    return res.status(200).json({ ok: true });
}