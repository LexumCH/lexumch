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
      {
        codice: 'A10',
        titolo: 'Verifica in due passaggi',
        scenario: 'due-passaggi-it',
        percorso: ['/avvio/paese', '/avvio/accesso', '/avvio/verifica'],
      },
      {
        codice: 'A11',
        titolo: 'Accesso di un avvocato',
        scenario: 'avvocato-it',
        percorso: ['/avvio/paese', '/avvio/accesso'],
      },
    ],
  },
  {
    titolo: 'Lex: la home',
    voci: [
      { codice: 'B1', titolo: 'Home: nuova chat', scenario: 'home-it', percorso: ['/chat'] },
      { codice: 'B2', titolo: 'Lex sta lavorando', scenario: 'lavora-it', percorso: ['/chat'] },
      { codice: 'B2', titolo: 'Lex scrive la risposta', scenario: 'scrive-it', percorso: ['/chat'] },
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
        codice: 'D4',
        titolo: 'Profilo di un avvocato',
        scenario: 'avvocato-it',
        percorso: ['/chat', '/profilo'],
      },
      {
        codice: 'D4',
        titolo: 'Profilo: verifica in due passaggi',
        scenario: 'home-it',
        percorso: ['/chat', { pathname: '/profilo', params: { foglio: 'due-passaggi' } }],
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
    titolo: 'Studio dei professionisti (senza mockup)',
    voci: [
      {
        codice: 'S10',
        titolo: 'Clienti (avvocato IT)',
        scenario: 'avvocato-it',
        percorso: ['/chat', '/clienti'],
      },
      {
        codice: 'S11',
        titolo: 'Nuovo cliente (IT)',
        scenario: 'avvocato-it',
        percorso: ['/chat', '/clienti', '/clienti/nuovo'],
      },
      {
        codice: 'S12',
        titolo: 'Scheda cliente: panoramica',
        scenario: 'avvocato-it',
        percorso: ['/chat', '/clienti', { pathname: '/clienti/[id]', params: { id: 'c1' } }],
      },
      {
        codice: 'S12',
        titolo: 'Scheda cliente: documenti e portale',
        scenario: 'avvocato-it',
        percorso: [
          '/chat',
          '/clienti',
          { pathname: '/clienti/[id]', params: { id: 'c1', scheda: 'documenti' } },
        ],
      },
      {
        codice: 'S12',
        titolo: 'Scheda cliente: note interne',
        scenario: 'avvocato-it',
        percorso: ['/chat', '/clienti', { pathname: '/clienti/[id]', params: { id: 'c3', scheda: 'note' } }],
      },
      {
        codice: 'S13',
        titolo: 'Messaggi con il cliente',
        scenario: 'avvocato-it',
        percorso: [
          '/chat',
          '/clienti',
          { pathname: '/clienti/[id]', params: { id: 'c1', scheda: 'comunicazioni' } },
          { pathname: '/comunicazioni/[id]', params: { id: 'tk1' } },
        ],
      },
      {
        codice: 'D2',
        titolo: 'Archivio dello studio (avvocato)',
        scenario: 'avvocato-it',
        percorso: ['/chat', '/archivio'],
      },
      {
        codice: 'S1',
        titolo: 'Pratiche (avvocato IT)',
        scenario: 'avvocato-it',
        percorso: ['/chat', '/pratiche'],
      },
      {
        codice: 'S2',
        titolo: 'Pratica: panoramica',
        scenario: 'avvocato-it',
        percorso: ['/chat', '/pratiche', { pathname: '/pratiche/[id]', params: { id: 'p1' } }],
      },
      {
        codice: 'S2',
        titolo: 'Pratica: scadenze e udienze',
        scenario: 'avvocato-it',
        percorso: [
          '/chat',
          '/pratiche',
          { pathname: '/pratiche/[id]', params: { id: 'p1', scheda: 'scadenze' } },
        ],
      },
      {
        codice: 'S2',
        titolo: 'Pratica: documenti',
        scenario: 'avvocato-it',
        percorso: [
          '/chat',
          '/pratiche',
          { pathname: '/pratiche/[id]', params: { id: 'p1', scheda: 'documenti' } },
        ],
      },
      {
        codice: 'S2',
        titolo: 'Pratica: Lex',
        scenario: 'avvocato-it',
        percorso: ['/chat', '/pratiche', { pathname: '/pratiche/[id]', params: { id: 'p1', scheda: 'lex' } }],
      },
      {
        codice: 'S3',
        titolo: 'Nuova pratica',
        scenario: 'avvocato-it',
        percorso: ['/chat', '/pratiche', '/pratiche/nuova'],
      },
      {
        codice: 'S4',
        titolo: 'Calendario: agenda',
        scenario: 'avvocato-it',
        percorso: ['/chat', '/calendario'],
      },
      {
        codice: 'S4',
        titolo: 'Calendario: mese',
        scenario: 'avvocato-it',
        percorso: ['/chat', { pathname: '/calendario', params: { vista: 'mese' } }],
      },
      {
        codice: 'S5',
        titolo: 'Fatture e scadenzario (IT)',
        scenario: 'avvocato-it',
        percorso: ['/chat', '/fatture'],
      },
      {
        codice: 'S6',
        titolo: 'Fattura: dettaglio (IT)',
        scenario: 'avvocato-it',
        percorso: ['/chat', '/fatture', { pathname: '/fatture/[id]', params: { id: 'f1' } }],
      },
      {
        codice: 'S6',
        titolo: 'Fattura: registra pagamento',
        scenario: 'avvocato-it',
        percorso: [
          '/chat',
          '/fatture',
          { pathname: '/fatture/[id]', params: { id: 'f1', foglio: 'pagamento' } },
        ],
      },
      {
        codice: 'S7',
        titolo: 'Nuova fattura (IT)',
        scenario: 'avvocato-it',
        percorso: ['/chat', '/fatture', '/fatture/nuova'],
      },
      {
        codice: 'S8',
        titolo: 'Calcola parcella (IT)',
        scenario: 'avvocato-it',
        percorso: ['/chat', '/fatture', '/fatture/calcolatore'],
      },
      {
        codice: 'S9',
        titolo: 'Dati di fatturazione (IT)',
        scenario: 'avvocato-it',
        percorso: ['/chat', '/profilo', '/fatture/dati'],
      },
      {
        codice: 'S10',
        titolo: 'Clienti (avvocato CH)',
        scenario: 'avvocato-ch',
        percorso: ['/chat', '/clienti'],
      },
      {
        codice: 'S11',
        titolo: 'Nuovo cliente (CH)',
        scenario: 'avvocato-ch',
        percorso: ['/chat', '/clienti', '/clienti/nuovo'],
      },
      {
        codice: 'S12',
        titolo: 'Scheda cliente (CH, società)',
        scenario: 'avvocato-ch',
        percorso: ['/chat', '/clienti', { pathname: '/clienti/[id]', params: { id: 'c2' } }],
      },
      {
        codice: 'S1',
        titolo: 'Pratiche (avvocato CH)',
        scenario: 'avvocato-ch',
        percorso: ['/chat', '/pratiche'],
      },
      {
        codice: 'S5',
        titolo: 'Fatture (CH)',
        scenario: 'avvocato-ch',
        percorso: ['/chat', '/fatture'],
      },
      {
        codice: 'S6',
        titolo: 'Fattura: dettaglio (CH)',
        scenario: 'avvocato-ch',
        percorso: ['/chat', '/fatture', { pathname: '/fatture/[id]', params: { id: 'f1' } }],
      },
      {
        codice: 'S7',
        titolo: 'Nuova fattura (CH)',
        scenario: 'avvocato-ch',
        percorso: ['/chat', '/fatture', '/fatture/nuova'],
      },
      {
        codice: 'S9',
        titolo: 'Dati di fatturazione (CH)',
        scenario: 'avvocato-ch',
        percorso: ['/chat', '/profilo', '/fatture/dati'],
      },
      {
        codice: 'S4',
        titolo: 'Calendario del commercialista',
        scenario: 'commercialista-it',
        percorso: ['/chat', '/calendario'],
      },
      {
        codice: 'S7',
        titolo: 'Nuova fattura: mancano i tuoi dati',
        scenario: 'commercialista-it',
        percorso: ['/chat', '/fatture', '/fatture/nuova'],
      },
      {
        codice: 'S5',
        titolo: 'Fatture del fiduciario (vuoto)',
        scenario: 'fiduciario-ch',
        percorso: ['/chat', '/fatture'],
      },
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
