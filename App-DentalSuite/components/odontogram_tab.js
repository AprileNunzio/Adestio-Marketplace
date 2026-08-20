import { callApi } from '../shared/api.js';
import { showNotification } from '../shared/ui_kit.js';

export function renderOdontogramTab(container, { pazienteId, odontogramma = [], onUpdated }) {
    try {
        const teethMap = {};
        odontogramma.forEach(t => { teethMap[t.numero_dente] = t; });

        let selectedToothNum = '16';

        const upperAdultRight = [18, 17, 16, 15, 14, 13, 12, 11];
        const upperAdultLeft = [21, 22, 23, 24, 25, 26, 27, 28];
        const lowerAdultRight = [48, 47, 46, 45, 44, 43, 42, 41];
        const lowerAdultLeft = [31, 32, 33, 34, 35, 36, 37, 38];

        const stateLabels = {
            sano: 'Sano',
            carie: 'Carie',
            otturazione: 'Otturato',
            devitalizzato: 'Devitalizzato',
            corona: 'Corona',
            impianto: 'Impianto',
            estrazione_programmata: 'Da Estrarre',
            mancante: 'Mancante'
        };

        const stateBadges = {
            sano: 'teal',
            carie: 'rose',
            otturazione: 'blue',
            devitalizzato: 'purple',
            corona: 'amber',
            impianto: 'cyan',
            estrazione_programmata: 'rose',
            mancante: 'grey'
        };

        function renderFullView() {
            try {
                const currentData = teethMap[selectedToothNum] || { stato: 'sano', superfici: '', materiale: '', note: '' };

                const renderToothCard = (num) => {
                    const t = teethMap[num] || { stato: 'sano' };
                    const isSelected = String(num) === String(selectedToothNum);
                    return `
                        <div class="ds-tooth-card ${isSelected ? 'selected' : ''}" data-num="${num}" data-state="${t.stato || 'sano'}" style="${isSelected ? 'transform:scale(1.08); box-shadow:0 0 0 2.5px var(--ds-teal);' : ''}">
                            <div class="ds-tooth-num">${num}</div>
                            <span class="material-symbols-rounded ds-tooth-icon">dentistry</span>
                            <div style="font-size:0.65rem; font-weight:700; text-transform:uppercase;">${stateLabels[t.stato] || t.stato}</div>
                        </div>
                    `;
                };

                container.innerHTML = `
                    <div style="display:grid; grid-template-columns: 1fr 340px; gap:1.2rem; align-items:start;">
                        
                        <div class="ds-panel">
                            <div class="ds-panel-header">
                                <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">dentistry</span>Mappa Dentale Grafica FDI (Formula Dentaria)</div>
                                <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
                                    <span class="ds-badge ds-badge-teal">Sano</span>
                                    <span class="ds-badge ds-badge-rose">Carie</span>
                                    <span class="ds-badge ds-badge-blue">Otturato</span>
                                    <span class="ds-badge ds-badge-purple">Devitalizzato</span>
                                    <span class="ds-badge ds-badge-amber">Corona</span>
                                </div>
                            </div>

                            <div style="padding:1rem 0;">
                                <div style="text-align:center; font-size:0.8rem; font-weight:800; color:var(--md-on-surface-variant); text-transform:uppercase; margin-bottom:0.6rem;">Arcata Superiore (Mascella)</div>
                                <div class="ds-odontogram-arch">
                                    ${upperAdultRight.map(renderToothCard).join('')}
                                    <div style="width:16px; border-right:2px dashed var(--md-outline-variant); margin:0 4px;"></div>
                                    ${upperAdultLeft.map(renderToothCard).join('')}
                                </div>

                                <div style="text-align:center; font-size:0.8rem; font-weight:800; color:var(--md-on-surface-variant); text-transform:uppercase; margin-top:1.4rem; margin-bottom:0.6rem;">Arcata Inferiore (Mandibola)</div>
                                <div class="ds-odontogram-arch">
                                    ${lowerAdultRight.map(renderToothCard).join('')}
                                    <div style="width:16px; border-right:2px dashed var(--md-outline-variant); margin:0 4px;"></div>
                                    ${lowerAdultLeft.map(renderToothCard).join('')}
                                </div>
                            </div>
                        </div>

                        <div class="ds-panel" style="position:sticky; top:1rem;">
                            <div class="ds-panel-header">
                                <div class="ds-panel-title">
                                    <span class="material-symbols-rounded" style="color:var(--ds-teal);">tune</span>
                                    Dente Selezionato: <strong style="color:var(--ds-teal); font-size:1.1rem; margin-left:0.3rem;">#${selectedToothNum}</strong>
                                </div>
                                <span class="ds-badge ds-badge-${stateBadges[currentData.stato] || 'teal'}">${stateLabels[currentData.stato] || currentData.stato}</span>
                            </div>

                            <form id="ds-form-tooth-inpage">
                                <div class="ds-form-grid" style="grid-template-columns:1fr; gap:0.9rem;">
                                    <div class="ds-form-field">
                                        <label>Condizione Clinica Dente</label>
                                        <select name="stato" class="ds-select" id="ds-sel-tooth-state">
                                            <option value="sano" ${currentData.stato === 'sano' ? 'selected' : ''}>Sano</option>
                                            <option value="carie" ${currentData.stato === 'carie' ? 'selected' : ''}>Carie attiva</option>
                                            <option value="otturazione" ${currentData.stato === 'otturazione' ? 'selected' : ''}>Otturato</option>
                                            <option value="devitalizzato" ${currentData.stato === 'devitalizzato' ? 'selected' : ''}>Devitalizzato (Endodonzia)</option>
                                            <option value="corona" ${currentData.stato === 'corona' ? 'selected' : ''}>Corona / Capsula</option>
                                            <option value="impianto" ${currentData.stato === 'impianto' ? 'selected' : ''}>Impianto Osteointegrato</option>
                                            <option value="estrazione_programmata" ${currentData.stato === 'estrazione_programmata' ? 'selected' : ''}>Da Estrarre</option>
                                            <option value="mancante" ${currentData.stato === 'mancante' ? 'selected' : ''}>Elemento Mancante / Agenesia</option>
                                        </select>
                                    </div>

                                    <div class="ds-form-field">
                                        <label>Superfici Interessate (MODBL)</label>
                                        <input type="text" name="superfici" class="ds-input" placeholder="Es. Occlusale, Mesiale, Distale..." value="${currentData.superfici || ''}">
                                    </div>

                                    <div class="ds-form-field">
                                        <label>Materiale di Ricostruzione</label>
                                        <input type="text" name="materiale" class="ds-input" placeholder="Es. Composito Nanoriempito, Zirconia..." value="${currentData.materiale || ''}">
                                    </div>

                                    <div class="ds-form-field">
                                        <label>Note Cliniche Dente</label>
                                        <textarea name="note" class="ds-textarea" rows="3" placeholder="Sintomatologia, test vitalità, profondità tasca...">${currentData.note || ''}</textarea>
                                    </div>

                                    <button type="button" class="ds-btn ds-btn-primary" id="ds-save-tooth-btn" style="width:100%; padding:0.75rem; justify-content:center;">
                                        <span class="material-symbols-rounded">save</span>
                                        Aggiorna Stato Dente #${selectedToothNum}
                                    </button>
                                </div>
                            </form>
                        </div>

                    </div>
                `;

                container.querySelectorAll('.ds-tooth-card').forEach(card => {
                    card.addEventListener('click', () => {
                        selectedToothNum = card.dataset.num;
                        renderFullView();
                    });
                });

                container.querySelector('#ds-save-tooth-btn')?.addEventListener('click', async () => {
                    try {
                        const form = container.querySelector('#ds-form-tooth-inpage');
                        const payload = {
                            paziente_id: pazienteId,
                            numero_dente: selectedToothNum,
                            stato: form.querySelector('[name=stato]')?.value || 'sano',
                            superfici: (form.querySelector('[name=superfici]')?.value || '').trim(),
                            materiale: (form.querySelector('[name=materiale]')?.value || '').trim(),
                            note: (form.querySelector('[name=note]')?.value || '').trim()
                        };

                        teethMap[selectedToothNum] = payload;
                        const res = await callApi('pazienti:saveOdontogrammaDente', payload);
                        if (res && res.success) {
                            showNotification(`Dente #${selectedToothNum} aggiornato con successo`, 'success');
                            renderFullView();
                        } else {
                            showNotification(res.error || 'Errore salvataggio odontogramma', 'danger');
                        }
                    } catch (err) {
                        showNotification(err.message, 'danger');
                    }
                });

            } catch (e) {
                container.innerHTML = `<p style="color:var(--md-error);">Errore: ${e.message}</p>`;
            }
        }

        renderFullView();

    } catch (e) {
        container.innerHTML = `<p style="color:var(--md-error);">Errore generale odontogramma: ${e.message}</p>`;
    }
}
