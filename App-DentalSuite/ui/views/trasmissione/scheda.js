import { el } from '../../components/dom.js';
import { creaArcata } from '../../components/arcata_dentale.js';
import * as fmt from '../../kernel/format.js';
import { zona, zonaIdentita, zonaAllerte, zonaStoria, zonaSeduta, zonaPrescrizioni, zonaRilevazioni } from './zone.js';
import { zonaGalleria } from './galleria.js';
import { apriLivello, tastoRiunito } from './livello.js';
import { apriReperto } from './reperto.js';

function orologioDiSeduta(ricevutoIl) {
    const nodo = el('span', { class: 'ds-riunito__stato' }, '');
    const aggiorna = () => {
        const minuti = Math.max(Math.round((Date.now() - Number(ricevutoIl || Date.now())) / 60000), 0);
        nodo.textContent = `seduta aperta da ${minuti} min`;
    };
    aggiorna();
    setInterval(aggiorna, 30000);
    return nodo;
}

function voceTrattamento(voce) {
    return el('li', { class: 'ds-riunito__voce' }, [
        el('time', {}, fmt.data(voce.data)),
        el('strong', {}, `${voce.dente ? `${voce.dente} · ` : ''}${voce.descrizione}`),
        el('span', {}, `${fmt.etichettaStato(voce.stato)} · ${fmt.euro(voce.importo)}`)
    ]);
}

function vocePrescrizione(voce) {
    return el('li', { class: 'ds-riunito__voce' }, [
        el('time', {}, fmt.data(voce.data)),
        el('strong', {}, `${voce.farmaco} ${voce.dosaggio}`.trim()),
        el('span', {}, [voce.posologia, voce.durata_giorni ? `${voce.durata_giorni} gg` : '']
            .filter(Boolean).join(' · '))
    ]);
}

function voceReferto(voce) {
    return el('li', { class: 'ds-riunito__voce' }, [
        el('time', {}, fmt.data(voce.data)),
        el('strong', {}, voce.titolo),
        el('span', {}, fmt.etichettaStato(voce.tipo))
    ]);
}

function zonaOdontogramma(dossier, onDente) {
    const arcata = creaArcata({
        denti: dossier.odontogramma.denti,
        stati: dossier.odontogramma.stati,
        selezionato: null,
        interattivo: true,
        onSeleziona: onDente
    });

    return zona({
        titolo: `Odontogramma FDI · ${dossier.odontogramma.con_reperto} elementi con reperto`,
        simbolo: 'dentistry',
        modificatore: 'odontogramma',
        fitto: true
    }, el('div', { class: 'ds-riunito__arcata' }, arcata));
}

function zonaAzioni({ dossier, collegato, onChiudi, onAggiorna }) {
    return zona({ titolo: 'Azioni della seduta', simbolo: 'touch_app', modificatore: 'azioni', fitto: true },
        el('div', { class: 'ds-riunito__azioni' }, [
            tastoRiunito({
                simbolo: 'medical_services',
                etichetta: 'Trattamenti',
                onClick: () => apriLivello({
                    titolo: 'Trattamenti precedenti',
                    sottotitolo: dossier.paziente.nominativo,
                    voci: dossier.trattamenti,
                    rendiVoce: voceTrattamento
                })
            }),
            tastoRiunito({
                simbolo: 'prescriptions',
                etichetta: 'Prescrizioni',
                disabilitato: dossier.prescrizioni.length === 0,
                onClick: () => apriLivello({
                    titolo: 'Prescrizioni',
                    sottotitolo: dossier.paziente.nominativo,
                    voci: dossier.prescrizioni,
                    rendiVoce: vocePrescrizione
                })
            }),
            tastoRiunito({
                simbolo: 'imagesmode',
                etichetta: 'Referti',
                disabilitato: dossier.referti.length === 0,
                onClick: () => apriLivello({
                    titolo: 'Archivio diagnostico',
                    sottotitolo: dossier.paziente.nominativo,
                    voci: dossier.referti,
                    rendiVoce: voceReferto
                })
            }),
            tastoRiunito({ simbolo: 'refresh', etichetta: 'Aggiorna', onClick: onAggiorna }),
            tastoRiunito({
                simbolo: 'logout',
                etichetta: 'Chiudi seduta',
                tono: 'pericolo',
                onClick: onChiudi
            }),
            el('span', { class: 'ds-riunito__stato' }, [
                el('span', { class: 'ds-riunito__spia', dataset: { collegato: collegato ? 'true' : 'false' } }),
                collegato ? 'Collegato alla segreteria' : 'Canale interrotto: gli atti restano in coda'
            ])
        ]));
}

const DENSITA_PREDEFINITA = {
    id: 'standard',
    zone: ['identita', 'allerte', 'odontogramma', 'storia', 'seduta', 'azioni'],
    limiti: { trattamenti: 8, prescrizioni: 3, referti: 5, rilevazioni: 12, allerte: 6 }
};

export function schermoScheda({ istantanea, collegato, onChiudi, onAggiorna }) {
    const dossier = istantanea.dossier;
    const densita = dossier.densita || DENSITA_PREDEFINITA;
    const attiva = zonaId => densita.zone.includes(zonaId);

    const apriDente = dente => apriReperto({
        dente,
        dossier,
        onRegistrato: onAggiorna
    });

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
        onApriReferti: () => apriLivello({
            titolo: 'Archivio diagnostico',
            sottotitolo: dossier.paziente.nominativo,
            voci: dossier.referti,
            rendiVoce: voceReferto
        })
    };

    const secondarie = [
        attiva('storia') ? zonaStoria(dossier, {
            ...approfondimenti,
            quanti: densita.limiti.trattamenti,
            soloTrattamenti: attiva('prescrizioni')
        }) : null,
        attiva('prescrizioni') ? zonaPrescrizioni(dossier, densita.limiti.prescrizioni) : null,
        attiva('galleria') ? zonaGalleria(dossier, densita.limiti.referti) : null,
        attiva('rilevazioni') ? zonaRilevazioni(dossier, densita.limiti.rilevazioni) : null,
        attiva('seduta') ? zonaSeduta(dossier) : null
    ].filter(Boolean);

    return el('div', {
        class: 'ds-riunito',
        dataset: { paziente: dossier.paziente.id, densita: densita.id, zone: String(secondarie.length) }
    }, [
        zonaIdentita(dossier, orologioDiSeduta(istantanea.ricevuto_il)),
        attiva('allerte') ? zonaAllerte(dossier, densita.limiti.allerte) : null,
        zonaOdontogramma(dossier, apriDente),
        el('div', { class: 'ds-riunito__colonna' }, secondarie),
        zonaAzioni({ dossier, collegato, onChiudi, onAggiorna })
    ].filter(Boolean));
}
