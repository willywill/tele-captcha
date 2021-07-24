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
const entries = require('lodash/fp/entries');
const addMinutes = require('date-fns/addMinutes');
const isAfter = require('date-fns/isAfter');
const parseISO = require('date-fns/parseISO');

const { simpleCaptcha } = require('./captcha');
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

const globalJoinedUserStatusCache = {};
const MINUTES_FOR_OPERATION = 5;

const getFullName = member => (member?.last_name ? `${member.first_name} ${member.last_name}` : member.first_name);

// This background job is responsible for the following:
const backgroundJob = () => {
  // Look at the current list of userIds and kick any users that did not answer the captcha
  entries(globalJoinedUserStatusCache).forEach(([userId, {
    chatId,
    didAnswerCaptchaCorrectly,
    joinedAt,
    fullName = 'User',
    captchaMessageId,
  }]) => {
    const now = new Date().toISOString();
    // Kick the user if they did not answer the captcha correctly within X minutes
    if (!didAnswerCaptchaCorrectly && isAfter(parseISO(now), addMinutes(parseISO(joinedAt), MINUTES_FOR_OPERATION))) {
      // Delete the captcha message if we have a reference in the cache
      if (captchaMessageId) {
        bot.deleteMessage(chatId, captchaMessageId);
      }

      bot.kickChatMember(chatId, userId);
      // Send a message to the entire chat that the user was kicked because they did not answer the captcha in time.
      bot.sendMessage(chatId, `${fullName} was removed due to not answering the captcha in time.`);

      delete globalJoinedUserStatusCache[userId];
    }
  });
};

const getFromId = get('from.id');
// const getChatId = get('chat.id');

if (!isProduction) {
  // Check and log errors on local dev
  bot.on('polling_error', (err) => console.log(err));
}

// Testing purposes
// bot.onText(/test/gi, (message) => {
//   const fromId = getFromId(message);
//   const chatId = getChatId(message);

//   if (fromId === 73053115) {
//     try {
//       // Generate the captcha using numbers
//       const { numbers, text } = simpleCaptcha();
//       // Send the message with the captcha
//       bot.sendMessage(chatId, text, getAnswerOptions({ numbers, chatId, useHtml: true }));
//     }
//     catch (error) {
//       console.log(error);
//     }
//   }
// });

// The function that gets called with the payload when a user answers the captcha
bot.on('callback_query', ({ message, data, ...rest } = {}) => {
  const userThatAnswered = getFromId(rest);
  const parsedData = JSON.parse(data);

  const chatId = parsedData?.c;
  const isAnsweredCorrectly = parsedData?.a;
  const userTheCaptchaWasSentFor = parsedData?.s;

  // Make sure that the user is the one this captcha is for, and that they answered before marking them as have answered correctly
  if (isAnsweredCorrectly && userTheCaptchaWasSentFor === userThatAnswered) {
    globalJoinedUserStatusCache[userThatAnswered].didAnswerCaptchaCorrectly = true;

    // Delete the captcha message if we have a reference in the cache
    if (globalJoinedUserStatusCache[userThatAnswered].captchaMessageId) {
      bot.deleteMessage(chatId, globalJoinedUserStatusCache[userThatAnswered].captchaMessageId);
    }
  }

  // If the user answered incorrectly, immediately kick them from the group, and remove them from the cache
  if (!isAnsweredCorrectly && userTheCaptchaWasSentFor === userThatAnswered) {
    bot.kickChatMember(chatId, userThatAnswered);

    // Delete the captcha message if we have a reference in the cache
    if (globalJoinedUserStatusCache[userThatAnswered].captchaMessageId) {
      bot.deleteMessage(chatId, globalJoinedUserStatusCache[userThatAnswered].captchaMessageId);
    }

    const userTheCaptchaWasSentForFullName = globalJoinedUserStatusCache[userThatAnswered]?.fullName;
    // Send a message to the entire chat that the user was kicked because they did not answer the captcha correctly.
    bot.sendMessage(chatId, `${userTheCaptchaWasSentForFullName || 'User'} was removed due to not answering the captcha correctly.`);

    delete globalJoinedUserStatusCache[userThatAnswered];
  }
});

// When a new chat member joins
bot.on('new_chat_members', (data) => {
  // Get the joined users details needed to store in the cache
  const newMembers = data?.new_chat_members || [];
  // ChatId the group member(s) just joined
  const chatId = data?.chat?.id;
  // Current timestamp
  const joinedAt = new Date().toISOString();

  newMembers.forEach(member => {
    // Store the chatId the user just joined, and the time that they joined, initially mark them as not answering correctly of course
    globalJoinedUserStatusCache[member?.id] = {
      didAnswerCaptchaCorrectly: false,
      joinedAt,
      chatId,
      fullName: getFullName(member),
    };

    // Reply to the joined message with the captcha
    const replyMessageId = data?.message_id;

    // NOTE: Uncomment below for image captchas, and reinstall node-canvas and use it in the captcha.js file
    /*
      // Generate the captcha
      const { captchaImage, numbers } = captcha(200, 100);
      // Convert the image to a buffer
      const captchaImageBuffer = captchaImage.toBuffer('image/png');
      // Send the image
      bot.sendPhoto(chatId, captchaImageBuffer, getAnswerOptions({ numbers, replyMessageId, chatId, sentFor: member?.id }));
    */

    // Generate the captcha using numbers
    const { numbers, text } = simpleCaptcha();
    // Send the message with the captcha
    bot.sendMessage(chatId, text, getAnswerOptions({ numbers, replyMessageId, chatId, sentFor: member?.id, useHtml: true }))
      .then((result) => {
        // Store this message id in the cache, so we can delete the message later
        if (result?.message_id) {
          globalJoinedUserStatusCache[member?.id].captchaMessageId = result.message_id;
        }
      });
  });
});

// Run the background job every 2 minutes
setInterval(backgroundJob, (1000 * 60 * MINUTES_FOR_OPERATION) / 2);

/*
  END - Bot Hooks & Logic
*/

/*
  Application Exports - END
*/
if (isProduction) {
  app.use('/.netlify/functions/server', router); // Path must route to lambda
  app.use('/', (req, res) => res.sendFile(path.join(__dirname, '../index.html')));
}
else {
  app.use('/', router);
}

module.exports = app;
module.exports.handler = serverless(app);
