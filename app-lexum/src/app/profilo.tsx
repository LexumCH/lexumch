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
import { mostraAcquisti } from '@/config';
import { formatoMB } from '@/dati-finti/conti';
import { utenteFinto } from '@/dati-finti/utente';
import { FoglioDuePassaggi } from '@/fogli/FoglioDuePassaggi';
import { FoglioElimina } from '@/fogli/FoglioElimina';
import { FoglioPaese } from '@/fogli/FoglioPaese';
import { FoglioProfessionista } from '@/fogli/FoglioProfessionista';
import { apriSito, ricominciaDa } from '@/navigazione';
import { contenuti } from '@/paesi/contenuti';
import { dominio, paesePredefinito, trovaPaese } from '@/paesi/registro';
import { useStato, type LinguaCH } from '@/stato/Stato';
import { colori, famiglie } from '@/tema';

type Foglio = 'paese' | 'professionista' | 'elimina' | 'due-passaggi';

const nomiLingue: Record<string, string> = { it: 'Italiano', de: 'Deutsch', fr: 'Français' };

// D4 e G6 · Profilo, in quest'ordine: intestazione, paese e banca dati, lingua (solo dove ce n'è più d'una),
// crediti e piano, account, «Su questo telefono», «Completa il profilo» e, ultimo, «Elimina account».
// Niente pagamenti nell'app: i pulsanti aprono il sito.
export default function Profilo() {
  const { paese, conto, lingua, accessi, telefono, dueFattori, azioni } = useStato();
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
          <Iniziale lettera={utenteFinto.nome.charAt(0)} grande />
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text style={stili.nome}>
              {utenteFinto.nome} {utenteFinto.cognome}
            </Text>
            <Testo tipo="cap">{utenteFinto.email}</Testo>
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
