import type { TextStyle } from 'react-native';

// Caratteri di docs/mockup/tela/lexum.css: Cormorant Garamond per i titoli, Outfit per il testo.
// In React Native ogni peso è una famiglia a sé: il nome qui sotto è quello registrato con useFonts.

export const famiglie = {
  titolo: 'CormorantGaramond_500Medium',
  titoloSemi: 'CormorantGaramond_600SemiBold',
  titoloCorsivo: 'CormorantGaramond_500Medium_Italic',
  testo: 'Outfit_400Regular',
  testoMedio: 'Outfit_500Medium',
  testoSemi: 'Outfit_600SemiBold',
} as const;

// Le classi tipografiche del mockup (.d-xl, .d-l, …, .t-mini, .eyebrow).
export const tipi = {
  dXl: { fontFamily: famiglie.titolo, fontSize: 44, lineHeight: 45, letterSpacing: -0.44 },
  dL: { fontFamily: famiglie.titolo, fontSize: 36, lineHeight: 38 },
  dM: { fontFamily: famiglie.titolo, fontSize: 29, lineHeight: 32 },
  dS: { fontFamily: famiglie.titoloSemi, fontSize: 22, lineHeight: 26 },
  body: { fontFamily: famiglie.testo, fontSize: 16, lineHeight: 25 },
  small: { fontFamily: famiglie.testo, fontSize: 14, lineHeight: 20 },
  cap: { fontFamily: famiglie.testo, fontSize: 13, lineHeight: 18 },
  mini: { fontFamily: famiglie.testo, fontSize: 12, lineHeight: 16 },
  eyebrow: {
    fontFamily: famiglie.testoMedio,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
} satisfies Record<string, TextStyle>;

export type TipoTesto = keyof typeof tipi;
