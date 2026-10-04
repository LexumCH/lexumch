import { useState } from 'react';
import { View } from 'react-native';

import { Campo } from '@/componenti/Campi';
import { Avviso } from '@/componenti/Elementi';
import { Foglio } from '@/componenti/Foglio';
import { Pulsante } from '@/componenti/Pulsante';
import { Testo } from '@/componenti/Testo';
import { esiti, type Esito, type Pratica } from '@/dati-finti/studio';
import { CampoData, CampoOra, Scelta, leggiData, leggiOra, useRiapertura } from '@/studio/Campi';
import { ruoliProcessuali } from '@/studio/pratiche';
import { useStudio } from '@/stato/Studio';
import { colori } from '@/tema';

// Fogli del dettaglio pratica (come le finestre del sito, ma dal basso).

type Base = { visibile: boolean; onChiudi: () => void; pratica: Pratica };

// Note interne: le vede solo lo studio, Lex non le legge.
export function FoglioNotePratica({ visibile, onChiudi, pratica }: Base) {
  const { azioni } = useStudio();
  const [testo, setTesto] = useState(pratica.note ?? '');
  useRiapertura(visibile, () => setTesto(pratica.note ?? ''));
  return (
    <Foglio visibile={visibile} onChiudi={onChiudi}>
      <View style={{ gap: 6 }}>
        <Testo tipo="dS">Note interne</Testo>
        <Testo tipo="small" colore={colori.fg2}>
          Le vedi solo tu (e lo studio). Lex non le legge.
        </Testo>
      </View>
      <Campo etichetta="Note" value={testo} onChangeText={setTesto} multiline />
      <Pulsante
        titolo="Salva le note"
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
  const [esito, setEsito] = useState<Esito | null>(null);
  useRiapertura(visibile, () => setEsito(null));
  return (
    <Foglio visibile={visibile} onChiudi={onChiudi}>
      <View style={{ gap: 6 }}>
        <Testo tipo="dS">Chiudi la pratica</Testo>
        <Testo tipo="small" colore={colori.fg2}>
          Scegli l'esito. Potrai riaprirla quando vuoi.
        </Testo>
      </View>
      <Scelta voci={esiti} valore={esito} onCambia={setEsito} etichettaGruppo="Esito" />
      <Pulsante
        titolo="Conferma la chiusura"
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
        <Testo tipo="dS">Eliminare la pratica?</Testo>
        <Testo tipo="small" colore={colori.fg2}>
          Si cancellano anche udienze, termini, controparti, ricerche e appuntamenti. I documenti
          dell'Archivio restano. Non si può annullare.
        </Testo>
      </View>
      <Campo
        etichetta={`Per confermare, scrivi: ${pratica.titolo}`}
        value={titolo}
        onChangeText={(t) => {
          setTitolo(t);
          setErrore(null);
        }}
        autoCapitalize="none"
      />
      {errore ? <Avviso testo={errore} /> : null}
      <Pulsante
        titolo="Elimina la pratica"
        variante="pericolo"
        disabilitato={!uguale}
        onPress={() => {
          if (azioni.eliminaPratica(pratica.id) === 'fatture') {
            setErrore('Ci sono fatture collegate a questa pratica: scollegale prima, dalla fattura.');
            return;
          }
          onEliminata();
        }}
      />
      <Pulsante titolo="Annulla" variante="tenue" onPress={onChiudi} />
    </Foglio>
  );
}

const scorciatoieTermine = [
  { titolo: 'Tra 10 giorni', giorni: 10 },
  { titolo: 'Tra 20 giorni', giorni: 20 },
  { titolo: 'Tra 30 giorni', giorni: 30 },
  { titolo: 'Tra 60 giorni', giorni: 60 },
];

// Termine personalizzato (nome e scadenza): finisce anche in calendario, alle 9:00.
// Il calcolo dei termini standard (tabella `tipi_termini`, funzione `calcola_termine`) arriva con i dati veri.
export function FoglioTermine({ visibile, onChiudi, pratica }: Base) {
  const { azioni } = useStudio();
  const [titolo, setTitolo] = useState('');
  const [evento, setEvento] = useState('');
  const [data, setData] = useState('');
  useRiapertura(visibile, () => {
    setTitolo('');
    setEvento('');
    setData('');
  });
  const scadenza = leggiData(data);
  return (
    <Foglio visibile={visibile} onChiudi={onChiudi}>
      <View style={{ gap: 6 }}>
        <Testo tipo="dS">Nuovo termine</Testo>
        <Testo tipo="small" colore={colori.fg2}>
          Compare anche in calendario, il giorno della scadenza.
        </Testo>
      </View>
      <Campo
        etichetta="Termine"
        placeholder="Es. Deposito memoria di replica"
        value={titolo}
        onChangeText={setTitolo}
      />
      <Campo
        etichetta="Da quale evento (facoltativo)"
        placeholder="Es. Notifica della sentenza"
        value={evento}
        onChangeText={setEvento}
      />
      <CampoData etichetta="Scadenza" valore={data} onCambia={setData} scorciatoie={scorciatoieTermine} />
      {data && !scadenza ? (
        <Testo tipo="small" colore={colori.danger}>
          Scrivi la data come gg.mm.aaaa.
        </Testo>
      ) : null}
      <Pulsante
        titolo="Aggiungi il termine"
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
      <Testo tipo="dS">Nuova udienza</Testo>
      <Campo
        etichetta="Tipo di udienza"
        placeholder="Es. Prima comparizione"
        value={tipo}
        onChangeText={setTipo}
      />
      <CampoData etichetta="Data" valore={data} onCambia={setData} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <CampoOra etichetta="Ora" valore={orario} onCambia={setOrario} />
      </View>
      <Campo
        etichetta="Sede (facoltativa)"
        placeholder="Tribunale, sezione, aula"
        value={sede}
        onChangeText={setSede}
      />
      <Pulsante
        titolo="Aggiungi l'udienza"
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
      <Testo tipo="dS">Nuova controparte</Testo>
      <Scelta
        voci={[
          { valore: 'fisica', titolo: 'Persona fisica' },
          { valore: 'giuridica', titolo: 'Persona giuridica' },
        ]}
        valore={giuridica}
        onCambia={setGiuridica}
        etichettaGruppo="Tipo di persona"
      />
      <Campo
        etichetta={giuridica === 'giuridica' ? 'Ragione sociale' : 'Nome e cognome'}
        value={nome}
        onChangeText={setNome}
      />
      <View style={{ gap: 8 }}>
        <Testo tipo="small" colore={colori.fg2}>
          Ruolo processuale
        </Testo>
        <Scelta
          voci={ruoliProcessuali}
          valore={ruolo}
          onCambia={setRuolo}
          etichettaGruppo="Ruolo processuale"
        />
      </View>
      <Campo
        etichetta="Legale avversario (facoltativo)"
        placeholder="Es. Avv. Paolo Neri, foro di Milano"
        value={legale}
        onChangeText={setLegale}
      />
      <Pulsante
        titolo="Aggiungi la controparte"
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
