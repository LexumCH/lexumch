import { fireEvent, render, screen } from '@testing-library/react-native';

import { Pulsante } from '@/componenti/Pulsante';
import { StatoVuoto } from '@/componenti/Stati';
import { FoglioElimina } from '@/fogli/FoglioElimina';
import { StatoProvider } from '@/stato/Stato';

describe('componenti', () => {
  it('il pulsante risponde al tocco e si spegne se disabilitato', async () => {
    const tocco = jest.fn();
    const { rerender } = await render(<Pulsante titolo="Accedi" onPress={tocco} />);
    await fireEvent.press(screen.getByText('Accedi'));
    expect(tocco).toHaveBeenCalledTimes(1);
    await rerender(<Pulsante titolo="Accedi" onPress={tocco} disabilitato />);
    await fireEvent.press(screen.getByText('Accedi'));
    expect(tocco).toHaveBeenCalledTimes(1);
  });

  it('lo stato vuoto mostra il testo e l’azione', async () => {
    const azione = jest.fn();
    await render(
      <StatoVuoto
        icona="archivio"
        titolo="L'archivio è vuoto"
        azione={{ titolo: 'Carica', onPress: azione }}
      />,
    );
    expect(screen.getByText("L'archivio è vuoto")).toBeTruthy();
    await fireEvent.press(screen.getByText('Carica'));
    expect(azione).toHaveBeenCalled();
  });

  it('la conferma «Elimina account» usa i testi approvati e dice che l’altro accesso resta', async () => {
    const elimina = jest.fn();
    await render(
      <StatoProvider>
        <FoglioElimina visibile onChiudi={jest.fn()} onElimina={elimina} />
      </StatoProvider>,
    );
    expect(screen.getByText("Eliminare l'accesso italiano?")).toBeTruthy();
    expect(screen.getByText(/L'accesso svizzero resta attivo/)).toBeTruthy();
    await fireEvent.press(screen.getByText("Elimina l'accesso italiano"));
    expect(elimina).toHaveBeenCalled();
  });
});
