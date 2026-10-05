import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Campo } from '@/componenti/Campi';
import { BarraAzioni } from '@/componenti/Elementi';
import { BottoneIndietro, Intestazione } from '@/componenti/Intestazione';
import { Pulsante } from '@/componenti/Pulsante';
import { Schermata } from '@/componenti/Schermata';
import { Testo } from '@/componenti/Testo';
import { tipiCausa, type TipoCausa } from '@/dati-finti/studio';
import { useTesti } from '@/lingue/useTesti';
import { CampoData, Scelta, leggiData } from '@/studio/Campi';
import { nomeTipoCausa } from '@/studio/pratiche';
import { useStato } from '@/stato/Stato';
import { useStudio } from '@/stato/Studio';
import { colori } from '@/tema';

// S3 · Nuova pratica, come sul sito: titolo, cliente e tipo obbligatori; note interne facoltative.
// In Italia anche le ore dedicate; in Svizzera la prossima udienza.
// Nell'app vera il cliente si sceglie da un elenco con ricerca (i clienti dello studio).
export default function NuovaPratica() {
  const { paese } = useStato();
  const { clienti, azioni } = useStudio();
  const { t, lingua } = useTesti();
  // ?cliente=<id>: dalla scheda del cliente («Nuova pratica»), il cliente è già scelto.
  const { cliente } = useLocalSearchParams<{ cliente?: string }>();
  const [titolo, setTitolo] = useState('');
  const [clienteId, setClienteId] = useState<string | null>(() =>
    clienti.some((c) => c.id === cliente) ? (cliente ?? null) : null,
  );
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
        sinistra={<BottoneIndietro ripiego="/pratiche" etichetta={t('comune.annulla')} />}
        titolo={t('studio.nuova.titolo')}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={stili.corpo} keyboardShouldPersistTaps="handled">
          <Campo
            etichetta={t('studio.nuova.titoloPratica')}
            placeholder={t('studio.nuova.titoloEsempio')}
            value={titolo}
            onChangeText={setTitolo}
          />
          <View style={{ gap: 8 }}>
            <Testo tipo="small" colore={colori.fg2}>
              {t('studio.nuova.cliente')}
            </Testo>
            {clienti.length === 0 ? (
              <Testo tipo="small" colore={colori.fg3}>
                {t('studio.nuova.senzaClienti')}
              </Testo>
            ) : (
              <Scelta
                voci={clienti.map((c) => ({ valore: c.id, titolo: c.nome }))}
                valore={clienteId}
                onCambia={setClienteId}
                etichettaGruppo={t('studio.nuova.cliente')}
              />
            )}
          </View>
          <View style={{ gap: 8 }}>
            <Testo tipo="small" colore={colori.fg2}>
              {t('studio.nuova.tipoCausa')}
            </Testo>
            <Scelta
              voci={tipiCausa.map((v) => ({ valore: v, titolo: nomeTipoCausa(v, lingua) }))}
              valore={tipo}
              onCambia={setTipo}
              etichettaGruppo={t('studio.nuova.tipoCausa')}
            />
          </View>
          {paese === 'IT' ? (
            <Campo
              etichetta={t('studio.nuova.ore')}
              placeholder={t('studio.nuova.oreEsempio')}
              value={ore}
              onChangeText={setOre}
              keyboardType="decimal-pad"
            />
          ) : (
            <CampoData etichetta={t('studio.nuova.udienza')} valore={udienza} onCambia={setUdienza} />
          )}
          <Campo
            etichetta={t('studio.nuova.note')}
            placeholder={t('studio.nuova.noteSegnaposto')}
            value={note}
            onChangeText={setNote}
            multiline
          />
        </ScrollView>
        <BarraAzioni>
          <Pulsante
            titolo={t('studio.nuova.crea')}
            stile={{ flex: 1 }}
            disabilitato={!pronta}
            onPress={crea}
          />
        </BarraAzioni>
      </KeyboardAvoidingView>
    </Schermata>
  );
}

const stili = StyleSheet.create({
  corpo: { gap: 18, paddingTop: 8, paddingHorizontal: 20, paddingBottom: 24 },
});
