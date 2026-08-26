const VALUTA = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });
const DECIMALE = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const DATA = new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
const DATA_ORA = new Intl.DateTimeFormat('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
});
const ORA = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' });
const MESE_LUNGO = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' });

export function euro(valore) {
    const numero = Number(valore);
    return VALUTA.format(Number.isFinite(numero) ? numero : 0);
}

export function numero(valore) {
    const parsed = Number(valore);
    return DECIMALE.format(Number.isFinite(parsed) ? parsed : 0);
}

export function percentuale(valore) {
    return `${numero(valore)}%`;
}

export function data(isoDate) {
    if (!isoDate) return '—';
    const parti = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(isoDate));
    if (!parti) return String(isoDate);
    return DATA.format(new Date(Number(parti[1]), Number(parti[2]) - 1, Number(parti[3])));
}

export function dataOra(timestamp) {
    const numerico = Number(timestamp);
    if (!Number.isFinite(numerico) || numerico <= 0) return '—';
    return DATA_ORA.format(new Date(numerico));
}

export function ora(timestamp) {
    const numerico = Number(timestamp);
    if (!Number.isFinite(numerico) || numerico <= 0) return '—';
    return ORA.format(new Date(numerico));
}

export function mese(chiaveIso) {
    const parti = /^(\d{4})-(\d{2})/.exec(String(chiaveIso || ''));
    if (!parti) return String(chiaveIso || '');
    return MESE_LUNGO.format(new Date(Number(parti[1]), Number(parti[2]) - 1, 1));
}

export function oggiIso() {
    const adesso = new Date();
    return isoDa(adesso);
}

export function isoDa(dataOggetto) {
    const anno = dataOggetto.getFullYear();
    const mesePad = String(dataOggetto.getMonth() + 1).padStart(2, '0');
    const giorno = String(dataOggetto.getDate()).padStart(2, '0');
    return `${anno}-${mesePad}-${giorno}`;
}

export function inizioGiornata(isoDate) {
    const parti = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(isoDate || ''));
    if (!parti) return Date.now();
    return new Date(Number(parti[1]), Number(parti[2]) - 1, Number(parti[3]), 0, 0, 0, 0).getTime();
}

export function fineGiornata(isoDate) {
    return inizioGiornata(isoDate) + 24 * 60 * 60 * 1000 - 1;
}

export function etichettaStato(valore) {
    return String(valore || '')
        .replace(/_/g, ' ')
        .replace(/^./, carattere => carattere.toUpperCase());
}

export function iniziali(nominativo) {
    return String(nominativo || '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(parte => parte[0].toUpperCase())
        .join('');
}
