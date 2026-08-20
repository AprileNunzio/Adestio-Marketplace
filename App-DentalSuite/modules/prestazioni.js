import { callApi } from '../shared/api.js';
import { renderHero, formatCurrency, showNotification } from '../shared/ui_kit.js';

export default {
    render: async (el, onNavigate) => {
        try {
            el.innerHTML = '<div class="ds-root"><p style="text-align:center; padding:2rem;">Caricamento Nomenclatore Prestazioni...</p></div>';

            let currentBrancaFilter = 'all';
            let searchQuery = '';

            async function loadAndRender() {
                const res = await callApi('prestazioni:getAll');
                const allPrestazioni = (res && res.success) ? res.data : [];

                const filtered = allPrestazioni.filter(p => {
                    const matchBranca = currentBrancaFilter === 'all' || p.branca === currentBrancaFilter;
                    const q = searchQuery.toLowerCase();
                    const matchSearch = !searchQuery || p.nome.toLowerCase().includes(q) || (p.codice && p.codice.toLowerCase().includes(q));
                    return matchBranca && matchSearch;
                });

                el.innerHTML = `
                    <div class="ds-root fade-in-up">
                        ${renderHero({
                            title: 'Listino Prestazioni & Compensi Staff',
                            subtitle: 'Tariffario clinico, tempi poltrona, simulatore di marginalità e regole di compenso equipe.',
                            icon: 'list_alt',
                            actionsHtml: `<button class="ds-btn ds-btn-hero" id="ds-btn-new-prest"><span class="material-symbols-rounded">add_circle</span>Nuova Prestazione a Listino</button>`
                        })}

                        <div style="display:flex; justify-content:space-between; align-items:center; gap:1rem; flex-wrap:wrap; margin-bottom:0.5rem;">
                            <div class="ds-nav">
                                <button class="ds-nav-btn ${currentBrancaFilter === 'all' ? 'active' : ''}" data-branca="all">Tutte (${allPrestazioni.length})</button>
                                <button class="ds-nav-btn ${currentBrancaFilter === 'igiene' ? 'active' : ''}" data-branca="igiene">Igiene</button>
                                <button class="ds-nav-btn ${currentBrancaFilter === 'conservativa' ? 'active' : ''}" data-branca="conservativa">Conservativa</button>
                                <button class="ds-nav-btn ${currentBrancaFilter === 'endodonzia' ? 'active' : ''}" data-branca="endodonzia">Endodonzia</button>
                                <button class="ds-nav-btn ${currentBrancaFilter === 'chirurgia' ? 'active' : ''}" data-branca="chirurgia">Chirurgia</button>
                                <button class="ds-nav-btn ${currentBrancaFilter === 'implantologia' ? 'active' : ''}" data-branca="implantologia">Implantologia</button>
                                <button class="ds-nav-btn ${currentBrancaFilter === 'protesi' ? 'active' : ''}" data-branca="protesi">Protesi</button>
                                <button class="ds-nav-btn ${currentBrancaFilter === 'ortodonzia' ? 'active' : ''}" data-branca="ortodonzia">Ortodonzia</button>
                            </div>

                            <div style="display:flex; gap:0.6rem; align-items:center;">
                                <input type="text" id="ds-prest-search" class="ds-input" placeholder="Cerca prestazione o codice..." value="${searchQuery}" style="width:260px;">
                            </div>
                        </div>

                        <div class="ds-panel">
                            <div class="ds-panel-header">
                                <div class="ds-panel-title"><span class="material-symbols-rounded" style="color:var(--ds-teal);">category</span>Catalogo Trattamenti & Tariffe</div>
                                <span class="ds-badge ds-badge-teal">${filtered.length} Prestazioni Visualizzate</span>
                            </div>

                            <div class="ds-table-wrap">
                                <table class="ds-table">
                                    <thead>
                                        <tr>
                                            <th>Branca</th>
                                            <th>Codice & Nome Prestazione</th>
                                            <th>Durata & Sedute</th>
                                            <th>Tariffa Paziente</th>
                                            <th>Quota Medico</th>
                                            <th>Quota Staff</th>
                                            <th>Costo Materiali</th>
                                            <th>Margine Studio</th>
                                            <th style="text-align:right;">Azioni</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${filtered.length === 0 ? '<tr><td colspan="9" style="text-align:center; padding:1.8rem; color:var(--md-on-surface-variant);">Nessuna prestazione trovata con i filtri selezionati.</td></tr>' : filtered.map(p => {
                                            const prezzo = Number(p.prezzo_paziente) || 0;
                                            const cmat = Number(p.costo_materiale_stimato) || 0;
                                            const qMedVal = Number(p.valore_quota_medico) || 0;
                                            const qMed = p.tipo_quota_medico === 'percentuale' ? (prezzo * qMedVal / 100) : (p.tipo_quota_medico === 'margine' ? ((prezzo - cmat) * qMedVal / 100) : qMedVal);
                                            const qSegVal = Number(p.valore_quota_segretaria) || 0;
                                            const qSeg = p.tipo_quota_segretaria === 'percentuale' ? (prezzo * qSegVal / 100) : (p.tipo_quota_segretaria === 'nessuno' ? 0 : qSegVal);
                                            const margineStudio = Math.max(0, prezzo - cmat - qMed - qSeg);

                                            return `
                                                <tr>
                                                    <td><span class="ds-badge ds-badge-teal">${(p.branca || 'generale').toUpperCase()}</span></td>
                                                    <td>
                                                        ${p.codice ? `<span class="ds-badge ds-badge-blue" style="font-size:0.68rem; margin-right:0.3rem;">${p.codice}</span>` : ''}
                                                        <strong>${p.nome}</strong>
                                                        ${p.descrizione ? `<br><small style="color:var(--md-on-surface-variant);">${p.descrizione}</small>` : ''}
                                                    </td>
                                                    <td>
                                                        ${p.durata_minuti} min
                                                        ${p.num_sedute > 1 ? `<br><small style="color:var(--ds-purple);">(${p.num_sedute} sedute)</small>` : ''}
                                                    </td>
                                                    <td style="font-weight:800; color:var(--md-on-surface); font-size:0.95rem;">${formatCurrency(prezzo)}</td>
                                                    <td><span class="ds-badge ds-badge-blue">${p.tipo_quota_medico === 'percentuale' ? p.valore_quota_medico + '%' : formatCurrency(p.valore_quota_medico)}</span></td>
                                                    <td><span class="ds-badge ds-badge-purple">${p.tipo_quota_segretaria === 'percentuale' ? p.valore_quota_segretaria + '%' : (p.tipo_quota_segretaria === 'nessuno' ? 'Zero' : formatCurrency(p.valore_quota_segretaria))}</span></td>
                                                    <td style="color:var(--md-on-surface-variant);">${formatCurrency(cmat)}</td>
                                                    <td style="font-weight:800; color:var(--ds-green);">${formatCurrency(margineStudio)}</td>
                                                    <td style="text-align:right;">
                                                        <button class="ds-btn ds-btn-ghost ds-edit-prest" data-id="${p.id}" style="padding:0.35rem 0.6rem;"><span class="material-symbols-rounded" style="font-size:1rem;">edit</span></button>
                                                        <button class="ds-btn ds-btn-danger ds-del-prest" data-id="${p.id}" style="padding:0.35rem 0.6rem;"><span class="material-symbols-rounded" style="font-size:1rem;">delete</span></button>
                                                    </td>
                                                </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                `;

                el.querySelectorAll('.ds-nav-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        currentBrancaFilter = btn.dataset.branca;
                        loadAndRender();
                    });
                });

                const searchInp = el.querySelector('#ds-prest-search');
                if (searchInp) {
                    searchInp.addEventListener('input', (e) => {
                        searchQuery = e.target.value;
                        loadAndRender();
                    });
                }

                el.querySelector('#ds-btn-new-prest')?.addEventListener('click', () => {
                    if (onNavigate) onNavigate('prestazione_editor');
                });

                el.querySelectorAll('.ds-edit-prest').forEach(b => {
                    b.addEventListener('click', () => {
                        if (onNavigate) onNavigate('prestazione_editor', { prestazioneId: b.dataset.id });
                    });
                });

                el.querySelectorAll('.ds-del-prest').forEach(b => {
                    b.addEventListener('click', async () => {
                        const res = await callApi('prestazioni:remove', { id: b.dataset.id });
                        if (res && res.success) {
                            showNotification('Prestazione rimossa dal listino', 'info');
                            loadAndRender();
                        }
                    });
                });
            }

            await loadAndRender();

        } catch (e) {
            el.innerHTML = `<div class="ds-root"><p style="color:var(--md-error);">Errore: ${e.message}</p></div>`;
        }
    }
};
