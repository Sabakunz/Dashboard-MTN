require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', require('./routes/api'));

// Serve the built React frontend (web/dist)
const webDist = path.join(__dirname, '..', 'web', 'dist');
app.use(express.static(webDist));
app.use((req, res) => {
  res.sendFile(path.join(webDist, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
