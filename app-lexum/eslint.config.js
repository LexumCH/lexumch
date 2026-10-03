// Configurazione ESLint di Expo (https://docs.expo.dev/guides/using-eslint/).
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'dist-anteprima/*', 'docs/*', '.expo/*'],
  },
  {
    // nelle prove i finti moduli nativi si caricano con require()
    files: ['test/**'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    rules: {
      // In italiano gli apostrofi nel testo sono ovunque: scriverli come &apos; renderebbe i testi illeggibili.
      'react/no-unescaped-entities': 'off',
    },
  },
]);
