import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { Campo } from '@/componenti/Campi';
import { Badge, ElencoDefinizioni } from '@/componenti/Elementi';
import { Foglio } from '@/componenti/Foglio';
import { Pulsante } from '@/componenti/Pulsante';
import { Eyebrow, Testo } from '@/componenti/Testo';
import type { Appuntamento, TipoEvento } from '@/dati-finti/studio';
import { useTesti } from '@/lingue/useTesti';
import { CampoData, CampoOra, Scelta, leggiData, leggiOra, useRiapertura } from '@/studio/Campi';
import { dataCompleta, dataNumerica, ora } from '@/studio/formati';
import { nomeTipoEvento, tipiEvento } from '@/studio/pratiche';
import { nomeCliente, useStudio } from '@/stato/Studio';
import { colori } from '@/tema';

const toniEvento = {
  programmato: 'oro',
  concluso: 'ok',
  annullato: 'pericolo',
} as const;

// Dettaglio di un evento del calendario, con le azioni.
export function FoglioEvento({
  evento,
  onChiudi,
  onModifica,
}: {
  evento: Appuntamento | null;
  onChiudi: () => void;
  onModifica: (e: Appuntamento) => void;
}) {
  const { clienti, pratiche, azioni } = useStudio();
  const { t, lingua } = useTesti();
  const [ultimo, setUltimo] = useState(evento);
  if (evento && evento !== ultimo) setUltimo(evento);
  const e = evento ?? ultimo;
  if (!e)
    return (
      <Foglio visibile={false} onChiudi={onChiudi}>
        {null}
      </Foglio>
    );

  const tipo = { ...tipiEvento[e.tipo], nome: nomeTipoEvento(e.tipo, lingua) };
  const pratica = pratiche.find((p) => p.id === e.praticaId);
  const voci: [string, string][] = [
    [t('studio.fogli.evento.quando'), `${dataCompleta(e.inizio, lingua)} · ${ora(e.inizio)}–${ora(e.fine)}`],
    [t('studio.fogli.evento.tipo'), tipo.nome],
  ];
  if (e.clienteId) voci.push([t('studio.fogli.evento.cliente'), nomeCliente(clienti, e.clienteId)]);
  if (pratica) voci.push([t('studio.fogli.evento.pratica'), pratica.titolo]);
  if (e.noteInterne)
    voci.push([
      e.tipo === 'udienza' ? t('studio.fogli.evento.sede') : t('studio.fogli.evento.noteInterne'),
      e.noteInterne,
    ]);
  if (e.noteCliente) voci.push([t('studio.fogli.evento.noteCliente'), e.noteCliente]);
  const gestibile = !e.origine;
  const programmato = e.stato === 'programmato';

  return (
    <Foglio visibile={!!evento} onChiudi={onChiudi}>
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={{ width: 10, height: 10, backgroundColor: tipo.colore }} />
          <Eyebrow colore={colori.fg3}>{tipo.nome}</Eyebrow>
          <Badge tono={toniEvento[e.stato]}>{t(`studio.statiEvento.${e.stato}`)}</Badge>
        </View>
        <Testo tipo="dS">{e.titolo}</Testo>
      </View>
      <ElencoDefinizioni voci={voci} larghezzaTermine={96} />
      {e.origine === 'termine' ? (
        <Testo tipo="small" colore={colori.fg2}>
          {t('studio.fogli.evento.daTermine')}
        </Testo>
      ) : null}
      {e.origine === 'udienza' ? (
        <Testo tipo="small" colore={colori.fg2}>
          {t('studio.fogli.evento.daUdienza')}
        </Testo>
      ) : null}
      {e.origine === 'mandato' ? (
        <Testo tipo="small" colore={colori.fg2}>
          {t('studio.fogli.evento.daMandato')}
        </Testo>
      ) : null}
      {e.link && programmato ? (
        <Pulsante
          titolo={t('studio.fogli.evento.videocall')}
          icona="esterno"
          variante="linea"
          onPress={() => void Linking.openURL(e.link as string).catch(() => undefined)}
        />
      ) : null}
      {pratica ? (
        <Pulsante
          titolo={t('studio.fogli.evento.apriPratica')}
          variante="linea"
          onPress={() => {
            onChiudi();
            router.push({
              pathname: '/pratiche/[id]',
              params: { id: pratica.id, scheda: e.origine ? 'scadenze' : 'panoramica' },
            });
          }}
        />
      ) : null}
      {gestibile && programmato ? (
        <>
          <Pulsante
            titolo={t('studio.fogli.evento.modifica')}
            variante="linea"
            onPress={() => onModifica(e)}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pulsante
              titolo={t('studio.fogli.evento.concluso')}
              icona="spunta"
              stile={{ flex: 1 }}
              onPress={() => {
                azioni.statoAppuntamento(e.id, 'concluso');
                onChiudi();
              }}
            />
            <Pulsante
              titolo={t('studio.fogli.evento.annulla')}
              variante="pericolo"
              stile={{ flex: 1 }}
              onPress={() => {
                azioni.statoAppuntamento(e.id, 'annullato');
                onChiudi();
              }}
            />
          </View>
        </>
      ) : null}
    </Foglio>
  );
}

// Nuovo appuntamento, oppure modifica di uno esistente (sul sito dopo non si può modificare).
export function FoglioNuovoEvento({
  visibile,
  onChiudi,
  evento,
  giornoIniziale,
  paese,
  conUdienze,
}: {
  visibile: boolean;
  onChiudi: () => void;
  evento?: Appuntamento | null; // presente: si modifica
  giornoIniziale: string; // ISO del giorno scelto
  paese: string;
  conUdienze: boolean; // solo per gli avvocati
}) {
  const { clienti, pratiche, azioni } = useStudio();
  const { t } = useTesti();
  const [titolo, setTitolo] = useState('');
  const [tipo, setTipo] = useState<TipoEvento>('presenza');
  const [data, setData] = useState('');
  const [inizio, setInizio] = useState('09:00');
  const [fine, setFine] = useState('10:00');
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [praticaId, setPraticaId] = useState<string | null>(null);
  const [luogo, setLuogo] = useState('');
  const [noteCliente, setNoteCliente] = useState('');
  useRiapertura(visibile, () => {
    setTitolo(evento?.titolo ?? '');
    setTipo(evento?.tipo ?? 'presenza');
    setData(dataNumerica(evento?.inizio ?? giornoIniziale));
    setInizio(evento ? ora(evento.inizio) : '09:00');
    setFine(evento ? ora(evento.fine) : '10:00');
    setClienteId(evento?.clienteId ?? null);
    setPraticaId(evento?.praticaId ?? null);
    setLuogo(evento?.tipo === 'videocall' ? (evento.link ?? '') : (evento?.noteInterne ?? ''));
    setNoteCliente(evento?.noteCliente ?? '');
  });

  const giorno = leggiData(data);
  const hi = leggiOra(inizio);
  const hf = leggiOra(fine);
  const orariValidi = !!hi && !!hf && hf[0] * 60 + hf[1] > hi[0] * 60 + hi[1];
  // In Italia il database vuole sempre il cliente (sul sito il modulo lo dice facoltativo: è un errore).
  const clienteObbligatorio = paese === 'IT';
  const pronto = !!titolo.trim() && !!giorno && orariValidi && (!clienteObbligatorio || !!clienteId);
  const praticheCliente = pratiche.filter((p) => p.clienteId === clienteId && p.stato === 'aperta');

  const tipi: { valore: TipoEvento; titolo: string }[] = [
    { valore: 'presenza', titolo: t('studio.tipiEvento.presenza') },
    { valore: 'videocall', titolo: t('studio.tipiEvento.videocall') },
    { valore: 'telefonico', titolo: t('studio.tipiEvento.telefonico') },
  ];
  if (conUdienze) tipi.push({ valore: 'udienza', titolo: t('studio.tipiEvento.udienza') });

  const salva = () => {
    if (!giorno || !hi || !hf) return;
    const a = new Date(giorno);
    a.setHours(hi[0], hi[1], 0, 0);
    const b = new Date(giorno);
    b.setHours(hf[0], hf[1], 0, 0);
    azioni.salvaAppuntamento({
      id: evento?.id,
      titolo: titolo.trim(),
      tipo,
      inizio: a.toISOString(),
      fine: b.toISOString(),
      clienteId: clienteId ?? undefined,
      praticaId: praticaId ?? undefined,
      link: tipo === 'videocall' ? luogo.trim() || undefined : undefined,
      noteInterne: tipo !== 'videocall' ? luogo.trim() || undefined : undefined,
      noteCliente: noteCliente.trim() || undefined,
    });
    onChiudi();
  };

  return (
    <Foglio visibile={visibile} onChiudi={onChiudi}>
      <Testo tipo="dS">
        {evento ? t('studio.fogli.nuovoEvento.modifica') : t('studio.fogli.nuovoEvento.nuovo')}
      </Testo>
      <Campo
        etichetta={t('studio.fogli.nuovoEvento.titolo')}
        placeholder={t('studio.fogli.nuovoEvento.titoloEsempio')}
        value={titolo}
        onChangeText={setTitolo}
      />
      <Scelta
        voci={tipi}
        valore={tipo}
        onCambia={setTipo}
        etichettaGruppo={t('studio.fogli.nuovoEvento.tipo')}
      />
      <CampoData
        etichetta={t('studio.fogli.nuovoEvento.giorno')}
        valore={data}
        onCambia={setData}
        scorciatoie={[
          { titolo: t('studio.fogli.nuovoEvento.oggi'), giorni: 0 },
          { titolo: t('studio.fogli.nuovoEvento.domani'), giorni: 1 },
          { titolo: t('studio.fogli.nuovoEvento.settimana'), giorni: 7 },
        ]}
      />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <CampoOra etichetta={t('studio.fogli.nuovoEvento.inizio')} valore={inizio} onCambia={setInizio} />
        <CampoOra etichetta={t('studio.fogli.nuovoEvento.fine')} valore={fine} onCambia={setFine} />
      </View>
      {hi && hf && !orariValidi ? (
        <Testo tipo="small" colore={colori.danger}>
          {t('studio.fogli.nuovoEvento.orari')}
        </Testo>
      ) : null}
      <View style={{ gap: 8 }}>
        <Testo tipo="small" colore={colori.fg2}>
          {clienteObbligatorio
            ? t('studio.fogli.nuovoEvento.cliente')
            : t('studio.fogli.nuovoEvento.clienteFacoltativo')}
        </Testo>
        <Scelta
          voci={clienti.map((c) => ({ valore: c.id, titolo: c.nome }))}
          valore={clienteId}
          onCambia={(id) => {
            setClienteId(id);
            setPraticaId(null);
          }}
          etichettaGruppo={t('studio.fogli.nuovoEvento.cliente')}
        />
      </View>
      {praticheCliente.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Testo tipo="small" colore={colori.fg2}>
            {t('studio.fogli.nuovoEvento.praticaFacoltativa')}
          </Testo>
          <Scelta
            voci={praticheCliente.map((p) => ({ valore: p.id, titolo: p.titolo }))}
            valore={praticaId}
            onCambia={setPraticaId}
            etichettaGruppo={t('studio.fogli.nuovoEvento.pratica')}
          />
        </View>
      ) : null}
      {tipo === 'videocall' || tipo === 'udienza' ? (
        <Campo
          etichetta={
            tipo === 'videocall' ? t('studio.fogli.nuovoEvento.link') : t('studio.fogli.nuovoEvento.aula')
          }
          placeholder={tipo === 'videocall' ? 'https://…' : t('studio.fogli.nuovoEvento.aulaEsempio')}
          value={luogo}
          onChangeText={setLuogo}
          autoCapitalize={tipo === 'videocall' ? 'none' : 'sentences'}
        />
      ) : null}
      <Campo
        etichetta={t('studio.fogli.nuovoEvento.noteCliente')}
        placeholder={t('studio.fogli.nuovoEvento.noteClienteSegnaposto')}
        value={noteCliente}
        onChangeText={setNoteCliente}
      />
      <Pulsante
        titolo={evento ? t('studio.fogli.nuovoEvento.salva') : t('studio.fogli.nuovoEvento.aggiungi')}
        disabilitato={!pronto}
        onPress={salva}
      />
    </Foglio>
  );
}
