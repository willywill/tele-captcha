/* eslint-disable import/no-extraneous-dependencies */
const shuffle = require('lodash/fp/shuffle');
const { randomInt } = require('./utils');

const generateWrongAnswer = ([num1, num2]) => num1 + num2 + randomInt([1, 3]);

const generateRightAnswer = ([num1, num2]) => num1 + num2;

const getAnswerOptions = (numbers) => ({
  reply_markup: JSON.stringify({
    inline_keyboard: [
      shuffle([
        {
          text: generateRightAnswer(numbers),
          callback_data: 'true',
        },
        {
          text: generateWrongAnswer(numbers),
          callback_data: 'false',
        },
        {
          text: generateWrongAnswer(numbers),
          callback_data: 'false',
        },
      ]),
    ],
  }),
});

module.exports = getAnswerOptions;
