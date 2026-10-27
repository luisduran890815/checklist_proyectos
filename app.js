/* Bitácora de proyectos — checklist y cronograma Gantt sin dependencias */
(() => {
  'use strict';

  const CONFIG = window.APP_CONFIG || {};
  const DEMO = CONFIG.DEMO_MODE !== false || !CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY;
  const DEMO_KEY = 'bitacora-proyectos-demo-v2';
  const LEGACY_DEMO_KEY = 'bitacora-proyectos-demo-v1';
  const SESSION_KEY = 'bitacora-proyectos-session-v1';
  const DATE_FORMAT = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  const MONTH_FORMAT = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' });

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = (value = '') => String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const isoDate = (date = new Date()) => date.toISOString().slice(0, 10);
  const parseDate = value => value ? new Date(`${value}T12:00:00`) : null;
  const formatDate = value => value ? DATE_FORMAT.format(parseDate(value)) : '—';
  const addDays = (value, amount) => { const d = parseDate(value); if (!d) return ''; d.setDate(d.getDate() + amount); return isoDate(d); };
  const diffDays = (start, end) => {
    const a = parseDate(start), b = parseDate(end);
    return a && b ? Math.floor((b - a) / 86400000) : 0;
  };
  const durationDays = item => item.planned_start && item.planned_end ? Math.max(1, diffDays(item.planned_start, item.planned_end) + 1) : 0;
  const daysAgo = value => Math.max(0, Math.floor((new Date().setHours(0,0,0,0) - parseDate(value)?.getTime()) / 86400000) || 0);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));

  function demoSeed() {
    const p1 = uid(), p2 = uid(), a1 = uid(), a2 = uid(), a3 = uid();
    return {
      projects: [
        { id:p1, name:'Rehabilitación', code:'PRY-001', description:'Adecuación y puesta a punto de espacios asistenciales.', status:'active', created_at:'2026-09-05T10:00:00Z' },
        { id:p2, name:'Sistema de AA Farmacia', code:'PRY-002', description:'Suministro, instalación y puesta en marcha del sistema de aire acondicionado.', status:'active', created_at:'2026-09-12T10:00:00Z' }
      ],
      areas: [
        { id:a1, project_id:p1, name:'Consultorio 1', description:'Obra blanca, dotación y seguridad.', sort_order:1 },
        { id:a2, project_id:p2, name:'Gestión contractual', description:'Compras y documentación.', sort_order:1 },
        { id:a3, project_id:p2, name:'Ejecución técnica', description:'Instalación y entrega.', sort_order:2 }
      ],
      items: [
        { id:uid(), project_id:p1, area_id:a1, identified_on:'2026-10-01', description:'Pintura lavable', status:'ok', progress:100, observations:'Actividad recibida.', solped:'', purchase_order:'OC-7800341', supplier:'Acabados del Caribe', responsible:'Jerson Díaz', planned_start:'2026-10-05', planned_end:'2026-10-09' },
        { id:uid(), project_id:p1, area_id:a1, identified_on:'2026-10-02', description:'Instalar señalización', status:'pending', progress:60, observations:'Validar ubicación final con SST.', solped:'45001231', purchase_order:'', supplier:'Señalizar SAS', responsible:'Osiris Brochado', planned_start:'2026-10-12', planned_end:'2026-10-28' },
        { id:uid(), project_id:p1, area_id:a1, identified_on:'2026-10-03', description:'Dotación de camilla', status:'pending', progress:20, observations:'Pendiente entrega.', solped:'45001244', purchase_order:'OC-7800348', supplier:'Dotaciones Médicas', responsible:'Luis Durán', planned_start:'2026-10-22', planned_end:'2026-11-03' },
        { id:uid(), project_id:p2, area_id:a2, identified_on:'2026-09-14', description:'Contrato y anticipo', status:'ok', progress:100, observations:'Contrato formalizado.', solped:'45001302', purchase_order:'OC-7800402', supplier:'Daikin', responsible:'Carolina Pérez', planned_start:'2026-09-21', planned_end:'2026-09-30' },
        { id:uid(), project_id:p2, area_id:a2, identified_on:'2026-09-16', description:'Aprobación de cronograma', status:'ok', progress:100, observations:'Aprobado por interventoría.', solped:'', purchase_order:'', supplier:'Daikin', responsible:'Luis Durán', planned_start:'2026-10-01', planned_end:'2026-10-05' },
        { id:uid(), project_id:p2, area_id:a3, identified_on:'2026-09-18', description:'Suministro de equipos', status:'pending', progress:75, observations:'Equipos en tránsito.', solped:'', purchase_order:'OC-7800402', supplier:'Daikin', responsible:'Jerson Díaz', planned_start:'2026-10-06', planned_end:'2026-10-30' },
        { id:uid(), project_id:p2, area_id:a3, identified_on:'2026-09-20', description:'Instalación mecánica', status:'pending', progress:35, observations:'Frente de trabajo activo.', solped:'', purchase_order:'', supplier:'Clima Norte', responsible:'Jhonnys Hoyos', planned_start:'2026-10-20', planned_end:'2026-11-12' },
        { id:uid(), project_id:p2, area_id:a3, identified_on:'2026-09-22', description:'Pruebas y puesta en marcha', status:'pending', progress:0, observations:'', solped:'', purchase_order:'', supplier:'Daikin', responsible:'Luis Durán', planned_start:'2026-11-13', planned_end:'2026-11-20' },
        { id:uid(), project_id:p2, area_id:a3, identified_on:'2026-10-10', description:'Acta de entrega y capacitación', status:'pending', progress:0, observations:'Pendiente programación.', solped:'', purchase_order:'', supplier:'', responsible:'Luis Durán', planned_start:'', planned_end:'' }
      ]
    };
  }

  function normalizeData(data) {
    const safe = data && typeof data === 'object' ? data : {};
    return {
      projects: (safe.projects || []).map(p => ({ status:'active', description:'', code:'', ...p })),
      areas: (safe.areas || []).map(a => ({ description:'', sort_order:1, ...a })),
      items: (safe.items || []).map(i => ({
        observations:'', solped:'', purchase_order:'', supplier:'', responsible:'',
        planned_start:'', planned_end:'', progress:i.status === 'ok' ? 100 : 0, ...i,
        progress: clamp(i.progress ?? (i.status === 'ok' ? 100 : 0), 0, 100)
      }))
    };
  }

  const state = {
    data: { projects:[], areas:[], items:[] },
    session:null,
    view:'dashboard',
    filters:{ search:'', project:'all', status:'all', purchase:'all' },
    selectedProjectId:null,
    detailTab:'gantt',
    ganttZoom:'week',
    ganttSearch:'',
    editing:null,
    pendingDelete:null
  };

  class DemoService {
    async init() {
      const saved = localStorage.getItem(DEMO_KEY) || localStorage.getItem(LEGACY_DEMO_KEY);
      state.data = normalizeData(saved ? JSON.parse(saved) : demoSeed());
      this.persist();
    }
    persist() { localStorage.setItem(DEMO_KEY, JSON.stringify(state.data)); }
    async create(table, record) {
      const row = { ...record, id:uid(), created_at:new Date().toISOString(), updated_at:new Date().toISOString() };
      state.data[table].push(row); this.persist(); return row;
    }
    async update(table, id, changes) {
      const index = state.data[table].findIndex(x => x.id === id);
      if (index < 0) throw new Error('Registro no encontrado.');
      state.data[table][index] = { ...state.data[table][index], ...changes, updated_at:new Date().toISOString() };
      this.persist(); return state.data[table][index];
    }
    async remove(table, id) {
      if (table === 'projects') {
        state.data.areas = state.data.areas.filter(x => x.project_id !== id);
        state.data.items = state.data.items.filter(x => x.project_id !== id);
      }
      if (table === 'areas') state.data.items = state.data.items.filter(x => x.area_id !== id);
      state.data[table] = state.data[table].filter(x => x.id !== id);
      this.persist();
    }
    async reset() { state.data = normalizeData(demoSeed()); this.persist(); }
  }

  class SupabaseService {
    constructor() { this.base = CONFIG.SUPABASE_URL.replace(/\/$/, ''); this.key = CONFIG.SUPABASE_ANON_KEY; }
    headers(prefer) {
      const headers = { apikey:this.key, Authorization:`Bearer ${state.session?.access_token || this.key}`, 'Content-Type':'application/json' };
      if (prefer) headers.Prefer = prefer;
      return headers;
    }
    async request(path, options = {}) {
      const response = await fetch(`${this.base}${path}`, { ...options, headers:{ ...this.headers(options.prefer), ...(options.headers || {}) } });
      const text = await response.text();
      let payload = null;
      try { payload = text ? JSON.parse(text) : null; } catch (_) { payload = text; }
      if (!response.ok) throw new Error(payload?.msg || payload?.message || payload?.error_description || 'No fue posible completar la operación.');
      return payload;
    }
    async signIn(email, password) {
      const session = await this.request('/auth/v1/token?grant_type=password', { method:'POST', body:JSON.stringify({ email,password }) });
      this.saveSession(session); return session;
    }
    async signUp(email, password) {
      const result = await this.request('/auth/v1/signup', { method:'POST', body:JSON.stringify({ email,password }) });
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
        const refreshed = await this.request('/auth/v1/token?grant_type=refresh_token', { method:'POST', body:JSON.stringify({ refresh_token:saved.refresh_token }) });
        this.saveSession(refreshed); return true;
      } catch (_) { this.clearSession(); return false; }
    }
    normalizeProject(row) { return { ...row, description:row.description ?? row.company ?? '', status:row.status ?? 'active' }; }
    normalizeArea(row) { return { ...row, description:row.description ?? '', sort_order:row.sort_order ?? 1 }; }
    normalizeItem(row, areas = state.data.areas) {
      const area = areas.find(a => a.id === row.area_id);
      return {
        ...row,
        project_id:row.project_id ?? area?.project_id ?? '',
        identified_on:row.identified_on ?? row.identified_date ?? isoDate(),
        status:String(row.status ?? 'PENDIENTE').toLowerCase() === 'ok' ? 'ok' : 'pending',
        purchase_order:row.purchase_order ?? row.oc ?? '',
        supplier:row.supplier ?? '', responsible:row.responsible ?? '',
        planned_start:row.planned_start ?? '', planned_end:row.planned_end ?? '',
        progress:clamp(row.progress ?? (String(row.status).toLowerCase() === 'ok' ? 100 : 0), 0, 100)
      };
    }
    toDatabaseRecord(table, record, creating = false) {
      const payload = {};
      const set = (key, value) => { if (value !== undefined) payload[key] = value === '' ? null : value; };
      if (table === 'projects') {
        set('code', record.code || (creating ? `PRY-${Date.now().toString().slice(-6)}` : undefined));
        set('name', record.name); set('company', record.description);
        if (creating) payload.owner_id = state.session.user.id;
      } else if (table === 'areas') {
        set('project_id', record.project_id); set('name', record.name);
      } else {
        set('area_id', record.area_id); set('identified_date', record.identified_on); set('description', record.description);
        if (record.status !== undefined) set('status', record.status === 'ok' ? 'OK' : 'PENDIENTE');
        set('item_type', record.item_type || (creating ? 'GENERAL' : undefined));
        set('solped', record.solped); set('oc', record.purchase_order); set('observations', record.observations);
        set('supplier', record.supplier); set('responsible', record.responsible);
        set('planned_start', record.planned_start); set('planned_end', record.planned_end);
        if (record.progress !== undefined) set('progress', clamp(record.progress, 0, 100));
      }
      return payload;
    }
    async init() {
      const [projectRows, areaRows, itemRows] = await Promise.all([
        this.request('/rest/v1/projects?select=*&order=created_at.asc'),
        this.request('/rest/v1/areas?select=*&order=created_at.asc'),
        this.request('/rest/v1/checklist_items?select=*&order=identified_date.asc,created_at.asc')
      ]);
      const projects = projectRows.map(row => this.normalizeProject(row));
      const areas = areaRows.map(row => this.normalizeArea(row));
      state.data = normalizeData({ projects, areas, items:itemRows.map(row => this.normalizeItem(row, areas)) });
    }
    async create(table, record) {
      const dbTable = table === 'items' ? 'checklist_items' : table;
      const rows = await this.request(`/rest/v1/${dbTable}`, { method:'POST', prefer:'return=representation', body:JSON.stringify(this.toDatabaseRecord(table, record, true)) });
      const raw = rows[0];
      const row = table === 'projects' ? this.normalizeProject(raw) : table === 'areas' ? this.normalizeArea(raw) : this.normalizeItem(raw);
      state.data[table].push(row); return row;
    }
    async update(table, id, changes) {
      const dbTable = table === 'items' ? 'checklist_items' : table;
      const rows = await this.request(`/rest/v1/${dbTable}?id=eq.${encodeURIComponent(id)}`, { method:'PATCH', prefer:'return=representation', body:JSON.stringify(this.toDatabaseRecord(table, changes, false)) });
      const raw = rows[0];
      const row = table === 'projects' ? this.normalizeProject(raw) : table === 'areas' ? this.normalizeArea(raw) : this.normalizeItem(raw);
      const index = state.data[table].findIndex(x => x.id === id);
      state.data[table][index] = row; return row;
    }
    async remove(table, id) {
      const dbTable = table === 'items' ? 'checklist_items' : table;
      await this.request(`/rest/v1/${dbTable}?id=eq.${encodeURIComponent(id)}`, { method:'DELETE', prefer:'return=minimal' });
      if (table === 'projects') { state.data.areas = state.data.areas.filter(x => x.project_id !== id); state.data.items = state.data.items.filter(x => x.project_id !== id); }
      if (table === 'areas') state.data.items = state.data.items.filter(x => x.area_id !== id);
      state.data[table] = state.data[table].filter(x => x.id !== id);
    }
  }

  const service = DEMO ? new DemoService() : new SupabaseService();

  function toast(message, type = 'success') {
    const el = document.createElement('div');
    el.className = `toast${type === 'error' ? ' toast--error' : ''}`;
    el.textContent = message; $('#toast-region').appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }

  function projectStats(projectId) {
    const items = state.data.items.filter(i => i.project_id === projectId);
    const ok = items.filter(i => i.status === 'ok' || i.progress === 100).length;
    const progress = items.length ? Math.round(items.reduce((sum, i) => sum + clamp(i.progress, 0, 100), 0) / items.length) : 0;
    return { total:items.length, ok, pending:items.length - ok, percent:progress };
  }

  function scheduleStatus(item) {
    if (item.progress >= 100 || item.status === 'ok') return 'complete';
    const today = isoDate();
    if (item.planned_end && item.planned_end < today) return 'late';
    if (item.planned_start && item.planned_start <= today) return 'active';
    return 'future';
  }

  function renderApp() {
    renderHeader(); renderProjectFilter(); renderDashboard(); renderProjects();
    if (state.selectedProjectId) renderProjectDetail();
  }

  function renderHeader() {
    $('#today-label').textContent = `Actualizado · ${DATE_FORMAT.format(new Date())}`;
    $('#storage-label').textContent = DEMO ? 'Modo demostración' : 'Conectado a Supabase';
    $('#storage-detail').textContent = DEMO ? 'Datos guardados en este navegador' : 'Sincronización en la nube';
    const email = DEMO ? 'Sin conexión' : (state.session?.user?.email || 'Usuario');
    $('#user-name').textContent = DEMO ? 'Demostración' : email.split('@')[0];
    $('#user-email').textContent = email; $('#user-avatar').textContent = DEMO ? 'DM' : email.slice(0,2).toUpperCase();
    $('#logout-btn').title = DEMO ? 'Reiniciar datos de demostración' : 'Cerrar sesión';
    const detail = state.view === 'project-detail';
    $('#detail-back-btn').classList.toggle('hidden', !detail);
    $('#page-eyebrow').textContent = detail ? 'DETALLE DEL PROYECTO' : 'TABLERO OPERATIVO';
    $('#add-project-btn').innerHTML = detail ? '<span>＋</span> Nueva actividad' : '<span>＋</span> Nuevo proyecto';
  }

  function renderProjectFilter() {
    const select = $('#project-filter');
    const current = state.filters.project;
    select.innerHTML = '<option value="all">Todos</option>' + state.data.projects.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
    select.value = state.data.projects.some(p => p.id === current) ? current : 'all';
  }

  function renderDashboard() {
    const { projects, areas, items } = state.data;
    const ok = items.filter(i => i.status === 'ok' || i.progress === 100).length;
    const pending = items.length - ok;
    const purchase = items.filter(i => i.solped || i.purchase_order).length;
    const percent = items.length ? Math.round(items.reduce((sum,i) => sum + clamp(i.progress,0,100), 0) / items.length) : 0;
    const kpis = [
      ['Proyectos',projects.length,`${projects.filter(p => p.status === 'active').length} activos`,''],
      ['Áreas',areas.length,'frentes identificados',''],
      ['Pendientes',pending,`${purchase} con trámite de compra`,'amber'],
      ['Avance',`${percent}%`,`${ok} actividades terminadas`,'green']
    ];
    $('#kpi-grid').innerHTML = kpis.map((k,i) => `<article class="kpi-card ${k[3] ? `kpi-card--${k[3]}` : ''}" data-index="0${i+1}"><span class="kpi-card__label">${k[0]}</span><strong class="kpi-card__value">${k[1]}</strong><small class="kpi-card__note">${k[2]}</small></article>`).join('');
    $('#progress-label').textContent = `${percent}% ejecutado`; $('#progress-bar').style.width = `${percent}%`;
    $('#progress-detail').textContent = items.length ? `Promedio ponderado de ${items.length} actividades` : 'Sin actividades registradas';

    const sortedProjects = [...projects].sort((a,b) => projectStats(a.id).percent - projectStats(b.id).percent);
    $('#project-cards').innerHTML = sortedProjects.length ? sortedProjects.slice(0,6).map(p => {
      const stats = projectStats(p.id), areaCount = areas.filter(a => a.project_id === p.id).length;
      return `<article class="project-card" data-open-project="${esc(p.id)}" tabindex="0" role="button" aria-label="Abrir ${esc(p.name)}">
        <div class="project-card__top"><div><span class="project-card__code">${esc(p.code || 'SIN CÓDIGO')}</span><h3>${esc(p.name)}</h3><p>${areaCount} ${areaCount === 1 ? 'área' : 'áreas'} · ${stats.total} actividades</p></div><span class="badge badge--${p.status === 'closed' ? 'closed' : 'active'}">${p.status === 'closed' ? 'Cerrado' : 'Activo'}</span></div>
        <div class="project-card__stats"><div class="mini-track"><span style="width:${stats.percent}%"></span></div><b>${stats.percent}%</b></div><span class="project-card__open">Abrir proyecto →</span>
      </article>`;
    }).join('') : emptyState('Aún no hay proyectos','Crea el primero para comenzar.');

    const oldPending = items.filter(i => i.status === 'pending').sort((a,b) => a.identified_on.localeCompare(b.identified_on)).slice(0,5);
    $('#old-pending-count').textContent = pending;
    $('#old-pending-list').innerHTML = oldPending.length ? oldPending.map((i,index) => compactItem(i,index,`${daysAgo(i.identified_on)} días`)).join('') : '<p class="empty-mini">No hay pendientes. Buen trabajo.</p>';
    const purchases = items.filter(i => i.solped || i.purchase_order).sort((a,b) => b.identified_on.localeCompare(a.identified_on)).slice(0,5);
    $('#purchase-count').textContent = purchase;
    $('#purchase-list').innerHTML = purchases.length ? purchases.map((i,index) => compactItem(i,index,i.purchase_order ? `OC ${i.purchase_order}` : `SOLPED ${i.solped}`)).join('') : '<p class="empty-mini">No hay necesidades con SOLPED u OC.</p>';
  }

  function compactItem(item, index, side) {
    const project = state.data.projects.find(p => p.id === item.project_id), area = state.data.areas.find(a => a.id === item.area_id);
    return `<div class="compact-item"><span class="compact-index">${String(index+1).padStart(2,'0')}</span><div><b>${esc(item.description)}</b><small>${esc(project?.name || '')} · ${esc(area?.name || '')}</small></div><small>${esc(side)}</small></div>`;
  }

  function filterItems(items) {
    const q = state.filters.search.trim().toLowerCase();
    return items.filter(item => {
      const area = state.data.areas.find(a => a.id === item.area_id), project = state.data.projects.find(p => p.id === item.project_id);
      const haystack = [item.description,item.observations,item.solped,item.purchase_order,item.supplier,item.responsible,area?.name,project?.name,project?.code].join(' ').toLowerCase();
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
      const projectIds = new Set(visibleItems.map(i => i.project_id)), q = state.filters.search.trim().toLowerCase();
      projects = projects.filter(p => projectIds.has(p.id) || (q && [p.name,p.code,p.description].join(' ').toLowerCase().includes(q)));
    }
    $('#results-count').textContent = `${visibleItems.filter(i => projects.some(p => p.id === i.project_id)).length} actividades visibles`;
    const activeCount = [state.filters.search,state.filters.project !== 'all',state.filters.status !== 'all',state.filters.purchase !== 'all'].filter(Boolean).length;
    $('#filters-active').textContent = activeCount ? `${activeCount} ${activeCount === 1 ? 'filtro activo' : 'filtros activos'}` : '';
    $('#project-list').innerHTML = projects.length ? projects.map(project => renderProjectBlock(project, visibleItems, filtering)).join('') : emptyState('No encontramos coincidencias','Ajusta los filtros o crea un nuevo proyecto.');
  }

  function renderProjectBlock(project, visibleItems, filtering) {
    const areas = state.data.areas.filter(a => a.project_id === project.id).sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0));
    const stats = projectStats(project.id);
    return `<article class="project-block" data-project-id="${esc(project.id)}">
      <header class="project-block__head">
        <div class="project-title-row"><button class="collapse-btn" data-action="collapse" aria-label="Contraer proyecto">⌄</button><div><span class="project-card__code">${esc(project.code || 'SIN CÓDIGO')}</span><h2>${esc(project.name)}</h2><p>${esc(project.description || 'Sin descripción')}</p><div class="project-meta"><span class="badge badge--${project.status === 'closed' ? 'closed' : 'active'}">${project.status === 'closed' ? 'Cerrado' : 'Activo'}</span><span>${areas.length} áreas</span></div></div></div>
        <div class="project-actions"><button class="btn btn--open" data-action="open-project" data-id="${esc(project.id)}">Cronograma →</button><div class="project-progress"><b>${stats.percent}%</b><div class="mini-track"><span style="width:${stats.percent}%"></span></div></div><button class="action-btn" data-action="edit-project" data-id="${esc(project.id)}" title="Editar proyecto">✎</button><button class="action-btn action-btn--danger" data-action="delete-project" data-id="${esc(project.id)}" title="Eliminar proyecto">×</button></div>
      </header>
      <div class="project-block__body">${areas.length ? areas.map((area,index) => renderArea(area,index,visibleItems,filtering)).join('') : '<div class="empty-area space-top">Este proyecto aún no tiene áreas.</div>'}<div class="add-area-row"><button class="btn btn--secondary add-area-btn" data-action="add-area" data-project="${esc(project.id)}">＋ Agregar área</button></div></div>
    </article>`;
  }

  function renderArea(area, index, visibleItems = state.data.items, filtering = false) {
    const allAreaItems = state.data.items.filter(i => i.area_id === area.id);
    const items = filtering ? visibleItems.filter(i => i.area_id === area.id) : allAreaItems;
    return `<section class="area-block">
      <div class="area-head"><div class="area-head__title"><span class="area-number">ÁREA ${String(index+1).padStart(2,'0')}</span><h3>${esc(area.name)}</h3><small>${items.length}/${allAreaItems.length} visibles</small></div><div class="area-actions"><button class="action-btn" data-action="add-item" data-area="${esc(area.id)}" data-project="${esc(area.project_id)}" title="Agregar actividad">＋</button><button class="action-btn" data-action="edit-area" data-id="${esc(area.id)}" title="Editar área">✎</button><button class="action-btn action-btn--danger" data-action="delete-area" data-id="${esc(area.id)}" title="Eliminar área">×</button></div></div>
      ${items.length ? `<div class="table-scroll"><table class="items-table"><thead><tr><th>Identificada</th><th>Actividad</th><th>Responsable / proveedor</th><th>Avance</th><th>Compra</th><th></th></tr></thead><tbody>${items.map(renderItemRow).join('')}</tbody></table></div>` : `<div class="empty-area">${filtering && allAreaItems.length ? 'Ninguna actividad coincide con los filtros.' : 'No hay actividades en esta área.'} <button class="text-btn" data-action="add-item" data-area="${esc(area.id)}" data-project="${esc(area.project_id)}">Agregar la primera</button></div>`}
    </section>`;
  }

  function renderItemRow(item) {
    const purchases = `${item.solped ? `<span class="purchase-ref"><b>SOLPED</b> ${esc(item.solped)}</span>` : ''}${item.purchase_order ? `<span class="purchase-ref"><b>OC</b> ${esc(item.purchase_order)}</span>` : ''}` || '<span class="item-observation">Sin registro</span>';
    const people = `<b class="person-line">${esc(item.responsible || 'Sin responsable')}</b><span class="item-observation">${esc(item.supplier || 'Sin proveedor')}</span>`;
    return `<tr><td>${formatDate(item.identified_on)}</td><td><span class="item-description">${esc(item.description)}</span>${item.observations ? `<span class="item-observation">${esc(item.observations)}</span>` : ''}${item.planned_start ? `<span class="schedule-line">${formatDate(item.planned_start)} → ${formatDate(item.planned_end)} · ${durationDays(item)} días</span>` : ''}</td><td>${people}</td><td><button class="badge badge--${item.status === 'ok' ? 'ok' : 'pending'}" data-action="toggle-item" data-id="${esc(item.id)}" title="Cambiar estado">${item.status === 'ok' ? '✓ OK' : `${clamp(item.progress,0,100)}%`}</button></td><td>${purchases}</td><td><div class="row-actions"><button class="action-btn" data-action="edit-item" data-id="${esc(item.id)}" title="Editar actividad">✎</button><button class="action-btn action-btn--danger" data-action="delete-item" data-id="${esc(item.id)}" title="Eliminar actividad">×</button></div></td></tr>`;
  }

  function openProject(projectId, tab = 'gantt') {
    if (!state.data.projects.some(p => p.id === projectId)) return;
    state.selectedProjectId = projectId; state.detailTab = tab; state.ganttSearch = '';
    switchView('project-detail');
  }

  function renderProjectDetail() {
    const project = state.data.projects.find(p => p.id === state.selectedProjectId);
    if (!project) return;
    const items = state.data.items.filter(i => i.project_id === project.id), stats = projectStats(project.id);
    const scheduled = items.filter(i => i.planned_start && i.planned_end).length;
    const late = items.filter(i => scheduleStatus(i) === 'late').length;
    $('#page-title').textContent = project.name;
    $('#project-detail').innerHTML = `<section class="project-hero">
      <div><span class="project-card__code">${esc(project.code || 'SIN CÓDIGO')}</span><h2>${esc(project.name)}</h2><p>${esc(project.description || 'Sin descripción')}</p></div>
      <div class="hero-kpis"><div><strong>${stats.percent}%</strong><span>Avance promedio</span></div><div><strong>${scheduled}/${items.length}</strong><span>Programadas</span></div><div class="${late ? 'metric-alert' : ''}"><strong>${late}</strong><span>Vencidas</span></div></div>
      <div class="hero-actions"><button class="btn btn--secondary" data-action="add-area" data-project="${esc(project.id)}">＋ Área</button><button class="btn btn--secondary" data-action="edit-project" data-id="${esc(project.id)}">✎ Editar</button></div>
    </section>
    <nav class="detail-tabs" aria-label="Vistas del proyecto"><button class="detail-tab ${state.detailTab === 'gantt' ? 'active' : ''}" data-detail-tab="gantt"><span>▤</span> Cronograma Gantt</button><button class="detail-tab ${state.detailTab === 'checklist' ? 'active' : ''}" data-detail-tab="checklist"><span>✓</span> Checklist operativo</button></nav>
    <div id="detail-tab-content">${state.detailTab === 'gantt' ? renderGantt(project, items) : renderDetailChecklist(project)}</div>`;
  }

  function renderDetailChecklist(project) {
    const areas = state.data.areas.filter(a => a.project_id === project.id).sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0));
    return `<section class="detail-panel"><div class="detail-panel__head"><div><span class="eyebrow">CONTROL OPERATIVO</span><h2>Necesidades y actividades</h2></div><button class="btn btn--primary" data-action="quick-add-item" data-project="${esc(project.id)}">＋ Nueva actividad</button></div>${areas.length ? areas.map((area,index) => renderArea(area,index)).join('') : `<div class="no-results"><strong>Crea la primera área</strong><p>Las actividades se organizan por áreas o frentes de trabajo.</p><button class="btn btn--primary" data-action="add-area" data-project="${esc(project.id)}">＋ Crear área</button></div>`}</section>`;
  }

  function renderGantt(project, sourceItems) {
    const q = state.ganttSearch.trim().toLowerCase();
    const items = sourceItems.filter(i => !q || [i.description,i.supplier,i.responsible].join(' ').toLowerCase().includes(q));
    const scheduled = items.filter(i => i.planned_start && i.planned_end && i.planned_end >= i.planned_start).sort((a,b) => a.planned_start.localeCompare(b.planned_start));
    const unplanned = items.filter(i => !i.planned_start || !i.planned_end);
    const zooms = { day:38, week:24, month:11 }, pxPerDay = zooms[state.ganttZoom] || 24;
    let chart = '';
    if (scheduled.length) {
      let axisStart = scheduled.reduce((min,i) => i.planned_start < min ? i.planned_start : min, scheduled[0].planned_start);
      let axisEnd = scheduled.reduce((max,i) => i.planned_end > max ? i.planned_end : max, scheduled[0].planned_end);
      axisStart = addDays(axisStart,-2); axisEnd = addDays(axisEnd,3);
      const totalDays = diffDays(axisStart,axisEnd) + 1, width = Math.max(520,totalDays * pxPerDay);
      chart = `<div class="gantt-scroll" id="gantt-scroll"><div class="gantt-board" style="--timeline-width:${width}px;--day-width:${pxPerDay}px">
        ${renderGanttHeader(axisStart,totalDays,pxPerDay,width)}
        ${scheduled.map(item => renderGanttRow(item,axisStart,totalDays,pxPerDay,width)).join('')}
      </div></div>`;
    } else {
      chart = `<div class="gantt-empty"><div class="gantt-empty__icon">▤</div><strong>No hay actividades programadas</strong><p>Edita una actividad y asigna fecha de inicio y tiempo de ejecución.</p></div>`;
    }
    return `<section class="detail-panel gantt-panel">
      <div class="gantt-toolbar"><div><span class="eyebrow">PLAN DE EJECUCIÓN</span><h2>Cronograma del proyecto</h2></div><label class="gantt-search"><span>⌕</span><input id="gantt-search" value="${esc(state.ganttSearch)}" placeholder="Buscar actividad, responsable o proveedor"></label><div class="zoom-control" aria-label="Escala del cronograma"><button data-zoom="day" class="${state.ganttZoom === 'day' ? 'active' : ''}">Día</button><button data-zoom="week" class="${state.ganttZoom === 'week' ? 'active' : ''}">Semana</button><button data-zoom="month" class="${state.ganttZoom === 'month' ? 'active' : ''}">Mes</button></div><button class="btn btn--primary" data-action="quick-add-item" data-project="${esc(project.id)}">＋ Actividad</button></div>
      <div class="gantt-legend"><span><i class="legend-complete"></i>Terminado</span><span><i class="legend-active"></i>En ejecución</span><span><i class="legend-late"></i>Vencido</span><span><i class="legend-future"></i>Por iniciar</span><small>Desliza el control de cada actividad para actualizar el avance.</small></div>
      ${chart}
      ${unplanned.length ? `<section class="unplanned"><div class="unplanned__title"><div><span class="eyebrow">SIN PROGRAMAR</span><h3>Actividades que requieren fecha</h3></div><span class="count-pill">${unplanned.length}</span></div><div class="unplanned-grid">${unplanned.map(i => `<article><div><b>${esc(i.description)}</b><small>${esc(i.responsible || 'Sin responsable')} · ${esc(i.supplier || 'Sin proveedor')}</small></div><button class="btn btn--secondary" data-action="edit-item" data-id="${esc(i.id)}">Programar →</button></article>`).join('')}</div></section>` : ''}
    </section>`;
  }

  function renderGanttHeader(axisStart,totalDays,pxPerDay,width) {
    const monthGroups = [];
    for (let i=0;i<totalDays;i++) {
      const date = parseDate(addDays(axisStart,i)), key = `${date.getFullYear()}-${date.getMonth()}`;
      const last = monthGroups[monthGroups.length-1];
      if (last?.key === key) last.days += 1; else monthGroups.push({ key, days:1, label:MONTH_FORMAT.format(date) });
    }
    const ticks = [];
    for (let i=0;i<totalDays;i++) {
      const date = parseDate(addDays(axisStart,i));
      const show = state.ganttZoom === 'day' || (state.ganttZoom === 'week' && (date.getDay() === 1 || i === 0)) || (state.ganttZoom === 'month' && (date.getDate() === 1 || date.getDate() === 15 || i === 0));
      if (show) ticks.push(`<span style="left:${i*pxPerDay}px;width:${state.ganttZoom === 'day' ? pxPerDay : Math.max(pxPerDay,46)}px">${state.ganttZoom === 'day' ? `${String(date.getDate()).padStart(2,'0')}<small>${['D','L','M','M','J','V','S'][date.getDay()]}</small>` : String(date.getDate()).padStart(2,'0')}</span>`);
    }
    return `<div class="gantt-header"><div class="gantt-info gantt-info--head"><span>Actividad / avance</span><span>Proveedor</span><span>Responsable</span><span>Tiempo</span></div><div class="gantt-axis" style="width:${width}px"><div class="gantt-months">${monthGroups.map(g => `<span style="width:${g.days*pxPerDay}px">${esc(g.label)}</span>`).join('')}</div><div class="gantt-ticks">${ticks.join('')}</div></div></div>`;
  }

  function renderGanttRow(item,axisStart,totalDays,pxPerDay,width) {
    const left = diffDays(axisStart,item.planned_start) * pxPerDay;
    const days = durationDays(item), barWidth = Math.max(pxPerDay,days * pxPerDay);
    const status = scheduleStatus(item), progress = clamp(item.progress,0,100);
    const todayOffset = diffDays(axisStart,isoDate()) * pxPerDay;
    const todayLine = todayOffset >= 0 && todayOffset <= width ? `<i class="today-line" style="left:${todayOffset}px" title="Hoy"></i>` : '';
    return `<div class="gantt-row" data-gantt-row="${esc(item.id)}"><div class="gantt-info"><div class="gantt-task"><button class="task-name" data-action="edit-item" data-id="${esc(item.id)}">${esc(item.description)}</button><div class="gantt-progress-control"><input type="range" min="0" max="100" step="5" value="${progress}" data-progress-id="${esc(item.id)}" aria-label="Avance de ${esc(item.description)}"><output>${progress}%</output></div></div><span title="${esc(item.supplier || 'Sin proveedor')}">${esc(item.supplier || '—')}</span><span title="${esc(item.responsible || 'Sin responsable')}">${esc(item.responsible || '—')}</span><span>${days} días</span></div><div class="gantt-timeline" style="width:${width}px">${todayLine}<button class="gantt-bar gantt-bar--${status}" style="left:${left}px;width:${barWidth}px" data-action="edit-item" data-id="${esc(item.id)}" title="${esc(item.description)} · ${progress}%"><span style="width:${progress}%"></span><b>${progress}%</b></button></div></div>`;
  }

  function emptyState(title,text) { return `<div class="no-results"><strong>${esc(title)}</strong><p>${esc(text)}</p></div>`; }

  function switchView(view) {
    state.view = view;
    $$('.view').forEach(el => el.classList.add('hidden'));
    $(`#${view}-view`).classList.remove('hidden');
    $$('.nav-link').forEach(el => el.classList.toggle('active', el.dataset.view === view || (view === 'project-detail' && el.dataset.view === 'projects')));
    if (view === 'dashboard') $('#page-title').textContent = 'Resumen de avance';
    if (view === 'projects') $('#page-title').textContent = 'Proyectos y necesidades';
    if (view === 'project-detail') renderProjectDetail();
    renderHeader();
  }

  function field(label,name,value = '',opts = {}) {
    const full = opts.full ? ' full' : '', required = opts.required ? ' required' : '', optional = opts.required ? '' : ' <span class="optional">(opcional)</span>';
    const attrs = [opts.min !== undefined ? `min="${esc(opts.min)}"` : '',opts.max !== undefined ? `max="${esc(opts.max)}"` : '',opts.step !== undefined ? `step="${esc(opts.step)}"` : '',opts.readonly ? 'readonly' : ''].filter(Boolean).join(' ');
    if (opts.type === 'textarea') return `<label class="${full.trim()}">${label}${optional}<textarea name="${name}"${required} placeholder="${esc(opts.placeholder || '')}">${esc(value)}</textarea>${opts.help ? `<span class="field-help">${esc(opts.help)}</span>` : ''}</label>`;
    if (opts.type === 'select') return `<label class="${full.trim()}">${label}${optional}<select name="${name}"${required}>${opts.options.map(o => `<option value="${esc(o.value)}"${String(o.value) === String(value) ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select></label>`;
    return `<label class="${full.trim()}">${label}${optional}<input name="${name}" type="${opts.type || 'text'}" value="${esc(value)}"${required} ${attrs} placeholder="${esc(opts.placeholder || '')}">${opts.help ? `<span class="field-help">${esc(opts.help)}</span>` : ''}</label>`;
  }

  function openForm(entity,id = null,context = {}) {
    const record = id ? state.data[entity === 'item' ? 'items' : `${entity}s`].find(x => x.id === id) : null;
    state.editing = { entity,id,context }; $('#form-error').textContent = '';
    $('#modal-eyebrow').textContent = id ? 'ACTUALIZAR REGISTRO' : 'NUEVO REGISTRO';
    $('#modal-title').textContent = `${id ? 'Editar' : 'Crear'} ${entity === 'project' ? 'proyecto' : entity === 'area' ? 'área' : 'actividad'}`;
    $('#form-submit').textContent = id ? 'Guardar cambios' : 'Crear';
    if (entity === 'project') {
      $('#form-fields').innerHTML = [
        field('Nombre','name',record?.name,{required:true,placeholder:'Ej. Rehabilitación'}),
        field('Código','code',record?.code,{placeholder:'Ej. PRY-001'}),
        field('Descripción','description',record?.description,{type:'textarea',full:true,placeholder:'Objetivo o alcance del proyecto'}),
        field('Estado','status',record?.status || 'active',{type:'select',required:true,options:[{value:'active',label:'Activo'},{value:'closed',label:'Cerrado'}]})
      ].join('');
    } else if (entity === 'area') {
      const projectId = record?.project_id || context.projectId;
      $('#form-fields').innerHTML = [
        field('Proyecto','project_id',projectId,{type:'select',required:true,options:state.data.projects.map(p => ({value:p.id,label:p.name}))}),
        field('Nombre del área','name',record?.name,{required:true,placeholder:'Ej. Ejecución técnica'}),
        field('Descripción','description',record?.description,{type:'textarea',full:true,placeholder:'Alcance del área o frente'}),
        field('Orden','sort_order',record?.sort_order || 1,{type:'number',min:1,help:'Posición dentro del proyecto'})
      ].join('');
    } else {
      const projectId = record?.project_id || context.projectId;
      let areaId = record?.area_id || context.areaId;
      const projectAreas = state.data.areas.filter(a => a.project_id === projectId);
      if (!areaId) areaId = projectAreas[0]?.id || '';
      const days = durationDays(record || {});
      $('#form-fields').innerHTML = [
        field('Área','area_id',areaId,{type:'select',required:true,options:projectAreas.map(a => ({value:a.id,label:a.name}))}),
        field('Fecha de identificación','identified_on',record?.identified_on || isoDate(),{type:'date',required:true}),
        field('Actividad / necesidad','description',record?.description,{required:true,full:true,placeholder:'¿Qué debe realizarse?'}),
        field('Responsable','responsible',record?.responsible,{placeholder:'Nombre del responsable'}),
        field('Proveedor','supplier',record?.supplier,{placeholder:'Empresa o contratista'}),
        field('Fecha de inicio','planned_start',record?.planned_start,{type:'date'}),
        field('Tiempo de ejecución','duration_days',days || '',{type:'number',min:1,placeholder:'Días calendario',help:'Días calendario; la fecha final se calcula automáticamente.'}),
        field('Fecha de terminación','planned_end',record?.planned_end,{type:'date',help:'También puedes ajustarla directamente.'}),
        field('Avance','progress',record?.progress ?? 0,{type:'number',min:0,max:100,step:5,required:true,help:'Porcentaje entre 0 y 100.'}),
        field('Estado','status',record?.status || 'pending',{type:'select',required:true,options:[{value:'pending',label:'Pendiente'},{value:'ok',label:'OK / terminado'}]}),
        field('SOLPED','solped',record?.solped,{placeholder:'Número de solicitud'}),
        field('Orden de compra (OC)','purchase_order',record?.purchase_order,{placeholder:'Número de OC'}),
        field('Observaciones','observations',record?.observations,{type:'textarea',full:true,placeholder:'Contexto, bloqueo o siguiente paso'})
      ].join('');
      bindScheduleFields();
    }
    $('#form-dialog').showModal();
    setTimeout(() => $('#form-fields input, #form-fields select, #form-fields textarea')?.focus(),30);
  }

  function bindScheduleFields() {
    const start = $('[name="planned_start"]'), duration = $('[name="duration_days"]'), end = $('[name="planned_end"]');
    const fromDuration = () => { const n = Number(duration.value); if (start.value && n > 0) end.value = addDays(start.value,n-1); };
    const fromEnd = () => { if (start.value && end.value && end.value >= start.value) duration.value = diffDays(start.value,end.value)+1; };
    start?.addEventListener('change', () => duration.value ? fromDuration() : fromEnd());
    duration?.addEventListener('input',fromDuration); end?.addEventListener('change',fromEnd);
  }

  function quickAddItem(projectId) {
    const areas = state.data.areas.filter(a => a.project_id === projectId).sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0));
    if (!areas.length) { toast('Primero crea un área para organizar las actividades.','error'); openForm('area',null,{projectId}); return; }
    openForm('item',null,{ projectId,areaId:areas[0].id });
  }

  async function saveForm(event) {
    event.preventDefault();
    const { entity,id,context } = state.editing;
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      if (entity === 'project') {
        data.code = data.code.trim(); data.name = data.name.trim(); data.description = data.description.trim();
        if (!data.name) throw new Error('El nombre del proyecto es obligatorio.');
        id ? await service.update('projects',id,data) : await service.create('projects',data);
      } else if (entity === 'area') {
        data.name = data.name.trim(); data.description = data.description.trim(); data.sort_order = Number(data.sort_order) || 1;
        if (!data.name || !data.project_id) throw new Error('El proyecto y el nombre del área son obligatorios.');
        id ? await service.update('areas',id,data) : await service.create('areas',data);
      } else {
        const area = state.data.areas.find(a => a.id === data.area_id);
        data.project_id = area?.project_id || context.projectId;
        ['description','observations','solped','purchase_order','supplier','responsible'].forEach(key => data[key] = (data[key] || '').trim());
        data.progress = clamp(data.progress,0,100);
        if (!data.description || !data.identified_on || !data.area_id) throw new Error('Área, fecha y actividad son obligatorias.');
        if ((data.planned_start && !data.planned_end) || (!data.planned_start && data.planned_end)) throw new Error('Completa fecha de inicio y tiempo de ejecución, o deja ambas fechas vacías.');
        if (data.planned_start && data.planned_end < data.planned_start) throw new Error('La fecha final no puede ser anterior a la fecha de inicio.');
        if (data.progress === 100 || data.status === 'ok') { data.progress = 100; data.status = 'ok'; }
        else data.status = 'pending';
        delete data.duration_days;
        id ? await service.update('items',id,data) : await service.create('items',data);
      }
      $('#form-dialog').close(); renderApp(); toast(id ? 'Registro actualizado.' : 'Registro creado.');
    } catch (error) { $('#form-error').textContent = error.message; }
  }

  function askDelete(entity,id) {
    const table = entity === 'project' ? 'projects' : entity === 'area' ? 'areas' : 'items';
    const record = state.data[table].find(x => x.id === id), label = record?.name || record?.description || 'este registro';
    let detail = 'Esta acción no se puede deshacer.';
    if (entity === 'project') detail = 'También se eliminarán todas sus áreas y actividades. Esta acción no se puede deshacer.';
    if (entity === 'area') detail = 'También se eliminarán todas sus actividades. Esta acción no se puede deshacer.';
    state.pendingDelete = { table,id }; $('#confirm-title').textContent = `Eliminar “${label}”`; $('#confirm-message').textContent = detail; $('#confirm-dialog').showModal();
  }

  async function confirmDelete(event) {
    event.preventDefault(); if (!state.pendingDelete) return;
    try {
      const deletingProject = state.pendingDelete.table === 'projects' && state.pendingDelete.id === state.selectedProjectId;
      await service.remove(state.pendingDelete.table,state.pendingDelete.id);
      $('#confirm-dialog').close(); state.pendingDelete = null;
      if (deletingProject) { state.selectedProjectId = null; switchView('projects'); }
      renderApp(); toast('Registro eliminado.');
    } catch (error) { toast(error.message,'error'); }
  }

  async function toggleItem(id) {
    const item = state.data.items.find(i => i.id === id); if (!item) return;
    const done = !(item.status === 'ok' || item.progress === 100);
    try { await service.update('items',id,{ status:done ? 'ok' : 'pending', progress:done ? 100 : 0 }); renderApp(); toast('Estado actualizado.'); }
    catch (error) { toast(error.message,'error'); }
  }

  async function updateProgress(id,value) {
    const progress = clamp(value,0,100), item = state.data.items.find(i => i.id === id); if (!item) return;
    try { await service.update('items',id,{ progress,status:progress === 100 ? 'ok' : 'pending' }); renderApp(); toast(`Avance actualizado a ${progress}%.`); }
    catch (error) { toast(error.message,'error'); renderApp(); }
  }

  function exportCsv() {
    const scope = state.view === 'project-detail' ? state.data.items.filter(i => i.project_id === state.selectedProjectId) : state.data.items;
    const headers = ['Proyecto','Código','Área','Identificada','Actividad','Estado','Avance %','Responsable','Proveedor','Inicio','Fin','Tiempo de ejecución (días)','Observaciones','SOLPED','OC'];
    const rows = scope.map(item => {
      const project = state.data.projects.find(p => p.id === item.project_id), area = state.data.areas.find(a => a.id === item.area_id);
      return [project?.name,project?.code,area?.name,item.identified_on,item.description,item.status === 'ok' ? 'OK' : 'Pendiente',item.progress,item.responsible,item.supplier,item.planned_start,item.planned_end,durationDays(item),item.observations,item.solped,item.purchase_order];
    });
    const csvCell = value => `"${String(value ?? '').replace(/"/g,'""')}"`;
    const csv = '\uFEFF' + [headers,...rows].map(row => row.map(csvCell).join(';')).join('\r\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    link.download = `${state.view === 'project-detail' ? 'cronograma-proyecto' : 'bitacora-proyectos'}-${isoDate()}.csv`; link.click(); URL.revokeObjectURL(link.href); toast('Archivo CSV generado.');
  }

  function handleAction(target) {
    const action = target.dataset.action;
    if (action === 'collapse') target.closest('.project-block').classList.toggle('collapsed');
    if (action === 'open-project') openProject(target.dataset.id);
    if (action === 'edit-project') openForm('project',target.dataset.id);
    if (action === 'delete-project') askDelete('project',target.dataset.id);
    if (action === 'add-area') openForm('area',null,{projectId:target.dataset.project});
    if (action === 'edit-area') openForm('area',target.dataset.id);
    if (action === 'delete-area') askDelete('area',target.dataset.id);
    if (action === 'quick-add-item') quickAddItem(target.dataset.project);
    if (action === 'add-item') openForm('item',null,{areaId:target.dataset.area,projectId:target.dataset.project});
    if (action === 'edit-item') openForm('item',target.dataset.id);
    if (action === 'delete-item') askDelete('item',target.dataset.id);
    if (action === 'toggle-item') toggleItem(target.dataset.id);
  }

  function bindEvents() {
    $$('.nav-link').forEach(btn => btn.addEventListener('click',() => switchView(btn.dataset.view)));
    $('[data-go-projects]').addEventListener('click',() => switchView('projects'));
    $('#detail-back-btn').addEventListener('click',() => switchView('projects'));
    $('#add-project-btn').addEventListener('click',() => state.view === 'project-detail' ? quickAddItem(state.selectedProjectId) : openForm('project'));
    $('#export-btn').addEventListener('click',exportCsv); $('#entity-form').addEventListener('submit',saveForm); $('#confirm-delete-btn').addEventListener('click',confirmDelete);
    $('#search-input').addEventListener('input',e => { state.filters.search = e.target.value; renderProjects(); });
    $('#project-filter').addEventListener('change',e => { state.filters.project = e.target.value; renderProjects(); });
    $('#status-filter').addEventListener('change',e => { state.filters.status = e.target.value; renderProjects(); });
    $('#purchase-filter').addEventListener('change',e => { state.filters.purchase = e.target.value; renderProjects(); });
    $('#clear-filters-btn').addEventListener('click',() => { state.filters = {search:'',project:'all',status:'all',purchase:'all'}; $('#search-input').value=''; $('#project-filter').value='all'; $('#status-filter').value='all'; $('#purchase-filter').value='all'; renderProjects(); });
    $('#project-cards').addEventListener('click',e => { const card = e.target.closest('[data-open-project]'); if (card) openProject(card.dataset.openProject); });
    $('#project-cards').addEventListener('keydown',e => { const card = e.target.closest('[data-open-project]'); if (card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openProject(card.dataset.openProject); } });
    $('#project-list').addEventListener('click',e => { const target = e.target.closest('[data-action]'); if (target) handleAction(target); });
    $('#project-detail').addEventListener('click',e => {
      const tab = e.target.closest('[data-detail-tab]');
      if (tab) { state.detailTab = tab.dataset.detailTab; renderProjectDetail(); return; }
      const zoom = e.target.closest('[data-zoom]');
      if (zoom) { state.ganttZoom = zoom.dataset.zoom; renderProjectDetail(); return; }
      const target = e.target.closest('[data-action]'); if (target) handleAction(target);
    });
    $('#project-detail').addEventListener('input',e => {
      if (e.target.id === 'gantt-search') { state.ganttSearch = e.target.value; renderProjectDetail(); const input = $('#gantt-search'); input?.focus(); input?.setSelectionRange(input.value.length,input.value.length); }
      if (e.target.matches('[data-progress-id]')) {
        const row = e.target.closest('[data-gantt-row]'), value = e.target.value;
        row?.querySelector('output')?.replaceChildren(document.createTextNode(`${value}%`));
        const fill = row?.querySelector('.gantt-bar > span'); if (fill) fill.style.width = `${value}%`;
        const label = row?.querySelector('.gantt-bar b'); if (label) label.textContent = `${value}%`;
      }
    });
    $('#project-detail').addEventListener('change',e => { if (e.target.matches('[data-progress-id]')) updateProgress(e.target.dataset.progressId,e.target.value); });
    $('#logout-btn').addEventListener('click',async () => {
      if (DEMO) { if (confirm('¿Reiniciar todos los datos de demostración?')) { await service.reset(); state.selectedProjectId = null; switchView('dashboard'); renderApp(); toast('Demostración reiniciada.'); } }
      else { service.clearSession(); location.reload(); }
    });
    $('#auth-form').addEventListener('submit',async e => {
      e.preventDefault(); $('#auth-error').textContent=''; const submit = e.currentTarget.querySelector('[type=submit]'); submit.disabled=true; submit.textContent='Ingresando…';
      try { await service.signIn($('#auth-email').value,$('#auth-password').value); await enterApp(); }
      catch (error) { $('#auth-error').textContent=error.message; }
      finally { submit.disabled=false; submit.textContent='Ingresar'; }
    });
    $('#signup-btn').addEventListener('click',async () => {
      $('#auth-error').textContent=''; const email=$('#auth-email').value,password=$('#auth-password').value;
      if (!email || password.length < 6) { $('#auth-error').textContent='Ingresa un correo válido y una contraseña de mínimo 6 caracteres.'; return; }
      try { const result=await service.signUp(email,password); if (result.access_token) await enterApp(); else toast('Cuenta creada. Revisa tu correo para confirmarla.'); }
      catch (error) { $('#auth-error').textContent=error.message; }
    });
  }

  async function enterApp() {
    try { await service.init(); $('#auth-screen').classList.add('hidden'); $('#app').classList.remove('hidden'); renderApp(); }
    catch (error) { if (!DEMO) service.clearSession(); $('#auth-screen').classList.remove('hidden'); $('#app').classList.add('hidden'); $('#auth-error').textContent=error.message; }
  }

  async function boot() {
    bindEvents();
    if (DEMO) return enterApp();
    const restored = await service.restoreSession();
    if (restored) await enterApp(); else { $('#auth-screen').classList.remove('hidden'); $('#app').classList.add('hidden'); }
  }

  boot();
})();
