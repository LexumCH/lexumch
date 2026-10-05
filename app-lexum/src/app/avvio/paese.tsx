import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BadgePaese, ElencoDefinizioni, Logo } from '@/componenti/Elementi';
import { Icona } from '@/componenti/Icona';
import { Pulsante } from '@/componenti/Pulsante';
import { Scelta } from '@/componenti/Scelta';
import { Schermata } from '@/componenti/Schermata';
import { Testo } from '@/componenti/Testo';
import { regioneTelefono } from '@/lingue';
import { useTesti } from '@/lingue/useTesti';
import { contenutiIn } from '@/paesi/contenuti';
import { paesePredefinito, paesi } from '@/paesi/registro';
import { useStato } from '@/stato/Stato';
import { colori, famiglie } from '@/tema';

// A0 · Scegli il paese. Ogni paese ha la sua banca dati e il suo account.
// Propone il paese della regione del telefono (se è nel registro) ed è nella lingua del telefono:
// su un telefono in tedesco o in francese si legge in tedesco o in francese (testi approvati).
export default function SceltaPaese() {
  const { azioni } = useStato();
  const { t, lingua } = useTesti('telefono');
  const regione = regioneTelefono();
  const proposto = paesi.some((p) => p.codice === regione) ? regione : null;
  const [scelto, setScelto] = useState(proposto ?? paesePredefinito);
  const [aperti, setAperti] = useState<Record<string, boolean>>({});

  return (
    <Schermata hero alone={20}>
      <ScrollView contentContainerStyle={stili.scorre} bounces={false}>
        <View style={stili.logo}>
          <Logo medio />
        </View>
        <View style={{ flex: 1, minHeight: 24 }} />
        <View style={stili.testi}>
          <Testo tipo="dL" accessibilityRole="header">
            {t('avvio.paese.titolo')}
          </Testo>
          <Testo colore={colori.fg2}>{t('avvio.paese.testo')}</Testo>
        </View>
        <View style={{ gap: 10 }} accessibilityRole="radiogroup" accessibilityLabel={t('avvio.paese.gruppo')}>
          {paesi.map((p) => {
            const testi = contenutiIn(p.codice, lingua);
            const aperto = !!aperti[p.codice];
            return (
              <Scelta
                key={p.codice}
                attiva={p.codice === scelto}
                onPress={() => setScelto(p.codice)}
                sinistra={<BadgePaese codice={p.codice} />}
                titolo={t(`paesi.${p.codice as 'IT' | 'CH'}`)}
                sottotitolo={testi.diritto}
                grande
                sotto={
                  <View style={stili.fonti}>
                    <Pressable
                      onPress={() => setAperti((a) => ({ ...a, [p.codice]: !aperto }))}
                      accessibilityRole="button"
                      aria-expanded={aperto}
                      accessibilityLabel={t('avvio.paese.etichettaFonti', {
                        totale: testi.totaleDocumenti,
                        azione: aperto ? t('comune.chiudi') : t('comune.espandi'),
                      })}
                      style={stili.sommario}
                    >
                      <Text style={stili.totale}>{testi.totaleDocumenti}</Text>
                      <View style={stili.espandi}>
                        <Text style={stili.espandiTesto}>
                          {aperto ? t('comune.chiudi') : t('comune.espandi')}
                        </Text>
                        <Icona nome={aperto ? 'su' : 'giu'} dimensione={16} colore={colori.accentText} />
                      </View>
                    </Pressable>
                    {aperto ? (
                      <ElencoDefinizioni
                        voci={testi.elencoFonti}
                        piccolo
                        evidenziaTermini
                        larghezzaTermine={112}
                        stile={{ marginBottom: 12, gap: 9 }}
                      />
                    ) : null}
                  </View>
                }
              />
            );
          })}
        </View>
        {proposto ? (
          <Testo tipo="cap" style={{ paddingTop: 14 }}>
            {t(`avvio.paese.proposta.${proposto as 'IT' | 'CH'}`)}
          </Testo>
        ) : null}
        <Pulsante
          titolo={t('comune.continua')}
          stile={{ marginTop: 14 }}
          onPress={() => {
            azioni.scegliPaese(scelto);
            router.push('/avvio/benvenuto');
          }}
        />
      </ScrollView>
    </Schermata>
  );
}

const stili = StyleSheet.create({
  scorre: { flexGrow: 1, paddingHorizontal: 24 },
  logo: { alignItems: 'center', gap: 12, paddingTop: 18 },
  testi: { gap: 10, paddingBottom: 16 },
  fonti: { borderTopWidth: 1, borderTopColor: colori.line },
  sommario: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  totale: { fontFamily: famiglie.testo, fontSize: 14, color: colori.fg },
  espandi: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  espandiTesto: { fontFamily: famiglie.testoMedio, fontSize: 14, color: colori.accentText },
});
