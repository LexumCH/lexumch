import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge, BarraAzioni, TitoloSezione } from '@/componenti/Elementi';
import { Icona } from '@/componenti/Icona';
import { BottoneMenu, Intestazione } from '@/componenti/Intestazione';
import { Pulsante } from '@/componenti/Pulsante';
import { Riga } from '@/componenti/Riga';
import { Schermata } from '@/componenti/Schermata';
import { Caricamento } from '@/componenti/Stati';
import { Testo } from '@/componenti/Testo';
import { richiesteFinte } from '@/dati-finti/domande';
import { useStato } from '@/stato/Stato';
import { domandePer, type DomandaFrequente } from '@/testi/domande';
import { colori, famiglie } from '@/tema';

// D3 · Domande: domande frequenti (testi veri, per paese) e richieste di assistenza (ticket, tappa 6).
export default function Domande() {
  const { paese, simula } = useStato();
  // Per ora sempre in italiano: tedesco e francese arrivano con la lingua dell'app (tappa 2).
  const domande = domandePer(paese, 'it');
  const [aperta, setAperta] = useState<string | null>(null);

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
        {domande.map((d) => (
          <VoceDomanda
            key={d.domanda}
            voce={d}
            aperta={aperta === d.domanda}
            onPress={() => setAperta((a) => (a === d.domanda ? null : d.domanda))}
          />
        ))}
        <TitoloSezione>Le tue richieste</TitoloSezione>
        {simula.caricamento ? <Caricamento righe={2} /> : null}
        {(simula.caricamento ? [] : richiesteFinte).map((r) => (
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

// Una domanda frequente: si tocca e la risposta si apre sotto.
function VoceDomanda({
  voce,
  aperta,
  onPress,
}: {
  voce: DomandaFrequente;
  aperta: boolean;
  onPress: () => void;
}) {
  return (
    <View style={stili.voce}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        aria-expanded={aperta}
        style={({ pressed }) => [stili.domanda, pressed && { backgroundColor: colori.bg2 }]}
      >
        <Text style={[stili.domandaTesto, aperta && { color: colori.accentText }]}>{voce.domanda}</Text>
        <Icona nome={aperta ? 'su' : 'giu'} dimensione={18} colore={colori.fg3} />
      </Pressable>
      {aperta ? (
        <View style={stili.risposta}>
          {voce.risposta.map((paragrafo) => (
            <Testo key={paragrafo} tipo="small" colore={colori.fg2} style={{ lineHeight: 21 }}>
              {paragrafo}
            </Testo>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const stili = StyleSheet.create({
  titolo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titoloTesto: { flex: 1, fontFamily: famiglie.testo, fontSize: 16, lineHeight: 21, color: colori.fg },
  nuovo: { width: 8, height: 8, backgroundColor: colori.accent },
  voce: { borderBottomWidth: 1, borderBottomColor: colori.line },
  domanda: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  domandaTesto: { flex: 1, fontFamily: famiglie.testo, fontSize: 16, lineHeight: 21, color: colori.fg },
  risposta: { gap: 8, paddingHorizontal: 20, paddingBottom: 16 },
});
