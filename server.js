import express from 'express';
import cors from 'cors';
import apiRouter from './api.js';
import openaiRouter from './api-openai.js';

const app = express();
const PORT = 8000;

// Middleware global restringido a localhost y https://aicontentcreator.improvitz.com/
//app.use(cors({ origin: 'http://localhost:3000' }));
//app.use(cors({ origin: 'https://aicontentcreator.improvitz.com' }));
app.use(cors());
app.use(express.json());

// Usar los routers
app.use('/', apiRouter);
app.use('/openai', openaiRouter);

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});