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
import { useTesti } from '@/lingue/useTesti';
import { apriSito, ricominciaDa } from '@/navigazione';
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
  // «lingua» è quella scelta (per il selettore); i testi usano quella del paese («linguaTesti»).
  const { t, lingua: linguaTesti } = useTesti();
  const p = paese as 'IT' | 'CH';
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
  const sito = dominio(datiPaese);

  const chiudi = () => setFoglio(null);
  const archivio = t('archivio.spazio', {
    usato: formatoMB(conto.archivioUsatoMB),
    totale: formatoMB(conto.archivioTotaleMB),
  });
  const dettaglioCrediti = conto.scadenzaPiano
    ? t('profilo.crediti.delPiano', { data: conto.scadenzaPiano })
    : t('profilo.crediti.dettaglio', {
        benvenuto: conto.creditiBenvenuto,
        acquistati: conto.creditiAcquistati,
      });
  const dettaglioPiano = conto.scadenzaPiano
    ? t('profilo.crediti.finoAl', { data: conto.scadenzaPiano, archivio })
    : t('profilo.crediti.archivio', { archivio });

  return (
    <Schermata>
      <Intestazione sinistra={<BottoneMenu />} titolo={t('profilo.titolo')} />
      <ScrollView style={{ flex: 1 }}>
        <View style={stili.testa}>
          <Iniziale lettera={(utente.nome || utente.email).charAt(0).toUpperCase()} grande />
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text style={stili.nome}>{`${utente.nome} ${utente.cognome}`.trim() || utente.email}</Text>
            <Testo tipo="cap">
              {gruppo === 'privato' ? utente.email : `${utente.email} · ${nomeRuolo(ruolo, linguaTesti)}`}
            </Testo>
          </View>
        </View>

        <Riga
          bordoSopra
          sinistra={<BadgePaese codice={paese} />}
          titolo={t('profilo.paese')}
          sottotitolo={`${t(`paesi.${p}`)} · ${sito}`}
          valore={t('profilo.cambia')}
          valoreOro
          onPress={() => setFoglio('paese')}
        />

        {datiPaese.lingue.length > 1 ? (
          <>
            <TitoloSezione>{t('profilo.lingua')}</TitoloSezione>
            <View style={{ paddingHorizontal: 20 }}>
              <Segmentato
                etichetta={t('profilo.lingua')}
                valore={lingua}
                onCambia={(l) => azioni.impostaLingua(l as LinguaCH)}
                opzioni={datiPaese.lingue.map((l) => ({ valore: l as LinguaCH, titolo: nomiLingue[l] ?? l }))}
              />
            </View>
          </>
        ) : null}

        <TitoloSezione>{t('profilo.crediti.titolo')}</TitoloSezione>
        <View style={{ paddingHorizontal: 20, gap: 10 }}>
          <Scheda stile={{ gap: 14 }}>
            <View style={stili.rigaScheda}>
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <Testo tipo="cap">{t('profilo.crediti.disponibili')}</Testo>
                <Testo tipo="dL" style={{ fontSize: 40, lineHeight: 42 }}>
                  {conto.crediti}
                </Testo>
                <Testo tipo="cap">{dettaglioCrediti}</Testo>
              </View>
              {mostraAcquisti ? (
                <Pulsante
                  titolo={t('profilo.crediti.aggiungi')}
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
                <Testo tipo="cap">{t('profilo.crediti.piano')}</Testo>
                <Testo medio style={{ fontSize: 17 }}>
                  {conto.piano}
                </Testo>
                <Testo tipo="cap">{dettaglioPiano}</Testo>
              </View>
              {mostraAcquisti ? (
                <Pulsante
                  titolo={t('profilo.crediti.upgrade')}
                  variante="linea"
                  piccolo
                  ruolo="link"
                  stile={{ alignSelf: 'center' }}
                  onPress={() => apriSito(datiPaese.paginaAcquisti)}
                />
              ) : null}
            </View>
          </Scheda>
          {mostraAcquisti ? <Testo tipo="cap">{t('profilo.crediti.nota')}</Testo> : null}
        </View>

        <TitoloSezione>{t('profilo.account.titolo')}</TitoloSezione>
        <Riga
          stretta
          titolo={t('profilo.account.dati')}
          sottotitolo={t('profilo.account.datiTesto')}
          freccia="avanti"
        />
        <Riga
          stretta
          titolo={t('profilo.account.dueFattori')}
          sottotitolo={
            dueFattori[paese] ? t('profilo.account.dueAttiva', { sito }) : t('profilo.account.dueSpenta')
          }
          valore={dueFattori[paese] ? t('profilo.account.attiva') : undefined}
          valoreOro
          freccia="avanti"
          onPress={() => setFoglio('due-passaggi')}
        />
        {strumenti.includes('fatture') ? (
          <Riga
            stretta
            titolo={t('profilo.account.fatturazione')}
            sottotitolo={
              datiMancanti
                ? t('profilo.account.fatturazioneMancano')
                : paese === 'CH'
                  ? t('profilo.account.fatturazioneTesto.CH')
                  : t('profilo.account.fatturazioneTesto.IT')
            }
            valore={datiMancanti ? t('profilo.account.mancano') : undefined}
            freccia="avanti"
            onPress={() => router.push('/fatture/dati')}
          />
        ) : null}
        <Riga
          stretta
          titolo={t('profilo.account.notifiche')}
          sottotitolo={t('profilo.account.notificheTesto')}
          freccia="avanti"
        />
        <Riga
          stretta
          titolo={t('profilo.account.privacy')}
          freccia="avanti"
          onPress={() => apriSito(`${datiPaese.sito}/privacy`)}
        />
        <Riga
          stretta
          titolo={t('profilo.account.esci')}
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

        <TitoloSezione>{t('profilo.telefono.titolo')}</TitoloSezione>
        <Riga
          stretta
          ruolo="switch"
          selezionata={telefono.blocco}
          titolo={t('profilo.telefono.blocco')}
          sottotitolo={t('profilo.telefono.bloccoTesto')}
          destra={<Interruttore acceso={telefono.blocco} />}
          onPress={() => azioni.impostaTelefono('blocco', !telefono.blocco)}
        />
        <Riga
          stretta
          ruolo="switch"
          selezionata={telefono.ricercheOffline}
          titolo={t('profilo.telefono.offline')}
          sottotitolo={
            telefono.ricercheOffline
              ? t('profilo.telefono.offlineAcceso')
              : t('profilo.telefono.offlineSpento')
          }
          destra={<Interruttore acceso={telefono.ricercheOffline} />}
          onPress={() => azioni.impostaTelefono('ricercheOffline', !telefono.ricercheOffline)}
        />

        <View style={{ paddingTop: 18, paddingHorizontal: 20, paddingBottom: 16 }}>
          {gruppo === 'privato' ? (
            <Scheda tono="oro" stile={{ backgroundColor: colori.bg2, gap: 10 }}>
              <Eyebrow colore={colori.accentText}>{t('profilo.completa.sopratitolo')}</Eyebrow>
              <Testo tipo="dS">{t(`profilo.completa.domanda.${p}`)}</Testo>
              <Testo tipo="small" colore={colori.fg2}>
                {t(`profilo.completa.testo.${p}`)}
              </Testo>
              <Pulsante
                titolo={t('profilo.completa.pulsante')}
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
              <Eyebrow colore={colori.accentText}>{nomeRuolo(ruolo, linguaTesti)}</Eyebrow>
              <Testo tipo="dS">
                {gruppo === 'cliente'
                  ? t('profilo.studio.titoloCliente')
                  : gruppo === 'interno'
                    ? t('profilo.studio.titoloInterno')
                    : strumenti.length > 0
                      ? t('profilo.studio.titoloStudio')
                      : t('profilo.studio.titoloSito')}
              </Testo>
              <Testo tipo="small" colore={colori.fg2}>
                {strumenti.includes('mandati')
                  ? t('profilo.studio.testoMandati', { sito })
                  : strumenti.length > 0
                    ? t('profilo.studio.testoStrumenti', { sito })
                    : gruppo === 'professionista'
                      ? t('profilo.studio.testoProfessionista', { sito })
                      : t('profilo.studio.testoAltri', { sito })}
              </Testo>
              <Pulsante
                titolo={t('profilo.studio.apri', { sito })}
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
            titolo={
              paese === paesePredefinito ? t('profilo.elimina.titolo') : t(`profilo.elimina.titoloPaese.${p}`)
            }
            sottotitolo={t(`profilo.elimina.testo.${p}`)}
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
