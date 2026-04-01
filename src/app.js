const express = require('express');
const morgan = require('morgan');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(morgan('dev'));
app.use(express.json());
app.use('/api', routes);
app.use(errorHandler);

module.exports = app;
