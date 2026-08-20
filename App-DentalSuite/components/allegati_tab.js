import { callApi } from '../shared/api.js';
import { formatDate } from '../shared/ui_kit.js';

export function renderAllegatiTab(container, { pazienteId, allegati = [], onUpdated }) {
    try {
        container.innerHTML = `
            <div class="ds-panel">
                <div class="ds-panel-header">
                    <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">perm_media</span>Archivio TAC / RMN / Radiografie</div>
                    <button class="ds-btn ds-btn-primary" id="ds-upload-allegato"><span class="material-symbols-rounded">cloud_upload</span>Carica TAC / RMN / Radiografia</button>
                </div>

                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:1rem;">
                    ${allegati.length === 0 ? '<p style="grid-column:1/-1; color:var(--md-on-surface-variant); text-align:center; padding:1.5rem;">Nessun esame o allegato presente.</p>' : allegati.map(al => `
                        <div style="background:var(--md-surface-container-low); border:1px solid var(--md-outline-variant); border-radius:14px; padding:1rem; display:flex; flex-direction:column; gap:0.6rem;">
                            <div style="display:flex; align-items:center; gap:0.6rem;">
                                <span class="material-symbols-rounded" style="font-size:1.8rem; color:var(--ds-teal);">${al.tipo.includes('tac') ? 'biotech' : (al.tipo.includes('rmn') ? 'radiology' : 'image')}</span>
                                <div style="flex:1; min-width:0;">
                                    <div style="font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${al.titolo}</div>
                                    <div style="font-size:0.75rem; color:var(--md-on-surface-variant);">${formatDate(al.data_esame)} • ${(al.file_size / 1024).toFixed(0)} KB</div>
                                </div>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.4rem;">
                                <span class="ds-badge ds-badge-teal">${al.tipo.toUpperCase()}</span>
                                <div style="display:flex; gap:0.4rem;">
                                    <button class="ds-btn ds-btn-ghost ds-open-allegato" data-id="${al.id}" style="padding:0.35rem 0.6rem;"><span class="material-symbols-rounded" style="font-size:1rem;">visibility</span> Apri</button>
                                    <button class="ds-btn ds-btn-danger ds-del-allegato" data-id="${al.id}" style="padding:0.35rem 0.6rem;"><span class="material-symbols-rounded" style="font-size:1rem;">delete</span></button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        container.querySelector('#ds-upload-allegato').addEventListener('click', async () => {
            const tipo = prompt('Tipo esame (es: rx_endorale, opt, tac_cbct, rmn, referto_pdf):', 'tac_cbct') || 'rx';
            const titolo = prompt('Titolo esame:', 'TAC Cone Beam 3D') || 'Esame';
            const upRes = await callApi('allegati:upload', { paziente_id: pazienteId, tipo, titolo });
            if (upRes && upRes.success && typeof onUpdated === 'function') onUpdated();
        });

        container.querySelectorAll('.ds-open-allegato').forEach(b => {
            b.addEventListener('click', () => callApi('allegati:open', { id: b.dataset.id }));
        });

        container.querySelectorAll('.ds-del-allegato').forEach(b => {
            b.addEventListener('click', async () => {
                if (!confirm('Rimuovere questo allegato?')) return;
                await callApi('allegati:delete', { id: b.dataset.id });
                if (typeof onUpdated === 'function') onUpdated();
            });
        });
    } catch (e) {}
}
