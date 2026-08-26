// Kit UI condiviso di Adestio Business Suite. Gli stili (.ak-*) vivono in
// css/style.css (fonte unica, caricata una sola volta dall'host); questo
// modulo produce solo markup, nessun <style> inline per schermata.
export const TONI = {
    blue:   { grad: 'linear-gradient(135deg, #2563eb 0%, #4338ca 100%)', accent: '#2563eb', soft: 'rgba(37,99,235,0.10)',  icon: 'business_center' },
    green:  { grad: 'linear-gradient(135deg, #059669 0%, #047857 100%)', accent: '#059669', soft: 'rgba(5,150,105,0.10)',  icon: 'payments' },
    orange: { grad: 'linear-gradient(135deg, #c2410c 0%, #9a3412 100%)', accent: '#c2410c', soft: 'rgba(194,65,12,0.10)',  icon: 'local_shipping' },
    violet: { grad: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', accent: '#7c3aed', soft: 'rgba(124,58,237,0.10)', icon: 'groups' },
    teal:   { grad: 'linear-gradient(135deg, #0f766e 0%, #0e7490 100%)', accent: '#0f766e', soft: 'rgba(15,118,110,0.10)', icon: 'inventory_2' }
};
function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export function heroHtml(o) {
    const tone = TONI[o.tone] || TONI.blue;
    const icon = o.icon || tone.icon;
    return `
        <header class="ak-hero" role="banner" style="--ak-grad:${tone.grad};">
            <div class="ak-hero-glow ak-hero-glow-a"></div>
            <div class="ak-hero-glow ak-hero-glow-b"></div>
            <div class="ak-hero-left">
                <div class="ak-hero-chip" aria-hidden="true">
                    <span class="material-symbols-rounded">${esc(icon)}</span>
                </div>
                <div>
                    <h1 class="ak-hero-title">${esc(o.title)}</h1>
                    <p class="ak-hero-sub">${esc(o.subtitle || '')}</p>
                </div>
            </div>
            <div class="ak-hero-actions">${o.actionsHtml || ''}</div>
        </header>
    `;
}
export function guidaHtml(o) {
    const tone = TONI[o.tone] || TONI.blue;
    const steps = (o.steps || []).map((s, i) => `
        <li class="ak-guide-step"><span class="ak-guide-num" aria-hidden="true">${i + 1}</span><span>${s}</span></li>
    `).join('');
    return `
        <details class="ak-guide" style="--ak-accent:${tone.accent}; --ak-soft:${tone.soft};">
            <summary class="ak-guide-summary">
                <span class="material-symbols-rounded" aria-hidden="true">help</span>
                <span class="ak-guide-summary-text">Come funziona questa sezione</span>
                <span class="material-symbols-rounded ak-guide-caret" aria-hidden="true">expand_more</span>
            </summary>
            <div class="ak-guide-body">
                ${o.intro ? `<p class="ak-guide-intro">${o.intro}</p>` : ''}
                ${steps ? `<ol class="ak-guide-steps">${steps}</ol>` : ''}
            </div>
        </details>
    `;
}
export function campoHtml(field, value, idPrefix = 'crud-field-') {
    const id = `${idPrefix}${field.key}`;
    const val = value === undefined || value === null ? '' : value;
    let spanStyle = '';
    if (field.full) spanStyle = 'grid-column:1/-1;';
    else if (field.span) spanStyle = `grid-column:span ${field.span};`;
    const flex = spanStyle ? `style="${spanStyle}"` : '';
    const req = field.required ? '<span class="ak-req" title="Campo obbligatorio" aria-hidden="true">*</span>' : '';
    const hint = field.hint ? `<small class="ak-hint" id="${id}-hint">${esc(field.hint)}</small>` : '';
    const describedBy = field.hint ? `aria-describedby="${id}-hint"` : '';
    if (field.type === 'checkbox') {
        return `
            <label class="ak-check" ${flex} for="${id}">
                <input type="checkbox" id="${id}" ${val ? 'checked' : ''}>
                <span class="ak-check-box" aria-hidden="true"><span class="material-symbols-rounded">check</span></span>
                <span class="ak-check-text">${esc(field.label)}${field.hint ? `<small class="ak-hint" style="display:block;">${esc(field.hint)}</small>` : ''}</span>
            </label>
        `;
    }
    const labelRow = `<label class="ak-flabel" for="${id}">${esc(field.label)}${req}</label>`;
    if (field.type === 'select') {
        const options = (field.options || []).map(op =>
            `<option value="${esc(op.value)}" ${String(op.value) === String(val) ? 'selected' : ''}>${esc(op.label)}</option>`).join('');
        return `
            <div class="ak-field" ${flex}>
                ${labelRow}
                <div class="ak-inputbox">
                    <span class="material-symbols-rounded ak-ficon" aria-hidden="true">${esc(field.icon || 'edit_note')}</span>
                    <select id="${id}" class="ak-input" ${field.required ? 'required' : ''} ${describedBy}>
                        <option value="" ${!val ? 'selected' : ''} disabled hidden>Seleziona…</option>
                        ${options}
                    </select>
                    <span class="material-symbols-rounded ak-fcaret" aria-hidden="true">unfold_more</span>
                </div>
                ${hint}
            </div>
        `;
    }
    if (field.type === 'textarea') {
        return `
            <div class="ak-field" ${flex}>
                ${labelRow}
                <div class="ak-inputbox">
                    <span class="material-symbols-rounded ak-ficon ak-ficon-top" aria-hidden="true">${esc(field.icon || 'notes')}</span>
                    <textarea id="${id}" class="ak-input ak-textarea" rows="3" placeholder="${esc(field.placeholder || '')}" ${describedBy}>${esc(val)}</textarea>
                </div>
                ${hint}
            </div>
        `;
    }
    const inputType = field.type === 'date' ? 'date' : (field.type || 'text');
    const step = field.type === 'number' ? `step="${field.step || 'any'}"` : '';
    const upper = field.uppercase ? 'style="text-transform:uppercase;"' : '';
    const readonly = field.readonly ? 'disabled' : '';
    return `
        <div class="ak-field" ${flex}>
            ${labelRow}
            <div class="ak-inputbox">
                <span class="material-symbols-rounded ak-ficon" aria-hidden="true">${esc(field.icon || 'edit_note')}</span>
                <input type="${inputType}" id="${id}" class="ak-input" placeholder="${esc(field.placeholder || '')}" value="${esc(val)}" ${field.required ? 'required' : ''} ${step} ${describedBy} ${upper} ${readonly}>
            </div>
            ${hint}
        </div>
    `;
}
export function leggiCampo(el, field, idPrefix = 'crud-field-') {
    const input = el.querySelector(`#${idPrefix}${field.key}`);
    if (!input) return '';
    if (field.type === 'checkbox') return input.checked ? 1 : 0;
    if (field.type === 'number') return input.value === '' ? 0 : Number(input.value);
    let v = input.value;
    if (field.uppercase && typeof v === 'string') v = v.toUpperCase();
    return v;
}
