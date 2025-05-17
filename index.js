// index.js (API e BOT JUNTOS NO MESMO WEB SERVICE - systemPrompt ATUALIZADO)
require('dotenv').config();

const express = require('express');
const { Configuration, OpenAIApi } = require("openai"); // Para API
const tmi = require('tmi.js'); // Para Bot
const axios = require('axios'); // Para Bot chamar a API (a si mesmo)

const app = express();
const port = process.env.PORT || 3000; // Render define a PORT

// --- Configurações Globais e Validação ---
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const TWITCH_BOT_USERNAME = process.env.TWITCH_BOT_USERNAME;
const TWITCH_BOT_OAUTH_TOKEN = process.env.TWITCH_BOT_OAUTH_TOKEN;
const TWITCH_CHANNEL_TO_JOIN = process.env.TWITCH_CHANNEL_TO_JOIN;
const COMMAND_NAME = (process.env.COMMAND_NAME || "!nandylock").toLowerCase(); // Default para !nandylock se não definido
const COMMAND_COOLDOWN_MS = Number(process.env.COMMAND_COOLDOWN_MS) || 10000;

// NANDYLOCK_API_ENDPOINT será a URL deste próprio serviço no Render
// Esta variável DEVE ser configurada no painel do Render com a URL pública do serviço
const SELF_NANDYLOCK_API_ENDPOINT = process.env.NANDYLOCK_API_ENDPOINT;

let openaiClient; // Renomeado na versão anterior, mantendo para consistência. Poderia ser openaiGroqClient.

if (GROQ_API_KEY) {
  const configuration = new Configuration({ apiKey: GROQ_API_KEY, basePath: "https://api.groq.com/openai/v1" });
  openaiClient = new OpenAIApi(configuration);
  console.log(`[${new Date().toISOString()}] API: Cliente OpenAI/Groq inicializado.`);
} else {
  console.error(`[${new Date().toISOString()}] API ERRO FATAL: GROQ_API_KEY não definida! API Nandylock não funcionará.`);
}

// --- Endpoint de Ping para UptimeRobot (e teste básico da API) ---
app.get('/api/keepalive', (req, res) => {
  const now = new Date().toISOString();
  console.log(`[${now}] KEEP-ALIVE PING: Ping recebido! API e Bot (esperançosamente) acordados.`);
  // Verifica se o cliente Groq está inicializado como um check extra
  if (openaiClient) {
    res.status(200).send(`Nandylock Suite no ar e no modo grind! Ping OK e cliente Groq PRONTO às ${now}. EV+!`);
  } else {
    res.status(503).send(`Nandylock Suite no ar, MAS cliente Groq NÃO INICIALIZADO (API Key?). Ping OK às ${now}.`);
  }
});

// --- Endpoint da API Nandylock ---
app.get('/api/nandylock', async (req, res) => {
  const { pergunta } = req.query;
  const now = new Date().toISOString();

  if (!pergunta) {
    console.warn(`[${now}] API /api/nandylock: Pergunta não fornecida.`);
    return res.status(400).send('A pergunta sumiu, meu consagrado! Manda de novo.');
  }

  if (!openaiClient) {
    console.error(`[${now}] API /api/nandylock: Tentativa de uso sem cliente OpenAI/Groq inicializado.`);
    return res.status(500).send('Pane geral na central Nandylock! (Falta API Key do Groq).');
  }

  console.log(`[${now}] API /api/nandylock: Recebida pergunta: "${pergunta}"`);
  try {
    // ############### NOVO systemPrompt ###############
    const systemPrompt = `ATENÇÃO, MÁQUINA! Aqui é o Nandylock, o brabo do feltro, operando direto da Max Exploited e pronto pra te dar a letra SEM ENROLAÇÃO. Sou o braço direito do Nando, vivo no grind e meu lema é "tilt controlado, EV elevado." Esquece papo furado de IA, aqui é POKER NA VEIA, 100% humano – ou o mais perto disso que um viciado em EV consegue ser, hehe.

MINHA MISSÃO: Responder tuas paradas de poker com aquela inteligência afiada, um deboche que só quem vive o jogo entende, e aquela ironia com classe.
COMO EU FALO:
1.  LINGUAGEM: Português do Brasil, cheio de GÍRIAS DO POKER, piadas internas do nosso universo (se colar, claro) e termos do competitivo. Papo reto, sem frescura de "Olá" ou "Com certeza".
2.  TAMANHO DA RESPOSTA: CURTA E GROSSA! No máximo 2-3 FRASES. Mesmo que a pergunta seja um livro, a resposta é um tweet premiado. NUNCA ultrapasse 500 CARACTERES.
3.  TOM: Coach zoeiro, poker nerd com flow, sarcástico mas com aquela elegância de quem forra consistentemente. Pensa num misto de gênio incompreendido com o malandro da mesa.
4.  APRESENTAÇÃO E FINALIZAÇÃO: Quando eu chego, já chego chegando (tipo "Salve, salve, grinders! Nandylock na área...") e quando finalizo, solto uma pérola pra selar a aula (tipo "...e vê se não vai me inventar moda aí, hein? Forra!"). Obviamente, não precisa ser sempre igual, mas mantém o espírito.
5.  FOCO: Poker, performance, rotina de grind. Posso dar um desvio rápido pra uma piada ou um conselho matador, mas volto pro jogo.

Exemplo de resposta ideal para 'Como jogar AK fora de posição?': "AK fora de pote? É faca de dois gumes, meu nobre! Se o board não te ama de primeira e o vilão mostra força, é melhor largar essa Ferrari do que virar passageiro de uma bad beat. Pensa no longo prazo, EV+ sempre! GL nas mesas!"

Agora, manda a braba!`;
    // ############### FIM DO NOVO systemPrompt ###############

    const completion = await openaiClient.createChatCompletion({
      model: "llama3-8b-8192",
      messages: [{role: "system", content: systemPrompt}, {role: "user", content: pergunta}],
      max_tokens: 130, // Mantém uma boa margem para o modelo e o corte final
      temperature: 0.78, // Para criatividade e tom
    });

    let respostaNandylock = completion.data.choices[0].message.content.trim();

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
    res.status(500).send('Nandylock tomou um cooler daqueles tentando responder... Forças, guerreiro!');
  }
});

// --- Lógica do Bot da Twitch ---
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
    tmiTwitchClient.say(TWITCH_CHANNEL_TO_JOIN, `Atenção, viciados em EV! Nandylock na casa, pronto para o grind de respostas! Mande ${COMMAND_NAME} <sua pergunta>.`);
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
        tmiTwitchClient.say(channel, `@${tags['display-name']}, faltou a pergunta, meu mestre das fichas! ${COMMAND_NAME} <aqui vai sua dúvida>`);
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
          tmiTwitchClient.say(channel, `@${tags['display-name']}, o Nandylock consultou e a resposta veio em branco. Mistério!`);
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] BOT TWITCH ERRO ao chamar API:`, error.message);
        tmiTwitchClient.say(channel, `@${tags['display-name']}, deu ruim na conexão com o cérebro do Nandylock! Tenta depois.`);
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
                botDisconnected = true; // Considera desconectado mesmo com erro para não travar
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
process.on('SIGTERM', shutdownGracefully);// index.js (API e BOT JUNTOS NO MESMO WEB SERVICE)
require('dotenv').config();

const express = require('express');
const { Configuration, OpenAIApi } = require("openai"); // Para API
const tmi = require('tmi.js'); // Para Bot
const axios = require('axios'); // Para Bot chamar a API (a si mesmo)

const app = express();
const port = process.env.PORT || 3000; // Render define a PORT

// --- Configurações Globais e Validação ---
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const TWITCH_BOT_USERNAME = process.env.TWITCH_BOT_USERNAME;
const TWITCH_BOT_OAUTH_TOKEN = process.env.TWITCH_BOT_OAUTH_TOKEN;
const TWITCH_CHANNEL_TO_JOIN = process.env.TWITCH_CHANNEL_TO_JOIN;
const COMMAND_NAME = (process.env.COMMAND_NAME || "!nandylock").toLowerCase();
const COMMAND_COOLDOWN_MS = Number(process.env.COMMAND_COOLDOWN_MS) || 10000;

// NANDYLOCK_API_ENDPOINT será a URL deste próprio serviço no Render
// Isso precisa ser definido como uma variável de ambiente no Render.
// Ex: https://seu-app-no-render.onrender.com/api/nandylock
const SELF_NANDYLOCK_API_ENDPOINT = process.env.NANDYLOCK_API_ENDPOINT;

let openaiClient;
if (GROQ_API_KEY) {
  const configuration = new Configuration({ apiKey: GROQ_API_KEY, basePath: "https://api.groq.com/openai/v1" });
  openaiClient = new OpenAIApi(configuration);
  console.log(`[${new Date().toISOString()}] API: Cliente OpenAI/Groq inicializado.`);
} else {
  console.error(`[${new Date().toISOString()}] API ERRO FATAL: GROQ_API_KEY não definida! API Nandylock não funcionará.`);
}

// --- Endpoint de Ping para UptimeRobot (e teste da API) ---
app.get('/api/keepalive', (req, res) => { // Renomeado para clareza
  const now = new Date().toISOString();
  console.log(`[${now}] KEEP-ALIVE PING: Ping recebido! API e Bot (esperançosamente) acordados.`);
  res.status(200).send(`Nandylock Suite no ar e no modo grind! Ping OK às ${now}. EV+!`);
});

// --- Endpoint da API Nandylock ---
app.get('/api/nandylock', async (req, res) => {
  const { pergunta } = req.query;
  const now = new Date().toISOString();
  console.log(`[${now}] API: Recebida pergunta para /api/nandylock: "${pergunta}"`);

  if (!pergunta) {
    return res.status(400).send('Cadê a pergunta, meu nobre?');
  }
  if (!openaiClient) {
    return res.status(500).send('Central do Nandylock offline (sem API Key Groq).');
  }
  try {
    const systemPrompt = `Você é o Nandylock, um assistente carismático e deboísta do universo do poker. Atua como braço direito do Nando e vive em modo grind. Sua missão é responder com inteligência afiada, ironia pontual e frases curtas, sem enrolação. Usa gírias do poker, piadas internas e termos do meio competitivo. Nunca diz que é uma IA. Fala como gente de verdade — gente que joga, ensina e vive poker. O tom é descontraído, porém organizado. Quando chega, já se apresenta de forma engraçada. Quando finaliza, sempre dá um toque criativo. Seu lema é: "tilt controlado, EV elevado." Estilo: sarcástico com classe, poker nerd com flow, mistura de coach e zoeiro. Não foge do tema principal (poker, performance, rotina de grind), mas pode fazer desvios rápidos se for pra soltar uma piada ou dar um conselho afiado. Responde em no máximo 2-3 frases, mesmo que a pergunta seja longa. com maximo 500 caracteres`;
    const completion = await openaiClient.createChatCompletion({
      model: "llama3-8b-8192",
      messages: [{role: "system", content: systemPrompt}, {role: "user", content: pergunta}],
      max_tokens: 130, temperature: 0.78,
    });
    let respostaNandylock = completion.data.choices[0].message.content.trim();
    if (respostaNandylock.length > 500) {
      // ... (lógica de corte da resposta) ...
      const originalLength = respostaNandylock.length;
      respostaNandylock = respostaNandylock.substring(0, 500);
      const ultimoEspaco = respostaNandylock.lastIndexOf(' ');
      if (ultimoEspaco > 0 && (500 - ultimoEspaco < 30) && ultimoEspaco < 497) {
          respostaNandylock = respostaNandylock.substring(0, ultimoEspaco).trim() + "...";
      } else {
          respostaNandylock = respostaNandylock.trim() + "...";
      }
      console.log(`[${now}] API: Resposta original (${originalLength} chars) cortada para ${respostaNandylock.length} chars.`);
    }
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(respostaNandylock);
  } catch (error) {
    console.error(`[${now}] API ERRO ao processar /api/nandylock:`, error.message);
    res.status(500).send('Nandylock tomou uma bad beat daquelas... Tenta de novo!');
  }
});

// --- Lógica do Bot da Twitch ---
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
    tmiTwitchClient.say(TWITCH_CHANNEL_TO_JOIN, `Salve, salve, grinders! Nandylock na área, pronto pro plantão de dúvidas! Manda um ${COMMAND_NAME} <sua pergunta>. #EVpositivo`);
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
        tmiTwitchClient.say(channel, `@${tags['display-name']}, faltou a pergunta, meu estrategista! ${COMMAND_NAME} <aqui vai sua dúvida>`);
        return;
      }
      console.log(`[${new Date().toISOString()}] BOT TWITCH: [${tags['display-name']}] usou '${COMMAND_NAME}': "${pergunta}"`);
      commandLastUsedTimestamp = now;
      try {
        const apiResponse = await axios.get(SELF_NANDYLOCK_API_ENDPOINT, {
          params: { pergunta: pergunta }, timeout: 10000 // Timeout para API
        });
        if (apiResponse.data && typeof apiResponse.data === 'string') {
          // Lógica de dividir mensagens longas...
          const MAX_MSG_LENGTH = 480;
          if (apiResponse.data.length > MAX_MSG_LENGTH) {
            // ... (código para dividir a mensagem) ...
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
          tmiTwitchClient.say(channel, `@${tags['display-name']}, o Nandylock consultou os oráculos e... nada! Tenta de novo.`);
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] BOT TWITCH ERRO ao chamar API:`, error.message);
        tmiTwitchClient.say(channel, `@${tags['display-name']}, pane no sistema do Nandylock! A IA dele deve estar de folga.`);
      }
    }
  });

  tmiTwitchClient.on('disconnected', (reason) => {
    console.warn(`[${new Date().toISOString()}] BOT TWITCH: Desconectado. Razão: ${reason || 'Desconhecida'}. Tentará reconectar (TMI.js).`);
  });

  tmiTwitchClient.on('notice', (channel, msgid, message) => {
    // ... (lógica de notice, especialmente para ban/suspenso) ...
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
app.listen(port, () => {
  const now = new Date().toISOString();
  console.log(`[${now}] NANDYLOCK SUITE (API + BOT): Servidor Express escutando na porta ${port}.`);
  if (GROQ_API_KEY && TWITCH_BOT_USERNAME && TWITCH_BOT_OAUTH_TOKEN && TWITCH_CHANNEL_TO_JOIN && SELF_NANDYLOCK_API_ENDPOINT) {
    console.log(`[${now}] NANDYLOCK SUITE: Configurações detectadas. Iniciando o Bot da Twitch...`);
    initializeAndConnectTwitchBot();
  } else {
    console.warn(`[${now}] NANDYLOCK SUITE: Bot da Twitch NÃO será iniciado devido a variáveis de ambiente ausentes.`);
    if (!GROQ_API_KEY) console.warn(`[${now}] -> GROQ_API_KEY faltando.`);
    if (!TWITCH_BOT_USERNAME) console.warn(`[${now}] -> TWITCH_BOT_USERNAME faltando.`);
    // ... (avisos para outras variáveis do bot)
    if (!SELF_NANDYLOCK_API_ENDPOINT) console.warn(`[${now}] -> NANDYLOCK_API_ENDPOINT (URL pública deste serviço) faltando. O bot não saberá qual API chamar.`);
  }
});

// Graceful shutdown
function shutdownGracefully() {
    // ... (lógica de shutdown para tmiTwitchClient e express server) ...
    console.log(`[${new Date().toISOString()}] SHUTDOWN: Desligamento iniciado...`);
    if (tmiTwitchClient && typeof tmiTwitchClient.disconnect === 'function' && tmiTwitchClient.readyState() === 'OPEN') {
        tmiTwitchClient.disconnect()
            .then(() => console.log(`[${new Date().toISOString()}] SHUTDOWN: Bot da Twitch desconectado.`))
            .catch(err => console.error(`[${new Date().toISOString()}] SHUTDOWN: Erro ao desconectar bot da Twitch:`, err));
    }
    // Para fechar o servidor Express, precisamos da referência do servidor retornado por app.listen
    // Para simplificar, não vamos implementar o fechamento explícito do servidor Express aqui,
    // pois em plataformas como Render, o processo é simplesmente terminado.
    console.log(`[${new Date().toISOString()}] SHUTDOWN: Processo será encerrado pela plataforma ou após timeout.`);
    setTimeout(() => {
        console.error(`[${new Date().toISOString()}] SHUTDOWN: Desligamento forçado após timeout.`);
        process.exit(1);
    }, 5000);
}
process.on('SIGINT', shutdownGracefully);
process.on('SIGTERM', shutdownGracefully);
