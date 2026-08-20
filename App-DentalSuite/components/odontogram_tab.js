import { callApi } from '../shared/api.js';
import { renderModal } from '../shared/ui_kit.js';

export function renderOdontogramTab(container, { pazienteId, odontogramma = [], onUpdated }) {
    try {
        const teethMap = {};
        odontogramma.forEach(t => { teethMap[t.numero_dente] = t; });

        const upperAdultRight = [18, 17, 16, 15, 14, 13, 12, 11];
        const upperAdultLeft = [21, 22, 23, 24, 25, 26, 27, 28];
        const lowerAdultRight = [48, 47, 46, 45, 44, 43, 42, 41];
        const lowerAdultLeft = [31, 32, 33, 34, 35, 36, 37, 38];

        const renderTooth = (num) => {
            const t = teethMap[num] || { stato: 'sano' };
            const stateLabels = { sano: 'Sano', carie: 'Carie', otturazione: 'Otturato', devitalizzato: 'Devitalizzato', corona: 'Corona', impianto: 'Impianto', estrazione_programmata: 'Estrarre', mancante: 'Mancante' };
            return `
                <div class="ds-tooth-card" data-num="${num}" data-state="${t.stato || 'sano'}" title="Dente ${num}: ${stateLabels[t.stato] || t.stato}">
                    <div class="ds-tooth-num">${num}</div>
                    <span class="material-symbols-rounded ds-tooth-icon">dentistry</span>
                    <div style="font-size:0.65rem; font-weight:700; text-transform:uppercase;">${stateLabels[t.stato] || t.stato}</div>
                </div>
            `;
        };

        container.innerHTML = `
            <div class="ds-odontogram-wrap">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.6rem;">
                    <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">dentistry</span>Odontogramma FDI</div>
                    <div style="display:flex; gap:0.6rem; align-items:center; font-size:0.75rem; font-weight:700;">
                        <span class="ds-badge ds-badge-teal">Sano</span>
                        <span class="ds-badge ds-badge-rose">Carie</span>
                        <span class="ds-badge ds-badge-blue">Otturato</span>
                        <span class="ds-badge ds-badge-purple">Devitalizzato</span>
                        <span class="ds-badge ds-badge-amber">Corona</span>
                    </div>
                </div>

                <div style="text-align:center; font-size:0.8rem; font-weight:700; color:var(--md-on-surface-variant); text-transform:uppercase;">Arcata Superiore (Mascella)</div>
                <div class="ds-odontogram-arch">
                    ${upperAdultRight.map(renderTooth).join('')}
                    <div style="width:16px; border-right:2px dashed var(--md-outline-variant); margin:0 4px;"></div>
                    ${upperAdultLeft.map(renderTooth).join('')}
                </div>

                <div style="text-align:center; font-size:0.8rem; font-weight:700; color:var(--md-on-surface-variant); text-transform:uppercase; margin-top:1rem;">Arcata Inferiore (Mandibola)</div>
                <div class="ds-odontogram-arch">
                    ${lowerAdultRight.map(renderTooth).join('')}
                    <div style="width:16px; border-right:2px dashed var(--md-outline-variant); margin:0 4px;"></div>
                    ${lowerAdultLeft.map(renderTooth).join('')}
                </div>
            </div>
        `;

        container.querySelectorAll('.ds-tooth-card').forEach(card => {
            card.addEventListener('click', () => {
                const num = card.dataset.num;
                openToothModal(pazienteId, num, teethMap[num] || {}, onUpdated);
            });
        });
    } catch (e) {}
}

function openToothModal(pazienteId, numeroDente, currentData = {}, onUpdated) {
    try {
        const modalHtml = renderModal({
            id: 'ds-modal-tooth',
            title: `Stato Clinico Dente ${numeroDente}`,
            icon: 'dentistry',
            bodyHtml: `
                <form id="ds-form-tooth">
                    <div class="ds-form-grid">
                        <div class="ds-form-field" style="grid-column:1/-1;">
                            <label>Stato Dente</label>
                            <select name="stato" class="ds-select">
                                <option value="sano" ${currentData.stato === 'sano' ? 'selected' : ''}>Sano</option>
                                <option value="carie" ${currentData.stato === 'carie' ? 'selected' : ''}>Carie</option>
                                <option value="otturazione" ${currentData.stato === 'otturazione' ? 'selected' : ''}>Otturato</option>
                                <option value="devitalizzato" ${currentData.stato === 'devitalizzato' ? 'selected' : ''}>Devitalizzato (Endodonzia)</option>
                                <option value="corona" ${currentData.stato === 'corona' ? 'selected' : ''}>Corona / Capsula</option>
                                <option value="impianto" ${currentData.stato === 'impianto' ? 'selected' : ''}>Impianto</option>
                                <option value="estrazione_programmata" ${currentData.stato === 'estrazione_programmata' ? 'selected' : ''}>Da Estrarre</option>
                                <option value="mancante" ${currentData.stato === 'mancante' ? 'selected' : ''}>Mancante</option>
                            </select>
                        </div>
                        <div class="ds-form-field">
                            <label>Superfici Coinvolte</label>
                            <input type="text" name="superfici" class="ds-input" value="${currentData.superfici || ''}">
                        </div>
                        <div class="ds-form-field">
                            <label>Materiale</label>
                            <input type="text" name="materiale" class="ds-input" value="${currentData.materiale || ''}">
                        </div>
                        <div class="ds-form-field" style="grid-column:1/-1;">
                            <label>Note</label>
                            <textarea name="note" class="ds-textarea" rows="2">${currentData.note || ''}</textarea>
                        </div>
                    </div>
                </form>
            `,
            footerHtml: `
                <button type="button" class="ds-btn ds-btn-ghost ds-modal-cancel">Annulla</button>
                <button type="button" class="ds-btn ds-btn-primary" id="ds-save-tooth"><span class="material-symbols-rounded">save</span>Salva</button>
            `
        });

        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);
        const mEl = modalContainer.querySelector('#ds-modal-tooth');
        mEl.style.display = 'flex';

        const close = () => { modalContainer.remove(); };
        mEl.querySelectorAll('.ds-modal-close, .ds-modal-cancel').forEach(b => b.addEventListener('click', close));

        mEl.querySelector('#ds-save-tooth').addEventListener('click', async () => {
            const form = mEl.querySelector('#ds-form-tooth');
            await callApi('pazienti:saveOdontogrammaDente', {
                paziente_id: pazienteId,
                numero_dente: numeroDente,
                stato: form.querySelector('[name=stato]').value,
                superfici: form.querySelector('[name=superfici]').value,
                materiale: form.querySelector('[name=materiale]').value,
                note: form.querySelector('[name=note]').value
            });
            close();
            if (typeof onUpdated === 'function') onUpdated();
        });
    } catch (e) {}
}
