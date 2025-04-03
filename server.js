require("dotenv").config();
const TelegramBot = require('node-telegram-bot-api');
const QRCode = require('qrcode');

// Tokenni `.env` fayldan olish
const token = process.env.BOT_TOKEN;

// Bot yaratish
const bot = new TelegramBot(token, { polling: true });

// QR cache (fayllarni saqlamaslik uchun)
const qrCache = {};

// `/start` komandasi
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "👋 Assalomu alaykum! QR kod yaratish uchun menga havola (URL) yuboring.");
});

// Inline tugmalar yaratish
function getSizeButtons() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔹 Kichik", callback_data: "small" }],
        [{ text: "🔸 O‘rtacha", callback_data: "medium" }],
        [{ text: "🔶 Katta", callback_data: "large" }]
      ]
    }
  };
}

// QR kod yaratish
async function generateQRCode(chatId, url, size) {
  const qrSize = getQRCodeSize(size);
  const cacheKey = `${url}-${qrSize}`;

  if (qrCache[cacheKey]) {
    bot.sendPhoto(chatId, { source: qrCache[cacheKey] }, { caption: "📌 Sizning QR kodingiz!" });
  } else {
    try {
      const qrBuffer = await QRCode.toBuffer(url, { width: qrSize });
      qrCache[cacheKey] = qrBuffer; // Cache qilish

      bot.sendPhoto(chatId, { source: qrBuffer }, { caption: "✅ Sizning QR kodingiz!" });
    } catch (err) {
      bot.sendMessage(chatId, "❌ Xatolik yuz berdi. Iltimos, qaytadan urinib ko‘ring.");
      console.error(err);
    }
  }
}


// **Foydalanuvchi URL yuborganda (har safar ishlaydi)**
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  let text = msg.text.trim();

  // Agar foydalanuvchi bot komandasi yuborgan bo'lsa (masalan, /start, /help)
  if (text.startsWith('/')) {
    return; // Hech narsa qilmaymiz
  }

  if (!isValidURL(text)) {
    bot.sendMessage(chatId, "⚠️ Noto‘g‘ri havola. Iltimos, haqiqiy URL kiriting.");
    return;
  }

  // `http://` yoki `https://` bo‘lmasa, avtomatik qo‘shamiz
  if (!text.startsWith("http://") && !text.startsWith("https://")) {
    text = "https://" + text;
  }

  qrCache[chatId] = { url: text };
  bot.sendMessage(chatId, "📏 QR kod o‘lchamini tanlang:", getSizeButtons());
});

// Foydalanuvchi QR o‘lchamini tanlaganda
bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;
  const size = query.data;

  if (!['small', 'medium', 'large'].includes(size)) {
    bot.sendMessage(chatId, "⚠️ Noto‘g‘ri tanlov. Iltimos, qaytadan urinib ko‘ring.");
    return;
  }

  // Agar foydalanuvchi hali link yubormagan bo‘lsa, chiqamiz
  if (!qrCache[chatId] || !qrCache[chatId].url) {
    bot.sendMessage(chatId, "⚠️ Iltimos, avval URL yuboring.");
    return;
  }

  // QR yaratamiz
  const url = qrCache[chatId].url;
  generateQRCode(chatId, url, size);

  // Foydalanuvchi holatini tozalash (har safar yangi QR yaratishi uchun)
  delete qrCache[chatId];
});

// URL tekshiruvchi funksiya
function isValidURL(url) {
  const regex = /^(https?:\/\/)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})(\/.*)?$/;
  return regex.test(url);
}

// QR kod o‘lchami
function getQRCodeSize(size) {
  switch (size) {
    case 'small': return 150;
    case 'medium': return 250;
    case 'large': return 350;
    default: return 250;
  }
}
