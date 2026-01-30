// index.js
const { default: makeWASocket, DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState } = require("baileys");
const P = require("pino");

const startBot = async () => {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        printQRInTerminal: true,
        auth: state,
        logger: P({ level: 'info' })
    });

    sock.ev.on('creds.update', saveCreds);

    // Listen to messages
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const text = msg.message.conversation || msg.message?.extendedTextMessage?.text;
        if (!text) return;

        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;

        if (text.startsWith('.menu')) {
            await sock.sendMessage(from, { text: "📜 *Commands:* \n.tagall\n.kick @user\n.lock\n.unlock\n.announce [message]" });
        }

        // .tagall
        if (text.startsWith('.tagall')) {
            const groupMetadata = await sock.groupMetadata(from);
            const mentions = groupMetadata.participants.map(p => p.id);
            await sock.sendMessage(from, { text: `⚠️ Attention Everyone`, mentions });
        }

        // .kick @user
        if (text.startsWith('.kick')) {
            if (!msg.key.participant) return;
            const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid;
            if (mentioned && mentioned.length > 0) {
                await sock.groupParticipantsUpdate(from, mentioned, 'remove');
            }
        }

        // .lock / .unlock
        if (text.startsWith('.lock')) {
            await sock.groupSettingUpdate(from, 'announcement');
        }
        if (text.startsWith('.unlock')) {
            await sock.groupSettingUpdate(from, 'not_announcement');
        }

        // .announce [message]
        if (text.startsWith('.announce ')) {
            const msgText = text.replace('.announce ', '');
            const groupMetadata = await sock.groupMetadata(from);
            const mentions = groupMetadata.participants.map(p => p.id);
            await sock.sendMessage(from, { text: msgText, mentions });
        }
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            if ((lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut) {
                startBot();
            } else {
                console.log('Logged out, delete auth_info folder to re-login.');
            }
        } else if (connection === 'open') {
            console.log('Bot is online!');
        }
    });
};
=======
const {
  default: makeWASocket,
  useMultiFileAuthState
} = require("@whiskeysockets/baileys");
const Pino = require("pino");

// 🔐 FRIEND (ADMIN) NUMBER — DO NOT CHANGE FORMAT
const TRUSTED_ADMIN = "2349012645757@s.whatsapp.net";

async function startBot() {
  // NEW AUTH SYSTEM (FIXES YOUR ERROR)
  const { state, saveCreds } = await useMultiFileAuthState("./auth");

  const sock = makeWASocket({
    auth: state,
    logger: Pino({ level: "silent" })
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection } = update;
    if (connection === "open") {
      console.log("✅ Bot connected successfully");
    }
    if (connection === "close") {
      console.log("❌ Disconnected, reconnecting...");
      startBot();
    }
  });

  // ================= COMMAND HANDLER =================
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!from.endsWith("@g.us")) return;

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    // 🔒 ONLY YOUR FRIEND CAN CONTROL THE BOT
    if (sender !== TRUSTED_ADMIN) return;

    const metadata = await sock.groupMetadata(from);
    const members = metadata.participants.map(p => p.id);

    // ===== .tagall =====
    if (text === ".tagall") {
      let body =
`▢ Group : *${metadata.subject}*
▢ Members : *${members.length}*
▢ Message: *Attention Everyone*

┌───⊷ *MENTIONS*
`;

      members.forEach(m => {
        body += `⚠️ @${m.split("@")[0]}\n`;
      });

      body += `└──✪ JAWAD ┃ MD ✪──`;

      await sock.sendMessage(from, {
        text: body,
        mentions: members
      });
    }

    // ===== .kick (reply) =====
    if (text === ".kick") {
      const ctx = msg.message.extendedTextMessage?.contextInfo;
      if (!ctx?.participant) return;

      await sock.groupParticipantsUpdate(
        from,
        [ctx.participant],
        "remove"
      );
    }

    // ===== .lock =====
    if (text === ".lock") {
      await sock.groupSettingUpdate(from, "announcement");
      await sock.sendMessage(from, { text: "🔒 Group locked by admin." });
    }

    // ===== .unlock =====
    if (text === ".unlock") {
      await sock.groupSettingUpdate(from, "not_announcement");
      await sock.sendMessage(from, { text: "🔓 Group unlocked." });
    }

    // ===== .announce =====
    if (text.startsWith(".announce")) {
      const msgText = text.replace(".announce", "").trim();
      if (!msgText) return;

      await sock.sendMessage(from, {
        text: `📢 *ANNOUNCEMENT*\n\n${msgText}`
      });
    }

    // ===== .menu =====
    if (text === ".menu") {
      await sock.sendMessage(from, {
        text: `
📌 *CLAN ADMIN BOT MENU*

.tagall  – Mention all members
.kick    – Kick member (reply)
.lock    – Lock group
.unlock  – Unlock group
.announce <text>
.menu    – Show this menu
`
      });
    }
  });
}
>>>>>>> 48319aa79d3a3c448a454bafbb936d8f3c5dbf6a

startBot();
