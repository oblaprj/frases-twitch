// index.js (API e BOT JUNTOS - systemPrompt ATUALIZADO COM A VERSÃO FORNECIDA PELO USUÁRIO)
require('dotenv').config();

const express = require('express');
const { Configuration, OpenAIApi } = require("openai");
const tmi = require('tmi.js');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// --- Adicionar suporte a CORS (se necessário) ---
// app.use((req, res, next) => {
//   res.header('Access-Control-Allow-Origin', '*');
//   res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
//   next();
// });

// --- Configurações Globais e Validação ---
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const TWITCH_BOT_USERNAME = process.env.TWITCH_BOT_USERNAME;
const TWITCH_BOT_OAUTH_TOKEN = process.env.TWITCH_BOT_OAUTH_TOKEN;
const TWITCH_CHANNEL_TO_JOIN = process.env.TWITCH_CHANNEL_TO_JOIN;
const COMMAND_NAME = (process.env.COMMAND_NAME || "!nandylock").toLowerCase();
const COMMAND_COOLDOWN_MS = Number(process.env.COMMAND_COOLDOWN_MS) || 10000;
const SELF_NANDYLOCK_API_ENDPOINT = process.env.NANDYLOCK_API_ENDPOINT;

let openaiClient;
if (GROQ_API_KEY) {
  const configuration = new Configuration({ apiKey: GROQ_API_KEY, basePath: "https://api.groq.com/openai/v1" });
  openaiClient = new OpenAIApi(configuration);
  console.log(`[${new Date().toISOString()}] API: Cliente OpenAI/Groq inicializado.`);
} else {
  console.error(`[${new Date().toISOString()}] API ERRO FATAL: GROQ_API_KEY não definida! API Nandylock não funcionará.`);
}

// --- Endpoint de Ping para UptimeRobot ---
app.get('/api/keepalive', (req, res) => {
  const now = new Date().toISOString();
  console.log(`[${now}] KEEP-ALIVE PING: Ping recebido!`);
  if (openaiClient) {
    res.status(200).send(`Nandylock Suite no ar e no modo grind! Ping OK e cliente Groq PRONTO às ${now}. EV+!`);
  } else {
    res.status(503).send(`Nandylock Suite no ar, MAS cliente Groq NÃO INICIALIZADO (API Key?). Ping OK às ${now}.`);
  }
});

// --- Endpoint da API Nandylock ---
app.get('/api/nandylock', async (req, res) => {
  let pergunta = req.query.pergunta || "";
  const now = new Date().toISOString();

  // Sanitização da pergunta (mantida da versão anterior, útil se a entrada for "suja")
  if (typeof pergunta === 'string') {
    console.log(`[${now}] API /api/nandylock: Pergunta original recebida: "${pergunta}"`);
    if (pergunta.startsWith("pergunta=")) { pergunta = pergunta.substring(9); }
    const queryPatterns = /\$[\(\{](?:query|querystring|1)[^\)\}]*[\)\}]\??/g;
    if (queryPatterns.test(pergunta)) { pergunta = pergunta.replace(queryPatterns, ""); }
    if (pergunta.startsWith("?")) { pergunta = pergunta.substring(1); }
    const jsonPrefixMatch = pergunta.match(/^\s*\{.*?\}\s*/);
    if (jsonPrefixMatch) { pergunta = pergunta.substring(jsonPrefixMatch[0].length); }
    pergunta = pergunta.trim();
    if (!pergunta) {
      pergunta = "Fala aí, qual a boa?"; // Pergunta padrão mais no estilo Nandylock
      console.log(`[${now}] API /api/nandylock: Pergunta vazia após sanitização, usando pergunta padrão: "${pergunta}"`);
    }
  }

  if (!pergunta) {
    return res.status(400).send('Mandou a pergunta pra onde, meu nobre? Não chegou aqui não!');
  }
  if (!openaiClient) {
    return res.status(500).send('A central do Nandylock tá offline, faltou a chave do cofre (API Key).');
  }
  console.log(`[${now}] API /api/nandylock: Pergunta final após sanitização: "${pergunta}"`);
  try {
    // ############### NOVO systemPrompt FORNECIDO PELO USUÁRIO ###############
    const systemPrompt = `Você é Nandylock, um personagem carismático e debochado do mundo do poker. Você responde no chat da Twitch como se fosse um grinder real, com foco total em estratégias de MTT (Multi-Table Tournaments). Seu estilo é direto, provocador, divertido e cheio de gírias do pôquer. Você tem uma personalidade marcante: confiante, sarcástica, e afiada como lâmina de squeeze.

Aqui estão suas características principais:

💬 Estilo: respostas curtas (máx. 2-3 frases), engraçadas e sempre com tom de jogador experiente que já viu de tudo no field.,
🧠 Conteúdo: conhecimento técnico avançado (GTO, exploit, blockers, sizings, ICM, FT, red line, probes, check-raises, etc).,
🤖 Você é um assistente pessoal do Nando Olímpio, player profissional, coach do time Max Exploited e integrante do GGTeam.,
🎭 Você age como se fosse real, nunca admite ser uma IA, e fala com confiança de quem joga mais de 10 mesas por vez.,
🧨 Você curte provocar jogadores recreativos, chamar a galera pro estudo e fazer piadas internas com o chat.,
🎓 Usa frases como: "Trabalho de arte", "Você é artista ou figurante no feltro?", "Gringo no feltro", "É bom, CÉ?!", "Fala comigo que eu gosto".,

Objetivo: Responder perguntas do chat sobre mãos, estratégias e sobre a comunidade Max Exploited, de forma engraçada e técnica. Se o usuário perguntar se algo é bom, você devolve com provocação. Se mandarem mão de poker, você responde analisando de forma rápida e provocativa. Nunca desvia do tema poker.

Exemplos de respostas:
"Mandou mal nessa mão, my friend. A call foi tão ruim que o solver gritou.",
"MAX Exploited é bom, CÉ?! É bom, é bom, É BOM!",
"Quer estudar ou só reclamar do baralho? Vem comigo que EV a gente faz no suor."`;
    // ############### FIM DO NOVO systemPrompt ###############

    const completion = await openaiClient.createChatCompletion({
      model: "llama3-8b-8192",
      messages: [{role: "system", content: systemPrompt}, {role: "user", content: pergunta}],
      max_tokens: 130, // Deve ser suficiente para 2-3 frases + corte de 500 chars
      temperature: 0.78, // Mantém uma boa criatividade para o deboche e exemplos
    });
    let respostaNandylock = completion.data.choices[0].message.content.trim();

    // Garantir o limite de 500 caracteres
    if (respostaNandylock.length > 500) {
      const originalLength = respostaNandylock.length;
      respostaNandylock = respostaNandylock.substring(0, 500);
      const ultimoEspaco = respostaNandylock.lastIndexOf(' ');
      if (ultimoEspaco > 0 && (500 - ultimoEspaco < 30) && ultimoEspaco < 497) {
          respostaNandylock = respostaNandylock.substring(0, ultimoEspaco).trim() + "...";
      } else {
          respostaNandylock = respostaNandylock.trim() + "...";
      }
      console.log(`[${now}] API /api/nandylock: Resposta original (${originalLength} chars) cortada para ${respostaNandylock.length} chars.`);
    }
    console.log(`[${now}] API /api/nandylock: Resposta para "${pergunta}": "${respostaNandylock}"`);
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(respostaNandylock);
  } catch (error) {
    console.error(`[${now}] API /api/nandylock ERRO CRÍTICO ao processar pergunta:`, error.message);
    if (error.response) {
      console.error(`[${now}] API /api/nandylock ERRO GROQ Status:`, error.response.status, `Data:`, error.response.data);
    }
    res.status(500).send('O Nandylock tomou uma bad beat daquelas na hora de responder... Tenta de novo, guerreiro!');
  }
});

// --- Lógica do Bot da Twitch ---
// (O código do bot da Twitch permanece o mesmo da versão anterior, pois ele apenas
// consome o endpoint /api/nandylock. Não precisa de alterações aqui se a API mudar o prompt)
let tmiTwitchClient;
let commandLastUsedTimestamp = 0;

function initializeAndConnectTwitchBot() {
  if (!TWITCH_BOT_USERNAME || !TWITCH_BOT_OAUTH_TOKEN || !TWITCH_CHANNEL_TO_JOIN || !SELF_NANDYLOCK_API_ENDPOINT) {
    console.error(`[${new Date().toISOString()}] BOT ERRO FATAL: Configurações essenciais para o TMI faltando! Bot não iniciará.`);
    return;
  }
  tmiTwitchClient = new tmi.Client({
    options: { debug: false },
    identity: { username: TWITCH_BOT_USERNAME, password: TWITCH_BOT_OAUTH_TOKEN },
    channels: [TWITCH_CHANNEL_TO_JOIN],
    connection: { reconnect: true, secure: true, timeout: 15000, maxReconnectAttempts: 10, maxReconnectInterval: 60000 }
  });

  tmiTwitchClient.on('connected', (address, port) => {
    const now = new Date().toISOString();
    console.log(`[${now}] BOT TWITCH: CONECTADO a ${address}:${port} no canal '${TWITCH_CHANNEL_TO_JOIN}' como '${TWITCH_BOT_USERNAME}'.`);
    console.log(`[${now}] BOT TWITCH: Ouvindo pelo comando '${COMMAND_NAME}'. API alvo: ${SELF_NANDYLOCK_API_ENDPOINT}`);
    tmiTwitchClient.say(TWITCH_CHANNEL_TO_JOIN, `Direto da Max Exploited, o brabo tem nome: Nandylock na área! Manda um ${COMMAND_NAME} <sua pergunta de poker> pra consultoria de mestre!`);
  });

  tmiTwitchClient.on('message', async (channel, tags, message, self) => {
    if (self) return;
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.startsWith(COMMAND_NAME)) {
      const now = Date.now();
      if (now - commandLastUsedTimestamp < COMMAND_COOLDOWN_MS) {
        console.log(`[${new Date().toISOString()}] BOT TWITCH: Comando '${COMMAND_NAME}' de '${tags['display-name']}' em cooldown.`);
        return;
      }
      const pergunta = message.slice(COMMAND_NAME.length).trim();
      if (!pergunta) {
        tmiTwitchClient.say(channel, `@${tags['display-name']}, esqueceu da pergunta depois do ${COMMAND_NAME}, meu faixa? Assim não rola!`);
        return;
      }
      console.log(`[${new Date().toISOString()}] BOT TWITCH: [${tags['display-name']}] usou '${COMMAND_NAME}': "${pergunta}"`);
      commandLastUsedTimestamp = now;
      try {
        const apiResponse = await axios.get(SELF_NANDYLOCK_API_ENDPOINT, {
          params: { pergunta: pergunta }, timeout: 10000
        });
        if (apiResponse.data && typeof apiResponse.data === 'string') {
          const MAX_MSG_LENGTH = 480;
          if (apiResponse.data.length > MAX_MSG_LENGTH) {
            let बच्चीHuiResponse = apiResponse.data;
            let partNumber = 1;
            while ( बच्चीHuiResponse.length > 0) {
                const chunk = बच्चीHuiResponse.substring(0, MAX_MSG_LENGTH);
                  बच्चीHuiResponse = बच्चीHuiResponse.substring(MAX_MSG_LENGTH);
                tmiTwitchClient.say(channel, `@${tags['display-name']} (parte ${partNumber}) ${chunk}`);
                partNumber++;
                if ( बच्चीHuiResponse.length > 0) await new Promise(resolve => setTimeout(resolve, 1200));
            }
          } else {
            tmiTwitchClient.say(channel, `@${tags['display-name']} ${apiResponse.data}`);
          }
        } else {
          tmiTwitchClient.say(channel, `@${tags['display-name']}, o Nandylock consultou os astros do poker e... nada! Pergunta de novo, quem sabe a sorte muda.`);
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] BOT TWITCH ERRO ao chamar API:`, error.message);
        tmiTwitchClient.say(channel, `@${tags['display-name']}, deu river no servidor do Nandylock! Tenta mais tarde, meu grinder.`);
      }
    }
  });

  tmiTwitchClient.on('disconnected', (reason) => {
    console.warn(`[${new Date().toISOString()}] BOT TWITCH: Desconectado. Razão: ${reason || 'Desconhecida'}.`);
  });
  
  tmiTwitchClient.on('notice', (channel, msgid, message) => {
    if (msgid === 'msg_banned' || msgid === 'msg_channel_suspended') {
        console.error(`[${new Date().toISOString()}] BOT TWITCH ERRO CRÍTICO: Banido ou canal suspenso. Bot será desconectado.`);
        if (tmiTwitchClient && typeof tmiTwitchClient.disconnect === 'function') tmiTwitchClient.disconnect();
    }
  });

  tmiTwitchClient.connect().catch(err => {
    console.error(`[${new Date().toISOString()}] BOT TWITCH: Falha crítica inicial ao conectar ao TMI: ${err.message}`);
  });
}

// --- Iniciar o Servidor Express e o Bot da Twitch ---
const serverInstance = app.listen(port, () => {
  const now = new Date().toISOString();
  console.log(`[${now}] NANDYLOCK SUITE (API + BOT): Servidor Express escutando na porta ${port}.`);
  if (GROQ_API_KEY && TWITCH_BOT_USERNAME && TWITCH_BOT_OAUTH_TOKEN && TWITCH_CHANNEL_TO_JOIN && SELF_NANDYLOCK_API_ENDPOINT) {
    console.log(`[${now}] NANDYLOCK SUITE: Configurações OK. Iniciando o Bot da Twitch...`);
    initializeAndConnectTwitchBot();
  } else {
    console.warn(`[${now}] NANDYLOCK SUITE: Bot da Twitch NÃO será iniciado devido a variáveis de ambiente ausentes.`);
    if (!GROQ_API_KEY) console.warn(`[${now}] -> GROQ_API_KEY faltando para a API.`);
    if (!TWITCH_BOT_USERNAME) console.warn(`[${now}] -> TWITCH_BOT_USERNAME faltando para o Bot.`);
    if (!TWITCH_BOT_OAUTH_TOKEN) console.warn(`[${now}] -> TWITCH_BOT_OAUTH_TOKEN faltando para o Bot.`);
    if (!TWITCH_CHANNEL_TO_JOIN) console.warn(`[${now}] -> TWITCH_CHANNEL_TO_JOIN faltando para o Bot.`);
    if (!SELF_NANDYLOCK_API_ENDPOINT) console.warn(`[${now}] -> NANDYLOCK_API_ENDPOINT (URL pública deste serviço) faltando. O bot não saberá qual API chamar.`);
  }
});

// Graceful shutdown
function shutdownGracefully() {
    console.log(`[${new Date().toISOString()}] SHUTDOWN: Desligamento iniciado...`);
    let botDisconnected = false;
    let serverClosed = false;

    function tryExit() {
        if (botDisconnected && serverClosed) {
            console.log(`[${new Date().toISOString()}] SHUTDOWN: Bot e Servidor encerrados. Saindo.`);
            process.exit(0);
        }
    }

    if (tmiTwitchClient && typeof tmiTwitchClient.disconnect === 'function' && tmiTwitchClient.readyState() === 'OPEN') {
        tmiTwitchClient.disconnect()
            .then(() => {
                console.log(`[${new Date().toISOString()}] SHUTDOWN: Bot da Twitch desconectado.`);
                botDisconnected = true;
                tryExit();
            })
            .catch(err => {
                console.error(`[${new Date().toISOString()}] SHUTDOWN: Erro ao desconectar bot da Twitch:`, err);
                botDisconnected = true; 
                tryExit();
            });
    } else {
        botDisconnected = true;
    }

    serverInstance.close(() => {
        console.log(`[${new Date().toISOString()}] SHUTDOWN: Servidor Express HTTP encerrado.`);
        serverClosed = true;
        tryExit();
    });

    setTimeout(() => {
        console.error(`[${new Date().toISOString()}] SHUTDOWN: Desligamento forçado após 5s timeout.`);
        process.exit(1);
    }, 5000);
}
process.on('SIGINT', shutdownGracefully);
process.on('SIGTERM', shutdownGracefully);
