require('dotenv').config(); // Certifique-se de ter o dotenv instalado e um arquivo .env com GROQ_API_KEY
const express = require('express');
const axios = require('axios');
const { Configuration, OpenAIApi } = require("openai"); // Para OpenAI SDK v3.x

const app = express();
const port = process.env.PORT || 3000;

// ENDPOINT DE TESTE
app.get('/api/test', (req, res) => {
  console.log("Endpoint de teste /api/test acessado!");
  const respostasTest = [
    "Opa, tamo na área! Servidor do Nandylock funcionando e pronto pro HU!",
    "Aqui é Max Exploited, my friend! Teste OK, pode mandar a próxima bomba!",
    "Check, check... 1, 2... Som! Servidor online e afiado. GL pra nós!",
    "Tudo nos conformes por aqui! Se o servidor fosse uma mão, seria AA no pré-flop. Testado e aprovado!",
    "Recebido e entendido, câmbio! Nandylock na escuta e servidor tinindo!"
  ];
  const respostaAleatoria = respostasTest[Math.floor(Math.random() * respostasTest.length)];
  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.status(200).send(respostaAleatoria);
});

// Endpoint original para frases aleatórias de poker
app.get('/api/frase-poker', async (req, res) => {
  try {
    const response = await axios.get('https://pastebin.com/raw/8vdkLjuh');
    const frases = response.data.split('\n').filter(frase => frase.trim() !== '');
    const fraseAleatoria = frases[Math.floor(Math.random() * frases.length)];
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(fraseAleatoria);
  } catch (error) {
    console.error('Erro ao buscar frase de poker:', error);
    res.status(500).send('Deu ruim na busca da frase de poker, meu chapa.');
  }
});

// Novo endpoint para o Nandylock usando Groq
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.error("GROQ_API_KEY não está definida nas variáveis de ambiente! O endpoint Nandylock pode não funcionar.");
}

let openai;
if (GROQ_API_KEY) {
  const configuration = new Configuration({
    apiKey: GROQ_API_KEY,
    basePath: "https://api.groq.com/openai/v1",
  });
  openai = new OpenAIApi(configuration);
}

app.get('/api/nandylock', async (req, res) => {
  const pergunta = req.query.pergunta;

  if (!pergunta) {
    return res.status(400).send('Aí não, né, parça? Cadê a pergunta? Manda a braba!');
  }

  if (!GROQ_API_KEY || !openai) {
    console.error('Tentativa de usar /api/nandylock sem GROQ_API_KEY configurada ou falha na inicialização do cliente.');
    return res.status(500).send('Ih, deu ruim na configuração aqui nos bastidores. Chama o técnico (ou verifica a GROQ_API_KEY)!');
  }

  try {
    // PERSONALIDADE NANDYLOCK (FORNECIDA PELO USUÁRIO)
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
      max_tokens: 120, // Continua útil para guiar o modelo a ser breve inicialmente
      temperature: 0.78,
    });

    let respostaNandylock = completion.data.choices[0].message.content.trim();

    // Garantir o limite de 500 caracteres de forma explícita (mesmo que o prompt já peça)
    if (respostaNandylock.length > 500) {
      respostaNandylock = respostaNandylock.substring(0, 500);
      const ultimoEspaco = respostaNandylock.lastIndexOf(' ');
      if (ultimoEspaco > 0 && (500 - ultimoEspaco < 25) && ultimoEspaco < 495) {
          respostaNandylock = respostaNandylock.substring(0, ultimoEspaco).trim() + "...";
      } else {
          respostaNandylock = respostaNandylock.trim() + "...";
      }
    }

    console.log(`[NANDYLOCK RESPONSE] Original Length: ${completion.data.choices[0].message.content.trim().length}, Final Length: ${respostaNandylock.length}, Response: ${respostaNandylock}`);

    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(respostaNandylock);

  } catch (error) {
    console.error('--- ERRO AO PROCESSAR PERGUNTA NANDYLOCK (GROQ) ---');
    let errorDetails = 'Erro desconhecido ao falar com o Nandylock.';
    if (error.response) {
      console.error('Erro Groq Status:', error.response.status);
      console.error('Erro Groq Data:', JSON.stringify(error.response.data, null, 2));
      const groqErrorMessage = error.response.data?.error?.message || JSON.stringify(error.response.data);
      errorDetails = `Erro ${error.response.status} do servidor do Nandylock. Detalhe: ${groqErrorMessage}`;
    } else if (error.request) {
      console.error('Erro Groq Request:', error.request);
      errorDetails = 'Não rolou comunicação com o servidor do Nandylock. Confere a internet ou se o serviço tá no ar.';
    } else {
      console.error('Erro Groq Mensagem Geral:', error.message);
      errorDetails = error.message;
    }
    console.error('--- FIM ERRO NANDYLOCK (GROQ) ---');
    res.status(500).send(`Deu tilt aqui na central do Nandylock, my friend! ${errorDetails.substring(0,250)}`);
  }
});

app.listen(port, () => {
  console.log(`Servidor do Nandylock na escuta na porta ${port}. Vai que é tua!`);
  console.log(`Para um teste rápido, acesse: http://localhost:${port}/api/test`);
  if (!GROQ_API_KEY) {
    console.warn("###################################################################################");
    console.warn("### ATENÇÃO, CAMPEÃO(Ã)!!! A GROQ_API_KEY NÃO FOI DEFINIDA NAS VARIÁVEIS DE AMBIENTE! ###");
    console.warn("### SEM ELA, O NANDYLOCK VAI FICAR MAIS MUDO QUE PEIXE FORA D'ÁGUA. CONFIRMA AÍ! ###");
    console.warn("###################################################################################");
  } else {
    console.log("GROQ_API_KEY detectada. Nandylock tá afiado, chipado e pronto pra dar as cartas (e as dicas)! FORRA!");
  }
});
