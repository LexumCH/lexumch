import { useLocalSearchParams } from 'expo-router';

import { SchermataLegge } from '@/schermate/SchermataLegge';

// C4 · Sfoglia una legge dalla Banca dati.
export default function Sfoglia() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SchermataLegge leggeId={id} />;
}
