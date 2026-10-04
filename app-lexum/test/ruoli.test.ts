import { gruppoRuolo, nomeRuolo } from '@/ruoli';

describe('ruoli', () => {
  it('ogni ruolo dei siti ha un gruppo e un nome', () => {
    expect(gruppoRuolo('user')).toBe('privato');
    expect(gruppoRuolo('avvocato')).toBe('professionista');
    expect(gruppoRuolo('fiduciario')).toBe('professionista');
    expect(gruppoRuolo('cliente')).toBe('cliente');
    expect(gruppoRuolo('admin')).toBe('interno');
    expect(nomeRuolo('commercialista')).toBe('Commercialista');
  });

  it('un ruolo sconosciuto entra lo stesso, senza errori', () => {
    expect(gruppoRuolo('nuovo-ruolo')).toBe('professionista');
    expect(nomeRuolo('nuovo-ruolo')).toBe('Account professionale');
  });
});
