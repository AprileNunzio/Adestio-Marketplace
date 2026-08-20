export const SCHEDE = [
    {
        id: 'anagrafica',
        titolo: 'Anagrafica',
        simbolo: 'contact_page',
        permesso: 'pazienti_view',
        modulo: () => import('./anagrafica.js')
    },
    {
        id: 'anamnesi',
        titolo: 'Anamnesi',
        simbolo: 'clinical_notes',
        permesso: 'anamnesi_view',
        modulo: () => import('./anamnesi.js')
    },
    {
        id: 'odontogramma',
        titolo: 'Odontogramma',
        simbolo: 'dentistry',
        permesso: 'cartella_view',
        modulo: () => import('./odontogramma.js')
    },
    {
        id: 'trattamenti',
        titolo: 'Diario trattamenti',
        simbolo: 'medical_services',
        permesso: 'cartella_view',
        modulo: () => import('./trattamenti.js')
    },
    {
        id: 'prescrizioni',
        titolo: 'Prescrizioni',
        simbolo: 'prescriptions',
        permesso: 'prescrizioni_view',
        modulo: () => import('./prescrizioni.js')
    },
    {
        id: 'referti',
        titolo: 'Archivio diagnostico',
        simbolo: 'imagesmode',
        permesso: 'allegati_view',
        modulo: () => import('./referti.js')
    },
    {
        id: 'consensi',
        titolo: 'Consensi',
        simbolo: 'assignment_turned_in',
        permesso: 'consensi_view',
        modulo: () => import('./consensi.js')
    },
    {
        id: 'documenti',
        titolo: 'Documenti firmati',
        simbolo: 'draw',
        permesso: 'firme_view',
        modulo: () => import('./documenti.js')
    },
    {
        id: 'economia',
        titolo: 'Piano economico',
        simbolo: 'receipt_long',
        permesso: 'preventivi_view',
        modulo: () => import('./economia.js')
    }
];
