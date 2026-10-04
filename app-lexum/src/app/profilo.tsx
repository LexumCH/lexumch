import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  BadgePaese,
  Iniziale,
  Interruttore,
  Scheda,
  Segmentato,
  Separatore,
  TitoloSezione,
} from '@/componenti/Elementi';
import { Icona } from '@/componenti/Icona';
import { BottoneMenu, Intestazione } from '@/componenti/Intestazione';
import { Pulsante } from '@/componenti/Pulsante';
import { Riga } from '@/componenti/Riga';
import { Schermata } from '@/componenti/Schermata';
import { Eyebrow, Testo } from '@/componenti/Testo';
import { esci as esciDalPaese } from '@/backend/accesso';
import { datiVeri, mostraAcquisti } from '@/config';
import { formatoMB } from '@/dati-finti/conti';
import { FoglioDuePassaggi } from '@/fogli/FoglioDuePassaggi';
import { FoglioElimina } from '@/fogli/FoglioElimina';
import { FoglioPaese } from '@/fogli/FoglioPaese';
import { FoglioProfessionista } from '@/fogli/FoglioProfessionista';
import { apriSito, ricominciaDa } from '@/navigazione';
import { contenuti } from '@/paesi/contenuti';
import { dominio, paesePredefinito, trovaPaese } from '@/paesi/registro';
import { gruppoRuolo, nomeRuolo, strumentiStudio } from '@/ruoli';
import { mancanoAlProfessionista } from '@/studio/fatturazione';
import { useStato, type LinguaCH } from '@/stato/Stato';
import { useStudio } from '@/stato/Studio';
import { colori, famiglie } from '@/tema';

type Foglio = 'paese' | 'professionista' | 'elimina' | 'due-passaggi';

const nomiLingue: Record<string, string> = { it: 'Italiano', de: 'Deutsch', fr: 'Français' };

// D4 e G6 · Profilo, in quest'ordine: intestazione, paese e banca dati, lingua (solo dove ce n'è più d'una),
// crediti e piano, account (per chi fattura anche «Dati di fatturazione»), «Su questo telefono»,
// «Completa il profilo» (per un professionista: cosa trova nell'app e cosa sul sito) e, ultimo, «Elimina account».
// Niente pagamenti nell'app: i pulsanti aprono il sito.
export default function Profilo() {
  const { paese, conto, lingua, accessi, telefono, dueFattori, ruoli, utente, azioni } = useStato();
  const ruolo = ruoli[paese] ?? 'user';
  const gruppo = gruppoRuolo(ruolo);
  const strumenti = strumentiStudio(ruolo);
  const { fatturazione } = useStudio();
  const datiMancanti =
    strumenti.includes('fatture') && mancanoAlProfessionista(fatturazione, paese).length > 0;
  // Il foglio aperto sta nei parametri dell'indirizzo (?foglio=paese), come nella chat.
  // ?verso=CH apre il cambio paese con l'altro paese già scelto (solo per l'elenco delle schermate).
  const parametri = useLocalSearchParams<{ foglio?: Foglio; verso?: string }>();
  const foglio = parametri.foglio ?? null;
  const setFoglio = (f: Foglio | null) => router.setParams({ foglio: f ?? undefined, verso: undefined });
  const datiPaese = trovaPaese(paese);
  const testi = contenuti[paese];

  const chiudi = () => setFoglio(null);
  const archivio = `${formatoMB(conto.archivioUsatoMB)} di ${formatoMB(conto.archivioTotaleMB)}`;
  const dettaglioCrediti = conto.scadenzaPiano
    ? `Del piano, valgono fino al ${conto.scadenzaPiano}`
    : `Benvenuto ${conto.creditiBenvenuto} · acquistati ${conto.creditiAcquistati} · non scadono`;
  const dettaglioPiano = conto.scadenzaPiano
    ? `Fino al ${conto.scadenzaPiano} · archivio ${archivio}`
    : `Archivio: ${archivio}`;

  return (
    <Schermata>
      <Intestazione sinistra={<BottoneMenu />} titolo="Profilo" />
      <ScrollView style={{ flex: 1 }}>
        <View style={stili.testa}>
          <Iniziale lettera={(utente.nome || utente.email).charAt(0).toUpperCase()} grande />
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text style={stili.nome}>{`${utente.nome} ${utente.cognome}`.trim() || utente.email}</Text>
            <Testo tipo="cap">
              {gruppo === 'privato' ? utente.email : `${utente.email} · ${nomeRuolo(ruolo)}`}
            </Testo>
          </View>
        </View>

        <Riga
          bordoSopra
          sinistra={<BadgePaese codice={paese} />}
          titolo="Paese e banca dati"
          sottotitolo={`${datiPaese.nome} · ${dominio(datiPaese)}`}
          valore="Cambia"
          valoreOro
          onPress={() => setFoglio('paese')}
        />

        {datiPaese.lingue.length > 1 ? (
          <>
            <TitoloSezione>Lingua dell'app</TitoloSezione>
            <View style={{ paddingHorizontal: 20 }}>
              <Segmentato
                etichetta="Lingua dell'app"
                valore={lingua}
                onCambia={(l) => azioni.impostaLingua(l as LinguaCH)}
                opzioni={datiPaese.lingue.map((l) => ({ valore: l as LinguaCH, titolo: nomiLingue[l] ?? l }))}
              />
            </View>
          </>
        ) : null}

        <TitoloSezione>Crediti e piano</TitoloSezione>
        <View style={{ paddingHorizontal: 20, gap: 10 }}>
          <Scheda stile={{ gap: 14 }}>
            <View style={stili.rigaScheda}>
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <Testo tipo="cap">Crediti disponibili</Testo>
                <Testo tipo="dL" style={{ fontSize: 40, lineHeight: 42 }}>
                  {conto.crediti}
                </Testo>
                <Testo tipo="cap">{dettaglioCrediti}</Testo>
              </View>
              {mostraAcquisti ? (
                <Pulsante
                  titolo="Aggiungi crediti"
                  piccolo
                  ruolo="link"
                  stile={{ alignSelf: 'center' }}
                  onPress={() => apriSito(datiPaese.paginaAcquisti)}
                />
              ) : null}
            </View>
            <Separatore />
            <View style={stili.rigaScheda}>
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <Testo tipo="cap">Il tuo piano</Testo>
                <Testo medio style={{ fontSize: 17 }}>
                  {conto.piano}
                </Testo>
                <Testo tipo="cap">{dettaglioPiano}</Testo>
              </View>
              {mostraAcquisti ? (
                <Pulsante
                  titolo="Fai upgrade"
                  variante="linea"
                  piccolo
                  ruolo="link"
                  stile={{ alignSelf: 'center' }}
                  onPress={() => apriSito(datiPaese.paginaAcquisti)}
                />
              ) : null}
            </View>
          </Scheda>
          {mostraAcquisti ? (
            <Testo tipo="cap">
              Si paga sul sito con lo stesso account: crediti e piano arrivano qui da soli.
            </Testo>
          ) : null}
        </View>

        <TitoloSezione>Account</TitoloSezione>
        <Riga stretta titolo="Dati personali" sottotitolo="Nome, telefono, password" freccia="avanti" />
        <Riga
          stretta
          titolo="Verifica in due passaggi"
          sottotitolo={
            dueFattori[paese]
              ? `Attiva · vale anche su ${dominio(datiPaese)}`
              : "Spenta · codice da un'app di autenticazione"
          }
          valore={dueFattori[paese] ? 'Attiva' : undefined}
          valoreOro
          freccia="avanti"
          onPress={() => setFoglio('due-passaggi')}
        />
        {strumenti.includes('fatture') ? (
          <Riga
            stretta
            titolo="Dati di fatturazione"
            sottotitolo={
              datiMancanti
                ? 'Da completare: servono per emettere le fatture'
                : paese === 'CH'
                  ? 'Indirizzo, IBAN per la QR-fattura, IVA'
                  : 'Partita IVA, codice fiscale, indirizzo, IBAN'
            }
            valore={datiMancanti ? 'Mancano' : undefined}
            freccia="avanti"
            onPress={() => router.push('/fatture/dati')}
          />
        ) : null}
        <Riga stretta titolo="Notifiche" sottotitolo="Quando la risposta di Lex è pronta" freccia="avanti" />
        <Riga
          stretta
          titolo="Privacy e termini"
          freccia="avanti"
          onPress={() => apriSito(`${datiPaese.sito}/privacy`)}
        />
        <Riga
          stretta
          titolo="Esci"
          destra={<Icona nome="esci" dimensione={18} colore={colori.fg3} />}
          onPress={() => {
            azioni.esci();
            if (datiVeri) {
              void esciDalPaese(paese);
              azioni.uscito(paese);
            }
            ricominciaDa('/avvio/paese');
          }}
        />

        <TitoloSezione>Su questo telefono</TitoloSezione>
        <Riga
          stretta
          ruolo="switch"
          selezionata={telefono.blocco}
          titolo="Blocca con Face ID o impronta"
          sottotitolo="Chiede lo sblocco ogni volta che apri l'app"
          destra={<Interruttore acceso={telefono.blocco} />}
          onPress={() => azioni.impostaTelefono('blocco', !telefono.blocco)}
        />
        <Riga
          stretta
          ruolo="switch"
          selezionata={telefono.ricercheOffline}
          titolo="Ricerche anche senza rete"
          sottotitolo={
            telefono.ricercheOffline
              ? 'Chat, norme e appunti salvati restano sul telefono'
              : 'Spenta: Ricerche si apre solo con la connessione'
          }
          destra={<Interruttore acceso={telefono.ricercheOffline} />}
          onPress={() => azioni.impostaTelefono('ricercheOffline', !telefono.ricercheOffline)}
        />

        <View style={{ paddingTop: 18, paddingHorizontal: 20, paddingBottom: 16 }}>
          {gruppo === 'privato' ? (
            <Scheda tono="oro" stile={{ backgroundColor: colori.bg2, gap: 10 }}>
              <Eyebrow colore={colori.accentText}>Completa il profilo</Eyebrow>
              <Testo tipo="dS">{testi.domandaProfessione}</Testo>
              <Testo tipo="small" colore={colori.fg2}>
                {testi.testoProfessione}
              </Testo>
              <Pulsante
                titolo="Che professionista sei?"
                variante="linea"
                piccolo
                iconaDopo="avanti"
                stile={{ gap: 8 }}
                onPress={() => setFoglio('professionista')}
              />
            </Scheda>
          ) : (
            // Account professionale (o cliente di uno studio, o interno): entra come tutti,
            // e qui trova il rimando al sito per gli strumenti che l'app non ha.
            <Scheda tono="oro" stile={{ backgroundColor: colori.bg2, gap: 10 }}>
              <Eyebrow colore={colori.accentText}>{nomeRuolo(ruolo)}</Eyebrow>
              <Testo tipo="dS">
                {gruppo === 'cliente'
                  ? 'Il portale del tuo studio è sul sito'
                  : gruppo === 'interno'
                    ? 'Il pannello di gestione è sul sito'
                    : strumenti.length > 0
                      ? 'Il tuo studio è anche qui'
                      : 'I tuoi strumenti professionali sono sul sito'}
              </Testo>
              <Testo tipo="small" colore={colori.fg2}>
                {strumenti.includes('mandati')
                  ? `Pratiche, calendario e fatture sono nel menù. Clienti, documenti dello studio e statistiche restano su ${dominio(datiPaese)}.`
                  : strumenti.length > 0
                    ? `Calendario e fatture sono nel menù. Clienti, mandati e il resto restano su ${dominio(datiPaese)}.`
                    : gruppo === 'professionista'
                      ? `Qui hai Lex, la Banca dati, le tue ricerche e l'archivio. Pratiche, clienti, scadenze e fatture restano su ${dominio(datiPaese)}.`
                      : `Qui hai Lex, la Banca dati, le tue ricerche e l'archivio. Il resto lo trovi su ${dominio(datiPaese)}, con lo stesso account.`}
              </Testo>
              <Pulsante
                titolo={`Apri ${dominio(datiPaese)}`}
                variante="linea"
                piccolo
                iconaDopo="esterno"
                ruolo="link"
                stile={{ gap: 8 }}
                onPress={() => apriSito(datiPaese.sito)}
              />
            </Scheda>
          )}
        </View>

        <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
          <Riga
            stretta
            titolo={paese === paesePredefinito ? 'Elimina account' : `Elimina account ${testi.aggettivo}`}
            sottotitolo={`Cancella l'accesso e i dati ${testi.in}`}
            titoloStile={{ color: colori.danger }}
            freccia="avanti"
            stile={{ paddingHorizontal: 16, borderWidth: 1, borderColor: colori.dangerLine }}
            onPress={() => setFoglio('elimina')}
          />
        </View>
      </ScrollView>

      <FoglioProfessionista visibile={foglio === 'professionista'} onChiudi={chiudi} />
      <FoglioDuePassaggi visibile={foglio === 'due-passaggi'} onChiudi={chiudi} />
      <FoglioElimina
        visibile={foglio === 'elimina'}
        onChiudi={chiudi}
        onElimina={() => {
          // Se resta l'accesso nell'altro paese, l'app passa lì; altrimenti si ricomincia dalla scelta del paese.
          const altro = Object.entries(accessi).find(([codice, attivo]) => codice !== paese && attivo)?.[0];
          azioni.eliminaAccesso(paese);
          if (altro) ricominciaDa({ pathname: '/passaggio', params: { paese: altro } });
          else ricominciaDa('/avvio/paese');
        }}
      />
      <FoglioPaese
        visibile={foglio === 'paese'}
        iniziale={parametri.verso}
        onChiudi={chiudi}
        onPassa={(codice) => {
          chiudi();
          router.push({ pathname: '/passaggio', params: { paese: codice } });
        }}
        onCreaAccesso={(codice) => {
          chiudi();
          router.push({ pathname: '/avvio/registrazione', params: { paese: codice } });
        }}
        onAccedi={(codice) => {
          chiudi();
          router.push({ pathname: '/avvio/accesso', params: { paese: codice } });
        }}
      />
    </Schermata>
  );
}

const stili = StyleSheet.create({
  testa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  nome: { fontFamily: famiglie.testoMedio, fontSize: 18, color: colori.fg },
  rigaScheda: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
