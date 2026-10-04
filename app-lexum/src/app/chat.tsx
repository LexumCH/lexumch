import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Share, StyleSheet, View } from 'react-native';

import { Chip } from '@/componenti/Chip';
import { Compositore } from '@/componenti/Compositore';
import { BadgePaese, Scheda, Striscia } from '@/componenti/Elementi';
import { Icona } from '@/componenti/Icona';
import { BottoneMenu, ContatoreCrediti, Intestazione, LexBadge } from '@/componenti/Intestazione';
import { FirmaLex, BollaDomanda, FasiLex, RispostaLex } from '@/componenti/Lex';
import { Pulsante, PulsanteIcona } from '@/componenti/Pulsante';
import { Schermata } from '@/componenti/Schermata';
import { Evidenza, Testo } from '@/componenti/Testo';
import { trovaNorma } from '@/dati-finti/banca-dati';
import type { RispostaFinta } from '@/dati-finti/chat';
import { FoglioAllega } from '@/fogli/FoglioAllega';
import { FoglioEsauriti } from '@/fogli/FoglioEsauriti';
import { FoglioNorma } from '@/fogli/FoglioNorma';
import { FoglioNuovaChat } from '@/fogli/FoglioNuovaChat';
import { FoglioSalva } from '@/fogli/FoglioSalva';
import { useTesti } from '@/lingue/useTesti';
import { useVaiASezione } from '@/navigazione';
import { contenutiIn } from '@/paesi/contenuti';
import { paesePredefinito, trovaPaese } from '@/paesi/registro';
import { useOffline } from '@/stato/connessione';
import { useStato } from '@/stato/Stato';
import { colori } from '@/tema';

type Foglio = 'fonte' | 'allega' | 'esauriti' | 'salva' | 'nuova';

// B1–B8 e G4 · La home è la chat con Lex.
// La chat in corso resta finché non la salvi o non ne apri una nuova; aprire una fonte
// o una legge non la chiude.
export default function Chat() {
  const { paese, conto, chat, lingua, chatDaSalvare, utente, azioni } = useStato();
  const { t, lingua: linguaTesti } = useTesti();
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
  const testi = contenutiIn(paese, linguaTesti);
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
        titolo={vuota ? undefined : (chat.titolo ?? t('interfaccia.voci.nuovaChat'))}
        paese
        destra={<ContatoreCrediti />}
      />
      {chatDaSalvare && !chat.inCorso ? (
        <Striscia
          icona="segnalibro"
          testo={t('chat.nonSalvata.testo')}
          azione={t('chat.nonSalvata.azione')}
          onPress={() => setFoglio('salva')}
        />
      ) : null}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {vuota ? (
          <ScrollView contentContainerStyle={stili.home} keyboardShouldPersistTaps="handled">
            <View style={{ gap: 8 }}>
              {/* Saluto più discreto (Antonino, 04-10-2026): «Ciao» in bianco, il nome in oro. */}
              <Testo tipo="dM" accessibilityRole="header">
                {utente.nome ? (
                  <>
                    {t('chat.home.ciao')} <Evidenza oro>{utente.nome}</Evidenza>
                  </>
                ) : (
                  t('chat.home.ciao')
                )}
              </Testo>
              <Testo colore={colori.fg2}>{testi.homeSottotitolo}</Testo>
            </View>

            {conto.creditiBenvenuto > 0 ? (
              <Scheda tono="ok" stile={stili.avviso}>
                <Icona nome="stella" dimensione={20} colore={colori.ok} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Testo medio style={{ fontSize: 15 }}>
                    {conto.creditiBenvenuto === 1
                      ? t('chat.home.creditoBenvenutoUno')
                      : t('chat.home.creditoBenvenutoMolti', { n: conto.creditiBenvenuto })}
                  </Testo>
                  <Testo tipo="small" colore={colori.fg2}>
                    {t('chat.home.primaGratis')}
                  </Testo>
                </View>
              </Scheda>
            ) : paese !== paesePredefinito ? (
              <Scheda tono="ok" stile={stili.avviso}>
                <BadgePaese codice={paese} piccolo />
                <View style={{ flex: 1, gap: 3 }}>
                  <Testo medio style={{ fontSize: 15 }}>
                    {t(`chat.home.seiNella.${paese as 'IT' | 'CH'}`)}
                  </Testo>
                  <Testo tipo="small" colore={colori.fg2}>
                    {conto.scadenzaPiano
                      ? t('chat.home.pianoFino', { piano: conto.piano, data: conto.scadenzaPiano })
                      : conto.piano}
                    {trovaPaese(paese).lingue.length > 1
                      ? ` · ${t('chat.home.appIn', { lingua: t(`chat.home.lingue.${lingua}`) })}`
                      : ''}
                  </Testo>
                </View>
              </Scheda>
            ) : null}

            <View style={{ gap: 6 }}>
              <Testo tipo="cap">{t('chat.home.perIniziare')}</Testo>
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
                {/* come il sito: prima della risposta le fasi in diretta, poi il testo che si scrive */}
                {!chat.attesa.testo ? <Testo colore={colori.fg2}>{t('chat.attesa.consulta')}</Testo> : null}
                <FasiLex attesa={chat.attesa} onPress={azioni.mostraSubitoRisposta} />
                {!chat.attesa.testo ? (
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                    <Icona nome="campanella" dimensione={18} colore={colori.fg3} />
                    <Testo tipo="small" colore={colori.fg3} style={{ flex: 1 }}>
                      {t('chat.attesa.puoiChiudere')}
                    </Testo>
                  </View>
                ) : null}
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
  const { t } = useTesti();
  return (
    <View style={{ gap: 12 }} accessibilityLiveRegion="polite">
      <FirmaLex />
      <Scheda stile={{ borderColor: colori.warnLine, gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Icona nome="avviso" dimensione={18} colore={colori.warn} />
          <Testo medio style={{ flex: 1, fontSize: 15 }}>
            {t('chat.errore.titolo')}
          </Testo>
        </View>
        <Testo tipo="small" colore={colori.fg2}>
          {messaggio}
        </Testo>
        <Testo tipo="cap">{t('chat.errore.credito')}</Testo>
        <Pulsante
          titolo={t('chat.errore.riprova')}
          variante="linea"
          piccolo
          icona="riprova"
          onPress={onRiprova}
        />
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
  const { t } = useTesti();
  const condividi = () => {
    const testo = [risposta.titolo, risposta.inBreve, ...risposta.punti.map((p) => p.titolo), risposta.nota]
      .filter(Boolean)
      .join('\n');
    Share.share({ message: testo }).catch(() => undefined);
  };
  return (
    <View style={stili.azioni}>
      <PulsanteIcona icona="copia" etichetta={t('chat.risposta.copia')} dimensione={20} />
      <Pulsante
        titolo="PDF"
        icona="scarica"
        variante="tenue"
        piccolo
        stile={{ paddingHorizontal: 10, gap: 7 }}
      />
      <Pulsante
        titolo={salvata ? t('chat.risposta.salvata') : t('chat.risposta.salva')}
        icona="segnalibro"
        variante="tenue"
        piccolo
        stile={{ paddingHorizontal: 10, gap: 7 }}
        onPress={salvata ? undefined : onSalva}
        disabilitato={salvata}
      />
      <PulsanteIcona
        icona="condividi"
        etichetta={t('chat.risposta.condividi')}
        dimensione={20}
        onPress={condividi}
      />
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
