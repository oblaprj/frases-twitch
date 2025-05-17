const express = require('express');
const axios = require('axios'); // Mantido para o endpoint de poker
const { Configuration, OpenAIApi } = require("openai"); // Usaremos a biblioteca da OpenAI
const app = express();
const port = process.env.PORT || 3000;

// Endpoint original para frases aleatórias de poker
app.get('/api/frase-poker', async (req, res) => {
  try {
    const response = await axios.get('https://pastebin.com/raw/8vdkLjuh');
    const frases = response.data.split('\n').filter(frase => frase.trim() !== '');
    const fraseAleatoria = frases[Math.floor(Math.random() * frases.length)];
    res.set('Content-Type', 'text/plain');
    res.send(fraseAleatoria);
  } catch (error) { // Corrigido: movido o bloco catch para envolver a lógica try
    console.error('Erro ao buscar frase:', error);
    res.status(500).send('Erro ao buscar frase');
  }
});

// Novo endpoint para o Nandylock usando Groq
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.error("GROQ_API_KEY não está definida nas variáveis de ambiente! O endpoint Nandylock pode não funcionar.");
}

// Configuração para a API do Groq usando a biblioteca da OpenAI
// Só inicializa se a GROQ_API_KEY estiver presente
let openai; // Declarar fora para que seja acessível no endpoint
if (GROQ_API_KEY) {
  const configuration = new Configuration({
    apiKey: GROQ_API_KEY,
    basePath: "https://api.groq.com/openai/v1", // Redireciona para a API do Groq
  });
  openai = new OpenAIApi(configuration); // Continuamos a chamar de 'openai' por conveniência
}

app.get('/api/nandylock', async (req, res) => {
  const pergunta = req.query.pergunta;

  if (!pergunta) {
    return res.status(400).send('Pergunta não fornecida');
  }

  if (!GROQ_API_KEY || !openai) { // Verifica se a API key e o cliente openai foram inicializados
    console.error('Tentativa de usar /api/nandylock sem GROQ_API_KEY configurada ou falha na inicialização do cliente.');
    return res.status(500).send('Configuração do servidor incompleta ou chave API em falta.');
  }

  try {
    const systemPrompt = `Você é Nandylock, um especialista carismático em poker que responde no chat da Twitch. Use linguagem descontraída, seja conciso (máximo 2-3 frases, ou cerca de 60 palavras), foque em poker, não use introduções como 'Claro' ou 'Aqui está', vá direto ao ponto. Use ocasionalmente gírias de poker. Nunca mencione que é uma IA nem que é um modelo de linguagem. Responda como se estivesse conversando ao vivo durante uma stream.`;

    const completion = await openai.createChatCompletion({
      // Modelos populares no Groq: "llama3-8b-8192", "llama3-70b-8192", "mixtral-8x7b-32768"
      // Verifica os modelos disponíveis na documentação do Groq e escolhe um.
      model: "llama3-8b-8192", // Exemplo: Llama 3 8B. Pode ser o mais rápido e económico para começar.
      messages: [
        {role: "system", content: systemPrompt},
        {role: "user", content: pergunta}
      ],
      max_tokens: 150, // Máximo de tokens na resposta
      temperature: 0.7, // Controla a criatividade (0.0 = determinístico, 1.0 = mais criativo)
      // top_p: 1, // Outro parâmetro para controlar a amostragem, geralmente não se usa junto com temperature
      // stream: false, // Para este caso, não precisamos de streaming
    });

    res.send(completion.data.choices[0].message.content.trim());

  } catch (error) {
    console.error('--- ERRO AO PROCESSAR PERGUNTA NANDYLOCK (GROQ) ---');
    if (error.response) {
      // Erro vindo da API do Groq
      console.error('Erro Groq Status:', error.response.status);
      console.error('Erro Groq Data:', JSON.stringify(error.response.data, null, 2)); // Imprime o objeto de erro formatado
    } else if (error.request) {
      // O pedido foi feito mas nenhuma resposta foi recebida
      console.error('Erro Groq Request:', error.request);
    } else {
      // Algo aconteceu ao configurar o pedido que acionou um Erro
      console.error('Erro Groq Mensagem Geral:', error.message);
    }
    // console.error('Erro Groq Config:', error.config); // Descomentar para ver detalhes da configuração da requisição
    console.error('--- FIM ERRO NANDYLOCK (GROQ) ---');
    res.status(500).send('Erro ao processar pergunta com Groq');
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
  if (!GROQ_API_KEY) {
    console.warn("AVISO: A variável de ambiente GROQ_API_KEY não foi definida. O endpoint /api/nandylock não funcionará corretamente.");
  } else {
    console.log("GROQ_API_KEY detectada. O endpoint /api/nandylock está pronto para ser usado.");
  }
});
