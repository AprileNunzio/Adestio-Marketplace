const RUOLI = [
    { valore: 'odontoiatra', etichetta: 'Odontoiatra' },
    { valore: 'medico', etichetta: 'Medico specialista' },
    { valore: 'igienista', etichetta: 'Igienista dentale' },
    { valore: 'aso', etichetta: 'Assistente ASO' },
    { valore: 'odontotecnico', etichetta: 'Odontotecnico' },
    { valore: 'segreteria', etichetta: 'Segreteria' },
    { valore: 'amministrazione', etichetta: 'Amministrazione' }
];

export const TONI_RUOLO = {
    odontoiatra: 'success',
    medico: 'success',
    igienista: 'info',
    aso: 'warning',
    odontotecnico: 'neutral',
    segreteria: 'neutral',
    amministrazione: 'neutral'
};

export const SEZIONI_STAFF = [
    {
        titolo: 'Identificazione',
        campi: [
            { campo: 'cognome', etichetta: 'Cognome *' },
            { campo: 'nome', etichetta: 'Nome *' },
            { campo: 'secondo_nome', etichetta: 'Secondo nome' },
            { campo: 'codice_fiscale', etichetta: 'Codice fiscale', max: 16 },
            { campo: 'partita_iva', etichetta: 'Partita IVA', max: 11 },
            { campo: 'ruolo', etichetta: 'Ruolo *', genere: 'selezione', opzioni: RUOLI, vuoto: false },
            { campo: 'specializzazione', etichetta: 'Specializzazione' },
            { campo: 'numero_albo', etichetta: 'Numero iscrizione albo' }
        ]
    },
    {
        titolo: 'Contatti e agenda',
        campi: [
            { campo: 'telefono', etichetta: 'Telefono' },
            { campo: 'email', etichetta: 'Email' },
            { campo: 'colore_agenda', etichetta: 'Colore in agenda', tipo: 'color' },
            { campo: 'utente_adestio_id', etichetta: 'Utente Adestio associato', aiuto: 'Per collegare i permessi RBAC' },
            { campo: 'attivo', etichetta: 'In servizio', genere: 'booleano' }
        ]
    },
    {
        titolo: 'Trattamento economico',
        campi: [
            {
                campo: 'tipo_rapporto',
                etichetta: 'Tipo di rapporto',
                genere: 'selezione',
                vuoto: false,
                opzioni: [
                    { valore: 'dipendente', etichetta: 'Dipendente' },
                    { valore: 'collaboratore', etichetta: 'Collaboratore' },
                    { valore: 'libero_professionista', etichetta: 'Libero professionista' },
                    { valore: 'socio', etichetta: 'Socio' }
                ]
            },
            { campo: 'compenso_mensile', etichetta: 'Compenso fisso mensile (€)', genere: 'numero', aiuto: 'Maturato in proporzione ai giorni del periodo' },
            { campo: 'percentuale_default', etichetta: 'Percentuale di default (%)', genere: 'numero', aiuto: 'Usata quando non esiste un accordo specifico' },
            { campo: 'costo_orario', etichetta: 'Costo orario (€)', genere: 'numero' },
            { campo: 'ritenuta_acconto_percentuale', etichetta: 'Ritenuta d\'acconto (%)', genere: 'numero' },
            { campo: 'note', etichetta: 'Note', genere: 'area', ampio: true }
        ]
    }
];

export const STAFF_VUOTO = {
    cognome: '', nome: '', secondo_nome: '', codice_fiscale: '', partita_iva: '',
    ruolo: 'odontoiatra', specializzazione: '', numero_albo: '', telefono: '', email: '',
    colore_agenda: '#0d9488', utente_adestio_id: '', attivo: 1,
    percentuale_default: 0, costo_orario: 0, ritenuta_acconto_percentuale: 0, note: '',
    compenso_mensile: 0, tipo_rapporto: 'collaboratore'
};
