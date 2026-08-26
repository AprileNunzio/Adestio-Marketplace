import { intestazione, bottone, avviso } from '../components/layout.js';
import { esito } from '../components/notifica.js';
import { call } from '../kernel/transport.js';
import { can } from '../security/permissions.js';
import { montaVista, oggetto } from './shared/vista.js';
import { pannelloProfilo } from './postazioni/profilo.js';
import { pannelloAccoppiamento, pannelloPari } from './postazioni/accoppiamento.js';
import { pannelloDiagnosi, pannelloVicini } from './postazioni/diagnosi.js';

export default {
    rendi: async ({ naviga, indietro }) => {
        const puoGestire = await can('rete_manage');

        return montaVista({
            accento: 'struttura',
            carica: async () => oggetto(await call('postazioni.stato', {}), null),
            disegna: (stato, aggiorna) => {
                if (!stato) {
                    return intestazione({
                        titolo: 'Impostazioni del collegamento',
                        sottotitolo: 'Stato del collegamento non leggibile su questo computer',
                        simbolo: 'lan',
                        indietro
                    });
                }

                const postazione = stato.postazione || {};
                const spenta = stato.attiva !== true;

                const commuta = async accendi => {
                    const risposta = await call('postazioni.attiva', { attiva: accendi });
                    const dati = risposta && risposta.success ? risposta.data : null;
                    const motivo = dati && dati.rete && dati.rete.motivo ? dati.rete.motivo : '';
                    if (!esito(risposta, accendi ? 'Collegamento acceso' : 'Collegamento spento')) return;
                    if (accendi && motivo) esito({ success: false, error: motivo }, '');
                    await aggiorna();
                };

                const riallinea = async () => {
                    const risposta = await call('postazioni.riallinea', {});
                    const dati = risposta && risposta.success ? risposta.data : null;
                    esito(risposta, dati ? `${dati.consegnati} atti riallineati, ${dati.residui} ancora in coda` : '');
                    await aggiorna();
                };

                return [
                    intestazione({
                        titolo: 'Impostazioni del collegamento',
                        sottotitolo: `${postazione.nome || 'postazione'} · ${postazione.etichetta_ruolo || postazione.ruolo || ''}`,
                        simbolo: 'lan',
                        indietro,
                        azioni: [
                            bottone({
                                etichetta: spenta ? 'Accendi' : 'Spegni',
                                simbolo: spenta ? 'power_settings_new' : 'power_off',
                                variante: spenta ? 'primario' : 'ghost',
                                disabilitato: !puoGestire,
                                onClick: () => commuta(spenta)
                            }),
                            bottone({
                                etichetta: 'Torna al riunito',
                                simbolo: 'cast',
                                variante: 'ghost',
                                onClick: () => naviga('trasmissione', {})
                            }),
                            puoGestire && (stato.coda || {}).in_attesa > 0
                                ? bottone({ etichetta: 'Invia le modifiche in attesa', simbolo: 'sync', onClick: riallinea })
                                : null
                        ].filter(Boolean)
                    }),
                    spenta
                        ? avviso({
                            tono: 'warning',
                            simbolo: 'toggle_off',
                            titolo: 'Il collegamento è spento su questo computer',
                            voci: [
                                'Finché è spento nessun altro computer può collegarsi: le regole del firewall da sole non bastano.',
                                'Premi "Accendi" qui sopra.'
                            ]
                        })
                        : null,
                    ...pannelloProfilo({ stato, puoModificare: puoGestire, onAggiornato: aggiorna }),
                    pannelloAccoppiamento({
                        ruolo: postazione.ruolo,
                        puoGestire,
                        onAggiornato: aggiorna
                    }),
                    pannelloPari({ puoGestire, onAggiornato: aggiorna }),
                    pannelloVicini(),
                    pannelloDiagnosi({ onAggiornato: aggiorna })
                ].filter(Boolean);
            }
        });
    }
};
