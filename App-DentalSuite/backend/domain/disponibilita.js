'use strict';

const MINUTI_GIORNO = 1440;
const MINUTO_MS = 60000;
const PASSO_PREDEFINITO = 15;

const GIORNI = [
    { numero: 1, nome: 'Lunedì', breve: 'Lun' },
    { numero: 2, nome: 'Martedì', breve: 'Mar' },
    { numero: 3, nome: 'Mercoledì', breve: 'Mer' },
    { numero: 4, nome: 'Giovedì', breve: 'Gio' },
    { numero: 5, nome: 'Venerdì', breve: 'Ven' },
    { numero: 6, nome: 'Sabato', breve: 'Sab' },
    { numero: 7, nome: 'Domenica', breve: 'Dom' }
];

const TIPI_ASSENZA = [
    { id: 'ferie', label: 'Ferie' },
    { id: 'permesso', label: 'Permesso' },
    { id: 'malattia', label: 'Malattia' },
    { id: 'formazione', label: 'Formazione' },
    { id: 'congedo', label: 'Congedo' },
    { id: 'chiusura', label: 'Chiusura dello studio' },
    { id: 'altro', label: 'Altro' }
];

const STATI_ASSENZA = ['richiesta', 'approvata', 'rifiutata'];

function minutiDa(ora) {
    const parti = /^(\d{1,2}):(\d{2})$/.exec(String(ora || '').trim());
    if (!parti) return null;
    const ore = Number(parti[1]);
    const minuti = Number(parti[2]);
    if (ore < 0 || ore > 24 || minuti < 0 || minuti > 59) return null;
    return Math.min(ore * 60 + minuti, MINUTI_GIORNO);
}

function oraDa(minuti) {
    const valore = Math.max(0, Math.min(Math.round(Number(minuti) || 0), MINUTI_GIORNO));
    return `${String(Math.floor(valore / 60)).padStart(2, '0')}:${String(valore % 60).padStart(2, '0')}`;
}

function giornoSettimanaDi(isoDate) {
    const parti = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(isoDate || ''));
    if (!parti) return 0;
    const giorno = new Date(Number(parti[1]), Number(parti[2]) - 1, Number(parti[3])).getDay();
    return giorno === 0 ? 7 : giorno;
}

function isoDa(dataOggetto) {
    const anno = dataOggetto.getFullYear();
    const mese = String(dataOggetto.getMonth() + 1).padStart(2, '0');
    const giorno = String(dataOggetto.getDate()).padStart(2, '0');
    return `${anno}-${mese}-${giorno}`;
}

function isoDaTimestamp(millisecondi) {
    return isoDa(new Date(Number(millisecondi)));
}

function inizioGiornataDi(isoDate) {
    const parti = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(isoDate || ''));
    if (!parti) return Date.now();
    return new Date(Number(parti[1]), Number(parti[2]) - 1, Number(parti[3]), 0, 0, 0, 0).getTime();
}

function giorniDopo(isoDate, quanti) {
    const base = new Date(inizioGiornataDi(isoDate));
    base.setDate(base.getDate() + Number(quanti || 0));
    return isoDa(base);
}

function minutiDalTimestamp(millisecondi, inizioGiornataMs) {
    return Math.round((Number(millisecondi) - Number(inizioGiornataMs)) / MINUTO_MS);
}

function nomeGiorno(numero) {
    const voce = GIORNI.find(giorno => giorno.numero === Number(numero));
    return voce ? voce.nome : '';
}

function nelPeriodo(isoDate, dal, al) {
    if (dal && isoDate < dal) return false;
    if (al && isoDate > al) return false;
    return true;
}

function fondi(fasce) {
    const ordinate = [...fasce]
        .filter(fascia => fascia && fascia.fine > fascia.inizio)
        .sort((prima, seconda) => prima.inizio - seconda.inizio);

    return ordinate.reduce((unite, fascia) => {
        const ultima = unite[unite.length - 1];
        if (ultima && fascia.inizio <= ultima.fine) {
            ultima.fine = Math.max(ultima.fine, fascia.fine);
            return unite;
        }
        unite.push({ ...fascia });
        return unite;
    }, []);
}

function sottrai(fasce, occupazioni) {
    const bloccate = fondi(occupazioni);
    return fasce.reduce((libere, fascia) => {
        let segmenti = [{ ...fascia }];
        bloccate.forEach(blocco => {
            segmenti = segmenti.reduce((accumulati, segmento) => {
                if (blocco.fine <= segmento.inizio || blocco.inizio >= segmento.fine) {
                    accumulati.push(segmento);
                    return accumulati;
                }
                if (blocco.inizio > segmento.inizio) {
                    accumulati.push({ ...segmento, fine: blocco.inizio });
                }
                if (blocco.fine < segmento.fine) {
                    accumulati.push({ ...segmento, inizio: blocco.fine });
                }
                return accumulati;
            }, []);
        });
        return libere.concat(segmenti.filter(segmento => segmento.fine > segmento.inizio));
    }, []);
}

function orariDelGiorno(orari, isoDate) {
    const giorno = giornoSettimanaDi(isoDate);
    return fondi(orari
        .filter(riga => {
            if (riga.data_specifica) return riga.data_specifica === isoDate;
            if (Number(riga.giorno_settimana) !== giorno) return false;
            return nelPeriodo(isoDate, riga.valido_dal, riga.valido_al);
        })
        .map(riga => ({
            inizio: minutiDa(riga.ora_inizio),
            fine: minutiDa(riga.ora_fine),
            sede_id: riga.sede_id || '',
            poltrona_id: riga.poltrona_id || '',
            straordinario: Boolean(riga.data_specifica)
        }))
        .filter(fascia => fascia.inizio !== null && fascia.fine !== null));
}

function assenzeDelGiorno(assenze, isoDate) {
    return assenze
        .filter(riga => riga.stato !== 'rifiutata')
        .filter(riga => isoDate >= riga.data_inizio && isoDate <= riga.data_fine)
        .map(riga => {
            const intera = Number(riga.giornata_intera) === 1 || !riga.ora_inizio || !riga.ora_fine;
            return {
                inizio: intera ? 0 : (minutiDa(riga.ora_inizio) || 0),
                fine: intera ? MINUTI_GIORNO : (minutiDa(riga.ora_fine) || MINUTI_GIORNO),
                tipo: riga.tipo || 'altro',
                stato: riga.stato || 'richiesta',
                motivo: riga.motivo || ''
            };
        });
}

function occupazioniDelGiorno(appuntamenti, inizioGiornataMs, escludiId) {
    return appuntamenti
        .filter(riga => riga.id !== escludiId)
        .filter(riga => riga.stato !== 'annullato')
        .map(riga => {
            const scarto = (Number(riga.data_ora_inizio) - inizioGiornataMs) / MINUTO_MS;
            const durata = Math.max(1, Number(riga.durata_minuti) || 30);
            return {
                inizio: Math.round(scarto),
                fine: Math.round(scarto + durata),
                appuntamento_id: riga.id,
                paziente: riga.paziente_nome || ''
            };
        })
        .filter(fascia => fascia.fine > 0 && fascia.inizio < MINUTI_GIORNO);
}

function slotProponibili(libere, durataMinuti, passo = PASSO_PREDEFINITO) {
    const durata = Math.max(1, Number(durataMinuti) || 30);
    const salto = Math.max(5, Number(passo) || PASSO_PREDEFINITO);
    return libere.reduce((slot, fascia) => {
        const partenza = Math.ceil(fascia.inizio / salto) * salto;
        for (let inizio = partenza; inizio + durata <= fascia.fine; inizio += salto) {
            slot.push({ inizio, fine: inizio + durata, ora: oraDa(inizio) });
        }
        return slot;
    }, []);
}

function copre(fasce, inizio, fine) {
    return fasce.some(fascia => fascia.inizio <= inizio && fascia.fine >= fine);
}

function orariDichiarati(orari) {
    return orari.some(riga => !riga.data_specifica && Number(riga.giorno_settimana) > 0);
}

function giornata({ orari = [], assenze = [], appuntamenti = [], isoDate, inizioGiornataMs, escludiId, durataMinuti, passo }) {
    const fasceLavoro = orariDelGiorno(orari, isoDate);
    const fasceAssenza = assenzeDelGiorno(assenze, isoDate);
    const occupazioni = occupazioniDelGiorno(appuntamenti, inizioGiornataMs, escludiId);
    const disponibili = sottrai(fasceLavoro, fasceAssenza);
    const libere = sottrai(disponibili, occupazioni);

    return {
        data: isoDate,
        giorno_settimana: giornoSettimanaDi(isoDate),
        giorno: nomeGiorno(giornoSettimanaDi(isoDate)),
        orari_dichiarati: orariDichiarati(orari),
        lavora: fasceLavoro.length > 0,
        fasce_lavoro: fasceLavoro.map(fascia => ({ ...fascia, etichetta: `${oraDa(fascia.inizio)}–${oraDa(fascia.fine)}` })),
        assenze: fasceAssenza.map(fascia => ({ ...fascia, etichetta: `${oraDa(fascia.inizio)}–${oraDa(fascia.fine)}` })),
        occupazioni: occupazioni.map(fascia => ({ ...fascia, etichetta: `${oraDa(fascia.inizio)}–${oraDa(fascia.fine)}` })),
        fasce_libere: libere.map(fascia => ({ ...fascia, etichetta: `${oraDa(fascia.inizio)}–${oraDa(fascia.fine)}` })),
        minuti_disponibili: disponibili.reduce((somma, fascia) => somma + (fascia.fine - fascia.inizio), 0),
        minuti_liberi: libere.reduce((somma, fascia) => somma + (fascia.fine - fascia.inizio), 0),
        slot: durataMinuti ? slotProponibili(libere, durataMinuti, passo) : []
    };
}

function valuta(quadro, inizioMinuti, durataMinuti) {
    const fine = inizioMinuti + durataMinuti;
    const motivi = [];

    if (quadro.orari_dichiarati) {
        if (!quadro.lavora) {
            motivi.push(`Il collaboratore non lavora di ${quadro.giorno.toLowerCase()}`);
        } else if (!copre(quadro.fasce_lavoro, inizioMinuti, fine)) {
            motivi.push(`Fuori dall'orario di lavoro (${quadro.fasce_lavoro.map(fascia => fascia.etichetta).join(', ')})`);
        }
    }

    quadro.assenze.forEach(assenza => {
        if (assenza.inizio < fine && inizioMinuti < assenza.fine) {
            const etichetta = (TIPI_ASSENZA.find(tipo => tipo.id === assenza.tipo) || { label: assenza.tipo }).label;
            motivi.push(`${etichetta} registrata dalle ${oraDa(assenza.inizio)} alle ${oraDa(assenza.fine)}`);
        }
    });

    quadro.occupazioni.forEach(occupazione => {
        if (occupazione.inizio < fine && inizioMinuti < occupazione.fine) {
            motivi.push(`Già impegnato dalle ${oraDa(occupazione.inizio)} alle ${oraDa(occupazione.fine)}${occupazione.paziente ? ` con ${occupazione.paziente}` : ''}`);
        }
    });

    return { ammissibile: motivi.length === 0, motivi };
}

function riepilogoSettimanale(orari) {
    return GIORNI.map(giorno => {
        const fasce = fondi(orari
            .filter(riga => !riga.data_specifica && Number(riga.giorno_settimana) === giorno.numero)
            .map(riga => ({ inizio: minutiDa(riga.ora_inizio), fine: minutiDa(riga.ora_fine) }))
            .filter(fascia => fascia.inizio !== null && fascia.fine !== null));
        return {
            ...giorno,
            fasce: fasce.map(fascia => ({ ...fascia, etichetta: `${oraDa(fascia.inizio)}–${oraDa(fascia.fine)}` })),
            minuti: fasce.reduce((somma, fascia) => somma + (fascia.fine - fascia.inizio), 0)
        };
    });
}

function descriviSettimana(orari) {
    const settimana = riepilogoSettimanale(orari).filter(giorno => giorno.fasce.length > 0);
    if (settimana.length === 0) return 'Nessun orario dichiarato';
    return settimana
        .map(giorno => `${giorno.breve} ${giorno.fasce.map(fascia => fascia.etichetta).join(' e ')}`)
        .join(' · ');
}

module.exports = {
    GIORNI,
    TIPI_ASSENZA,
    STATI_ASSENZA,
    MINUTI_GIORNO,
    PASSO_PREDEFINITO,
    minutiDa,
    oraDa,
    isoDa,
    isoDaTimestamp,
    inizioGiornataDi,
    giorniDopo,
    minutiDalTimestamp,
    giornoSettimanaDi,
    nomeGiorno,
    fondi,
    sottrai,
    orariDelGiorno,
    assenzeDelGiorno,
    occupazioniDelGiorno,
    slotProponibili,
    copre,
    orariDichiarati,
    giornata,
    valuta,
    riepilogoSettimanale,
    descriviSettimana
};
