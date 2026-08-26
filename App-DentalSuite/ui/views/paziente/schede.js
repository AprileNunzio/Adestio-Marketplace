import { versione } from '../../kernel/moduli.js';

export const SCHEDE = [
    {
        id: 'anagrafica',
        titolo: 'Anagrafica',
        simbolo: 'contact_page',
        permesso: 'pazienti_view',
        modulo: () => import(`./anagrafica.js${versione()}`)
    },
    {
        id: 'anamnesi',
        titolo: 'Anamnesi',
        simbolo: 'clinical_notes',
        permesso: 'anamnesi_view',
        modulo: () => import(`./anamnesi.js${versione()}`)
    },
    {
        id: 'appuntamenti',
        titolo: 'Appuntamenti',
        simbolo: 'event',
        permesso: 'agenda_view',
        modulo: () => import(`./appuntamenti.js${versione()}`)
    },
    {
        id: 'odontogramma',
        titolo: 'Odontogramma',
        simbolo: 'dentistry',
        permesso: 'cartella_view',
        modulo: () => import(`./odontogramma.js${versione()}`)
    },
    {
        id: 'trattamenti',
        titolo: 'Diario trattamenti',
        simbolo: 'medical_services',
        permesso: 'cartella_view',
        modulo: () => import(`./trattamenti.js${versione()}`)
    },
    {
        id: 'prescrizioni',
        titolo: 'Prescrizioni',
        simbolo: 'prescriptions',
        permesso: 'prescrizioni_view',
        modulo: () => import(`./prescrizioni.js${versione()}`)
    },
    {
        id: 'referti',
        titolo: 'Archivio diagnostico',
        simbolo: 'imagesmode',
        permesso: 'allegati_view',
        modulo: () => import(`./referti.js${versione()}`)
    },
    {
        id: 'consensi',
        titolo: 'Consensi',
        simbolo: 'assignment_turned_in',
        permesso: 'consensi_view',
        modulo: () => import(`./consensi.js${versione()}`)
    },
    {
        id: 'documenti',
        titolo: 'Documenti firmati',
        simbolo: 'draw',
        permesso: 'firme_view',
        modulo: () => import(`./documenti.js${versione()}`)
    },
    {
        id: 'economia',
        titolo: 'Piano economico',
        simbolo: 'receipt_long',
        permesso: 'preventivi_view',
        modulo: () => import(`./economia.js${versione()}`)
    }
];
