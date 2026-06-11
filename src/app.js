require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', require('./routes/api'));

// Serve the frontend (index.html) as static files
app.use(express.static(path.join(__dirname, '..')));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
