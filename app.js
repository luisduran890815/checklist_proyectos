/* Bitácora de proyectos — aplicación sin dependencias de frontend */
(() => {
  'use strict';

  const CONFIG = window.APP_CONFIG || {};
  const DEMO = CONFIG.DEMO_MODE !== false || !CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY;
  const DEMO_KEY = 'bitacora-proyectos-demo-v1';
  const SESSION_KEY = 'bitacora-proyectos-session-v1';
  const DATE_FORMAT = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = (value = '') => String(value).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const isoDate = (date = new Date()) => date.toISOString().slice(0, 10);
  const formatDate = value => value ? DATE_FORMAT.format(new Date(`${value}T12:00:00`)) : '—';
  const daysAgo = value => Math.max(0, Math.floor((new Date().setHours(0,0,0,0) - new Date(`${value}T00:00:00`).getTime()) / 86400000));

  const demoSeed = () => {
    const p1 = uid(), p2 = uid(), a1 = uid(), a2 = uid();
    return {
      projects: [
        { id: p1, name: 'Rehabilitación', code: 'PRY-001', description: 'Adecuación y puesta a punto de espacios asistenciales.', status: 'active', created_at: '2026-09-05T10:00:00Z', updated_at: '2026-09-29T14:00:00Z' },
        { id: p2, name: 'Sistema de AA Farmacia', code: 'PRY-002', description: 'Suministro, documentación e instalación del sistema de aire acondicionado.', status: 'active', created_at: '2026-09-12T10:00:00Z', updated_at: '2026-09-30T16:00:00Z' }
      ],
      areas: [
        { id: a1, project_id: p1, name: 'Consultorio 1', description: 'Obra blanca, dotación y seguridad.', sort_order: 1 },
        { id: a2, project_id: p2, name: 'Sala de espera', description: 'Gestión contractual y documentación técnica.', sort_order: 1 }
      ],
      items: [
        { id: uid(), project_id: p1, area_id: a1, identified_on: '2026-09-08', description: 'Pintar', status: 'ok', observations: 'Pintura lavable aplicada y recibida.', solped: '', purchase_order: '' },
        { id: uid(), project_id: p1, area_id: a1, identified_on: '2026-09-09', description: 'Señalización', status: 'pending', observations: 'Validar ubicación con SST.', solped: '45001231', purchase_order: '' },
        { id: uid(), project_id: p1, area_id: a1, identified_on: '2026-09-10', description: 'Camilla', status: 'pending', observations: 'Pendiente recepción del proveedor.', solped: '45001244', purchase_order: 'OC-7800341' },
        { id: uid(), project_id: p1, area_id: a1, identified_on: '2026-09-11', description: 'Caneca', status: 'ok', observations: 'Instalada.', solped: '45001250', purchase_order: 'OC-7800358' },
        { id: uid(), project_id: p1, area_id: a1, identified_on: '2026-09-11', description: 'Dispensadores de papel', status: 'pending', observations: 'Definir cantidad final.', solped: '', purchase_order: '' },
        { id: uid(), project_id: p1, area_id: a1, identified_on: '2026-09-15', description: 'Botón de emergencia', status: 'pending', observations: 'Requiere visita del contratista eléctrico.', solped: '', purchase_order: '' },
        { id: uid(), project_id: p2, area_id: a2, identified_on: '2026-09-14', description: 'Contrato Daikin', status: 'ok', observations: 'Contrato formalizado.', solped: '45001302', purchase_order: 'OC-7800402' },
        { id: uid(), project_id: p2, area_id: a2, identified_on: '2026-09-16', description: 'Cronograma Daikin', status: 'ok', observations: 'Cronograma aprobado por interventoría.', solped: '', purchase_order: '' },
        { id: uid(), project_id: p2, area_id: a2, identified_on: '2026-09-18', description: 'Fichas técnicas de equipos', status: 'pending', observations: 'Pendiente versión final del proveedor.', solped: '', purchase_order: '' },
        { id: uid(), project_id: p2, area_id: a2, identified_on: '2026-09-20', description: 'Unifilar', status: 'pending', observations: 'En revisión por ingeniería.', solped: '', purchase_order: '' }
      ]
    };
  };

  const state = {
    data: { projects: [], areas: [], items: [] },
    session: null,
    view: 'dashboard',
    filters: { search: '', project: 'all', status: 'all', purchase: 'all' },
    editing: null,
    pendingDelete: null
  };

  class DemoService {
    async init() {
      const saved = localStorage.getItem(DEMO_KEY);
      state.data = saved ? JSON.parse(saved) : demoSeed();
      this.persist();
    }
    persist() { localStorage.setItem(DEMO_KEY, JSON.stringify(state.data)); }
    async create(table, record) {
      const row = { ...record, id: uid(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      state.data[table].push(row); this.persist(); return row;
    }
    async update(table, id, changes) {
      const index = state.data[table].findIndex(x => x.id === id);
      if (index < 0) throw new Error('Registro no encontrado.');
      state.data[table][index] = { ...state.data[table][index], ...changes, updated_at: new Date().toISOString() };
      this.persist(); return state.data[table][index];
    }
    async remove(table, id) {
      if (table === 'projects') {
        const areaIds = state.data.areas.filter(x => x.project_id === id).map(x => x.id);
        state.data.items = state.data.items.filter(x => x.project_id !== id && !areaIds.includes(x.area_id));
        state.data.areas = state.data.areas.filter(x => x.project_id !== id);
      }
      if (table === 'areas') state.data.items = state.data.items.filter(x => x.area_id !== id);
      state.data[table] = state.data[table].filter(x => x.id !== id);
      this.persist();
    }
    async reset() { state.data = demoSeed(); this.persist(); }
  }

  class SupabaseService {
    constructor() {
      this.base = CONFIG.SUPABASE_URL.replace(/\/$/, '');
      this.key = CONFIG.SUPABASE_ANON_KEY;
    }
    headers(prefer) {
      const headers = { apikey: this.key, Authorization: `Bearer ${state.session?.access_token || this.key}`, 'Content-Type': 'application/json' };
      if (prefer) headers.Prefer = prefer;
      return headers;
    }
    async request(path, options = {}) {
      const response = await fetch(`${this.base}${path}`, { ...options, headers: { ...this.headers(options.prefer), ...(options.headers || {}) } });
      const text = await response.text();
      const payload = text ? JSON.parse(text) : null;
      if (!response.ok) throw new Error(payload?.msg || payload?.message || payload?.error_description || 'No fue posible completar la operación.');
      return payload;
    }
    async signIn(email, password) {
      const session = await this.request('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) });
      this.saveSession(session); return session;
    }
    async signUp(email, password) {
      const result = await this.request('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email, password }) });
      if (result.access_token) this.saveSession(result);
      return result;
    }
    saveSession(session) { state.session = session; localStorage.setItem(SESSION_KEY, JSON.stringify(session)); }
    clearSession() { state.session = null; localStorage.removeItem(SESSION_KEY); }
    async restoreSession() {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return false;
      const saved = JSON.parse(raw);
      if (saved.expires_at && saved.expires_at * 1000 > Date.now() + 60000) { state.session = saved; return true; }
      if (!saved.refresh_token) return false;
      try {
        const refreshed = await this.request('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: saved.refresh_token }) });
        this.saveSession(refreshed); return true;
      } catch (_) { this.clearSession(); return false; }
    }
    async init() {
      const [projects, areas, items] = await Promise.all([
        this.request('/rest/v1/projects?select=*&order=created_at.asc'),
        this.request('/rest/v1/areas?select=*&order=sort_order.asc,created_at.asc'),
        this.request('/rest/v1/checklist_items?select=*&order=identified_on.asc,created_at.asc')
      ]);
      state.data = { projects, areas, items };
    }
    async create(table, record) {
      const dbTable = table === 'items' ? 'checklist_items' : table;
      const rows = await this.request(`/rest/v1/${dbTable}`, { method: 'POST', prefer: 'return=representation', body: JSON.stringify({ ...record, user_id: state.session.user.id }) });
      const row = rows[0]; state.data[table].push(row); return row;
    }
    async update(table, id, changes) {
      const dbTable = table === 'items' ? 'checklist_items' : table;
      const rows = await this.request(`/rest/v1/${dbTable}?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', prefer: 'return=representation', body: JSON.stringify(changes) });
      const index = state.data[table].findIndex(x => x.id === id);
      state.data[table][index] = rows[0]; return rows[0];
    }
    async remove(table, id) {
      const dbTable = table === 'items' ? 'checklist_items' : table;
      await this.request(`/rest/v1/${dbTable}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', prefer: 'return=minimal' });
      if (table === 'projects') {
        state.data.areas = state.data.areas.filter(x => x.project_id !== id);
        state.data.items = state.data.items.filter(x => x.project_id !== id);
      }
      if (table === 'areas') state.data.items = state.data.items.filter(x => x.area_id !== id);
      state.data[table] = state.data[table].filter(x => x.id !== id);
    }
  }

  const service = DEMO ? new DemoService() : new SupabaseService();

  function toast(message, type = 'success') {
    const el = document.createElement('div');
    el.className = `toast${type === 'error' ? ' toast--error' : ''}`;
    el.textContent = message;
    $('#toast-region').appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }

  function projectStats(projectId) {
    const items = state.data.items.filter(i => i.project_id === projectId);
    const ok = items.filter(i => i.status === 'ok').length;
    return { total: items.length, ok, pending: items.length - ok, percent: items.length ? Math.round(ok / items.length * 100) : 0 };
  }

  function renderApp() {
    renderHeader();
    renderProjectFilter();
    renderDashboard();
    renderProjects();
  }

  function renderHeader() {
    const now = new Date();
    $('#today-label').textContent = `Actualizado · ${DATE_FORMAT.format(now)}`;
    $('#storage-label').textContent = DEMO ? 'Modo demostración' : 'Conectado a Supabase';
    $('#storage-detail').textContent = DEMO ? 'Datos guardados en este navegador' : 'Sincronización en la nube';
    const email = DEMO ? 'Sin conexión' : (state.session?.user?.email || 'Usuario');
    $('#user-name').textContent = DEMO ? 'Demostración' : email.split('@')[0];
    $('#user-email').textContent = email;
    $('#user-avatar').textContent = DEMO ? 'DM' : email.slice(0, 2).toUpperCase();
    $('#logout-btn').title = DEMO ? 'Reiniciar datos de demostración' : 'Cerrar sesión';
  }

  function renderProjectFilter() {
    const select = $('#project-filter');
    const current = state.filters.project;
    select.innerHTML = '<option value="all">Todos</option>' + state.data.projects.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
    select.value = state.data.projects.some(p => p.id === current) ? current : 'all';
  }

  function renderDashboard() {
    const { projects, areas, items } = state.data;
    const ok = items.filter(i => i.status === 'ok').length;
    const pending = items.length - ok;
    const purchase = items.filter(i => i.solped || i.purchase_order).length;
    const percent = items.length ? Math.round(ok / items.length * 100) : 0;
    const kpis = [
      ['Proyectos', projects.length, `${projects.filter(p => p.status === 'active').length} activos`, ''],
      ['Áreas', areas.length, 'frentes identificados', ''],
      ['Pendientes', pending, `${purchase} con trámite de compra`, 'amber'],
      ['Resueltos', ok, `${percent}% del total`, 'green']
    ];
    $('#kpi-grid').innerHTML = kpis.map((k, i) => `<article class="kpi-card ${k[3] ? `kpi-card--${k[3]}` : ''}" data-index="0${i+1}"><span class="kpi-card__label">${k[0]}</span><strong class="kpi-card__value">${k[1]}</strong><small class="kpi-card__note">${k[2]}</small></article>`).join('');
    $('#progress-label').textContent = `${percent}% resuelto`;
    $('#progress-bar').style.width = `${percent}%`;
    $('#progress-detail').textContent = items.length ? `${ok} de ${items.length} ítems en estado OK` : 'Sin ítems registrados';

    const sortedProjects = [...projects].sort((a,b) => projectStats(a.id).percent - projectStats(b.id).percent);
    $('#project-cards').innerHTML = sortedProjects.length ? sortedProjects.slice(0, 6).map(p => {
      const stats = projectStats(p.id);
      const areaCount = areas.filter(a => a.project_id === p.id).length;
      return `<article class="project-card" data-open-project="${esc(p.id)}">
        <div class="project-card__top"><div><span class="project-card__code">${esc(p.code || 'SIN CÓDIGO')}</span><h3>${esc(p.name)}</h3><p>${areaCount} ${areaCount === 1 ? 'área' : 'áreas'} · ${stats.total} ${stats.total === 1 ? 'ítem' : 'ítems'}</p></div><span class="badge badge--${p.status === 'closed' ? 'closed' : 'active'}">${p.status === 'closed' ? 'Cerrado' : 'Activo'}</span></div>
        <div class="project-card__stats"><div class="mini-track"><span style="width:${stats.percent}%"></span></div><b>${stats.percent}%</b></div>
      </article>`;
    }).join('') : emptyState('Aún no hay proyectos', 'Crea el primero para comenzar a registrar necesidades.');

    const oldPending = items.filter(i => i.status === 'pending').sort((a,b) => a.identified_on.localeCompare(b.identified_on)).slice(0,5);
    $('#old-pending-count').textContent = pending;
    $('#old-pending-list').innerHTML = oldPending.length ? oldPending.map((i, index) => compactItem(i, index, `${daysAgo(i.identified_on)} días`)).join('') : '<p class="empty-mini">No hay pendientes. Buen trabajo.</p>';

    const purchases = items.filter(i => i.solped || i.purchase_order).sort((a,b) => b.identified_on.localeCompare(a.identified_on)).slice(0,5);
    $('#purchase-count').textContent = purchase;
    $('#purchase-list').innerHTML = purchases.length ? purchases.map((i,index) => compactItem(i,index,i.purchase_order ? `OC ${i.purchase_order}` : `SOLPED ${i.solped}`)).join('') : '<p class="empty-mini">No hay necesidades con SOLPED u OC.</p>';
  }

  function compactItem(item, index, side) {
    const project = state.data.projects.find(p => p.id === item.project_id);
    const area = state.data.areas.find(a => a.id === item.area_id);
    return `<div class="compact-item"><span class="compact-index">${String(index+1).padStart(2,'0')}</span><div><b>${esc(item.description)}</b><small>${esc(project?.name || '')} · ${esc(area?.name || '')}</small></div><small>${esc(side)}</small></div>`;
  }

  function filterItems(items) {
    const q = state.filters.search.trim().toLowerCase();
    return items.filter(item => {
      const area = state.data.areas.find(a => a.id === item.area_id);
      const project = state.data.projects.find(p => p.id === item.project_id);
      const haystack = [item.description, item.observations, item.solped, item.purchase_order, area?.name, project?.name, project?.code].join(' ').toLowerCase();
      return (!q || haystack.includes(q)) &&
        (state.filters.status === 'all' || item.status === state.filters.status) &&
        (state.filters.purchase === 'all' || (state.filters.purchase === 'with' ? (item.solped || item.purchase_order) : (!item.solped && !item.purchase_order)));
    });
  }

  function renderProjects() {
    const filtering = state.filters.search || state.filters.status !== 'all' || state.filters.purchase !== 'all' || state.filters.project !== 'all';
    let projects = [...state.data.projects];
    if (state.filters.project !== 'all') projects = projects.filter(p => p.id === state.filters.project);
    const visibleItems = filterItems(state.data.items);
    if (filtering && state.filters.project === 'all') {
      const projectIds = new Set(visibleItems.map(i => i.project_id));
      const q = state.filters.search.trim().toLowerCase();
      projects = projects.filter(p => projectIds.has(p.id) || (q && [p.name,p.code,p.description].join(' ').toLowerCase().includes(q)));
    }
    $('#results-count').textContent = `${visibleItems.filter(i => projects.some(p => p.id === i.project_id)).length} ítems visibles`;
    const activeCount = [state.filters.search, state.filters.project !== 'all', state.filters.status !== 'all', state.filters.purchase !== 'all'].filter(Boolean).length;
    $('#filters-active').textContent = activeCount ? `${activeCount} ${activeCount === 1 ? 'filtro activo' : 'filtros activos'}` : '';
    $('#project-list').innerHTML = projects.length ? projects.map(project => renderProjectBlock(project, visibleItems, filtering)).join('') : emptyState('No encontramos coincidencias', 'Ajusta los filtros o crea un nuevo proyecto.');
  }

  function renderProjectBlock(project, visibleItems, filtering) {
    const areas = state.data.areas.filter(a => a.project_id === project.id).sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0));
    const stats = projectStats(project.id);
    return `<article class="project-block" data-project-id="${esc(project.id)}">
      <header class="project-block__head">
        <div class="project-title-row"><button class="collapse-btn" data-action="collapse" aria-label="Contraer proyecto">⌄</button><div><span class="project-card__code">${esc(project.code || 'SIN CÓDIGO')}</span><h2>${esc(project.name)}</h2><p>${esc(project.description || 'Sin descripción')}</p><div class="project-meta"><span class="badge badge--${project.status === 'closed' ? 'closed' : 'active'}">${project.status === 'closed' ? 'Cerrado' : 'Activo'}</span><span>${areas.length} ${areas.length === 1 ? 'área' : 'áreas'}</span></div></div></div>
        <div class="project-actions"><div class="project-progress"><b>${stats.ok}/${stats.total} · ${stats.percent}%</b><div class="mini-track"><span style="width:${stats.percent}%"></span></div></div><button class="action-btn" data-action="edit-project" data-id="${esc(project.id)}" title="Editar proyecto">✎</button><button class="action-btn action-btn--danger" data-action="delete-project" data-id="${esc(project.id)}" title="Eliminar proyecto">×</button></div>
      </header>
      <div class="project-block__body">
        ${areas.length ? areas.map((area, index) => renderArea(area, index, visibleItems, filtering)).join('') : '<div class="empty-area" style="margin-top:18px">Este proyecto aún no tiene áreas.</div>'}
        <div class="add-area-row"><button class="btn btn--secondary add-area-btn" data-action="add-area" data-project="${esc(project.id)}">＋ Agregar área</button></div>
      </div>
    </article>`;
  }

  function renderArea(area, index, visibleItems, filtering) {
    const allAreaItems = state.data.items.filter(i => i.area_id === area.id);
    const items = filtering ? visibleItems.filter(i => i.area_id === area.id) : allAreaItems;
    return `<section class="area-block">
      <div class="area-head"><div class="area-head__title"><span class="area-number">ÁREA ${String(index+1).padStart(2,'0')}</span><h3>${esc(area.name)}</h3><small>${items.length}/${allAreaItems.length} visibles</small></div><div class="area-actions"><button class="action-btn" data-action="add-item" data-area="${esc(area.id)}" data-project="${esc(area.project_id)}" title="Agregar ítem">＋</button><button class="action-btn" data-action="edit-area" data-id="${esc(area.id)}" title="Editar área">✎</button><button class="action-btn action-btn--danger" data-action="delete-area" data-id="${esc(area.id)}" title="Eliminar área">×</button></div></div>
      ${items.length ? `<table class="items-table"><thead><tr><th style="width:12%">Identificado</th><th style="width:34%">Necesidad / actividad</th><th style="width:12%">Estado</th><th style="width:24%">Compra</th><th style="width:18%"></th></tr></thead><tbody>${items.map(renderItemRow).join('')}</tbody></table>` : `<div class="empty-area">${filtering && allAreaItems.length ? 'Ningún ítem coincide con los filtros.' : 'No hay ítems en esta área.'} <button class="text-btn" data-action="add-item" data-area="${esc(area.id)}" data-project="${esc(area.project_id)}">Agregar el primero</button></div>`}
    </section>`;
  }

  function renderItemRow(item) {
    const purchases = `${item.solped ? `<span class="purchase-ref"><b>SOLPED</b> ${esc(item.solped)}</span>` : ''}${item.purchase_order ? `<span class="purchase-ref"><b>OC</b> ${esc(item.purchase_order)}</span>` : ''}` || '<span class="item-observation">No aplica / sin registro</span>';
    return `<tr><td>${formatDate(item.identified_on)}</td><td><span class="item-description">${esc(item.description)}</span>${item.observations ? `<span class="item-observation">${esc(item.observations)}</span>` : ''}</td><td><button class="badge badge--${item.status === 'ok' ? 'ok' : 'pending'}" data-action="toggle-item" data-id="${esc(item.id)}" title="Cambiar estado">${item.status === 'ok' ? '✓ OK' : '• Pendiente'}</button></td><td>${purchases}</td><td><div class="row-actions"><button class="action-btn" data-action="edit-item" data-id="${esc(item.id)}" title="Editar ítem">✎</button><button class="action-btn action-btn--danger" data-action="delete-item" data-id="${esc(item.id)}" title="Eliminar ítem">×</button></div></td></tr>`;
  }

  function emptyState(title, text) {
    return `<div class="no-results"><strong>${esc(title)}</strong><p>${esc(text)}</p></div>`;
  }

  function switchView(view) {
    state.view = view;
    $$('.view').forEach(el => el.classList.add('hidden'));
    $(`#${view}-view`).classList.remove('hidden');
    $$('.nav-link').forEach(el => el.classList.toggle('active', el.dataset.view === view));
    $('#page-title').textContent = view === 'dashboard' ? 'Resumen de avance' : 'Proyectos y necesidades';
    if (view === 'projects') renderProjects();
  }

  function field(label, name, value = '', opts = {}) {
    const full = opts.full ? ' full' : '';
    const required = opts.required ? ' required' : '';
    const optional = opts.required ? '' : ' <span class="optional">(opcional)</span>';
    if (opts.type === 'textarea') return `<label class="${full.trim()}">${label}${optional}<textarea name="${name}"${required} placeholder="${esc(opts.placeholder || '')}">${esc(value)}</textarea>${opts.help ? `<span class="field-help">${esc(opts.help)}</span>` : ''}</label>`;
    if (opts.type === 'select') return `<label class="${full.trim()}">${label}${optional}<select name="${name}"${required}>${opts.options.map(o => `<option value="${esc(o.value)}"${o.value === value ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select></label>`;
    return `<label class="${full.trim()}">${label}${optional}<input name="${name}" type="${opts.type || 'text'}" value="${esc(value)}"${required} placeholder="${esc(opts.placeholder || '')}">${opts.help ? `<span class="field-help">${esc(opts.help)}</span>` : ''}</label>`;
  }

  function openForm(entity, id = null, context = {}) {
    let record = id ? state.data[entity === 'item' ? 'items' : `${entity}s`].find(x => x.id === id) : null;
    state.editing = { entity, id, context };
    $('#form-error').textContent = '';
    $('#modal-eyebrow').textContent = id ? 'ACTUALIZAR REGISTRO' : 'NUEVO REGISTRO';
    $('#modal-title').textContent = `${id ? 'Editar' : 'Crear'} ${entity === 'project' ? 'proyecto' : entity === 'area' ? 'área' : 'ítem'}`;
    $('#form-submit').textContent = id ? 'Guardar cambios' : 'Crear';
    if (entity === 'project') {
      $('#form-fields').innerHTML = [
        field('Nombre', 'name', record?.name, { required:true, placeholder:'Ej. Rehabilitación' }),
        field('Código', 'code', record?.code, { placeholder:'Ej. PRY-001' }),
        field('Descripción', 'description', record?.description, { type:'textarea', full:true, placeholder:'Objetivo o alcance del proyecto' }),
        field('Estado', 'status', record?.status || 'active', { type:'select', required:true, options:[{value:'active',label:'Activo'},{value:'closed',label:'Cerrado'}] })
      ].join('');
    } else if (entity === 'area') {
      const projectId = record?.project_id || context.projectId;
      $('#form-fields').innerHTML = [
        field('Proyecto', 'project_id', projectId, { type:'select', required:true, options:state.data.projects.map(p => ({value:p.id,label:p.name})) }),
        field('Nombre del área', 'name', record?.name, { required:true, placeholder:'Ej. Consultorio 1' }),
        field('Descripción', 'description', record?.description, { type:'textarea', full:true, placeholder:'Alcance del área o subtarea' }),
        field('Orden', 'sort_order', record?.sort_order || 1, { type:'number', help:'Posición dentro del proyecto' })
      ].join('');
    } else {
      const areaId = record?.area_id || context.areaId;
      const area = state.data.areas.find(a => a.id === areaId);
      $('#form-fields').innerHTML = [
        field('Área', 'area_id', areaId, { type:'select', required:true, options:state.data.areas.filter(a => a.project_id === (record?.project_id || context.projectId || area?.project_id)).map(a => ({value:a.id,label:a.name})) }),
        field('Fecha de identificación', 'identified_on', record?.identified_on || isoDate(), { type:'date', required:true }),
        field('Descripción', 'description', record?.description, { required:true, full:true, placeholder:'¿Qué se necesita o qué actividad debe realizarse?' }),
        field('Estado', 'status', record?.status || 'pending', { type:'select', required:true, options:[{value:'pending',label:'Pendiente'},{value:'ok',label:'OK'}] }),
        field('SOLPED', 'solped', record?.solped, { placeholder:'Número de solicitud' }),
        field('Orden de compra (OC)', 'purchase_order', record?.purchase_order, { placeholder:'Número de OC' }),
        field('Observaciones', 'observations', record?.observations, { type:'textarea', full:true, placeholder:'Contexto, bloqueo, responsable o siguiente paso' })
      ].join('');
    }
    $('#form-dialog').showModal();
    setTimeout(() => $('#form-fields input, #form-fields select, #form-fields textarea')?.focus(), 30);
  }

  async function saveForm(event) {
    event.preventDefault();
    const { entity, id, context } = state.editing;
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      if (entity === 'project') {
        data.code = data.code.trim(); data.name = data.name.trim(); data.description = data.description.trim();
        if (!data.name) throw new Error('El nombre del proyecto es obligatorio.');
        id ? await service.update('projects', id, data) : await service.create('projects', data);
      } else if (entity === 'area') {
        data.name = data.name.trim(); data.description = data.description.trim(); data.sort_order = Number(data.sort_order) || 1;
        if (!data.name || !data.project_id) throw new Error('El proyecto y el nombre del área son obligatorios.');
        id ? await service.update('areas', id, data) : await service.create('areas', data);
      } else {
        const area = state.data.areas.find(a => a.id === data.area_id);
        data.project_id = area?.project_id || context.projectId;
        data.description = data.description.trim(); data.observations = data.observations.trim(); data.solped = data.solped.trim(); data.purchase_order = data.purchase_order.trim();
        if (!data.description || !data.identified_on || !data.area_id) throw new Error('Área, fecha y descripción son obligatorias.');
        id ? await service.update('items', id, data) : await service.create('items', data);
      }
      $('#form-dialog').close(); renderApp(); toast(id ? 'Registro actualizado.' : 'Registro creado.');
    } catch (error) { $('#form-error').textContent = error.message; }
  }

  function askDelete(entity, id) {
    const table = entity === 'project' ? 'projects' : entity === 'area' ? 'areas' : 'items';
    const record = state.data[table].find(x => x.id === id);
    const label = record?.name || record?.description || 'este registro';
    let detail = 'Esta acción no se puede deshacer.';
    if (entity === 'project') detail = 'También se eliminarán todas sus áreas e ítems. Esta acción no se puede deshacer.';
    if (entity === 'area') detail = 'También se eliminarán todos sus ítems. Esta acción no se puede deshacer.';
    state.pendingDelete = { table, id };
    $('#confirm-title').textContent = `Eliminar “${label}”`;
    $('#confirm-message').textContent = detail;
    $('#confirm-dialog').showModal();
  }

  async function confirmDelete(event) {
    event.preventDefault();
    if (!state.pendingDelete) return;
    try {
      await service.remove(state.pendingDelete.table, state.pendingDelete.id);
      $('#confirm-dialog').close(); state.pendingDelete = null; renderApp(); toast('Registro eliminado.');
    } catch (error) { toast(error.message, 'error'); }
  }

  async function toggleItem(id) {
    const item = state.data.items.find(i => i.id === id);
    if (!item) return;
    try { await service.update('items', id, { status: item.status === 'ok' ? 'pending' : 'ok' }); renderApp(); toast('Estado actualizado.'); }
    catch (error) { toast(error.message, 'error'); }
  }

  function exportCsv() {
    const headers = ['Proyecto','Código','Área','Fecha de identificación','Descripción','Estado','Observaciones','SOLPED','OC'];
    const rows = state.data.items.map(item => {
      const project = state.data.projects.find(p => p.id === item.project_id);
      const area = state.data.areas.find(a => a.id === item.area_id);
      return [project?.name,project?.code,area?.name,item.identified_on,item.description,item.status === 'ok' ? 'OK' : 'Pendiente',item.observations,item.solped,item.purchase_order];
    });
    const csvCell = value => `"${String(value || '').replace(/"/g,'""')}"`;
    const csv = '\uFEFF' + [headers, ...rows].map(row => row.map(csvCell).join(';')).join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type:'text/csv;charset=utf-8' }));
    link.download = `bitacora-proyectos-${isoDate()}.csv`;
    link.click(); URL.revokeObjectURL(link.href); toast('Archivo CSV generado.');
  }

  function bindEvents() {
    $$('.nav-link').forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)));
    $('[data-go-projects]').addEventListener('click', () => switchView('projects'));
    $('#add-project-btn').addEventListener('click', () => openForm('project'));
    $('#export-btn').addEventListener('click', exportCsv);
    $('#entity-form').addEventListener('submit', saveForm);
    $('#confirm-delete-btn').addEventListener('click', confirmDelete);
    $('#search-input').addEventListener('input', e => { state.filters.search = e.target.value; renderProjects(); });
    $('#project-filter').addEventListener('change', e => { state.filters.project = e.target.value; renderProjects(); });
    $('#status-filter').addEventListener('change', e => { state.filters.status = e.target.value; renderProjects(); });
    $('#purchase-filter').addEventListener('change', e => { state.filters.purchase = e.target.value; renderProjects(); });
    $('#clear-filters-btn').addEventListener('click', () => {
      state.filters = { search:'', project:'all', status:'all', purchase:'all' };
      $('#search-input').value = ''; $('#project-filter').value = 'all'; $('#status-filter').value = 'all'; $('#purchase-filter').value = 'all'; renderProjects();
    });
    $('#project-cards').addEventListener('click', e => {
      const card = e.target.closest('[data-open-project]');
      if (card) { state.filters.project = card.dataset.openProject; renderProjectFilter(); switchView('projects'); }
    });
    $('#project-list').addEventListener('click', e => {
      const target = e.target.closest('[data-action]'); if (!target) return;
      const action = target.dataset.action;
      if (action === 'collapse') target.closest('.project-block').classList.toggle('collapsed');
      if (action === 'edit-project') openForm('project', target.dataset.id);
      if (action === 'delete-project') askDelete('project', target.dataset.id);
      if (action === 'add-area') openForm('area', null, { projectId:target.dataset.project });
      if (action === 'edit-area') openForm('area', target.dataset.id);
      if (action === 'delete-area') askDelete('area', target.dataset.id);
      if (action === 'add-item') openForm('item', null, { areaId:target.dataset.area, projectId:target.dataset.project });
      if (action === 'edit-item') openForm('item', target.dataset.id);
      if (action === 'delete-item') askDelete('item', target.dataset.id);
      if (action === 'toggle-item') toggleItem(target.dataset.id);
    });
    $('#logout-btn').addEventListener('click', async () => {
      if (DEMO) {
        if (confirm('¿Reiniciar todos los datos de demostración?')) { await service.reset(); renderApp(); toast('Demostración reiniciada.'); }
      } else { service.clearSession(); location.reload(); }
    });
    $('#auth-form').addEventListener('submit', async e => {
      e.preventDefault(); $('#auth-error').textContent = '';
      const submit = e.currentTarget.querySelector('[type=submit]'); submit.disabled = true; submit.textContent = 'Ingresando…';
      try { await service.signIn($('#auth-email').value, $('#auth-password').value); await enterApp(); }
      catch (error) { $('#auth-error').textContent = error.message; }
      finally { submit.disabled = false; submit.textContent = 'Ingresar'; }
    });
    $('#signup-btn').addEventListener('click', async () => {
      $('#auth-error').textContent = '';
      const email = $('#auth-email').value, password = $('#auth-password').value;
      if (!email || password.length < 6) { $('#auth-error').textContent = 'Ingresa un correo válido y una contraseña de mínimo 6 caracteres.'; return; }
      try {
        const result = await service.signUp(email, password);
        if (result.access_token) await enterApp(); else toast('Cuenta creada. Revisa tu correo para confirmarla.');
      } catch (error) { $('#auth-error').textContent = error.message; }
    });
  }

  async function enterApp() {
    try {
      await service.init();
      $('#auth-screen').classList.add('hidden'); $('#app').classList.remove('hidden'); renderApp();
    } catch (error) {
      if (!DEMO) service.clearSession();
      $('#auth-screen').classList.remove('hidden'); $('#app').classList.add('hidden'); $('#auth-error').textContent = error.message;
    }
  }

  async function boot() {
    bindEvents();
    if (DEMO) return enterApp();
    const restored = await service.restoreSession();
    if (restored) await enterApp(); else { $('#auth-screen').classList.remove('hidden'); $('#app').classList.add('hidden'); }
  }

  boot();
})();
