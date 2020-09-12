const RANGE = [2, 10];

const randomInt = ([min, max] = RANGE) => Math.floor(Math.random() * (max - min)) + min;

module.exports = {
  randomInt,
};
