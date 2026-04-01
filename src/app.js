const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// ✅ CORS PRIMERO
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true
}));

app.options('*', cors());

app.use(morgan('dev'));
app.use(express.json());
app.use('/api', routes);
app.use(errorHandler);

app.get('/', (req, res) => {
  res.send('RestoSur | API funcionando 🚀');
});

module.exports = app;
