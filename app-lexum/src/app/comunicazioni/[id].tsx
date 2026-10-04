import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Avviso, Badge } from '@/componenti/Elementi';
import { BottoneIndietro, Intestazione } from '@/componenti/Intestazione';
import { Pulsante, PulsanteIcona } from '@/componenti/Pulsante';
import { Schermata } from '@/componenti/Schermata';
import { StatoVuoto } from '@/componenti/Stati';
import { Testo } from '@/componenti/Testo';
import { useTesti } from '@/lingue/useTesti';
import { indietro } from '@/navigazione';
import { dataBreve, ora } from '@/studio/formati';
import { useStudio } from '@/stato/Studio';
import { colori, famiglie } from '@/tema';

// S13 · Conversazione con un cliente (ticket del sito: `ticket_assistenza` e `messaggi_ticket`).
// Il cliente risponde dal suo portale. Chiusa, non si scrive finché non si riapre.
export default function Conversazione() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { comunicazioni, clienti, azioni } = useStudio();
  const { t, lingua } = useTesti();
  const [testo, setTesto] = useState('');
  const scorri = useRef<ScrollView>(null);
  const ticket = comunicazioni.find((x) => x.id === id);
  const cliente = clienti.find((c) => c.id === ticket?.clienteId);
  const ripiego = cliente
    ? ({ pathname: '/clienti/[id]', params: { id: cliente.id, scheda: 'comunicazioni' } } as const)
    : ('/clienti' as const);

  if (!ticket) {
    return (
      <Schermata>
        <Intestazione
          sinistra={<BottoneIndietro ripiego="/clienti" />}
          titolo={t('clienti.messaggi.titolo')}
        />
        <StatoVuoto
          icona="fumetto"
          titolo={t('clienti.messaggi.nonCe')}
          azione={{ titolo: t('clienti.scheda.torna'), onPress: () => indietro('/clienti') }}
        />
      </Schermata>
    );
  }

  const aperto = ticket.stato === 'aperto';
  const manda = () => {
    if (!testo.trim() || !aperto) return;
    azioni.scriviNelTicket(ticket.id, testo);
    setTesto('');
    setTimeout(() => scorri.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <Schermata>
      <Intestazione
        sinistra={<BottoneIndietro ripiego={ripiego} etichetta={cliente?.nome} />}
        titolo={ticket.oggetto}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          ref={scorri}
          contentContainerStyle={stili.corpo}
          onContentSizeChange={() => scorri.current?.scrollToEnd({ animated: false })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Badge tono={aperto ? 'ok' : 'neutro'}>
              {aperto ? t('clienti.scheda.comunicazioni.aperta') : t('clienti.scheda.comunicazioni.chiusa')}
            </Badge>
            {cliente ? <Testo tipo="cap">{t('clienti.messaggi.con', { nome: cliente.nome })}</Testo> : null}
          </View>
          {ticket.messaggi.length === 0 ? (
            <Testo tipo="small" colore={colori.fg3}>
              {t('clienti.messaggi.vuoto')}
            </Testo>
          ) : null}
          {ticket.messaggi.map((m) => {
            const mio = m.da === 'studio';
            return (
              <View key={m.id} style={[stili.bolla, mio ? stili.mia : stili.sua]}>
                <Text style={stili.autore}>
                  {mio ? t('clienti.messaggi.tu') : (cliente?.nome ?? '')} · {dataBreve(m.quando, lingua)}{' '}
                  {ora(m.quando)}
                </Text>
                <Text style={stili.testo}>{m.testo}</Text>
              </View>
            );
          })}
          <Pulsante
            titolo={aperto ? t('clienti.messaggi.chiudi') : t('clienti.messaggi.riapri')}
            variante="tenue"
            piccolo
            onPress={() => azioni.statoTicket(ticket.id, aperto ? 'chiuso' : 'aperto')}
          />
        </ScrollView>
        {aperto ? (
          <View style={stili.compositore}>
            <TextInput
              value={testo}
              onChangeText={setTesto}
              placeholder={t('clienti.messaggi.segnaposto')}
              placeholderTextColor={colori.fg3}
              selectionColor={colori.accent}
              accessibilityLabel={t('clienti.messaggi.segnaposto')}
              multiline
              style={[stili.campo, Platform.OS === 'web' && ({ outlineWidth: 0 } as const)]}
            />
            <PulsanteIcona
              icona="invia"
              etichetta={t('clienti.fogli.ticket.apri')}
              disabilitato={!testo.trim()}
              onPress={manda}
            />
          </View>
        ) : (
          <View style={{ padding: 16 }}>
            <Avviso tono="info" testo={t('clienti.messaggi.chiusa')} />
          </View>
        )}
      </KeyboardAvoidingView>
    </Schermata>
  );
}

const stili = StyleSheet.create({
  corpo: { gap: 12, paddingTop: 14, paddingHorizontal: 20, paddingBottom: 20 },
  bolla: { maxWidth: '86%', gap: 4, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1 },
  mia: { alignSelf: 'flex-end', borderColor: colori.accentLine, backgroundColor: colori.accentSoft },
  sua: { alignSelf: 'flex-start', borderColor: colori.line2, backgroundColor: colori.bg2 },
  autore: { fontFamily: famiglie.testo, fontSize: 12, color: colori.fg3 },
  testo: { fontFamily: famiglie.testo, fontSize: 15, lineHeight: 21, color: colori.fg },
  compositore: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colori.line,
  },
  campo: {
    flex: 1,
    minHeight: 44,
    maxHeight: 140,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: colori.line2,
    backgroundColor: colori.surface,
    fontFamily: famiglie.testo,
    fontSize: 15,
    color: colori.fg,
  },
});
