const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// ✅ CORS PRIMERO
const corsOptions = {
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(morgan('dev'));
app.use(express.json());
app.use('/api', routes);
app.use(errorHandler);

app.get('/', (req, res) => {
  res.send('RestoSur | API funcionando 🚀');
});

module.exports = app;
