import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Campo } from '@/componenti/Campi';
import { Avviso, IconaQuadrata, Scheda, Segmentato, Tag } from '@/componenti/Elementi';
import { Foglio } from '@/componenti/Foglio';
import { Pulsante } from '@/componenti/Pulsante';
import { Riga } from '@/componenti/Riga';
import { Testo } from '@/componenti/Testo';
import type { Cliente, DatiStudio, NotaCliente } from '@/dati-finti/studio';
import { useTesti } from '@/lingue/useTesti';
import { generaPassword } from '@/studio/clienti';
import { dataBreve, giorniDaOggi } from '@/studio/formati';
import { useRiapertura } from '@/studio/Campi';
import { useStato } from '@/stato/Stato';
import { useStudio } from '@/stato/Studio';
import { colori, famiglie } from '@/tema';

// Fogli della scheda cliente e dell'elenco clienti (come le finestre del sito, ma dal basso).

type Base = { visibile: boolean; onChiudi: () => void };

// ——— Chiedi a Lex sui clienti ———
// Sul sito è `lex-assistente-studio` ({domanda} → risposta e clienti_menzionati). Qui la risposta è finta:
// riconosce tre domande tipiche (fatture, udienze, portale) e per il resto elenca i clienti con pratiche aperte.
type Tema = 'fatture' | 'udienze' | 'portale' | 'generico';

function temaDomanda(d: string): Tema {
  const q = d.toLowerCase();
  if (/fattur|rechnung|factur|incass|pagat|zahl|paie/.test(q)) return 'fatture';
  if (/udienz|verhandlung|audience|tribunal|gericht/.test(q)) return 'udienze';
  if (/portal/.test(q)) return 'portale';
  return 'generico';
}

export function clientiPerTema(
  tema: Tema,
  d: Pick<DatiStudio, 'clienti' | 'pratiche' | 'fatture'>,
): Cliente[] {
  if (tema === 'fatture') {
    const ids = new Set(d.fatture.filter((f) => f.stato === 'in_attesa').map((f) => f.clienteId));
    return d.clienti.filter((c) => ids.has(c.id));
  }
  if (tema === 'udienze') {
    const ids = new Set(
      d.pratiche
        .filter((p) =>
          p.udienze.some(
            (u) => u.stato === 'programmata' && giorniDaOggi(u.dataOra) >= 0 && giorniDaOggi(u.dataOra) <= 15,
          ),
        )
        .map((p) => p.clienteId),
    );
    return d.clienti.filter((c) => ids.has(c.id));
  }
  if (tema === 'portale') return d.clienti.filter((c) => !c.portale);
  const ids = new Set(d.pratiche.filter((p) => p.stato === 'aperta').map((p) => p.clienteId));
  return d.clienti.filter((c) => ids.has(c.id));
}

export function FoglioLexClienti({ visibile, onChiudi }: Base) {
  const studio = useStudio();
  const { conto, azioni } = useStato();
  const { t } = useTesti();
  const [domanda, setDomanda] = useState('');
  const [stato, setStato] = useState<'scrive' | 'pensa' | 'risposta'>('scrive');
  const [chiesta, setChiesta] = useState('');
  useRiapertura(visibile, () => {
    setDomanda('');
    setStato('scrive');
  });

  useEffect(() => {
    if (stato !== 'pensa') return;
    const timer = setTimeout(() => {
      azioni.usaCredito();
      setStato('risposta');
    }, 900);
    return () => clearTimeout(timer);
  }, [stato, azioni]);

  const chiedi = (testo: string) => {
    if (!testo.trim() || conto.crediti <= 0) return;
    setChiesta(testo.trim());
    setStato('pensa');
  };

  const tema = temaDomanda(chiesta);
  const trovati = stato === 'risposta' ? clientiPerTema(tema, studio) : [];
  const esempi = ['fatture', 'udienze', 'portale'] as const;

  return (
    <Foglio visibile={visibile} onChiudi={onChiudi}>
      <View style={{ gap: 6 }}>
        <Testo tipo="dS">{t('clienti.lex.titolo')}</Testo>
        <Testo tipo="small" colore={colori.fg2}>
          {t('clienti.lex.testo')}
        </Testo>
      </View>
      {stato === 'scrive' ? (
        <>
          <Campo
            etichetta={t('clienti.lex.campo')}
            placeholder={t('clienti.lex.segnaposto')}
            value={domanda}
            onChangeText={setDomanda}
            multiline
            stile={{ minHeight: 0 }}
          />
          <View style={stili.esempi}>
            {esempi.map((e) => (
              <Tag
                key={e}
                titolo={t(`clienti.lex.esempi.${e}`)}
                onPress={() => chiedi(t(`clienti.lex.esempi.${e}`))}
              />
            ))}
          </View>
          {conto.crediti <= 0 ? <Avviso testo={t('chat.esauriti.titolo')} /> : null}
          <Pulsante
            titolo={t('clienti.lex.chiedi')}
            icona="stella"
            disabilitato={!domanda.trim() || conto.crediti <= 0}
            onPress={() => chiedi(domanda)}
          />
          <Testo tipo="cap">{t('clienti.lex.credito')}</Testo>
        </>
      ) : (
        <>
          <Scheda stile={{ gap: 4 }}>
            <Testo tipo="cap">{chiesta}</Testo>
          </Scheda>
          {stato === 'pensa' ? (
            <Testo tipo="small" colore={colori.fg2}>
              {t('clienti.lex.pensa')}
            </Testo>
          ) : (
            <View style={{ gap: 8 }}>
              <Testo medio>
                {trovati.length === 0
                  ? t('clienti.lex.nessuno')
                  : tema === 'generico'
                    ? t('clienti.lex.generico')
                    : trovati.length === 1
                      ? t('clienti.lex.rispostaUno')
                      : t('clienti.lex.risposta', { n: trovati.length })}
              </Testo>
              <View style={{ marginHorizontal: -20 }}>
                {trovati.map((c) => (
                  <Riga
                    key={c.id}
                    stretta
                    sinistra={<IconaQuadrata nome="persona" tenue lato={34} dimensione={17} />}
                    titolo={c.nome}
                    sottotitolo={c.email}
                    freccia="avanti"
                    onPress={() => {
                      onChiudi();
                      router.push({ pathname: '/clienti/[id]', params: { id: c.id } });
                    }}
                  />
                ))}
              </View>
              <Pulsante titolo={t('clienti.lex.altra')} variante="linea" onPress={() => setStato('scrive')} />
            </View>
          )}
        </>
      )}
    </Foglio>
  );
}

// ——— Accesso al portale ———
// «Invia email reset password» e «Cambia password» del riquadro «Assistenza accesso cliente»
// (avvocato-cliente-actions: send-reset-email, set-password). La password si vede una volta sola.
export function FoglioAccessoPortale({ visibile, onChiudi, cliente }: Base & { cliente: Cliente }) {
  const { azioni } = useStudio();
  const { t } = useTesti();
  const [fase, setFase] = useState<'scelta' | 'email' | 'password' | 'fatto'>('scelta');
  const [modo, setModo] = useState<'genera' | 'manuale'>('genera');
  const [generata, setGenerata] = useState('');
  const [scritta, setScritta] = useState('');
  const [copiata, setCopiata] = useState(false);
  useRiapertura(visibile, () => {
    setFase('scelta');
    setModo('genera');
    setGenerata(generaPassword());
    setScritta('');
    setCopiata(false);
  });
  const password = modo === 'genera' ? generata : scritta;

  return (
    <Foglio visibile={visibile} onChiudi={onChiudi}>
      <View style={{ gap: 6 }}>
        <Testo tipo="dS">
          {fase === 'fatto' ? t('clienti.fogli.accesso.fatto') : t('clienti.fogli.accesso.titolo')}
        </Testo>
        {fase === 'scelta' ? (
          <Testo tipo="small" colore={colori.fg2}>
            {cliente.portale
              ? t('clienti.fogli.accesso.testoAttivo', { email: cliente.email ?? '' })
              : t('clienti.fogli.accesso.testoSpento')}
          </Testo>
        ) : null}
      </View>

      {fase === 'scelta' ? (
        <View style={{ marginHorizontal: -20 }}>
          {cliente.portale && cliente.email ? (
            <Riga
              sinistra={<IconaQuadrata nome="email" />}
              titolo={t('clienti.fogli.accesso.email')}
              sottotitolo={t('clienti.fogli.accesso.emailTesto')}
              freccia="avanti"
              onPress={() => setFase('email')}
            />
          ) : null}
          <Riga
            sinistra={<IconaQuadrata nome="lucchetto" />}
            titolo={t('clienti.fogli.accesso.password')}
            sottotitolo={t('clienti.fogli.accesso.passwordTesto')}
            freccia="avanti"
            onPress={() => setFase('password')}
          />
        </View>
      ) : null}

      {fase === 'email' ? (
        <>
          <Avviso
            tono="info"
            testo={t('clienti.fogli.accesso.emailMandata', { email: cliente.email ?? '' })}
          />
          <Pulsante titolo={t('comune.chiudi')} variante="linea" onPress={onChiudi} />
        </>
      ) : null}

      {fase === 'password' ? (
        <>
          <Segmentato
            etichetta={t('clienti.fogli.accesso.password')}
            opzioni={[
              { valore: 'genera', titolo: t('clienti.fogli.accesso.genera') },
              { valore: 'manuale', titolo: t('clienti.fogli.accesso.manuale') },
            ]}
            valore={modo}
            onCambia={setModo}
          />
          {modo === 'genera' ? (
            <Scheda tono="oro" stile={stili.password}>
              <Testo style={stili.passwordTesto} selectable>
                {generata}
              </Testo>
              <Pulsante
                titolo={t('clienti.modulo.genera')}
                icona="riprova"
                variante="linea"
                piccolo
                onPress={() => setGenerata(generaPassword())}
              />
            </Scheda>
          ) : (
            <Campo
              etichetta={t('clienti.fogli.accesso.campo')}
              placeholder={t('clienti.modulo.passwordSegnaposto')}
              value={scritta}
              onChangeText={setScritta}
              autoCapitalize="none"
              autoCorrect={false}
            />
          )}
          <Pulsante
            titolo={t('clienti.fogli.accesso.conferma')}
            disabilitato={password.length < 8}
            onPress={() => {
              azioni.attivaPortale(cliente.id);
              setFase('fatto');
            }}
          />
        </>
      ) : null}

      {fase === 'fatto' ? (
        <>
          <Scheda tono="oro" stile={stili.password}>
            <Testo style={stili.passwordTesto} selectable>
              {password}
            </Testo>
            <Pulsante
              titolo={copiata ? t('clienti.fogli.accesso.copiata') : t('clienti.fogli.accesso.copia')}
              icona={copiata ? 'spunta' : 'copia'}
              variante="linea"
              piccolo
              onPress={() => {
                void Clipboard.setStringAsync(password).catch(() => undefined);
                setCopiata(true);
              }}
            />
          </Scheda>
          <Avviso tono="info" testo={t('clienti.fogli.accesso.unaVolta')} />
          <Pulsante titolo={t('clienti.fogli.accesso.chiudi')} onPress={onChiudi} />
        </>
      ) : null}
    </Foglio>
  );
}

// ——— Elimina cliente ———
// Come sul sito: si riscrive il nome esatto, poi si cancella tutto (avvocato-cliente-actions, elimina-cliente).
export function FoglioEliminaCliente({
  visibile,
  onChiudi,
  cliente,
  onEliminato,
}: Base & { cliente: Cliente; onEliminato: () => void }) {
  const { azioni } = useStudio();
  const { t } = useTesti();
  const [testo, setTesto] = useState('');
  useRiapertura(visibile, () => setTesto(''));
  return (
    <Foglio visibile={visibile} onChiudi={onChiudi}>
      <View style={{ gap: 6 }}>
        <Testo tipo="dS">{t('clienti.fogli.elimina.titolo', { nome: cliente.nome })}</Testo>
        <Testo tipo="small" colore={colori.fg2}>
          {t('clienti.fogli.elimina.testo')}
        </Testo>
      </View>
      <Testo tipo="small">{t('clienti.fogli.elimina.scrivi', { nome: cliente.nome })}</Testo>
      <Campo
        etichetta={t('clienti.fogli.elimina.campo')}
        value={testo}
        onChangeText={setTesto}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Pulsante
        titolo={t('clienti.fogli.elimina.conferma')}
        variante="pericolo"
        disabilitato={testo.trim() !== cliente.nome}
        onPress={() => {
          azioni.eliminaCliente(cliente.id);
          onEliminato();
        }}
      />
    </Foglio>
  );
}

// ——— Nota interna ———
export function FoglioNota({
  visibile,
  onChiudi,
  clienteId,
  nota,
}: Base & { clienteId: string; nota?: NotaCliente }) {
  const { azioni } = useStudio();
  const { t } = useTesti();
  const [testo, setTesto] = useState(nota?.testo ?? '');
  useRiapertura(visibile, () => setTesto(nota?.testo ?? ''));
  return (
    <Foglio visibile={visibile} onChiudi={onChiudi}>
      <View style={{ gap: 6 }}>
        <Testo tipo="dS">{nota ? t('clienti.fogli.nota.modifica') : t('clienti.fogli.nota.nuova')}</Testo>
        <Testo tipo="small" colore={colori.fg2}>
          {t('clienti.scheda.note.avviso')}
        </Testo>
      </View>
      <Campo
        etichetta={t('clienti.fogli.nota.campo')}
        placeholder={t('clienti.fogli.nota.segnaposto')}
        value={testo}
        onChangeText={setTesto}
        multiline
      />
      <Pulsante
        titolo={t('clienti.fogli.nota.salva')}
        disabilitato={!testo.trim()}
        onPress={() => {
          if (nota) azioni.modificaNota(nota.id, testo);
          else azioni.aggiungiNota(clienteId, testo);
          onChiudi();
        }}
      />
    </Foglio>
  );
}

// ——— Nuovo messaggio al cliente ———
// Un ticket (`ticket_assistenza`) con il primo messaggio (`messaggi_ticket`). Sul sito si scrive solo il titolo,
// poi si apre la chat: qui si può scrivere anche il primo messaggio.
export function FoglioTicket({ visibile, onChiudi, cliente }: Base & { cliente: Cliente }) {
  const { azioni } = useStudio();
  const { t } = useTesti();
  const [oggetto, setOggetto] = useState('');
  const [testo, setTesto] = useState('');
  useRiapertura(visibile, () => {
    setOggetto('');
    setTesto('');
  });
  return (
    <Foglio visibile={visibile} onChiudi={onChiudi}>
      <View style={{ gap: 6 }}>
        <Testo tipo="dS">{t('clienti.fogli.ticket.titolo')}</Testo>
        <Testo tipo="small" colore={colori.fg2}>
          {cliente.portale ? t('clienti.fogli.ticket.testo') : t('clienti.scheda.comunicazioni.senzaPortale')}
        </Testo>
      </View>
      <Campo
        etichetta={t('clienti.fogli.ticket.oggetto')}
        placeholder={t('clienti.fogli.ticket.oggettoSegnaposto')}
        value={oggetto}
        onChangeText={setOggetto}
      />
      <Campo
        etichetta={t('clienti.fogli.ticket.messaggio')}
        value={testo}
        onChangeText={setTesto}
        multiline
      />
      <Pulsante
        titolo={t('clienti.fogli.ticket.apri')}
        icona="invia"
        disabilitato={!oggetto.trim()}
        onPress={() => {
          const id = azioni.apriTicket(cliente.id, oggetto, testo);
          onChiudi();
          router.push({ pathname: '/comunicazioni/[id]', params: { id } });
        }}
      />
    </Foglio>
  );
}

// ——— Condividi nel portale ———
// Sul sito (DocumentiPortale) si carica un file dal computer. Nell'app anche un documento dell'archivio
// del cliente: è una copia del file nel portale (tabella `documenti`), l'archivio resta com'è.
export function FoglioCondividi({ visibile, onChiudi, cliente }: Base & { cliente: Cliente }) {
  const { documenti, azioni } = useStudio();
  const { t, lingua } = useTesti();
  const [elenco, setElenco] = useState(false);
  useRiapertura(visibile, () => setElenco(false));
  const delCliente = documenti.filter((d) => d.clienteId === cliente.id);
  const condividi = (nome: string, dimensione: string) => {
    azioni.condividiNelPortale(cliente.id, { nome, dimensione });
    onChiudi();
  };
  return (
    <Foglio visibile={visibile} onChiudi={onChiudi}>
      <View style={{ gap: 6 }}>
        <Testo tipo="dS">{t('clienti.fogli.condividi.titolo')}</Testo>
        <Testo tipo="small" colore={colori.fg2}>
          {t('clienti.fogli.condividi.testo', { nome: cliente.nome })}
        </Testo>
      </View>
      <View style={{ marginHorizontal: -20 }}>
        {!elenco ? (
          <>
            <Riga
              sinistra={<IconaQuadrata nome="carica" />}
              titolo={t('clienti.fogli.condividi.dalTelefono')}
              sottotitolo={t('clienti.fogli.condividi.dalTelefonoTesto')}
              freccia="avanti"
              // nell'app vera si apre la scelta dei file del telefono
              onPress={() =>
                condividi(`Documento ${dataBreve(new Date().toISOString(), lingua)}.pdf`, '240 KB')
              }
            />
            <Riga
              sinistra={<IconaQuadrata nome="archivio" />}
              titolo={t('clienti.fogli.condividi.dallArchivio')}
              freccia="avanti"
              onPress={() => setElenco(true)}
            />
          </>
        ) : (
          <>
            {delCliente.map((d) => (
              <Riga
                key={d.id}
                stretta
                sinistra={<IconaQuadrata nome="documento" tenue lato={34} dimensione={17} />}
                titolo={d.titolo}
                sottotitolo={`${d.formato} · ${d.dimensione}`}
                onPress={() => condividi(`${d.titolo}.${d.formato.toLowerCase()}`, d.dimensione)}
              />
            ))}
            {delCliente.length === 0 ? (
              <Testo tipo="small" colore={colori.fg3} style={{ paddingHorizontal: 20 }}>
                {t('clienti.fogli.condividi.vuoto')}
              </Testo>
            ) : null}
          </>
        )}
      </View>
    </Foglio>
  );
}

const stili = StyleSheet.create({
  esempi: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  password: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  passwordTesto: {
    flex: 1,
    fontFamily: famiglie.testoMedio,
    fontSize: 18,
    letterSpacing: 1,
    color: colori.fg,
  },
});
