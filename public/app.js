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
    // Equipment Status
    available: 'badge-green', 
    reserved: 'badge-orange', 
    maintenance: 'badge-red',
    
    // Reservation Status
    pending: 'badge-yellow', 
    approved: 'badge-green', 
    assigned: 'badge-blue',   // Represented as "With Farmer"
    completed: 'badge-green', // Represented as "Returned"
    rejected: 'badge-red',
    cancelled: 'badge-gray', 
    
    // Delivery Status
    in_transit: 'badge-orange', 
    delivered: 'badge-blue',
    
    // Roles & Types
    farmer: 'badge-blue', 
    driver: 'badge-purple', 
    admin: 'badge-gray',
    pickup: 'badge-blue', 
    delivery: 'badge-purple'
  };

  if (!status) return '';
  
  // 🟢 LOGIC OVERRIDE: Human-friendly status text for the dashboard
  let displayText = status;

  if (status === 'assigned') displayText = 'With Farmer';
  if (status === 'completed') displayText = 'Returned';
  if (status === 'delivered') displayText = 'Item Delivered';
  if (status === 'in_transit') displayText = 'On the Road';

  return `<span class="badge ${map[status] || 'badge-gray'}">${displayText.replace('_', ' ').toUpperCase()}</span>`;
}

// Keep your existing helpers as they were
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
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

function showLoading() {
  document.getElementById('content').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:16px;padding-top:8px">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px">
        ${[1,2,3,4].map(() => `
          <div class="card" style="padding:20px;animation:pulse 1.5s infinite">
            <div style="height:12px;background:var(--border);border-radius:4px;width:60%;margin-bottom:12px"></div>
            <div style="height:32px;background:var(--border);border-radius:4px;width:40%;margin-bottom:8px"></div>
          </div>
        `).join('')}
      </div>
      <div class="card" style="height:300px;animation:pulse 1.5s infinite"></div>
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

  // --- UPDATED LOGIC FOR MULTI-UNIT INVENTORY ---
  // We use .reduce to sum up all units across all equipment types
  const totalUnitsCount = equipList.reduce((sum, e) => sum + (parseInt(e.quantity) || 0), 0);
  const totalAvailCount = equipList.reduce((sum, e) => sum + (parseInt(e.available_quantity) || 0), 0);
  
  // For the status bars, we still need the count of reserved and maintenance units
  const reservedCount = equipList.reduce((sum, e) => {
      // Logic: Reserved units = Total - Available (excluding maintenance)
      if (e.status !== 'maintenance') {
          return sum + ((parseInt(e.quantity) || 0) - (parseInt(e.available_quantity) || 0));
      }
      return sum;
  }, 0);

  const maintCount = equipList.reduce((sum, e) => {
      return e.status === 'maintenance' ? sum + (parseInt(e.quantity) || 0) : sum;
  }, 0);

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
        <div class="stat-label">Total Equipment Units</div>
        <div class="stat-value">${totalUnitsCount}</div>
        <div class="stat-change">${totalAvailCount} currently available</div>
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
        <div class="stat-label">Units in Maintenance</div>
        <div class="stat-value">${maintCount}</div>
        <div class="stat-change">${totalUnitsCount - maintCount} units operational</div>
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
        <div class="card-header"><span class="card-title">Stock Status</span></div>
        <div style="display:flex;flex-direction:column;gap:14px;padding-top:8px">
          <div>
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px">
              <span>Available</span><strong style="color:var(--accent)">${totalAvailCount}/${totalUnitsCount}</strong>
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width:${totalUnitsCount ? Math.round(totalAvailCount/totalUnitsCount*100) : 0}%"></div></div>
          </div>
          <div>
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px">
              <span>Reserved</span><strong style="color:var(--orange)">${reservedCount}/${totalUnitsCount}</strong>
            </div>
            <div class="progress-bar"><div class="progress-fill orange" style="width:${totalUnitsCount ? Math.round(reservedCount/totalUnitsCount*100) : 0}%"></div></div>
          </div>
          <div>
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px">
              <span>Maintenance</span><strong style="color:var(--red)">${maintCount}/${totalUnitsCount}</strong>
            </div>
            <div class="progress-bar"><div class="progress-fill red" style="width:${totalUnitsCount ? Math.round(maintCount/totalUnitsCount*100) : 0}%"></div></div>
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

  // ─── 1. TAB HEADER CALCULATIONS ───
  const allCount   = equipment.reduce((sum, e) => sum + (parseInt(e.quantity) || 0), 0);
  const availCount = equipment.reduce((sum, e) => sum + (parseInt(e.available_quantity) || 0), 0);
  
  // Logic: Sum of units currently in farmer hands (excludes units in repair)
  const resCount   = equipment.reduce((sum, e) => {
      if (e.status !== 'maintenance') {
          const unitsOut = (parseInt(e.quantity) || 0) - (parseInt(e.available_quantity) || 0);
          return sum + Math.max(0, unitsOut);
      }
      return sum;
  }, 0);

  const maintCount = equipment.reduce((sum, e) => e.status === 'maintenance' ? sum + (parseInt(e.quantity) || 0) : sum, 0);

  // ─── 2. FILTERING LOGIC (The "Disappearing" Trick) ───
  if (filter === 'available') {
      list = list.filter(e => e.available_quantity > 0 && e.status !== 'maintenance');
  } 
  else if (filter === 'reserved') {
      // 🟢 Item DISAPPEARS if unitsOut is 0
      list = list.filter(e => {
          const unitsOut = parseInt(e.quantity) - parseInt(e.available_quantity);
          return unitsOut > 0 && e.status !== 'maintenance';
      });
  } 
  else if (filter === 'maintenance') {
      list = list.filter(e => e.status === 'maintenance');
  }

  document.getElementById('content').innerHTML = `
    <div class="page-header">
      <div><div class="page-heading">Equipment</div><div class="page-sub">Manage all farm equipment inventory</div></div>
      <button class="btn btn-primary" onclick="showAddEquipment()">＋ Add Equipment</button>
    </div>

    <div class="tabs">
      <button class="tab-btn ${filter==='all'?'active':''}" onclick="pages.equipment('all')">All Units (${allCount})</button>
      <button class="tab-btn ${filter==='available'?'active':''}" onclick="pages.equipment('available')">Available (${availCount})</button>
      <button class="tab-btn ${filter==='reserved'?'active':''}" onclick="pages.equipment('reserved')">Reserved (${resCount})</button>
      <button class="tab-btn ${filter==='maintenance'?'active':''}" onclick="pages.equipment('maintenance')">In Shop (${maintCount})</button>
    </div>

    <div class="equipment-grid">
      ${list.length ? list.map(e => {
        const unitsOut = parseInt(e.quantity) - parseInt(e.available_quantity);
        const stockColor = e.available_quantity > 0 ? 'var(--accent)' : 'var(--red)';
        
        return `
        <div class="equip-card">
          <div class="equip-img">⚙️</div>
          <div class="equip-body">
            <div class="equip-name">${e.equipment_name}</div>
            <div class="equip-cat">${e.category} · ${e.location || '—'}</div>
            
            <div style="display:flex; gap:8px; align-items:center; margin-top:5px; flex-wrap:wrap">
               ${statusBadge(e.status)}
               
               <span class="badge" style="background:rgba(255,255,255,0.05); border:1px solid ${stockColor}; color:${stockColor}">
                  Stock: ${e.available_quantity} / ${e.quantity}
               </span>

               ${unitsOut > 0 && e.status !== 'maintenance' ? `
                <span class="badge badge-orange" style="font-weight:700">
                   🔥 ${unitsOut} Unit(s) Rented
                </span>
               ` : ''}
            </div>

            <div class="equip-meta" style="margin-top:10px; display:flex; justify-content:space-between; align-items:center">
              <span class="equip-price">₱${e.rental_price.toLocaleString()}/day</span>
            </div>
            
            <div class="equip-actions">
              <button class="btn btn-ghost btn-sm" onclick="showEditEquipment(${e.equipment_id})">✏ Edit</button>
              <button class="btn btn-ghost btn-sm" onclick="showEquipMaintenance(${e.equipment_id})">🔧 Maintenance</button>
              <button class="btn btn-danger btn-sm" onclick="deleteEquipment(${e.equipment_id})">✕</button>
            </div>
          </div>
        </div>`;
      }).join('') : `<div class="empty-state"><div class="empty-icon">📋</div>No ${filter} equipment found</div>`}
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
    <div class="form-row">
      <div class="form-group">
        <label>Total Units (Stock)</label>
        <input class="form-control" type="number" id="eq-qty" value="1" min="1"/>
      </div>
      <div class="form-group">
        <label>Status</label>
        <select class="form-control" id="eq-status">
          <option value="available">Available</option>
          <option value="maintenance">Maintenance</option>
          <option value="reserved">Reserved (Out of Stock)</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Total Quantity</label>
        <input class="form-control" type="number" id="eq-qty"
              placeholder="e.g. 3" min="1" value="1"/>
            <div style="font-size:11px;color:var(--text3);margin-top:4px">
          How many units do you have?
        </div>
      </div>
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
  const qty = parseInt(document.getElementById('eq-qty')?.value) || 1;
  const result = await API.post('/equipment', {
    equipment_name: name,
    category:       document.getElementById('eq-cat').value,
    description:    document.getElementById('eq-desc').value,
    rental_price:   parseFloat(document.getElementById('eq-price').value) || 0,
    location:       document.getElementById('eq-loc').value,
    status:         'available',
    quantity:       qty,
    available_quantity: qty,
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

    <div class="section-divider" style="margin: 15px 0 10px; font-size: 11px; color: var(--text3); border-bottom: 1px solid var(--border)">INVENTORY CONTROL</div>
    <div class="form-row">
      <div class="form-group">
        <label>Total Units (Total Stock)</label>
        <input class="form-control" type="number" id="eq-qty" value="${e.quantity || 1}"/>
      </div>
      <div class="form-group">
        <label>Available Units (Current)</label>
        <input class="form-control" type="number" id="eq-avail" value="${e.available_quantity || 1}"/>
      </div>
    </div>

    <div class="form-group">
      <label>Status</label>
      <select class="form-control" id="eq-status">
        <option value="available" ${e.status==='available'?'selected':''}>Available</option>
        <option value="reserved" ${e.status==='reserved'?'selected':''}>Reserved (Out of Stock)</option>
        <option value="maintenance" ${e.status==='maintenance'?'selected':''}>Maintenance</option>
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="updateEquipment(${id})">Update Equipment</button>
    </div>
  `);
}
async function updateEquipment(id) {
  // 1. Get the values first
  const qty = parseInt(document.getElementById('eq-qty').value) || 0;
  const avail = parseInt(document.getElementById('eq-avail').value) || 0;

  // 2. 🟢 Safety Check BEFORE the API call
  if (avail > qty) {
      showToast('Available units cannot exceed total stock!', 'error');
      return; // Stops the function here so no data is sent
  }

  // 3. If everything is fine, send to the database
  const result = await API.put(`/equipment/${id}`, {
    equipment_name:     document.getElementById('eq-name').value,
    category:           document.getElementById('eq-cat').value,
    description:        document.getElementById('eq-desc').value,
    rental_price:       parseFloat(document.getElementById('eq-price').value) || 0,
    location:           document.getElementById('eq-loc').value,
    status:             document.getElementById('eq-status').value,
    quantity:           qty,
    available_quantity: avail
  });

  // 4. Handle the result
  closeModal();
  if (result) {
    showToast('Equipment updated successfully!');
    pages.equipment(); 
  } else {
    showToast('Failed to update equipment', 'error');
  }
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
  
  // 1. Fetch fresh data from your Laravel API
  const reservations = await API.get('/reservations') || [];
  let list = [...reservations];
  
  // 2. Filter the list based on the active tab
  if (filterStatus !== 'all') {
      list = list.filter(r => r.status === filterStatus);
  }
 
  // 3. Calculate Tab Counts
  const counts = {
    all:       reservations.length,
    pending:   reservations.filter(r => r.status === 'pending').length,
    approved:  reservations.filter(r => r.status === 'approved').length,
    assigned:  reservations.filter(r => r.status === 'assigned').length,
    rejected:  reservations.filter(r => r.status === 'rejected').length,
    completed: reservations.filter(r => r.status === 'completed').length,
    cancelled: reservations.filter(r => r.status === 'cancelled').length,
  };
 
  // 4. Render the UI
  document.getElementById('content').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-heading">Reservations</div>
        <div class="page-sub">Manage all farmer equipment reservations</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost" onclick="exportReservations()">⬇ Export CSV</button>
        <button class="btn btn-primary" onclick="showAddReservation()">＋ New Reservation</button>
      </div>
    </div>

    <div class="tabs">
      ${['all','pending','approved','assigned','rejected','completed','cancelled'].map(s => `
        <button class="tab-btn ${filterStatus === s ? 'active' : ''}" 
                onclick="pages.reservations('${s}')">
          ${s.charAt(0).toUpperCase() + s.slice(1)} (${counts[s] || 0})
        </button>
      `).join('')}
    </div>

    <div class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Farmer</th>
              <th>Equipment</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Type</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${list.length ? list.map(r => `
            <tr>
              <td><strong>#R${r.reservation_id}</strong></td>
              <td>
                <strong>${r.farmer ? r.farmer.name : '—'}</strong>
                <br><small style="color:var(--text3)">${r.farmer ? r.farmer.phone : ''}</small>
              </td>
              <td>
                ${r.equipment ? r.equipment.equipment_name : '—'}
                <br><small style="color:var(--text3)">${r.equipment ? r.equipment.category : ''}</small>
              </td>
              <td>${formatDate(r.start_date)}</td>
              <td>${formatDate(r.end_date)}</td>
              <td>${statusBadge(r.reservation_type)}</td>
              <td>${statusBadge(r.status)}</td>
              <td>
                <div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center">
                  
                  <button class="btn btn-ghost btn-sm btn-icon" 
                          onclick="viewReservation(${r.reservation_id})" title="View Details">👁</button>
 
                  ${r.status === 'pending' ? `
                    <button class="btn btn-primary btn-sm" onclick="approveReservation(${r.reservation_id})">✓ Approve</button>
                    <button class="btn btn-danger btn-sm" onclick="rejectReservation(${r.reservation_id})">✕ Reject</button>
                    <button class="btn btn-orange btn-sm" onclick="cancelReservation(${r.reservation_id})">✖ Cancel</button>
                  ` : ''}
 
                  ${r.status === 'approved' ? `
                    <button class="btn btn-orange btn-sm" onclick="cancelReservation(${r.reservation_id})">✖ Cancel</button>
                    ${r.reservation_type === 'delivery' ? `
                      <button class="btn btn-primary btn-sm" onclick="assignDelivery(${r.reservation_id})">🚚 Assign Driver</button>
                    ` : `
                      <button class="btn btn-ghost btn-sm" onclick="completeReservation(${r.reservation_id})">✔ Done</button>
                    `}
                  ` : ''}
 
                  ${r.status === 'assigned' ? `
                    <span class="badge badge-blue" style="padding:6px 12px">✓ Driver Assigned</span>
                  ` : ''}
 
                  ${['completed', 'rejected', 'cancelled'].includes(r.status) ? `
                    <button class="btn btn-danger btn-sm" 
                            onclick="deleteReservation(${r.reservation_id})" title="Delete Record">🗑</button>
                  ` : ''}

                </div>
              </td>
            </tr>`).join('') : `
              <tr>
                <td colspan="8">
                  <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    No ${filterStatus} reservations found
                  </div>
                </td>
              </tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

window.calcAutoDistance = async function() {
    const input = document.getElementById('calc-address')?.value.trim();
    if (!input) { showToast('Enter coordinates (lat, lng)', 'error'); return; }

    // Parse coordinates
    const parts = input.split(',');
    if (parts.length < 2) {
        showToast('Format: 7.9063, 125.0942', 'error');
        return;
    }
    const finalKm = result.road_distance_km;
    const lat = parseFloat(parts[0].trim());
    const lng = parseFloat(parts[1].trim());

    if (isNaN(lat) || isNaN(lng)) {
        showToast('Invalid coordinates. Example: 7.9063, 125.0942', 'error');
        return;
    }

    showToast('Calculating distance from base...', 'info');

    const result = await calculateDistance(lat, lng, null);

    if (result) {
        const km = result.km;

        // Fill distance input — try both possible IDs
        const distInput = document.getElementById('calc-dist');
        if (distInput) {
            distInput.value = km;
            distInput.dispatchEvent(new Event('input'));
        }

        // Update display labels
        const kmLabel    = document.getElementById('calc-auto-km');
        const durLabel   = document.getElementById('calc-auto-duration');
        const autoResult = document.getElementById('calc-auto-result');

        if (kmLabel)    kmLabel.textContent    = `${km} km`;
        if (durLabel)   durLabel.textContent   = `🕐 Drive time: ${result.duration}`;
        if (autoResult) autoResult.style.display = 'block';

        // Calculate fee
        window.calcDeliveryFee();

        showToast(`Distance: ${km} km · ${result.duration}`);
    } else {
        showToast('Could not calculate. Check your coordinates.', 'error');
    }
};

window.calcDeliveryFee = function() {
    // Support both possible element IDs
    const distEl    = document.getElementById('calc-dist');
    const rateEl    = document.getElementById('calc-rate')
                   || document.getElementById('calc-price-per-km');
    const resultEl  = document.getElementById('calc-result')
                   || document.getElementById('calc-fee-display');
    const formulaEl = document.getElementById('calc-formula');

    if (!distEl || !resultEl) return;

    const km    = parseFloat(distEl.value)  || 0;
    const price = parseFloat(rateEl?.value) || 25;
    const total = km * price;

    resultEl.textContent = `₱${total.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;

    if (formulaEl) {
        formulaEl.textContent = `Formula: ${km}km × ₱${price}/km`;
    }
};
window.toggleNotifs = function() {
    const dropdown = document.getElementById('notif-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
        // Refresh notifications when opened
        if (dropdown.classList.contains('active') && typeof loadNotifications === 'function') {
            loadNotifications();
        }
    } else {
        console.error("Could not find 'notif-dropdown' element in HTML.");
    }
};

window.updateNotifBadge = function(notifs) {
    const dismissed = window.getDismissed ? window.getDismissed() : [];
    
    // Filter out notifications the user already "X-ed" out
    const visible = notifs.filter(n => !dismissed.includes(n.key));
    window._notifs = notifs; 

    const unreadCount = visible.length;
    const badge = document.getElementById('notif-count');
    
    if (badge) {
        badge.textContent = unreadCount;
        // Show red dot only if there are active notifications
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
};

window.dismissNotif = function(key) {
    const dismissed = window.getDismissed ? window.getDismissed() : [];
    if (!dismissed.includes(key)) dismissed.push(key);
    
    if (window.saveDismissed) {
        window.saveDismissed(dismissed);
    } else {
        localStorage.setItem('dismissed_notifs', JSON.stringify(dismissed));
    }
    
    // Refresh the UI so the item disappears immediately
    if (typeof loadNotifications === 'function') {
        loadNotifications();
    }
    showToast("Notification cleared");
};
window.clearAllNotifs = function() {
    // 1. Check if we have any notifications loaded
    const notifs = window._notifs || [];
    if (notifs.length === 0) {
        showToast("No notifications to clear", "info");
        return;
    }

    if (confirm("Are you sure you want to clear all notifications?")) {
        // 2. Get the current dismissed list
        const dismissed = window.getDismissed ? window.getDismissed() : [];

        // 3. Add every current notification key to the dismissed list
        notifs.forEach(n => {
            if (n.key && !dismissed.includes(n.key)) {
                dismissed.push(n.key);
            }
        });

        // 4. Save the updated list back to Local Storage
        if (window.saveDismissed) {
            window.saveDismissed(dismissed);
        } else {
            localStorage.setItem('dismissed_notifs', JSON.stringify(dismissed));
        }

        // 5. Refresh the UI
        if (typeof loadNotifications === 'function') {
            loadNotifications();
        }
        
        // 6. Close the dropdown and show success
        const dropdown = document.getElementById('notif-dropdown');
        if (dropdown) dropdown.classList.remove('active');
        
        showToast("All notifications cleared");
    }
};


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

    // 1. 💰 Dynamic Cost Calculation
    const totalDays   = r.total_days || 0;
    const qty         = r.reserved_quantity || 1;
    const pricePerDay = r.equipment?.rental_price || 0;
    
    // Use Laravel virtual fields if available, otherwise fallback to JS math
    const rentalCost  = r.rental_total || (totalDays * qty * pricePerDay);
    const deliveryFee = r.shipping_fee || (delivery ? delivery.delivery_fee : 0);
    const grandTotal  = rentalCost + deliveryFee;

    // 2. 🚜 Identify "With Farmer" State
    // If assigned and delivered, it means the farmer has the item now.
    const isWithFarmer = r.status === 'assigned' && delivery?.delivery_status === 'delivered';

    openModal(`Reservation #R${id} Details`, `
        <div style="display:flex;flex-direction:column;gap:14px">

            <div style="padding:12px; border-radius:10px; text-align:center; background:var(--bg3); border:1px solid ${isWithFarmer ? 'var(--accent)' : 'var(--border)'}">
                <div style="font-size:11px; color:var(--text3); margin-bottom:4px">CURRENT STATUS</div>
                <div style="font-weight:800; color:${isWithFarmer ? 'var(--accent)' : 'var(--text1)'}">
                    ${isWithFarmer ? '🚜 EQUIPMENT CURRENTLY WITH FARMER' : 
                      r.status === 'completed' ? '✅ RESERVATION COMPLETED & RETURNED' : 
                      '📋 ' + r.status.toUpperCase()}
                </div>
            </div>

            <div class="card" style="background:var(--bg3)">
                <div class="section-divider">👤 Farmer Info</div>
                <div><strong>${r.farmer?.name || '—'}</strong></div>
                <div style="font-size:12px;color:var(--text3)">${r.farmer?.phone || ''}</div>
                <div style="font-size:12px;color:var(--text3);margin-top:4px">📍 ${r.farmer?.address || 'No address'}</div>
            </div>

            <div class="card" style="background:var(--bg3)">
                <div class="section-divider">⚙️ Equipment Info</div>
                <div style="display:flex;justify-content:space-between;align-items:center">
                    <div>
                        <strong>${r.equipment?.equipment_name || '—'}</strong>
                        <div style="font-size:11px;color:var(--text3)">${r.equipment?.category || ''}</div>
                    </div>
                    <div style="text-align:right">
                        <div style="font-size:18px;font-weight:800;color:var(--accent)">${qty} Unit(s)</div>
                        <div style="font-size:11px;color:var(--text3)">₱${pricePerDay.toLocaleString()}/day</div>
                    </div>
                </div>
            </div>

            <div class="card" style="background:var(--bg3)">
                <div class="section-divider">💰 Financial Summary</div>
                <div style="display:flex;flex-direction:column;gap:6px">
                    <div style="display:flex;justify-content:space-between;font-size:13px">
                        <span style="color:var(--text3)">Rental (${totalDays}d)</span>
                        <span>₱${rentalCost.toLocaleString()}</span>
                    </div>
                    ${delivery ? `
                    <div style="display:flex;justify-content:space-between;font-size:13px">
                        <span style="color:var(--text3)">Shipping Fee</span>
                        <span>₱${deliveryFee.toLocaleString()}</span>
                    </div>` : ''}
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;padding-top:6px;border-top:1px solid var(--border)">
                        <span style="font-weight:700">GRAND TOTAL</span>
                        <span style="font-size:22px;font-weight:800;color:var(--accent)">₱${grandTotal.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            ${(r.status === 'approved' || r.status === 'assigned') && r.status !== 'completed' ? `
            <div style="padding:15px; background:rgba(74,222,128,0.1); border-radius:10px; border:1px solid var(--accent); text-align:center; margin-top:10px">
                <p style="font-size:12px; color:var(--text2); margin-bottom:10px">Has the farmer physically returned the equipment?</p>
                <button class="btn btn-primary" onclick="returnEquipment(${id})" style="width:100%">
                    ✅ Confirm Equipment Return
                </button>
            </div>
            ` : ''}

            <div style="display:flex;gap:8px;align-items:center">
                ${statusBadge(r.status)}
                ${r.returned_at ? `<span class="badge badge-green">Returned: ${formatDate(r.returned_at)}</span>` : ''}
            </div>
        </div>
        <div class="modal-actions">
            <button class="btn btn-ghost" onclick="closeModal()">Close</button>
        </div>
    `);
}

// ── RETURN EQUIPMENT (Update Inventory Stock) ──
async function returnEquipment(id) {
    if (!confirm('Confirm that the equipment has been physically returned? \n\nThis will mark the reservation as COMPLETED and restore the units to available stock.')) return;
    
    showToast('Updating inventory stock...', 'info');
    
    // 1. Hit the backend: Route::put('/reservations/{id}/return')
    const result = await API.put(`/reservations/${id}/return`, {});
    
    // 2. Check for success (either status is completed or no error message)
    if (result && (result.status === 'completed' || !result.message)) {
        showToast('Inventory updated successfully! ✓');
        closeModal();
        
        // 3. 🔄 REFRESH DATA: Ensure the UI reflects the new stock immediately
        if (currentPage === 'reservations') pages.reservations();
        if (currentPage === 'dashboard') pages.dashboard();
        if (currentPage === 'equipment') pages.equipment();
        
        // 4. Update the notification bell (clears "Overdue" alerts for this item)
        loadNotifications(); 
        
    } else {
        // Handle specific error messages from Laravel (like 'Reservation not found')
        showToast(result?.message || 'Failed to process return. Check server connection.', 'error');
    }
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

  // Show equipment that has at least 1 unit available
  const availEquip = (equipment || []).filter(e => e.available_quantity > 0);

  openModal('New Reservation', `
    <div class="form-row">
      <div class="form-group">
        <label>Farmer</label>
        <select class="form-control" id="res-farmer">
          <option value="">-- Select Farmer --</option>
          ${(farmers || []).map(f => `<option value="${f.id}">${f.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group" style="flex: 0 0 100px;">
        <label>Qty</label>
        <input type="number" id="res-qty" class="form-control" value="1" min="1">
      </div>
    </div>

    <div class="form-group">
      <label>Equipment</label>
      <select class="form-control" id="res-equip">
        <option value="">-- Select Equipment --</option>
        ${availEquip.map(e => `<option value="${e.equipment_id}">${e.equipment_name} (${e.available_quantity} left) — ₱${e.rental_price}/day</option>`).join('')}
      </select>
    </div>

    <div class="form-row">
      <div class="form-group"><label>Start Date</label><input class="form-control" type="date" id="res-start"/></div>
      <div class="form-group"><label>End Date</label><input class="form-control" type="date" id="res-end"/></div>
    </div>

    <div class="form-group">
      <label>Reservation Type</label>
      <select class="form-control" id="res-type" onchange="handleResTypeChange(this.value)">
        <option value="pickup">Pickup (At Co-op)</option>
        <option value="delivery">Delivery (Pin on Map)</option>
      </select>
    </div>

    <div id="res-map-section" style="display:none; margin-top:15px; border-top: 1px solid var(--border); padding-top: 15px;">
      <label style="font-size:12px; color:var(--text3); display:block; margin-bottom:8px">📍 PIN DELIVERY LOCATION</label>
      <div id="res-map-picker" style="height: 250px; border-radius: 8px; border:1px solid var(--border); background: #1a222c;"></div>
      <div class="form-row" style="margin-top:10px">
        <div class="form-group"><label>Lat</label><input class="form-control" id="res-lat" readonly placeholder="0.0000"></div>
        <div class="form-group"><label>Lng</label><input class="form-control" id="res-lng" readonly placeholder="0.0000"></div>
      </div>
    </div>

    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="createReservation()">Create Reservation</button>
    </div>
  `);

  // Define the visibility toggle and map init logic
  window.handleResTypeChange = function(val) {
    const mapSection = document.getElementById('res-map-section');
    if (val === 'delivery') {
      mapSection.style.display = 'block';
      initResMapPicker();
    } else {
      mapSection.style.display = 'none';
    }
  };
}

// 🟢 NEW: Map Initialization Script
function initResMapPicker() {
  // Use a timeout to ensure the modal animation has finished
  setTimeout(() => {
    const defaultCoords = [7.9063, 125.0942]; // Valencia City
    const map = L.map('res-map-picker').setView(defaultCoords, 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);

    let marker;
    map.on('click', function(e) {
      if (marker) map.removeLayer(marker);
      marker = L.marker(e.latlng).addTo(map);
      document.getElementById('res-lat').value = e.latlng.lat.toFixed(6);
      document.getElementById('res-lng').value = e.latlng.lng.toFixed(6);
      showToast('Location pinned!', 'info');
    });

    // Fix for Leaflet grey tiles in modals
    setTimeout(() => map.invalidateSize(), 400);
  }, 300);
}

async function createReservation() {
  const farmerId = parseInt(document.getElementById('res-farmer').value);
  const equipId  = parseInt(document.getElementById('res-equip').value);
  const qty      = parseInt(document.getElementById('res-qty').value) || 1;
  const start    = document.getElementById('res-start').value;
  const end      = document.getElementById('res-end').value;
  const type     = document.getElementById('res-type').value;
  const lat      = document.getElementById('res-lat').value;
  const lng      = document.getElementById('res-lng').value;

  // Basic Validation
  if (!farmerId || !equipId || !start || !end) { 
    showToast('Please fill in all basic fields', 'error'); 
    return; 
  }

  // Map Validation for Deliveries
  if (type === 'delivery' && (!lat || !lng)) {
    showToast('Please pin a delivery location on the map', 'error');
    return;
  }

  const result = await API.post('/reservations', {
    user_id:           farmerId, 
    equipment_id:      equipId,
    reserved_quantity: qty,          // 🟢 New field
    start_date:        start, 
    end_date:          end, 
    reservation_type:  type,
    latitude:          lat || null,  // 🟢 New field
    longitude:         lng || null   // 🟢 New field
  });

  if (result && !result.message) {
    closeModal(); 
    showToast(`Reservation created for ${qty} unit(s)!`); 
    pages.reservations();
  } else {
    // This will show the "Only X units available" message from your Laravel Controller
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

  if (!driverId || !dist) { showToast('Please fill all fields', 'error'); return; }

  const result = await API.post('/deliveries', {
    reservation_id: reservationId, 
    driver_id: driverId,
    distance_km: dist, 
    price_per_km: rate, 
    delivery_date: date,
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

let deliveryMarkers  = [];
let trackingMap      = null;
let trackingInterval = null;
let driverMarkers    = {};
 
pages.deliveries = async function () {
  showLoading();
 
  if (window.trackingInterval) clearInterval(window.trackingInterval);

  // Refresh driver pins every 5 seconds
  window.trackingInterval = setInterval(async () => {
    if (currentPage !== 'deliveries') {
        clearInterval(window.trackingInterval);
        return;
    }
    
    // This calls your Laravel Cloud route: GET /api/drivers/locations
    await loadDriverLocations(activeDeliveries);
  }, 5000);
  // Reset markers
  driverMarkers = {};
 
  const deliveries = await API.get('/deliveries') || [];
  const pending    = deliveries.filter(d => d.delivery_status === 'pending').length;
  const inTransit  = deliveries.filter(d => d.delivery_status === 'in_transit').length;
  const delivered  = deliveries.filter(d => d.delivery_status === 'delivered').length;
 
  // Active deliveries for map pins
  const activeDeliveries = deliveries.filter(d => d.delivery_status === 'in_transit');
 
  document.getElementById('content').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-heading">Deliveries</div>
        <div class="page-sub">Track all equipment delivery operations</div>
      </div>
    </div>
 
    <!-- Stats -->
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
              ${inTransit} driver${inTransit > 1 ? 's' : ''} in transit
            </div>
          ` : `
            <span style="font-size:12px;color:var(--text3)">No active deliveries</span>
          `}
          <button class="btn btn-ghost btn-sm" onclick="refreshDriverLocations()">
            🔄 Refresh
          </button>
        </div>
      </div>
 
      <!-- Legend -->
      <div class="map-legend">
        <div class="map-legend-item">
          <div class="legend-dot driver-online"></div>
          <span>Driver Location (live)</span>
        </div>
        <div class="map-legend-item">
          <div class="legend-dot delivery-addr"></div>
          <span>Delivery Address</span>
        </div>
        <div class="map-legend-item">
          <div class="legend-dot base-location"></div>
          <span>Base Location</span>
        </div>
      </div>
 
      <!-- Map container — must have explicit height -->
      <div id="live-map"
           style="height:420px;width:100%;border-radius:12px;
                  border:1px solid var(--border);overflow:hidden;
                  background:#0d1117">
      </div>
 
      <!-- Driver list below map -->
      <div id="driver-list" style="margin-top:12px;display:flex;flex-direction:column;gap:8px">
        <div style="font-size:13px;color:var(--text3);text-align:center;padding:12px">
          Loading driver locations...
        </div>
      </div>
    </div>
 
    <!-- Deliveries Table + Calculator -->
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
                  : '<span style="color:var(--text3)">Unassigned</span>'
                }</td>
                <td style="max-width:140px">
                  <span style="font-size:11px;color:var(--text3)">
                    ${d.delivery_address
                      ? `📍 ${d.delivery_address.substring(0, 40)}${d.delivery_address.length > 40 ? '…' : ''}`
                      : '<span style="color:var(--red)">No address</span>'
                    }
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
                      ${d.delivery_status === 'pending'    ? 'selected' : ''}>Pending</option>
                    <option value="in_transit"
                      ${d.delivery_status === 'in_transit' ? 'selected' : ''}>In Transit</option>
                    <option value="delivered"
                      ${d.delivery_status === 'delivered'  ? 'selected' : ''}>Delivered</option>
                  </select>
                </td>
              </tr>`).join('') : `
                <tr><td colspan="7">
                  <div class="empty-state">
                    <div class="empty-icon">🚚</div>No deliveries yet
                  </div>
                </td></tr>
              `}
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
            <div style="font-size:36px;font-weight:800;color:var(--accent);
                        font-family:var(--font-head)" id="calc-result">₱0.00</div>
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
 
  // Initialize map after DOM renders
  setTimeout(() => {
    initTrackingMap(activeDeliveries);
    loadDriverLocations(activeDeliveries);
 
    // Auto-refresh every 10 seconds if drivers are active
    trackingInterval = setInterval(() => {
      loadDriverLocations(activeDeliveries);
    }, 10000);
 
  }, 300);
};
 
 
// ── MAP INITIALIZATION ────────────────────────────────────────
function initTrackingMap(activeDeliveries) {
  // Destroy old map if exists
  if (trackingMap) {
    trackingMap.remove();
    trackingMap = null;
  }
 
  // Base location — your house
  const baseLat = 7.9038584645570635;
  const baseLng = 125.09822284783338;
 
  trackingMap = L.map('live-map').setView([baseLat, baseLng], 13);
 
  // OpenStreetMap — completely free, no API key
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(trackingMap);
 
  // Base location marker (blue)
  const baseIcon = L.divIcon({
    html: `<div style="background:#60a5fa;width:16px;height:16px;border-radius:50%;
                border:3px solid white;box-shadow:0 2px 8px rgba(96,165,250,0.6)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    className: ''
  });
 
  L.marker([baseLat, baseLng], { icon: baseIcon })
    .addTo(trackingMap)
    .bindPopup('<strong>📍 Base Location</strong><br>Your house, Valencia City, Bukidnon');
 
  // Delivery address markers (red)
  activeDeliveries.forEach((d, index) => {
    if (!d.latitude || !d.longitude) return;
 
    // Slight offset if multiple deliveries at same spot
    const offsetLat = d.latitude  + (index * 0.0001);
    const offsetLng = d.longitude + (index * 0.0001);
 
    const deliveryIcon = L.divIcon({
      html: `<div style="background:#f87171;width:16px;height:16px;border-radius:50%;
                  border:3px solid white;box-shadow:0 2px 8px rgba(248,113,113,0.6)"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      className: ''
    });
 
    L.marker([offsetLat, offsetLng], { icon: deliveryIcon })
      .addTo(trackingMap)
      .bindPopup(`
        <strong>📦 Delivery Destination</strong><br>
        <b>${d.reservation?.equipment?.equipment_name || 'Equipment'}</b><br>
        → ${d.reservation?.farmer?.name || 'Farmer'}<br>
        <small style="color:#666">${d.delivery_address || 'No address'}</small>
      `);
  });
}
 
 
// ── LOAD DRIVER LOCATIONS ─────────────────────────────────────
async function loadDriverLocations() {
    // 1. Fetch drivers from API (Laravel Controller filtered to subMinutes(2))
    const drivers = await API.get('/drivers/locations');
    const driverList = document.getElementById('driver-list');
    const badge = document.querySelector('.tracking-badge');

    if (!drivers || !trackingMap) return;

    // 2. 🟢 GHOST CLEANUP: Remove drivers who stop pinging
    const serverIds = drivers.map(d => d.id.toString());
    Object.keys(driverMarkers).forEach(id => {
        if (!serverIds.includes(id)) {
            trackingMap.removeLayer(driverMarkers[id]); // Wipe icon from map
            delete driverMarkers[id]; // Wipe from memory
        }
    });

    // 3. Update the "Live" badge status
    if (badge) {
        if (drivers.length > 0) {
            badge.style.display = 'flex';
            badge.innerHTML = `<div class="pulse-dot"></div> ${drivers.length} driver${drivers.length > 1 ? 's' : ''} live`;
        } else {
            badge.style.display = 'none';
        }
    }

    // 4. Handle Empty List UI
    if (drivers.length === 0) {
        if (driverList) {
            driverList.innerHTML = `<div style="font-size:13px;color:var(--text3);text-align:center;padding:12px">No drivers currently active</div>`;
        }
        return;
    }

    // 5. Update or Create Driver Markers
    drivers.forEach((driver, index) => {
        const lat = parseFloat(driver.current_lat);
        const lng = parseFloat(driver.current_lng);
        if (!lat || !lng) return;

        // Visual offset for multiple drivers in same area
        const offsetLat = lat + (index * 0.0002);
        const offsetLng = lng + (index * 0.0002);

        let timeText = 'Just now';
        if (driver.location_updated_at) {
            const updated = new Date(driver.location_updated_at);
            if (!isNaN(updated.getTime())) timeText = updated.toLocaleTimeString();
        }

        const driverIcon = L.divIcon({
            html: `
                <div style="position:relative;width:20px;height:20px">
                    <div style="position:absolute;top:2px;left:2px;background:#4ade80;
                                width:16px;height:16px;border-radius:50%;
                                border:3px solid white;box-shadow:0 2px 8px rgba(74,222,128,0.7)">
                    </div>
                    <div style="position:absolute;top:0;left:0;width:20px;height:20px;
                                border-radius:50%;border:2px solid #4ade80;
                                animation:pulse-green 1.5s infinite;opacity:0.5">
                    </div>
                </div>`,
            iconSize: [20, 20], iconAnchor: [10, 10], className: ''
        });

        const popupContent = `<strong>🚗 ${driver.name}</strong><br><small>Updated: ${timeText}</small>`;

        if (driverMarkers[driver.id]) {
            // Smoothly move the icon if already exists
            driverMarkers[driver.id].setLatLng([offsetLat, offsetLng]).setPopupContent(popupContent);
        } else {
            // Place a new icon
            driverMarkers[driver.id] = L.marker([offsetLat, offsetLng], { icon: driverIcon })
                .addTo(trackingMap).bindPopup(popupContent);
        }
    });

    // 6. Update Driver List below the map
    if (driverList) {
        driverList.innerHTML = drivers.map(d => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:var(--bg3);border-radius:10px">
                <div style="display:flex;align-items:center;gap:12px">
                    <div class="pulse-dot"></div>
                    <div>
                        <div style="font-weight:600;color:var(--text1);font-size:14px">${d.name}</div>
                        <div style="font-size:11px;color:var(--text3)">📍 ${parseFloat(d.current_lat).toFixed(5)}, ${parseFloat(d.current_lng).toFixed(5)}</div>
                    </div>
                </div>
                <button class="btn btn-ghost btn-sm" onclick="centerOnDriver(${d.current_lat}, ${d.current_lng}, '${d.name}')">🎯 Focus</button>
            </div>`).join('');
    }
}
window.refreshDriverLocations = async function() {
    showToast('Syncing live GPS data...', 'info');
    await loadDriverLocations();
};

// 2. Click the 'Focus' button to center the map on a driver
window.centerOnDriver = function(lat, lng, name) {
    if (!trackingMap) return;
    
    // Zoom in and center on the driver
    trackingMap.setView([lat, lng], 16, {
        animate: true,
        duration: 1.0
    });

    // Automatically open the driver's popup
    if (driverMarkers[name] || Object.values(driverMarkers).length > 0) {
        // Find marker by ID or proximity
        showToast(`Focusing on ${name}`);
    }
};

// 3. Status Update Handler for the Table
window.updateDeliveryStatus = async function(deliveryId, newStatus) {
    const confirmMsg = `Are you sure you want to mark Delivery #D${deliveryId} as ${newStatus.toUpperCase()}?`;
    if (!confirm(confirmMsg)) return;

    const result = await API.post(`/deliveries/${deliveryId}/status`, {
        status: newStatus
    });

    if (result) {
        showToast('Delivery status updated successfully', 'success');
        pages.deliveries(); // Refresh the entire view to update stats
    } else {
        showToast('Failed to update status', 'error');
    }
};
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

// 🟢 MODIFIED: Added validation and active flag
async function saveUser(role) {
  const name = document.getElementById('usr-name').value.trim();
  const email = document.getElementById('usr-email').value.trim();
  const pass = document.getElementById('usr-pass').value;

  if (!name || !email || !pass) { 
    showToast('Name, Email, and Password are required', 'error'); 
    return; 
  }

  const result = await API.post('/users', {
    name, 
    email,
    password: pass, 
    role,
    phone: document.getElementById('usr-phone').value,
    address: document.getElementById('usr-address').value,
    is_active: true // 🟢 Ensures the user is immediately usable
  });

  if (result && !result.message) {
    closeModal();
    showToast(`${role.charAt(0).toUpperCase() + role.slice(1)} account created!`);
    role === 'farmer' ? pages.farmers() : pages.drivers();
  } else {
    showToast(result?.message || 'Email might already be taken', 'error');
  }
}

// 🟢 MODIFIED: Added Live Tracking Info to User Profile
async function viewUser(id) {
  const u = await API.get(`/users/${id}`);
  if (!u) return;
  const resHistory = u.reservations || [];
  const delHistory = u.deliveries  || [];

  openModal('User Profile', `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
      <div class="admin-avatar" style="width:52px;height:52px;font-size:22px;background:${u.role === 'driver' ? 'var(--purple)' : 'var(--blue)'}">${u.name[0]}</div>
      <div>
        <div style="font-family:var(--font-head);font-size:18px;font-weight:700">${u.name}</div>
        <div style="color:var(--text3);font-size:13px">${u.email}</div>
        <div style="margin-top:4px">${statusBadge(u.role)}</div>
      </div>
    </div>

    ${u.role === 'driver' && u.current_lat ? `
      <div style="padding:12px;background:var(--bg3);border-radius:8px;margin-bottom:16px;border:1px solid var(--purple)">
        <div style="font-size:11px;color:var(--text3);margin-bottom:4px">📡 LIVE TRACKING STATUS</div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--accent)">Active at ${u.current_lat}, ${u.current_lng}</div>
            <div style="font-size:11px;color:var(--text3)">Last seen: ${u.location_updated_at ? new Date(u.location_updated_at).toLocaleString() : 'Never'}</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="closeModal(); navigate('deliveries'); setTimeout(() => centerOnDriver(${u.current_lat}, ${u.current_lng}, '${u.name}'), 500)">
            🎯 Locate
          </button>
        </div>
      </div>
    ` : ''}

    <div class="form-row" style="margin-bottom:12px">
      <div><label style="font-size:11px;color:var(--text3)">PHONE</label><div>${u.phone || '—'}</div></div>
      <div><label style="font-size:11px;color:var(--text3)">JOINED</label><div>${formatDate(u.created_at)}</div></div>
    </div>
    <div style="margin-bottom:16px"><label style="font-size:11px;color:var(--text3)">ADDRESS</label><div>${u.address || '—'}</div></div>

    ${u.role === 'farmer' ? `
      <div class="section-divider">Reservation History (${resHistory.length})</div>
      ${resHistory.map(r => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);font-size:13px">
          <div>
            <strong>${r.equipment ? r.equipment.equipment_name : '—'}</strong>
            <div style="font-size:11px;color:var(--text3)">${formatDate(r.start_date)} → ${formatDate(r.end_date)}</div>
          </div>
          <div style="display:flex;gap:6px">${statusBadge(r.status)}${statusBadge(r.reservation_type)}</div>
        </div>`).join('')}
    ` : ''}

    ${u.role === 'driver' ? `
      <div class="section-divider">Delivery History (${delHistory.length})</div>
      ${delHistory.map(d => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);font-size:13px">
          <div>
            <strong>${d.reservation?.equipment?.equipment_name || '—'}</strong>
            <div style="font-size:11px;color:var(--text3)">→ ${d.reservation?.farmer?.name || '—'} · ${d.distance_km}km</div>
          </div>
          <div>${statusBadge(d.delivery_status)}</div>
        </div>`).join('')}
    ` : ''}

    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Close</button>
    </div>
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
  // 🟢 SAFETY FIX: Use allSettled so one 500 error doesn't kill the whole app
  const results = await Promise.allSettled([
    API.get('/reservations'),
    API.get('/deliveries'),
    API.get('/maintenance'),
    API.get('/equipment'),
    API.get('/settings')
  ]);

  // Extract values safely. If a request failed, we default to an empty array/object
  const reservations = results[0].status === 'fulfilled' ? (results[0].value || []) : [];
  const deliveries   = results[1].status === 'fulfilled' ? (results[1].value || []) : [];
  const maintenance  = results[2].status === 'fulfilled' ? (results[2].value || []) : [];
  const equipment    = results[3].status === 'fulfilled' ? (results[3].value || []) : [];
  const settings     = results[4].status === 'fulfilled' ? (results[4].value || {}) : {};

  const notifs    = [];
  const alertDays = parseInt(settings?.maintenance_alert_days) || 30;
  const today     = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow  = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 1. Due Date Alerts (Overdue, Today, Tomorrow)
  (reservations || [])
    .filter(r => ['approved', 'assigned'].includes(r.status))
    .forEach(r => {
      if (!r.end_date) return;
      const endDate = new Date(r.end_date);
      endDate.setHours(0, 0, 0, 0);

      const equipName = r.equipment?.equipment_name || 'Equipment';
      const farmerName = r.farmer?.name || 'Farmer';
      const key = `due-${r.reservation_id}`;

      if (endDate < today) {
        const daysOver = Math.floor((today - endDate) / 86400000);
        notifs.push({
          key,
          text: `⚠️ OVERDUE: ${equipName} borrowed by ${farmerName} is ${daysOver} day${daysOver > 1 ? 's' : ''} overdue!`,
          unread: true,
          action: `viewReservation(${r.reservation_id})`
        });
      } else if (endDate.getTime() === today.getTime()) {
        notifs.push({
          key,
          text: `🔔 DUE TODAY: ${equipName} borrowed by ${farmerName} must be returned today!`,
          unread: true,
          action: `viewReservation(${r.reservation_id})`
        });
      } else if (endDate.getTime() === tomorrow.getTime()) {
        notifs.push({
          key,
          text: `📅 Due tomorrow: ${equipName} borrowed by ${farmerName} is due back tomorrow`,
          unread: true,
          action: `viewReservation(${r.reservation_id})`
        });
      }
    });

  // 2. Pending Reservations Alert
  (reservations || []).filter(r => r.status === 'pending').forEach(r => {
    notifs.push({
      key: `res-${r.reservation_id}`,
      text: `New reservation from ${r.farmer?.name || 'a farmer'}`,
      unread: true,
      action: `viewReservation(${r.reservation_id})`
    });
  });

  // 3. In-Transit Deliveries Alert
  (deliveries || []).filter(d => d.delivery_status === 'in_transit').forEach(d => {
    notifs.push({
      key: `del-${d.delivery_id}`,
      text: `Delivery #D${d.delivery_id} is in transit`,
      unread: true,
      action: `Maps('deliveries')`
    });
  });

  // 4. Maintenance Alerts
  (equipment || []).forEach(e => {
    const records = (maintenance || []).filter(m => m.equipment_id === e.equipment_id);
    if (records.length === 0) {
      notifs.push({
        key: `maint-never-${e.equipment_id}`,
        text: `⚠️ ${e.equipment_name} has never been maintained`,
        unread: true,
        action: `Maps('maintenance')`
      });
    } else {
      const lastDate = new Date(records[0].maintenance_date);
      const daysSince = Math.floor((Date.now() - lastDate) / 86400000);
      if (daysSince >= alertDays) {
        notifs.push({
          key: `maint-due-${e.equipment_id}`,
          text: `⚠️ ${e.equipment_name} needs maintenance (${daysSince} days ago)`,
          unread: true,
          action: `Maps('maintenance')`
        });
      }
    }
  });

  // Final rendering logic
  const dismissed = getDismissed();
  const visible = notifs.filter(n => !dismissed.includes(n.key));
  window._notifs = notifs;

  const unreadCount = visible.filter(n => n.unread).length;
  const badge = document.getElementById('notif-count');
  if (badge) {
    badge.textContent = unreadCount;
    badge.style.display = unreadCount > 0 ? 'flex' : 'none';
  }

  const list = document.getElementById('notif-list');
  if (!list) return;
  list.innerHTML = visible.length
    ? `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 16px;border-bottom:1px solid var(--border)">
        <span style="font-size:12px;color:var(--text3)">${unreadCount} unread</span>
        <span style="font-size:12px;color:var(--accent);cursor:pointer" onclick="clearAllNotifs()">Clear all</span>
      </div>
      ${visible.map(n => `
        <div class="notif-item ${n.unread ? 'unread' : ''}" style="display:flex;justify-content:space-between;align-items:center">
          <span onclick="toggleNotifs(); ${n.action}" style="flex:1;cursor:pointer">${n.text}</span>
          <span onclick="dismissNotif('${n.key}')" style="color:var(--text3);padding:0 8px;font-size:16px;cursor:pointer">✕</span>
        </div>`).join('')}
    `
    : '<div class="notif-item">No new notifications</div>';
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
// Start this when the admin opens the tracking tab
function startLiveTracking() {
    // Check for movement every 5 seconds
    setInterval(async () => {
        // 1. Get the list of deliveries that are 'in_transit'
        const activeDeliveries = await API.get('/deliveries/active'); 
        
        if (activeDeliveries) {
            // 2. Refresh the map markers using the function we fixed earlier
            // This moves the marker to the new current_lat/lng in the DB
            loadDriverLocations(activeDeliveries);
        }
    }, 5000); 
}
// Change this at the bottom of your file
window.centerOnDriver = function(lat, lng, name) {
    if (!lat || !lng) {
        showToast(`No GPS coordinates for ${name}`, 'error');
        return;
    }
    
    // Smoothly fly the camera to the driver
    if (trackingMap) {
        trackingMap.flyTo([lat, lng], 16, {
            animate: true,
            duration: 1.5
        });
        showToast(`Focusing on ${name}`, 'info');
    }
};
// ==================== INIT ====================
const savedToken = localStorage.getItem('auth_token');
if (savedToken) {
  API.TOKEN = savedToken;
  navigate('dashboard');
  loadNotifications();
} else {
  showLoginPage();
}
// --- NOTIFICATION HELPERS ---
// 1. Get the list of IDs the user has already clicked "X" on
window.getDismissed = function() {
  return JSON.parse(localStorage.getItem('dismissed_notifs') || '[]');
};

// 2. Save a new ID to the dismissed list in the browser
window.saveDismissed = function(list) {
  localStorage.setItem('dismissed_notifs', JSON.stringify(list));
};

// 3. The actual display logic (Your Code Integrated)
window.updateNotifBadge = function(notifs) {
  const dismissed = getDismissed();
  
  // Only show notifications that haven't been dismissed
  const visible = notifs.filter(n => !dismissed.includes(n.key));
  window._notifs = notifs; // Store globally for clearAll function

  const unreadCount = visible.length; // Count visible items
  const badge = document.getElementById('notif-count');
  
  if (badge) {
    badge.textContent = unreadCount;
    // 🟢 Show the red dot only if there are new items
    badge.style.display = unreadCount > 0 ? 'flex' : 'none';
  }
};
window.dismissNotif = function(key) {
  const dismissed = getDismissed();
  if (!dismissed.includes(key)) dismissed.push(key);
  saveDismissed(dismissed);
  
  // Refresh the UI immediately
  loadNotifications(); 
  showToast("Notification cleared");
};
