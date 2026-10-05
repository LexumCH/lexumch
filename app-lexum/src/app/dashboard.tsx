import { BottoneMenu, Intestazione } from '@/componenti/Intestazione';
import { Schermata } from '@/componenti/Schermata';
import { StatoVuoto } from '@/componenti/Stati';
import { useTesti } from '@/lingue/useTesti';
import { apriSito } from '@/navigazione';
import { trovaPaese } from '@/paesi/registro';
import { strumentiStudio } from '@/ruoli';
import { useStato } from '@/stato/Stato';
import { DashboardAvvocato } from '@/studio/DashboardAvvocato';
import { DashboardStudio } from '@/studio/DashboardStudio';

// S0 · Dashboard dei professionisti, come sui siti: per l'avvocato l'agenda e le pratiche da seguire,
// per commercialisti e fiduciari il quadro dello studio. Gli altri ruoli la trovano sul sito.
export default function Dashboard() {
  const { paese, ruoli } = useStato();
  const { t } = useTesti();
  const ruolo = ruoli[paese] ?? 'user';
  const conDashboard = strumentiStudio(ruolo).includes('dashboard');

  return (
    <Schermata>
      <Intestazione sinistra={<BottoneMenu />} titolo={t('dashboard.titolo')} />
      {!conDashboard ? (
        <StatoVuoto
          icona="cruscotto"
          titolo={t('dashboard.altri.titolo')}
          testo={t('dashboard.altri.testo')}
          azione={{ titolo: t('dashboard.apriSito'), onPress: () => apriSito(trovaPaese(paese).sito) }}
        />
      ) : ruolo === 'avvocato' ? (
        <DashboardAvvocato />
      ) : (
        <DashboardStudio />
      )}
    </Schermata>
  );
}
