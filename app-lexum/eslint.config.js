// Configurazione ESLint di Expo (https://docs.expo.dev/guides/using-eslint/).
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'docs/*', '.expo/*'],
  },
  {
    rules: {
      // In italiano gli apostrofi nel testo sono ovunque: scriverli come &apos; renderebbe i testi illeggibili.
      'react/no-unescaped-entities': 'off',
    },
  },
]);
