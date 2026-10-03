import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge, BarraAzioni, TitoloSezione } from '@/componenti/Elementi';
import { BottoneMenu, Intestazione } from '@/componenti/Intestazione';
import { Pulsante } from '@/componenti/Pulsante';
import { Riga } from '@/componenti/Riga';
import { Schermata } from '@/componenti/Schermata';
import { Testo } from '@/componenti/Testo';
import { domandeFrequentiFinte, richiesteFinte } from '@/dati-finti/domande';
import { colori, famiglie } from '@/tema';

// D3 · Domande: domande frequenti e richieste di assistenza (ticket, tappa 6).
export default function Domande() {
  return (
    <Schermata>
      <Intestazione sinistra={<BottoneMenu />} titolo="Domande?" />
      <ScrollView style={{ flex: 1 }}>
        <Testo
          tipo="dM"
          style={{ paddingTop: 10, paddingHorizontal: 20, paddingBottom: 4 }}
          accessibilityRole="header"
        >
          Come possiamo aiutarti?
        </Testo>
        <TitoloSezione>Domande frequenti</TitoloSezione>
        {domandeFrequentiFinte.map((d) => (
          <Riga key={d} stretta titolo={d} freccia="giu" />
        ))}
        <TitoloSezione>Le tue richieste</TitoloSezione>
        {richiesteFinte.map((r) => (
          <Riga
            key={r.id}
            titolo={
              <View style={stili.titolo}>
                {r.nuovo ? <View style={stili.nuovo} accessibilityLabel="Risposta nuova" /> : null}
                <Text style={stili.titoloTesto}>{r.titolo}</Text>
              </View>
            }
            sottotitolo={r.aggiornato}
            destra={<Badge tono={r.aperto ? 'ok' : 'neutro'}>{r.aperto ? 'Aperto' : 'Chiuso'}</Badge>}
          />
        ))}
      </ScrollView>
      <BarraAzioni>
        <Pulsante titolo="Scrivi al supporto" icona="fumetto" stile={{ flex: 1 }} />
      </BarraAzioni>
    </Schermata>
  );
}

const stili = StyleSheet.create({
  titolo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titoloTesto: { flex: 1, fontFamily: famiglie.testo, fontSize: 16, lineHeight: 21, color: colori.fg },
  nuovo: { width: 8, height: 8, backgroundColor: colori.accent },
});
