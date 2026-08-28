import { el, icona } from '../../../components/dom.js';
import { pannello, vuoto, espandi } from './pannello.js';
import * as fmt from '../../../kernel/format.js';

function livelloPiuGrave(avvisi) {
    if (avvisi.some(voce => voce.livello === 'critica')) return 'critica';
    if (avvisi.some(voce => voce.livello === 'attenzione')) return 'attenzione';
    return '';
}

function coda(voce) {
    return [voce.posologia, voce.durata_giorni ? `${voce.durata_giorni} gg` : '']
        .filter(Boolean)
        .join(' · ');
}

function titolo(voce) {
    return el('span', { class: 'ds-mn__farmaco' }, [
        el('strong', {}, `${voce.farmaco} ${voce.dosaggio}`.trim()),
        voce.principio_attivo ? el('em', { class: 'ds-mn__principio' }, voce.principio_attivo) : null
    ].filter(Boolean));
}

function avvisoInLinea(avvisi) {
    if (avvisi.length === 0) return null;
    return el('span', { class: 'ds-mn__avviso-riga', dataset: { livello: livelloPiuGrave(avvisi) } }, [
        icona('e911_emergency'),
        el('span', {}, `Verificare: ${avvisi[0].riferimento}`)
    ]);
}

export function vocePrescrizione(voce) {
    const avvisi = voce.avvisi || [];
    return el('li', {
        class: 'ds-mn__riga ds-mn__riga--farmaco',
        dataset: avvisi.length > 0 ? { allerta: livelloPiuGrave(avvisi) } : {}
    }, [
        el('time', { class: 'ds-mn__quando' }, fmt.data(voce.data)),
        el('span', { class: 'ds-mn__titolo' }, [
            titolo(voce),
            avvisoInLinea(avvisi),
            voce.note ? el('span', { class: 'ds-mn__nota-riga' }, voce.note) : null
        ].filter(Boolean)),
        el('span', { class: 'ds-mn__coda' }, coda(voce))
    ]);
}

function intestazioneAllergie(dossier) {
    const anamnesi = dossier.anamnesi || {};
    const etichette = [
        ...(anamnesi.allergie || []).map(voce => voce.etichetta),
        anamnesi.allergie_farmaci,
        anamnesi.allergie_materiali
    ].filter(Boolean);

    if (etichette.length === 0) return null;

    return el('div', { class: 'ds-mn__avviso-farmaci' }, [
        icona('warning'),
        el('span', {}, `Allergie accertate: ${etichette.join(' · ')}`)
    ]);
}

export function pannelloPrescrizioni(dossier, { onApriTutto }) {
    const voci = dossier.prescrizioni || [];
    const conAvviso = voci.filter(voce => (voce.avvisi || []).length > 0).length;

    const contenuto = [
        intestazioneAllergie(dossier),
        voci.length === 0
            ? vuoto('info', 'Nessuna prescrizione registrata')
            : el('ul', { class: 'ds-mn__elenco' }, voci.map(vocePrescrizione))
    ].filter(Boolean);

    return pannello({
        titolo: 'Prescrizioni',
        simbolo: 'prescriptions',
        chiave: 'prescrizioni',
        conteggio: conAvviso > 0 ? `${voci.length} · ${conAvviso} da verificare` : voci.length,
        azioni: voci.length > 0 ? [espandi('Apri tutte le prescrizioni', onApriTutto)] : []
    }, contenuto);
}
