import { callApi } from '../shared/api.js';
import { renderHero } from '../shared/ui_kit.js';
import { openPoltronaModal, openSalaModal, openSedeModal } from '../components/struttura_modals.js';

export default {
    render: async (el, onNavigate) => {
        try {
            el.innerHTML = '<div class="ds-root"><p style="text-align:center; padding:2rem;">Caricamento Struttura Studio Odontoiatrico...</p></div>';

            let currentSubTab = 'poltrone';
            let allSedi = [];
            let allSale = [];
            let allPoltrone = [];
            let allStaff = [];

            async function loadData() {
                try {
                    const [struttRes, staffRes] = await Promise.all([
                        callApi('struttura:getAll'),
                        callApi('staff:getAll')
                    ]);
                    if (struttRes && struttRes.success && struttRes.data) {
                        allSedi = struttRes.data.sedi || [];
                        allSale = struttRes.data.sale || [];
                        allPoltrone = struttRes.data.poltrone || [];
                    }
                    if (staffRes && staffRes.success) {
                        allStaff = staffRes.data || [];
                    }
                } catch (e) {}
            }

            await loadData();

            function renderMain() {
                try {
                    el.innerHTML = `
                        <div class="ds-root fade-in-up">
                            ${renderHero({
                                title: 'Sedi, Sale Operative & Poltrone',
                                subtitle: 'Configura le sedi dello studio, gli ambulatori e assegna i medici specialisti alle poltrone di default.',
                                icon: 'domain',
                                theme: 'cyan',
                                actionsHtml: `
                                    <button class="ds-btn ds-btn-hero" id="ds-btn-add-struttura"><span class="material-symbols-rounded">add_circle</span>Nuova Unità / Sala / Sede</button>
                                `
                            })}

                            <div style="display:flex; justify-content:space-between; align-items:center; gap:1rem; flex-wrap:wrap; margin-bottom:1rem;">
                                <div class="ds-nav">
                                    <button class="ds-nav-btn ${currentSubTab === 'poltrone' ? 'active' : ''}" data-subtab="poltrone"><span class="material-symbols-rounded">chair</span>Poltrone Odontoiatriche (${allPoltrone.length})</button>
                                    <button class="ds-nav-btn ${currentSubTab === 'sale' ? 'active' : ''}" data-subtab="sale"><span class="material-symbols-rounded">meeting_room</span>Sale & Ambulatori (${allSale.length})</button>
                                    <button class="ds-nav-btn ${currentSubTab === 'sedi' ? 'active' : ''}" data-subtab="sedi"><span class="material-symbols-rounded">apartment</span>Sedi & Cliniche (${allSedi.length})</button>
                                </div>
                            </div>

                            <div id="ds-struttura-outlet"></div>
                        </div>
                    `;

                    el.querySelectorAll('.ds-nav-btn').forEach(btn => {
                        btn.addEventListener('click', () => {
                            el.querySelectorAll('.ds-nav-btn').forEach(b => b.classList.remove('active'));
                            btn.classList.add('active');
                            currentSubTab = btn.dataset.subtab;
                            renderSubSection();
                        });
                    });

                    const btnAdd = el.querySelector('#ds-btn-add-struttura');
                    if (btnAdd) {
                        btnAdd.addEventListener('click', () => {
                            if (currentSubTab === 'sedi') openSedeModal({ onSaved: async () => { await loadData(); renderSubSection(); } });
                            else if (currentSubTab === 'sale') openSalaModal({ allSedi, onSaved: async () => { await loadData(); renderSubSection(); } });
                            else openPoltronaModal({ allSedi, allSale, allStaff, onSaved: async () => { await loadData(); renderSubSection(); } });
                        });
                    }

                    renderSubSection();
                } catch (e) {}
            }

            function renderSubSection() {
                try {
                    const outlet = el.querySelector('#ds-struttura-outlet');
                    if (!outlet) return;

                    if (currentSubTab === 'poltrone') {
                        outlet.innerHTML = `
                            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:1.2rem;">
                                ${allPoltrone.length === 0 ? '<div class="ds-panel" style="text-align:center; padding:2rem; grid-column:1/-1;">Nessuna poltrona configurata.</div>' : allPoltrone.map(pol => {
                                    const sede = allSedi.find(s => s.id === pol.sede_id);
                                    const sala = allSale.find(s => s.id === pol.sala_id);
                                    const medicoDef = allStaff.find(m => m.id === pol.medico_default_id);
                                    const assistenteDef = allStaff.find(m => m.id === pol.assistente_default_id);

                                    return `
                                        <div class="ds-panel" style="border-left: 6px solid ${pol.colore_agenda || '#0d9488'}; position:relative;">
                                            <div class="ds-panel-header">
                                                <div class="ds-panel-title">
                                                    <span class="material-symbols-rounded" style="color:${pol.colore_agenda || '#0d9488'};">chair</span>
                                                    ${pol.nome}
                                                </div>
                                                <span class="ds-badge ds-badge-teal">${pol.stato === 'attiva' ? 'Operativa' : 'In Manutenzione'}</span>
                                            </div>

                                            <div style="font-size:0.86rem; display:flex; flex-direction:column; gap:0.45rem; color:var(--md-on-surface-variant); margin-bottom:1rem;">
                                                <div><strong>Sede:</strong> ${sede ? sede.nome : 'Sede Principale'}</div>
                                                <div><strong>Sala Operativa:</strong> ${sala ? sala.nome : 'Non assegnata'}</div>
                                                <div><strong>Modello:</strong> ${pol.marca_modello || '-'} ${pol.matricola ? '(Matr: ' + pol.matricola + ')' : ''}</div>
                                                <div style="margin-top:0.4rem; padding:0.5rem 0.7rem; background:var(--md-surface-container-low); border-radius:8px;">
                                                    <div style="color:var(--md-on-surface); font-weight:700;">👨‍⚕️ Medico di Default:</div>
                                                    <div style="color:var(--ds-teal); font-weight:800;">${medicoDef ? 'Dr. ' + medicoDef.cognome + ' ' + medicoDef.nome : 'Nessuno (Selezionabile libero)'}</div>
                                                </div>
                                                ${assistenteDef ? `<div style="font-size:0.8rem;">👩‍⚕️ Assistente: ${assistenteDef.cognome} ${assistenteDef.nome}</div>` : ''}
                                            </div>

                                            <div style="display:flex; justify-content:flex-end; gap:0.6rem;">
                                                <button class="ds-btn ds-btn-ghost ds-edit-pol-btn" data-id="${pol.id}" style="padding:0.35rem 0.8rem; font-size:0.8rem;"><span class="material-symbols-rounded">edit</span> Modifica</button>
                                                <button class="ds-btn ds-btn-danger ds-del-pol-btn" data-id="${pol.id}" style="padding:0.35rem 0.6rem;"><span class="material-symbols-rounded">delete</span></button>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        `;

                        outlet.querySelectorAll('.ds-edit-pol-btn').forEach(b => {
                            b.addEventListener('click', () => {
                                const target = allPoltrone.find(p => p.id === b.dataset.id);
                                if (target) openPoltronaModal({ poltrona: target, allSedi, allSale, allStaff, onSaved: async () => { await loadData(); renderSubSection(); } });
                            });
                        });
                        outlet.querySelectorAll('.ds-del-pol-btn').forEach(b => {
                            b.addEventListener('click', async () => {
                                if (!confirm('Eliminare questa poltrona?')) return;
                                await callApi('struttura:removePoltrona', { id: b.dataset.id });
                                await loadData();
                                renderSubSection();
                            });
                        });

                    } else if (currentSubTab === 'sale') {
                        outlet.innerHTML = `
                            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:1.2rem;">
                                ${allSale.length === 0 ? '<div class="ds-panel" style="text-align:center; padding:2rem; grid-column:1/-1;">Nessuna sala configurata.</div>' : allSale.map(sala => {
                                    const sede = allSedi.find(s => s.id === sala.sede_id);
                                    const poltroneInSala = allPoltrone.filter(p => p.sala_id === sala.id);

                                    return `
                                        <div class="ds-panel" style="border-left: 6px solid ${sala.colore || '#2563eb'};">
                                            <div class="ds-panel-header">
                                                <div class="ds-panel-title">
                                                    <span class="material-symbols-rounded" style="color:${sala.colore || '#2563eb'};">meeting_room</span>
                                                    ${sala.nome}
                                                </div>
                                                <span class="ds-badge ds-badge-blue">${sala.tipo_sala.toUpperCase()}</span>
                                            </div>
                                            <div style="font-size:0.86rem; display:flex; flex-direction:column; gap:0.4rem; color:var(--md-on-surface-variant); margin-bottom:1rem;">
                                                <div><strong>Sede:</strong> ${sede ? sede.nome : 'Sede Principale'}</div>
                                                <div><strong>Piano / Stanza:</strong> ${sala.piano || '-'} ${sala.codice_stanza ? '(' + sala.codice_stanza + ')' : ''}</div>
                                                <div><strong>Poltrone collegate:</strong> ${poltroneInSala.length} unità</div>
                                                ${sala.dotazioni ? `<div style="font-size:0.8rem; margin-top:0.3rem;"><strong>Dotazioni:</strong> ${sala.dotazioni}</div>` : ''}
                                            </div>
                                            <div style="display:flex; justify-content:flex-end; gap:0.6rem;">
                                                <button class="ds-btn ds-btn-ghost ds-edit-sala-btn" data-id="${sala.id}" style="padding:0.35rem 0.8rem; font-size:0.8rem;"><span class="material-symbols-rounded">edit</span> Modifica</button>
                                                <button class="ds-btn ds-btn-danger ds-del-sala-btn" data-id="${sala.id}" style="padding:0.35rem 0.6rem;"><span class="material-symbols-rounded">delete</span></button>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        `;

                        outlet.querySelectorAll('.ds-edit-sala-btn').forEach(b => {
                            b.addEventListener('click', () => {
                                const target = allSale.find(s => s.id === b.dataset.id);
                                if (target) openSalaModal({ sala: target, allSedi, onSaved: async () => { await loadData(); renderSubSection(); } });
                            });
                        });
                        outlet.querySelectorAll('.ds-del-sala-btn').forEach(b => {
                            b.addEventListener('click', async () => {
                                if (!confirm('Eliminare questa sala operativa?')) return;
                                await callApi('struttura:removeSala', { id: b.dataset.id });
                                await loadData();
                                renderSubSection();
                            });
                        });

                    } else if (currentSubTab === 'sedi') {
                        outlet.innerHTML = `
                            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:1.2rem;">
                                ${allSedi.map(sede => {
                                    const saleCount = allSale.filter(s => s.sede_id === sede.id).length;
                                    const polCount = allPoltrone.filter(p => p.sede_id === sede.id).length;

                                    return `
                                        <div class="ds-panel">
                                            <div class="ds-panel-header">
                                                <div class="ds-panel-title">
                                                    <span class="material-symbols-rounded" style="color:var(--ds-teal);">apartment</span>
                                                    ${sede.nome}
                                                </div>
                                                ${sede.is_principale ? '<span class="ds-badge ds-badge-teal">Sede Principale</span>' : ''}
                                            </div>
                                            <div style="font-size:0.86rem; display:flex; flex-direction:column; gap:0.4rem; color:var(--md-on-surface-variant); margin-bottom:1rem;">
                                                <div><strong>Indirizzo:</strong> ${sede.indirizzo || '-'}, ${sede.citta || ''} (${sede.provincia || ''})</div>
                                                <div><strong>Recapiti:</strong> ${sede.telefono || '-'} • ${sede.email || '-'}</div>
                                                <div><strong>Direttore Sanitario:</strong> ${sede.direttore_sanitario || '-'}</div>
                                                <div style="display:flex; gap:0.8rem; margin-top:0.4rem;">
                                                    <span class="ds-badge ds-badge-blue">${saleCount} Sale</span>
                                                    <span class="ds-badge ds-badge-teal">${polCount} Poltrone</span>
                                                </div>
                                            </div>
                                            <div style="display:flex; justify-content:flex-end; gap:0.6rem;">
                                                <button class="ds-btn ds-btn-ghost ds-edit-sede-btn" data-id="${sede.id}" style="padding:0.35rem 0.8rem; font-size:0.8rem;"><span class="material-symbols-rounded">edit</span> Modifica</button>
                                                ${!sede.is_principale ? `<button class="ds-btn ds-btn-danger ds-del-sede-btn" data-id="${sede.id}" style="padding:0.35rem 0.6rem;"><span class="material-symbols-rounded">delete</span></button>` : ''}
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        `;

                        outlet.querySelectorAll('.ds-edit-sede-btn').forEach(b => {
                            b.addEventListener('click', () => {
                                const target = allSedi.find(s => s.id === b.dataset.id);
                                if (target) openSedeModal({ sede: target, onSaved: async () => { await loadData(); renderSubSection(); } });
                            });
                        });
                        outlet.querySelectorAll('.ds-del-sede-btn').forEach(b => {
                            b.addEventListener('click', async () => {
                                if (!confirm('Eliminare questa sede?')) return;
                                await callApi('struttura:removeSede', { id: b.dataset.id });
                                await loadData();
                                renderSubSection();
                            });
                        });
                    }
                } catch (e) {}
            }

            renderMain();

        } catch (e) {
            el.innerHTML = `<div class="ds-root"><p style="color:var(--md-error);">Errore: ${e.message}</p></div>`;
        }
    }
};
