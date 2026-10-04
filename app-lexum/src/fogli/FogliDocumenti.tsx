import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Campo } from '@/componenti/Campi';
import { Avviso, Badge, ElencoDefinizioni, IconaQuadrata } from '@/componenti/Elementi';
import { Foglio } from '@/componenti/Foglio';
import { Icona } from '@/componenti/Icona';
import { Pulsante, PulsanteIcona } from '@/componenti/Pulsante';
import { Riga } from '@/componenti/Riga';
import { Testo } from '@/componenti/Testo';
import type { DocumentoStudio } from '@/dati-finti/studio';
import { useTesti } from '@/lingue/useTesti';
import { Scelta, useRiapertura } from '@/studio/Campi';
import { dataBreve, dataCompleta } from '@/studio/formati';
import { useStudio } from '@/stato/Studio';
import { colori } from '@/tema';

// Fogli dell'archivio dello studio: carica con cliente e pratica, scheda del documento (cliente e pratica,
// categoria, condividi nel portale, elimina), scelta dall'archivio, gestione delle categorie.
// Come Archivio.jsx, AssegnaDocumento, PickerCategoria e ModalGestioneCategorie del sito.

type Base = { visibile: boolean; onChiudi: () => void };

const NESSUNO = '__nessuno';

// «Atti e ricorsi › Memorie»
export function percorsoCategoria(
  categorie: { id: string; nome: string; sottocategorie: { id: string; nome: string }[] }[],
  d: Pick<DocumentoStudio, 'categoriaId' | 'sottocategoriaId'>,
): string | null {
  const c = categorie.find((x) => x.id === d.categoriaId);
  if (!c) return null;
  const s = c.sottocategorie.find((x) => x.id === d.sottocategoriaId);
  return s ? `${c.nome} › ${s.nome}` : c.nome;
}

// Cliente e pratica, scelti insieme: la pratica si sceglie tra quelle del cliente.
function SceltaClientePratica({
  clienteId,
  praticaId,
  onCliente,
  onPratica,
  etichette,
  bloccaCliente,
}: {
  clienteId: string | null;
  praticaId: string | null;
  onCliente: (id: string | null) => void;
  onPratica: (id: string | null) => void;
  etichette: { cliente: string; pratica: string; nessuno: string; nessuna: string };
  bloccaCliente?: boolean;
}) {
  const { clienti, pratiche } = useStudio();
  const { t } = useTesti();
  const delCliente = pratiche.filter((p) => p.clienteId === clienteId && p.stato === 'aperta');
  return (
    <>
      <View style={{ gap: 8 }}>
        <Testo tipo="small" colore={colori.fg2}>
          {etichette.cliente}
        </Testo>
        {bloccaCliente ? (
          <Testo medio>{clienti.find((c) => c.id === clienteId)?.nome ?? etichette.nessuno}</Testo>
        ) : (
          <Scelta
            voci={[
              { valore: NESSUNO, titolo: etichette.nessuno },
              ...clienti.map((c) => ({ valore: c.id, titolo: c.nome })),
            ]}
            valore={clienteId ?? NESSUNO}
            onCambia={(v) => {
              onCliente(v === NESSUNO ? null : v);
              onPratica(null);
            }}
            etichettaGruppo={etichette.cliente}
          />
        )}
      </View>
      {clienteId ? (
        <View style={{ gap: 8 }}>
          <Testo tipo="small" colore={colori.fg2}>
            {etichette.pratica}
          </Testo>
          {delCliente.length === 0 ? (
            <Testo tipo="cap">{t('documenti.collega.senzaPratiche')}</Testo>
          ) : (
            <Scelta
              voci={[
                { valore: NESSUNO, titolo: etichette.nessuna },
                ...delCliente.map((p) => ({ valore: p.id, titolo: p.titolo })),
              ]}
              valore={praticaId ?? NESSUNO}
              onCambia={(v) => onPratica(v === NESSUNO ? null : v)}
              etichettaGruppo={etichette.pratica}
            />
          )}
        </View>
      ) : null}
    </>
  );
}

function SceltaCategoria({
  categoriaId,
  sottocategoriaId,
  onCategoria,
  onSottocategoria,
}: {
  categoriaId: string | null;
  sottocategoriaId: string | null;
  onCategoria: (id: string | null) => void;
  onSottocategoria: (id: string | null) => void;
}) {
  const { categorie } = useStudio();
  const { t } = useTesti();
  const sotto = categorie.find((c) => c.id === categoriaId)?.sottocategorie ?? [];
  return (
    <>
      <View style={{ gap: 8 }}>
        <Testo tipo="small" colore={colori.fg2}>
          {t('documenti.sposta.categoria')}
        </Testo>
        <Scelta
          voci={[
            { valore: NESSUNO, titolo: t('documenti.sposta.nessuna') },
            ...categorie.map((c) => ({ valore: c.id, titolo: c.nome })),
          ]}
          valore={categoriaId ?? NESSUNO}
          onCambia={(v) => {
            onCategoria(v === NESSUNO ? null : v);
            onSottocategoria(null);
          }}
          etichettaGruppo={t('documenti.sposta.categoria')}
        />
      </View>
      {sotto.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Testo tipo="small" colore={colori.fg2}>
            {t('documenti.sposta.sottocategoria')}
          </Testo>
          <Scelta
            voci={[
              { valore: NESSUNO, titolo: t('documenti.sposta.nessunaSotto') },
              ...sotto.map((s) => ({ valore: s.id, titolo: s.nome })),
            ]}
            valore={sottocategoriaId ?? NESSUNO}
            onCambia={(v) => onSottocategoria(v === NESSUNO ? null : v)}
            etichettaGruppo={t('documenti.sposta.sottocategoria')}
          />
        </View>
      ) : null}
    </>
  );
}

// ——— Carica un documento (o scansiona) ———
// Come «Carica documenti» del sito: titolo obbligatorio, categoria e sottocategoria facoltative.
// In più, cliente e pratica si scelgono qui (sul sito arrivano solo dall'indirizzo ?cliente_id=&pratica_id=).
// Nell'app vera il file viene dal telefono (documenti o scanner); qui è un file finto.
export function FoglioCarica({
  visibile,
  onChiudi,
  clienteId: clienteIniziale,
  praticaId: praticaIniziale,
  scansione,
  file,
  onCaricato,
}: Base & {
  clienteId?: string;
  praticaId?: string;
  scansione?: boolean;
  file?: { nome: string; titolo: string; dimensione: string }; // da «Condividi in Lexum»
  onCaricato?: (id: string) => void;
}) {
  const { pratiche, azioni } = useStudio();
  const { t, lingua } = useTesti();
  const [titolo, setTitolo] = useState('');
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [sottocategoriaId, setSottocategoriaId] = useState<string | null>(null);
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [praticaId, setPraticaId] = useState<string | null>(null);
  const oggi = dataBreve(new Date().toISOString(), lingua);
  const nomeFile = scansione ? null : (file?.nome ?? `Documento ${oggi}.pdf`);
  const dimensione = file?.dimensione ?? (scansione ? '1,2 MB' : '320 KB');
  useRiapertura(visibile, () => {
    setTitolo(scansione ? '' : (file?.titolo ?? `Documento ${oggi}`));
    setCategoriaId(null);
    setSottocategoriaId(null);
    const pratica = pratiche.find((p) => p.id === praticaIniziale);
    setClienteId(pratica?.clienteId ?? clienteIniziale ?? null);
    setPraticaId(pratica?.id ?? null);
  });

  return (
    <Foglio visibile={visibile} onChiudi={onChiudi}>
      <Testo tipo="dS">
        {scansione ? t('documenti.carica.titoloScansione') : t('documenti.carica.titolo')}
      </Testo>
      <View style={stili.file}>
        <Icona nome={scansione ? 'fotocamera' : 'documento'} dimensione={20} colore={colori.accentText} />
        <Testo tipo="small" style={{ flex: 1 }}>
          {scansione
            ? t('documenti.carica.scansione', { pagine: 2 })
            : t('documenti.carica.fileScelto', { nome: nomeFile ?? '', dimensione })}
        </Testo>
      </View>
      <Campo etichetta={t('documenti.carica.titoloCampo')} value={titolo} onChangeText={setTitolo} />
      <SceltaCategoria
        categoriaId={categoriaId}
        sottocategoriaId={sottocategoriaId}
        onCategoria={setCategoriaId}
        onSottocategoria={setSottocategoriaId}
      />
      <SceltaClientePratica
        clienteId={clienteId}
        praticaId={praticaId}
        onCliente={setClienteId}
        onPratica={setPraticaId}
        bloccaCliente={!!praticaIniziale}
        etichette={{
          cliente: t('documenti.carica.cliente'),
          pratica: t('documenti.carica.pratica'),
          nessuno: t('documenti.carica.nessuno'),
          nessuna: t('documenti.carica.nessuna'),
        }}
      />
      <Testo tipo="cap">{t('documenti.carica.lettura')}</Testo>
      <Pulsante
        titolo={t('documenti.carica.carica')}
        icona="carica"
        disabilitato={!titolo.trim()}
        onPress={() => {
          const id = azioni.caricaDocumento({
            titolo,
            dimensione,
            formato: 'PDF',
            categoriaId: categoriaId ?? undefined,
            sottocategoriaId: sottocategoriaId ?? undefined,
            clienteId: clienteId ?? undefined,
            praticaId: praticaId ?? undefined,
            scansione: scansione || undefined,
          });
          onCaricato?.(id);
          onChiudi();
        }}
      />
    </Foglio>
  );
}

// ——— Scheda di un documento dell'archivio ———
type Modo = 'azioni' | 'collega' | 'sposta' | 'elimina';

export function FoglioDocumento({
  documento: d,
  onChiudi,
  daPratica,
}: {
  documento: DocumentoStudio | null;
  onChiudi: () => void;
  daPratica?: boolean; // aperto dai documenti di una pratica: c'è «Togli dalla pratica»
}) {
  const { clienti, pratiche, categorie, azioni } = useStudio();
  const { t, lingua } = useTesti();
  const [modo, setModo] = useState<Modo>('azioni');
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [praticaId, setPraticaId] = useState<string | null>(null);
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [sottocategoriaId, setSottocategoriaId] = useState<string | null>(null);
  const [messaggio, setMessaggio] = useState<string | null>(null);
  const visibile = !!d;
  useRiapertura(visibile, () => {
    setModo('azioni');
    setMessaggio(null);
  });
  if (!d)
    return (
      <Foglio visibile={false} onChiudi={onChiudi}>
        {null}
      </Foglio>
    );

  const cliente = clienti.find((c) => c.id === d.clienteId);
  const pratica = pratiche.find((p) => p.id === d.praticaId);
  const percorso = percorsoCategoria(categorie, d);
  const vai = (fn: () => void) => {
    onChiudi();
    fn();
  };

  return (
    <Foglio visibile={visibile} onChiudi={onChiudi}>
      {modo === 'azioni' ? (
        <>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              <Badge>{d.formato}</Badge>
              <Badge tono={d.stato === 'Indicizzato' ? 'ok' : 'warn'}>{t(`archivio.stati.${d.stato}`)}</Badge>
              {d.origine === 'atto' ? <Badge tono="oro">{t('documenti.archivio.atto')}</Badge> : null}
              {d.origine === 'fattura' ? <Badge tono="oro">{t('documenti.archivio.fattura')}</Badge> : null}
            </View>
            <Testo tipo="dS">{d.titolo}</Testo>
          </View>
          <ElencoDefinizioni
            larghezzaTermine={96}
            voci={[
              [t('documenti.documento.categoria'), percorso ?? t('archivio.senzaCategoria')],
              [t('documenti.documento.cliente'), cliente?.nome ?? t('documenti.documento.nessuno')],
              [t('documenti.documento.pratica'), pratica?.titolo ?? t('documenti.documento.nessuna')],
              [t('documenti.documento.caricato'), dataCompleta(d.quando, lingua)],
              [t('documenti.documento.dimensione'), d.dimensione],
            ]}
          />
          {messaggio ? <Avviso tono="info" testo={messaggio} /> : null}
          <View style={{ marginHorizontal: -20 }}>
            {!d.soloPratica ? (
              <Riga
                stretta
                sinistra={<Icona nome="persone" dimensione={20} colore={colori.fg2} />}
                titolo={t('documenti.documento.collega')}
                sottotitolo={t('documenti.documento.collegaTesto')}
                onPress={() => {
                  setClienteId(d.clienteId ?? null);
                  setPraticaId(d.praticaId ?? null);
                  setModo('collega');
                }}
              />
            ) : null}
            {daPratica && d.praticaId && !d.soloPratica ? (
              <Riga
                stretta
                sinistra={<Icona nome="chiudi" dimensione={20} colore={colori.fg2} />}
                titolo={t('documenti.pratica.togli')}
                sottotitolo={t('documenti.pratica.togliTesto')}
                onPress={() => {
                  azioni.collegaDocumento(d.id, { praticaId: null });
                  onChiudi();
                }}
              />
            ) : null}
            {!d.soloPratica ? (
              <Riga
                stretta
                sinistra={<Icona nome="cartella" dimensione={20} colore={colori.fg2} />}
                titolo={t('documenti.documento.sposta')}
                onPress={() => {
                  setCategoriaId(d.categoriaId ?? null);
                  setSottocategoriaId(d.sottocategoriaId ?? null);
                  setModo('sposta');
                }}
              />
            ) : null}
            {cliente ? (
              <Riga
                stretta
                sinistra={<Icona nome="condividi" dimensione={20} colore={colori.fg2} />}
                titolo={t('documenti.documento.condividi')}
                onPress={() => {
                  azioni.condividiNelPortale(cliente.id, {
                    nome: `${d.titolo}.${d.formato.toLowerCase()}`,
                    dimensione: d.dimensione,
                  });
                  setMessaggio(t('documenti.documento.condiviso', { nome: cliente.nome }));
                }}
              />
            ) : null}
            {d.fatturaId ? (
              <Riga
                stretta
                sinistra={<Icona nome="ricevuta" dimensione={20} colore={colori.fg2} />}
                titolo={t('documenti.documento.apriFattura')}
                freccia="avanti"
                onPress={() =>
                  vai(() => router.push({ pathname: '/fatture/[id]', params: { id: d.fatturaId! } }))
                }
              />
            ) : null}
            {pratica && !daPratica ? (
              <Riga
                stretta
                sinistra={<Icona nome="bilancia" dimensione={20} colore={colori.fg2} />}
                titolo={t('documenti.documento.apriPratica')}
                freccia="avanti"
                onPress={() =>
                  vai(() =>
                    router.push({
                      pathname: '/pratiche/[id]',
                      params: { id: pratica.id, scheda: 'documenti' },
                    }),
                  )
                }
              />
            ) : null}
            <Riga
              stretta
              sinistra={<Icona nome="cestino" dimensione={20} colore={colori.danger} />}
              titolo={d.soloPratica ? t('documenti.pratica.eliminaAtto') : t('documenti.documento.elimina')}
              titoloStile={{ color: colori.danger }}
              onPress={() => setModo('elimina')}
            />
          </View>
        </>
      ) : null}

      {modo === 'collega' ? (
        <>
          <View style={{ gap: 6 }}>
            <Testo tipo="dS">{t('documenti.collega.titolo')}</Testo>
            <Testo tipo="small" colore={colori.fg2}>
              {t('documenti.collega.testo')}
            </Testo>
          </View>
          <SceltaClientePratica
            clienteId={clienteId}
            praticaId={praticaId}
            onCliente={setClienteId}
            onPratica={setPraticaId}
            etichette={{
              cliente: t('documenti.collega.cliente'),
              pratica: t('documenti.collega.pratica'),
              nessuno: t('documenti.collega.nessuno'),
              nessuna: t('documenti.collega.nessuna'),
            }}
          />
          <Pulsante
            titolo={t('documenti.collega.salva')}
            onPress={() => {
              azioni.collegaDocumento(d.id, { clienteId, praticaId });
              setModo('azioni');
            }}
          />
        </>
      ) : null}

      {modo === 'sposta' ? (
        <>
          <Testo tipo="dS">{t('documenti.sposta.titolo')}</Testo>
          <SceltaCategoria
            categoriaId={categoriaId}
            sottocategoriaId={sottocategoriaId}
            onCategoria={setCategoriaId}
            onSottocategoria={setSottocategoriaId}
          />
          <Pulsante
            titolo={t('documenti.sposta.salva')}
            onPress={() => {
              azioni.spostaDocumento(d.id, categoriaId, sottocategoriaId);
              setModo('azioni');
            }}
          />
        </>
      ) : null}

      {modo === 'elimina' ? (
        d.origine === 'fattura' ? (
          <>
            <Avviso testo={t('documenti.documento.fattura')} />
            <Pulsante titolo={t('comune.indietro')} variante="linea" onPress={() => setModo('azioni')} />
          </>
        ) : (
          <>
            <Testo tipo="dS">{t('documenti.documento.confermaElimina', { titolo: d.titolo })}</Testo>
            <Pulsante
              titolo={t('documenti.documento.eliminaConferma')}
              variante="pericolo"
              onPress={() => {
                azioni.eliminaDocumento(d.id);
                onChiudi();
              }}
            />
            <Pulsante titolo={t('comune.annulla')} variante="linea" onPress={() => setModo('azioni')} />
          </>
        )
      ) : null}
    </Foglio>
  );
}

// ——— Scegli dall'archivio ———
// Per collegare documenti già presenti a un cliente o a una pratica. Il foglio resta aperto: si possono
// scegliere più documenti, poi «Fine».
export function FoglioScegliDocumenti({
  visibile,
  onChiudi,
  titolo,
  testo,
  candidati,
  onScegli,
}: Base & {
  titolo: string;
  testo?: string;
  candidati: DocumentoStudio[];
  onScegli: (d: DocumentoStudio) => void;
}) {
  const { categorie, clienti } = useStudio();
  const { t, lingua } = useTesti();
  const [scelti, setScelti] = useState<string[]>([]);
  // l'elenco resta quello dell'apertura, così i documenti scelti non spariscono
  const [elenco, setElenco] = useState<DocumentoStudio[]>([]);
  useRiapertura(visibile, () => {
    setScelti([]);
    setElenco(candidati);
  });
  return (
    <Foglio visibile={visibile} onChiudi={onChiudi}>
      <View style={{ gap: 6 }}>
        <Testo tipo="dS">{titolo}</Testo>
        {testo ? (
          <Testo tipo="small" colore={colori.fg2}>
            {testo}
          </Testo>
        ) : null}
      </View>
      <View style={{ marginHorizontal: -20 }}>
        {elenco.map((d) => {
          const fatto = scelti.includes(d.id);
          return (
            <Riga
              key={d.id}
              stretta
              sinistra={<IconaQuadrata nome="documento" tenue lato={34} dimensione={17} />}
              titolo={d.titolo}
              sottotitolo={[
                percorsoCategoria(categorie, d),
                clienti.find((c) => c.id === d.clienteId)?.nome,
                dataBreve(d.quando, lingua),
              ]
                .filter(Boolean)
                .join(' · ')}
              destra={fatto ? <Badge tono="ok">{t('clienti.fogli.collega.collegato')}</Badge> : undefined}
              onPress={() => {
                if (fatto) return;
                onScegli(d);
                setScelti((x) => [...x, d.id]);
              }}
            />
          );
        })}
        {elenco.length === 0 ? (
          <Testo tipo="small" colore={colori.fg3} style={{ paddingHorizontal: 20 }}>
            {t('documenti.pratica.scegliVuoto')}
          </Testo>
        ) : null}
      </View>
      <Pulsante titolo={t('clienti.fogli.collega.fine')} variante="linea" onPress={onChiudi} />
    </Foglio>
  );
}

// ——— Gestisci categorie e sottocategorie ———
type Modifica =
  | { tipo: 'nuovaSotto'; categoriaId: string; sottoId?: undefined; nome: string }
  | { tipo: 'rinomina'; categoriaId: string; sottoId?: string; nome: string }
  | { tipo: 'elimina'; categoriaId: string; sottoId?: string; nome: string };

export function FoglioCategorie({ visibile, onChiudi }: Base) {
  const { categorie, documenti, azioni } = useStudio();
  const { t } = useTesti();
  const [nuova, setNuova] = useState('');
  const [modifica, setModifica] = useState<Modifica | null>(null);
  useRiapertura(visibile, () => {
    setNuova('');
    setModifica(null);
  });
  const conta = (categoriaId: string, sottoId?: string) =>
    documenti.filter((d) => d.categoriaId === categoriaId && (!sottoId || d.sottocategoriaId === sottoId))
      .length;

  if (modifica) {
    const conferma = () => {
      const { categoriaId, sottoId } = modifica;
      if (modifica.tipo === 'nuovaSotto') azioni.creaSottocategoria(categoriaId, modifica.nome);
      else if (modifica.tipo === 'rinomina') {
        if (sottoId) azioni.rinominaSottocategoria(categoriaId, sottoId, modifica.nome);
        else azioni.rinominaCategoria(categoriaId, modifica.nome);
      } else if (sottoId) azioni.eliminaSottocategoria(categoriaId, sottoId);
      else azioni.eliminaCategoria(categoriaId);
      setModifica(null);
    };
    const nomeCategoria = categorie.find((c) => c.id === modifica.categoriaId)?.nome ?? '';
    return (
      <Foglio visibile={visibile} onChiudi={onChiudi}>
        {modifica.tipo === 'elimina' ? (
          <>
            <Testo tipo="dS">
              {modifica.sottoId
                ? t('documenti.categorie.confermaSotto', { nome: modifica.nome })
                : t('documenti.categorie.confermaCategoria', {
                    nome: modifica.nome,
                    n: conta(modifica.categoriaId),
                  })}
            </Testo>
            <Pulsante
              titolo={t('documenti.categorie.eliminaConferma')}
              variante="pericolo"
              onPress={conferma}
            />
          </>
        ) : (
          <>
            <Testo tipo="dS">
              {modifica.tipo === 'nuovaSotto'
                ? t('documenti.categorie.nuovaSotto', { nome: nomeCategoria })
                : t('documenti.categorie.rinomina', { nome: nomeCategoria })}
            </Testo>
            <Campo
              etichetta={
                modifica.tipo === 'nuovaSotto' || modifica.sottoId
                  ? t('documenti.categorie.segnapostoSotto')
                  : t('documenti.categorie.segnaposto')
              }
              value={modifica.nome}
              onChangeText={(nome) => setModifica({ ...modifica, nome })}
              autoFocus
            />
            <Pulsante
              titolo={t('documenti.categorie.salva')}
              disabilitato={!modifica.nome.trim()}
              onPress={conferma}
            />
          </>
        )}
        <Pulsante titolo={t('comune.annulla')} variante="linea" onPress={() => setModifica(null)} />
      </Foglio>
    );
  }

  return (
    <Foglio visibile={visibile} onChiudi={onChiudi}>
      <View style={{ gap: 6 }}>
        <Testo tipo="dS">{t('documenti.categorie.titolo')}</Testo>
        <Testo tipo="small" colore={colori.fg2}>
          {t('documenti.categorie.testo')}
        </Testo>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
        <Campo
          etichetta={t('documenti.categorie.nuova')}
          placeholder={t('documenti.categorie.segnaposto')}
          value={nuova}
          onChangeText={setNuova}
          stile={{ flex: 1 }}
        />
        <Pulsante
          titolo={t('documenti.categorie.aggiungi')}
          disabilitato={!nuova.trim()}
          onPress={() => {
            azioni.creaCategoria(nuova);
            setNuova('');
          }}
        />
      </View>
      {categorie.length === 0 ? <Testo tipo="cap">{t('documenti.categorie.vuoto')}</Testo> : null}
      <View style={{ marginHorizontal: -20 }}>
        {categorie.map((c) => (
          <View key={c.id} style={stili.categoria}>
            <View style={stili.rigaCategoria}>
              <Icona nome="cartella" dimensione={18} colore={colori.accentText} />
              <Testo medio style={{ flex: 1 }}>
                {c.nome}
              </Testo>
              <Testo tipo="mini">{t('documenti.categorie.nDoc', { n: conta(c.id) })}</Testo>
              <PulsanteIcona
                icona="modifica"
                dimensione={18}
                etichetta={t('documenti.categorie.rinomina', { nome: c.nome })}
                onPress={() => setModifica({ tipo: 'rinomina', categoriaId: c.id, nome: c.nome })}
              />
              <PulsanteIcona
                icona="cestino"
                dimensione={18}
                etichetta={t('documenti.categorie.elimina', { nome: c.nome })}
                onPress={() => setModifica({ tipo: 'elimina', categoriaId: c.id, nome: c.nome })}
              />
            </View>
            {c.sottocategorie.map((s) => (
              <View key={s.id} style={[stili.rigaCategoria, { paddingLeft: 48 }]}>
                <Testo tipo="small" style={{ flex: 1 }}>
                  {s.nome}
                </Testo>
                <Testo tipo="mini">{t('documenti.categorie.nDoc', { n: conta(c.id, s.id) })}</Testo>
                <PulsanteIcona
                  icona="modifica"
                  dimensione={16}
                  etichetta={t('documenti.categorie.rinomina', { nome: s.nome })}
                  onPress={() =>
                    setModifica({ tipo: 'rinomina', categoriaId: c.id, sottoId: s.id, nome: s.nome })
                  }
                />
                <PulsanteIcona
                  icona="cestino"
                  dimensione={16}
                  etichetta={t('documenti.categorie.elimina', { nome: s.nome })}
                  onPress={() =>
                    setModifica({ tipo: 'elimina', categoriaId: c.id, sottoId: s.id, nome: s.nome })
                  }
                />
              </View>
            ))}
            <View style={{ paddingLeft: 44, paddingRight: 20 }}>
              <Pulsante
                titolo={t('documenti.categorie.aggiungiSotto')}
                icona="piu"
                variante="tenue"
                piccolo
                allineaASinistra
                onPress={() => setModifica({ tipo: 'nuovaSotto', categoriaId: c.id, nome: '' })}
              />
            </View>
          </View>
        ))}
      </View>
      <Pulsante titolo={t('documenti.categorie.fine')} variante="linea" onPress={onChiudi} />
    </Foglio>
  );
}

// ——— Aggiungi un documento a una pratica ———
export function FoglioAggiungiDocumento({
  visibile,
  onChiudi,
  onCarica,
  onScansiona,
  onScegli,
}: Base & { onCarica: () => void; onScansiona: () => void; onScegli: () => void }) {
  const { t } = useTesti();
  return (
    <Foglio visibile={visibile} onChiudi={onChiudi}>
      <Testo tipo="dS">{t('documenti.pratica.aggiungiTitolo')}</Testo>
      <View style={{ marginHorizontal: -20 }}>
        <Riga
          sinistra={<IconaQuadrata nome="carica" />}
          titolo={t('documenti.pratica.carica')}
          sottotitolo={t('documenti.pratica.caricaTesto')}
          freccia="avanti"
          onPress={onCarica}
        />
        <Riga
          sinistra={<IconaQuadrata nome="fotocamera" />}
          titolo={t('documenti.pratica.scansiona')}
          sottotitolo={t('documenti.pratica.scansionaTesto')}
          freccia="avanti"
          onPress={onScansiona}
        />
        <Riga
          sinistra={<IconaQuadrata nome="archivio" />}
          titolo={t('documenti.pratica.scegli')}
          sottotitolo={t('documenti.pratica.scegliTesto')}
          freccia="avanti"
          onPress={onScegli}
        />
      </View>
    </Foglio>
  );
}

const stili = StyleSheet.create({
  file: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colori.line2,
    backgroundColor: colori.bg2,
  },
  categoria: { borderBottomWidth: 1, borderBottomColor: colori.line, paddingBottom: 6 },
  rigaCategoria: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 20 },
});
