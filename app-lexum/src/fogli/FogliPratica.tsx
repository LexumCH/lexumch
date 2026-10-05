import { useState } from 'react';
import { View } from 'react-native';

import { Campo } from '@/componenti/Campi';
import { Avviso } from '@/componenti/Elementi';
import { Foglio } from '@/componenti/Foglio';
import { Pulsante } from '@/componenti/Pulsante';
import { Testo } from '@/componenti/Testo';
import { esiti, type Esito, type Pratica } from '@/dati-finti/studio';
import { useTesti } from '@/lingue/useTesti';
import { CampoData, CampoOra, Scelta, leggiData, leggiOra, useRiapertura } from '@/studio/Campi';
import { nomeEsito, nomeRuolo, ruoliProcessuali } from '@/studio/pratiche';
import { useStudio } from '@/stato/Studio';
import { colori } from '@/tema';

// Fogli del dettaglio pratica (come le finestre del sito, ma dal basso).

type Base = { visibile: boolean; onChiudi: () => void; pratica: Pratica };

// Note interne: le vede solo lo studio, Lex non le legge.
export function FoglioNotePratica({ visibile, onChiudi, pratica }: Base) {
  const { azioni } = useStudio();
  const { t } = useTesti();
  const [testo, setTesto] = useState(pratica.note ?? '');
  useRiapertura(visibile, () => setTesto(pratica.note ?? ''));
  return (
    <Foglio visibile={visibile} onChiudi={onChiudi}>
      <View style={{ gap: 6 }}>
        <Testo tipo="dS">{t('studio.fogli.note.titolo')}</Testo>
        <Testo tipo="small" colore={colori.fg2}>
          {t('studio.fogli.note.testo')}
        </Testo>
      </View>
      <Campo etichetta={t('studio.fogli.note.campo')} value={testo} onChangeText={setTesto} multiline />
      <Pulsante
        titolo={t('studio.fogli.note.salva')}
        onPress={() => {
          azioni.salvaNotePratica(pratica.id, testo);
          onChiudi();
        }}
      />
    </Foglio>
  );
}

// Chiudi la pratica con l'esito (Vinta, Persa, Transatta, Archiviata), come sul sito.
export function FoglioChiudiPratica({ visibile, onChiudi, pratica }: Base) {
  const { azioni } = useStudio();
  const { t, lingua } = useTesti();
  const [esito, setEsito] = useState<Esito | null>(null);
  useRiapertura(visibile, () => setEsito(null));
  return (
    <Foglio visibile={visibile} onChiudi={onChiudi}>
      <View style={{ gap: 6 }}>
        <Testo tipo="dS">{t('studio.fogli.chiudi.titolo')}</Testo>
        <Testo tipo="small" colore={colori.fg2}>
          {t('studio.fogli.chiudi.testo')}
        </Testo>
      </View>
      <Scelta
        voci={esiti.map((e) => ({ valore: e, titolo: nomeEsito(e, lingua) }))}
        valore={esito}
        onCambia={setEsito}
        etichettaGruppo={t('studio.fogli.chiudi.esito')}
      />
      <Pulsante
        titolo={t('studio.fogli.chiudi.conferma')}
        disabilitato={!esito}
        onPress={() => {
          if (!esito) return;
          azioni.chiudiPratica(pratica.id, esito);
          onChiudi();
        }}
      />
    </Foglio>
  );
}

// Elimina: si riscrive il titolo (come sul sito); non si può se ci sono fatture collegate.
export function FoglioEliminaPratica({
  visibile,
  onChiudi,
  pratica,
  onEliminata,
}: Base & { onEliminata: () => void }) {
  const { azioni } = useStudio();
  const { t } = useTesti();
  const [titolo, setTitolo] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  useRiapertura(visibile, () => {
    setTitolo('');
    setErrore(null);
  });
  const uguale = titolo.trim() === pratica.titolo;
  return (
    <Foglio visibile={visibile} onChiudi={onChiudi}>
      <View style={{ gap: 6 }}>
        <Testo tipo="dS">{t('studio.fogli.elimina.titolo')}</Testo>
        <Testo tipo="small" colore={colori.fg2}>
          {t('studio.fogli.elimina.testo')}
        </Testo>
      </View>
      <Campo
        etichetta={t('studio.fogli.elimina.conferma', { titolo: pratica.titolo })}
        value={titolo}
        onChangeText={(testo) => {
          setTitolo(testo);
          setErrore(null);
        }}
        autoCapitalize="none"
      />
      {errore ? <Avviso testo={errore} /> : null}
      <Pulsante
        titolo={t('studio.fogli.elimina.elimina')}
        variante="pericolo"
        disabilitato={!uguale}
        onPress={() => {
          if (azioni.eliminaPratica(pratica.id) === 'fatture') {
            setErrore(t('studio.fogli.elimina.fatture'));
            return;
          }
          onEliminata();
        }}
      />
      <Pulsante titolo={t('comune.annulla')} variante="tenue" onPress={onChiudi} />
    </Foglio>
  );
}

const giorniScorciatoie = [10, 20, 30, 60];

// Termine personalizzato (nome e scadenza): finisce anche in calendario, alle 9:00.
// Il calcolo dei termini standard (tabella `tipi_termini`, funzione `calcola_termine`) arriva con i dati veri.
export function FoglioTermine({ visibile, onChiudi, pratica }: Base) {
  const { azioni } = useStudio();
  const { t } = useTesti();
  const [titolo, setTitolo] = useState('');
  const [evento, setEvento] = useState('');
  const [data, setData] = useState('');
  useRiapertura(visibile, () => {
    setTitolo('');
    setEvento('');
    setData('');
  });
  const scadenza = leggiData(data);
  const scorciatoieTermine = giorniScorciatoie.map((n) => ({
    titolo: t('studio.fogli.termine.traGiorni', { n }),
    giorni: n,
  }));
  return (
    <Foglio visibile={visibile} onChiudi={onChiudi}>
      <View style={{ gap: 6 }}>
        <Testo tipo="dS">{t('studio.fogli.termine.titolo')}</Testo>
        <Testo tipo="small" colore={colori.fg2}>
          {t('studio.fogli.termine.testo')}
        </Testo>
      </View>
      <Campo
        etichetta={t('studio.fogli.termine.campo')}
        placeholder={t('studio.fogli.termine.esempio')}
        value={titolo}
        onChangeText={setTitolo}
      />
      <Campo
        etichetta={t('studio.fogli.termine.evento')}
        placeholder={t('studio.fogli.termine.eventoEsempio')}
        value={evento}
        onChangeText={setEvento}
      />
      <CampoData
        etichetta={t('studio.fogli.termine.scadenza')}
        valore={data}
        onCambia={setData}
        scorciatoie={scorciatoieTermine}
      />
      {data && !scadenza ? (
        <Testo tipo="small" colore={colori.danger}>
          {t('studio.fogli.termine.dataErrata')}
        </Testo>
      ) : null}
      <Pulsante
        titolo={t('studio.fogli.termine.aggiungi')}
        disabilitato={!titolo.trim() || !scadenza}
        onPress={() => {
          if (!scadenza) return;
          azioni.aggiungiTermine(pratica.id, {
            titolo: titolo.trim(),
            scadenza: scadenza.toISOString(),
            evento: evento.trim() || undefined,
          });
          onChiudi();
        }}
      />
    </Foglio>
  );
}

// Nuova udienza programmata: crea anche l'evento in calendario.
export function FoglioUdienza({ visibile, onChiudi, pratica }: Base) {
  const { azioni } = useStudio();
  const { t } = useTesti();
  const [tipo, setTipo] = useState('');
  const [data, setData] = useState('');
  const [orario, setOrario] = useState('09:30');
  const [sede, setSede] = useState('');
  useRiapertura(visibile, () => {
    setTipo('');
    setData('');
    setOrario('09:30');
    setSede('');
  });
  const giorno = leggiData(data);
  const hm = leggiOra(orario);
  return (
    <Foglio visibile={visibile} onChiudi={onChiudi}>
      <Testo tipo="dS">{t('studio.fogli.udienza.titolo')}</Testo>
      <Campo
        etichetta={t('studio.fogli.udienza.tipo')}
        placeholder={t('studio.fogli.udienza.tipoEsempio')}
        value={tipo}
        onChangeText={setTipo}
      />
      <CampoData etichetta={t('studio.fogli.udienza.data')} valore={data} onCambia={setData} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <CampoOra etichetta={t('studio.fogli.udienza.ora')} valore={orario} onCambia={setOrario} />
      </View>
      <Campo
        etichetta={t('studio.fogli.udienza.sede')}
        placeholder={t('studio.fogli.udienza.sedeEsempio')}
        value={sede}
        onChangeText={setSede}
      />
      <Pulsante
        titolo={t('studio.fogli.udienza.aggiungi')}
        disabilitato={!tipo.trim() || !giorno || !hm}
        onPress={() => {
          if (!giorno || !hm) return;
          giorno.setHours(hm[0], hm[1], 0, 0);
          azioni.aggiungiUdienza(pratica.id, {
            tipo: tipo.trim(),
            dataOra: giorno.toISOString(),
            sede: sede.trim() || undefined,
          });
          onChiudi();
        }}
      />
    </Foglio>
  );
}

// Nuova controparte, in breve. Il modulo completo del sito (anagrafica, rappresentante, contatti)
// arriva con i dati veri, diviso in sezioni.
export function FoglioControparte({ visibile, onChiudi, pratica }: Base) {
  const { azioni } = useStudio();
  const { t, lingua } = useTesti();
  const [giuridica, setGiuridica] = useState<'fisica' | 'giuridica'>('fisica');
  const [nome, setNome] = useState('');
  const [ruolo, setRuolo] = useState<string | null>(null);
  const [legale, setLegale] = useState('');
  useRiapertura(visibile, () => {
    setGiuridica('fisica');
    setNome('');
    setRuolo(null);
    setLegale('');
  });
  return (
    <Foglio visibile={visibile} onChiudi={onChiudi}>
      <Testo tipo="dS">{t('studio.fogli.controparte.titolo')}</Testo>
      <Scelta
        voci={[
          { valore: 'fisica', titolo: t('studio.fogli.controparte.fisica') },
          { valore: 'giuridica', titolo: t('studio.fogli.controparte.giuridica') },
        ]}
        valore={giuridica}
        onCambia={setGiuridica}
        etichettaGruppo={t('studio.fogli.controparte.tipoPersona')}
      />
      <Campo
        etichetta={
          giuridica === 'giuridica'
            ? t('studio.fogli.controparte.ragioneSociale')
            : t('studio.fogli.controparte.nomeCognome')
        }
        value={nome}
        onChangeText={setNome}
      />
      <View style={{ gap: 8 }}>
        <Testo tipo="small" colore={colori.fg2}>
          {t('studio.fogli.controparte.ruolo')}
        </Testo>
        <Scelta
          voci={ruoliProcessuali.map((r) => ({ valore: r, titolo: nomeRuolo(r, lingua) }))}
          valore={ruolo}
          onCambia={setRuolo}
          etichettaGruppo={t('studio.fogli.controparte.ruolo')}
        />
      </View>
      <Campo
        etichetta={t('studio.fogli.controparte.legale')}
        placeholder={t('studio.fogli.controparte.legaleEsempio')}
        value={legale}
        onChangeText={setLegale}
      />
      <Pulsante
        titolo={t('studio.fogli.controparte.aggiungi')}
        disabilitato={!nome.trim() || !ruolo}
        onPress={() => {
          if (!ruolo) return;
          azioni.aggiungiControparte(pratica.id, {
            nome: nome.trim(),
            giuridica: giuridica === 'giuridica',
            ruolo,
            legale: legale.trim() || undefined,
          });
          onChiudi();
        }}
      />
    </Foglio>
  );
}
