import { el, icona, rimpiazza } from '../../components/dom.js';
import { call } from '../../kernel/transport.js';

function orologio() {
    const oraEl = el('div', { class: 'ds-attesa__ora' }, '--:--');
    const dataEl = el('div', { class: 'ds-attesa__data' }, '---');
    const wrap = el('div', { class: 'ds-attesa__orologio-box' }, [oraEl, dataEl]);

    const aggiorna = () => {
        try {
            const adesso = new Date();
            const ore = String(adesso.getHours()).padStart(2, '0');
            const min = String(adesso.getMinutes()).padStart(2, '0');
            oraEl.textContent = `${ore}:${min}`;

            const opzioni = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
            const dataStr = adesso.toLocaleDateString('it-IT', opzioni);
            dataEl.textContent = dataStr.charAt(0).toUpperCase() + dataStr.slice(1);
        } catch (_) {}
    };

    aggiorna();
    const timer = setInterval(aggiorna, 1000);
    wrap.dataset.timer = String(timer);
    return wrap;
}

function cardInfo({ iconaNome, etichetta, valore, colore = 'teal' }) {
    return el('div', { class: 'ds-attesa__card', dataset: { colore } }, [
        el('div', { class: 'ds-attesa__card-icona' }, icona(iconaNome)),
        el('div', { class: 'ds-attesa__card-testi' }, [
            el('span', { class: 'ds-attesa__card-etichetta' }, etichetta),
            el('strong', { class: 'ds-attesa__card-valore' }, valore || '—')
        ])
    ]);
}

export function schermoAttesa({ postazione, onCambiaPostazione }) {
    const contenitore = el('div', { class: 'ds-attesa' });

    const disegna = async () => {
        try {
            let nomeStudio = 'Studio Odontoiatrico';
            let nomeMedico = 'In servizio';
            let nomePoltrona = postazione?.nome || 'Riunito Operatorio';

            try {
                if (window.electronAPI?.datiAzienda?.get) {
                    const datiAz = await window.electronAPI.datiAzienda.get();
                    if (datiAz?.ragione_sociale || datiAz?.nome_commerciale) {
                        nomeStudio = datiAz.nome_commerciale || datiAz.ragione_sociale;
                    }
                }
            } catch (_) {}

            try {
                const staffList = await call('staff.list', {});
                if (Array.isArray(staffList) && staffList.length > 0) {
                    const medico = staffList.find(s => s.ruolo === 'odontoiatra' || s.ruolo === 'medico') || staffList[0];
                    if (medico) {
                        nomeMedico = `Dott. ${medico.cognome || ''} ${medico.nome || ''}`.trim();
                    }
                }
            } catch (_) {}

            const badgeStato = el('div', { class: 'ds-attesa__badge-online' }, [
                el('span', { class: 'ds-attesa__radar-pulse' }),
                el('span', { class: 'ds-attesa__badge-testo' }, 'MONITOR ONLINE · PRONTO A RICEVERE')
            ]);

            const griglia = el('div', { class: 'ds-attesa__griglia' }, [
                cardInfo({ iconaNome: 'domain', etichetta: 'Studio / Struttura', valore: nomeStudio, colore: 'teal' }),
                cardInfo({ iconaNome: 'dentistry', etichetta: 'Riunito / Poltrona', valore: nomePoltrona, colore: 'cyan' }),
                cardInfo({ iconaNome: 'person', etichetta: 'Medico Collegato', valore: nomeMedico, colore: 'indigo' }),
                cardInfo({ iconaNome: 'sensors', etichetta: 'Canale Live', valore: 'Pronto per trasmissione', colore: 'emerald' })
            ]);

            const btnCambia = onCambiaPostazione
                ? el('button', {
                    class: 'ds-attesa__btn-action',
                    type: 'button',
                    onClick: onCambiaPostazione
                }, [
                    icona('tune'),
                    el('span', {}, 'Cambia Postazione')
                ])
                : null;

            rimpiazza(contenitore, el('div', { class: 'ds-attesa__container' }, [
                badgeStato,
                orologio(),
                griglia,
                el('p', { class: 'ds-attesa__hint' }, 'In attesa. La segreteria può inviare la cartella clinica del paziente: comparirà automaticamente a schermo intero.'),
                btnCambia
            ].filter(Boolean)));
        } catch (_) {}
    };

    disegna();
    return contenitore;
}
