module.exports = {
  extends: [
    'airbnb-base',
    'plugin:jest/recommended',
  ],
  plugins: [
    'jest',
  ],
  rules: {
    'no-underscore-dangle': 0,
    'import/no-named-as-default': 0,
    'max-classes-per-file': 0,
    'class-methods-use-this': 0,
    'max-len': [2, 150, 2],
  },
  parser: 'babel-eslint',
  env: {
    node: true,
    'jest/globals': true,
  },
};
