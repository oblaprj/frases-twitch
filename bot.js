// bot.js
require('dotenv').config();
const tmi = require('tmi.js');
const axios = require('axios');

const botUsername = process.env.TWITCH_BOT_USERNAME;
const oauthToken = process.env.TWITCH_BOT_OAUTH_TOKEN;
const channelToJoin = process.env.TWITCH_CHANNEL_TO_JOIN;
const nandylockApiEndpoint = process.env.NANDYLOCK_API_ENDPOINT;
const commandName = (process.env.COMMAND_NAME || "!nandylock").toLowerCase();
const commandCooldownMs = Number(process.env.COMMAND_COOLDOWN_MS) || 10000;
let commandLastUsed = 0;

if (!botUsername || !oauthToken || !channelToJoin || !nandylockApiEndpoint) {
    console.error('BOT ERRO: Configurações faltando! Verifique .env ou variáveis de ambiente do Render.');
    process.exit(1);
}

const client = new tmi.Client({
    identity: { username: botUsername, password: oauthToken },
    channels: [channelToJoin]
});

client.connect().then(() => {
    console.log(`BOT: Conectado ao canal '${channelToJoin}' como '${botUsername}'. Comando: '${commandName}'`);
    client.say(channelToJoin, `Salve, galera! Nandylock na área pra dar as cartas (e as dicas)! Manda um ${commandName} <sua pergunta>!`);
}).catch(err => {
    console.error("BOT ERRO ao conectar:", err);
    process.exit(1);
});

client.on('message', async (channel, tags, message, self) => {
    if (self) return;
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.startsWith(commandName)) {
        const now = Date.now();
        if (now - commandLastUsed < commandCooldownMs) {
            console.log(`BOT: Comando '${commandName}' em cooldown.`);
            return;
        }
        const pergunta = message.slice(commandName.length).trim();
        if (!pergunta) {
            client.say(channel, `@${tags.username}, faltou a pergunta depois do ${commandName}, meu rei!`);
            return;
        }
        console.log(`BOT: [${tags['display-name']}] usou: ${message}`);
        commandLastUsed = now;
        try {
            const response = await axios.get(nandylockApiEndpoint, { params: { pergunta } });
            if (response.data) {
                client.say(channel, `@${tags['display-name']} ${response.data}`);
            } else {
                client.say(channel, `@${tags.username}, o Nandylock tá tirando um cochilo... Tenta de novo!`);
            }
        } catch (error) {
            console.error('BOT ERRO ao chamar API:', error.message);
            client.say(channel, `@${tags.username}, deu tilt na Matrix! Tenta mais tarde.`);
        }
    }
});

client.on('disconnected', (reason) => {
    console.warn(`BOT: Desconectado: ${reason}. Tentando reconectar em 10s...`);
    setTimeout(() => client.connect().catch(err => console.error(`BOT ERRO ao reconectar: ${err}`)), 10000);
});
