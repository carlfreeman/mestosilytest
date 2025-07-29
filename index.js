require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Настройки защиты от спама
const SPAM_PROTECTION = {
  MAX_REQUESTS_PER_IP: 3,
  TIME_WINDOW_MINUTES: 1,
  MESSAGE_MAX_LENGTH: 500, 
  BAN_TIME_MINUTES: 5,
  NAME_MIN_LENGTH: 2,
  PHONE_MIN_LENGTH: 7,
  NAME_MAX_LENGTH: 54,
  PHONE_MAX_LENGTH: 16
};

// Хранилище для отслеживания запросов
const ipStore = new Map();

// Очистка старых записей каждые 5 минут
setInterval(() => {
  const now = Date.now();
  ipStore.forEach((entry, ip) => {
    if (now - entry.lastUpdated > SPAM_PROTECTION.BAN_TIME_MINUTES * 60 * 1000) {
      ipStore.delete(ip);
    }
  });
}, 5 * 60 * 1000);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, './public')));

// Настройка почтового клиента
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  ...(process.env.NODE_ENV === 'development' && {
    tls: { rejectUnauthorized: false }
  })
});

// Проверка лимитов запросов
function checkRequestLimits(ip) {
  const now = Date.now();
  const timeWindow = SPAM_PROTECTION.TIME_WINDOW_MINUTES * 60 * 1000;
  
  if (!ipStore.has(ip)) {
    ipStore.set(ip, {
      count: 1,
      firstRequest: now,
      lastUpdated: now
    });
    return true;
  }

  const entry = ipStore.get(ip);
  
  // Если прошло больше временного окна - сброс счетчика
  if (now - entry.firstRequest > timeWindow) {
    entry.count = 1;
    entry.firstRequest = now;
    entry.lastUpdated = now;
    return true;
  }
  
  // Если еще в пределах окна
  if (entry.count < SPAM_PROTECTION.MAX_REQUESTS_PER_IP) {
    entry.count++;
    entry.lastUpdated = now;
    return true;
  }
  
  // Превышен лимит
  entry.lastUpdated = now;
  return false;
}

// Middleware для защиты от спама
app.post('/api/contact', async (req, res) => {
  const ipAddress = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress;
  const { name, phone, message } = req.body;

  // 1. Проверка лимита запросов
  if (!checkRequestLimits(ipAddress)) {
    console.warn(`Превышен лимит запросов с IP: ${ipAddress}`);
    return res.status(429).json({
      success: false,
      message: 'Слишком много запросов. Попробуйте позже.'
    });
  }

  // 2. Проверка обязательных полей
  if (!name || name.trim().length < SPAM_PROTECTION.NAME_MIN_LENGTH || name.trim().length > SPAM_PROTECTION.NAME_MAX_LENGTH) {
    return res.status(400).json({
      success: false,
      message: `Имя должно содержать ${SPAM_PROTECTION.NAME_MIN_LENGTH}-${SPAM_PROTECTION.NAME_MAX_LENGTH} символа`
    });
  }

  if (!phone || phone.trim().length < SPAM_PROTECTION.PHONE_MIN_LENGTH || phone.trim().length > SPAM_PROTECTION.PHONE_MAX_LENGTH) {
    return res.status(400).json({
      success: false,
      message: `Телефон должен содержать ${SPAM_PROTECTION.PHONE_MIN_LENGTH}-${SPAM_PROTECTION.PHONE_MAX_LENGTH} символов`
    });
  }

  // 3. Проверка длины сообщения
  if (message && message.length > SPAM_PROTECTION.MESSAGE_MAX_LENGTH) {
    console.warn(`Слишком длинное сообщение от ${ipAddress}`);
    return res.status(400).json({
      success: false,
      message: `Сообщение не должно превышать ${SPAM_PROTECTION.MESSAGE_MAX_LENGTH} символов`
    });
  }

  // 4. Проверка honeypot-полей
  if (req.body.honeypot || req.body.website || req.body.url) {
    console.warn(`Ловушка сработала (IP: ${ipAddress})`);
    return res.status(400).json({ success: false, message: 'Ошибка запроса' });
  }

  // Если все проверки пройдены - отправляем письмо
  try {
    const mailOptions = {
      from: `"Место Силы" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_TO,
      subject: 'Новая заявка с сайта Место Силы',
      text: [
        `Имя: ${name}`,
        `Телефон: ${phone}`,
        `Сообщение: ${message ? message.slice(0, SPAM_PROTECTION.MESSAGE_MAX_LENGTH) : 'Не указано'}`,
        `IP: ${ipAddress}`,
        `User-Agent: ${req.get('User-Agent') || 'Не указан'}`,
        `Время: ${new Date().toLocaleString()}`
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2 style="color: #2688eb;">Новая заявка с сайта</h2>
          <p><strong>Имя:</strong> ${name}</p>
          <p><strong>Телефон:</strong> ${phone}</p>
          ${message ? `<p><strong>Сообщение:</strong><br> ${message.slice(0, SPAM_PROTECTION.MESSAGE_MAX_LENGTH)}</p>` : ''}
          <p style="font-family: monospace; font-size: 10px; color: #808080">
            <b>IP:</b> ${ipAddress}<br>
            <b>User-Agent:</b> ${req.get('User-Agent') || 'Не указан'}<br>
            <b>Дата:</b> ${new Date().toLocaleString()}
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: 'Сообщение отправлено!' });

  } catch (error) {
    console.error('Ошибка сервера:', error);
    res.status(500).json({ 
      success: false,
      errors: [{ field: 'form', message: 'Ошибка сервера при обработке запроса' }]
    });
  }
});

// Остальные маршруты
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, './public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
