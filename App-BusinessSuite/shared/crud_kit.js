import { toast } from '../js/utils.js';
import { TONI, heroHtml, guidaHtml, campoHtml, leggiCampo } from './ui_kit.js';

// Generic CRUD screen builder. config.api: { getAll, create, update, remove }
// -> tutte le risposte nel formato { success, data|error }.
export function renderCrudSubapp(el, config) {
    const {
        title, subtitle, icon, tone = 'blue', api, fields, newLabel = 'Nuovo', emptyLabel,
        cardTitle, cardSubtitle, cardMeta, cardBadge, instructions, modalHint, onCardClick,
        extraActionsHtml
    } = config;
    const toneObj = TONI[tone] || TONI.blue;
    el.innerHTML = `
        <div class="fade-in-up ak-root">
            ${heroHtml({
                title, subtitle, icon, tone,
                actionsHtml: `${extraActionsHtml || ''}<button id="crud-kit-btn-new" class="ak-hero-btn"><span class="material-symbols-rounded">add</span>${newLabel}</button>`
            })}
            ${instructions ? guidaHtml({ intro: instructions.intro, steps: instructions.steps, tone }) : ''}
            <section id="crud-kit-records" class="ak-panel">
                <div class="ak-toolbar">
                    <h3>Elenco <span class="ak-count" id="crud-kit-count">0</span></h3>
                </div>
                <div class="ak-panel-body" id="crud-kit-grid"></div>
            </section>
        </div>
        <div id="crud-kit-modal" class="ak-modal" style="--ak-accent:${toneObj.accent}; --ak-soft:${toneObj.soft};" role="dialog" aria-modal="true" aria-labelledby="crud-kit-modal-title">
            <div class="ak-modal-card">
                <div class="ak-modal-head">
                    <h3 id="crud-kit-modal-title"><span class="material-symbols-rounded">${icon || toneObj.icon}</span><span id="crud-kit-modal-title-text"></span></h3>
                    <button id="crud-kit-btn-close" class="ak-iconbtn" aria-label="Chiudi finestra"><span class="material-symbols-rounded">close</span></button>
                </div>
                <div class="ak-modal-body">
                    ${modalHint ? `<div class="ak-modal-hint"><span class="material-symbols-rounded">lightbulb</span><span>${modalHint}</span></div>` : ''}
                    <form id="crud-kit-form" class="ak-form">
                        <input type="hidden" id="crud-field-id">
                        <div id="crud-kit-form-fields" class="ak-form-grid"></div>
                        <div id="crud-kit-modal-error" class="ak-error" role="alert"></div>
                        <div class="ak-actions">
                            <button type="button" id="crud-kit-btn-cancel" class="ak-btn ak-btn-ghost">Annulla</button>
                            <button type="submit" id="crud-kit-btn-save" class="ak-btn ak-btn-primary"><span class="material-symbols-rounded">save</span>Salva</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    const grid = el.querySelector('#crud-kit-grid');
    const countEl = el.querySelector('#crud-kit-count');
    const modal = el.querySelector('#crud-kit-modal');
    const form = el.querySelector('#crud-kit-form');
    const modalError = el.querySelector('#crud-kit-modal-error');
    const formFieldsBox = el.querySelector('#crud-kit-form-fields');
    let records = [];
    formFieldsBox.innerHTML = fields.map(f => campoHtml(f, '')).join('');

    function renderRecords() {
        countEl.textContent = records.length;
        if (records.length === 0) {
            grid.innerHTML = `<div class="ak-empty">
                <span class="material-symbols-rounded">${icon || toneObj.icon}</span>
                <h4>Ancora niente qui</h4>
                <p>${emptyLabel || 'Nessun elemento registrato.'}</p>
            </div>`;
            return;
        }
        grid.innerHTML = `<div class="ak-cards">${records.map(r => `
            <div class="ak-card fade-in-up" style="--ak-accent:${toneObj.accent};" data-id="${r.id}">
                ${cardBadge && cardBadge(r) ? `<span class="ak-card-badge">${cardBadge(r)}</span>` : ''}
                <div class="ak-card-title">${cardTitle(r)}</div>
                ${cardSubtitle && cardSubtitle(r) ? `<div class="ak-card-sub">${cardSubtitle(r)}</div>` : ''}
                ${cardMeta && cardMeta(r) ? `<div class="ak-card-meta"><span class="material-symbols-rounded" style="font-size:1rem;">info</span>${cardMeta(r)}</div>` : ''}
                <div class="ak-card-actions">
                    <button class="ak-iconbtn crud-kit-btn-edit" data-id="${r.id}" title="Modifica" aria-label="Modifica"><span class="material-symbols-rounded">edit</span></button>
                    <button class="ak-iconbtn danger crud-kit-btn-delete" data-id="${r.id}" title="Elimina" aria-label="Elimina"><span class="material-symbols-rounded">delete</span></button>
                </div>
            </div>
        `).join('')}</div>`;
        if (onCardClick) {
            grid.querySelectorAll('.ak-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    if (e.target.closest('.ak-iconbtn')) return;
                    const record = records.find(r => r.id === card.getAttribute('data-id'));
                    if (record) onCardClick(record);
                });
            });
        }
        grid.querySelectorAll('.crud-kit-btn-edit').forEach(btn => {
            btn.addEventListener('click', () => {
                const record = records.find(r => r.id === btn.getAttribute('data-id'));
                if (record) openModal(record);
            });
        });
        grid.querySelectorAll('.crud-kit-btn-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('Sei sicuro di voler eliminare questo elemento? L\'operazione non è reversibile.')) return;
                try {
                    const res = await api.remove({ id: btn.getAttribute('data-id') });
                    if (!res || !res.success) throw new Error((res && res.error) || 'Eliminazione fallita');
                    toast('Eliminato con successo', 'success');
                    await loadRecords();
                } catch (e) {
                    toast(e.message || "Errore durante l'eliminazione", 'error');
                }
            });
        });
    }

    async function loadRecords() {
        try {
            const res = await api.getAll();
            records = (res && res.success && Array.isArray(res.data)) ? res.data : [];
            renderRecords();
        } catch (e) {
            grid.innerHTML = `<p style="color:var(--md-error); text-align:center; padding:2rem;">Errore caricamento: ${e.message}</p>`;
        }
    }

    function openModal(record = null) {
        modalError.style.display = 'none';
        el.querySelector('#crud-kit-modal-title-text').textContent = record ? 'Modifica' : newLabel;
        el.querySelector('#crud-field-id').value = record ? record.id : '';
        fields.forEach(f => {
            const input = el.querySelector(`#crud-field-${f.key}`);
            if (!input) return;
            const value = record ? record[f.key] : (f.default !== undefined ? f.default : '');
            if (f.type === 'checkbox') input.checked = !!value;
            else input.value = value === undefined || value === null ? '' : value;
        });
        modal.style.display = 'flex';
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
            modal.querySelector('.ak-modal-card').style.transform = 'scale(1) translateY(0)';
            const first = form.querySelector('input:not([type=hidden]), select, textarea');
            if (first) first.focus();
        });
    }
    function closeModal() {
        modal.style.opacity = '0';
        modal.querySelector('.ak-modal-card').style.transform = 'scale(0.95) translateY(10px)';
        setTimeout(() => { modal.style.display = 'none'; }, 250);
    }

    el.querySelector('#crud-kit-btn-new').addEventListener('click', () => openModal());
    el.querySelector('#crud-kit-btn-close').addEventListener('click', closeModal);
    el.querySelector('#crud-kit-btn-cancel').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.style.display === 'flex') closeModal(); });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        modalError.style.display = 'none';
        const btnSave = el.querySelector('#crud-kit-btn-save');
        btnSave.disabled = true;
        try {
            const id = el.querySelector('#crud-field-id').value;
            const data = {};
            fields.forEach(f => { data[f.key] = leggiCampo(el, f); });
            let res;
            if (id) {
                data.id = id;
                res = await api.update(data);
            } else {
                res = await api.create(data);
            }
            if (!res || !res.success) throw new Error((res && res.error) || 'Salvataggio fallito');
            toast('Salvato con successo', 'success');
            closeModal();
            await loadRecords();
        } catch (err) {
            modalError.textContent = err.message || 'Errore durante il salvataggio.';
            modalError.style.display = 'block';
        } finally {
            btnSave.disabled = false;
        }
    });

    loadRecords();
    return { reload: loadRecords };
}
