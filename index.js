const express = require('express');
const axios = require('axios');
const { Configuration, OpenAIApi } = require("openai");
const app = express();
const port = process.env.PORT || 3000;

// Endpoint original para frases aleatórias de poker
app.get('/api/frase-poker', async (req, res) => {
  try {
    // Buscar conteúdo do Pastebin
    const response = await axios.get('https://pastebin.com/raw/8vdkLjuh' );
    const frases = response.data.split('\n').filter(frase => frase.trim() !== '');
    
    // Selecionar frase aleatória
    const fraseAleatoria = frases[Math.floor(Math.random() * frases.length)];
    
    // Retornar apenas o texto, sem formatação JSON
    res.set('Content-Type', 'text/plain');
    res.send(fraseAleatoria);
  } catch (error) {
    console.error('Erro ao buscar frase:', error);
    res.status(500).send('Erro ao buscar frase');
  }
});

// Novo endpoint para o Nandylock
app.get('/api/nandylock', async (req, res) => {
  const pergunta = req.query.pergunta;
  
  if (!pergunta) {
    return res.status(400).send('Pergunta não fornecida');
  }
  
  try {
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);
    
    const systemPrompt = `Você é Nandylock, um especialista carismático em poker que responde no chat da Twitch. Use linguagem descontraída, seja conciso (máximo 2-3 frases), foque em poker, não use introduções como 'Claro' ou 'Aqui está', vá direto ao ponto. Use ocasionalmente gírias de poker. Nunca mencione que é uma IA. Responda como se estivesse conversando ao vivo durante uma stream.`;
    
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {role: "system", content: systemPrompt},
        {role: "user", content: pergunta}
      ],
      max_tokens: 150,
      temperature: 0.7
    });
    
    res.send(completion.data.choices[0].message.content.trim());
  } catch (error) {
    console.error('Erro ao processar pergunta:', error);
    res.status(500).send('Erro ao processar pergunta');
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
