const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors({ origin: true, credentials: true }));
app.post('/api', (req, res) => res.json({ok: true}));
app.listen(3002, () => console.log('started'));
