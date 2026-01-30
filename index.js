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

startBot();
