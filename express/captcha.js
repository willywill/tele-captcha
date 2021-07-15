/* eslint-disable max-len */
// eslint-disable-next-line import/no-extraneous-dependencies
// const { createCanvas } = require('canvas');
const { randomInt } = require('./utils');

const FONTBASE = 200;
const FONTSIZE = 35;

const createCanvasMock = () => ({
  getContext: () => ({
    fillText: () => {},
    measureText: () => ({ width: FONTBASE }),
  }),
});

// Get a font size relative to base size and canvas width
const relativeFont = width => {
  const ratio = FONTSIZE / FONTBASE;
  const size = width * ratio;
  return `${size}px serif`;
};

// NOTE: We assume the plus operation for all of these right now
const randomMathPrompt = () => {
  const firstNumber = randomInt();
  const secondNumber = randomInt();

  return ({
    text: `${firstNumber} + ${secondNumber} = ?`,
    numbers: [firstNumber, secondNumber],
  });
};

const formattedTextPrompt = (prompt, timeLimitInMinutes) => `
  Hello! 👋

This group has enabled Captcha to prevent bots & spam. 🚫🤖

Please complete the following math question to be admitted to the group. ✅

You have <b>${timeLimitInMinutes} minutes</b> to complete the prompt ⏳, failure to complete the prompt correctly or not in time will result in being <i>kicked</i> from the group.

  <b>${prompt}</b>
`;

// Configure captcha text
const configureNumbers = (ctx, width, height) => {
  ctx.font = relativeFont(width);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  const { text, numbers } = randomMathPrompt();
  ctx.fillText(text, width / 2, height / 2);
  return numbers;
};

// Get a rotation between -degrees and degrees converted to radians
const randomRotation = (degrees = 15) => (randomInt([-degrees, degrees]) * Math.PI) / 180;

// Get a captcha image and the numbers used in the captcha
const captcha = (width, height) => {
  const canvas = createCanvasMock(width, height);
  const ctx = canvas.getContext('2d');
  ctx.rotate(randomRotation());
  const numbers = configureNumbers(ctx, width, height);

  return {
    captchaImage: canvas,
    numbers,
  };
};

// This captcha method uses just the numbers and no images for the verification process
const simpleCaptcha = () => {
  // TODO: Pass the time in as a param
  const timeLimitInMinutes = 2;
  const { numbers, text } = randomMathPrompt();
  return {
    numbers,
    text: formattedTextPrompt(text, timeLimitInMinutes),
  };
};

module.exports = {
  captcha,
  simpleCaptcha,
};
