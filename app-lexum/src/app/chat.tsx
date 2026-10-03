import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Share, StyleSheet, View } from 'react-native';

import { Chip } from '@/componenti/Chip';
import { Compositore } from '@/componenti/Compositore';
import { BadgePaese, Scheda, Striscia } from '@/componenti/Elementi';
import { Icona } from '@/componenti/Icona';
import { BottoneMenu, ContatoreCrediti, Intestazione, LexBadge } from '@/componenti/Intestazione';
import { FirmaLex, BollaDomanda, Passi, RispostaLex } from '@/componenti/Lex';
import { Pulsante, PulsanteIcona } from '@/componenti/Pulsante';
import { Schermata } from '@/componenti/Schermata';
import { Evidenza, Testo } from '@/componenti/Testo';
import { trovaNorma } from '@/dati-finti/banca-dati';
import type { RispostaFinta } from '@/dati-finti/chat';
import { utenteFinto } from '@/dati-finti/utente';
import { FoglioAllega } from '@/fogli/FoglioAllega';
import { FoglioEsauriti } from '@/fogli/FoglioEsauriti';
import { FoglioNorma } from '@/fogli/FoglioNorma';
import { FoglioNuovaChat } from '@/fogli/FoglioNuovaChat';
import { FoglioSalva } from '@/fogli/FoglioSalva';
import { useVaiASezione } from '@/navigazione';
import { contenuti } from '@/paesi/contenuti';
import { paesePredefinito, trovaPaese } from '@/paesi/registro';
import { useOffline } from '@/stato/connessione';
import { useStato } from '@/stato/Stato';
import { colori } from '@/tema';

type Foglio = 'fonte' | 'allega' | 'esauriti' | 'salva' | 'nuova';

const nomiLingua = { it: 'italiano', de: 'tedesco', fr: 'francese' } as const;

// B1–B8 e G4 · La home è la chat con Lex.
// La chat in corso resta finché non la salvi o non ne apri una nuova; aprire una fonte
// o una legge non la chiude.
export default function Chat() {
  const { paese, conto, chat, lingua, chatDaSalvare, azioni } = useStato();
  const vai = useVaiASezione();
  const offline = useOffline();
  // Il foglio aperto sta nei parametri dell'indirizzo (?foglio=…&norma=…): così si apre anche
  // dal menù o dall'elenco delle schermate, e «indietro» su Android lo chiude.
  const parametri = useLocalSearchParams<{ foglio?: Foglio; norma?: string }>();
  const foglio = parametri.foglio ?? null;
  const norma = foglio === 'fonte' ? (parametri.norma ?? null) : null;
  const setFoglio = (f: Foglio | null) => router.setParams({ foglio: f ?? undefined, norma: undefined });
  const setNorma = (id: string | null) =>
    router.setParams(id ? { foglio: 'fonte', norma: id } : { foglio: undefined, norma: undefined });
  const [bozza, setBozza] = useState('');
  const scorre = useRef<ScrollView>(null);
  const testi = contenuti[paese];
  const vuota = chat.messaggi.length === 0 && !chat.inCorso;

  useEffect(() => {
    if (!vuota) setTimeout(() => scorre.current?.scrollToEnd({ animated: true }), 50);
  }, [chat.messaggi.length, chat.inCorso, vuota]);

  const invia = (testo: string) => {
    if (!testo.trim() || offline) return;
    const esito = azioni.inviaDomanda(testo);
    if (esito === 'esauriti') setFoglio('esauriti');
    if (esito === 'ok') setBozza('');
  };

  const chiudi = () => setFoglio(null);

  return (
    <Schermata>
      <Intestazione
        sinistra={<BottoneMenu />}
        centro={vuota ? <LexBadge /> : undefined}
        titolo={vuota ? undefined : (chat.titolo ?? 'Nuova chat')}
        paese
        destra={<ContatoreCrediti />}
      />
      {chatDaSalvare && !chat.inCorso ? (
        <Striscia
          icona="segnalibro"
          testo="Chat non salvata: con un'etichetta la ritrovi anche dal computer."
          azione="Salva"
          onPress={() => setFoglio('salva')}
        />
      ) : null}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {vuota ? (
          <ScrollView contentContainerStyle={stili.home} keyboardShouldPersistTaps="handled">
            <View style={{ gap: 10 }}>
              <Testo tipo="dL" accessibilityRole="header">
                Ciao {utenteFinto.nome}.{'\n'}
                <Evidenza oro corsivo>
                  Di cosa hai bisogno?
                </Evidenza>
              </Testo>
              <Testo colore={colori.fg2}>{testi.homeSottotitolo}</Testo>
            </View>

            {conto.creditiBenvenuto > 0 ? (
              <Scheda tono="ok" stile={stili.avviso}>
                <Icona nome="stella" dimensione={20} colore={colori.ok} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Testo medio style={{ fontSize: 15 }}>
                    {conto.creditiBenvenuto === 1
                      ? '1 credito di benvenuto'
                      : `${conto.creditiBenvenuto} crediti di benvenuto`}
                  </Testo>
                  <Testo tipo="small" colore={colori.fg2}>
                    La tua prima domanda a Lex è gratuita. La Banca dati è sempre libera.
                  </Testo>
                </View>
              </Scheda>
            ) : paese !== paesePredefinito ? (
              <Scheda tono="ok" stile={stili.avviso}>
                <BadgePaese codice={paese} piccolo />
                <View style={{ flex: 1, gap: 3 }}>
                  <Testo medio style={{ fontSize: 15 }}>
                    Sei nella banca dati {testi.aggettivoFemminile}
                  </Testo>
                  <Testo tipo="small" colore={colori.fg2}>
                    {conto.scadenzaPiano ? `${conto.piano} fino al ${conto.scadenzaPiano}` : conto.piano}
                    {trovaPaese(paese).lingue.length > 1 ? ` · app in ${nomiLingua[lingua]}` : ''}
                  </Testo>
                </View>
              </Scheda>
            ) : null}

            <View style={{ gap: 8 }}>
              <Testo tipo="cap">Per iniziare, prova con:</Testo>
              {testi.esempi.map((e) => (
                <Chip key={e} testo={e} onPress={() => invia(e)} />
              ))}
            </View>
            <Testo tipo="cap">{testi.consiglio}</Testo>
          </ScrollView>
        ) : (
          <ScrollView ref={scorre} contentContainerStyle={stili.chat}>
            {chat.messaggi.map((m) =>
              m.da === 'io' ? (
                <BollaDomanda key={m.id} testo={m.testo} />
              ) : m.da === 'errore' ? (
                <ErroreLex key={m.id} messaggio={m.testo} onRiprova={azioni.riprova} />
              ) : (
                <View key={m.id} style={{ gap: 12 }}>
                  <FirmaLex />
                  <RispostaLex risposta={m.risposta} onCitazione={setNorma} />
                  <AzioniRisposta
                    risposta={m.risposta}
                    salvata={chat.salvata}
                    onSalva={() => setFoglio('salva')}
                  />
                </View>
              ),
            )}
            {chat.inCorso ? (
              <View style={{ gap: 12 }}>
                <FirmaLex />
                <Testo colore={colori.fg2}>Lex sta consultando le fonti</Testo>
                <Passi passi={testi.passi} attivo={chat.passo} onPress={azioni.mostraSubitoRisposta} />
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                  <Icona nome="campanella" dimensione={18} colore={colori.fg3} />
                  <Testo tipo="small" colore={colori.fg3} style={{ flex: 1 }}>
                    Puoi chiudere l'app: ti avvisiamo quando la risposta è pronta.
                  </Testo>
                </View>
              </View>
            ) : null}
          </ScrollView>
        )}

        <Compositore
          valore={bozza}
          onCambia={setBozza}
          onInvia={() => invia(bozza)}
          onAllega={() => setFoglio('allega')}
          occupato={chat.inCorso}
          offline={offline}
        />
      </KeyboardAvoidingView>

      <FoglioNorma
        norma={norma ? trovaNorma(norma) : null}
        onChiudi={() => setNorma(null)}
        onApriLegge={(id) => {
          setNorma(null);
          router.push({ pathname: '/legge/[id]', params: { id } });
        }}
        onSalva={() => {
          setNorma(null);
          vai('/ricerche');
        }}
      />
      <FoglioAllega
        visibile={foglio === 'allega'}
        onChiudi={chiudi}
        onArchivio={() => {
          chiudi();
          vai('/archivio');
        }}
      />
      <FoglioEsauriti
        visibile={foglio === 'esauriti'}
        onChiudi={chiudi}
        onCrediti={() => {
          chiudi();
          vai('/profilo');
        }}
      />
      <FoglioSalva
        visibile={foglio === 'salva'}
        onChiudi={chiudi}
        onSalvata={(etichetta) => {
          chiudi();
          vai('/ricerche', { etichetta });
        }}
      />
      <FoglioNuovaChat
        visibile={foglio === 'nuova'}
        titoloChat={chat.titolo}
        onChiudi={chiudi}
        onSalva={() => setFoglio('salva')}
        onNuova={() => {
          azioni.nuovaChat();
          setBozza('');
          chiudi();
        }}
      />
    </Schermata>
  );
}

// Lex non ha risposto: messaggio generico (mai nomi di fornitori) e il credito resta.
function ErroreLex({ messaggio, onRiprova }: { messaggio: string; onRiprova: () => void }) {
  return (
    <View style={{ gap: 12 }} accessibilityLiveRegion="polite">
      <FirmaLex />
      <Scheda stile={{ borderColor: colori.warnLine, gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Icona nome="avviso" dimensione={18} colore={colori.warn} />
          <Testo medio style={{ flex: 1, fontSize: 15 }}>
            Lex non è riuscito a rispondere
          </Testo>
        </View>
        <Testo tipo="small" colore={colori.fg2}>
          {messaggio}
        </Testo>
        <Testo tipo="cap">Il credito non è stato scalato.</Testo>
        <Pulsante titolo="Riprova" variante="linea" piccolo icona="riprova" onPress={onRiprova} />
      </Scheda>
    </View>
  );
}

// Copia, PDF, Salva e Condividi sotto ogni risposta. Copia e PDF arrivano con la tappa 3 (lex-impagina).
function AzioniRisposta({
  risposta,
  salvata,
  onSalva,
}: {
  risposta: RispostaFinta;
  salvata: boolean;
  onSalva: () => void;
}) {
  const condividi = () => {
    const testo = [risposta.titolo, risposta.inBreve, ...risposta.punti.map((p) => p.titolo), risposta.nota]
      .filter(Boolean)
      .join('\n');
    Share.share({ message: testo }).catch(() => undefined);
  };
  return (
    <View style={stili.azioni}>
      <PulsanteIcona icona="copia" etichetta="Copia la risposta" dimensione={20} />
      <Pulsante
        titolo="PDF"
        icona="scarica"
        variante="tenue"
        piccolo
        stile={{ paddingHorizontal: 10, gap: 7 }}
      />
      <Pulsante
        titolo={salvata ? 'Salvata' : 'Salva'}
        icona="segnalibro"
        variante="tenue"
        piccolo
        stile={{ paddingHorizontal: 10, gap: 7 }}
        onPress={salvata ? undefined : onSalva}
        disabilitato={salvata}
      />
      <PulsanteIcona icona="condividi" etichetta="Condividi" dimensione={20} onPress={condividi} />
    </View>
  );
}

const stili = StyleSheet.create({
  home: { gap: 22, paddingTop: 22, paddingHorizontal: 20, paddingBottom: 12 },
  avviso: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  chat: { gap: 20, paddingTop: 6, paddingHorizontal: 20, paddingBottom: 16 },
  azioni: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: -11 },
});
