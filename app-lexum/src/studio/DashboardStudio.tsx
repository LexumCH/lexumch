import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/componenti/Elementi';
import { Icona } from '@/componenti/Icona';
import { Eyebrow, Testo } from '@/componenti/Testo';
import type { ScadenzaMandato, TipoScadenzaIT } from '@/dati-finti/studio';
import { useTesti } from '@/lingue/useTesti';
import { apriSito } from '@/navigazione';
import { trovaPaese } from '@/paesi/registro';
import { useStato } from '@/stato/Stato';
import { nomeCliente, useStudio } from '@/stato/Studio';
import { colori, famiglie } from '@/tema';

import { importo } from './calcoli';
import { dashboardStudio } from './dashboard';
import { dataBreve, giorniDaOggi, meseBreve, ora } from './formati';
import { Contatore, iconaEvento, Nota, RigaDashboard, Sezione, stiliDashboard } from './PezziDashboard';

const tipiIT: TipoScadenzaIT[] = ['iva', 'lipe', 'dichiarativo', 'acconto', 'imu'];

// Dashboard di commercialisti (IT) e fiduciari (CH): il quadro dello studio, come le loro pagine
// «Dashboard» dei siti. Clienti, mandati e scadenze qui si vedono soltanto: si gestiscono ancora sul
// sito (Banco di lavoro), e toccandoli si apre lì. Fatture e appuntamenti si aprono nell'app.
export function DashboardStudio() {
  const { paese, utente } = useStato();
  const studio = useStudio();
  const { t, lingua } = useTesti();
  const d = useMemo(() => dashboardStudio(studio, paese), [studio, paese]);
  const sito = trovaPaese(paese).sito;
  const ch = paese === 'CH';
  const mandato = (id?: string) => (studio.mandati ?? []).find((m) => m.id === id);
  const banco = (s?: ScadenzaMandato) =>
    apriSito(s?.mandatoId ? `${sito}/banco-lavoro/${s.mandatoId}` : `${sito}/banco-lavoro`);
  const tipo = (s: ScadenzaMandato) =>
    s.tipo && (tipiIT as string[]).includes(s.tipo)
      ? t(`dashboard.tipiScadenza.${s.tipo as TipoScadenzaIT}`)
      : s.tipo;

  const quando = (s: ScadenzaMandato) => {
    const g = giorniDaOggi(s.scadenza);
    if (g < 0) return t('dashboard.scadenze.scadutaDa', { n: -g });
    if (g === 0) return t('dashboard.scadenze.oggi');
    return g === 1 ? t('dashboard.scadenze.fraUno') : t('dashboard.scadenze.fra', { n: g });
  };
  const rigaScadenza = (s: ScadenzaMandato) => {
    const g = giorniDaOggi(s.scadenza);
    const scaduta = g < 0;
    const urgente = g >= 0 && g <= 7;
    const etichettaTipo = tipo(s);
    return (
      <RigaDashboard
        key={s.id}
        ruolo="link"
        icona={scaduta ? 'avviso' : 'orologio'}
        coloreIcona={scaduta ? colori.danger : urgente ? colori.warn : colori.accentText}
        titolo={etichettaTipo ? `${s.titolo} · ${etichettaTipo}` : s.titolo}
        sottotitolo={[nomeCliente(studio.clienti, s.clienteId), mandato(s.mandatoId)?.titolo]
          .filter(Boolean)
          .join(' · ')}
        destra={
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Text style={stili.data}>{dataBreve(s.scadenza, lingua)}</Text>
            <Text
              style={[stili.quando, { color: scaduta ? colori.danger : urgente ? colori.warn : colori.fg3 }]}
            >
              {quando(s)}
            </Text>
          </View>
        }
        onPress={() => banco(s)}
      />
    );
  };

  const maxMese = Math.max(1, ...d.mesi.map((m) => m.totale));
  const conClienti =
    d.clienti === 1 ? 'dashboard.fiduciario.sottotitoloUno' : 'dashboard.fiduciario.sottotitolo';

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={stiliDashboard.pagina}>
      <View style={{ gap: 6 }}>
        <Eyebrow>
          {ch ? t('dashboard.fiduciario.etichetta') : t('dashboard.commercialista.etichetta')}
        </Eyebrow>
        <Testo tipo="dM">
          {ch
            ? utente.nome
              ? t('dashboard.fiduciario.titoloNome', { nome: utente.nome })
              : t('dashboard.fiduciario.titolo')
            : t('dashboard.commercialista.sottotitolo')}
        </Testo>
        {ch ? (
          <Testo tipo="small" colore={colori.fg2}>
            {t(conClienti, { anno: d.anno, n: d.clienti })}
          </Testo>
        ) : null}
      </View>

      <View style={stiliDashboard.griglia}>
        <View style={stiliDashboard.cella}>
          <Contatore valore={d.clienti} etichetta={t('dashboard.kpi.clienti')} colore={colori.accentText} />
        </View>
        <View style={stiliDashboard.cella}>
          <Contatore
            valore={d.mandatiAttivi}
            etichetta={t('dashboard.kpi.mandati')}
            colore={colori.accentText}
          />
        </View>
        <View style={stiliDashboard.cella}>
          <Contatore
            piccolo
            valore={importo(d.fatturato, paese)}
            etichetta={ch ? t('dashboard.kpi.fatturato', { anno: d.anno }) : t('dashboard.kpi.fatturatoAnno')}
            colore={colori.ok}
            onPress={() => router.push('/fatture')}
          />
        </View>
        {ch ? null : (
          <View style={stiliDashboard.cella}>
            <Contatore
              piccolo
              valore={importo(d.incassato, paese)}
              etichetta={t('dashboard.kpi.incassatoAnno')}
              colore={colori.ok}
              onPress={() => router.push('/fatture')}
            />
          </View>
        )}
        <View style={stiliDashboard.cella}>
          <Contatore
            piccolo
            valore={importo(d.daIncassare, paese)}
            etichetta={t('dashboard.kpi.daIncassare')}
            colore={
              ch ? (d.scaduto > 0 ? colori.danger : colori.fg) : d.daIncassare > 0 ? colori.warn : colori.fg3
            }
            onPress={() => router.push('/fatture')}
          />
        </View>
      </View>

      {!ch && d.fattureScadute > 0 ? (
        <Pressable
          onPress={() => router.push('/fatture')}
          accessibilityRole="link"
          style={({ pressed }) => [stili.allarme, pressed && { opacity: 0.85 }]}
        >
          <Icona nome="avviso" dimensione={18} colore={colori.danger} />
          <Text style={stili.allarmeTesto}>
            {d.fattureScadute === 1
              ? t('dashboard.fattureScadute.uno')
              : t('dashboard.fattureScadute.molte', { n: d.fattureScadute })}
          </Text>
          <Text style={stili.allarmeAzione}>{t('dashboard.fattureScadute.gestisci')}</Text>
        </Pressable>
      ) : null}

      {ch && d.scadenzeScadute.length > 0 ? (
        <View style={stili.scadute}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, paddingBottom: 6 }}>
            <Icona nome="avviso" dimensione={18} colore={colori.danger} />
            <Text style={stili.allarmeTesto}>
              {d.scadenzeScadute.length === 1
                ? t('dashboard.scadenze.scaduteUno')
                : t('dashboard.scadenze.scadute', { n: d.scadenzeScadute.length })}
            </Text>
          </View>
          {d.scadenzeScadute.slice(0, 6).map(rigaScadenza)}
        </View>
      ) : null}

      <Sezione
        titolo={ch ? t('dashboard.scadenze.titolo') : t('dashboard.scadenze.titoloFiscali')}
        icona="orologio"
        link={t('dashboard.scadenze.banco')}
        esterno
        onLink={() => banco()}
        vuoto={ch ? t('dashboard.scadenze.vuoto') : t('dashboard.scadenze.vuotoFiscali')}
      >
        {d.prossimeScadenze.length ? (
          <>
            {d.prossimeScadenze.map(rigaScadenza)}
            <Nota>{t('dashboard.scadenze.sulSito')}</Nota>
          </>
        ) : undefined}
      </Sezione>

      <Sezione
        titolo={ch ? t('dashboard.appuntamenti.titolo') : t('dashboard.appuntamenti.titoloSettimana')}
        icona="calendario"
        link={t('dashboard.appuntamenti.calendario')}
        onLink={() => router.push('/calendario')}
        vuoto={t('dashboard.appuntamenti.vuoto')}
      >
        {d.appuntamenti.length
          ? d.appuntamenti.map((a) => {
              const i = iconaEvento(a.tipo);
              return (
                <RigaDashboard
                  key={a.id}
                  icona={i.nome}
                  coloreIcona={i.colore}
                  titolo={a.titolo}
                  sottotitolo={
                    a.clienteId
                      ? nomeCliente(studio.clienti, a.clienteId)
                      : t('dashboard.appuntamenti.studio')
                  }
                  destra={
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      <Text style={stili.data}>{dataBreve(a.inizio, lingua)}</Text>
                      <Text style={[stili.quando, { color: colori.fg3 }]}>{ora(a.inizio)}</Text>
                    </View>
                  }
                  onPress={() => router.push('/calendario')}
                />
              );
            })
          : undefined}
      </Sezione>

      {ch ? (
        <Sezione titolo={t('dashboard.annoStudio.titolo', { anno: d.anno })} icona="ricevuta">
          <View style={[stiliDashboard.griglia, { padding: 12 }]}>
            {[
              { titolo: t('dashboard.annoStudio.fatturato'), valore: d.fatturato, colore: colori.fg },
              { titolo: t('dashboard.annoStudio.incassato'), valore: d.incassato, colore: colori.ok },
              { titolo: t('dashboard.annoStudio.daIncassare'), valore: d.daIncassare, colore: colori.fg },
              {
                titolo: t('dashboard.annoStudio.scaduto'),
                valore: d.scaduto,
                colore: d.scaduto > 0 ? colori.danger : colori.fg,
              },
            ].map((x) => (
              <View key={x.titolo} style={stiliDashboard.cella}>
                <Contatore piccolo valore={importo(x.valore, paese)} etichetta={x.titolo} colore={x.colore} />
              </View>
            ))}
          </View>
          <Nota>{t('dashboard.annoStudio.nota')}</Nota>
        </Sezione>
      ) : (
        <Sezione
          titolo={t('dashboard.mesi.titolo')}
          icona="ricevuta"
          link={t('dashboard.mesi.vai')}
          onLink={() => router.push('/fatture')}
        >
          <View style={{ padding: 14, gap: 10 }}>
            {d.mesi.map((m) => (
              <View
                key={`${m.anno}-${m.mese}`}
                style={stili.mese}
                accessible
                accessibilityLabel={`${meseBreve(m.mese, lingua)} ${m.anno}: ${importo(m.totale, paese)}`}
              >
                <Text style={stili.meseNome}>{meseBreve(m.mese, lingua)}</Text>
                <View style={stili.barra}>
                  <View
                    style={[stili.barraPiena, { width: `${(Math.max(0, m.totale) / maxMese) * 100}%` }]}
                  />
                </View>
                <Text style={stili.meseValore} numberOfLines={1}>
                  {importo(m.totale, paese)}
                </Text>
              </View>
            ))}
          </View>
        </Sezione>
      )}

      {ch && d.conti.length > 0 ? (
        <Sezione
          titolo={t('dashboard.conti.titolo', { anno: d.anno })}
          icona="persone"
          link={t('dashboard.apriSito')}
          esterno
          onLink={() => apriSito(`${sito}/clienti`)}
        >
          <Nota>{t('dashboard.conti.nota')}</Nota>
          {d.conti.map((c) => (
            <View key={c.clienteId} style={stili.conto}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
                <Text style={[stili.contoNome, { flex: 1 }]} numberOfLines={2}>
                  {nomeCliente(studio.clienti, c.clienteId)}
                </Text>
                <Badge
                  tono={c.saldo >= 0 ? 'ok' : 'pericolo'}
                >{`${t('dashboard.conti.saldo')} ${importo(c.saldo, paese)}`}</Badge>
              </View>
              <Text style={stili.contoRighe}>
                {[
                  `${t('dashboard.conti.entrate')} ${c.entrate ? importo(c.entrate, paese) : '—'}`,
                  `${t('dashboard.conti.costi')} ${c.costi ? importo(c.costi, paese) : '—'}`,
                  `${t('dashboard.conti.stipendi')} ${c.stipendi ? importo(c.stipendi, paese) : '—'}`,
                ].join(' · ')}
              </Text>
            </View>
          ))}
        </Sezione>
      ) : null}
    </ScrollView>
  );
}

const stili = StyleSheet.create({
  data: { fontFamily: famiglie.testo, fontSize: 13, color: colori.fg2 },
  quando: { fontFamily: famiglie.testo, fontSize: 12 },
  allarme: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    padding: 14,
    borderWidth: 1,
    borderColor: colori.dangerLine,
    backgroundColor: 'rgba(232,150,138,0.08)',
  },
  allarmeTesto: { flex: 1, fontFamily: famiglie.testoMedio, fontSize: 14, color: colori.danger },
  allarmeAzione: { fontFamily: famiglie.testo, fontSize: 13, color: colori.danger },
  scadute: { borderWidth: 1, borderColor: colori.dangerLine, backgroundColor: 'rgba(232,150,138,0.08)' },
  mese: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  meseNome: { width: 40, fontFamily: famiglie.testo, fontSize: 12, color: colori.fg3 },
  barra: { flex: 1, height: 14, backgroundColor: colori.bg },
  barraPiena: { height: 14, backgroundColor: colori.okLine },
  meseValore: { width: 96, textAlign: 'right', fontFamily: famiglie.testo, fontSize: 12, color: colori.fg2 },
  conto: {
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colori.line,
  },
  contoNome: { fontFamily: famiglie.testo, fontSize: 15, color: colori.fg },
  contoRighe: { fontFamily: famiglie.testo, fontSize: 12, lineHeight: 17, color: colori.fg3 },
});
