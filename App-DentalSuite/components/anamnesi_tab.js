import { showNotification } from '../shared/ui_kit.js';
import { callApi } from '../shared/api.js';

export function renderAnamnesiTab(container, { pazienteId, anamnesi = {} }) {
    try {
        container.innerHTML = `
            <div class="ds-panel">
                <div class="ds-panel-header">
                    <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">health_and_safety</span>Scheda Anamnesi e Rischio Clinico</div>
                    <button class="ds-btn ds-btn-primary" id="ds-save-anamnesi"><span class="material-symbols-rounded">save</span>Salva Anamnesi</button>
                </div>
                <form id="ds-anamnesi-form">
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:1rem; margin-bottom:1.2rem;">
                        <label style="display:flex; align-items:center; gap:0.6rem; padding:0.6rem 0.8rem; background:var(--md-surface-container-low); border-radius:10px; cursor:pointer;">
                            <input type="checkbox" name="patologie_cardiovascolari" ${anamnesi.patologie_cardiovascolari ? 'checked' : ''}>
                            <strong>Patologie Cardiovascolari</strong>
                        </label>
                        <label style="display:flex; align-items:center; gap:0.6rem; padding:0.6rem 0.8rem; background:var(--md-surface-container-low); border-radius:10px; cursor:pointer;">
                            <input type="checkbox" name="terapia_anticoagulanti" ${anamnesi.terapia_anticoagulanti ? 'checked' : ''}>
                            <strong style="color:var(--ds-rose);">Terapia Anticoagulanti (Cardioaspirina/Coumadin)</strong>
                        </label>
                        <label style="display:flex; align-items:center; gap:0.6rem; padding:0.6rem 0.8rem; background:var(--md-surface-container-low); border-radius:10px; cursor:pointer;">
                            <input type="checkbox" name="diabete" ${anamnesi.diabete ? 'checked' : ''}>
                            <strong>Diabete Mellito</strong>
                        </label>
                        <label style="display:flex; align-items:center; gap:0.6rem; padding:0.6rem 0.8rem; background:var(--md-surface-container-low); border-radius:10px; cursor:pointer;">
                            <input type="checkbox" name="ipertensione" ${anamnesi.ipertensione ? 'checked' : ''}>
                            <strong>Ipertensione Arteriosa</strong>
                        </label>
                        <label style="display:flex; align-items:center; gap:0.6rem; padding:0.6rem 0.8rem; background:var(--md-surface-container-low); border-radius:10px; cursor:pointer;">
                            <input type="checkbox" name="epatiti_hiv" ${anamnesi.epatiti_hiv ? 'checked' : ''}>
                            <strong>Malattie Infettive (Epatiti/HIV)</strong>
                        </label>
                        <label style="display:flex; align-items:center; gap:0.6rem; padding:0.6rem 0.8rem; background:var(--md-surface-container-low); border-radius:10px; cursor:pointer;">
                            <input type="checkbox" name="fumatore" ${anamnesi.fumatore ? 'checked' : ''}>
                            <strong>Fumatore Abituale</strong>
                        </label>
                        <label style="display:flex; align-items:center; gap:0.6rem; padding:0.6rem 0.8rem; background:var(--md-surface-container-low); border-radius:10px; cursor:pointer;">
                            <input type="checkbox" name="gravidanza" ${anamnesi.gravidanza ? 'checked' : ''}>
                            <strong>Stato di Gravidanza</strong>
                        </label>
                        <label style="display:flex; align-items:center; gap:0.6rem; padding:0.6rem 0.8rem; background:var(--md-surface-container-low); border-radius:10px; cursor:pointer;">
                            <input type="checkbox" name="ansia_odontoiatrica" ${anamnesi.ansia_odontoiatrica ? 'checked' : ''}>
                            <strong>Odontofobia / Ansia</strong>
                        </label>
                    </div>
                    <div class="ds-form-grid">
                        <div class="ds-form-field" style="grid-column: 1/-1;">
                            <label style="color:var(--ds-rose);">Allergie a Farmaci, Lattice o Anestetici</label>
                            <input type="text" name="allergie_farmaci" class="ds-input" placeholder="Es. Penicillina, Cefalosporine..." value="${anamnesi.allergie_farmaci || ''}">
                        </div>
                        <div class="ds-form-field" style="grid-column: 1/-1;">
                            <label>Terapie in Corso</label>
                            <input type="text" name="terapie_in_corso" class="ds-input" value="${anamnesi.terapie_in_corso || ''}">
                        </div>
                        <div class="ds-form-field" style="grid-column: 1/-1;">
                            <label>Note Cliniche</label>
                            <textarea name="note_mediche" class="ds-textarea" rows="3">${anamnesi.note_mediche || ''}</textarea>
                        </div>
                    </div>
                </form>
            </div>
        `;

        container.querySelector('#ds-save-anamnesi').addEventListener('click', async () => {
            const form = container.querySelector('#ds-anamnesi-form');
            const payload = {
                paziente_id: pazienteId,
                patologie_cardiovascolari: form.querySelector('[name=patologie_cardiovascolari]').checked,
                terapia_anticoagulanti: form.querySelector('[name=terapia_anticoagulanti]').checked,
                diabete: form.querySelector('[name=diabete]').checked,
                ipertensione: form.querySelector('[name=ipertensione]').checked,
                epatiti_hiv: form.querySelector('[name=epatiti_hiv]').checked,
                fumatore: form.querySelector('[name=fumatore]').checked,
                gravidanza: form.querySelector('[name=gravidanza]').checked,
                ansia_odontoiatrica: form.querySelector('[name=ansia_odontoiatrica]').checked,
                allergie_farmaci: form.querySelector('[name=allergie_farmaci]').value,
                terapie_in_corso: form.querySelector('[name=terapie_in_corso]').value,
                note_mediche: form.querySelector('[name=note_mediche]').value
            };
            await callApi('pazienti:saveAnamnesi', payload);
            showNotification('Anamnesi salvata', 'error');
        });
    } catch (e) {}
}
