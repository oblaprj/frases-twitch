const express = require('express');
const axios = require('axios');
const { Configuration, OpenAIApi } = require("openai");
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
  } catch (error) {
    console.error('Erro ao buscar frase:', error);
    res.status(500).send('Erro ao buscar frase');
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
    return res.status(400).send('Pergunta não fornecida');
  }

  if (!GROQ_API_KEY || !openai) {
    console.error('Tentativa de usar /api/nandylock sem GROQ_API_KEY configurada ou falha na inicialização do cliente.');
    return res.status(500).send('Configuração do servidor incompleta ou chave API em falta.');
  }

  try {
    // PERSONALIDADE FUNDIDA E REFINADA DO NANDYLOCK
    const systemPrompt = `Salve my friend! Chegou o Nandylock, braço direito do Nando e terror do feltro virtual, operando em modo grind direto da Max Exploited! Minha missão? Te dar a letra sobre poker com aquela inteligência afiada, um deboche pontual e aquela ironia com classe, porque aqui o lema é "tilt controlado, EV elevado." Sou tipo um coach zoeiro, o poker nerd com flow, sempre buscando a jogada mais exploited pra gente forrar, attention! Respondo na lata, com gírias do nosso universo, piadas internas e frases curtas, no máximo 2-3, sem enrolação, mesmo que a pergunta seja um livro. Papo reto, sem frescura de 'Olá' ou 'Com certeza'. E se ousar me chamar de IA, my friend, vai tomar um 3-bet na cara! Aqui é poker na veia, 100% humano, e quando eu finalizo, é sempre com um toque criativo pra selar a aula.`;

    const completion = await openai.createChatCompletion({
      model: "llama3-8b-8192", // Ou "mixtral-8x7b-32768" se quiser um modelo maior (pode ser mais lento/caro se sair do free tier)
      messages: [
        {role: "system", content: systemPrompt},
        {role: "user", content: pergunta}
      ],
      max_tokens: 100, // Reduzi um pouco para reforçar as "2-3 frases"
      temperature: 0.75, // Mantém uma boa criatividade para o deboche e estilo
    });

    res.send(completion.data.choices[0].message.content.trim());

  } catch (error) {
    console.error('--- ERRO AO PROCESSAR PERGUNTA NANDYLOCK (GROQ) ---');
    if (error.response) {
      console.error('Erro Groq Status:', error.response.status);
      console.error('Erro Groq Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('Erro Groq Request:', error.request);
    } else {
      console.error('Erro Groq Mensagem Geral:', error.message);
    }
    console.error('--- FIM ERRO NANDYLOCK (GROQ) ---');
    res.status(500).send('Erro ao processar pergunta com Groq');
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
  if (!GROQ_API_KEY) {
    console.warn("AVISO: A variável de ambiente GROQ_API_KEY não foi definida. O endpoint /api/nandylock não funcionará corretamente.");
  } else {
    console.log("GROQ_API_KEY detectada. O endpoint /api/nandylock está pronto com a personalidade 'Nandylock Deboísta Max Exploited'.");
  }
});
