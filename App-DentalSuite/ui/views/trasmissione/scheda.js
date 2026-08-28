import { el, icona } from '../../components/dom.js';
import { creaArcata } from '../../components/arcata_dentale.js';
import * as fmt from '../../kernel/format.js';
import { intestazionePaziente } from './intestazione.js';
import {
    pannello,
    pannelloStoria,
    pannelloPrescrizioni,
    pannelloReferti,
    pannelloRilevazioni
} from './pannelli.js';
import { apriLivello } from './livello.js';
import { apriReperto } from './reperto.js';
import { adattaAlTelaio } from '../../kernel/telaio.js';

function voceTrattamento(voce) {
    return el('li', { class: 'ds-mn__riga' }, [
        el('time', { class: 'ds-mn__quando' }, fmt.data(voce.data)),
        el('span', { class: 'ds-mn__titolo' }, [
            voce.dente ? el('strong', { style: 'color: var(--ds-accent, #0d9488); margin-right: 4px;' }, `d.${voce.dente}`) : null,
            voce.descrizione
        ]),
        el('span', { class: 'ds-mn__coda' }, fmt.etichettaStato(voce.stato))
    ]);
}

function vocePrescrizione(voce) {
    return el('li', { class: 'ds-mn__riga' }, [
        el('time', { class: 'ds-mn__quando' }, fmt.data(voce.data)),
        el('span', { class: 'ds-mn__titolo' }, `${voce.farmaco} ${voce.dosaggio}`.trim()),
        el('span', { class: 'ds-mn__coda' }, [voce.posologia, voce.durata_giorni ? `${voce.durata_giorni} gg` : '']
            .filter(Boolean).join(' · '))
    ]);
}

function voceReferto(voce, idx, tutti) {
    return el('li', {
        class: 'ds-mn__riga ds-mn__riga--cliccabile',
        style: 'cursor: pointer;',
        onClick: () => {
            import('../shared/visualizzatore_diagnostico.js').then(m => {
                m.apriVisualizzatoreDiagnostico({
                    referti: tutti || [voce],
                    indiceIniziale: typeof idx === 'number' ? idx : 0
                });
            });
        }
    }, [
        el('time', { class: 'ds-mn__quando' }, fmt.data(voce.data)),
        el('span', { class: 'ds-mn__titolo' }, [
            icona(String(voce.tipo || '').includes('rx') || String(voce.tipo || '').includes('opt') || String(voce.tipo || '').includes('cbct') ? 'radiology' : 'image'),
            ' ',
            voce.titolo
        ]),
        el('span', { class: 'ds-mn__coda' }, (voce.tipo || '').toUpperCase())
    ]);
}

function azione({ simbolo, etichetta, onClick, tono, disabilitato = false }) {
    return el('button', {
        class: 'ds-mn__azione',
        type: 'button',
        disabled: disabilitato,
        dataset: tono ? { tono } : {},
        onClick
    }, [
        icona(simbolo),
        el('span', { class: 'ds-mn__azione-eti' }, etichetta)
    ]);
}

function barraAzioni({ dossier, collegato, onChiudi, onAggiorna, onCambiaPaziente, onEsci, onCambiaPostazione, approfondimenti }) {
    return el('footer', { class: 'ds-mn__barra' }, [
        el('div', { class: 'ds-mn__azioni' }, [
            azione({
                simbolo: 'medical_services',
                etichetta: 'Trattamenti',
                disabilitato: dossier.trattamenti.length === 0,
                onClick: approfondimenti.onApriTrattamenti
            }),
            azione({
                simbolo: 'prescriptions',
                etichetta: 'Prescrizioni',
                disabilitato: dossier.prescrizioni.length === 0,
                onClick: approfondimenti.onApriPrescrizioni
            }),
            azione({
                simbolo: 'imagesmode',
                etichetta: 'Referti',
                disabilitato: dossier.referti.length === 0,
                onClick: approfondimenti.onApriReferti
            }),
            azione({ simbolo: 'refresh', etichetta: 'Aggiorna', onClick: onAggiorna }),
            onCambiaPaziente
                ? azione({ simbolo: 'switch_account', etichetta: 'Cambia paziente', onClick: onCambiaPaziente })
                : null,
            azione({ simbolo: 'logout', etichetta: 'Chiudi seduta', tono: 'pericolo', onClick: onChiudi }),
            onCambiaPostazione
                ? azione({ simbolo: 'tune', etichetta: 'Postazione', onClick: onCambiaPostazione })
                : null,
            onEsci ? azione({ simbolo: 'arrow_back', etichetta: 'Esci', onClick: onEsci }) : null
        ].filter(Boolean)),
        el('div', { class: 'ds-mn__collegamento', dataset: { collegato: collegato ? 'true' : 'false' } }, [
            el('span', { class: 'ds-mn__spia' }),
            el('span', {}, collegato ? 'Collegato alla segreteria' : 'Canale interrotto: gli atti restano in coda')
        ])
    ]);
}

function pannelloOdontogramma(dossier, onDente) {
    const arcata = creaArcata({
        denti: dossier.odontogramma.denti,
        stati: dossier.odontogramma.stati,
        selezionato: null,
        interattivo: true,
        onSeleziona: onDente
    });

    return pannello({
        titolo: 'Odontogramma FDI',
        simbolo: 'dentistry',
        chiave: 'odontogramma',
        conteggio: dossier.odontogramma.con_reperto,
        pieno: true
    }, el('div', { class: 'ds-mn__arcata' }, arcata));
}

export function schermoScheda({ istantanea, collegato, onChiudi, onAggiorna, onCambiaPaziente, onEsci, onCambiaPostazione }) {
    const dossier = istantanea.dossier;

    const apriDente = dente => apriReperto({ dente, dossier, onRegistrato: onAggiorna });

    const approfondimenti = {
        onApriTrattamenti: () => apriLivello({
            titolo: 'Trattamenti precedenti',
            sottotitolo: dossier.paziente.nominativo,
            voci: dossier.trattamenti,
            rendiVoce: voceTrattamento
        }),
        onApriPrescrizioni: () => apriLivello({
            titolo: 'Prescrizioni',
            sottotitolo: dossier.paziente.nominativo,
            voci: dossier.prescrizioni,
            rendiVoce: vocePrescrizione
        }),
        onApriReferti: () => {
            if (!dossier.referti || dossier.referti.length === 0) return;
            const gridReferti = el('div', {
                style: 'display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; padding: 10px 0;'
            }, dossier.referti.map((voce, idx) => {
                const isRx = String(voce.tipo || '').includes('rx') || String(voce.tipo || '').includes('opt') || String(voce.tipo || '').includes('cbct');
                return el('div', {
                    class: 'ds-panel',
                    style: 'background: rgba(15, 23, 42, 0.6); border: 1.5px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 10px;'
                }, [
                    el('div', { style: 'display: flex; justify-content: space-between; align-items: center;' }, [
                        el('span', { class: 'ds-badge ds-badge--info', style: 'text-transform: uppercase; font-size: 0.75rem;' }, voce.tipo || 'Esame'),
                        el('time', { style: 'font-size: 0.8rem; color: #94a3b8;' }, fmt.data(voce.data))
                    ]),
                    el('div', { style: 'display: flex; align-items: center; gap: 10px; margin: 4px 0;' }, [
                        el('div', { style: `width: 40px; height: 40px; border-radius: 8px; background: ${isRx ? '#0284c7' : '#0d9488'}; display: flex; align-items: center; justify-content: center; font-size: 22px; color: #fff;` },
                            icona(isRx ? 'radiology' : (String(voce.mime_type || '').includes('pdf') ? 'description' : 'imagesmode'))
                        ),
                        el('strong', { style: 'font-size: 1rem; color: #f8fafc; overflow: hidden; text-overflow: ellipsis;' }, voce.titolo)
                    ]),
                    voce.note ? el('p', { style: 'font-size: 0.82rem; color: #94a3b8; margin: 0;' }, voce.note) : null,
                    el('div', { style: 'display: flex; gap: 8px; margin-top: auto; padding-top: 8px;' }, [
                        el('button', {
                            class: 'ds-btn ds-btn--primario',
                            style: 'flex: 1;',
                            type: 'button',
                            onClick: () => {
                                import('../shared/visualizzatore_diagnostico.js').then(m => {
                                    m.apriVisualizzatoreDiagnostico({
                                        referti: dossier.referti,
                                        indiceIniziale: idx,
                                        serverOrigine: istantanea.servitore_info
                                    });
                                });
                            }
                        }, [icona('visibility'), 'Visualizza Touch']),
                        el('button', {
                            class: 'ds-btn ds-btn--ghost',
                            type: 'button',
                            title: 'Apri file esterno',
                            onClick: () => call('allegati.open', { id: voce.id }).catch(() => {})
                        }, icona('open_in_new'))
                    ])
                ]);
            }));

            apriLivello({
                titolo: 'Archivio Diagnostico & Radiologia',
                sottotitolo: `${dossier.paziente.nominativo} · ${dossier.referti.length} referti clinici`,
                contenuto: gridReferti
            });
        }
    };

    const colonnaSinistra = el('div', { class: 'ds-mn__colonna ds-mn__colonna--sinistra' }, [
        pannelloRilevazioni(dossier)
    ]);

    const colonnaDestra = el('div', { class: 'ds-mn__colonna ds-mn__colonna--destra' }, [
        pannelloStoria(dossier, { onApriTutto: approfondimenti.onApriTrattamenti }),
        pannelloPrescrizioni(dossier, { onApriTutto: approfondimenti.onApriPrescrizioni }),
        pannelloReferti(dossier, { onApriTutto: approfondimenti.onApriReferti, servitoreInfo: istantanea.servitore_info })
    ]);

    const radice = el('div', {
        class: 'ds-root ds-mn',
        dataset: { accent: 'pazienti', paziente: dossier.paziente.id }
    }, [
        intestazionePaziente({ dossier, ricevutoIl: istantanea.ricevuto_il }),
        el('div', { class: 'ds-mn__scena' }, [
            colonnaSinistra,
            pannelloOdontogramma(dossier, apriDente),
            colonnaDestra
        ]),
        barraAzioni({ dossier, collegato, onChiudi, onAggiorna, onCambiaPaziente, onEsci, onCambiaPostazione, approfondimenti })
    ]);

    adattaAlTelaio(radice);
    return radice;
}
