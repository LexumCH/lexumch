import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ricominciaDa } from '@/navigazione';
import { useMenu } from '@/stato/Menu';
import { useStato, type Scenario } from '@/stato/Stato';
import { colori, famiglie } from '@/tema';

// Elenco delle schermate dei mockup, come la barra laterale di docs/mockup/anteprima/.
// Serve a rivedere l'app nel browser: ogni voce prepara i dati finti e apre la schermata.
// Si vede solo in sviluppo (npx expo start --web) su uno schermo largo.

type Voce = {
  codice: string;
  titolo: string;
  scenario: Scenario;
  percorso: Href[];
  menu?: boolean;
};

const gruppi: { titolo: string; voci: Voce[] }[] = [
  {
    titolo: 'Primo avvio',
    voci: [
      { codice: 'A0', titolo: 'Scegli il paese', scenario: 'home-it', percorso: ['/avvio/paese'] },
      {
        codice: 'A1',
        titolo: 'Benvenuto',
        scenario: 'home-it',
        percorso: ['/avvio/paese', '/avvio/benvenuto'],
      },
      {
        codice: 'A2',
        titolo: 'Le fonti',
        scenario: 'home-it',
        percorso: ['/avvio/paese', '/avvio/benvenuto', '/avvio/fonti'],
      },
      {
        codice: 'A3',
        titolo: 'Prima domanda gratis',
        scenario: 'home-it',
        percorso: ['/avvio/paese', '/avvio/benvenuto', '/avvio/fonti', '/avvio/gratis'],
      },
      {
        codice: 'A4',
        titolo: 'Registrazione',
        scenario: 'home-it',
        percorso: ['/avvio/paese', '/avvio/gratis', '/avvio/registrazione'],
      },
      {
        codice: 'A5',
        titolo: 'Codice via email',
        scenario: 'home-it',
        percorso: ['/avvio/paese', '/avvio/registrazione', '/avvio/codice'],
      },
    ],
  },
  {
    titolo: 'Accesso (senza mockup)',
    voci: [
      { codice: 'A6', titolo: 'Accedi', scenario: 'home-it', percorso: ['/avvio/paese', '/avvio/accesso'] },
      {
        codice: 'A7',
        titolo: 'Password dimenticata',
        scenario: 'home-it',
        percorso: ['/avvio/paese', '/avvio/accesso', '/avvio/password'],
      },
      {
        codice: 'A8',
        titolo: 'Nuova password (dal link)',
        scenario: 'home-it',
        percorso: ['/avvio/nuova-password'],
      },
      {
        codice: 'A9',
        titolo: 'Email confermata (dal link)',
        scenario: 'home-it',
        percorso: ['/avvio/conferma'],
      },
    ],
  },
  {
    titolo: 'Lex: la home',
    voci: [
      { codice: 'B1', titolo: 'Home: nuova chat', scenario: 'home-it', percorso: ['/chat'] },
      { codice: 'B2', titolo: 'Lex sta lavorando', scenario: 'lavora-it', percorso: ['/chat'] },
      { codice: 'B3', titolo: 'Risposta con le fonti', scenario: 'risposta-it', percorso: ['/chat'] },
      {
        codice: 'B4',
        titolo: 'Fonte citata',
        scenario: 'risposta-it',
        percorso: [{ pathname: '/chat', params: { foglio: 'fonte', norma: 'l241-25' } }],
      },
      {
        codice: 'B5',
        titolo: 'Allega un documento',
        scenario: 'home-it',
        percorso: [{ pathname: '/chat', params: { foglio: 'allega' } }],
      },
      {
        codice: 'B6',
        titolo: 'Crediti finiti (rimanda al sito)',
        scenario: 'risposta-it',
        percorso: [{ pathname: '/chat', params: { foglio: 'esauriti' } }],
      },
      {
        codice: 'B7',
        titolo: 'Salva la chat in Ricerche',
        scenario: 'risposta-it',
        percorso: [{ pathname: '/chat', params: { foglio: 'salva' } }],
      },
      {
        codice: 'B8',
        titolo: 'Nuova chat: questa non è salvata',
        scenario: 'risposta-it',
        percorso: [{ pathname: '/chat', params: { foglio: 'nuova' } }],
      },
    ],
  },
  {
    titolo: 'Menù e Banca dati',
    voci: [
      { codice: 'C1', titolo: 'Menù', scenario: 'risposta-it', percorso: ['/chat'], menu: true },
      { codice: 'C2', titolo: 'Banca dati', scenario: 'home-it', percorso: ['/chat', '/banca-dati'] },
      {
        codice: 'C3',
        titolo: 'Ricerca per parole',
        scenario: 'home-it',
        percorso: [
          '/chat',
          '/banca-dati',
          { pathname: '/banca-dati/risultati', params: { q: 'accesso agli atti silenzio' } },
        ],
      },
      {
        codice: 'C4',
        titolo: 'Sfoglia una legge',
        scenario: 'home-it',
        percorso: ['/chat', '/banca-dati', '/banca-dati/legge/l241-1990'],
      },
      {
        codice: 'C5',
        titolo: 'Sentenza',
        scenario: 'home-it',
        percorso: [
          '/chat',
          '/banca-dati',
          { pathname: '/banca-dati/risultati', params: { q: 'accesso agli atti silenzio' } },
          '/banca-dati/documento/cds-ap-10-2020',
        ],
      },
      {
        codice: 'C6',
        titolo: 'Legge aperta dalla chat',
        scenario: 'risposta-it',
        percorso: ['/chat', '/legge/l241-1990'],
      },
    ],
  },
  {
    titolo: 'Altre voci',
    voci: [
      {
        codice: 'D1',
        titolo: 'Ricerche',
        scenario: 'salvata-it',
        percorso: ['/chat', { pathname: '/ricerche', params: { etichetta: 'casa' } }],
      },
      {
        codice: 'D1',
        titolo: 'Ricerche: nuova etichetta',
        scenario: 'salvata-it',
        percorso: ['/chat', { pathname: '/ricerche', params: { etichetta: 'casa', foglio: 'etichetta' } }],
      },
      {
        codice: 'D1',
        titolo: 'Ricerche: chat salvata',
        scenario: 'home-it',
        percorso: [
          '/chat',
          { pathname: '/ricerche', params: { etichetta: 'fisco' } },
          { pathname: '/chat-salvata/[id]', params: { id: 'e4' } },
        ],
      },
      {
        codice: 'D1',
        titolo: 'Ricerche: gestisci etichette',
        scenario: 'home-it',
        percorso: ['/chat', { pathname: '/ricerche', params: { etichetta: 'casa', foglio: 'gestisci' } }],
      },
      {
        codice: 'D1',
        titolo: 'Ricerche: confronto',
        scenario: 'home-it',
        percorso: [
          '/chat',
          { pathname: '/ricerche', params: { etichetta: 'casa' } },
          { pathname: '/confronto', params: { ids: 'e1,e2' } },
        ],
      },
      { codice: 'D2', titolo: 'Archivio', scenario: 'home-it', percorso: ['/chat', '/archivio'] },
      {
        codice: 'D2',
        titolo: 'Archivio: file da «Condividi»',
        scenario: 'home-it',
        percorso: ['/chat', { pathname: '/archivio', params: { condiviso: '1' } }],
      },
      { codice: 'D3', titolo: 'Domande', scenario: 'home-it', percorso: ['/chat', '/domande'] },
      {
        codice: 'D4',
        titolo: 'Profilo: paese, crediti e piano',
        scenario: 'risposta-it',
        percorso: ['/chat', '/profilo'],
      },
      {
        codice: 'D5',
        titolo: 'Che professionista sei?',
        scenario: 'risposta-it',
        percorso: ['/chat', { pathname: '/profilo', params: { foglio: 'professionista' } }],
      },
      {
        codice: 'D6',
        titolo: 'Elimina account: conferma',
        scenario: 'home-it',
        percorso: ['/chat', { pathname: '/profilo', params: { foglio: 'elimina' } }],
      },
    ],
  },
  {
    titolo: 'Italia e Svizzera',
    voci: [
      {
        codice: 'G1',
        titolo: 'Cambia paese: anteprima e conferma',
        scenario: 'home-it',
        percorso: ['/chat', { pathname: '/profilo', params: { foglio: 'paese' } }],
      },
      {
        codice: 'G2',
        titolo: 'Nessun accesso in Svizzera',
        scenario: 'senza-accesso-ch',
        percorso: ['/chat', { pathname: '/profilo', params: { foglio: 'paese', verso: 'CH' } }],
      },
      {
        codice: 'G3',
        titolo: "L'app passa alla banca dati svizzera",
        scenario: 'home-it',
        percorso: ['/chat', { pathname: '/passaggio', params: { paese: 'CH' } }],
      },
      { codice: 'G4', titolo: 'Home in Svizzera', scenario: 'home-ch', percorso: ['/chat'] },
      {
        codice: 'G5',
        titolo: 'Banca dati svizzera',
        scenario: 'home-ch',
        percorso: ['/chat', '/banca-dati'],
      },
      {
        codice: 'G6',
        titolo: 'Profilo in Svizzera: paese, lingua, crediti',
        scenario: 'home-ch',
        percorso: ['/chat', '/profilo'],
      },
    ],
  },
  {
    titolo: 'Errori e attese (senza mockup)',
    voci: [
      { codice: 'E1', titolo: 'Lex non risponde', scenario: 'errore-lex-it', percorso: ['/chat'] },
      { codice: 'E2', titolo: 'Senza connessione', scenario: 'offline-it', percorso: ['/chat'] },
      {
        codice: 'E3',
        titolo: 'Caricamento',
        scenario: 'caricamento-it',
        percorso: ['/chat', { pathname: '/ricerche', params: { etichetta: 'casa' } }],
      },
      { codice: 'E4', titolo: 'Elenchi vuoti', scenario: 'vuoto-it', percorso: ['/chat', '/ricerche'] },
    ],
  },
  {
    titolo: 'Funzioni del telefono (senza mockup)',
    voci: [
      { codice: 'F1', titolo: 'App bloccata: Face ID', scenario: 'home-it', percorso: ['/chat', '/blocco'] },
      {
        codice: 'F2',
        titolo: 'Senza rete: Ricerche chiusa',
        scenario: 'offline-it',
        percorso: ['/chat', { pathname: '/ricerche', params: { etichetta: 'casa' } }],
      },
      {
        codice: 'F3',
        titolo: 'Senza rete: Ricerche sul telefono',
        scenario: 'offline-ricerche-it',
        percorso: ['/chat', { pathname: '/ricerche', params: { etichetta: 'casa' } }],
      },
    ],
  },
];

export function ElencoSchermate() {
  const { azioni } = useStato();
  const menu = useMenu();
  const [scelta, setScelta] = useState<string | null>(null);

  const apri = (v: Voce) => {
    setScelta(`${v.codice}-${v.titolo}`);
    menu.chiudi();
    azioni.scenario(v.scenario);
    ricominciaDa(v.percorso[0]);
    for (const p of v.percorso.slice(1)) router.push(p);
    if (v.menu) setTimeout(menu.apri, 350);
  };

  return (
    <View style={stili.lato}>
      <Text style={stili.titolo}>Lexum · anteprima app</Text>
      <ScrollView style={stili.elenco}>
        {gruppi.map((g) => (
          <View key={g.titolo}>
            <Text style={stili.gruppo}>{g.titolo}</Text>
            {g.voci.map((v) => {
              const on = `${v.codice}-${v.titolo}` === scelta;
              return (
                <Pressable
                  key={`${v.codice}-${v.titolo}`}
                  onPress={() => apri(v)}
                  accessibilityRole="link"
                  style={(stato) => [
                    stili.voce,
                    on && stili.voceOn,
                    // «hovered» esiste solo sul web
                    (stato as { hovered?: boolean }).hovered &&
                      !on && { backgroundColor: 'rgba(244,247,248,0.04)' },
                  ]}
                >
                  <Text style={[stili.voceTesto, on && { color: '#D8B56E' }]}>
                    {v.codice} · {v.titolo}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
      <Text style={stili.nota}>
        Tocca le voci per saltare a una schermata con i dati finti pronti, oppure muoviti dentro il telefono
        come nell'app vera.
      </Text>
    </View>
  );
}

const stili = StyleSheet.create({
  lato: { width: 250, gap: 12, maxHeight: '100%' },
  titolo: { fontFamily: famiglie.titoloSemi, fontSize: 24, color: colori.nebbia },
  elenco: { maxHeight: 620 },
  gruppo: {
    marginTop: 12,
    marginBottom: 4,
    fontFamily: famiglie.testo,
    fontSize: 11,
    letterSpacing: 1.76,
    textTransform: 'uppercase',
    color: colori.salvia,
  },
  voce: { paddingVertical: 6, paddingHorizontal: 10, borderLeftWidth: 2, borderLeftColor: 'transparent' },
  voceOn: { borderLeftColor: colori.oro, backgroundColor: 'rgba(201,164,92,0.08)' },
  voceTesto: { fontFamily: famiglie.testo, fontSize: 14, color: colori.fg2 },
  nota: { fontFamily: famiglie.testo, fontSize: 13, lineHeight: 19, color: '#8A9AA3' },
});
