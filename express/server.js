/* eslint-disable no-console */
/* eslint-disable import/no-extraneous-dependencies */
/*
  Application Configuration
*/
const dotenv = require('dotenv');

dotenv.config();

const config = {
  telegram: {
    webhookUrl: process.env.WEBHOOK_URL,
    botToken: process.env.BOT_TOKEN || 'token',
  },
};

const isProduction = process.env.NODE_ENV !== 'development';
/*
  END - Application Configuration
*/

/*
  Application Imports & Preparation
*/
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const path = require('path');
const serverless = require('serverless-http');
const get = require('lodash/fp/get');
const captcha = require('./captcha');
const getAnswerOptions = require('./answers');

const app = express();
const router = express.Router();

const botOptions = isProduction ? {} : { polling: true };

const bot = new TelegramBot(config.telegram.botToken, botOptions);

if (isProduction) {
  bot.setWebHook(`${config.telegram.webhookUrl}/bot${config.telegram.botToken}`);
}

app.use(express.json());

/*
  END - Application Imports & Preparation
*/

/*
  Application Routes & Logic
*/
router.get('/', (req, res) => {
  res.sendStatus(200);
});

router.get('/healthcheck', (req, res) => {
  res.sendStatus(200);
});

// Process any bot updates
router.post(`/bot${config.telegram.botToken}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});
/*
  END - Application Routes & Logic
*/

/*
  Bot Hooks & Logic
*/
// TODO: Make it clear to the user that only the person entering the chat should be answering - without sending chat-wide, or do nothing
// TODO: Make it so that when the target user clicks the item, it tells the group they answered correctly, maybe a welcome message
// TODO: Make it so that when the target user clicks the wrong item, it tells the group why they are being removed
// TODO: Make it so that the target user has 3 minutes to answer or else they are banned - how to do this without state??
const getFromId = get('from.id');
const getChatId = get('chat.id');

// bot.on('message', msg => {
//   try {
//     // Generate the captcha
//     const { captchaImage, numbers } = captcha(200, 200);
//     // Convert the image to a buffer
//     const captchaImageBuffer = captchaImage.toBuffer('image/png');

//     // Send the image
//     bot.sendPhoto(msg.chat.id, captchaImageBuffer, getAnswerOptions(numbers));
//   }
//   catch (error) {
//     console.log(error);
//   }
// });

// Testing purposes
bot.onText(/test/g, (message) => {
  const fromId = getFromId(message);
  const chatId = getChatId(message);

  console.log(fromId);

  if (fromId === 73053115) {
    try {
      // Generate the captcha
      const { captchaImage, numbers } = captcha(200, 100);
      // Convert the image to a buffer
      const captchaImageBuffer = captchaImage.toBuffer('image/png');
      // Send the image
      bot.sendPhoto(chatId, captchaImageBuffer, getAnswerOptions(numbers));
    }
    catch (error) {
      console.log(error);
    }
  }
});

bot.on('callback_query', ({ message, data, ...rest } = {}) => {
  const fromId = getFromId(rest);
  const chatId = getChatId(message);

  if (fromId !== 73053115) return;

  if (data && data === 'true') {
    bot.sendMessage(chatId, 'Successful');
  }
  else if (data && data === 'false') {
    bot.sendMessage(chatId, 'Failure');
  }
  else {
    bot.sendMessage(chatId, 'Something went wrong');
  }
});

bot.on('new_chat_members', (message) => {
  const chatId = getChatId(message);
  console.log(message);
  // eslint-disable-next-line max-len
  bot.sendMessage(chatId, 'Welcome! Please tell us your PC specs. (NOTE: In the future this bot will auto-kick you if you do not respond to the captcha or respond incorrectly.)');
});
/*
  END - Bot Hooks & Logic
*/

/*
  Application Exports - END
*/
if (process.env.NODE_ENV !== 'development') {
  app.use('/.netlify/functions/server', router); // Path must route to lambda
  app.use('/', (req, res) => res.sendFile(path.join(__dirname, '../index.html')));
}
else {
  app.use('/', router);
}

module.exports = app;
module.exports.handler = serverless(app);
