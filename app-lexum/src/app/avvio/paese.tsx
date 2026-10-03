import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BadgePaese, ElencoDefinizioni, Logo } from '@/componenti/Elementi';
import { Icona } from '@/componenti/Icona';
import { Pulsante } from '@/componenti/Pulsante';
import { Scelta } from '@/componenti/Scelta';
import { Schermata } from '@/componenti/Schermata';
import { Testo } from '@/componenti/Testo';
import { contenuti } from '@/paesi/contenuti';
import { paesePredefinito, paesi } from '@/paesi/registro';
import { useStato } from '@/stato/Stato';
import { colori, famiglie } from '@/tema';

// A0 · Scegli il paese. Ogni paese ha la sua banca dati e il suo account.
// Il paese proposto sarà quello della regione del telefono (tappa 2); per ora è il primo del registro.
export default function SceltaPaese() {
  const { paese, azioni } = useStato();
  const [scelto, setScelto] = useState(paese);
  const [aperti, setAperti] = useState<Record<string, boolean>>({});
  const proposto = contenuti[paesePredefinito];

  return (
    <Schermata hero alone={20}>
      <ScrollView contentContainerStyle={stili.scorre} bounces={false}>
        <View style={stili.logo}>
          <Logo medio />
        </View>
        <View style={{ flex: 1, minHeight: 24 }} />
        <View style={stili.testi}>
          <Testo tipo="dL" accessibilityRole="header">
            Scegli il paese
          </Testo>
          <Testo colore={colori.fg2}>
            Ogni paese ha la sua banca dati e il suo account. Puoi cambiare quando vuoi dal Profilo.
          </Testo>
        </View>
        <View style={{ gap: 10 }} accessibilityRole="radiogroup" accessibilityLabel="Paese">
          {paesi.map((p) => {
            const testi = contenuti[p.codice];
            const aperto = !!aperti[p.codice];
            return (
              <Scelta
                key={p.codice}
                attiva={p.codice === scelto}
                onPress={() => setScelto(p.codice)}
                sinistra={<BadgePaese codice={p.codice} />}
                titolo={p.nome}
                sottotitolo={testi.diritto}
                grande
                sotto={
                  <View style={stili.fonti}>
                    <Pressable
                      onPress={() => setAperti((a) => ({ ...a, [p.codice]: !aperto }))}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: aperto }}
                      accessibilityLabel={`${testi.totaleDocumenti}. ${aperto ? 'Chiudi' : 'Espandi'} l'elenco delle fonti`}
                      style={stili.sommario}
                    >
                      <Text style={stili.totale}>{testi.totaleDocumenti}</Text>
                      <View style={stili.espandi}>
                        <Text style={stili.espandiTesto}>{aperto ? 'Chiudi' : 'Espandi'}</Text>
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
        <Testo tipo="cap" style={{ paddingTop: 14 }}>
          Ti proponiamo {proposto.conArticolo} perché è il paese impostato sul telefono.
        </Testo>
        <Pulsante
          titolo="Continua"
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
