const { createCanvas } = require('canvas');
const { randomInt } = require('./utils');

const FONTBASE = 200;
const FONTSIZE = 35;

// Get a font size relative to base size and canvas width
const relativeFont = width => {
  const ratio = FONTSIZE / FONTBASE;
  const size = width * ratio;
  return `${size}px serif`;
};

// NOTE: We assume the plus operation for all of these right now
const randomText = () => {
  const firstNumber = randomInt();
  const secondNumber = randomInt();

  return ({
    text: `${firstNumber} + ${secondNumber} = ?`,
    numbers: [firstNumber, secondNumber],
  });
};

// Configure captcha text
const configureNumbers = (ctx, width, height) => {
  ctx.font = relativeFont(width);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  const { text, numbers } = randomText();
  ctx.fillText(text, width / 2, height / 2);
  return numbers;
};

// Get a rotation between -degrees and degrees converted to radians
const randomRotation = (degrees = 15) => (randomInt([-degrees, degrees]) * Math.PI) / 180;

// Get a captcha image and the numbers used in the captcha
const captcha = (width, height) => {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.rotate(randomRotation());
  const numbers = configureNumbers(ctx, width, height);

  return {
    captchaImage: canvas,
    numbers,
  };
};

module.exports = captcha;
