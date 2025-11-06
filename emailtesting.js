// // server.js
// // Dependencies: express, nodemailer, body-parser, cors, imap-simple, mailparser, socket.io, axios, dotenv, googleapis
// require('dotenv').config();
// const express = require('express');
// const bodyParser = require('body-parser');
// const cors = require('cors');
// const nodemailer = require('nodemailer');
// const imaps = require('imap-simple');
// const { simpleParser } = require('mailparser');
// const http = require('http');
// const { Server } = require('socket.io');
// const axios = require('axios');
// const path = require('path');
// const { google } = require('googleapis');

// // --------------------
// // Google Sheets integration (robust & auto-save)
// // --------------------
// const GOOGLE_SERVICE_ACCOUNT_FILE = process.env.GOOGLE_SERVICE_ACCOUNT_FILE || './service-zapier-sem7-minor-project-c02d6e574bb7.json';
// const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || '1owqjzWNvGDDzUJ6ZvW1Ogp7azTLt3eFzTsxk0NdUpKc'; // replace with your actual sheet id

// let sheetsClient = null;

// async function initSheetsClient() {
//   try {
//     const auth = new google.auth.GoogleAuth({
//       keyFile: GOOGLE_SERVICE_ACCOUNT_FILE,
//       scopes: ['https://www.googleapis.com/auth/spreadsheets']
//     });
//     const client = await auth.getClient();
//     sheetsClient = google.sheets({ version: 'v4', auth: client });
//     await sheetsClient.spreadsheets.get({ spreadsheetId: GOOGLE_SHEET_ID });
//     console.log('✅ Google Sheets connected.');
//   } catch (err) {
//     console.error('❌ Failed to connect Google Sheets:', err.message);
//     sheetsClient = null;
//   }
// }

// async function appendEmailToSheet(emailObj) {
//   try {
//     if (!sheetsClient) {
//       console.warn('⚠️ Sheets client not ready, reinitializing...');
//       await initSheetsClient();
//       if (!sheetsClient) throw new Error('Sheets client unavailable');
//     }

//     const values = [[
//       new Date(emailObj.date).toLocaleString(),
//       emailObj.from || '',
//       emailObj.subject || '',
//       emailObj.text ? emailObj.text.substring(0, 1000) : '',
//       (emailObj.links && emailObj.links.length) ? emailObj.links.join(', ') : ''
//     ]];

//     await sheetsClient.spreadsheets.values.append({
//       spreadsheetId: GOOGLE_SHEET_ID,
//       range: 'Sheet1!A:E',
//       valueInputOption: 'USER_ENTERED',
//       insertDataOption: 'INSERT_ROWS',
//       requestBody: { values }
//     });

//     console.log(`📄 Saved to Google Sheets: ${emailObj.subject || '(no subject)'}`);
//   } catch (err) {
//     console.error('❌ Error appending to Google Sheet:', err.message);
//   }
// }

// // --------------------
// // Express + Socket setup
// // --------------------
// const app = express();
// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: { origin: '*', methods: ['GET', 'POST'] },
//   pingInterval: 25000,
//   pingTimeout: 60000,
//   maxHttpBufferSize: 1e6
// });

// app.use(cors());
// app.use(bodyParser.json());
// app.use(express.static(path.join(__dirname, 'public')));

// // --------------------
// // CONFIG
// // --------------------
// const SMTP_USER = process.env.SMTP_USER || 'ieducation.hub.2013@gmail.com';
// const SMTP_PASS = process.env.SMTP_PASS || 'rryt kazz qryn osce';
// const IMAP_USER = process.env.IMAP_USER || SMTP_USER;
// const IMAP_PASS = process.env.IMAP_PASS || SMTP_PASS;
// const IMAP_HOST = process.env.IMAP_HOST || 'imap.gmail.com';
// const IMAP_PORT = process.env.IMAP_PORT ? Number(process.env.IMAP_PORT) : 993;
// const PORT = process.env.PORT ? Number(process.env.PORT) : 6000;

// // --------------------
// // Nodemailer
// // --------------------
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   secure: true,
//   port: 465,
//   auth: { user: SMTP_USER, pass: SMTP_PASS }
// });
// transporter.verify().then(() => console.log('📨 SMTP ready')).catch(err => console.error('SMTP verify:', err.message));

// // --------------------
// // In-memory storage
// // --------------------
// const recentEmails = [];
// const MAX_STORE = 500;
// const registeredWebhooks = new Set();

// function pushEmailToStore(obj) {
//   recentEmails.unshift(obj);
//   if (recentEmails.length > MAX_STORE) recentEmails.pop();
// }

// // --------------------
// // API: send email
// // --------------------
// app.post('/send-email', async (req, res) => {
//   try {
//     const { to, subject, text, html } = req.body;
//     if (!to || !subject || (!text && !html))
//       return res.status(400).json({ error: 'Missing required fields' });
//     const info = await transporter.sendMail({ from: SMTP_USER, to, subject, text, html });
//     console.log('📤 Email sent:', info.messageId);
//     res.json({ ok: true, messageId: info.messageId, response: info.response });
//   } catch (err) {
//     console.error('send-email error:', err);
//     res.status(500).json({ ok: false, error: err.message });
//   }
// });

// // --------------------
// // API: get emails
// // --------------------
// app.get('/emails', (req, res) => {
//   const limit = Math.min(200, Number(req.query.limit) || 50);
//   res.json(recentEmails.slice(0, limit));
// });

// // --------------------
// // Webhook registration
// // --------------------
// app.post('/webhooks/register', (req, res) => {
//   const { url } = req.body;
//   if (!url) return res.status(400).json({ error: 'Missing url' });
//   registeredWebhooks.add(url);
//   res.json({ ok: true, registered: Array.from(registeredWebhooks) });
// });
// app.post('/webhooks/unregister', (req, res) => {
//   const { url } = req.body;
//   if (!url) return res.status(400).json({ error: 'Missing url' });
//   registeredWebhooks.delete(url);
//   res.json({ ok: true, registered: Array.from(registeredWebhooks) });
// });
// app.get('/webhooks', (req, res) => res.json(Array.from(registeredWebhooks)));

// // --------------------
// // Socket.io
// // --------------------
// io.on('connection', (socket) => {
//   console.log('⚡ Socket connected:', socket.id);
//   socket.on('get-recent', (limit = 20) => {
//     socket.emit('recent-emails', recentEmails.slice(0, Math.min(MAX_STORE, limit)));
//   });
//   socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
// });

// // --------------------
// // Notify all clients
// // --------------------
// async function notifyAllClients(emailObj) {
//   try {
//     io.emit('new-email', emailObj);
//   } catch (err) {
//     console.error('Error emitting socket event:', err.message);
//   }

//   // Append to Google Sheets
//   appendEmailToSheet(emailObj).catch(e => console.error('appendEmailToSheet failed:', e.message));

//   // Webhooks
//   for (const url of registeredWebhooks) {
//     axios.post(url, emailObj, { timeout: 5000 }).catch(err => {
//       console.warn('Webhook POST failed to', url, err.message || err.toString());
//     });
//   }
// }

// // --------------------
// // IMAP listener
// // --------------------
// const imapConfig = {
//   imap: {
//     user: IMAP_USER,
//     password: IMAP_PASS,
//     host: IMAP_HOST,
//     port: IMAP_PORT,
//     tls: true,
//     authTimeout: 10000,
//     tlsOptions: { rejectUnauthorized: false } // dev only
//   }
// };

// async function startImapListener() {
//   try {
//     const connection = await imaps.connect(imapConfig);
//     console.log('📥 IMAP connected');
//     await connection.openBox('INBOX');

//     async function fetchUnseenAndProcess() {
//       try {
//         const searchCriteria = ['UNSEEN'];
//         const fetchOptions = { bodies: [''], markSeen: true };
//         const results = await connection.search(searchCriteria, fetchOptions);
//         if (!results || results.length === 0) return;

//         for (const res of results) {
//           const all = res.parts.find(p => p.which === '');
//           const uid = (res.attributes && res.attributes.uid) || Date.now();
//           const mail = await simpleParser(all.body);

//           const from = (mail.from?.value?.[0]?.address) || (mail.from?.text) || 'unknown';
//           const subject = mail.subject || '';
//           let textBody = (mail.text && mail.text.trim()) || '';
//           if (!textBody && mail.html)
//             textBody = mail.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

//           const links = [];
//           if (mail.html) {
//             const hrefRegex = /href=["']([^"']+)["']/gi;
//             let m;
//             while ((m = hrefRegex.exec(mail.html)) !== null) links.push(m[1]);
//           }

//           const notifyObj = {
//             id: uid,
//             from,
//             subject,
//             text: textBody,
//             links,
//             date: mail.date || new Date()
//           };

//           pushEmailToStore(notifyObj);
//           await notifyAllClients(notifyObj);

//           console.log('📩 New mail processed:', notifyObj.subject);
//         }
//       } catch (err) {
//         console.error('Error processing unseen mails:', err.message);
//       }
//     }

//     await fetchUnseenAndProcess();

//     connection.on('mail', async (numNew) => {
//       console.log('📧 IMAP event: new mail x', numNew);
//       await fetchUnseenAndProcess();
//     });

//     connection.on('error', (err) => console.error('IMAP error:', err.message));
//     connection.on('close', () => {
//       console.warn('IMAP closed, reconnecting in 5s');
//       setTimeout(startImapListener, 5000);
//     });
//   } catch (err) {
//     console.error('Failed IMAP connect:', err.message);
//     setTimeout(startImapListener, 5000);
//   }
// }

// // --------------------
// // Start everything
// // --------------------
// server.listen(PORT, async () => {
//   console.log(`🚀 Server running on port ${PORT}`);
//   await initSheetsClient(); // connect Google Sheets
//   startImapListener().catch(e => console.error('IMAP startup failed:', e));
// });





// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');
const imaps = require('imap-simple');
const { simpleParser } = require('mailparser');
const http = require('http');
const { Server } = require('socket.io');
const { google } = require('googleapis');
const path = require('path');

// --------------------
// BASIC CONFIG
// --------------------
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
const PORT = process.env.PORT || 6000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// --------------------
// EMAIL CONFIG
// --------------------
const SMTP_USER = process.env.SMTP_USER || 'ieducation.hub.2013@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS || 'rryt kazz qryn osce';
const IMAP_USER = process.env.IMAP_USER || SMTP_USER;
const IMAP_PASS = process.env.IMAP_PASS || SMTP_PASS;

// --------------------
// GOOGLE SHEETS CONFIG
// --------------------
const GOOGLE_SERVICE_ACCOUNT_FILE =
  process.env.GOOGLE_SERVICE_ACCOUNT_FILE ||
  './service-zapier-sem7-minor-project-c02d6e574bb7.json';

// ⚠️ Replace this with your actual Google Sheet ID
const GOOGLE_SHEET_ID =
  process.env.GOOGLE_SHEET_ID ||
  '1owqjzWNvGDDzUJ6ZvW1Ogp7azTLt3eFzTsxk0NdUpKc';

let sheetsClient = null;

// --------------------
// GOOGLE SHEETS INIT
// --------------------
async function initSheetsClient() {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: GOOGLE_SERVICE_ACCOUNT_FILE,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const client = await auth.getClient();
    sheetsClient = google.sheets({ version: 'v4', auth: client });
    await sheetsClient.spreadsheets.get({ spreadsheetId: GOOGLE_SHEET_ID });
    console.log('✅ Connected to Google Sheets');
  } catch (err) {
    console.error('❌ Google Sheets connection failed:', err.message);
  }
}

// --------------------
// SAVE EMAIL TO SHEET
// --------------------
async function appendEmailToSheet(emailObj) {
  if (!sheetsClient) await initSheetsClient();

  try {
    const values = [
      [
        new Date(emailObj.date).toLocaleString(),
        emailObj.from || '',
        emailObj.subject || '',
        emailObj.text ? emailObj.text.substring(0, 500) : '',
        (emailObj.links && emailObj.links.length)
          ? emailObj.links.join(', ')
          : '',
      ],
    ];

    await sheetsClient.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: 'Sheet1!A:E',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values },
    });

    console.log(`📄 Email saved to Google Sheets: ${emailObj.subject}`);
  } catch (err) {
    console.error('❌ Error appending to Google Sheet:', err.message);
  }
}

// --------------------
// IMAP CONFIG
// --------------------
const imapConfig = {
  imap: {
    user: IMAP_USER,
    password: IMAP_PASS,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    authTimeout: 10000,
    tlsOptions: { rejectUnauthorized: false },
  },
};

// --------------------
// IN-MEMORY STORAGE
// --------------------
const recentEmails = [];
const MAX_STORE = 500;

// --------------------
// SOCKET.IO CONNECTION
// --------------------
io.on('connection', (socket) => {
  console.log('⚡ Client connected:', socket.id);
  socket.emit('recent-emails', recentEmails.slice(0, 50));

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

// --------------------
// HANDLE NEW EMAIL
// --------------------
async function handleNewEmail(mail) {
  const from = mail.from?.value?.[0]?.address || mail.from?.text || 'unknown';
  const subject = mail.subject || '';
  let textBody = (mail.text && mail.text.trim()) || '';

  if (!textBody && mail.html)
    textBody = mail.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  const links = [];
  if (mail.html) {
    const hrefRegex = /href=["']([^"']+)["']/gi;
    let m;
    while ((m = hrefRegex.exec(mail.html)) !== null) links.push(m[1]);
  }

  const emailObj = {
    from,
    subject,
    text: textBody,
    links,
    date: mail.date || new Date(),
  };

  recentEmails.unshift(emailObj);
  if (recentEmails.length > MAX_STORE) recentEmails.pop();

  io.emit('new-email', emailObj);

  await appendEmailToSheet(emailObj);
}

// --------------------
// IMAP LISTENER
// --------------------
async function startImapListener() {
  try {
    const connection = await imaps.connect(imapConfig);
    console.log('📥 Connected to Gmail IMAP');
    await connection.openBox('INBOX');

    async function fetchUnseenAndProcess() {
      const results = await connection.search(['UNSEEN'], {
        bodies: [''],
        markSeen: true,
      });
      for (const res of results) {
        const all = res.parts.find((p) => p.which === '');
        const mail = await simpleParser(all.body);
        await handleNewEmail(mail);
      }
    }

    await fetchUnseenAndProcess();

    connection.on('mail', async () => {
      console.log('📧 New mail detected');
      await fetchUnseenAndProcess();
    });

    connection.on('error', (err) =>
      console.error('IMAP error:', err.message)
    );

    connection.on('close', () => {
      console.warn('⚠️ IMAP closed, reconnecting in 5s...');
      setTimeout(startImapListener, 5000);
    });
  } catch (err) {
    console.error('❌ IMAP connection failed:', err.message);
    setTimeout(startImapListener, 5000);
  }
}

// --------------------
// ROUTES
// --------------------
app.get('/', (req, res) => {
  res.send('✅ Gmail → Google Sheets sync is active and running.');
});

app.get('/start-sync', async (req, res) => {
  try {
    await initSheetsClient();
    startImapListener();
    res
      .status(200)
      .json({ ok: true, message: 'Gmail → Google Sheets sync started!' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --------------------
// START SERVER
// --------------------
server.listen(PORT, async () => {
  console.log(`🚀 Server started on port ${PORT}`);
  await initSheetsClient();
  startImapListener();
});
