import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Campo } from '@/componenti/Campi';
import { BarraAzioni } from '@/componenti/Elementi';
import { BottoneIndietro, Intestazione } from '@/componenti/Intestazione';
import { Pulsante } from '@/componenti/Pulsante';
import { Schermata } from '@/componenti/Schermata';
import { Testo } from '@/componenti/Testo';
import { tipiCausa, type TipoCausa } from '@/dati-finti/studio';
import { CampoData, Scelta, leggiData } from '@/studio/Campi';
import { useStato } from '@/stato/Stato';
import { useStudio } from '@/stato/Studio';
import { colori } from '@/tema';

// S3 · Nuova pratica, come sul sito: titolo, cliente e tipo obbligatori; note interne facoltative.
// In Italia anche le ore dedicate; in Svizzera la prossima udienza.
// Nell'app vera il cliente si sceglie da un elenco con ricerca (i clienti dello studio).
export default function NuovaPratica() {
  const { paese } = useStato();
  const { clienti, azioni } = useStudio();
  const [titolo, setTitolo] = useState('');
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [tipo, setTipo] = useState<TipoCausa | null>(null);
  const [note, setNote] = useState('');
  const [ore, setOre] = useState('');
  const [udienza, setUdienza] = useState('');

  const pronta = !!titolo.trim() && !!clienteId && !!tipo;

  const crea = () => {
    if (!clienteId || !tipo || !titolo.trim()) return;
    const oreDedicate = paese === 'IT' && ore.trim() ? Number(ore.replace(',', '.')) : undefined;
    const id = azioni.creaPratica({
      titolo,
      clienteId,
      tipo,
      note,
      oreDedicate: oreDedicate != null && !Number.isNaN(oreDedicate) ? oreDedicate : undefined,
    });
    const giorno = paese === 'CH' ? leggiData(udienza) : null;
    if (giorno) {
      giorno.setHours(9, 0, 0, 0);
      azioni.aggiungiUdienza(id, { tipo: 'Udienza', dataOra: giorno.toISOString() });
    }
    router.replace({ pathname: '/pratiche/[id]', params: { id } });
  };

  return (
    <Schermata>
      <Intestazione
        sinistra={<BottoneIndietro ripiego="/pratiche" etichetta="Annulla" />}
        titolo="Nuova pratica"
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={stili.corpo} keyboardShouldPersistTaps="handled">
          <Campo
            etichetta="Titolo della pratica"
            placeholder="Es. Causa civile Rossi c. Ferrari"
            value={titolo}
            onChangeText={setTitolo}
          />
          <View style={{ gap: 8 }}>
            <Testo tipo="small" colore={colori.fg2}>
              Cliente
            </Testo>
            {clienti.length === 0 ? (
              <Testo tipo="small" colore={colori.fg3}>
                Non hai ancora clienti: si aggiungono dal sito, nella sezione Clienti.
              </Testo>
            ) : (
              <Scelta
                voci={clienti.map((c) => ({ valore: c.id, titolo: c.nome }))}
                valore={clienteId}
                onCambia={setClienteId}
                etichettaGruppo="Cliente"
              />
            )}
          </View>
          <View style={{ gap: 8 }}>
            <Testo tipo="small" colore={colori.fg2}>
              Tipo di causa
            </Testo>
            <Scelta voci={tipiCausa} valore={tipo} onCambia={setTipo} etichettaGruppo="Tipo di causa" />
          </View>
          {paese === 'IT' ? (
            <Campo
              etichetta="Ore dedicate (facoltative)"
              placeholder="Es. 2,5"
              value={ore}
              onChangeText={setOre}
              keyboardType="decimal-pad"
            />
          ) : (
            <CampoData etichetta="Prossima udienza (facoltativa)" valore={udienza} onCambia={setUdienza} />
          )}
          <Campo
            etichetta="Note interne (facoltative)"
            placeholder="Le vedi solo tu: Lex non le legge"
            value={note}
            onChangeText={setNote}
            multiline
          />
        </ScrollView>
        <BarraAzioni>
          <Pulsante titolo="Crea la pratica" stile={{ flex: 1 }} disabilitato={!pronta} onPress={crea} />
        </BarraAzioni>
      </KeyboardAvoidingView>
    </Schermata>
  );
}

const stili = StyleSheet.create({
  corpo: { gap: 18, paddingTop: 8, paddingHorizontal: 20, paddingBottom: 24 },
});
