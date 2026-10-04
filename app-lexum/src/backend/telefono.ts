import AsyncStorage from '@react-native-async-storage/async-storage';

// Il paese attivo resta salvato sul telefono: alla riapertura l'app riparte da lì.
const CHIAVE_PAESE = 'lexum-paese';

export async function leggiPaeseSalvato(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(CHIAVE_PAESE);
  } catch {
    return null;
  }
}

export async function salvaPaese(codice: string): Promise<void> {
  try {
    await AsyncStorage.setItem(CHIAVE_PAESE, codice);
  } catch {
    // se il telefono non salva, alla prossima apertura si sceglie di nuovo il paese
  }
}
