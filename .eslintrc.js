{
  module.exports = {
    parserOptions: {
      ecmaVersion: 2020, // Allows for the parsing of modern ECMAScript features
      sourceType: 'module', // Allows for the use of imports
    },
    plugins: ['prettier'],
    rules: {
      'prettier/prettier': 'error',
    },
  };
}
