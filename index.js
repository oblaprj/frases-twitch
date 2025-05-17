// index.js (API e BOT JUNTOS NO MESMO WEB SERVICE - Corrigido e Personalidade Mantida)
require('dotenv').config();

const express = require('express'); // Declarado UMA VEZ AQUI
const { Configuration, OpenAIApi } = require("openai"); // Para API
const tmi = require('tmi.js'); // Para Bot
const axios = require('axios'); // Para Bot chamar a API

const app = express(); // Instância do Express criada UMA VEZ AQUI
const port = process.env.PORT || 3000; // Render define a PORT

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

// --- Endpoint de Ping para UptimeRobot (e teste básico da API) ---
app.get('/api/keepalive', (req, res) => {
  const now = new Date().toISOString();
  console.log(`[${now}] KEEP-ALIVE PING: Ping recebido!`);
  if (openaiClient) {
    res.status(200).send(`Nandylock Suite no ar e no modo grind! Ping OK e cliente Groq PRONTO às ${now}. EV+!`);
  } else {
    res.status(503).send(`Nandylock Suite no ar, MAS cliente Groq NÃO INICIALIZADO (API Key?). Ping OK às ${now}.`);
  }
});

// --- Endpoint da API Nandylock (CORRIGIDO) ---
app.get('/api/nandylock', async (req, res) => {
  // Extrair e sanitizar o parâmetro pergunta
  let pergunta = req.query.pergunta || "";
  const now = new Date().toISOString();

  // Sanitização da pergunta para remover prefixos indesejados
  if (typeof pergunta === 'string') {
    // Remover "pergunta=" se estiver presente no início da string
    if (pergunta.startsWith("pergunta=")) {
      pergunta = pergunta.substring(9); // Remove os primeiros 9 caracteres ("pergunta=")
    }
    
    // Remover metadados JSON que possam estar no início da string
    const jsonPrefixMatch = pergunta.match(/^\s*\{.*?\}\s*/);
    if (jsonPrefixMatch) {
      pergunta = pergunta.substring(jsonPrefixMatch[0].length);
    }
    
    // Remover espaços extras no início e fim
    pergunta = pergunta.trim();
  }

  if (!pergunta) {
    console.warn(`[${now}] API /api/nandylock: Pergunta não fornecida ou vazia após sanitização.`);
    return res.status(400).send('A pergunta sumiu, meu consagrado! Manda de novo.');
  }
  if (!openaiClient) {
    console.error(`[${now}] API /api/nandylock: Tentativa de uso sem cliente OpenAI/Groq inicializado.`);
    return res.status(500).send('Pane geral na central Nandylock! (Falta API Key do Groq).');
  }
  console.log(`[${now}] API /api/nandylock: Recebida pergunta (após sanitização): "${pergunta}"`);
  try {
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

    const completion = await openaiClient.createChatCompletion({
      model: "llama3-8b-8192",
      messages: [{role: "system", content: systemPrompt}, {role: "user", content: pergunta}],
      max_tokens: 130,
      temperature: 0.78,
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
