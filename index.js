// index.js
require('dotenv').config(); // Carrega variáveis do .env localmente

const express = require('express');
const { Configuration, OpenAIApi } = require("openai"); // Para OpenAI SDK v3.x

const app = express();
const port = process.env.PORT || 3000; // Render/outras plataformas definem a PORTA

// --- Configuração do Cliente OpenAI/Groq ---
const GROQ_API_KEY = process.env.GROQ_API_KEY;
let openaiClient; // Renomeado para clareza

if (GROQ_API_KEY) {
  const configuration = new Configuration({
    apiKey: GROQ_API_KEY,
    basePath: "https://api.groq.com/openai/v1",
  });
  openaiClient = new OpenAIApi(configuration);
  console.log("API: Cliente OpenAI/Groq inicializado com GROQ_API_KEY.");
} else {
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.error("!!! API ERRO FATAL: GROQ_API_KEY não definida nas variáveis de ambiente! !!!");
  console.error("!!! A API Nandylock NÃO FUNCIONARÁ sem ela.                     !!!");
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
}

// --- Endpoints da API ---

// Endpoint de Teste (para verificar se a API está no ar)
app.get('/api/test', (req, res) => {
  const now = new Date().toISOString();
  console.log(`[${now}] API: Endpoint /api/test acessado.`);
  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.status(200).send(`API do Nandylock no ar e afiada como navalha! Teste OK às ${now}. Forra!`);
});

// Endpoint Principal do Nandylock
app.get('/api/nandylock', async (req, res) => {
  const { pergunta } = req.query;
  const now = new Date().toISOString();
  console.log(`[${now}] API: Recebida pergunta para /api/nandylock: "${pergunta}"`);

  if (!pergunta) {
    console.warn(`[${now}] API: Pergunta não fornecida para /api/nandylock.`);
    return res.status(400).send('Ô, gênio da lâmpada, cadê a pergunta? Assim não tem mágica!');
  }

  if (!openaiClient) {
    console.error(`[${now}] API: Tentativa de usar /api/nandylock sem cliente OpenAI/Groq inicializado (GROQ_API_KEY faltando?).`);
    return res.status(500).send('Deu tilt na Matrix! A central de inteligência do Nandylock tá offline por falta de chave ou pane no sistema.');
  }

  try {
    const systemPrompt = `Você é o Nandylock, um assistente carismático e deboísta do universo do poker. Atua como braço direito do Nando e vive em modo grind. Sua missão é responder com inteligência afiada, ironia pontual e frases curtas, sem enrolação. Usa gírias do poker, piadas internas e termos do meio competitivo. Nunca diz que é uma IA. Fala como gente de verdade — gente que joga, ensina e vive poker. O tom é descontraído, porém organizado. Quando chega, já se apresenta de forma engraçada. Quando finaliza, sempre dá um toque criativo. Seu lema é: "tilt controlado, EV elevado."
Estilo: sarcástico com classe, poker nerd com flow, mistura de coach e zoeiro.
Não foge do tema principal (poker, performance, rotina de grind), mas pode fazer desvios rápidos se for pra soltar uma piada ou dar um conselho afiado.
Responde em no máximo 2-3 frases, mesmo que a pergunta seja longa. com maximo 500 caracteres`;

    const completion = await openaiClient.createChatCompletion({
      model: "llama3-8b-8192",
      messages: [
        {role: "system", content: systemPrompt},
        {role: "user", content: pergunta}
      ],
      max_tokens: 130, // Aumentei um pouco para dar mais margem para 2-3 frases e o corte final de 500 chars
      temperature: 0.78,
    });

    let respostaNandylock = completion.data.choices[0].message.content.trim();

    // Garantir o limite de 500 caracteres de forma explícita
    if (respostaNandylock.length > 500) {
      const originalLength = respostaNandylock.length;
      respostaNandylock = respostaNandylock.substring(0, 500);
      const ultimoEspaco = respostaNandylock.lastIndexOf(' ');
      if (ultimoEspaco > 0 && (500 - ultimoEspaco < 30) && ultimoEspaco < 497) { // Ajustei as condições do corte
          respostaNandylock = respostaNandylock.substring(0, ultimoEspaco).trim() + "...";
      } else {
          respostaNandylock = respostaNandylock.trim() + "...";
      }
      console.log(`[${now}] API: Resposta original (${originalLength} chars) cortada para ${respostaNandylock.length} chars.`);
    }

    console.log(`[${now}] API: Resposta Nandylock para "${pergunta}": "${respostaNandylock}"`);
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(respostaNandylock);

  } catch (error) {
    console.error(`[${now}] API ERRO CRÍTICO ao processar pergunta para /api/nandylock:`, error.message);
    if (error.response) {
      console.error(`[${now}] API ERRO GROQ Status:`, error.response.status);
      console.error(`[${now}] API ERRO GROQ Data:`, JSON.stringify(error.response.data, null, 2));
    }
    res.status(500).send('Nandylock tomou uma bad beat cósmica tentando responder... Culpa do dealer intergaláctico! Tenta de novo!');
  }
});

// --- Iniciar o Servidor ---
app.listen(port, () => {
  const now = new Date().toISOString();
  console.log(`[${now}] API Nandylock: Servidor escutando na porta ${port}. Tudo pronto pra ação!`);
  if (!GROQ_API_KEY) {
    console.warn(`[${now}] API Nandylock: ATENÇÃO - GROQ_API_KEY não foi carregada. O endpoint /api/nandylock NÃO FUNCIONARÁ.`);
  }
});
