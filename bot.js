// bot.js
require('dotenv').config(); // Lê variáveis do .env (especialmente útil no Glitch/local)

const tmi = require('tmi.js');
const axios = require('axios');
const express = require('express'); // Para o endpoint de ping

// --- Configurações do Bot (serão carregadas do .env ou variáveis de ambiente da plataforma) ---
const botUsername = process.env.TWITCH_BOT_USERNAME;
const oauthToken = process.env.TWITCH_BOT_OAUTH_TOKEN; // Formato: "oauth:xxxxxxxxxxxxxx"
const channelToJoin = process.env.TWITCH_CHANNEL_TO_JOIN; // Nome do canal em minúsculas
const nandylockApiUrl = process.env.NANDYLOCK_API_ENDPOINT; // URL completa da sua API Nandylock
const commandName = (process.env.COMMAND_NAME || "!nandylock").toLowerCase();
const commandCooldownMs = Number(process.env.COMMAND_COOLDOWN_MS) || 10000; // 10 segundos por padrão
let commandLastUsedTimestamp = 0;

// --- Configuração do Servidor Express para o Ping do UptimeRobot ---
const appExpressPing = express();
const glitchPort = process.env.PORT || 3001; // Usa PORTA diferente da API se rodar localmente junto, Glitch define PORT

appExpressPing.get("/", (request, response) => {
  const now = new Date().toISOString();
  console.log(`[${now}] BOT PING SERVER: Ping recebido! Nandylock continua afiado.`);
  response.status(200).send(`Nandylock Bot está no modo grind, EV+ até no ping! OK às ${now}`);
});

const expressListener = appExpressPing.listen(glitchPort, () => {
  const now = new Date().toISOString();
  console.log(`[${now}] BOT PING SERVER: Servidor de ping para UptimeRobot escutando na porta ${expressListener.address().port}`);
  console.log(`[${now}] BOT PING SERVER: Configure o UptimeRobot para pingar a URL raiz deste app.`);
});

// --- Validação das Configurações Essenciais do Bot da Twitch ---
if (!botUsername || !oauthToken || !channelToJoin || !nandylockApiUrl) {
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.error("!!! BOT TWITCH ERRO FATAL: Configurações essenciais para o TMI estão faltando! !!!");
    console.error("!!! Verifique: TWITCH_BOT_USERNAME, TWITCH_BOT_OAUTH_TOKEN,               !!!");
    console.error("!!!            TWITCH_CHANNEL_TO_JOIN, NANDYLOCK_API_ENDPOINT             !!!");
    console.error("!!! nas variáveis de ambiente (arquivo .env no Glitch/local ou painel da plataforma). !!!");
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    // O bot TMI não será inicializado se faltarem essas configs. O servidor de ping ainda roda.
}

// --- Cliente TMI.js para o Bot da Twitch ---
let tmiClient;

function initializeAndConnectTmiClient() {
    if (!botUsername || !oauthToken || !channelToJoin) {
        console.warn(`[${new Date().toISOString()}] BOT TWITCH: Não foi possível inicializar o cliente TMI devido a configurações faltando.`);
        return;
    }

    tmiClient = new tmi.Client({
        options: { debug: false }, // Mude para true para logs detalhados do tmi.js
        identity: {
            username: botUsername,
            password: oauthToken
        },
        channels: [channelToJoin],
        connection: {
            reconnect: true, // TMI.js tentará reconectar automaticamente
            secure: true,
            timeout: 9000, // Timeout para conexão inicial
            maxReconnectAttempts: 5,
            maxReconnectInterval: 30000 // Não espera mais que 30s entre tentativas
        }
    });

    tmiClient.on('connected', (address, port) => {
        const now = new Date().toISOString();
        console.log(`[${now}] BOT TWITCH: >>> CONECTADO a ${address}:${port} no canal '${channelToJoin}' como '${botUsername}'.`);
        console.log(`[${now}] BOT TWITCH: >>> OUVINDO pelo comando: '${commandName}'. API alvo: ${nandylockApiUrl}`);
        tmiClient.say(channelToJoin, `Salve, salve, nação do feltro! Nandylock colou na grade pra distribuir a sabedoria (e umas piadas). Mandem um ${commandName} <sua pergunta> pra consultoria VIP! Tilt controlado, EV elevado!`);
    });

    tmiClient.on('message', async (channel, tags, message, self) => {
        if (self) return; // Ignora as próprias mensagens do bot

        const lowerMessage = message.toLowerCase();
        if (lowerMessage.startsWith(commandName)) {
            const now = Date.now();
            if (now - commandLastUsedTimestamp < commandCooldownMs) {
                console.log(`[${new Date().toISOString()}] BOT TWITCH: Comando '${commandName}' de '${tags['display-name']}' em cooldown.`);
                return;
            }

            const pergunta = message.slice(commandName.length).trim();
            if (!pergunta) {
                tmiClient.say(channel, `@${tags['display-name']}, esqueceu da pergunta depois do ${commandName}, craque? Assim não tem como te ajudar a forrar!`);
                return;
            }

            console.log(`[${new Date().toISOString()}] BOT TWITCH: [${tags['display-name']}] usou comando '${commandName}' com pergunta: "${pergunta}"`);
            commandLastUsedTimestamp = now;

            try {
                if (!nandylockApiUrl) throw new Error("URL da API Nandylock não configurada.");

                const apiResponse = await axios.get(nandylockApiUrl, {
                    params: { pergunta: pergunta },
                    timeout: 8000 // Timeout de 8 segundos para a chamada da API
                });

                const respostaNandylock = apiResponse.data;
                if (respostaNandylock && typeof respostaNandylock === 'string') {
                    const MAX_MSG_LENGTH = 480;
                    if (respostaNandylock.length > MAX_MSG_LENGTH) {
                        console.log(`[${new Date().toISOString()}] BOT TWITCH: Resposta longa da API (${respostaNandylock.length} chars), dividindo.`);
                        let बच्चीHuiResponse = respostaNandylock;
                        let partNumber = 1;
                        while ( बच्चीHuiResponse.length > 0) {
                            const chunk = बच्चीHuiResponse.substring(0, MAX_MSG_LENGTH);
                              बच्चीHuiResponse = बच्चीHuiResponse.substring(MAX_MSG_LENGTH);
                            tmiClient.say(channel, `@${tags['display-name']} (parte ${partNumber}) ${chunk}`);
                            partNumber++;
                            if ( बच्चीHuiResponse.length > 0) await new Promise(resolve => setTimeout(resolve, 1200));
                        }
                    } else {
                        tmiClient.say(channel, `@${tags['display-name']} ${respostaNandylock}`);
                    }
                } else {
                    console.warn(`[${new Date().toISOString()}] BOT TWITCH: Resposta da API Nandylock vazia ou em formato inesperado.`);
                    tmiClient.say(channel, `@${tags['display-name']}, o Nandylock deu uma bugada mental aqui... Parece que a resposta veio em código Morse e eu não entendi. Tenta de novo!`);
                }
            } catch (error) {
                console.error(`[${new Date().toISOString()}] BOT TWITCH ERRO ao chamar API Nandylock:`, error.message);
                if (error.response) {
                    console.error(`[${new Date().toISOString()}] BOT TWITCH ERRO API Status:`, error.response.status, `Data:`, error.response.data);
                }
                tmiClient.say(channel, `@${tags['display-name']}, deu um curto-circuito na linha direta com o Nandylock! Parece que ele tá offline ou o servidor da API tomou uma bad beat. Tenta mais tarde!`);
            }
        }
    });

    tmiClient.on('disconnected', (reason) => {
        console.warn(`[${new Date().toISOString()}] BOT TWITCH: Desconectado do chat da Twitch. Motivo: ${reason || 'Desconhecido'}.`);
        // TMI.js com reconnect:true tentará reconectar. Se falhar consistentemente, pode indicar problema de token ou rede.
    });

    tmiClient.on('notice', (channel, msgid, message) => {
        console.log(`[${new Date().toISOString()}] BOT TWITCH NOTICE: [${channel}] ${msgid}: ${message}`);
        if (msgid === 'msg_banned' || msgid === 'msg_channel_suspended') {
            console.error(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
            console.error(`!!! BOT TWITCH: BANIDO ou CANAL SUSPENSO. O bot não poderá operar. !!!`);
            console.error(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
            if (tmiClient && typeof tmiClient.disconnect === 'function') {
                tmiClient.disconnect(); // Desconecta para evitar loops de tentativa se banido
            }
        }
    });

    tmiClient.connect().catch(err => {
        console.error(`[${new Date().toISOString()}] BOT TWITCH: Falha inicial crítica ao conectar ao TMI: ${err.message}`);
        console.error(`[${new Date().toISOString()}] BOT TWITCH: Verifique as credenciais (username, oauth token) e o nome do canal.`);
    });
}

// Só inicializa o cliente TMI se as configs básicas estiverem presentes
if (botUsername && oauthToken && channelToJoin && nandylockApiUrl) {
    initializeAndConnectTmiClient();
} else {
    console.warn(`[${new Date().toISOString()}] BOT TWITCH: Cliente TMI não será inicializado devido a configurações essenciais ausentes. O servidor de ping PODE continuar funcionando.`);
}

// Graceful shutdown para desconectar o bot e fechar o servidor de ping
function shutdownGracefully() {
    console.log(`[${new Date().toISOString()}] SHUTDOWN: Desligamento iniciado...`);
    if (tmiClient && typeof tmiClient.disconnect === 'function' && tmiClient.readyState() === 'OPEN') {
        tmiClient.disconnect()
            .then(() => console.log(`[${new Date().toISOString()}] SHUTDOWN: Bot da Twitch desconectado.`))
            .catch(err => console.error(`[${new Date().toISOString()}] SHUTDOWN: Erro ao desconectar bot da Twitch:`, err));
    }
    expressListener.close(() => {
        console.log(`[${new Date().toISOString()}] SHUTDOWN: Servidor de Ping encerrado.`);
        process.exit(0);
    });
    // Força o encerramento após um timeout se algo travar
    setTimeout(() => {
        console.error(`[${new Date().toISOString()}] SHUTDOWN: Desligamento forçado após timeout.`);
        process.exit(1);
    }, 5000);
}
process.on('SIGINT', shutdownGracefully); // Ctrl+C
process.on('SIGTERM', shutdownGracefully); // Sinais de término de plataformas de hospedagem
