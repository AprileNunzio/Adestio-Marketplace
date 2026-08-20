import { callApi } from '../shared/api.js';
import { renderHero, formatCurrency, showNotification } from '../shared/ui_kit.js';

export default {
    render: async (el, onNavigate, params = {}) => {
        try {
            const isEdit = !!params.prestazioneId;
            el.innerHTML = '<div class="ds-root"><p style="text-align:center; padding:2rem;">Caricamento Tariffario Clinico...</p></div>';

            let prestazione = {};
            if (isEdit) {
                const res = await callApi('prestazioni:getAll');
                if (res && res.success && res.data) {
                    prestazione = res.data.find(p => p.id === params.prestazioneId) || {};
                }
            }

            const p = prestazione || {};
            let currentTab = 'anagrafica';

            function renderForm() {
                el.innerHTML = `
                    <div class="ds-root fade-in-up">
                        ${renderHero({
                            title: isEdit ? `Modifica Prestazione • ${p.nome || ''}` : 'Nuova Prestazione & Tariffario Odontoiatrico',
                            subtitle: 'Configura anagrafica clinica, tempi operativi, tariffe paziente, compenso medico e marginalità dello studio.',
                            icon: isEdit ? 'edit_note' : 'add_circle',
                            actionsHtml: `
                                <button class="ds-btn ds-btn-hero" id="ds-prest-btn-back"><span class="material-symbols-rounded">arrow_back</span>Torna al Listino</button>
                                <button class="ds-btn ds-btn-hero" id="ds-prest-btn-save"><span class="material-symbols-rounded">save</span>${isEdit ? 'Salva Modifiche' : 'Crea Prestazione'}</button>
                            `
                        })}

                        <div class="ds-nav" style="margin-bottom:0.5rem;">
                            <button class="ds-nav-btn ${currentTab === 'anagrafica' ? 'active' : ''}" data-tab="anagrafica">
                                <span class="material-symbols-rounded">category</span>1. Anagrafica & Branca
                            </button>
                            <button class="ds-nav-btn ${currentTab === 'tempi' ? 'active' : ''}" data-tab="tempi">
                                <span class="material-symbols-rounded">schedule</span>2. Tempi, Sedute & Sale
                            </button>
                            <button class="ds-nav-btn ${currentTab === 'tariffa' ? 'active' : ''}" data-tab="tariffa">
                                <span class="material-symbols-rounded">payments</span>3. Tariffa Paziente, IVA & Costi
                            </button>
                            <button class="ds-nav-btn ${currentTab === 'compensi' ? 'active' : ''}" data-tab="compensi">
                                <span class="material-symbols-rounded">calculate</span>4. Compensi Equipe & Simulatore Margine Studio
                            </button>
                        </div>

                        <form id="ds-form-prestazione-full">
                            <div class="ds-panel" id="ds-tab-anagrafica" style="display:${currentTab === 'anagrafica' ? 'flex' : 'none'};">
                                <div class="ds-panel-header">
                                    <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">badge</span>Dati Identificativi & Classificazione Clinica</div>
                                </div>
                                <div class="ds-form-grid">
                                    <div class="ds-form-field" style="grid-column:1/-1;">
                                        <label>Nome Prestazione Clinica *</label>
                                        <input type="text" name="nome" id="ds-inp-p-nome" class="ds-input" required placeholder="Es. Ablazione Tartaro con AirFlow e Scaling" value="${p.nome || ''}">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Codice Tariffario / Nomenclatore</label>
                                        <input type="text" name="codice" class="ds-input" placeholder="Es. IGI-01, IMP-A1" value="${p.codice || ''}">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Branca Odontoiatrica *</label>
                                        <select name="branca" class="ds-select">
                                            <option value="igiene" ${p.branca === 'igiene' ? 'selected' : ''}>Igiene & Prevenzione</option>
                                            <option value="conservativa" ${p.branca === 'conservativa' ? 'selected' : ''}>Conservativa & Ricostruttiva</option>
                                            <option value="endodonzia" ${p.branca === 'endodonzia' ? 'selected' : ''}>Endodonzia</option>
                                            <option value="chirurgia" ${p.branca === 'chirurgia' ? 'selected' : ''}>Chirurgia Orale</option>
                                            <option value="implantologia" ${p.branca === 'implantologia' ? 'selected' : ''}>Implantologia & Rigenerativa</option>
                                            <option value="protesi" ${p.branca === 'protesi' ? 'selected' : ''}>Protesi Fissa / Mobile</option>
                                            <option value="ortodonzia" ${p.branca === 'ortodonzia' ? 'selected' : ''}>Ortodonzia & Gnatologia</option>
                                            <option value="parodontologia" ${p.branca === 'parodontologia' ? 'selected' : ''}>Parodontologia</option>
                                            <option value="pedodonzia" ${p.branca === 'pedodonzia' ? 'selected' : ''}>Pedodonzia</option>
                                            <option value="diagnostica" ${p.branca === 'diagnostica' ? 'selected' : ''}>Diagnostica per Immagini (OPT/TAC)</option>
                                        </select>
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Colore Tematico Badge</label>
                                        <input type="color" name="colore_badge" class="ds-input" style="height:44px; padding:2px; cursor:pointer;" value="${p.colore_badge || '#0d9488'}">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Stato nel Listino</label>
                                        <select name="attivo" class="ds-select">
                                            <option value="1" ${p.attivo !== 0 ? 'selected' : ''}>Attiva / Erogabile</option>
                                            <option value="0" ${p.attivo === 0 ? 'selected' : ''}>Sospesa / Disattivata</option>
                                        </select>
                                    </div>
                                    <div class="ds-form-field" style="grid-column:1/-1;">
                                        <label>Descrizione & Informazioni per Preventivo</label>
                                        <textarea name="descrizione" class="ds-textarea" rows="3" placeholder="Dettagli e spiegazioni che verranno stampati o allegati al preventivo del paziente...">${p.descrizione || ''}</textarea>
                                    </div>
                                </div>
                            </div>

                            <div class="ds-panel" id="ds-tab-tempi" style="display:${currentTab === 'tempi' ? 'flex' : 'none'};">
                                <div class="ds-panel-header">
                                    <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">timer</span>Tempi Operativi, Sedute & Sale</div>
                                </div>
                                <div class="ds-form-grid">
                                    <div class="ds-form-field">
                                        <label>Durata Poltrona (Minuti) *</label>
                                        <input type="number" step="5" min="5" max="360" name="durata_minuti" class="ds-input" required value="${p.durata_minuti || 30}">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Tempo Sanificazione & Riassetto (Minuti)</label>
                                        <input type="number" step="5" min="0" max="60" name="tempo_sanificazione" class="ds-input" value="${p.tempo_sanificazione || 10}">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Numero Medio Sedute</label>
                                        <input type="number" min="1" max="20" name="num_sedute" class="ds-input" value="${p.num_sedute || 1}">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Sala / Riunito Consigliato</label>
                                        <select name="sala_richiesta" class="ds-select">
                                            <option value="">-- Qualsiasi Sala Disponibile --</option>
                                            <option value="chirurgica" ${p.sala_richiesta === 'chirurgica' ? 'selected' : ''}>Sala Chirurgica Sterile</option>
                                            <option value="igiene" ${p.sala_richiesta === 'igiene' ? 'selected' : ''}>Ambulatorio Igiene & Profilassi</option>
                                            <option value="radiologia" ${p.sala_richiesta === 'radiologia' ? 'selected' : ''}>Sala RX / CBCT TAC</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div class="ds-panel" id="ds-tab-tariffa" style="display:${currentTab === 'tariffa' ? 'flex' : 'none'};">
                                <div class="ds-panel-header">
                                    <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">euro</span>Prezzi, IVA & Costi Diretti</div>
                                </div>
                                <div class="ds-form-grid">
                                    <div class="ds-form-field">
                                        <label>Prezzo Paziente di Listino (€) *</label>
                                        <input type="number" step="0.01" name="prezzo_paziente" id="ds-p-prezzo" class="ds-input" required placeholder="0.00" value="${p.prezzo_paziente || ''}">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Prezzo Minimo Applicabile (€)</label>
                                        <input type="number" step="0.01" name="prezzo_minimo" class="ds-input" placeholder="Soglia salvaguardia sconti..." value="${p.prezzo_minimo || ''}">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Regime Fiscale IVA</label>
                                        <select name="regime_iva" class="ds-select">
                                            <option value="esente_art10" ${p.regime_iva === 'esente_art10' ? 'selected' : ''}>Esente IVA Art. 10 Sanitario</option>
                                            <option value="iva_22" ${p.regime_iva === 'iva_22' ? 'selected' : ''}>IVA Ordinaria 22% (Estetica non terapeutica)</option>
                                        </select>
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Costo Materiale / Laboratorio (€)</label>
                                        <input type="number" step="0.01" name="costo_materiale_stimato" id="ds-p-cmat" class="ds-input" placeholder="0.00" value="${p.costo_materiale_stimato || ''}">
                                    </div>
                                </div>
                            </div>

                            <div class="ds-panel" id="ds-tab-compensi" style="display:${currentTab === 'compensi' ? 'flex' : 'none'};">
                                <div class="ds-panel-header">
                                    <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">account_balance_wallet</span>Regole Compensi Staff & Simulatore Economico</div>
                                </div>
                                <div class="ds-form-grid">
                                    <div class="ds-form-field">
                                        <label>Tipo Compenso Medico</label>
                                        <select name="tipo_quota_medico" id="ds-p-qmed-tipo" class="ds-select">
                                            <option value="percentuale" ${p.tipo_quota_medico === 'percentuale' ? 'selected' : ''}>% su Fatturato Paziente</option>
                                            <option value="fisso" ${p.tipo_quota_medico === 'fisso' ? 'selected' : ''}>Importo Fisso (€) a Seduta</option>
                                            <option value="margine" ${p.tipo_quota_medico === 'margine' ? 'selected' : ''}>% sul Margine Netto (al netto dei materiali)</option>
                                        </select>
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Valore Compenso Medico (% o €)</label>
                                        <input type="number" step="0.01" name="valore_quota_medico" id="ds-p-qmed-val" class="ds-input" value="${p.valore_quota_medico || 35}">
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Tipo Quota Staff / ASO / Segreteria</label>
                                        <select name="tipo_quota_segretaria" id="ds-p-qseg-tipo" class="ds-select">
                                            <option value="nessuno" ${p.tipo_quota_segretaria === 'nessuno' ? 'selected' : ''}>Nessun compenso staff</option>
                                            <option value="fisso" ${(p.tipo_quota_segretaria === 'fisso' || !p.tipo_quota_segretaria) ? 'selected' : ''}>Fisso (€) a Seduta</option>
                                            <option value="percentuale" ${p.tipo_quota_segretaria === 'percentuale' ? 'selected' : ''}>% su Fatturato Paziente</option>
                                        </select>
                                    </div>
                                    <div class="ds-form-field">
                                        <label>Valore Quota Staff (% o €)</label>
                                        <input type="number" step="0.01" name="valore_quota_segretaria" id="ds-p-qseg-val" class="ds-input" value="${p.valore_quota_segretaria || 0}">
                                    </div>
                                    <div class="ds-form-field" style="grid-column:1/-1;">
                                        <div style="padding:1.2rem 1.4rem; background:var(--md-surface-container-low); border:1.5px solid var(--ds-teal); border-radius:16px;">
                                            <div style="font-weight:800; font-size:1.05rem; color:var(--ds-teal-dark); margin-bottom:0.6rem; display:flex; align-items:center; gap:0.5rem;">
                                                <span class="material-symbols-rounded">query_stats</span>
                                                Simulatore di Marginalità Economica Studio in Tempo Reale
                                            </div>
                                            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:1rem; font-size:0.88rem;">
                                                <div>Incasso Paziente: <strong id="ds-sim-prezzo">0.00 €</strong></div>
                                                <div>Costo Materiali (-): <strong id="ds-sim-mat" style="color:var(--md-on-surface-variant);">0.00 €</strong></div>
                                                <div>Quota Medico (-): <strong id="ds-sim-med" style="color:var(--ds-blue);">0.00 €</strong></div>
                                                <div>Quota Staff (-): <strong id="ds-sim-seg" style="color:var(--ds-purple);">0.00 €</strong></div>
                                                <div>Utile Netto Studio: <strong id="ds-sim-margine" style="color:var(--ds-green); font-size:1.1rem; font-weight:800;">0.00 € (0%)</strong></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                `;

                el.querySelectorAll('.ds-nav-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        currentTab = btn.dataset.tab;
                        renderForm();
                    });
                });

                el.querySelector('#ds-prest-btn-back').addEventListener('click', () => {
                    if (onNavigate) onNavigate('prestazioni');
                });

                const saveHandler = async () => {
                    try {
                        const form = el.querySelector('#ds-form-prestazione-full');
                        const nome = (form.querySelector('[name=nome]')?.value || '').trim();
                        const branca = form.querySelector('[name=branca]')?.value;
                        const prezzo = Number(form.querySelector('[name=prezzo_paziente]')?.value) || 0;

                        if (!nome) {
                            showNotification('Il Nome della prestazione è obbligatorio.', 'danger');
                            currentTab = 'anagrafica';
                            renderForm();
                            el.querySelector('#ds-inp-p-nome')?.focus();
                            return;
                        }

                        if (!prezzo || prezzo <= 0) {
                            showNotification('Inserisci un Prezzo Paziente valido.', 'danger');
                            currentTab = 'tariffa';
                            renderForm();
                            el.querySelector('#ds-p-prezzo')?.focus();
                            return;
                        }

                        const formData = new FormData(form);
                        const payload = Object.fromEntries(formData.entries());
                        payload.prezzo_paziente = prezzo;
                        payload.attivo = payload.attivo === '1';

                        if (isEdit) payload.id = p.id;

                        const action = isEdit ? 'prestazioni:update' : 'prestazioni:create';
                        const res = await callApi(action, payload);

                        if (res && res.success) {
                            showNotification(isEdit ? 'Prestazione aggiornata con successo' : 'Nuova prestazione inserita nel listino!', 'success');
                            setTimeout(() => {
                                if (onNavigate) onNavigate('prestazioni');
                            }, 400);
                        } else {
                            showNotification(res.error || 'Errore salvataggio prestazione', 'danger');
                        }
                    } catch (err) {
                        showNotification(err.message, 'danger');
                    }
                };

                el.querySelector('#ds-prest-btn-save').addEventListener('click', saveHandler);

                function updateSim() {
                    const form = el.querySelector('#ds-form-prestazione-full');
                    if (!form) return;
                    const pVal = Number(form.querySelector('#ds-p-prezzo')?.value) || 0;
                    const cmatVal = Number(form.querySelector('#ds-p-cmat')?.value) || 0;
                    const qMedTipo = form.querySelector('#ds-p-qmed-tipo')?.value || 'percentuale';
                    const qMedVal = Number(form.querySelector('#ds-p-qmed-val')?.value) || 0;
                    const qSegTipo = form.querySelector('#ds-p-qseg-tipo')?.value || 'fisso';
                    const qSegVal = Number(form.querySelector('#ds-p-qseg-val')?.value) || 0;

                    let qMed = 0;
                    if (qMedTipo === 'percentuale') qMed = (pVal * qMedVal / 100);
                    else if (qMedTipo === 'margine') qMed = Math.max(0, (pVal - cmatVal) * qMedVal / 100);
                    else qMed = qMedVal;

                    let qSeg = 0;
                    if (qSegTipo === 'percentuale') qSeg = (pVal * qSegVal / 100);
                    else if (qSegTipo === 'fisso') qSeg = qSegVal;

                    const margine = Math.max(0, pVal - cmatVal - qMed - qSeg);
                    const marginePerc = pVal > 0 ? ((margine / pVal) * 100).toFixed(1) : 0;

                    const simP = el.querySelector('#ds-sim-prezzo');
                    const simMat = el.querySelector('#ds-sim-mat');
                    const simMed = el.querySelector('#ds-sim-med');
                    const simSeg = el.querySelector('#ds-sim-seg');
                    const simM = el.querySelector('#ds-sim-margine');

                    if (simP) simP.innerText = formatCurrency(pVal);
                    if (simMat) simMat.innerText = formatCurrency(cmatVal);
                    if (simMed) simMed.innerText = formatCurrency(qMed);
                    if (simSeg) simSeg.innerText = formatCurrency(qSeg);
                    if (simM) simM.innerText = `${formatCurrency(margine)} (${marginePerc}%)`;
                }

                ['#ds-p-prezzo', '#ds-p-cmat', '#ds-p-qmed-tipo', '#ds-p-qmed-val', '#ds-p-qseg-tipo', '#ds-p-qseg-val'].forEach(sel => {
                    const inp = el.querySelector(sel);
                    if (inp) {
                        inp.addEventListener('input', updateSim);
                        inp.addEventListener('change', updateSim);
                    }
                });

                updateSim();
            }

            renderForm();

        } catch (e) {
            el.innerHTML = `<div class="ds-root"><p style="color:var(--md-error);">Errore: ${e.message}</p></div>`;
        }
    }
};
