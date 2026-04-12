<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>AgriReserve — Farm Equipment Management System</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="style.css"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
</head>
<body>

<!-- SIDEBAR -->
<aside class="sidebar" id="sidebar">
  <div class="sidebar-brand">
    <div class="brand-icon">🌾</div>
    <div class="brand-text">
      <span class="brand-name">AgriReserve</span>
      <span class="brand-sub">Admin Panel</span>
    </div>
  </div>

  <nav class="sidebar-nav">
    <a class="nav-item active" data-page="dashboard" onclick="navigate('dashboard')">
      <span class="nav-icon">◈</span><span>Dashboard</span>
    </a>
    <a class="nav-item" data-page="equipment" onclick="navigate('equipment')">
      <span class="nav-icon">⚙</span><span>Equipment</span>
    </a>
    <a class="nav-item" data-page="reservations" onclick="navigate('reservations')">
      <span class="nav-icon">📋</span><span>Reservations</span>
    </a>
    <a class="nav-item" data-page="deliveries" onclick="navigate('deliveries')">
      <span class="nav-icon">🚚</span><span>Deliveries</span>
    </a>
    <a class="nav-item" data-page="maintenance" onclick="navigate('maintenance')">
      <span class="nav-icon">🔧</span><span>Maintenance</span>
    </a>
    <a class="nav-item" data-page="farmers" onclick="navigate('farmers')">
      <span class="nav-icon">👤</span><span>Farmers</span>
    </a>
    <a class="nav-item" data-page="drivers" onclick="navigate('drivers')">
      <span class="nav-icon">🧑‍✈️</span><span>Drivers</span>
    </a>
    <a class="nav-item" data-page="feedback" onclick="navigate('feedback')">
      <span class="nav-icon">⭐</span><span>Feedback</span>
    </a>
    <a class="nav-item" data-page="reports" onclick="navigate('reports')">
      <span class="nav-icon">📊</span><span>Reports</span>
    </a>
    <a class="nav-item" data-page="settings" onclick="navigate('settings')">
      <span class="nav-icon">⚙</span><span>Settings</span>
    </a>
  </nav>

  <div class="sidebar-footer">
    <div class="admin-card">
      <div class="admin-avatar">A</div>
      <div class="admin-info">
        <span class="admin-name">Admin</span>
        <span class="admin-role">Administrator</span>
      </div>
      <span class="logout-btn" onclick="showLogout()">↩</span>
    </div>
  </div>
</aside>

<!-- MAIN CONTENT -->
<main class="main" id="main">
  <header class="topbar">
    <div class="topbar-left">
      <button class="menu-toggle" onclick="toggleSidebar()">☰</button>
      <div class="page-breadcrumb">
        <span id="page-title">Dashboard</span>
      </div>
    </div>
    <div class="topbar-right">
      <div class="search-box">
        <input type="text" placeholder="Search…" id="global-search" oninput="globalSearch(this.value)"/>
        <span>🔍</span>
      </div>
      <div class="notif-bell" onclick="toggleNotifs()">
        🔔 <span class="notif-badge" id="notif-count">3</span>
      </div>
      <div class="notif-dropdown" id="notif-dropdown">
        <div class="notif-header">Notifications</div>
        <div id="notif-list"><div class="notif-item">Loading...</div></div>
      </div>
    </div>
  </header>

  <div class="content" id="content">
    <!-- Pages injected here by JS -->
  </div>
</main>

<!-- MODAL OVERLAY -->
<div class="modal-overlay" id="modal-overlay" onclick="closeModal()"></div>
<div class="modal" id="modal">
  <div class="modal-header">
    <span id="modal-title">Modal</span>
    <button onclick="closeModal()">✕</button>
  </div>
  <div class="modal-body" id="modal-body"></div>
</div>

<!-- TOAST -->
<div class="toast" id="toast"></div>

<script src="app.js"></script>
</body>
</html>
