import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BarraAzioni, Pallino } from '@/componenti/Elementi';
import { BottoneIndietro, Intestazione } from '@/componenti/Intestazione';
import { BollaDomanda, FirmaLex, RispostaLex } from '@/componenti/Lex';
import { Pulsante } from '@/componenti/Pulsante';
import { Schermata } from '@/componenti/Schermata';
import { StatoVuoto } from '@/componenti/Stati';
import { Testo } from '@/componenti/Testo';
import { trovaNorma } from '@/dati-finti/banca-dati';
import { messaggiDi } from '@/dati-finti/ricerche';
import { FoglioNorma } from '@/fogli/FoglioNorma';
import { FoglioNuovaChat } from '@/fogli/FoglioNuovaChat';
import { indietro, useVaiASezione } from '@/navigazione';
import { useStato } from '@/stato/Stato';
import { colori } from '@/tema';

// D1 · Una chat salvata, aperta da Ricerche: si legge qui, con «indietro» che torna all'etichetta.
// «Continua la chat» la porta nella chat di Lex (avvisando se quella in corso non è salvata).
export default function ChatSalvata() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { elementiAttivi, etichetteAttive, chat, chatDaSalvare, azioni } = useStato();
  const vai = useVaiASezione();
  const [norma, setNorma] = useState<string | null>(null);
  const [avviso, setAvviso] = useState(false);

  const elemento = elementiAttivi.find((e) => e.id === id && e.tipo === 'Chat con Lex');
  const etichetta = etichetteAttive.find((e) => e.id === elemento?.etichetta);
  const ripiego = etichetta
    ? ({ pathname: '/ricerche', params: { etichetta: etichetta.id } } as const)
    : ('/ricerche' as const);

  const apri = () => {
    if (!elemento) return;
    azioni.apriChatSalvata(elemento);
    vai('/chat');
  };

  return (
    <Schermata>
      <Intestazione
        sinistra={<BottoneIndietro ripiego={ripiego} etichetta="Torna a Ricerche" />}
        titolo={elemento?.titolo ?? 'Chat salvata'}
      />
      {!elemento ? (
        <StatoVuoto
          icona="segnalibro"
          titolo="Questa chat non c'è più"
          testo="Forse l'hai tolta dall'etichetta, qui o sul sito."
          azione={{ titolo: 'Torna a Ricerche', onPress: () => indietro(ripiego) }}
        />
      ) : (
        <>
          <ScrollView contentContainerStyle={stili.chat}>
            {etichetta ? (
              <View style={stili.dove}>
                <Pallino colore={etichetta.colore} />
                <Testo tipo="small" colore={colori.fg2}>
                  Salvata in «{etichetta.nome}» · {elemento.quando}
                </Testo>
              </View>
            ) : null}
            {messaggiDi(elemento).map((m) =>
              m.da === 'io' ? (
                <BollaDomanda key={m.id} testo={m.testo} />
              ) : m.da === 'lex' ? (
                <View key={m.id} style={{ gap: 12 }}>
                  <FirmaLex />
                  <RispostaLex risposta={m.risposta} onCitazione={setNorma} />
                </View>
              ) : null,
            )}
          </ScrollView>
          <BarraAzioni>
            <Pulsante
              titolo="Continua la chat"
              icona="stella"
              stile={{ flex: 1 }}
              onPress={() => (chatDaSalvare ? setAvviso(true) : apri())}
            />
          </BarraAzioni>
        </>
      )}

      <FoglioNorma
        norma={norma ? trovaNorma(norma) : null}
        onChiudi={() => setNorma(null)}
        onApriLegge={(leggeId) => {
          setNorma(null);
          router.push({ pathname: '/legge/[id]', params: { id: leggeId } });
        }}
      />
      <FoglioNuovaChat
        visibile={avviso}
        titoloChat={chat.titolo}
        apre={elemento?.titolo}
        onChiudi={() => setAvviso(false)}
        onSalva={() => {
          setAvviso(false);
          vai('/chat', { foglio: 'salva' });
        }}
        onNuova={() => {
          setAvviso(false);
          apri();
        }}
      />
    </Schermata>
  );
}

const stili = StyleSheet.create({
  chat: { gap: 20, paddingTop: 6, paddingHorizontal: 20, paddingBottom: 16 },
  dove: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
