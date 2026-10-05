import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { CampoCerca } from '@/componenti/Campi';
import { BarraAzioni, Separatore } from '@/componenti/Elementi';
import { Icona } from '@/componenti/Icona';
import { BottoneIndietro, Intestazione } from '@/componenti/Intestazione';
import { Pulsante, PulsanteIcona } from '@/componenti/Pulsante';
import { Riga } from '@/componenti/Riga';
import { Schermata } from '@/componenti/Schermata';
import { Testo } from '@/componenti/Testo';
import { leggiFinte, trovaNorma, type Articolo } from '@/dati-finti/banca-dati';
import { FoglioNorma } from '@/fogli/FoglioNorma';
import { useTesti } from '@/lingue/useTesti';
import { indietro, useVaiASezione } from '@/navigazione';
import { useStato } from '@/stato/Stato';
import { colori, famiglie } from '@/tema';

type Props = { leggeId: string; daChat?: boolean };

// C4 · Sfoglia una legge (dalla Banca dati) e C6 · Legge aperta dalla chat.
// Dalla chat la legge si apre sopra: «indietro» torna alla chat, che resta com'era.
export function SchermataLegge({ leggeId, daChat }: Props) {
  const { chat } = useStato();
  const { t } = useTesti();
  const vai = useVaiASezione();
  const legge = leggiFinte[leggeId];
  const [filtro, setFiltro] = useState('');
  const [aperti, setAperti] = useState<Record<string, boolean>>(() =>
    Object.fromEntries((legge?.gruppi ?? []).map((g) => [g.titolo, g.aperto])),
  );
  const [norma, setNorma] = useState<string | null>(null);

  // Le norme citate da Lex nella chat in corso.
  const citate = useMemo(() => {
    const ids = new Set<string>();
    for (const m of chat.messaggi) {
      if (m.da !== 'lex') continue;
      for (const p of m.risposta.punti) for (const x of p.testo) if (typeof x !== 'string') ids.add(x.norma);
    }
    return ids;
  }, [chat.messaggi]);

  if (!legge) {
    return (
      <Schermata>
        <Intestazione
          sinistra={<BottoneIndietro ripiego={daChat ? '/chat' : '/banca-dati'} />}
          titolo={t('bancaDati.legge.titolo')}
        />
        <Testo colore={colori.fg2} style={{ padding: 20 }}>
          {t('bancaDati.legge.assente')}
        </Testo>
      </Schermata>
    );
  }

  const q = filtro.trim().toLowerCase();
  const corrisponde = (a: Articolo) =>
    !q || a.numero.toLowerCase().includes(q) || a.rubrica.toLowerCase().includes(q);
  const citato = (a: Articolo) => citate.has(a.norma) || !!a.alias?.some((x) => citate.has(x));
  const titoloChat = chat.titolo ?? t('interfaccia.voci.nuovaChat');

  return (
    <Schermata>
      <Intestazione
        sinistra={
          <BottoneIndietro
            ripiego={daChat ? '/chat' : '/banca-dati'}
            etichetta={daChat ? t('bancaDati.legge.tornaChat') : t('interfaccia.indietro')}
          />
        }
        titolo={daChat ? legge.sigla : legge.sezione}
        destra={
          <PulsanteIcona
            icona={daChat ? 'etichetta' : 'segnalibro'}
            etichetta={daChat ? t('bancaDati.legge.salvaEtichetta') : t('bancaDati.legge.salva')}
            dimensione={20}
          />
        }
      />
      <View style={stili.testa}>
        <View style={stili.briciole}>
          {daChat ? (
            <Text style={stili.briciolaTesto}>{t('bancaDati.legge.apertaDa', { titolo: titoloChat })}</Text>
          ) : (
            legge.briciole.map((b, i) => (
              <View key={b} style={stili.briciola}>
                {i > 0 ? <Icona nome="avanti" dimensione={14} colore={colori.fg3} /> : null}
                <Text style={stili.briciolaTesto}>{b}</Text>
              </View>
            ))
          )}
        </View>
        <Testo tipo="dM" accessibilityRole="header">
          {legge.titolo}
        </Testo>
        <Testo tipo="small" colore={colori.fg2}>
          {legge.descrizione}
        </Testo>
        {daChat ? null : (
          <CampoCerca
            etichetta={t('bancaDati.legge.cerca')}
            placeholder={t('bancaDati.legge.segnaposto')}
            alto={46}
            value={filtro}
            onChangeText={setFiltro}
            onCancella={() => setFiltro('')}
            stile={{ marginTop: 4 }}
          />
        )}
      </View>
      <Separatore />

      <ScrollView style={{ flex: 1 }}>
        {legge.gruppi.map((g) => {
          const articoli = g.articoli.filter(corrisponde);
          if (q && articoli.length === 0) return null;
          const aperto = !!q || !!aperti[g.titolo];
          return (
            <View key={g.titolo}>
              <Riga
                altezza={48}
                stile={{ paddingVertical: 8 }}
                sfondo={aperto ? colori.bg2 : undefined}
                titolo={
                  <Text
                    style={[
                      stili.capo,
                      aperto && { color: colori.accentText, fontFamily: famiglie.testoMedio },
                    ]}
                  >
                    {g.titolo}
                  </Text>
                }
                freccia={aperto ? 'su' : 'giu'}
                onPress={() => setAperti((a) => ({ ...a, [g.titolo]: !aperto }))}
                etichetta={t(aperto ? 'bancaDati.legge.chiudi' : 'bancaDati.legge.apri', {
                  titolo: g.titolo,
                })}
              />
              {aperto
                ? articoli.map((a) => {
                    const c = citato(a);
                    return (
                      <Riga
                        key={a.numero}
                        evidenziata={c}
                        sinistra={<Text style={stili.numero}>{a.numero}</Text>}
                        titolo={a.rubrica}
                        sottotitolo={
                          c
                            ? daChat
                              ? t('bancaDati.legge.citatoQui')
                              : t('bancaDati.legge.citatoUltima')
                            : undefined
                        }
                        onPress={() => setNorma(a.norma)}
                        etichetta={t('bancaDati.legge.articolo', { numero: a.numero, rubrica: a.rubrica })}
                      />
                    );
                  })
                : null}
            </View>
          );
        })}
      </ScrollView>

      {daChat ? (
        <BarraAzioni stile={{ flexDirection: 'column', gap: 6 }}>
          <Pulsante
            titolo={t('bancaDati.legge.tornaChat')}
            variante="linea"
            icona="fumetto"
            onPress={() => indietro('/chat')}
          />
          <Testo tipo="cap" centrato>
            {t('bancaDati.legge.restaAperta')}
          </Testo>
        </BarraAzioni>
      ) : null}

      <FoglioNorma
        norma={norma ? trovaNorma(norma) : null}
        eyebrow={daChat ? t('chat.norma.citata') : t('bancaDati.norma')}
        onChiudi={() => setNorma(null)}
        onSalva={() => {
          setNorma(null);
          if (daChat) router.push('/ricerche');
          else vai('/ricerche');
        }}
      />
    </Schermata>
  );
}

const stili = StyleSheet.create({
  testa: { gap: 10, paddingTop: 6, paddingHorizontal: 20, paddingBottom: 14 },
  briciole: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  briciola: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  briciolaTesto: { fontFamily: famiglie.testo, fontSize: 13, color: colori.fg3 },
  capo: { fontFamily: famiglie.testo, fontSize: 15, lineHeight: 20, color: colori.fg },
  numero: {
    minWidth: 34,
    fontFamily: famiglie.titoloSemi,
    fontSize: 20,
    color: colori.accentText,
  },
});
