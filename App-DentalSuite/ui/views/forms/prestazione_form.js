const TIPI_QUOTA = [
    { valore: 'percentuale', etichetta: 'Percentuale sul prezzo' },
    { valore: 'fisso', etichetta: 'Importo fisso' }
];

const BRANCHE = [
    'Conservativa', 'Endodonzia', 'Chirurgia orale', 'Implantologia', 'Protesi',
    'Ortodonzia', 'Parodontologia', 'Igiene e prevenzione', 'Pedodonzia',
    'Gnatologia', 'Estetica dentale', 'Diagnostica'
].map(voce => ({ valore: voce, etichetta: voce }));

export const SEZIONI_PRESTAZIONE = [
    {
        titolo: 'Identificazione',
        campi: [
            { campo: 'nome', etichetta: 'Denominazione *', ampio: true },
            { campo: 'codice', etichetta: 'Codice nomenclatore' },
            { campo: 'categoria', etichetta: 'Categoria' },
            { campo: 'branca', etichetta: 'Branca clinica', genere: 'selezione', opzioni: BRANCHE },
            { campo: 'durata_stimata_minuti', etichetta: 'Tempo poltrona (minuti)', genere: 'numero', passo: '5' },
            { campo: 'colore_badge', etichetta: 'Colore identificativo', tipo: 'color' },
            { campo: 'attiva', etichetta: 'Prestazione erogabile', genere: 'booleano' }
        ]
    },
    {
        titolo: 'Economia della prestazione',
        campi: [
            { campo: 'prezzo_paziente', etichetta: 'Prezzo al paziente (€) *', genere: 'numero' },
            { campo: 'costo_materiale_stimato', etichetta: 'Costo materiali (€)', genere: 'numero' },
            { campo: 'tipo_quota_medico', etichetta: 'Compenso medico', genere: 'selezione', opzioni: TIPI_QUOTA, vuoto: false },
            { campo: 'valore_quota_medico', etichetta: 'Valore compenso medico', genere: 'numero' },
            { campo: 'tipo_quota_segretaria', etichetta: 'Compenso assistente', genere: 'selezione', opzioni: TIPI_QUOTA, vuoto: false },
            { campo: 'valore_quota_segretaria', etichetta: 'Valore compenso assistente', genere: 'numero' },
            { campo: 'note', etichetta: 'Note operative', genere: 'area', ampio: true }
        ]
    }
];

export const PRESTAZIONE_VUOTA = {
    nome: '', codice: '', categoria: '', branca: '', durata_stimata_minuti: 30,
    colore_badge: '#0d9488', attiva: 1, prezzo_paziente: 0, costo_materiale_stimato: 0,
    tipo_quota_medico: 'percentuale', valore_quota_medico: 0,
    tipo_quota_segretaria: 'percentuale', valore_quota_segretaria: 0, note: ''
};
