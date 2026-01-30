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

startBot();
