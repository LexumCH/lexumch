import { useLocalSearchParams } from 'expo-router';

import { SchermataLegge } from '@/schermate/SchermataLegge';

// C6 · Legge aperta dalla chat: si apre sopra la chat, «indietro» torna lì.
export default function LeggeDaChat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SchermataLegge leggeId={id} daChat />;
}
