const RANGE = [2, 5];

const randomInt = ([min, max] = RANGE) => Math.floor(Math.random() * (max - min)) + min;

module.exports = {
  randomInt,
};
