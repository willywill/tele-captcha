/* eslint-disable import/no-extraneous-dependencies */
const shuffle = require('lodash/fp/shuffle');
const { randomInt } = require('./utils');

const generateRightAndWrongAnswers = ([num1, num2]) => ({
  rightAnswer: num1 + num2,
  wrongAnswer1: num1 + num2 + randomInt([1, 3]),
  wrongAnswer2: num1 + num2 - randomInt([1, 2]),
});

const getAnswerOptions = ({ replyMessageId, numbers, sentFor, chatId, useHtml = false }) => {
  const { rightAnswer, wrongAnswer1, wrongAnswer2 } = generateRightAndWrongAnswers(numbers);
  const htmlFormatting = useHtml ? { parse_mode: 'HTML' } : {};
  return {
    ...htmlFormatting,
    reply_to_message_id: replyMessageId,
    reply_markup: JSON.stringify({
      inline_keyboard: [
        shuffle([
          {
            text: rightAnswer,
            // A = answered correctly?
            // S = Who was this captcha generated for - only this user can answer
            // C = Which chatId is this generated in
            callback_data: JSON.stringify({ a: true, s: sentFor, c: chatId }),
          },
          {
            text: wrongAnswer1,
            callback_data: JSON.stringify({ a: false, s: sentFor, c: chatId }),
          },
          {
            text: wrongAnswer2,
            callback_data: JSON.stringify({ a: false, s: sentFor, c: chatId }),
          },
        ]),
      ],
    }),
  };
};

module.exports = getAnswerOptions;
