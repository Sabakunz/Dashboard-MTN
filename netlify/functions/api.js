const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const apiRouter = require('../../src/routes/api');

const app = express();

app.use(cors());
app.use(express.json());

// Strip the function/redirect prefix so the router's relative paths
// (e.g. /machines, /kpi) match regardless of how Netlify rewrites the path.
app.use((req, res, next) => {
  req.url = req.url
    .replace(/^\/\.netlify\/functions\/api/, '')
    .replace(/^\/api/, '') || '/';
  next();
});

app.use('/', apiRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports.handler = serverless(app);
