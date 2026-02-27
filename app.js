// app.js
const express = require('express');
const router = express.Router({mergeParams: true});
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const port = 3000;
const webhookService = require('./webhook-service')
const dotenv = require("dotenv");
dotenv.config(); // Sets up dotenv as soon as our application starts

app.post('/webhook', async (req, res) => {
  // call to function of webhook service
  await webhookService.checkWebhookMessage(req, res);
  res.send('Webhook message sent');
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});