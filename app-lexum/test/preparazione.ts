// Preparazione delle prove con Jest: i moduli nativi che in prova non esistono.
jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock.js'),
);
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
