import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';

import { CampoCerca } from '@/componenti/Campi';
import { Pallino } from '@/componenti/Elementi';
import { Foglio } from '@/componenti/Foglio';
import { Icona } from '@/componenti/Icona';
import { Pulsante } from '@/componenti/Pulsante';
import { Riga } from '@/componenti/Riga';
import { Testo } from '@/componenti/Testo';
import { useTesti } from '@/lingue/useTesti';
import { strumentiStudio } from '@/ruoli';
import { Scelta } from '@/studio/Campi';
import { useStato } from '@/stato/Stato';
import { useStudio } from '@/stato/Studio';
import { colori } from '@/tema';

type Props = {
  visibile: boolean;
  onChiudi: () => void;
  onSalvata: (etichettaId: string) => void;
};

const NESSUNA = '__nessuna';

// B7 · Salva la chat in Ricerche, scegliendo o creando un'etichetta.
export function FoglioSalva({ visibile, onChiudi, onSalvata }: Props) {
  const { etichetteAttive, elementiAttivi, azioni, chat, paese, ruoli } = useStato();
  const studio = useStudio();
  // L'avvocato può collegare la chat anche a una pratica («Salva in pratica» del sito, `ricerche.pratica_id`).
  const conPratiche = strumentiStudio(ruoli[paese] ?? 'user').includes('mandati');
  const aperte = studio.pratiche.filter((p) => p.stato === 'aperta');
  const [pratica, setPratica] = useState<string>(NESSUNA);
  const { t } = useTesti();
  const [scelta, setScelta] = useState<string | null>(etichetteAttive[0]?.id ?? null);
  const [testo, setTesto] = useState('');
  const campo = useRef<TextInput>(null);
  const [eraVisibile, setEraVisibile] = useState(visibile);
  // a ogni apertura il campo di ricerca riparte vuoto
  if (visibile !== eraVisibile) {
    setEraVisibile(visibile);
    if (visibile) {
      setTesto('');
      setPratica(NESSUNA);
      if (!scelta) setScelta(etichetteAttive[0]?.id ?? null);
    }
  }

  const filtro = testo.trim().toLowerCase();
  const visibili = etichetteAttive.filter((e) => e.nome.toLowerCase().includes(filtro));
  const esiste = etichetteAttive.some((e) => e.nome.toLowerCase() === filtro);
  const nomeScelta = etichetteAttive.find((e) => e.id === scelta)?.nome;

  const nuova = () => {
    if (!filtro || esiste) {
      campo.current?.focus();
      return;
    }
    const e = azioni.creaEtichetta(testo);
    setScelta(e.id);
    setTesto('');
  };

  return (
    <Foglio visibile={visibile} onChiudi={onChiudi}>
      <View style={{ gap: 6 }}>
        <Testo tipo="dS">{t('chat.salva.titolo')}</Testo>
        <Testo tipo="small" colore={colori.fg2}>
          {t('chat.salva.testo')}
        </Testo>
      </View>
      <CampoCerca
        ref={campo}
        etichetta={t('chat.salva.cerca')}
        placeholder={t('chat.salva.segnaposto')}
        alto={46}
        value={testo}
        onChangeText={setTesto}
        onSubmitEditing={nuova}
      />
      <View
        style={{ marginHorizontal: -20 }}
        accessibilityRole="radiogroup"
        accessibilityLabel={t('chat.salva.gruppo')}
      >
        {visibili.map((e) => {
          const on = e.id === scelta;
          const quanti = elementiAttivi.filter((x) => x.etichetta === e.id).length;
          return (
            <Riga
              key={e.id}
              stretta
              ruolo="radio"
              selezionata={on}
              evidenziata={on}
              sinistra={<Pallino colore={e.colore} />}
              titolo={e.nome}
              sottotitolo={
                quanti === 1 ? t('chat.salva.elementoUno') : t('chat.salva.elementiMolti', { n: quanti })
              }
              destra={on ? <Icona nome="spunta" dimensione={18} colore={colori.accentText} /> : null}
              onPress={() => setScelta(e.id)}
            />
          );
        })}
        <Riga
          stretta
          sinistra={<Icona nome="piu" dimensione={18} colore={colori.accentText} />}
          titolo={filtro && !esiste ? t('chat.salva.crea', { nome: testo.trim() }) : t('chat.salva.nuova')}
          titoloStile={{ color: colori.accentText }}
          onPress={nuova}
        />
      </View>
      {conPratiche && aperte.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Testo tipo="small" colore={colori.fg2}>
            {t('documenti.ricerca.pratica')}
          </Testo>
          <Scelta
            voci={[
              { valore: NESSUNA, titolo: t('documenti.ricerca.nessuna') },
              ...aperte.map((p) => ({ valore: p.id, titolo: p.titolo })),
            ]}
            valore={pratica}
            onCambia={setPratica}
            etichettaGruppo={t('documenti.ricerca.pratica')}
          />
        </View>
      ) : null}
      <Pulsante
        titolo={nomeScelta ? t('chat.salva.salvaIn', { nome: nomeScelta }) : t('chat.salva.scegli')}
        disabilitato={!scelta}
        onPress={() => {
          if (!scelta) return;
          azioni.salvaChat(scelta);
          if (pratica !== NESSUNA)
            studio.azioni.collegaRicerca(pratica, {
              titolo: chat.titolo ?? 'Chat con Lex',
              tipo: 'Chat con Lex',
            });
          onSalvata(scelta);
        }}
      />
      <Testo tipo="cap">{t('chat.salva.nota')}</Testo>
    </Foglio>
  );
}
