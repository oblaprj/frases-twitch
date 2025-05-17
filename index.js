const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

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
    res.status(500).send('Erro ao buscar frase');
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

