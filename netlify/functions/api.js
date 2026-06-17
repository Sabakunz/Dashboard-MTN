const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const apiRouter = require('../../src/routes/api');

const app = express();

app.use(cors());

// express.json() relies on body-parser's onFinished(req) check, which
// short-circuits because serverless-http's mock request sets `complete:
// true` upfront — leaving req.body as the raw Buffer instead of parsed
// JSON. Parse it manually instead of relying on express.json() here.
app.use((req, res, next) => {
  if (Buffer.isBuffer(req.body)) {
    const raw = req.body.toString('utf8');
    try {
      req.body = raw ? JSON.parse(raw) : {};
    } catch {
      req.body = {};
    }
  } else if (!req.body || typeof req.body !== 'object') {
    req.body = {};
  }
  next();
});

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
