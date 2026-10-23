// src/lib/contoAnnualeTesti.js
//
// 09-10-2026: le diciture del conto annuale (art. 958-959c CO) in italiano, tedesco e francese. Stanno qui e
// non nei file di traduzione perché il documento si scrive nella lingua scelta per il cliente, che può
// essere diversa da quella del fiduciario: lo stesso schermo deve poter stampare un conto annuale in tedesco
// mentre l'interfaccia è in italiano. Le poste seguono il testo dell'art. 959a e 959b CO nelle tre lingue.

export const LINGUE_DOCUMENTO = ['it', 'de', 'fr']

export const TESTI_CO = {
    it: {
        poste: {
            att_liquidita: 'Liquidità e attivi detenuti a breve termine con un corso di borsa',
            att_crediti_ff: 'Crediti risultanti da forniture e prestazioni',
            att_altri_crediti: 'Altri crediti a breve termine',
            att_scorte: 'Scorte e prestazioni di servizi non fatturate',
            att_ratei: 'Ratei e risconti attivi',
            att_imm_finanziarie: 'Immobilizzazioni finanziarie',
            att_partecipazioni: 'Partecipazioni',
            att_imm_materiali: 'Immobilizzazioni materiali',
            att_imm_immateriali: 'Immobilizzazioni immateriali',
            att_capitale_non_versato: 'Capitale non versato',
            pas_debiti_ff: 'Debiti risultanti da forniture e prestazioni',
            pas_debiti_onerosi_bt: 'Debiti onerosi a breve termine',
            pas_altri_debiti_bt: 'Altri debiti a breve termine',
            pas_ratei: 'Ratei e risconti passivi',
            pas_accantonamenti_bt: 'Accantonamenti a breve termine',
            pas_debiti_onerosi_lt: 'Debiti onerosi a lungo termine',
            pas_altri_debiti_lt: 'Altri debiti a lungo termine',
            pas_accantonamenti: 'Accantonamenti e poste analoghe previste dalla legge',
            cp_capitale: 'Capitale sociale',
            cp_privato: 'Conto privato',
            cp_riserva_capitale: 'Riserva legale da capitale',
            cp_riserva_utili: 'Riserva legale da utili',
            cp_riserve_facoltative: 'Riserve facoltative da utili',
            cp_utile_riportato: 'Utile riportato / perdita riportata',
            cp_utile_esercizio: 'Utile / perdita d’esercizio',
            cp_quote_proprie: 'Quote proprie del capitale',
            ce_ricavi: 'Ricavi netti da forniture e prestazioni',
            ce_altri_ricavi: 'Altri ricavi d’esercizio',
            ce_variazione_scorte: 'Variazione delle scorte di prodotti finiti e in corso di fabbricazione e delle prestazioni di servizi non fatturate',
            ce_materiale: 'Costi per il materiale',
            ce_personale: 'Costi per il personale',
            ce_altri_costi: 'Altri costi d’esercizio',
            ce_ammortamenti: 'Ammortamenti e rettifiche di valore sulle poste dell’attivo fisso',
            ce_fin_costi: 'Costi finanziari',
            ce_fin_ricavi: 'Ricavi finanziari',
            ce_estranei_costi: 'Costi estranei all’esercizio',
            ce_estranei_ricavi: 'Ricavi estranei all’esercizio',
            ce_straordinari_costi: 'Costi straordinari, unici o relativi ad altri periodi contabili',
            ce_straordinari_ricavi: 'Ricavi straordinari, unici o relativi ad altri periodi contabili',
            ce_imposte: 'Imposte dirette',
            tecnico: 'Conti di chiusura (nessuna posta)',
        },
        capitale: {
            sa: 'Capitale azionario', sagl: 'Capitale sociale', cooperativa: 'Capitale sociale (quote sociali)',
            fondazione: 'Capitale della fondazione', associazione: 'Capitale dell’associazione',
            ditta: 'Capitale proprio', societa_persone: 'Capitale dei soci', altro: 'Capitale sociale',
        },
        gruppi: {
            attivo_circolante: 'Attivo circolante', attivo_fisso: 'Attivo fisso',
            terzi_breve: 'Capitale di terzi a breve termine', terzi_lungo: 'Capitale di terzi a lungo termine',
            capitale_proprio: 'Capitale proprio',
        },
        sezioni: { attivo: 'Attivi', passivo: 'Passivi' },
        totale: 'Totale',
        subtotali: {
            totale_ricavi: 'Ricavi d’esercizio',
            ebitda: 'Risultato prima di ammortamenti, interessi e imposte (EBITDA)',
            ebit: 'Risultato prima di interessi e imposte (EBIT)',
            risultato_ordinario: 'Risultato ordinario',
            risultato_prima_imposte: 'Utile o perdita prima delle imposte',
            risultato_esercizio: 'Utile o perdita d’esercizio',
        },
        documento: {
            titolo: 'Conto annuale',
            esercizio: 'Esercizio dal {{inizio}} al {{fine}}',
            bilancio: 'Bilancio al {{data}}',
            conto_economico: 'Conto economico dal {{inizio}} al {{fine}}',
            allegato: 'Allegato',
            importi: 'Importi in franchi svizzeri (CHF)',
            metodo: 'Conto economico della produzione (metodo del costo complessivo, art. 959b cpv. 2 CO)',
            colonna_esercizio: 'Esercizio',
            colonna_precedente: 'Esercizio precedente',
            primo_esercizio: 'Primo esercizio: non ci sono cifre dell’esercizio precedente.',
            idi: 'IDI',
            sede: 'Sede',
            firme: 'Firme',
            luogo_data: 'Luogo e data',
            bozza: 'BOZZA',
            pagina: 'Pagina {{n}} di {{tot}}',
            senza_allegato: 'Impresa individuale o società di persone: allegato non redatto (art. 959c cpv. 3 CO).',
        },
        impiego: {
            titolo: {
                sa: 'Proposta del consiglio d’amministrazione sull’impiego dell’utile risultante dal bilancio',
                sagl: 'Proposta dei gerenti sull’impiego dell’utile risultante dal bilancio',
                cooperativa: 'Proposta dell’amministrazione sull’impiego dell’utile risultante dal bilancio',
                altro: 'Proposta sull’impiego dell’utile risultante dal bilancio',
            },
            titolo_perdita: {
                sa: 'Proposta del consiglio d’amministrazione sull’impiego della perdita risultante dal bilancio',
                sagl: 'Proposta dei gerenti sull’impiego della perdita risultante dal bilancio',
                cooperativa: 'Proposta dell’amministrazione sull’impiego della perdita risultante dal bilancio',
                altro: 'Proposta sull’impiego della perdita risultante dal bilancio',
            },
            intro: {
                sa: 'Il consiglio d’amministrazione propone all’assemblea generale di impiegare l’utile risultante dal bilancio come segue:',
                sagl: 'I gerenti propongono all’assemblea dei soci di impiegare l’utile risultante dal bilancio come segue:',
                cooperativa: 'L’amministrazione propone all’assemblea generale di impiegare l’utile risultante dal bilancio come segue:',
                altro: 'Si propone all’assemblea di impiegare l’utile risultante dal bilancio come segue:',
            },
            intro_perdita: {
                sa: 'Il consiglio d’amministrazione propone all’assemblea generale di impiegare la perdita risultante dal bilancio come segue:',
                sagl: 'I gerenti propongono all’assemblea dei soci di impiegare la perdita risultante dal bilancio come segue:',
                cooperativa: 'L’amministrazione propone all’assemblea generale di impiegare la perdita risultante dal bilancio come segue:',
                altro: 'Si propone all’assemblea di impiegare la perdita risultante dal bilancio come segue:',
            },
            riportato_utile: 'Utile riportato dall’esercizio precedente',
            riportato_perdita: 'Perdita riportata dall’esercizio precedente',
            esercizio_utile: 'Utile dell’esercizio',
            esercizio_perdita: 'Perdita dell’esercizio',
            bilancio_utile: 'Utile risultante dal bilancio',
            bilancio_perdita: 'Perdita risultante dal bilancio',
            prelievo: 'Prelievo dalle riserve facoltative da utili',
            disponibile: 'Importo a disposizione',
            riserva: 'Attribuzione alla riserva legale da utili',
            dividendo: 'Dividendo',
            dividendo_perc: 'Dividendo ({{perc}} % del capitale)',
            facoltative: 'Attribuzione alle riserve facoltative da utili',
            riporto: 'Riporto a nuovo',
        },
        ruoli: {
            presidente_cda: 'Presidente del consiglio d’amministrazione',
            gerente: 'Presidente della gestione / gerente',
            presidente: 'Presidente',
            titolare: 'Titolare',
            soci: 'Soci con diritto di firma',
            responsabile_conti: 'Responsabile della presentazione dei conti',
        },
    },
    de: {
        poste: {
            att_liquidita: 'Flüssige Mittel und kurzfristig gehaltene Aktiven mit Börsenkurs',
            att_crediti_ff: 'Forderungen aus Lieferungen und Leistungen',
            att_altri_crediti: 'Übrige kurzfristige Forderungen',
            att_scorte: 'Vorräte und nicht fakturierte Dienstleistungen',
            att_ratei: 'Aktive Rechnungsabgrenzungen',
            att_imm_finanziarie: 'Finanzanlagen',
            att_partecipazioni: 'Beteiligungen',
            att_imm_materiali: 'Sachanlagen',
            att_imm_immateriali: 'Immaterielle Werte',
            att_capitale_non_versato: 'Nicht einbezahltes Kapital',
            pas_debiti_ff: 'Verbindlichkeiten aus Lieferungen und Leistungen',
            pas_debiti_onerosi_bt: 'Kurzfristige verzinsliche Verbindlichkeiten',
            pas_altri_debiti_bt: 'Übrige kurzfristige Verbindlichkeiten',
            pas_ratei: 'Passive Rechnungsabgrenzungen',
            pas_accantonamenti_bt: 'Kurzfristige Rückstellungen',
            pas_debiti_onerosi_lt: 'Langfristige verzinsliche Verbindlichkeiten',
            pas_altri_debiti_lt: 'Übrige langfristige Verbindlichkeiten',
            pas_accantonamenti: 'Rückstellungen sowie vom Gesetz vorgesehene ähnliche Positionen',
            cp_capitale: 'Grundkapital',
            cp_privato: 'Privat',
            cp_riserva_capitale: 'Gesetzliche Kapitalreserve',
            cp_riserva_utili: 'Gesetzliche Gewinnreserve',
            cp_riserve_facoltative: 'Freiwillige Gewinnreserven',
            cp_utile_riportato: 'Gewinnvortrag / Verlustvortrag',
            cp_utile_esercizio: 'Jahresgewinn / Jahresverlust',
            cp_quote_proprie: 'Eigene Kapitalanteile',
            ce_ricavi: 'Nettoerlöse aus Lieferungen und Leistungen',
            ce_altri_ricavi: 'Übrige betriebliche Erträge',
            ce_variazione_scorte: 'Bestandesänderungen an unfertigen und fertigen Erzeugnissen sowie an nicht fakturierten Dienstleistungen',
            ce_materiale: 'Materialaufwand',
            ce_personale: 'Personalaufwand',
            ce_altri_costi: 'Übriger betrieblicher Aufwand',
            ce_ammortamenti: 'Abschreibungen und Wertberichtigungen auf Positionen des Anlagevermögens',
            ce_fin_costi: 'Finanzaufwand',
            ce_fin_ricavi: 'Finanzertrag',
            ce_estranei_costi: 'Betriebsfremder Aufwand',
            ce_estranei_ricavi: 'Betriebsfremder Ertrag',
            ce_straordinari_costi: 'Ausserordentlicher, einmaliger oder periodenfremder Aufwand',
            ce_straordinari_ricavi: 'Ausserordentlicher, einmaliger oder periodenfremder Ertrag',
            ce_imposte: 'Direkte Steuern',
            tecnico: 'Abschlusskonten (keine Position)',
        },
        capitale: {
            sa: 'Aktienkapital', sagl: 'Stammkapital', cooperativa: 'Genossenschaftskapital',
            fondazione: 'Stiftungskapital', associazione: 'Vereinskapital',
            ditta: 'Eigenkapital', societa_persone: 'Kapital der Gesellschafter', altro: 'Grundkapital',
        },
        gruppi: {
            attivo_circolante: 'Umlaufvermögen', attivo_fisso: 'Anlagevermögen',
            terzi_breve: 'Kurzfristiges Fremdkapital', terzi_lungo: 'Langfristiges Fremdkapital',
            capitale_proprio: 'Eigenkapital',
        },
        sezioni: { attivo: 'Aktiven', passivo: 'Passiven' },
        totale: 'Total',
        subtotali: {
            totale_ricavi: 'Betrieblicher Ertrag',
            ebitda: 'Ergebnis vor Abschreibungen, Zinsen und Steuern (EBITDA)',
            ebit: 'Ergebnis vor Zinsen und Steuern (EBIT)',
            risultato_ordinario: 'Ordentliches Ergebnis',
            risultato_prima_imposte: 'Jahresergebnis vor Steuern',
            risultato_esercizio: 'Jahresgewinn / Jahresverlust',
        },
        documento: {
            titolo: 'Jahresrechnung',
            esercizio: 'Geschäftsjahr vom {{inizio}} bis {{fine}}',
            bilancio: 'Bilanz per {{data}}',
            conto_economico: 'Erfolgsrechnung vom {{inizio}} bis {{fine}}',
            allegato: 'Anhang',
            importi: 'Beträge in Schweizer Franken (CHF)',
            metodo: 'Produktionserfolgsrechnung (Gesamtkostenverfahren, Art. 959b Abs. 2 OR)',
            colonna_esercizio: 'Geschäftsjahr',
            colonna_precedente: 'Vorjahr',
            primo_esercizio: 'Erstes Geschäftsjahr: keine Vorjahreszahlen.',
            idi: 'UID',
            sede: 'Sitz',
            firme: 'Unterschriften',
            luogo_data: 'Ort und Datum',
            bozza: 'ENTWURF',
            pagina: 'Seite {{n}} von {{tot}}',
            senza_allegato: 'Einzelunternehmen oder Personengesellschaft: kein Anhang erstellt (Art. 959c Abs. 3 OR).',
        },
        impiego: {
            titolo: {
                sa: 'Antrag des Verwaltungsrates über die Verwendung des Bilanzgewinnes',
                sagl: 'Antrag der Geschäftsführung über die Verwendung des Bilanzgewinnes',
                cooperativa: 'Antrag der Verwaltung über die Verwendung des Bilanzgewinnes',
                altro: 'Antrag über die Verwendung des Bilanzgewinnes',
            },
            titolo_perdita: {
                sa: 'Antrag des Verwaltungsrates über die Verwendung des Bilanzverlustes',
                sagl: 'Antrag der Geschäftsführung über die Verwendung des Bilanzverlustes',
                cooperativa: 'Antrag der Verwaltung über die Verwendung des Bilanzverlustes',
                altro: 'Antrag über die Verwendung des Bilanzverlustes',
            },
            intro: {
                sa: 'Der Verwaltungsrat beantragt der Generalversammlung, den Bilanzgewinn wie folgt zu verwenden:',
                sagl: 'Die Geschäftsführung beantragt der Gesellschafterversammlung, den Bilanzgewinn wie folgt zu verwenden:',
                cooperativa: 'Die Verwaltung beantragt der Generalversammlung, den Bilanzgewinn wie folgt zu verwenden:',
                altro: 'Es wird beantragt, den Bilanzgewinn wie folgt zu verwenden:',
            },
            intro_perdita: {
                sa: 'Der Verwaltungsrat beantragt der Generalversammlung, den Bilanzverlust wie folgt zu verwenden:',
                sagl: 'Die Geschäftsführung beantragt der Gesellschafterversammlung, den Bilanzverlust wie folgt zu verwenden:',
                cooperativa: 'Die Verwaltung beantragt der Generalversammlung, den Bilanzverlust wie folgt zu verwenden:',
                altro: 'Es wird beantragt, den Bilanzverlust wie folgt zu verwenden:',
            },
            riportato_utile: 'Gewinnvortrag aus dem Vorjahr',
            riportato_perdita: 'Verlustvortrag aus dem Vorjahr',
            esercizio_utile: 'Jahresgewinn',
            esercizio_perdita: 'Jahresverlust',
            bilancio_utile: 'Bilanzgewinn',
            bilancio_perdita: 'Bilanzverlust',
            prelievo: 'Entnahme aus den freiwilligen Gewinnreserven',
            disponibile: 'Verfügbarer Betrag',
            riserva: 'Zuweisung an die gesetzliche Gewinnreserve',
            dividendo: 'Dividende',
            dividendo_perc: 'Dividende ({{perc}} % des Kapitals)',
            facoltative: 'Zuweisung an die freiwilligen Gewinnreserven',
            riporto: 'Vortrag auf neue Rechnung',
        },
        ruoli: {
            presidente_cda: 'Präsident/in des Verwaltungsrates',
            gerente: 'Vorsitzende/r der Geschäftsführung',
            presidente: 'Präsident/in',
            titolare: 'Inhaber/in',
            soci: 'Zeichnungsberechtigte Gesellschafter',
            responsabile_conti: 'Für die Rechnungslegung zuständige Person',
        },
    },
    fr: {
        poste: {
            att_liquidita: 'Trésorerie et actifs cotés en bourse détenus à court terme',
            att_crediti_ff: 'Créances résultant de la vente de biens et de prestations de services',
            att_altri_crediti: 'Autres créances à court terme',
            att_scorte: 'Stocks et prestations de services non facturées',
            att_ratei: 'Actifs de régularisation',
            att_imm_finanziarie: 'Immobilisations financières',
            att_partecipazioni: 'Participations',
            att_imm_materiali: 'Immobilisations corporelles',
            att_imm_immateriali: 'Immobilisations incorporelles',
            att_capitale_non_versato: 'Capital non libéré',
            pas_debiti_ff: 'Dettes résultant de l’achat de biens et de prestations de services',
            pas_debiti_onerosi_bt: 'Dettes à court terme portant intérêt',
            pas_altri_debiti_bt: 'Autres dettes à court terme',
            pas_ratei: 'Passifs de régularisation',
            pas_accantonamenti_bt: 'Provisions à court terme',
            pas_debiti_onerosi_lt: 'Dettes à long terme portant intérêt',
            pas_altri_debiti_lt: 'Autres dettes à long terme',
            pas_accantonamenti: 'Provisions et postes analogues prévus par la loi',
            cp_capitale: 'Capital social',
            cp_privato: 'Compte privé',
            cp_riserva_capitale: 'Réserve légale issue du capital',
            cp_riserva_utili: 'Réserve légale issue du bénéfice',
            cp_riserve_facoltative: 'Réserves facultatives issues du bénéfice',
            cp_utile_riportato: 'Bénéfice reporté / perte reportée',
            cp_utile_esercizio: 'Bénéfice / perte de l’exercice',
            cp_quote_proprie: 'Propres parts du capital',
            ce_ricavi: 'Produits nets des ventes de biens et de prestations de services',
            ce_altri_ricavi: 'Autres produits d’exploitation',
            ce_variazione_scorte: 'Variation des stocks de produits finis et semi-finis et des prestations de services non facturées',
            ce_materiale: 'Charges de matériel',
            ce_personale: 'Charges de personnel',
            ce_altri_costi: 'Autres charges d’exploitation',
            ce_ammortamenti: 'Amortissements et corrections de valeur sur les postes de l’actif immobilisé',
            ce_fin_costi: 'Charges financières',
            ce_fin_ricavi: 'Produits financiers',
            ce_estranei_costi: 'Charges hors exploitation',
            ce_estranei_ricavi: 'Produits hors exploitation',
            ce_straordinari_costi: 'Charges exceptionnelles, uniques ou hors période',
            ce_straordinari_ricavi: 'Produits exceptionnels, uniques ou hors période',
            ce_imposte: 'Impôts directs',
            tecnico: 'Comptes de clôture (aucun poste)',
        },
        capitale: {
            sa: 'Capital-actions', sagl: 'Capital social', cooperativa: 'Capital social (parts sociales)',
            fondazione: 'Capital de fondation', associazione: 'Capital de l’association',
            ditta: 'Capital propre', societa_persone: 'Capital des associés', altro: 'Capital social',
        },
        gruppi: {
            attivo_circolante: 'Actif circulant', attivo_fisso: 'Actif immobilisé',
            terzi_breve: 'Capitaux étrangers à court terme', terzi_lungo: 'Capitaux étrangers à long terme',
            capitale_proprio: 'Capitaux propres',
        },
        sezioni: { attivo: 'Actifs', passivo: 'Passifs' },
        totale: 'Total',
        subtotali: {
            totale_ricavi: 'Produits d’exploitation',
            ebitda: 'Résultat avant amortissements, intérêts et impôts (EBITDA)',
            ebit: 'Résultat avant intérêts et impôts (EBIT)',
            risultato_ordinario: 'Résultat ordinaire',
            risultato_prima_imposte: 'Résultat avant impôts',
            risultato_esercizio: 'Bénéfice / perte de l’exercice',
        },
        documento: {
            titolo: 'Comptes annuels',
            esercizio: 'Exercice du {{inizio}} au {{fine}}',
            bilancio: 'Bilan au {{data}}',
            conto_economico: 'Compte de résultat du {{inizio}} au {{fine}}',
            allegato: 'Annexe',
            importi: 'Montants en francs suisses (CHF)',
            metodo: 'Compte de résultat par nature (art. 959b al. 2 CO)',
            colonna_esercizio: 'Exercice',
            colonna_precedente: 'Exercice précédent',
            primo_esercizio: 'Premier exercice : pas de chiffres de l’exercice précédent.',
            idi: 'IDE',
            sede: 'Siège',
            firme: 'Signatures',
            luogo_data: 'Lieu et date',
            bozza: 'PROJET',
            pagina: 'Page {{n}} sur {{tot}}',
            senza_allegato: 'Entreprise individuelle ou société de personnes : pas d’annexe (art. 959c al. 3 CO).',
        },
        impiego: {
            titolo: {
                sa: 'Proposition du conseil d’administration relative à l’emploi du bénéfice résultant du bilan',
                sagl: 'Proposition des gérants relative à l’emploi du bénéfice résultant du bilan',
                cooperativa: 'Proposition de l’administration relative à l’emploi du bénéfice résultant du bilan',
                altro: 'Proposition relative à l’emploi du bénéfice résultant du bilan',
            },
            titolo_perdita: {
                sa: 'Proposition du conseil d’administration relative à l’emploi de la perte résultant du bilan',
                sagl: 'Proposition des gérants relative à l’emploi de la perte résultant du bilan',
                cooperativa: 'Proposition de l’administration relative à l’emploi de la perte résultant du bilan',
                altro: 'Proposition relative à l’emploi de la perte résultant du bilan',
            },
            intro: {
                sa: 'Le conseil d’administration propose à l’assemblée générale d’employer le bénéfice résultant du bilan comme suit :',
                sagl: 'Les gérants proposent à l’assemblée des associés d’employer le bénéfice résultant du bilan comme suit :',
                cooperativa: 'L’administration propose à l’assemblée générale d’employer le bénéfice résultant du bilan comme suit :',
                altro: 'Il est proposé d’employer le bénéfice résultant du bilan comme suit :',
            },
            intro_perdita: {
                sa: 'Le conseil d’administration propose à l’assemblée générale d’employer la perte résultant du bilan comme suit :',
                sagl: 'Les gérants proposent à l’assemblée des associés d’employer la perte résultant du bilan comme suit :',
                cooperativa: 'L’administration propose à l’assemblée générale d’employer la perte résultant du bilan comme suit :',
                altro: 'Il est proposé d’employer la perte résultant du bilan comme suit :',
            },
            riportato_utile: 'Bénéfice reporté de l’exercice précédent',
            riportato_perdita: 'Perte reportée de l’exercice précédent',
            esercizio_utile: 'Bénéfice de l’exercice',
            esercizio_perdita: 'Perte de l’exercice',
            bilancio_utile: 'Bénéfice résultant du bilan',
            bilancio_perdita: 'Perte résultant du bilan',
            prelievo: 'Prélèvement sur les réserves facultatives issues du bénéfice',
            disponibile: 'Montant à disposition',
            riserva: 'Attribution à la réserve légale issue du bénéfice',
            dividendo: 'Dividende',
            dividendo_perc: 'Dividende ({{perc}} % du capital)',
            facoltative: 'Attribution aux réserves facultatives issues du bénéfice',
            riporto: 'Report à compte nouveau',
        },
        ruoli: {
            presidente_cda: 'Président·e du conseil d’administration',
            gerente: 'Président·e de la gérance',
            presidente: 'Président·e',
            titolare: 'Titulaire',
            soci: 'Associés autorisés à signer',
            responsabile_conti: 'Personne responsable de la présentation des comptes',
        },
    },
}

// Le righe di totale del bilancio, scritte per intero: in tedesco «Total kurzfristiges Fremdkapital» ma
// «Total Eigenkapital», e nessuna regola sulle maiuscole lo fa da sola
const TOTALI = {
    it: {
        attivo_circolante: 'Totale attivo circolante', attivo_fisso: 'Totale attivo fisso',
        terzi_breve: 'Totale capitale di terzi a breve termine', terzi_lungo: 'Totale capitale di terzi a lungo termine',
        capitale_proprio: 'Totale capitale proprio', attivo: 'Totale attivi', passivo: 'Totale passivi',
    },
    de: {
        attivo_circolante: 'Total Umlaufvermögen', attivo_fisso: 'Total Anlagevermögen',
        terzi_breve: 'Total kurzfristiges Fremdkapital', terzi_lungo: 'Total langfristiges Fremdkapital',
        capitale_proprio: 'Total Eigenkapital', attivo: 'Total Aktiven', passivo: 'Total Passiven',
    },
    fr: {
        attivo_circolante: 'Total actif circulant', attivo_fisso: 'Total actif immobilisé',
        terzi_breve: 'Total capitaux étrangers à court terme', terzi_lungo: 'Total capitaux étrangers à long terme',
        capitale_proprio: 'Total capitaux propres', attivo: 'Total des actifs', passivo: 'Total des passifs',
    },
}
// chiave: un gruppo del bilancio (attivo_circolante, ...) o una sezione (attivo, passivo)
export const totaleDi = (lingua, chiave) => (TOTALI[lingua] ?? TOTALI.it)[chiave] ?? chiave

// Testi nella lingua del documento, con i segnaposto {{nome}} sostituiti
export function testoCO(lingua, percorso, valori = {}) {
    const radice = TESTI_CO[lingua] ?? TESTI_CO.it
    const testo = percorso.split('.').reduce((o, k) => (o == null ? o : o[k]), radice)
    if (typeof testo !== 'string') return percorso
    return testo.replace(/\{\{(\w+)\}\}/g, (_, k) => (valori[k] ?? ''))
}

// ─── Forma giuridica (nella scheda cliente è testo libero: «SA», «Sàrl», «ditta individuale»…) ───

export function tipoForma(forma, tipoSoggetto = null) {
    const f = ` ${String(forma ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[.,;()/]/g, ' ').replace(/\s+/g, ' ')} `
    if (/ (sagl|s a g l|sarl|s a r l|gmbh)\b|garanzia limitata|responsabilite limitee|beschrankter haftung/.test(f)) return 'sagl'
    if (/accomandita per azioni|kommanditaktien|commandite par actions/.test(f)) return 'sa'
    if (/ (sa|ag|s a)\b|societa anonima|aktiengesellschaft|societe anonyme/.test(f)) return 'sa'
    if (/cooperativ|genossenschaft/.test(f)) return 'cooperativa'
    if (/fondazione|stiftung|fondation/.test(f)) return 'fondazione'
    if (/associazione|verein|association/.test(f)) return 'associazione'
    if (/nome collettivo| snc |kollektivgesellschaft|nom collectif|accomandita|kommanditgesellschaft|commandite|societa semplice|einfache gesellschaft|societe simple/.test(f)) return 'societa_persone'
    if (/ditta individuale|impresa individuale|einzelunternehm|einzelfirma|entreprise individuelle|raison individuelle/.test(f)) return 'ditta'
    if (/fisica/.test(String(tipoSoggetto ?? '').toLowerCase())) return 'ditta'
    return 'altro'
}

// Persone giuridiche: conto annuale con allegato obbligatorio (art. 957 cpv. 1 n. 2, art. 959c CO)
export const personaGiuridica = (tipo) => ['sa', 'sagl', 'cooperativa', 'fondazione', 'associazione'].includes(tipo)

// Le due firme dell'art. 958 cpv. 3 CO, proposte secondo la forma giuridica
export function ruoliFirma(tipo) {
    if (tipo === 'sa') return ['presidente_cda', 'responsabile_conti']
    if (tipo === 'sagl') return ['gerente', 'responsabile_conti']
    if (tipo === 'cooperativa' || tipo === 'associazione' || tipo === 'fondazione') return ['presidente', 'responsabile_conti']
    if (tipo === 'societa_persone') return ['soci', 'responsabile_conti']
    if (tipo === 'ditta') return ['titolare', 'responsabile_conti']
    return ['presidente_cda', 'responsabile_conti']
}

// La dicitura del capitale secondo la forma giuridica
export function etichettaPosta(lingua, posta, tipo = 'altro') {
    if (posta === 'cp_capitale') return testoCO(lingua, `capitale.${tipo}`)
    return testoCO(lingua, `poste.${posta}`)
}
