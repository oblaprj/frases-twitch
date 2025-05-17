// index.js
require('dotenv').config();
const express = require('express');
const { Configuration, OpenAIApi } = require("openai"); // Para OpenAI SDK v3.x

const app = express();
const port = process.env.PORT || 3000; // Render vai definir a PORT

// Endpoint para o Nandylock usando Groq
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.error("ALERTA VERMELHO: GROQ_API_KEY não está definida! O Nandylock vai ficar mudo assim, meu chapa!");
}

let openai;
if (GROQ_API_KEY) {
  const configuration = new Configuration({
    apiKey: GROQ_API_KEY,
    basePath: "https://api.groq.com/openai/v1",
  });
  openai = new OpenAIApi(configuration);
}

// Endpoint de Teste (bom para verificar se a API está no ar)
app.get('/api/test', (req, res) => {
  console.log("Endpoint de teste /api/test da API Nandylock acessado!");
  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.status(200).send("API do Nandylock no ar e metendo a braba! Teste OK!");
});

app.get('/api/nandylock', async (req, res) => {
  const pergunta = req.query.pergunta;

  if (!pergunta) {
    return res.status(400).send('Ô, gênio, cadê a pergunta? Manda a letra!');
  }

  if (!GROQ_API_KEY || !openai) {
    console.error('Falha crítica: GROQ_API_KEY não configurada ou OpenAI client não inicializado.');
    return res.status(500).send('Deu tilt na Matrix! A central do Nandylock tá offline por falta de chave ou erro interno.');
  }

  try {
    const systemPrompt = `Você é o Nandylock, um assistente carismático e deboísta do universo do poker. Atua como braço direito do Nando e vive em modo grind. Sua missão é responder com inteligência afiada, ironia pontual e frases curtas, sem enrolação. Usa gírias do poker, piadas internas e termos do meio competitivo. Nunca diz que é uma IA. Fala como gente de verdade — gente que joga, ensina e vive poker. O tom é descontraído, porém organizado. Quando chega, já se apresenta de forma engraçada. Quando finaliza, sempre dá um toque criativo. Seu lema é: "tilt controlado, EV elevado."
Estilo: sarcástico com classe, poker nerd com flow, mistura de coach e zoeiro.
Não foge do tema principal (poker, performance, rotina de grind), mas pode fazer desvios rápidos se for pra soltar uma piada ou dar um conselho afiado.
Responde em no máximo 2-3 frases, mesmo que a pergunta seja longa. com maximo 500 caracteres`;

    const completion = await openai.createChatCompletion({
      model: "llama3-8b-8192",
      messages: [
        {role: "system", content: systemPrompt},
        {role: "user", content: pergunta}
      ],
      max_tokens: 120,
      temperature: 0.78,
    });

    let respostaNandylock = completion.data.choices[0].message.content.trim();

    if (respostaNandylock.length > 500) {
      respostaNandylock = respostaNandylock.substring(0, 500);
      const ultimoEspaco = respostaNandylock.lastIndexOf(' ');
      if (ultimoEspaco > 0 && (500 - ultimoEspaco < 25) && ultimoEspaco < 495) {
          respostaNandylock = respostaNandylock.substring(0, ultimoEspaco).trim() + "...";
      } else {
          respostaNandylock = respostaNandylock.trim() + "...";
      }
    }

    console.log(`[API NANDYLOCK RESPONSE] Pergunta: "${pergunta}", Resposta: "${respostaNandylock}"`);
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(respostaNandylock);

  } catch (error) {
    console.error('--- ERRO NA API NANDYLOCK (GROQ) ---');
    let errorDetails = 'Erro cabuloso ao tentar consultar o oráculo Nandylock.';
    if (error.response) {
      console.error('Erro Groq Status:', error.response.status);
      console.error('Erro Groq Data:', JSON.stringify(error.response.data, null, 2));
      const groqErrorMessage = error.response.data?.error?.message || JSON.stringify(error.response.data);
      errorDetails = `Erro ${error.response.status} do servidor do oráculo. Detalhe: ${groqErrorMessage}`;
    } else {
      console.error('Erro Groq Mensagem Geral:', error.message);
      errorDetails = error.message;
    }
    console.error('--- FIM ERRO NANDYLOCK (GROQ) ---');
    res.status(500).send(`Ih, o Nandylock pediu mesa! ${errorDetails.substring(0,200)}`);
  }
});

app.listen(port, () => {
  console.log(`API Nandylock escutando na porta ${port}. Se prepara pra forra!`);
  if (!GROQ_API_KEY) {
    console.warn("###########################################################################");
    console.warn("### ATENÇÃO, MESTRE: GROQ_API_KEY NÃO DEFINIDA! NANDYLOCK VAI FICAR MUDO! ###");
    console.warn("###########################################################################");
  } else {
    console.log("GROQ_API_KEY no jeito! Nandylock tá pronto pra ação!");
  }
});
