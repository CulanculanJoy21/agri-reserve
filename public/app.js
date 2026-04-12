/* ============================================================
   AgriReserve — Farm Equipment Management System
   app.js | Full frontend — 100% Live API, no mock data
   ============================================================ */

// ==================== API CONFIG ====================
const API = {
  BASE_URL: 'https://agri-reserve-main-cmvorm.free.laravel.cloud/api',
  TOKEN: localStorage.getItem('auth_token') || null,

  headers() {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(this.TOKEN ? { 'Authorization': `Bearer ${this.TOKEN}` } : {})
    };
  },

  async get(endpoint) {
    try {
      const res = await fetch(`${this.BASE_URL}${endpoint}`, { headers: this.headers() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.warn(`API GET ${endpoint} failed`, e.message);
      return null;
    }
  },

  async post(endpoint, data) {
    try {
      const res = await fetch(`${this.BASE_URL}${endpoint}`, {
        method: 'POST', headers: this.headers(), body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.warn(`API POST ${endpoint} failed`, e.message);
      return null;
    }
  },

  async put(endpoint, data) {
    try {
      const res = await fetch(`${this.BASE_URL}${endpoint}`, {
        method: 'PUT', headers: this.headers(), body: JSON.stringify(data)
      });
      return await res.json();
    } catch (e) {
      console.warn(`API PUT ${endpoint} failed`, e.message);
      return null;
    }
  },

  async del(endpoint) {
    try {
      const res = await fetch(`${this.BASE_URL}${endpoint}`, {
        method: 'DELETE', headers: this.headers()
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }
};

// ==================== HELPERS ====================
function statusBadge(status) {
  const map = {
    available: 'badge-green', reserved: 'badge-orange', maintenance: 'badge-red',
    pending: 'badge-yellow', approved: 'badge-green', assigned:   'badge-blue', rejected: 'badge-red',
    completed: 'badge-blue', in_transit: 'badge-orange', delivered: 'badge-green',
    farmer: 'badge-blue', driver: 'badge-purple', admin: 'badge-gray',
    pickup: 'badge-blue', delivery: 'badge-purple'
  };
  if (!status) return '';
  return `<span class="badge ${map[status] || 'badge-gray'}">${status.replace('_', ' ')}</span>`;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  setTimeout(() => t.className = 'toast', 3000);
}

function openModal(title, body) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = body;
  document.getElementById('modal').classList.add('open');
  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
  document.getElementById('modal-overlay').classList.remove('open');
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('collapsed');
}

function toggleNotifs() {
  const dropdown = document.getElementById('notif-dropdown');
  dropdown.classList.toggle('open');
  if (dropdown.classList.contains('open')) {
    loadNotifications();
    
  }
}
function getDismissed() {
  return JSON.parse(localStorage.getItem('dismissed_notifs') || '[]');
}

function saveDismissed(list) {
  localStorage.setItem('dismissed_notifs', JSON.stringify(list));
}

function dismissNotif(key) {
  const dismissed = getDismissed();
  if (!dismissed.includes(key)) dismissed.push(key);
  saveDismissed(dismissed);
  loadNotifications();
}

function clearAllNotifs() {
  // Save all current notif keys as dismissed
  if (window._notifs) {
    const keys = window._notifs.map(n => n.key);
    saveDismissed(keys);
  }
  const list = document.getElementById('notif-list');
  if (list) list.innerHTML = '<div class="notif-item">No new notifications</div>';
  const badge = document.getElementById('notif-count');
  if (badge) badge.style.display = 'none';
  toggleNotifs();
}

function showLoading() {
  document.getElementById('content').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:16px;padding-top:8px">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px">
        ${[1,2,3,4].map(() => `
          <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;animation:pulse 1.5s infinite">
            <div style="height:12px;background:var(--border);border-radius:4px;width:60%;margin-bottom:12px"></div>
            <div style="height:32px;background:var(--border);border-radius:4px;width:40%;margin-bottom:8px"></div>
            <div style="height:10px;background:var(--border);border-radius:4px;width:80%"></div>
          </div>
        `).join('')}
      </div>
      <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;animation:pulse 1.5s infinite">
        <div style="height:14px;background:var(--border);border-radius:4px;width:30%;margin-bottom:16px"></div>
        <div style="height:200px;background:var(--border);border-radius:4px;"></div>
      </div>
    </div>
  `;
}

// ==================== NAVIGATION ====================
let currentPage = 'dashboard';

function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  const titles = {
    dashboard: 'Dashboard', equipment: 'Equipment', reservations: 'Reservations',
    deliveries: 'Deliveries', maintenance: 'Maintenance', farmers: 'Farmers',
    drivers: 'Drivers', feedback: 'Feedback & Ratings', reports: 'Reports', settings: 'Settings'
  };
  document.getElementById('page-title').textContent = titles[page] || page;
  document.getElementById('content').innerHTML = '';
  pages[page]();
  document.getElementById('notif-dropdown').classList.remove('open');
}

async function globalSearch(val) {
  if (val.length < 2) return;
  const [equipment, reservations, farmers] = await Promise.all([
    API.get(`/equipment?search=${val}`),
    API.get(`/reservations`),
    API.get(`/farmers?search=${val}`),
  ]);
  const equipResults  = (equipment || []).filter(e => e.equipment_name.toLowerCase().includes(val.toLowerCase()));
  const resResults    = (reservations || []).filter(r =>
    r.farmer?.name.toLowerCase().includes(val.toLowerCase()) ||
    r.equipment?.equipment_name.toLowerCase().includes(val.toLowerCase())
  );
  const farmerResults = (farmers || []).filter(f => f.name.toLowerCase().includes(val.toLowerCase()));
  const total = equipResults.length + resResults.length + farmerResults.length;
  if (total === 0) { showToast(`No results for "${val}"`, 'info'); return; }
  openModal(`Search Results for "${val}"`, `
    ${equipResults.length ? `
      <div class="section-divider">Equipment (${equipResults.length})</div>
      ${equipResults.map(e => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="closeModal();navigate('equipment')">
          <div><strong>${e.equipment_name}</strong><div style="font-size:12px;color:var(--text3)">${e.category} · ${e.location}</div></div>
          <div style="display:flex;gap:8px;align-items:center"><span style="color:var(--accent);font-weight:700">₱${e.rental_price}/day</span>${statusBadge(e.status)}</div>
        </div>`).join('')}
    ` : ''}
    ${farmerResults.length ? `
      <div class="section-divider">Farmers (${farmerResults.length})</div>
      ${farmerResults.map(f => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="closeModal();viewUser(${f.id})">
          <div style="display:flex;align-items:center;gap:10px">
            <div class="admin-avatar" style="width:28px;height:28px;font-size:12px">${f.name[0]}</div>
            <div><strong>${f.name}</strong><div style="font-size:12px;color:var(--text3)">${f.email}</div></div>
          </div>
          <span class="badge badge-blue">${f.reservations_count} reservations</span>
        </div>`).join('')}
    ` : ''}
    ${resResults.length ? `
      <div class="section-divider">Reservations (${resResults.length})</div>
      ${resResults.map(r => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="closeModal();viewReservation(${r.reservation_id})">
          <div><strong>${r.farmer?.name || '—'}</strong><div style="font-size:12px;color:var(--text3)">${r.equipment?.equipment_name || '—'} · ${formatDate(r.start_date)}</div></div>
          <div style="display:flex;gap:6px">${statusBadge(r.status)}${statusBadge(r.reservation_type)}</div>
        </div>`).join('')}
    ` : ''}
    <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Close</button></div>
  `);
}

async function showLogout() {
  if (confirm('Log out of AgriReserve Admin?')) {
    try { await API.post('/auth/logout', {}); } catch(e) {}
    localStorage.removeItem('auth_token');
    API.TOKEN = null;
    const existing = document.getElementById('login-page');
    if (existing) existing.remove();
    showLoginPage();
    showToast('Logged out successfully', 'info');
  }
}

// ==================== PAGES ====================
const pages = {};

// ---- DASHBOARD ----
pages.dashboard = async function () {
  showLoading();
  const [equipment, reservations, deliveries, reportData] = await Promise.all([
    API.get('/equipment'),
    API.get('/reservations'),
    API.get('/deliveries'),
    API.get('/reports/reservations'),
  ]);

  const equipList  = equipment    || [];
  const resList    = reservations || [];
  const delList    = deliveries   || [];

  const totalEquip = equipList.length;
  const available  = equipList.filter(e => e.status === 'available').length;
  const reserved   = equipList.filter(e => e.status === 'reserved').length;
  const maintCount = equipList.filter(e => e.status === 'maintenance').length;
  const pendingRes = resList.filter(r => r.status === 'pending').length;
  const totalRes   = resList.length;
  const inTransit  = delList.filter(d => d.delivery_status === 'in_transit').length;

  const monthly     = (reportData || {}).monthly || [];
  const months      = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthlyData = months.map((_, i) => {
    const found = monthly.find(m => parseInt(m.month) === i + 1);
    return found ? parseInt(found.count) : 0;
  });
  const maxVal    = Math.max(...monthlyData, 1);
  const recentRes = [...resList].reverse().slice(0, 5);

  document.getElementById('content').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card green">
        <div class="stat-icon">⚙️</div>
        <div class="stat-label">Total Equipment</div>
        <div class="stat-value">${totalEquip}</div>
        <div class="stat-change">${available} currently available</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-icon">📋</div>
        <div class="stat-label">Pending Reservations</div>
        <div class="stat-value">${pendingRes}</div>
        <div class="stat-change">${totalRes} total</div>
      </div>
      <div class="stat-card blue">
        <div class="stat-icon">🚚</div>
        <div class="stat-label">Active Deliveries</div>
        <div class="stat-value">${inTransit}</div>
        <div class="stat-change">In transit right now</div>
      </div>
      <div class="stat-card red">
        <div class="stat-icon">🔧</div>
        <div class="stat-label">Under Maintenance</div>
        <div class="stat-value">${maintCount}</div>
        <div class="stat-change">${totalEquip - maintCount} units operational</div>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom:20px">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Monthly Reservations</span>
          <span style="font-size:12px;color:var(--text3)">${new Date().getFullYear()}</span>
        </div>
        <div class="bar-chart">
          ${monthlyData.map((v,i) => `
            <div class="bar-wrap">
              <div class="bar" style="height:${Math.round((v/maxVal)*140)}px" title="${v} reservations"></div>
              <span class="bar-label">${months[i]}</span>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Equipment Status</span></div>
        <div style="display:flex;flex-direction:column;gap:14px;padding-top:8px">
          <div>
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px">
              <span>Available</span><strong style="color:var(--accent)">${available}/${totalEquip}</strong>
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width:${totalEquip ? Math.round(available/totalEquip*100) : 0}%"></div></div>
          </div>
          <div>
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px">
              <span>Reserved</span><strong style="color:var(--orange)">${reserved}/${totalEquip}</strong>
            </div>
            <div class="progress-bar"><div class="progress-fill orange" style="width:${totalEquip ? Math.round(reserved/totalEquip*100) : 0}%"></div></div>
          </div>
          <div>
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px">
              <span>Maintenance</span><strong style="color:var(--red)">${maintCount}/${totalEquip}</strong>
            </div>
            <div class="progress-bar"><div class="progress-fill red" style="width:${totalEquip ? Math.round(maintCount/totalEquip*100) : 0}%"></div></div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Recent Reservations</span>
          <button class="btn btn-ghost btn-sm" onclick="navigate('reservations')">View All</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Farmer</th><th>Equipment</th><th>Type</th><th>Status</th></tr></thead>
            <tbody>
              ${recentRes.length ? recentRes.map(r => `<tr>
                <td><strong>${r.farmer ? r.farmer.name : '—'}</strong></td>
                <td>${r.equipment ? r.equipment.equipment_name : '—'}</td>
                <td>${statusBadge(r.reservation_type)}</td>
                <td>${statusBadge(r.status)}</td>
              </tr>`).join('') : '<tr><td colspan="4"><div class="empty-state">No reservations yet</div></td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title">Active Deliveries</span>
          <button class="btn btn-ghost btn-sm" onclick="navigate('deliveries')">View All</button>
        </div>
        <div class="delivery-track">
          ${delList.length ? delList.slice(0,4).map(d => {
            const isDone   = d.delivery_status === 'delivered';
            const isActive = d.delivery_status === 'in_transit';
            return `<div class="track-step ${isDone?'done':''} ${isActive?'active':''}">
              <div class="track-dot">${isDone?'✓':isActive?'→':'·'}</div>
              <div class="track-info">
                <strong>${d.reservation?.equipment?.equipment_name || 'Equipment'} → ${d.reservation?.farmer?.name || 'Farmer'}</strong>
                <span>${d.driver ? 'Driver: '+d.driver.name : 'Unassigned'} · ₱${d.delivery_fee} · ${d.distance_km}km</span>
                <div style="margin-top:2px">${statusBadge(d.delivery_status)}</div>
              </div>
            </div>`;
          }).join('') : '<div class="empty-state">No deliveries yet</div>'}
        </div>
      </div>
    </div>
  `;
};

// ---- EQUIPMENT ----
pages.equipment = async function (filter = 'all') {
  showLoading();
  const equipment = await API.get('/equipment') || [];
  let list = [...equipment];
  if (filter !== 'all') list = list.filter(e => e.status === filter);

  const all   = equipment.length;
  const avail = equipment.filter(e => e.status === 'available').length;
  const res   = equipment.filter(e => e.status === 'reserved').length;
  const maint = equipment.filter(e => e.status === 'maintenance').length;

  document.getElementById('content').innerHTML = `
    <div class="page-header">
      <div><div class="page-heading">Equipment</div><div class="page-sub">Manage all farm equipment inventory</div></div>
      <button class="btn btn-primary" onclick="showAddEquipment()">＋ Add Equipment</button>
    </div>
    <div class="tabs">
      <button class="tab-btn ${filter==='all'?'active':''}" onclick="pages.equipment('all')">All (${all})</button>
      <button class="tab-btn ${filter==='available'?'active':''}" onclick="pages.equipment('available')">Available (${avail})</button>
      <button class="tab-btn ${filter==='reserved'?'active':''}" onclick="pages.equipment('reserved')">Reserved (${res})</button>
      <button class="tab-btn ${filter==='maintenance'?'active':''}" onclick="pages.equipment('maintenance')">Maintenance (${maint})</button>
    </div>
    <div class="equipment-grid">
      ${list.length ? list.map(e => `
        <div class="equip-card">
          <div class="equip-img">⚙️</div>
          <div class="equip-body">
            <div class="equip-name">${e.equipment_name}</div>
            <div class="equip-cat">${e.category} · ${e.location || '—'}</div>
            <div>${statusBadge(e.status)}</div>
            <div class="equip-meta" style="margin-top:10px">
              <span class="equip-price">₱${e.rental_price.toLocaleString()}/day</span>
            </div>
            <p style="font-size:12px;color:var(--text3);margin-top:6px">${e.description || ''}</p>
            <div class="equip-actions">
              <button class="btn btn-ghost btn-sm" onclick="showEditEquipment(${e.equipment_id})">✏ Edit</button>
              <button class="btn btn-ghost btn-sm" onclick="showEquipMaintenance(${e.equipment_id})">🔧 Maintenance</button>
              <button class="btn btn-danger btn-sm" onclick="deleteEquipment(${e.equipment_id})">✕</button>
            </div>
          </div>
        </div>
      `).join('') : '<div class="empty-state"><div class="empty-icon">⚙️</div>No equipment found</div>'}
    </div>
  `;
};

function showAddEquipment() {
  openModal('Add New Equipment', `
    <div class="form-row">
      <div class="form-group"><label>Equipment Name</label><input class="form-control" id="eq-name" placeholder="e.g. Kubota Tractor"/></div>
      <div class="form-group">
        <label>Category</label>
        <select class="form-control" id="eq-cat">
          <option>Tractor</option><option>Plow</option><option>Rotavator</option>
          <option>Transplanter</option><option>Sprayer</option><option>Harvester</option>
          <option>Grain Dryer</option><option>Trailer</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label>Description</label><textarea class="form-control" id="eq-desc" placeholder="Equipment details..."></textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Rental Price (₱/day)</label><input class="form-control" type="number" id="eq-price" placeholder="0"/></div>
      <div class="form-group"><label>Storage Location</label><input class="form-control" id="eq-loc" placeholder="e.g. Main Shed A"/></div>
    </div>
    <div class="form-group">
      <label>Status</label>
      <select class="form-control" id="eq-status">
        <option value="available">Available</option>
        <option value="reserved">Reserved</option>
        <option value="maintenance">Maintenance</option>
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveEquipment()">Save Equipment</button>
    </div>
  `);
}

async function saveEquipment() {
  const name = document.getElementById('eq-name').value.trim();
  if (!name) { showToast('Equipment name is required', 'error'); return; }
  const result = await API.post('/equipment', {
    equipment_name: name,
    category:       document.getElementById('eq-cat').value,
    description:    document.getElementById('eq-desc').value,
    rental_price:   parseFloat(document.getElementById('eq-price').value) || 0,
    location:       document.getElementById('eq-loc').value,
    status:         document.getElementById('eq-status').value,
  });
  if (result && !result.message) {
    closeModal();
    showToast('Equipment added successfully!');
    pages.equipment();
  } else {
    showToast(result?.message || 'Failed to save', 'error');
  }
}

async function showEditEquipment(id) {
  const e = await API.get(`/equipment/${id}`);
  if (!e) return;
  openModal('Edit Equipment', `
    <div class="form-row">
      <div class="form-group"><label>Equipment Name</label><input class="form-control" id="eq-name" value="${e.equipment_name}"/></div>
      <div class="form-group"><label>Category</label><input class="form-control" id="eq-cat" value="${e.category}"/></div>
    </div>
    <div class="form-group"><label>Description</label><textarea class="form-control" id="eq-desc">${e.description || ''}</textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Rental Price (₱/day)</label><input class="form-control" type="number" id="eq-price" value="${e.rental_price}"/></div>
      <div class="form-group"><label>Storage Location</label><input class="form-control" id="eq-loc" value="${e.location || ''}"/></div>
    </div>
    <div class="form-group">
      <label>Status</label>
      <select class="form-control" id="eq-status">
        <option value="available" ${e.status==='available'?'selected':''}>Available</option>
        <option value="reserved" ${e.status==='reserved'?'selected':''}>Reserved</option>
        <option value="maintenance" ${e.status==='maintenance'?'selected':''}>Maintenance</option>
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="updateEquipment(${id})">Update</button>
    </div>
  `);
}

async function updateEquipment(id) {
  const result = await API.put(`/equipment/${id}`, {
    equipment_name: document.getElementById('eq-name').value,
    category:       document.getElementById('eq-cat').value,
    description:    document.getElementById('eq-desc').value,
    rental_price:   parseFloat(document.getElementById('eq-price').value) || 0,
    location:       document.getElementById('eq-loc').value,
    status:         document.getElementById('eq-status').value,
  });
  closeModal();
  if (result) showToast('Equipment updated!');
  else showToast('Failed to update', 'error');
  pages.equipment();
}

async function deleteEquipment(id) {
  if (!confirm('Delete this equipment?')) return;
  await API.del(`/equipment/${id}`);
  showToast('Equipment deleted', 'error');
  pages.equipment();
}

function showEquipMaintenance(equipId) {
  openModal('Log Maintenance', `
    <div class="form-row">
      <div class="form-group"><label>Date</label><input class="form-control" type="date" id="maint-date" value="${new Date().toISOString().split('T')[0]}"/></div>
      <div class="form-group"><label>Cost (₱)</label><input class="form-control" type="number" id="maint-cost" placeholder="0"/></div>
    </div>
    <div class="form-group"><label>Technician</label><input class="form-control" id="maint-tech" placeholder="Technician name"/></div>
    <div class="form-group"><label>Description</label><textarea class="form-control" id="maint-desc" placeholder="What was done?"></textarea></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveEquipMaintenance(${equipId})">Log Maintenance</button>
    </div>
  `);
}

async function saveEquipMaintenance(equipId) {
  const result = await API.post('/maintenance', {
    equipment_id:     equipId,
    maintenance_date: document.getElementById('maint-date').value,
    description:      document.getElementById('maint-desc').value,
    cost:             parseFloat(document.getElementById('maint-cost').value) || 0,
    technician:       document.getElementById('maint-tech').value,
  });
  if (result) {
    closeModal();
    showToast('Maintenance logged!');
    pages.equipment();
  } else {
    showToast('Failed to log maintenance', 'error');
  }
}

// ---- RESERVATIONS ----
pages.reservations = async function (filterStatus = 'all') {
  showLoading();
  const reservations = await API.get('/reservations') || [];
  let list = [...reservations];
  if (filterStatus !== 'all') list = list.filter(r => r.status === filterStatus);
 
  const counts = {
    all:       reservations.length,
    pending:   reservations.filter(r => r.status === 'pending').length,
    approved:  reservations.filter(r => r.status === 'approved').length,
    assigned:  reservations.filter(r => r.status === 'assigned').length,
    rejected:  reservations.filter(r => r.status === 'rejected').length,
    completed: reservations.filter(r => r.status === 'completed').length,
  };
 
  document.getElementById('content').innerHTML = `
    <div class="page-header">
      <div><div class="page-heading">Reservations</div><div class="page-sub">Manage all farmer equipment reservations</div></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost" onclick="exportReservations()">⬇ Export</button>
        <button class="btn btn-primary" onclick="showAddReservation()">＋ New Reservation</button>
      </div>
    </div>
    <div class="tabs">
      ${['all','pending','approved','assigned','rejected','completed'].map(s => `
        <button class="tab-btn ${filterStatus===s?'active':''}" onclick="pages.reservations('${s}')">
          ${s.charAt(0).toUpperCase()+s.slice(1)} (${counts[s]})
        </button>
      `).join('')}
    </div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Farmer</th>
              <th>Equipment</th>
              <th>Start</th>
              <th>End</th>
              <th>Type</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${list.length ? list.map(r => `<tr>
              <td><strong>#R${r.reservation_id}</strong></td>
              <td>
                <strong>${r.farmer ? r.farmer.name : '—'}</strong>
                <br><span style="font-size:11px;color:var(--text3)">${r.farmer ? r.farmer.phone : ''}</span>
              </td>
              <td>
                ${r.equipment ? r.equipment.equipment_name : '—'}
                <br><span style="font-size:11px;color:var(--text3)">${r.equipment ? r.equipment.category : ''}</span>
              </td>
              <td>${formatDate(r.start_date)}</td>
              <td>${formatDate(r.end_date)}</td>
              <td>${statusBadge(r.reservation_type)}</td>
              <td>${statusBadge(r.status)}</td>
              <td>
                <div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center">
 
                  <!-- View button always visible -->
                  <button class="btn btn-ghost btn-sm btn-icon"
                    onclick="viewReservation(${r.reservation_id})" title="View">👁</button>
 
                  <!-- PENDING actions -->
                  ${r.status === 'pending' ? `
                    <button class="btn btn-primary btn-sm"
                      onclick="approveReservation(${r.reservation_id})">✓ Approve</button>
                    <button class="btn btn-danger btn-sm"
                      onclick="rejectReservation(${r.reservation_id})">✕ Reject</button>
                    <button class="btn btn-orange btn-sm"
                      onclick="cancelReservation(${r.reservation_id})">✖ Cancel</button>
                  ` : ''}
 
                  <!-- APPROVED actions -->
                  ${r.status === 'approved' ? `
                    <button class="btn btn-orange btn-sm"
                      onclick="cancelReservation(${r.reservation_id})">✖ Cancel</button>
                    ${r.reservation_type === 'delivery' ? `
                      <button class="btn btn-primary btn-sm"
                        onclick="assignDelivery(${r.reservation_id})">🚚 Assign Driver</button>
                    ` : `
                      <button class="btn btn-ghost btn-sm"
                        onclick="completeReservation(${r.reservation_id})">✔ Done</button>
                    `}
                  ` : ''}
 
                  <!-- ASSIGNED — driver already assigned -->
                  ${r.status === 'assigned' ? `
                    <span class="badge badge-blue" style="padding:6px 12px">
                      ✓ Driver Assigned
                    </span>
                  ` : ''}
 
                  <!-- COMPLETED or REJECTED — can delete -->
                  ${r.status === 'completed' || r.status === 'rejected' ? `
                    <button class="btn btn-danger btn-sm"
                      onclick="deleteReservation(${r.reservation_id})" title="Delete">🗑</button>
                  ` : ''}
 
                </div>
              </td>
            </tr>`).join('') : `
              <tr>
                <td colspan="8">
                  <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    No reservations found
                  </div>
                </td>
              </tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

async function calcAutoDistance() {
  const input = document.getElementById('calc-address').value.trim();
  if (!input) { showToast('Enter coordinates (lat, lng)', 'error'); return; }

  let lat = null, lng = null;

  // Check if input looks like coordinates e.g. "7.9063, 125.0942"
  const coordPattern = /^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/;
  const match        = input.match(coordPattern);

  if (match) {
    lat = parseFloat(match[1]);
    lng = parseFloat(match[2]);
  } else {
    showToast('Please enter coordinates format: 7.9063, 125.0942', 'error');
    return;
  }

  showToast('Calculating distance...', 'info');
  const result = await calculateDistance(lat, lng, null);

  if (result) {
    document.getElementById('calc-auto-result').style.display = 'block';
    document.getElementById('calc-auto-km').textContent       = `${result.km} km`;
    document.getElementById('calc-auto-duration').textContent = `🕐 Drive time: ${result.duration}`;
    document.getElementById('calc-dist').value                = result.km;
    calcDeliveryFee();
    showToast(`Distance: ${result.km} km · ${result.duration}`);
  } else {
    showToast('Could not calculate. Check coordinates.', 'error');
  }
}

async function cancelReservation(id) {
  if (!confirm('Cancel this reservation? The equipment will be freed up.')) return;
  const result = await API.put(`/reservations/${id}/cancel`, {});
  if (result && !result.message) {
    showToast('Reservation cancelled');
    pages.reservations();
  } else {
    showToast(result?.message || 'Failed to cancel', 'error');
  }
}

async function deleteReservation(id) {
  if (!confirm('Permanently delete this reservation record?')) return;
  const result = await API.del(`/reservations/${id}`);
  if (result) {
    showToast('Reservation deleted', 'error');
    pages.reservations();
  } else {
    showToast('Failed to delete', 'error');
  }
}

async function viewReservation(id) {
  const r = await API.get(`/reservations/${id}`);
  if (!r) return;
  const delivery = r.delivery;
  const feedback = r.feedback;
  openModal(`Reservation #R${id} Details`, `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="card" style="background:var(--bg3)">
        <div class="section-divider">Farmer Info</div>
        <div class="form-row">
          <div><span style="color:var(--text3);font-size:12px">Name</span><div><strong>${r.farmer ? r.farmer.name : '—'}</strong></div></div>
          <div><span style="color:var(--text3);font-size:12px">Phone</span><div>${r.farmer ? r.farmer.phone : '—'}</div></div>
        </div>
        <div style="margin-top:8px"><span style="color:var(--text3);font-size:12px">Address</span><div>${r.farmer ? r.farmer.address : '—'}</div></div>
      </div>
      <div class="card" style="background:var(--bg3)">
        <div class="section-divider">Equipment Info</div>
        <div style="display:flex;gap:12px;align-items:center">
          <span style="font-size:40px">⚙️</span>
          <div>
            <strong>${r.equipment ? r.equipment.equipment_name : '—'}</strong>
            <div style="font-size:12px;color:var(--text3)">${r.equipment ? r.equipment.category : ''}</div>
            <div style="color:var(--accent);font-weight:700">₱${r.equipment ? r.equipment.rental_price.toLocaleString() : '0'}/day</div>
          </div>
        </div>
      </div>
      <div class="card" style="background:var(--bg3)">
        <div class="section-divider">Reservation Details</div>
        <div class="form-row">
          <div><span style="color:var(--text3);font-size:12px">Start Date</span><div>${formatDate(r.start_date)}</div></div>
          <div><span style="color:var(--text3);font-size:12px">End Date</span><div>${formatDate(r.end_date)}</div></div>
        </div>
        <div style="margin-top:8px;display:flex;gap:10px;flex-wrap:wrap">${statusBadge(r.status)} ${statusBadge(r.reservation_type)}</div>
      </div>
      ${delivery ? `
        <div class="card" style="background:var(--bg3)">
          <div class="section-divider">Delivery Info</div>
          <div class="form-row">
            <div><span style="color:var(--text3);font-size:12px">Distance</span><div>${delivery.distance_km} km</div></div>
            <div><span style="color:var(--text3);font-size:12px">Rate</span><div>₱${delivery.price_per_km}/km</div></div>
          </div>
          <div style="margin-top:8px"><span style="color:var(--text3);font-size:12px">Delivery Fee</span>
            <div style="font-size:20px;font-weight:800;color:var(--accent)">₱${delivery.delivery_fee}</div>
          </div>
          <div style="margin-top:8px"><span style="color:var(--text3);font-size:12px">Driver</span>
            <div>${delivery.driver ? delivery.driver.name : 'Unassigned'}</div>
          </div>
          <div style="margin-top:8px">${statusBadge(delivery.delivery_status)}</div>
        </div>
      ` : ''}
      ${feedback ? `
        <div class="card" style="background:var(--bg3)">
          <div class="section-divider">Farmer Feedback</div>
          <div class="stars">${'★'.repeat(feedback.rating)}${'☆'.repeat(5-feedback.rating)}</div>
          <p style="font-size:13px;color:var(--text2);margin-top:8px">"${feedback.comments}"</p>
        </div>
      ` : ''}
    </div>
    <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Close</button></div>
  `);
}

async function approveReservation(id) {
  const result = await API.put(`/reservations/${id}/approve`, {});
  if (result) { showToast('Reservation approved!'); pages.reservations(); }
  else showToast('Failed to approve', 'error');
}

async function rejectReservation(id) {
  const result = await API.put(`/reservations/${id}/reject`, {});
  if (result) { showToast('Reservation rejected', 'error'); pages.reservations(); }
  else showToast('Failed to reject', 'error');
}

async function completeReservation(id) {
  if (!confirm('Mark this reservation as completed?')) return;
  const result = await API.put(`/reservations/${id}/complete`, {});
  if (result) { showToast('Reservation completed!'); pages.reservations(); }
  else showToast('Failed to complete', 'error');
}

async function showAddReservation() {
  const [farmers, equipment] = await Promise.all([
    API.get('/farmers'),
    API.get('/equipment'),
  ]);
  const availEquip = (equipment || []).filter(e => e.status === 'available');
  openModal('New Reservation', `
    <div class="form-group">
      <label>Farmer</label>
      <select class="form-control" id="res-farmer">
        <option value="">-- Select Farmer --</option>
        ${(farmers || []).map(f => `<option value="${f.id}">${f.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Equipment</label>
      <select class="form-control" id="res-equip">
        <option value="">-- Select Equipment --</option>
        ${availEquip.map(e => `<option value="${e.equipment_id}">${e.equipment_name} — ₱${e.rental_price}/day</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Start Date</label><input class="form-control" type="date" id="res-start"/></div>
      <div class="form-group"><label>End Date</label><input class="form-control" type="date" id="res-end"/></div>
    </div>
    <div class="form-group">
      <label>Reservation Type</label>
      <select class="form-control" id="res-type">
        <option value="pickup">Pickup</option>
        <option value="delivery">Delivery</option>
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="createReservation()">Create Reservation</button>
    </div>
  `);
}

async function createReservation() {
  const farmerId = parseInt(document.getElementById('res-farmer').value);
  const equipId  = parseInt(document.getElementById('res-equip').value);
  const start    = document.getElementById('res-start').value;
  const end      = document.getElementById('res-end').value;
  const type     = document.getElementById('res-type').value;
  if (!farmerId || !equipId || !start || !end) { showToast('All fields required', 'error'); return; }
  const result = await API.post('/reservations', {
    user_id: farmerId, equipment_id: equipId,
    start_date: start, end_date: end, reservation_type: type
  });
  if (result && !result.message) {
    closeModal(); showToast('Reservation created!'); pages.reservations();
  } else {
    showToast(result?.message || 'Failed to create', 'error');
  }
}

async function exportReservations() {
  const reservations = await API.get('/reservations') || [];
  const rows = [['ID','Farmer','Equipment','Start','End','Type','Status']];
  reservations.forEach(r => {
    rows.push([`R${r.reservation_id}`, r.farmer?.name || '—', r.equipment?.equipment_name || '—',
      r.start_date, r.end_date, r.reservation_type, r.status]);
  });
  const csv = rows.map(r => r.join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'reservations.csv';
  a.click();
  showToast('Exported reservations.csv!');
}

async function calculateDistance(destLat, destLng, destAddress) {
  try {
    let url = '';
    if (destLat && destLng && destLat != 0 && destLng != 0) {
      url = `${API.BASE_URL}/calculate-distance?lat=${destLat}&lng=${destLng}`;
    } else if (destAddress) {
      url = `${API.BASE_URL}/calculate-distance?address=${encodeURIComponent(destAddress)}`;
    } else {
      return null;
    }

    console.log('Calling backend distance API:', url);
    const res  = await fetch(url, { headers: API.headers() });
    const data = await res.json();
    console.log('Distance response:', data);

    if (data.rows?.[0]?.elements?.[0]?.status === 'OK') {
      const meters   = data.rows[0].elements[0].distance.value;
      const duration = data.rows[0].elements[0].duration.text;
      const km       = parseFloat((meters / 1000).toFixed(1));
      return { km, duration };
    }
    return null;
  } catch (e) {
    console.error('Distance calc failed:', e);
    return null;
  }
}

async function assignDelivery(reservationId) {
  const [drivers, reservation] = await Promise.all([
    API.get('/drivers'),
    API.get(`/reservations/${reservationId}`)
  ]);
 
  const addr = reservation?.delivery_address || null;
  const lat  = reservation?.latitude  || null;
  const lng  = reservation?.longitude || null;
 
  const settings   = await API.get('/settings') || {};
  const pricePerKm = settings.price_per_km || 25;
 
  // Auto-calculate distance if coordinates available
  let autoKm       = null;
  let autoDuration = null;
 
  if (lat && lng) {
    showToast('Calculating distance from base...', 'info');
    const result = await calculateDistance(parseFloat(lat), parseFloat(lng), addr);
    if (result) {
      autoKm       = result.km;
      autoDuration = result.duration;
    }
  }
 
  openModal('Assign Delivery', `
 
    <!-- Delivery Address -->
    <div style="padding:14px;background:var(--bg3);border-radius:10px;margin-bottom:16px">
      <div style="font-size:11px;color:var(--text3);margin-bottom:6px">📍 DELIVERY ADDRESS</div>
      <div style="font-size:14px;color:var(--text1);font-weight:600;margin-bottom:6px">
        ${addr || '<span style="color:var(--text3);font-style:italic">No address provided</span>'}
      </div>
      ${lat ? `
        <div style="font-size:11px;color:var(--text3)">
          Coordinates: ${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}
          <a href="https://maps.google.com/?q=${lat},${lng}" target="_blank"
             style="color:var(--accent);margin-left:8px">View on Maps ↗</a>
        </div>` : ''}
    </div>
 
    <!-- Distance from base -->
    <div style="padding:14px;background:var(--bg3);border-radius:10px;margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div style="font-size:11px;color:var(--text3)">📏 DISTANCE FROM BASE LOCATION</div>
        <button class="btn btn-ghost btn-sm"
          onclick="recalculateDistance('${lat}','${lng}','${addr}')">
          🔄 Recalculate
        </button>
      </div>
      <div style="display:flex;align-items:baseline;gap:8px">
        <div style="font-size:28px;font-weight:800;color:var(--accent)" id="dist-display">
          ${autoKm ? `${autoKm} km` : '—'}
        </div>
        ${autoDuration ? `
          <div style="font-size:13px;color:var(--text3)">· ${autoDuration} drive</div>
        ` : ''}
      </div>
      ${!autoKm ? `
        <div style="font-size:12px;color:var(--text3);margin-top:4px">
          ${lat ? 'Could not calculate — enter manually below' : 'No coordinates — enter distance manually'}
        </div>` : ''}
    </div>
 
    <!-- Assign Driver -->
    <div class="form-group">
      <label>Assign Driver</label>
      <select class="form-control" id="del-driver">
        <option value="">-- Select Driver --</option>
        ${(drivers || []).map(d => `<option value="${d.id}">${d.name} · ${d.phone || ''}</option>`).join('')}
      </select>
    </div>
 
    <!-- Distance and Rate -->
    <div class="form-row">
      <div class="form-group">
        <label>Distance (km)</label>
        <input class="form-control" type="number" id="del-dist"
               value="${autoKm || ''}"
               placeholder="Enter km"
               oninput="updateFeePreview()"/>
      </div>
      <div class="form-group">
        <label>Price per km (₱)</label>
        <input class="form-control" type="number" id="del-rate"
               value="${pricePerKm}"
               oninput="updateFeePreview()"/>
      </div>
    </div>
 
    <!-- Fee Preview -->
    <div style="padding:16px;background:var(--bg3);border-radius:10px;margin-bottom:16px;text-align:center">
      <div style="font-size:12px;color:var(--text3);margin-bottom:6px">DELIVERY FEE</div>
      <div style="font-size:32px;font-weight:800;color:var(--accent)" id="del-fee-preview">
        ₱${autoKm ? (autoKm * pricePerKm).toFixed(2) : '0.00'}
      </div>
      <div style="font-size:12px;color:var(--text3);margin-top:4px" id="del-fee-formula">
        ${autoKm ? `${autoKm} km × ₱${pricePerKm}/km` : 'Enter distance above'}
      </div>
    </div>
 
    <!-- Delivery Date -->
    <div class="form-group">
      <label>Delivery Date</label>
      <input class="form-control" type="date" id="del-date"
             value="${new Date().toISOString().split('T')[0]}"/>
    </div>
 
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveDelivery(${reservationId})">
        🚚 Assign Delivery
      </button>
    </div>
  `);
}

function updateFeePreview() {
  const dist    = parseFloat(document.getElementById('del-dist')?.value) || 0;
  const rate    = parseFloat(document.getElementById('del-rate')?.value) || 0;
  const fee     = dist * rate;
  const preview = document.getElementById('del-fee-preview');
  const formula = document.getElementById('del-fee-formula');
  const display = document.getElementById('dist-display');
  if (preview) preview.textContent = `₱${fee.toFixed(2)}`;
  if (formula) formula.textContent = `${dist} km × ₱${rate}/km`;
  if (display) display.textContent = dist ? `${dist} km` : '—';
}

async function recalculateDistance(lat, lng, addr) {
  showToast('Calculating distance...', 'info');
  const result = await calculateDistance(
    lat && lat !== 'null' ? parseFloat(lat) : null,
    lng && lng !== 'null' ? parseFloat(lng) : null,
    addr && addr !== 'null' ? addr : null
  );
  if (result) {
    const distDisplay = document.getElementById('dist-display');
    if (distDisplay) distDisplay.textContent = `${result.km} km`;
    const distInput = document.getElementById('del-dist');
    if (distInput) distInput.value = result.km;
    updateFeePreview();
    showToast(`Distance: ${result.km} km · ${result.duration}`);
  } else {
    showToast('Could not calculate. Enter manually.', 'error');
  }
}
 
async function calculateDistance(destLat, destLng, destAddress) {
  try {
    let url = '';
    if (destLat && destLng && destLat != 0 && destLng != 0) {
      url = `${API.BASE_URL}/calculate-distance?lat=${destLat}&lng=${destLng}`;
    } else if (destAddress) {
      url = `${API.BASE_URL}/calculate-distance?address=${encodeURIComponent(destAddress)}`;
    } else {
      return null;
    }
 
    console.log('Calling backend distance API:', url);
    const res  = await fetch(url, { headers: API.headers() });
    const data = await res.json();
    console.log('Distance response:', data);
 
    if (data.rows?.[0]?.elements?.[0]?.status === 'OK') {
      const meters   = data.rows[0].elements[0].distance.value;
      const duration = data.rows[0].elements[0].duration.text;
      const km       = parseFloat((meters / 1000).toFixed(1));
      return { km, duration };
    }
    return null;
  } catch (e) {
    console.error('Distance calc failed:', e);
    return null;
  }
}
async function saveDelivery(reservationId) {
  const driverId = parseInt(document.getElementById('del-driver').value);
  const dist     = parseFloat(document.getElementById('del-dist').value) || 0;
  const rate     = parseFloat(document.getElementById('del-rate').value) || 0;
  const date     = document.getElementById('del-date').value;
  // IMPORTANT: Add these if your table requires them
  const address  = document.getElementById('calc-address').value; 

  if (!driverId || !dist) { showToast('Please fill all fields', 'error'); return; }

  const result = await API.post('/deliveries', {
    reservation_id: reservationId, 
    driver_id: driverId,
    distance_km: dist, 
    price_per_km: rate, 
    delivery_date: date,
    delivery_address: address, // Send the address string
    delivery_status: 'pending' // Always good to set a default
  });

  if (result) { 
    closeModal(); 
    showToast('Delivery assigned!'); 
    pages.reservations(); 
  } else {
    showToast('Failed to assign delivery. Check server logs.', 'error');
  }
}

// ---- DELIVERIES ----
let trackingMap      = null;
let trackingInterval = null;
let driverMarkers    = {};
let deliveryMarkers  = [];

pages.deliveries = async function () {
  showLoading();

  // Clear any existing tracking interval
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }

  const deliveries = await API.get('/deliveries') || [];
  const pending    = deliveries.filter(d => d.delivery_status === 'pending').length;
  const inTransit  = deliveries.filter(d => d.delivery_status === 'in_transit').length;
  const delivered  = deliveries.filter(d => d.delivery_status === 'delivered').length;

  // Get active deliveries (in transit) for map
  const activeDeliveries = deliveries.filter(d => d.delivery_status === 'in_transit');

  document.getElementById('content').innerHTML = `
    <div class="page-header">
      <div><div class="page-heading">Deliveries</div>
      <div class="page-sub">Track all equipment delivery operations</div></div>
    </div>

    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:20px">
      <div class="stat-card yellow">
        <div class="stat-label">Pending</div>
        <div class="stat-value" style="color:var(--yellow)">${pending}</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-label">In Transit</div>
        <div class="stat-value" style="color:var(--orange)">${inTransit}</div>
      </div>
      <div class="stat-card green">
        <div class="stat-label">Delivered</div>
        <div class="stat-value">${delivered}</div>
      </div>
    </div>

    <!-- LIVE TRACKING MAP -->
    <div class="card" style="margin-bottom:20px">
      <div class="card-header">
        <span class="card-title">🗺️ Live Driver Tracking</span>
        <div style="display:flex;align-items:center;gap:12px">
          ${inTransit > 0 ? `
            <div class="tracking-badge">
              <div class="pulse-dot"></div>
              ${inTransit} driver${inTransit>1?'s':''} in transit
            </div>
          ` : `
            <span style="font-size:12px;color:var(--text3)">No active deliveries</span>
          `}
          <button class="btn btn-ghost btn-sm" onclick="refreshDriverLocations()">
            🔄 Refresh
          </button>
        </div>
      </div>

      <div class="map-legend">
        <div class="map-legend-item">
          <div class="legend-dot driver-online"></div> Driver Location
        </div>
        <div class="map-legend-item">
          <div class="legend-dot delivery-addr"></div> Delivery Address
        </div>
        <div class="map-legend-item">
          <div class="legend-dot base-location"></div> Base Location
        </div>
      </div>

      <div id="live-map" style="height:400px;width:100%;border-radius:12px;border:1px solid var(--border);overflow:hidden"></div>

      <div id="driver-list" style="margin-top:12px;display:flex;flex-direction:column;gap:8px">
        <div style="font-size:13px;color:var(--text3);text-align:center;padding:8px">
          Loading driver locations...
        </div>
      </div>
    </div>

    <div class="grid-2">
      <!-- All Deliveries Table -->
      <div class="card">
        <div class="card-header"><span class="card-title">All Deliveries</span></div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Equipment → Farmer</th>
                <th>Driver</th>
                <th>Address</th>
                <th>Fee</th>
                <th>Status</th>
                <th>Update</th>
              </tr>
            </thead>
            <tbody>
              ${deliveries.length ? deliveries.map(d => `<tr>
                <td><strong>#D${d.delivery_id}</strong></td>
                <td>
                  <strong>${d.reservation?.equipment?.equipment_name || '—'}</strong>
                  <br><span style="font-size:11px;color:var(--text3)">
                    → ${d.reservation?.farmer?.name || '—'}
                  </span>
                </td>
                <td>${d.driver
                  ? d.driver.name
                  : '<span style="color:var(--text3)">Unassigned</span>'}</td>
                <td style="max-width:150px">
                  <span style="font-size:11px;color:var(--text3)">
                    ${d.delivery_address
                      ? `📍 ${d.delivery_address.substring(0,40)}${d.delivery_address.length>40?'…':''}`
                      : '<span style="color:var(--red)">No address</span>'}
                  </span>
                </td>
                <td style="color:var(--accent);font-weight:700">
                  ₱${d.delivery_fee}
                  <br><span style="color:var(--text3);font-size:11px">
                    ${d.distance_km}km × ₱${d.price_per_km}
                  </span>
                </td>
                <td>${statusBadge(d.delivery_status)}</td>
                <td>
                  <select class="form-control"
                    style="width:130px;padding:5px 8px;font-size:12px"
                    onchange="updateDeliveryStatus(${d.delivery_id}, this.value)">
                    <option value="pending"
                      ${d.delivery_status==='pending'?'selected':''}>Pending</option>
                    <option value="in_transit"
                      ${d.delivery_status==='in_transit'?'selected':''}>In Transit</option>
                    <option value="delivered"
                      ${d.delivery_status==='delivered'?'selected':''}>Delivered</option>
                  </select>
                </td>
              </tr>`).join('') : `
                <tr><td colspan="7">
                  <div class="empty-state">
                    <div class="empty-icon">🚚</div>No deliveries yet
                  </div>
                </td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Delivery Fee Calculator -->
      <div class="card">
        <div class="card-header"><span class="card-title">Delivery Fee Calculator</span></div>
        <div style="display:flex;flex-direction:column;gap:14px">
          <div class="form-group">
            <label>Coordinates (lat, lng)
              <span style="color:var(--text3);font-size:11px">— Get from Google Maps</span>
            </label>
            <input class="form-control" id="calc-address"
                   placeholder="e.g. 7.9063, 125.0942"/>
          </div>
          <button class="btn btn-primary" onclick="calcAutoDistance()" style="width:100%">
            📏 Calculate Distance from Base Location
          </button>
          <div id="calc-auto-result"
               style="display:none;padding:14px;background:var(--bg3);border-radius:10px">
            <div style="font-size:11px;color:var(--text3);margin-bottom:6px">
              📍 DISTANCE FROM BASE LOCATION
            </div>
            <div style="font-size:26px;font-weight:800;color:var(--accent)"
                 id="calc-auto-km">— km</div>
            <div style="font-size:12px;color:var(--text3);margin-top:4px"
                 id="calc-auto-duration">—</div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Distance (km)</label>
              <input class="form-control" type="number" id="calc-dist"
                     placeholder="Auto-filled above" oninput="calcDeliveryFee()"/>
            </div>
            <div class="form-group">
              <label>Price per km (₱)</label>
              <input class="form-control" type="number" id="calc-rate"
                     value="25" oninput="calcDeliveryFee()"/>
            </div>
          </div>
          <div style="padding:20px;background:var(--bg3);border-radius:var(--radius);text-align:center">
            <div style="font-size:12px;color:var(--text3);margin-bottom:4px">
              ESTIMATED DELIVERY FEE
            </div>
            <div style="font-size:36px;font-weight:800;color:var(--accent);font-family:var(--font-head)"
                 id="calc-result">₱0.00</div>
            <div style="font-size:12px;color:var(--text3);margin-top:4px"
                 id="calc-formula">Formula: 0km × ₱25/km</div>
          </div>
          <div style="font-size:12px;color:var(--text3);text-align:center;
                      padding:10px;background:var(--bg3);border-radius:8px">
            📍 Base: Your house, Valencia City, Bukidnon
          </div>
        </div>
      </div>
    </div>
  `;

setTimeout(() => {
    const mapDiv = document.getElementById('live-map');
    if (mapDiv) {
      initTrackingMap(activeDeliveries);
      loadDriverLocations(activeDeliveries);

      if (inTransit > 0) {
        trackingInterval = setInterval(() => {
          loadDriverLocations(activeDeliveries);
        }, 30000);
      }
    } else {
      console.warn("Map div not found yet, retrying...");
      // Optional: try again one more time if it's missing
    }
  }, 400);
}

function initTrackingMap(activeDeliveries) {
  const container = document.getElementById('live-map');
  if (!container) {
    console.error("Map div 'live-map' not found in the DOM.");
    return; // Stop the function so it doesn't crash the rest of the JS
  }

  if (trackingMap) {
    trackingMap.remove();
    trackingMap = null;
  }

  // Center on Valencia City, Bukidnon by default
  const defaultLat = 7.9038584645570635;
  const defaultLng = 125.09822284783338;

  trackingMap = L.map('live-map').setView([defaultLat, defaultLng], 13);

  // OpenStreetMap tiles — completely free
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(trackingMap);

  // Add base location marker (your house)
  const baseIcon = L.divIcon({
    html: `<div style="background:#60a5fa;width:14px;height:14px;border-radius:50%;
                border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
    iconSize: [14, 14],
    className: ''
  });

  L.marker([defaultLat, defaultLng], { icon: baseIcon })
    .addTo(trackingMap)
    .bindPopup('<strong>📍 Base Location</strong><br>Your house, Valencia City');

  // Add delivery address markers
  activeDeliveries.forEach(d => {
    if (d.latitude && d.longitude) {
      const deliveryIcon = L.divIcon({
        html: `<div style="background:#f87171;width:14px;height:14px;border-radius:50%;
                    border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
        iconSize: [14, 14],
        className: ''
      });

      L.marker([d.latitude, d.longitude], { icon: deliveryIcon })
        .addTo(trackingMap)
        .bindPopup(`
          <strong>📦 Delivery Address</strong><br>
          ${d.reservation?.equipment?.equipment_name || 'Equipment'}<br>
          → ${d.reservation?.farmer?.name || 'Farmer'}<br>
          <small>${d.delivery_address || ''}</small>
        `);
    }
  });
}

async function loadDriverLocations(activeDeliveries) {
  const drivers = await API.get('/drivers/locations');
  if (!drivers) return;

  const driverList = document.getElementById('driver-list');

  if (drivers.length === 0) {
    if (driverList) driverList.innerHTML = `
      <div style="font-size:13px;color:var(--text3);text-align:center;padding:8px">
        No drivers currently active
      </div>`;
    return;
  }

  // Update or create driver markers on map
  drivers.forEach(driver => {
    const lat = parseFloat(driver.current_lat);
    const lng = parseFloat(driver.current_lng);

    if (!lat || !lng) return;

    const driverIcon = L.divIcon({
      html: `
        <div style="position:relative">
          <div style="background:#4ade80;width:16px;height:16px;border-radius:50%;
                      border:3px solid white;box-shadow:0 2px 8px rgba(74,222,128,0.5)">
          </div>
          <div style="position:absolute;top:-2px;left:-2px;width:20px;height:20px;
                      border-radius:50%;border:2px solid #4ade80;
                      animation:pulse-green 1.5s infinite;opacity:0.6">
          </div>
        </div>`,
      iconSize: [16, 16],
      className: ''
    });

    if (driverMarkers[driver.id]) {
      // Move existing marker smoothly
      driverMarkers[driver.id].setLatLng([lat, lng]);
    } else {
      // Create new marker
      driverMarkers[driver.id] = L.marker([lat, lng], { icon: driverIcon })
        .addTo(trackingMap)
        .bindPopup(`
          <strong>🚗 ${driver.name}</strong><br>
          <small>Last updated: ${new Date(driver.location_updated_at).toLocaleTimeString()}</small>
        `);
    }
  });

  // Update driver list below map
  if (driverList) {
    driverList.innerHTML = drivers.map(d => `
      <div style="display:flex;justify-content:space-between;align-items:center;
                  padding:10px 14px;background:var(--bg3);border-radius:10px">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="pulse-dot"></div>
          <div>
            <div style="font-weight:600;color:var(--text1)">${d.name}</div>
            <div style="font-size:11px;color:var(--text3)">
              Updated: ${new Date(d.location_updated_at).toLocaleTimeString()}
            </div>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm"
          onclick="centerOnDriver(${d.current_lat}, ${d.current_lng}, '${d.name}')">
          📍 Focus
        </button>
      </div>
    `).join('');
  }
}

function centerOnDriver(lat, lng, name) {
  if (trackingMap) {
    trackingMap.setView([lat, lng], 16);
    showToast(`Focused on ${name}`);
  }
}

async function refreshDriverLocations() {
  const deliveries = await API.get('/deliveries') || [];
  const active     = deliveries.filter(d => d.delivery_status === 'in_transit');
  await loadDriverLocations(active);
  showToast('Driver locations refreshed');
}

function calcDeliveryFee() {
  const dist = parseFloat(document.getElementById('calc-dist').value) || 0;
  const rate = parseFloat(document.getElementById('calc-rate').value) || 0;
  document.getElementById('calc-result').textContent = `₱${(dist*rate).toFixed(2)}`;
  document.getElementById('calc-formula').textContent = `Formula: ${dist}km × ₱${rate}/km`;
}

async function updateDeliveryStatus(id, status) {
  const result = await API.put(`/deliveries/${id}`, { delivery_status: status });
  if (result) { showToast(`Delivery #D${id} updated to ${status}`); pages.deliveries(); }
  else showToast('Failed to update', 'error');
}

// ---- MAINTENANCE ----
pages.maintenance = async function () {
  showLoading();
  const [maintenance, equipment] = await Promise.all([
    API.get('/maintenance'),
    API.get('/equipment'),
  ]);
  const maintList = maintenance || [];
  const equipList = equipment   || [];

  document.getElementById('content').innerHTML = `
    <div class="page-header">
      <div><div class="page-heading">Maintenance</div><div class="page-sub">Track all equipment service records</div></div>
      <button class="btn btn-primary" onclick="showAddMaintenance()">＋ Log Maintenance</button>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><span class="card-title">Maintenance Records</span></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Equipment</th><th>Date</th><th>Technician</th><th>Cost</th><th>Actions</th></tr></thead>
            <tbody>
              ${maintList.length ? maintList.map(m => `<tr>
                <td><strong>#M${m.maintenance_id}</strong></td>
                <td><strong>${m.equipment ? m.equipment.equipment_name : '—'}</strong><br><span style="font-size:11px;color:var(--text3)">${m.description.substring(0,40)}…</span></td>
                <td>${formatDate(m.maintenance_date)}</td>
                <td>${m.technician || '—'}</td>
                <td style="color:var(--orange);font-weight:700">₱${m.cost.toLocaleString()}</td>
                <td>
                  <button class="btn btn-ghost btn-sm" onclick="viewMaintenance(${m.maintenance_id})">👁</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteMaintenance(${m.maintenance_id})">✕</button>
                </td>
              </tr>`).join('') : `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">🔧</div>No records yet</div></td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Equipment Health</span></div>
        <div style="display:flex;flex-direction:column;gap:14px">
          ${equipList.map(e => {
            const records   = maintList.filter(m => m.equipment_id === e.equipment_id);
            const lastMaint = records.length ? records[0].maintenance_date : null;
            const daysSince = lastMaint ? Math.floor((Date.now() - new Date(lastMaint)) / 86400000) : 999;
            const health    = Math.max(0, 100 - daysSince);
            const color     = health > 60 ? '' : health > 30 ? 'orange' : 'red';
            return `
              <div style="display:flex;align-items:center;gap:12px">
                <span style="font-size:24px">⚙️</span>
                <div style="flex:1">
                  <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
                    <span>${e.equipment_name}</span>
                    <span style="color:var(--text3);font-size:11px">${lastMaint ? 'Last: '+formatDate(lastMaint) : 'No records'}</span>
                  </div>
                  <div class="progress-bar"><div class="progress-fill ${color}" style="width:${Math.min(100,health)}%"></div></div>
                </div>
                ${statusBadge(e.status)}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
};

async function showAddMaintenance() {
  const equipment = await API.get('/equipment') || [];
  openModal('Log Maintenance', `
    <div class="form-group">
      <label>Equipment</label>
      <select class="form-control" id="ma-equip">
        <option value="">-- Select Equipment --</option>
        ${equipment.map(e => `<option value="${e.equipment_id}">${e.equipment_name}</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Date</label><input class="form-control" type="date" id="ma-date" value="${new Date().toISOString().split('T')[0]}"/></div>
      <div class="form-group"><label>Cost (₱)</label><input class="form-control" type="number" id="ma-cost" placeholder="0"/></div>
    </div>
    <div class="form-group"><label>Technician</label><input class="form-control" id="ma-tech" placeholder="Name"/></div>
    <div class="form-group"><label>Description</label><textarea class="form-control" id="ma-desc" placeholder="Details of work done..."></textarea></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="logMaintenance()">Log</button>
    </div>
  `);
}

async function logMaintenance() {
  const equipId = parseInt(document.getElementById('ma-equip').value);
  if (!equipId) { showToast('Select equipment', 'error'); return; }
  const result = await API.post('/maintenance', {
    equipment_id:     equipId,
    maintenance_date: document.getElementById('ma-date').value,
    description:      document.getElementById('ma-desc').value,
    cost:             parseFloat(document.getElementById('ma-cost').value) || 0,
    technician:       document.getElementById('ma-tech').value,
  });
  if (result) { closeModal(); showToast('Maintenance logged!'); pages.maintenance(); }
  else showToast('Failed to log', 'error');
}

async function viewMaintenance(id) {
  const m = await API.get(`/maintenance/${id}`);
  if (!m) return;
  openModal(`Maintenance #M${id}`, `
    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="form-row">
        <div><label style="font-size:12px;color:var(--text3)">Equipment</label><div><strong>${m.equipment ? m.equipment.equipment_name : '—'}</strong></div></div>
        <div><label style="font-size:12px;color:var(--text3)">Date</label><div>${formatDate(m.maintenance_date)}</div></div>
      </div>
      <div class="form-row">
        <div><label style="font-size:12px;color:var(--text3)">Technician</label><div>${m.technician || '—'}</div></div>
        <div><label style="font-size:12px;color:var(--text3)">Cost</label><div style="color:var(--orange);font-weight:700">₱${m.cost.toLocaleString()}</div></div>
      </div>
      <div><label style="font-size:12px;color:var(--text3)">Description</label><div>${m.description}</div></div>
    </div>
    <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Close</button></div>
  `);
}

async function deleteMaintenance(id) {
  if (!confirm('Delete this maintenance record?')) return;
  await API.del(`/maintenance/${id}`);
  showToast('Maintenance record deleted', 'error');
  pages.maintenance();
}

// ---- FARMERS ----
pages.farmers = async function () {
  showLoading();
  const farmers = await API.get('/farmers') || [];
  document.getElementById('content').innerHTML = `
    <div class="page-header">
      <div><div class="page-heading">Farmers</div><div class="page-sub">Registered farmer accounts</div></div>
      <button class="btn btn-primary" onclick="showAddUser('farmer')">＋ Add Farmer</button>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Address</th><th>Reservations</th><th>Joined</th><th>Actions</th></tr></thead>
          <tbody>
            ${farmers.length ? farmers.map(f => `<tr>
              <td><strong>#${f.id}</strong></td>
              <td><div style="display:flex;align-items:center;gap:8px">
                <div class="admin-avatar" style="width:28px;height:28px;font-size:12px">${f.name[0]}</div>
                <strong>${f.name}</strong>
              </div></td>
              <td style="color:var(--text3)">${f.email}</td>
              <td>${f.phone || '—'}</td>
              <td style="color:var(--text3);max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.address || '—'}</td>
              <td><span class="badge badge-blue" style="cursor:pointer" onclick="viewUser(${f.id})">${f.reservations_count} reservations</span></td>
              <td>${formatDate(f.created_at)}</td>
              <td>
                <button class="btn btn-ghost btn-sm" onclick="viewUser(${f.id})">👁</button>
                <button class="btn btn-danger btn-sm" onclick="deleteUser(${f.id})">✕</button>
              </td>
            </tr>`).join('') : `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">👤</div>No farmers yet</div></td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

// ---- DRIVERS ----
pages.drivers = async function () {
  showLoading();
  const drivers = await API.get('/drivers') || [];
  document.getElementById('content').innerHTML = `
    <div class="page-header">
      <div><div class="page-heading">Drivers</div><div class="page-sub">Equipment delivery drivers</div></div>
      <button class="btn btn-primary" onclick="showAddUser('driver')">＋ Add Driver</button>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Deliveries</th><th>Joined</th><th>Actions</th></tr></thead>
          <tbody>
            ${drivers.length ? drivers.map(d => `<tr>
              <td><strong>#${d.id}</strong></td>
              <td><div style="display:flex;align-items:center;gap:8px">
                <div class="admin-avatar" style="width:28px;height:28px;font-size:12px;background:var(--purple)">${d.name[0]}</div>
                <strong>${d.name}</strong>
              </div></td>
              <td style="color:var(--text3)">${d.email}</td>
              <td>${d.phone || '—'}</td>
              <td><span class="badge badge-purple">${d.deliveries_count} deliveries</span></td>
              <td>${formatDate(d.created_at)}</td>
              <td>
                <button class="btn btn-ghost btn-sm" onclick="viewUser(${d.id})">👁</button>
                <button class="btn btn-danger btn-sm" onclick="deleteUser(${d.id})">✕</button>
              </td>
            </tr>`).join('') : `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">🧑‍✈️</div>No drivers yet</div></td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

function showAddUser(role) {
  openModal(`Add ${role.charAt(0).toUpperCase()+role.slice(1)}`, `
    <div class="form-row">
      <div class="form-group"><label>Full Name</label><input class="form-control" id="usr-name" placeholder="Full name"/></div>
      <div class="form-group"><label>Email</label><input class="form-control" type="email" id="usr-email" placeholder="email@example.com"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Password</label><input class="form-control" type="password" id="usr-pass" placeholder="••••••••"/></div>
      <div class="form-group"><label>Phone</label><input class="form-control" id="usr-phone" placeholder="09XX-XXX-XXXX"/></div>
    </div>
    <div class="form-group"><label>Address</label><textarea class="form-control" id="usr-address" placeholder="Full address"></textarea></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveUser('${role}')">Create Account</button>
    </div>
  `);
}

async function saveUser(role) {
  const name = document.getElementById('usr-name').value.trim();
  if (!name) { showToast('Name required', 'error'); return; }
  const result = await API.post('/users', {
    name, email: document.getElementById('usr-email').value,
    password: document.getElementById('usr-pass').value, role,
    phone: document.getElementById('usr-phone').value,
    address: document.getElementById('usr-address').value,
  });
  if (result && !result.message) {
    closeModal();
    showToast(`${role.charAt(0).toUpperCase()+role.slice(1)} account created!`);
    role === 'farmer' ? pages.farmers() : pages.drivers();
  } else {
    showToast(result?.message || 'Failed to create account', 'error');
  }
}

async function viewUser(id) {
  const u = await API.get(`/users/${id}`);
  if (!u) return;
  const resHistory = u.reservations || [];
  const delHistory = u.deliveries  || [];
  openModal('User Profile', `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
      <div class="admin-avatar" style="width:52px;height:52px;font-size:22px">${u.name[0]}</div>
      <div>
        <div style="font-family:var(--font-head);font-size:18px;font-weight:700">${u.name}</div>
        <div style="color:var(--text3);font-size:13px">${u.email}</div>
        <div style="margin-top:4px">${statusBadge(u.role)}</div>
      </div>
    </div>
    <div class="form-row" style="margin-bottom:12px">
      <div><label style="font-size:11px;color:var(--text3)">PHONE</label><div>${u.phone || '—'}</div></div>
      <div><label style="font-size:11px;color:var(--text3)">JOINED</label><div>${formatDate(u.created_at)}</div></div>
    </div>
    <div style="margin-bottom:16px"><label style="font-size:11px;color:var(--text3)">ADDRESS</label><div>${u.address || '—'}</div></div>
    ${u.role === 'farmer' ? `
      <div class="section-divider">Reservation History (${resHistory.length})</div>
      ${resHistory.length ? resHistory.map(r => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);font-size:13px">
          <div>
            <strong>${r.equipment ? r.equipment.equipment_name : '—'}</strong>
            <div style="font-size:11px;color:var(--text3)">${formatDate(r.start_date)} → ${formatDate(r.end_date)}</div>
          </div>
          <div style="display:flex;gap:6px">${statusBadge(r.status)}${statusBadge(r.reservation_type)}</div>
        </div>`).join('') : '<div style="color:var(--text3);font-size:13px;padding:10px 0">No reservations yet</div>'}
    ` : ''}
    ${u.role === 'driver' ? `
      <div class="section-divider">Delivery History (${delHistory.length})</div>
      ${delHistory.length ? delHistory.map(d => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);font-size:13px">
          <div>
            <strong>${d.reservation?.equipment?.equipment_name || '—'}</strong>
            <div style="font-size:11px;color:var(--text3)">→ ${d.reservation?.farmer?.name || '—'} · ${d.distance_km}km · ₱${d.delivery_fee}</div>
            <div style="font-size:11px;color:var(--text3)">${formatDate(d.delivery_date)}</div>
          </div>
          <div>${statusBadge(d.delivery_status)}</div>
        </div>`).join('') : '<div style="color:var(--text3);font-size:13px;padding:10px 0">No deliveries yet</div>'}
    ` : ''}
    <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Close</button></div>
  `);
}

async function deleteUser(id) {
  if (!confirm('Delete this user account?')) return;
  await API.del(`/users/${id}`);
  showToast('User deleted', 'error');
  navigate(currentPage);
}

// ---- FEEDBACK ----
pages.feedback = async function () {
  showLoading();
  const feedback  = await API.get('/feedback') || [];
  const avgRating = feedback.length ? (feedback.reduce((a,b) => a+b.rating, 0) / feedback.length).toFixed(1) : 0;
  document.getElementById('content').innerHTML = `
    <div class="page-header">
      <div><div class="page-heading">Feedback & Ratings</div><div class="page-sub">Farmer equipment satisfaction reviews</div></div>
    </div>
    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:20px">
      <div class="stat-card yellow"><div class="stat-icon">⭐</div><div class="stat-label">Average Rating</div><div class="stat-value" style="color:var(--yellow)">${avgRating}</div></div>
      <div class="stat-card green"><div class="stat-icon">💬</div><div class="stat-label">Total Reviews</div><div class="stat-value">${feedback.length}</div></div>
      <div class="stat-card blue"><div class="stat-icon">😊</div><div class="stat-label">5-Star Reviews</div><div class="stat-value" style="color:var(--blue)">${feedback.filter(f=>f.rating===5).length}</div></div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title">All Reviews</span></div>
      ${feedback.length ? feedback.map(f => `
        <div style="padding:16px 0;border-bottom:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
            <div style="display:flex;align-items:center;gap:10px">
              <div class="admin-avatar" style="width:32px;height:32px;font-size:13px">${f.farmer ? f.farmer.name[0] : '?'}</div>
              <div>
                <strong>${f.farmer ? f.farmer.name : '—'}</strong>
                <div style="font-size:12px;color:var(--text3)">${f.reservation?.equipment?.equipment_name || '—'} · ${formatDate(f.created_at)}</div>
              </div>
            </div>
            <div class="stars">${'★'.repeat(f.rating)}${'☆'.repeat(5-f.rating)}</div>
          </div>
          <p style="font-size:13px;color:var(--text2);padding-left:42px">"${f.comments}"</p>
        </div>`).join('') : '<div class="empty-state"><div class="empty-icon">💬</div>No feedback yet</div>'}
    </div>
  `;
};

// ---- REPORTS ----
pages.reports = async function () {
  showLoading();
  const full = await API.get('/reports/full') || {};
  document.getElementById('content').innerHTML = `
    <div class="page-header">
      <div><div class="page-heading">Reports</div><div class="page-sub">System analytics and summaries</div></div>
    </div>
    <div class="stats-grid" style="margin-bottom:24px">
      <div class="stat-card green"><div class="stat-label">Total Equipment</div><div class="stat-value">${full.equipment_count || 0}</div><div class="stat-change">${full.available_count || 0} available</div></div>
      <div class="stat-card blue"><div class="stat-label">Total Reservations</div><div class="stat-value">${full.reservation_count || 0}</div><div class="stat-change">${full.pending_count || 0} pending</div></div>
      <div class="stat-card orange"><div class="stat-label">Delivery Revenue</div><div class="stat-value">₱${(full.total_delivery_fee || 0).toLocaleString()}</div></div>
      <div class="stat-card red"><div class="stat-label">Maintenance Cost</div><div class="stat-value">₱${(full.total_maint_cost || 0).toLocaleString()}</div></div>
      <div class="stat-card purple"><div class="stat-label">Avg Rating</div><div class="stat-value" style="color:var(--purple)">${full.avg_rating ? parseFloat(full.avg_rating).toFixed(1) : '—'}</div></div>
    </div>
    <div class="grid-auto">
      <div class="report-card" onclick="showReportEquipUsage()"><div class="report-icon">⚙️</div><div class="report-title">Equipment Usage</div><div class="report-desc">Most rented equipment, availability stats</div><button class="btn btn-ghost btn-sm">Generate →</button></div>
      <div class="report-card" onclick="showReportReservations()"><div class="report-icon">📋</div><div class="report-title">Reservation Summary</div><div class="report-desc">Monthly reservation counts, trends</div><button class="btn btn-ghost btn-sm">Generate →</button></div>
      <div class="report-card" onclick="showReportDelivery()"><div class="report-icon">🚚</div><div class="report-title">Delivery Report</div><div class="report-desc">Delivery fees collected, driver performance</div><button class="btn btn-ghost btn-sm">Generate →</button></div>
      <div class="report-card" onclick="showReportMaint()"><div class="report-icon">🔧</div><div class="report-title">Maintenance Cost Report</div><div class="report-desc">Equipment repair costs and history</div><button class="btn btn-ghost btn-sm">Generate →</button></div>
      <div class="report-card" onclick="showReportFarmer()"><div class="report-icon">👤</div><div class="report-title">Farmer Activity</div><div class="report-desc">Most active farmers, reservation frequency</div><button class="btn btn-ghost btn-sm">Generate →</button></div>
    </div>
  `;
};

async function showReportEquipUsage() {
  const data = await API.get('/reports/equipment-usage') || [];
  openModal('Equipment Usage Report', `
    <div class="table-wrap"><table>
      <thead><tr><th>Equipment</th><th>Category</th><th>Reservations</th><th>Status</th><th>Rate</th></tr></thead>
      <tbody>
        ${data.map(e => `<tr>
          <td><strong>${e.equipment_name}</strong></td>
          <td>${e.category}</td>
          <td><strong style="color:var(--accent)">${e.reservations_count}</strong></td>
          <td>${statusBadge(e.status)}</td>
          <td style="color:var(--accent)">₱${e.rental_price}/day</td>
        </tr>`).join('')}
      </tbody>
    </table></div>
    <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Close</button></div>
  `);
}

async function showReportReservations() {
  const data     = await API.get('/reports/reservations') || {};
  const byStatus = data.by_status || [];
  const byType   = data.by_type   || [];
  openModal('Reservation Summary', `
    <div class="section-divider">By Status</div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px">
      ${byStatus.map(s => `<div style="display:flex;justify-content:space-between;align-items:center">${statusBadge(s.status)}<strong>${s.count}</strong></div>`).join('')}
    </div>
    <div class="section-divider">By Type</div>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${byType.map(t => `<div style="display:flex;justify-content:space-between;align-items:center">${statusBadge(t.reservation_type)}<strong>${t.count}</strong></div>`).join('')}
    </div>
    <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Close</button></div>
  `);
}

async function showReportDelivery() {
  const data       = await API.get('/reports/deliveries') || {};
  const deliveries = data.deliveries || [];
  openModal('Delivery Report', `
    <div class="table-wrap"><table>
      <thead><tr><th>Delivery</th><th>Driver</th><th>Distance</th><th>Fee</th><th>Status</th></tr></thead>
      <tbody>
        ${deliveries.map(d => `<tr>
          <td>#D${d.delivery_id}</td>
          <td>${d.driver ? d.driver.name : '—'}</td>
          <td>${d.distance_km} km</td>
          <td style="color:var(--accent);font-weight:700">₱${d.delivery_fee}</td>
          <td>${statusBadge(d.delivery_status)}</td>
        </tr>`).join('')}
        <tr style="border-top:2px solid var(--border)">
          <td colspan="3"><strong>TOTAL FEES</strong></td>
          <td style="color:var(--accent);font-weight:800;font-size:16px">₱${data.total_fees || 0}</td>
          <td></td>
        </tr>
      </tbody>
    </table></div>
    <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Close</button></div>
  `);
}

async function showReportMaint() {
  const data    = await API.get('/reports/maintenance') || {};
  const records = data.records || [];
  openModal('Maintenance Cost Report', `
    <div class="table-wrap"><table>
      <thead><tr><th>Equipment</th><th>Date</th><th>Technician</th><th>Cost</th></tr></thead>
      <tbody>
        ${records.map(m => `<tr>
          <td><strong>${m.equipment ? m.equipment.equipment_name : '—'}</strong></td>
          <td>${formatDate(m.maintenance_date)}</td>
          <td>${m.technician || '—'}</td>
          <td style="color:var(--orange);font-weight:700">₱${m.cost.toLocaleString()}</td>
        </tr>`).join('')}
        <tr style="border-top:2px solid var(--border)">
          <td colspan="3"><strong>TOTAL COST</strong></td>
          <td style="color:var(--orange);font-weight:800;font-size:16px">₱${(data.total_cost || 0).toLocaleString()}</td>
        </tr>
      </tbody>
    </table></div>
    <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Close</button></div>
  `);
}

async function showReportFarmer() {
  const farmers = await API.get('/reports/farmers') || [];
  openModal('Farmer Activity Report', `
    <div class="table-wrap"><table>
      <thead><tr><th>Farmer</th><th>Phone</th><th>Reservations</th><th>Joined</th></tr></thead>
      <tbody>
        ${farmers.map(f => `<tr>
          <td><strong>${f.name}</strong></td>
          <td>${f.phone || '—'}</td>
          <td><strong style="color:var(--accent)">${f.reservations_count}</strong></td>
          <td>${formatDate(f.created_at)}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>
    <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Close</button></div>
  `);
}

// ---- SETTINGS ----
pages.settings = async function () {
  showLoading();
  const s = await API.get('/settings') || {};
  document.getElementById('content').innerHTML = `
    <div class="page-header">
      <div><div class="page-heading">Settings</div><div class="page-sub">System configuration and preferences</div></div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><span class="card-title">Cooperative Information</span></div>
        <div class="form-group"><label>Cooperative Name</label><input class="form-control" id="set-name" value="${s.coop_name || ''}"/></div>
        <div class="form-group"><label>Address</label><input class="form-control" id="set-addr" value="${s.coop_address || ''}"/></div>
        <div class="form-row">
          <div class="form-group"><label>Contact Email</label><input class="form-control" id="set-email" value="${s.contact_email || ''}"/></div>
          <div class="form-group"><label>Contact Phone</label><input class="form-control" id="set-phone" value="${s.contact_phone || ''}"/></div>
        </div>
        <button class="btn btn-primary" onclick="saveSettings()">Save Changes</button>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Delivery Configuration</span></div>
        <div class="form-group">
          <label>Default Price per Kilometer (₱)</label>
          <input class="form-control" id="set-ppkm" type="number" value="${s.price_per_km || 25}"/>
          <div style="font-size:12px;color:var(--text3);margin-top:6px">Used for automatic delivery fee calculations</div>
        </div>
        <div class="form-group">
          <label>Maintenance Alert (days since last service)</label>
          <input class="form-control" id="set-maint-days" type="number" value="${s.maintenance_alert_days || 30}"/>
        </div>
        <button class="btn btn-primary" onclick="saveSettings()">Save Changes</button>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">API Integration Status</span></div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--bg3);border-radius:8px"><span>🗺️ Google Maps API</span><span class="badge badge-orange">Not Configured</span></div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--bg3);border-radius:8px"><span>📱 Android App API</span><span class="badge badge-green">Ready</span></div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--bg3);border-radius:8px"><span>🗄️ MySQL Database</span><span class="badge badge-green">Connected</span></div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--bg3);border-radius:8px"><span>🔐 Laravel Auth API</span><span class="badge badge-green">Ready</span></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Admin Account</span></div>
        <div class="form-group"><label>Current Password</label><input class="form-control" id="cur-pass" type="password" placeholder="••••••••"/></div>
        <div class="form-group"><label>New Password</label><input class="form-control" id="new-pass" type="password" placeholder="••••••••"/></div>
        <div class="form-group"><label>Confirm New Password</label><input class="form-control" id="confirm-pass" type="password" placeholder="••••••••"/></div>
        <button class="btn btn-primary" onclick="changePassword()">Change Password</button>
      </div>
    </div>
  `;
};

async function saveSettings() {
  const result = await API.put('/settings', {
    coop_name:              document.getElementById('set-name').value,
    coop_address:           document.getElementById('set-addr').value,
    contact_email:          document.getElementById('set-email').value,
    contact_phone:          document.getElementById('set-phone').value,
    price_per_km:           document.getElementById('set-ppkm').value,
    maintenance_alert_days: document.getElementById('set-maint-days').value,
  });
  if (result) showToast('Settings saved!');
  else showToast('Failed to save settings', 'error');
}

async function changePassword() {
  const current = document.getElementById('cur-pass').value;
  const newPass = document.getElementById('new-pass').value;
  const confirm = document.getElementById('confirm-pass').value;
  if (!current || !newPass) { showToast('Fill in all password fields', 'error'); return; }
  if (newPass !== confirm)  { showToast('Passwords do not match', 'error'); return; }
  if (newPass.length < 6)   { showToast('Password must be at least 6 characters', 'error'); return; }
  const me = await API.get('/auth/me');
  if (!me) { showToast('Could not get user info', 'error'); return; }
  const result = await API.put(`/users/${me.id}`, { password: newPass });
  if (result) showToast('Password changed successfully!');
  else showToast('Failed to change password', 'error');
}

// ==================== NOTIFICATIONS ====================
async function loadNotifications() {
  const [reservations, deliveries, maintenance, equipment, settings] = await Promise.all([
    API.get('/reservations'),
    API.get('/deliveries'),
    API.get('/maintenance'),
    API.get('/equipment'),
    API.get('/settings'),
  ]);

  const notifs    = [];
  const alertDays = parseInt(settings?.maintenance_alert_days) || 30;

   // Pending reservations
  (reservations || []).filter(r => r.status === 'pending').forEach(r => {
    notifs.push({
      key:    `res-${r.reservation_id}`,
      text:   `New reservation from ${r.farmer?.name || 'a farmer'}`,
      unread: true,
      action: `viewReservation(${r.reservation_id})`
    });
  });

  // In-transit deliveries
  (deliveries || []).filter(d => d.delivery_status === 'in_transit').forEach(d => {
    notifs.push({
      key:    `del-${d.delivery_id}`,
      text:   `Delivery #D${d.delivery_id} is in transit`,
      unread: true,
      action: `navigate('deliveries')`
    });
  });

  // Maintenance due alerts
  (equipment || []).forEach(e => {
    const records   = (maintenance || []).filter(m => m.equipment_id === e.equipment_id);
    if (records.length === 0) {
      notifs.push({
        key:    `maint-never-${e.equipment_id}`,
        text:   `⚠️ ${e.equipment_name} has never been maintained`,
        unread: true,
        action: `navigate('maintenance')`
      });
    } else {
      const lastDate  = new Date(records[0].maintenance_date);
      const daysSince = Math.floor((Date.now() - lastDate) / 86400000);
      if (daysSince >= alertDays) {
        notifs.push({
          key:    `maint-due-${e.equipment_id}`,
          text:   `⚠️ ${e.equipment_name} needs maintenance (${daysSince} days ago)`,
          unread: true,
          action: `navigate('maintenance')`
        });
      }
    }
  });
    // Filter out dismissed notifications
  const dismissed = getDismissed();
  const visible = notifs.filter(n => !dismissed.includes(n.key));
  window._notifs = notifs;

  // Update badge count
  const unreadCount = visible.filter(n => n.unread).length;
  const badge = document.getElementById('notif-count');
  if (badge) {
    badge.textContent = unreadCount;
    badge.style.display = unreadCount > 0 ? 'flex' : 'none';
  }

  // Render notifications
  const list = document.getElementById('notif-list');
  if (!list) return;
  list.innerHTML = visible.length
    ? `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 16px;border-bottom:1px solid var(--border)">
        <span style="font-size:12px;color:var(--text3)">${unreadCount} unread</span>
        <span style="font-size:12px;color:var(--accent);cursor:pointer" onclick="clearAllNotifs()">Clear all</span>
      </div>
      ${visible.map(n => `
        <div class="notif-item ${n.unread ? 'unread' : ''}"
          style="display:flex;justify-content:space-between;align-items:center">
          <span onclick="toggleNotifs(); ${n.action}" style="flex:1;cursor:pointer">${n.text}</span>
          <span onclick="dismissNotif('${n.key}')" style="color:var(--text3);padding:0 8px;font-size:16px;cursor:pointer">✕</span>
        </div>`).join('')}
    `
    : '<div class="notif-item">No new notifications</div>';

  // Store notifs globally for dismiss
  window._notifs = notifs;
}

// ==================== LOGIN ====================
function showLoginPage() {
  document.getElementById('sidebar').style.display = 'none';
  document.getElementById('main').style.display = 'none';
  const existing = document.getElementById('login-page');
  if (existing) existing.remove();
  const div = document.createElement('div');
  div.id = 'login-page';
  div.style.cssText = 'position:fixed;inset:0;background:var(--bg);display:flex;align-items:center;justify-content:center;z-index:9999';
  div.innerHTML = `
    <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:40px;width:360px">
      <div style="font-family:var(--font-head);font-size:24px;font-weight:800;color:var(--accent);margin-bottom:4px">🌾 AgriReserve</div>
      <div style="color:var(--text3);font-size:13px;margin-bottom:24px">Admin Panel Login</div>
      <div class="form-group"><label>Email</label><input class="form-control" id="login-email" type="email" placeholder="admin@agricoop.ph"/></div>
      <div class="form-group"><label>Password</label><input class="form-control" id="login-password" type="password" placeholder="••••••••"/></div>
      <div id="login-error" style="color:var(--red);font-size:12px;margin-bottom:12px;display:none"></div>
      <button class="btn btn-primary" id="login-btn" style="width:100%">Login</button>
    </div>
  `;
  document.body.appendChild(div);
  document.getElementById('login-btn').addEventListener('click', doLogin);
  document.getElementById('login-password').addEventListener('keypress', e => { if (e.key === 'Enter') doLogin(); });
}

async function doLogin() {
  const email    = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  if (!email || !password) {
    document.getElementById('login-error').style.display = 'block';
    document.getElementById('login-error').textContent = 'Please enter email and password';
    return;
  }
  const res = await fetch('https://agri-reserve-main-cmvorm.free.laravel.cloud/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (data.token) {
    localStorage.setItem('auth_token', data.token);
    API.TOKEN = data.token;
    const loginPage = document.getElementById('login-page');
    if (loginPage) loginPage.remove();
    document.getElementById('sidebar').style.display = '';
    document.getElementById('main').style.display = '';
    if (data.user) {
      document.querySelector('.admin-name').textContent = data.user.name;
      document.querySelector('.admin-role').textContent = data.user.role;
    }
    navigate('dashboard');
    loadNotifications();
  } else {
    document.getElementById('login-error').style.display = 'block';
    document.getElementById('login-error').textContent = data.message || 'Invalid credentials';
  }
}

async function showLogout() {
  if (confirm('Log out of AgriReserve Admin?')) {
    try { await API.post('/auth/logout', {}); } catch(e) {}
    localStorage.removeItem('auth_token');
    API.TOKEN = null;
    showLoginPage();
    showToast('Logged out successfully', 'info');
  }
}

// ==================== INIT ====================
const savedToken = localStorage.getItem('auth_token');
if (savedToken) {
  API.TOKEN = savedToken;
  navigate('dashboard');
  loadNotifications();
} else {
  showLoginPage();
}