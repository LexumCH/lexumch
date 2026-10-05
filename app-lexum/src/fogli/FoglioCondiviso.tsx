import { useState } from 'react';
import { View } from 'react-native';

import { Campo } from '@/componenti/Campi';
import { IconaQuadrata, Tag } from '@/componenti/Elementi';
import { Foglio } from '@/componenti/Foglio';
import { Pulsante } from '@/componenti/Pulsante';
import { Eyebrow, Testo } from '@/componenti/Testo';
import { categorieFinte, fileCondivisoFinto } from '@/dati-finti/archivio';
import { useTesti } from '@/lingue/useTesti';
import { useStato } from '@/stato/Stato';
import { colori } from '@/tema';

type Props = {
  visibile: boolean;
  onChiudi: () => void;
  onSalvato: () => void;
};

// D2 · «Condividi in Lexum»: un file arrivato da un'altra app si salva in Archivio,
// con il nome e la categoria che scegli. Poi segue lo stesso caricamento di «Carica».
export function FoglioCondiviso({ visibile, onChiudi, onSalvato }: Props) {
  const { paese, azioni } = useStato();
  const { t } = useTesti();
  const file = fileCondivisoFinto[paese];
  const categorie = categorieFinte[paese] ?? [];
  const [titolo, setTitolo] = useState(file.titolo);
  const [categoria, setCategoria] = useState<string | null>(null);
  const [eraVisibile, setEraVisibile] = useState(visibile);
  if (visibile !== eraVisibile) {
    setEraVisibile(visibile);
    if (visibile) {
      setTitolo(file.titolo);
      setCategoria(null);
    }
  }

  return (
    <Foglio visibile={visibile} onChiudi={onChiudi} spazio={16}>
      <View style={{ gap: 6 }}>
        <Eyebrow>{t('archivio.condiviso.sopratitolo')}</Eyebrow>
        <Testo tipo="dS">{t('archivio.condiviso.titolo')}</Testo>
      </View>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <IconaQuadrata nome="documento" tenue />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Testo numberOfLines={1}>{file.nome}</Testo>
          <Testo tipo="cap">
            {file.tipo} · {file.dimensione}
          </Testo>
        </View>
      </View>
      <Campo
        etichetta={t('archivio.condiviso.nome')}
        value={titolo}
        onChangeText={setTitolo}
        maxLength={80}
      />
      <View style={{ gap: 8 }}>
        <Testo tipo="small" colore={colori.fg2}>
          {t('archivio.condiviso.categoria')}
        </Testo>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {categorie.map((c) => (
            <Tag
              key={c}
              titolo={c}
              attivo={c === categoria}
              onPress={() => setCategoria(c === categoria ? null : c)}
            />
          ))}
        </View>
      </View>
      <Pulsante
        titolo={t('archivio.condiviso.salva')}
        icona="archivio"
        disabilitato={!titolo.trim()}
        onPress={() => {
          azioni.salvaInArchivio({
            titolo: titolo.trim(),
            categoria,
            dimensione: file.dimensione,
            tipo: file.tipo,
          });
          onSalvato();
        }}
      />
      <Testo tipo="cap">{t('archivio.condiviso.nota')}</Testo>
    </Foglio>
  );
}
