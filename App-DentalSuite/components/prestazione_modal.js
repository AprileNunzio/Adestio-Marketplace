import { callApi } from '../shared/api.js';
import { formatCurrency } from '../shared/ui_kit.js';

export function openPrestazioneModal({ prestazione = null, onSaved }) {
    try {
        const isEdit = !!prestazione;
        const p = prestazione || {};

        let activeTab = 'anagrafica';

        const overlay = document.createElement('div');
        overlay.className = 'ds-modal-overlay';
        overlay.innerHTML = `
            <div class="ds-modal-card fade-in-up" style="max-width:680px;">
                <div class="ds-modal-header">
                    <div class="ds-modal-title">
                        <span class="material-symbols-rounded" style="color:var(--ds-teal);">list_alt</span>
                        ${isEdit ? 'Modifica Prestazione Odontoiatrica' : 'Nuova Prestazione & Tariffario'}
                    </div>
                    <button class="ds-btn ds-btn-ghost" id="ds-pm-close"><span class="material-symbols-rounded">close</span></button>
                </div>

                <div class="ds-nav" style="padding:0.6rem 1.5rem 0.2rem; background:var(--md-surface-container-low); border-bottom:1px solid var(--md-outline-variant);">
                    <button class="ds-nav-btn active" data-tab="anagrafica" style="font-size:0.8rem;"><span class="material-symbols-rounded">category</span>1. Anagrafica & Branca</button>
                    <button class="ds-nav-btn" data-tab="tempi" style="font-size:0.8rem;"><span class="material-symbols-rounded">schedule</span>2. Tempi & Sale</button>
                    <button class="ds-nav-btn" data-tab="prezzo" style="font-size:0.8rem;"><span class="material-symbols-rounded">payments</span>3. Tariffa & Costi</button>
                    <button class="ds-nav-btn" data-tab="compensi" style="font-size:0.8rem;"><span class="material-symbols-rounded">calculate</span>4. Compensi & Margine</button>
                </div>

                <form id="ds-form-prestazione">
                    
                    <div class="ds-pm-section" id="ds-pm-tab-anagrafica">
                        <div class="ds-form-grid" style="grid-template-columns: 1fr 1fr;">
                            <div class="ds-form-field" style="grid-column:1/-1;">
                                <label>Nome Prestazione Clinica *</label>
                                <input type="text" name="nome" class="ds-input" required placeholder="Es. Ablazione Tartaro con AirFlow e Scaling" value="${p.nome || ''}">
                            </div>
                            <div class="ds-form-field">
                                <label>Codice Tariffario / Nomenclatore</label>
                                <input type="text" name="codice" class="ds-input" placeholder="Es. IGI-01, IMP-A1" value="${p.codice || ''}">
                            </div>
                            <div class="ds-form-field">
                                <label>Branca Odontoiatrica *</label>
                                <select name="branca" class="ds-select" required>
                                    <option value="igiene" ${p.branca === 'igiene' ? 'selected' : ''}>Igiene & Prevenzione</option>
                                    <option value="conservativa" ${p.branca === 'conservativa' ? 'selected' : ''}>Conservativa & Ricostruzioni</option>
                                    <option value="endodonzia" ${p.branca === 'endodonzia' ? 'selected' : ''}>Endodonzia & Devitalizzazioni</option>
                                    <option value="chirurgia" ${p.branca === 'chirurgia' ? 'selected' : ''}>Chirurgia Orale & Estrattiva</option>
                                    <option value="implantologia" ${p.branca === 'implantologia' ? 'selected' : ''}>Implantologia Osteointegrata</option>
                                    <option value="protesi" ${p.branca === 'protesi' ? 'selected' : ''}>Protesi Fissa & Mobile</option>
                                    <option value="ortodonzia" ${p.branca === 'ortodonzia' ? 'selected' : ''}>Ortodonzia & Gnatologia</option>
                                    <option value="parodontologia" ${p.branca === 'parodontologia' ? 'selected' : ''}>Parodontologia</option>
                                    <option value="pedodonzia" ${p.branca === 'pedodonzia' ? 'selected' : ''}>Pedodonzia / Odontoiatria Infantile</option>
                                    <option value="diagnostica" ${p.branca === 'diagnostica' ? 'selected' : ''}>Diagnostica per Immagini (OPT/CBCT)</option>
                                </select>
                            </div>
                            <div class="ds-form-field">
                                <label>Colore Tematico Badge Agenda</label>
                                <input type="color" name="colore_badge" class="ds-input" style="height:42px; padding:2px;" value="${p.colore_badge || '#0d9488'}">
                            </div>
                            <div class="ds-form-field">
                                <label>Stato nel Listino</label>
                                <select name="attivo" class="ds-select">
                                    <option value="1" ${p.attivo !== 0 ? 'selected' : ''}>Attiva / Erogabile</option>
                                    <option value="0" ${p.attivo === 0 ? 'selected' : ''}>Disattivata / Fuori Listino</option>
                                </select>
                            </div>
                            <div class="ds-form-field" style="grid-column:1/-1;">
                                <label>Descrizione & Informazioni per Preventivo</label>
                                <textarea name="descrizione" class="ds-textarea" rows="2" placeholder="Dettagli e spiegazioni che verranno riportati nei preventivi al paziente...">${p.descrizione || ''}</textarea>
                            </div>
                        </div>
                    </div>

                    <div class="ds-pm-section" id="ds-pm-tab-tempi" style="display:none;">
                        <div class="ds-form-grid" style="grid-template-columns: 1fr 1fr;">
                            <div class="ds-form-field">
                                <label>Durata Operativa (Minuti) *</label>
                                <input type="number" name="durata_minuti" class="ds-input" required min="5" step="5" value="${p.durata_minuti || 30}">
                            </div>
                            <div class="ds-form-field">
                                <label>Tempo Sanificazione / Riassetto (Min)</label>
                                <input type="number" name="tempo_sanificazione" class="ds-input" min="0" step="5" value="${p.tempo_sanificazione || 10}">
                            </div>
                            <div class="ds-form-field">
                                <label>Numero Sedute Cliniche Medie</label>
                                <input type="number" name="num_sedute" class="ds-input" min="1" max="20" value="${p.num_sedute || 1}">
                            </div>
                            <div class="ds-form-field">
                                <label>Sala Operativa Consigliata</label>
                                <select name="sala_richiesta" class="ds-select">
                                    <option value="">-- Qualsiasi Sala Operativa --</option>
                                    <option value="chirurgia" ${p.sala_richiesta === 'chirurgia' ? 'selected' : ''}>Sala Chirurgica Sterile</option>
                                    <option value="igiene" ${p.sala_richiesta === 'igiene' ? 'selected' : ''}>Ambulatorio Igiene & Prevenzione</option>
                                    <option value="ortodonzia" ${p.sala_richiesta === 'ortodonzia' ? 'selected' : ''}>Sala Ortodonzia</option>
                                    <option value="rx_diagnostica" ${p.sala_richiesta === 'rx_diagnostica' ? 'selected' : ''}>Sala Radiologica / CBCT</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="ds-pm-section" id="ds-pm-tab-prezzo" style="display:none;">
                        <div class="ds-form-grid" style="grid-template-columns: 1fr 1fr;">
                            <div class="ds-form-field">
                                <label>Tariffa Paziente (€) *</label>
                                <input type="number" name="prezzo_paziente" id="ds-calc-prezzo" class="ds-input" required min="0" step="0.5" value="${p.prezzo_paziente || 80}">
                            </div>
                            <div class="ds-form-field">
                                <label>Prezzo Minimo Applicabile (€)</label>
                                <input type="number" name="prezzo_minimo" class="ds-input" min="0" step="0.5" value="${p.prezzo_minimo || (p.prezzo_paziente ? p.prezzo_paziente * 0.85 : 70)}">
                            </div>
                            <div class="ds-form-field">
                                <label>Regime Fiscale IVA</label>
                                <select name="regime_iva" class="ds-select">
                                    <option value="esente_art10" ${p.regime_iva !== 'iva_22' ? 'selected' : ''}>Esente IVA Art. 10 DPR 633/72 (Sanitario)</option>
                                    <option value="iva_22" ${p.regime_iva === 'iva_22' ? 'selected' : ''}>IVA Ordinaria 22% (Trattamenti Estetici)</option>
                                </select>
                            </div>
                            <div class="ds-form-field">
                                <label>Costo Materiali / Odontotecnico (€)</label>
                                <input type="number" name="costo_materiale_stimato" id="ds-calc-cmat" class="ds-input" min="0" step="0.5" value="${p.costo_materiale_stimato || 10}">
                            </div>
                        </div>
                    </div>

                    <div class="ds-pm-section" id="ds-pm-tab-compensi" style="display:none;">
                        <div class="ds-form-grid" style="grid-template-columns: 1fr 1fr;">
                            <div class="ds-form-field">
                                <label>Regola Quota Medico / Specialista</label>
                                <select name="tipo_quota_medico" id="ds-calc-qmed-tipo" class="ds-select">
                                    <option value="percentuale" ${p.tipo_quota_medico === 'percentuale' ? 'selected' : ''}>% su Fatturato Paziente</option>
                                    <option value="fisso" ${p.tipo_quota_medico === 'fisso' ? 'selected' : ''}>Importo Fisso (€) a Seduta</option>
                                    <option value="margine" ${p.tipo_quota_medico === 'margine' ? 'selected' : ''}>% su Margine Netto (al netto dei materiali)</option>
                                </select>
                            </div>
                            <div class="ds-form-field">
                                <label>Valore Quota Medico</label>
                                <input type="number" name="valore_quota_medico" id="ds-calc-qmed-val" class="ds-input" min="0" step="0.5" value="${p.valore_quota_medico !== undefined ? p.valore_quota_medico : 35}">
                            </div>
                            <div class="ds-form-field">
                                <label>Incentivo ASO / Segreteria</label>
                                <select name="tipo_quota_segretaria" id="ds-calc-qseg-tipo" class="ds-select">
                                    <option value="fisso" ${p.tipo_quota_segretaria === 'fisso' ? 'selected' : ''}>Incentivo Fisso (€) a Seduta</option>
                                    <option value="percentuale" ${p.tipo_quota_segretaria === 'percentuale' ? 'selected' : ''}>% su Fatturato Paziente</option>
                                    <option value="nessuno" ${p.tipo_quota_segretaria === 'nessuno' ? 'selected' : ''}>Nessun Incentivo</option>
                                </select>
                            </div>
                            <div class="ds-form-field">
                                <label>Valore Quota ASO / Staff</label>
                                <input type="number" name="valore_quota_segretaria" id="ds-calc-qseg-val" class="ds-input" min="0" step="0.5" value="${p.valore_quota_segretaria !== undefined ? p.valore_quota_segretaria : 5}">
                            </div>

                            <div style="grid-column:1/-1; background:var(--md-surface-container-low); border:1.5px solid var(--ds-teal); border-radius:14px; padding:1rem 1.2rem; margin-top:0.4rem;">
                                <div style="font-weight:800; font-size:0.88rem; color:var(--ds-teal); display:flex; align-items:center; gap:0.4rem; margin-bottom:0.6rem;">
                                    <span class="material-symbols-rounded">analytics</span> Simulatore Margine Economico Studio
                                </div>
                                <div id="ds-calc-summary" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.6rem; font-size:0.84rem;">
                                    <div>Paziente: <strong id="ds-sim-paz">0 €</strong></div>
                                    <div>Materiali: <strong id="ds-sim-mat" style="color:var(--ds-rose);">0 €</strong></div>
                                    <div>Medico: <strong id="ds-sim-med" style="color:var(--ds-blue);">0 €</strong></div>
                                    <div>Staff: <strong id="ds-sim-seg" style="color:var(--ds-purple);">0 €</strong></div>
                                    <div style="padding:0.3rem 0.6rem; background:var(--ds-teal-soft); border-radius:8px; font-weight:800; color:var(--ds-teal-dark);">
                                        Utile Studio: <span id="ds-sim-net">0 €</span> (<span id="ds-sim-pct">0%</span>)
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style="display:flex; justify-content:flex-end; gap:0.8rem; margin-top:1.2rem; padding-top:1rem; border-top:1px solid var(--md-outline-variant);">
                        <button type="button" class="ds-btn ds-btn-ghost" id="ds-pm-cancel">Annulla</button>
                        <button type="submit" class="ds-btn ds-btn-primary"><span class="material-symbols-rounded">save</span> ${isEdit ? 'Salva Modifiche' : 'Crea Prestazione'}</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(overlay);

        const closeModal = () => overlay.remove();
        overlay.querySelector('#ds-pm-close').addEventListener('click', closeModal);
        overlay.querySelector('#ds-pm-cancel').addEventListener('click', closeModal);

        const navBtns = overlay.querySelectorAll('.ds-nav-btn');
        navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                navBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeTab = btn.dataset.tab;
                overlay.querySelectorAll('.ds-pm-section').forEach(sec => sec.style.display = 'none');
                overlay.querySelector(`#ds-pm-tab-${activeTab}`).style.display = 'block';
            });
        });

        function updateSimulator() {
            try {
                const prezzo = Number(overlay.querySelector('#ds-calc-prezzo')?.value) || 0;
                const cmat = Number(overlay.querySelector('#ds-calc-cmat')?.value) || 0;
                const qmedTipo = overlay.querySelector('#ds-calc-qmed-tipo')?.value || 'percentuale';
                const qmedVal = Number(overlay.querySelector('#ds-calc-qmed-val')?.value) || 0;
                const qsegTipo = overlay.querySelector('#ds-calc-qseg-tipo')?.value || 'fisso';
                const qsegVal = Number(overlay.querySelector('#ds-calc-qseg-val')?.value) || 0;

                let quotaMed = 0;
                if (qmedTipo === 'percentuale') quotaMed = prezzo * (qmedVal / 100);
                else if (qmedTipo === 'fisso') quotaMed = qmedVal;
                else if (qmedTipo === 'margine') quotaMed = Math.max(0, prezzo - cmat) * (qmedVal / 100);

                let quotaSeg = 0;
                if (qsegTipo === 'percentuale') quotaSeg = prezzo * (qsegVal / 100);
                else if (qsegTipo === 'fisso') quotaSeg = qsegVal;

                const utileStudio = Math.max(0, prezzo - cmat - quotaMed - quotaSeg);
                const pctUtile = prezzo > 0 ? Math.round((utileStudio / prezzo) * 100) : 0;

                overlay.querySelector('#ds-sim-paz').textContent = formatCurrency(prezzo);
                overlay.querySelector('#ds-sim-mat').textContent = '- ' + formatCurrency(cmat);
                overlay.querySelector('#ds-sim-med').textContent = '- ' + formatCurrency(quotaMed);
                overlay.querySelector('#ds-sim-seg').textContent = '- ' + formatCurrency(quotaSeg);
                overlay.querySelector('#ds-sim-net').textContent = formatCurrency(utileStudio);
                overlay.querySelector('#ds-sim-pct').textContent = pctUtile + '%';
            } catch (e) {}
        }

        ['#ds-calc-prezzo', '#ds-calc-cmat', '#ds-calc-qmed-tipo', '#ds-calc-qmed-val', '#ds-calc-qseg-tipo', '#ds-calc-qseg-val'].forEach(sel => {
            overlay.querySelector(sel)?.addEventListener('input', updateSimulator);
            overlay.querySelector(sel)?.addEventListener('change', updateSimulator);
        });
        updateSimulator();

        overlay.querySelector('#ds-form-prestazione').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const payload = Object.fromEntries(formData.entries());
            payload.attivo = payload.attivo === '1';
            if (isEdit) payload.id = p.id;

            const action = isEdit ? 'prestazioni:update' : 'prestazioni:create';
            await callApi(action, payload);
            closeModal();
            if (onSaved) onSaved();
        });
    } catch (e) {}
}
