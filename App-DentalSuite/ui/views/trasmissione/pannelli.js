import { el, icona } from '../../components/dom.js';
import * as fmt from '../../kernel/format.js';

export function pannello({ titolo, simbolo, chiave, conteggio = null, azioni = [], pieno = false }, contenuto) {
    return el('section', {
        class: `ds-mn__pannello ds-mn__pannello--${chiave}`,
        dataset: { pieno: pieno ? 'true' : 'false' }
    }, [
        el('header', { class: 'ds-mn__testa' }, [
            simbolo ? icona(simbolo) : null,
            el('span', { class: 'ds-mn__testa-titolo' }, titolo),
            conteggio !== null ? el('span', { class: 'ds-mn__conteggio' }, String(conteggio)) : null,
            azioni.length > 0 ? el('span', { class: 'ds-mn__testa-azioni' }, azioni) : null
        ].filter(Boolean)),
        el('div', { class: 'ds-mn__corpo' }, contenuto)
    ]);
}

export function vuoto(simbolo, testo) {
    return el('div', { class: 'ds-mn__vuoto' }, [icona(simbolo), el('span', {}, testo)]);
}

function riga(quando, titolo, coda, tono) {
    return el('li', { class: 'ds-mn__riga', dataset: tono ? { tono } : {} }, [
        el('time', { class: 'ds-mn__quando' }, quando),
        el('span', { class: 'ds-mn__titolo', title: titolo }, titolo),
        coda ? el('span', { class: 'ds-mn__coda' }, coda) : null
    ].filter(Boolean));
}

export function pannelloStoria(dossier, { onApriTutto }) {
    const voci = dossier.trattamenti || [];
    return pannello({
        titolo: 'Storia clinica',
        simbolo: 'history',
        chiave: 'storia',
        conteggio: voci.length,
        azioni: voci.length > 0
            ? [el('button', {
                class: 'ds-mn__mini',
                type: 'button',
                title: 'Apri tutti i trattamenti',
                onClick: onApriTutto
            }, icona('open_in_full'))]
            : []
    }, voci.length === 0
        ? vuoto('info', 'Nessun trattamento registrato')
        : el('ul', { class: 'ds-mn__elenco' }, voci.map(voce => el('li', { class: 'ds-mn__riga' }, [
            el('time', { class: 'ds-mn__quando' }, fmt.data(voce.data)),
            el('span', { class: 'ds-mn__titolo', title: voce.descrizione }, [
                voce.dente ? el('strong', { style: 'color: var(--ds-accent, #0d9488); margin-right: 4px;' }, `d.${voce.dente}`) : null,
                voce.descrizione
            ]),
            el('span', { class: 'ds-mn__coda' }, fmt.etichettaStato(voce.stato))
        ]))));
}

export function pannelloPrescrizioni(dossier, { onApriTutto }) {
    try {
        const voci = dossier.prescrizioni || [];
        const allergie = (dossier.anamnesi && dossier.anamnesi.allergie_farmaci) || '';
        const intolleranze = (dossier.anamnesi && dossier.anamnesi.intolleranze) || '';
        const testoAvviso = [
            allergie ? `Allergie: ${allergie}` : null,
            intolleranze ? `Intolleranze: ${intolleranze}` : null
        ].filter(Boolean).join(' · ');

        const banner = testoAvviso
            ? el('div', { class: 'ds-mn__avviso-farmaci' }, [
                icona('warning'),
                el('span', {}, `${testoAvviso} (attenzione ad eccipienti/pillole)`)
            ])
            : null;

        const elementi = [
            banner,
            voci.length === 0
                ? vuoto('info', 'Nessuna prescrizione')
                : el('ul', { class: 'ds-mn__elenco' }, voci.map(voce => riga(
                    fmt.data(voce.data),
                    `${voce.farmaco} ${voce.dosaggio}`.trim(),
                    voce.posologia || ''
                )))
        ].filter(Boolean);

        return pannello({
            titolo: 'Prescrizioni',
            simbolo: 'prescriptions',
            chiave: 'prescrizioni',
            conteggio: voci.length,
            azioni: voci.length > 0
                ? [el('button', {
                    class: 'ds-mn__mini',
                    type: 'button',
                    title: 'Apri tutte le prescrizioni',
                    onClick: onApriTutto
                }, icona('open_in_full'))]
                : []
        }, elementi);
    } catch {
        return pannello({ titolo: 'Prescrizioni', simbolo: 'prescriptions', chiave: 'prescrizioni' }, vuoto('info', 'Nessuna prescrizione'));
    }
}

export function pannelloReferti(dossier, { onApriTutto, servitoreInfo }) {
    const voci = dossier.referti || [];
    const serverSorgente = servitoreInfo || dossier.servitore_info || dossier.origine;
    return pannello({
        titolo: 'Immagini e referti',
        simbolo: 'imagesmode',
        chiave: 'referti',
        conteggio: voci.length,
        azioni: voci.length > 0
            ? [el('button', {
                class: 'ds-mn__mini',
                type: 'button',
                title: 'Apri archivio diagnostico touch',
                onClick: typeof onApriTutto === 'function' ? onApriTutto : () => {
                    import('../shared/visualizzatore_diagnostico.js').then(m => {
                        m.apriVisualizzatoreDiagnostico({
                            referti: voci,
                            indiceIniziale: 0,
                            serverOrigine: serverSorgente
                        });
                    });
                }
            }, icona('open_in_full'))]
            : []
    }, voci.length === 0
        ? vuoto('image_not_supported', 'Nessuna immagine in archivio')
        : el('ul', { class: 'ds-mn__elenco' }, voci.map((voce, idx) => el('li', {
            class: 'ds-mn__riga ds-mn__riga--cliccabile',
            style: 'cursor: pointer;',
            onClick: () => {
                import('../shared/visualizzatore_diagnostico.js').then(m => {
                    m.apriVisualizzatoreDiagnostico({
                        referti: voci,
                        indiceIniziale: idx,
                        serverOrigine: serverSorgente
                    });
                });
            }
        }, [
            el('time', { class: 'ds-mn__quando' }, fmt.data(voce.data)),
            el('span', { class: 'ds-mn__titolo', title: voce.titolo }, [
                icona(String(voce.tipo || '').includes('rx') || String(voce.tipo || '').includes('opt') || String(voce.tipo || '').includes('cbct') ? 'radiology' : 'image'),
                ' ',
                voce.titolo
            ]),
            voce.tipo ? el('span', { class: 'ds-mn__coda' }, voce.tipo.toUpperCase()) : null
        ].filter(Boolean)))));
}

function raggruppaPerData(voci) {
    const gruppi = new Map();
    for (const voce of voci) {
        const chiave = voce.data_rilevazione || '';
        if (!gruppi.has(chiave)) gruppi.set(chiave, []);
        gruppi.get(chiave).push(voce);
    }
    return [...gruppi.entries()];
}

export function pannelloRilevazioni(dossier) {
    const voci = dossier.rilevazioni;
    if (voci.length === 0) {
        return pannello({
            titolo: 'Cronologia odontogramma',
            simbolo: 'history_edu',
            chiave: 'rilevazioni',
            conteggio: 0
        }, vuoto('info', 'Nessuna rilevazione registrata su questo paziente'));
    }

    const gruppi = raggruppaPerData(voci).map(([data, elementi]) => el('div', { class: 'ds-mn__gruppo' }, [
        el('div', { class: 'ds-mn__gruppo-testa' }, [
            el('time', {}, fmt.data(data)),
            el('span', { class: 'ds-mn__gruppo-conta' }, `${elementi.length} elementi`)
        ]),
        el('div', { class: 'ds-mn__denti' }, elementi.map(voce => el('span', {
            class: 'ds-mn__dente-chip',
            dataset: { stato: voce.stato },
            title: `${voce.numero_dente} · ${fmt.etichettaStato(voce.stato)}${voce.superfici ? ` · ${voce.superfici}` : ''}${voce.materiale ? ` · ${voce.materiale}` : ''}`
        }, [
            el('strong', {}, String(voce.numero_dente)),
            el('span', {}, fmt.etichettaStato(voce.stato))
        ])))
    ]));

    return pannello({
        titolo: 'Cronologia odontogramma',
        simbolo: 'history_edu',
        chiave: 'rilevazioni',
        conteggio: voci.length
    }, gruppi);
}
