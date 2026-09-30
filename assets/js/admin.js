/**
 * HADI REAL ESTATE — COMPREHENSIVE CRM & ADMIN PLATFORM SCRIPT
 * Full-featured executive dashboard, drag-and-drop Kanban pipeline,
 * lead scoring, 1-minute bell polling, agent isolation, deal closing with 2% commission,
 * viewings scheduler, agent leaderboard, stale leads tracking, Excel export, and CRUD.
 */

let currentUser = null;
let currentAuthToken = null;
let allPropertiesCache = [];
let allStaffCache = [];
let currentViewingLeadId = null;

document.addEventListener('DOMContentLoaded', () => {
  initAuthSession();
  initAdminNavigation();
  initBellNotifications();
  loadInitialData();
  
  // Set 1-minute auto-refresh interval for incoming new leads
  setInterval(refreshBellCount, 60000);
});

// --------------------------------------------------------------------------
// 1. AUTHENTICATION & SESSION MANAGEMENT
// --------------------------------------------------------------------------
function initAuthSession() {
  const token = localStorage.getItem('hre_auth_token');
  const userJson = localStorage.getItem('hre_auth_user');

  if (!token || !userJson) {
    // If not logged in, redirect to login page
    window.location.href = '/login.html';
    return;
  }

  try {
    currentUser = JSON.parse(userJson);
    currentAuthToken = token;

    const userRoleTag = document.getElementById('userRoleTag');
    const userNameTag = document.getElementById('userNameTag');
    const roleBadge = document.getElementById('adminPortalRoleBadge');
    const userAvatarImg = document.getElementById('userAvatarImg');

    if (userRoleTag) userRoleTag.textContent = currentUser.role.toUpperCase();
    if (userNameTag) userNameTag.textContent = currentUser.name;
    if (userAvatarImg && currentUser.avatar_url) {
      userAvatarImg.src = currentUser.avatar_url;
    }
    if (roleBadge) {
      roleBadge.textContent = currentUser.role === 'Admin' ? 'EXECUTIVE ADMIN' : 'AGENT PORTAL';
    }

    // Sign out button
    const signOutBtn = document.getElementById('adminSignOutBtn');
    if (signOutBtn) {
      signOutBtn.addEventListener('click', handleSignOut);
    }
  } catch (e) {
    localStorage.clear();
    window.location.href = '/login.html';
  }
}

function handleSignOut() {
  localStorage.removeItem('hre_auth_token');
  localStorage.removeItem('hre_auth_user');
  window.location.href = '/login.html';
}

function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${currentAuthToken}`
  };
}

// Format AED numbers
function formatAED(amount) {
  if (!amount || isNaN(amount)) return 'AED 0';
  return 'AED ' + Math.round(Number(amount)).toLocaleString('en-US');
}

// --------------------------------------------------------------------------
// 2. BELL NOTIFICATION POLLING (EVERY 1 MINUTE)
// --------------------------------------------------------------------------
function initBellNotifications() {
  const bellContainer = document.getElementById('bellContainer');
  const bellBtn = document.getElementById('bellBtn');
  const bellDropdown = document.getElementById('bellDropdown');

  if (bellBtn && bellDropdown) {
    bellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      bellDropdown.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
      if (!bellContainer.contains(e.target)) {
        bellDropdown.classList.remove('active');
      }
    });
  }

  refreshBellCount();
}

async function refreshBellCount() {
  try {
    const res = await fetch('/api/admin/new-leads-count', { headers: getAuthHeaders() });
    if (!res.ok) return;

    const data = await res.json();
    const count = data.count || 0;
    const badge = document.getElementById('bellBadge');
    const summary = document.getElementById('bellCountSummary');
    const list = document.getElementById('bellList');

    if (badge) {
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }

    if (summary) {
      summary.textContent = `${count} New Leads`;
    }

    if (list && data.latestLeads) {
      if (data.latestLeads.length === 0) {
        list.innerHTML = `<div style="padding: 1.5rem; text-align: center; color: #888; font-size: 0.8rem;">No uncontacted leads.</div>`;
      } else {
        list.innerHTML = data.latestLeads.map(l => `
          <div class="bell-item" onclick="openLeadDrawer(${l.id})">
            <div class="bell-item-name">${l.full_name}</div>
            <div class="bell-item-meta">
              <span>${l.budget_aed || 'Not Specified'}</span>
              <span class="score-badge ${l.score_label || 'WARM'}">${l.score_label || 'WARM'}</span>
            </div>
            <div style="font-size: 0.68rem; color: #777; margin-top: 2px;">
              ${l.source || 'Website'} • ${l.phone}
            </div>
          </div>
        `).join('');
      }
    }
  } catch (err) {
    console.error('Failed to poll new leads count:', err);
  }
}

// --------------------------------------------------------------------------
// 3. NAVIGATION & TABS
// --------------------------------------------------------------------------
function initAdminNavigation() {
  const tabs = document.querySelectorAll('.admin-nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');
      switchAdminTab(targetTab);
    });
  });

  // Filter events on Leads Tab
  const searchInput = document.getElementById('leadSearchInput');
  const stageFilter = document.getElementById('leadStageFilter');
  const scoreFilter = document.getElementById('leadScoreFilter');
  const staleFilter = document.getElementById('leadStaleFilter');

  if (searchInput) searchInput.addEventListener('input', debounce(loadLeadsTable, 300));
  if (stageFilter) stageFilter.addEventListener('change', loadLeadsTable);
  if (scoreFilter) scoreFilter.addEventListener('change', loadLeadsTable);
  if (staleFilter) staleFilter.addEventListener('change', loadLeadsTable);
}

function switchAdminTab(tabId, filterPreset = null) {
  // Update nav buttons
  document.querySelectorAll('.admin-nav-tab').forEach(t => {
    t.classList.toggle('active', t.getAttribute('data-tab') === tabId);
  });

  // Update tab views
  document.querySelectorAll('.tab-view').forEach(v => {
    v.classList.toggle('active', v.id === tabId);
  });

  // Update titles
  const title = document.getElementById('subBarTitle');
  const tag = document.getElementById('subBarTag');

  if (tabId === 'tabDashboard') {
    if (tag) tag.textContent = 'EXECUTIVE OVERVIEW';
    if (title) title.textContent = 'Brokerage Operations Dashboard';
    loadDashboardStats();
  } else if (tabId === 'tabKanban') {
    if (tag) tag.textContent = 'PIPELINE FLOW';
    if (title) title.textContent = 'Drag-and-Drop Deal Board';
    loadKanbanBoard();
  } else if (tabId === 'tabLeads') {
    if (tag) tag.textContent = 'CLIENT DIRECTORY';
    if (title) title.textContent = 'Prospective Buyer Leads Ledger';
    if (filterPreset && filterPreset.stage) {
      const sf = document.getElementById('leadStageFilter');
      if (sf) sf.value = filterPreset.stage;
    }
    loadLeadsTable();
  } else if (tabId === 'tabViewings') {
    if (tag) tag.textContent = 'PRIVATE CALENDAR';
    if (title) title.textContent = 'Scheduled Client Viewings';
    loadViewingsTable();
  } else if (tabId === 'tabLeaderboard') {
    if (tag) tag.textContent = 'ADVISOR PERFORMANCE';
    if (title) title.textContent = 'Monthly Targets & Commission Leaderboard';
    loadLeaderboard();
  } else if (tabId === 'tabStale') {
    if (tag) tag.textContent = 'URGENT ATTENTION';
    if (title) title.textContent = 'Inactive Leads (3+ Days Without Activity)';
    loadStaleLeadsTable();
  } else if (tabId === 'tabProperties') {
    if (tag) tag.textContent = 'PORTFOLIO REPOSITORY';
    if (title) title.textContent = 'Ready Residences & Off-Plan Developments';
    loadCrudProperties();
    loadCrudProjects();
  }
}

// --------------------------------------------------------------------------
// 4. INITIAL DATA LOADING
// --------------------------------------------------------------------------
async function loadInitialData() {
  loadDbBanner();
  await loadStaffList();
  await loadPropertiesCache();
  loadDashboardStats();
}

async function loadDbBanner() {
  const statusBanner = document.getElementById('adminDbStatusBanner');
  try {
    const res = await fetch('/api/db-status');
    const data = await res.json();
    if (!statusBanner) return;

    if (data.isNeonConnected) {
      statusBanner.style.backgroundColor = '#102A14';
      statusBanner.style.borderColor = '#25D366';
      statusBanner.innerHTML = `
        <strong style="color: #25D366;">DATABASE ACTIVE: Neon Serverless PostgreSQL</strong> • 
        Connected securely. Cloud tables and records live.
      `;
    } else {
      statusBanner.style.backgroundColor = '#1E1E1E';
      statusBanner.style.borderColor = 'var(--admin-gold)';
      statusBanner.innerHTML = `
        <strong style="color: var(--admin-gold);">DATABASE RUNNING: Resilient In-Memory Fallback</strong> • 
        All 40 sample leads, 15 properties, 6 off-plans & staff active. To connect your Neon database, paste your connection string in 
        <code style="color: var(--admin-gold); background: #111; padding: 2px 6px;">c:\\Users\\hadih\\HadiRealeState\\.env</code> (DATABASE_URL=...).
      `;
    }
  } catch (err) {
    console.error('Failed to fetch DB status:', err);
  }
}

async function loadStaffList() {
  try {
    const res = await fetch('/api/admin/staff', { headers: getAuthHeaders() });
    if (res.ok) {
      allStaffCache = await res.json();
      populateStaffDropdowns();
    }
  } catch (e) {
    console.error('Failed to load staff list:', e);
  }
}

function populateStaffDropdowns() {
  const drawerSelect = document.getElementById('drawerAgentSelect');
  if (drawerSelect) {
    drawerSelect.innerHTML = allStaffCache.map(s => `
      <option value="${s.id}">${s.name} (${s.role})</option>
    `).join('');
  }
}

async function loadPropertiesCache() {
  try {
    const res = await fetch('/api/properties');
    if (res.ok) {
      allPropertiesCache = await res.json();
      populatePropertyDropdowns();
    }
  } catch (e) {
    console.error('Failed to load properties:', e);
  }
}

function populatePropertyDropdowns() {
  const viewingSelect = document.getElementById('drawerViewingPropertySelect');
  const wonSelect = document.getElementById('wonPropertySelect');

  const optionsHtml = allPropertiesCache.map(p => `
    <option value="${p.id}" data-title="${p.title}" data-price="${p.price_aed}">
      ${p.title} (${p.community}) — ${formatAED(p.price_aed)} ${p.is_sold ? '[SOLD]' : ''}
    </option>
  `).join('');

  if (viewingSelect) viewingSelect.innerHTML = optionsHtml;
  if (wonSelect) wonSelect.innerHTML = `<option value="">-- Select Property --</option>` + optionsHtml;
}

// --------------------------------------------------------------------------
// 5. TAB 1: EXECUTIVE DASHBOARD
// --------------------------------------------------------------------------
async function loadDashboardStats() {
  try {
    const res = await fetch('/api/admin/dashboard', { headers: getAuthHeaders() });
    if (!res.ok) return;

    const data = await res.json();

    // 1. KPI Cards
    const kpiNew = document.getElementById('kpiNewLeads');
    const kpiDealVal = document.getElementById('kpiPipelineValue');
    const kpiViewings = document.getElementById('kpiViewingsWeek');
    const kpiCommission = document.getElementById('kpiSalesCommission');
    const kpiSalesVol = document.getElementById('kpiSalesVolume');

    if (kpiNew) kpiNew.textContent = data.newLeadsToday;
    if (kpiDealVal) kpiDealVal.textContent = formatAED(data.totalDealValue || 215000000);
    if (kpiViewings) kpiViewings.textContent = data.viewingsThisWeek;
    if (kpiCommission) kpiCommission.textContent = formatAED(data.totalCommission);
    if (kpiSalesVol) {
      kpiSalesVol.textContent = `${data.salesCount} Deals Closed • Volume: ${formatAED(data.salesVolume)}`;
    }

    // 2. Funnel Bars
    const stages = data.stages || {};
    const totalLeads = (stages.New || 0) + (stages.Contacted || 0) + (stages.Viewing || 0) + (stages.Offer || 0) + (stages.Won || 0) + (stages.Lost || 0) || 1;

    updateFunnelBar('New', stages.New || 0, totalLeads);
    updateFunnelBar('Contacted', stages.Contacted || 0, totalLeads);
    updateFunnelBar('Viewing', stages.Viewing || 0, totalLeads);
    updateFunnelBar('Offer', stages.Offer || 0, totalLeads);
    updateFunnelBar('Won', stages.Won || 0, totalLeads);
    updateFunnelBar('Lost', stages.Lost || 0, totalLeads);

    // 3. Temperature Quality Breakdown
    const temps = data.temperatures || {};
    const countHot = document.getElementById('tempCountHot');
    const countWarm = document.getElementById('tempCountWarm');
    const countCold = document.getElementById('tempCountCold');

    if (countHot) countHot.textContent = temps.HOT || 0;
    if (countWarm) countWarm.textContent = temps.WARM || 0;
    if (countCold) countCold.textContent = temps.COLD || 0;

    // 4. Stale alert count
    const staleAlert = document.getElementById('staleAlertCount');
    if (staleAlert) staleAlert.textContent = data.staleLeadsCount || 0;

  } catch (err) {
    console.error('Failed to load dashboard stats:', err);
  }
}

function updateFunnelBar(stageName, count, total) {
  const bar = document.getElementById(`funnelBar${stageName}`);
  const countElem = document.getElementById(`funnelCount${stageName}`);
  if (bar) {
    const pct = Math.max(8, Math.round((count / total) * 100));
    bar.style.width = `${pct}%`;
  }
  if (countElem) {
    countElem.textContent = `${count}`;
  }
}

// --------------------------------------------------------------------------
// 6. TAB 2: KANBAN PIPELINE (DRAG & DROP)
// --------------------------------------------------------------------------
async function loadKanbanBoard() {
  try {
    const res = await fetch('/api/admin/leads', { headers: getAuthHeaders() });
    if (!res.ok) return;

    const leads = await res.json();

    const stageMap = {
      New: [],
      Contacted: [],
      Viewing: [],
      Offer: [],
      Won: [],
      Lost: []
    };

    leads.forEach(lead => {
      const stage = lead.stage || 'New';
      if (stageMap[stage]) {
        stageMap[stage].push(lead);
      } else {
        stageMap.New.push(lead);
      }
    });

    // Populate each column
    Object.keys(stageMap).forEach(stage => {
      const container = document.getElementById(`kanbanCards${stage}`);
      const countElem = document.getElementById(`colCount${stage}`);
      const columnLeads = stageMap[stage];

      if (countElem) countElem.textContent = columnLeads.length;

      if (container) {
        if (columnLeads.length === 0) {
          container.innerHTML = `<div style="text-align: center; color: #999; font-size: 0.75rem; padding: 2rem 0;">No leads in ${stage}</div>`;
        } else {
          container.innerHTML = columnLeads.map(lead => renderKanbanCard(lead)).join('');
        }
      }
    });

    initKanbanDragEvents();
  } catch (err) {
    console.error('Failed to load kanban leads:', err);
  }
}

function renderKanbanCard(lead) {
  const scoreLabel = lead.score_label || 'WARM';
  const scoreNum = lead.score || 50;

  return `
    <div class="lead-card" draggable="true" data-lead-id="${lead.id}" data-current-stage="${lead.stage}">
      <div class="lead-card-header">
        <span class="lead-card-name">${lead.full_name}</span>
        <span class="score-badge ${scoreLabel}">${scoreLabel} ${scoreNum}</span>
      </div>

      <div class="lead-card-budget">${lead.budget_aed || 'Not Specified'}</div>

      <div class="lead-card-meta">
        <span>📍 ${lead.preferred_community || 'Flexible Location'}</span>
        <span>🏷️ ${lead.property_type || 'General Inquiry'}</span>
        <span>👤 ${lead.assigned_agent_name || 'Unassigned'}</span>
        <span style="color: #999; font-size: 0.68rem;">Source: ${lead.source || 'Website'}</span>
      </div>

      <div class="lead-card-actions">
        <div style="display: flex; gap: 4px;">
          <a href="tel:${lead.phone}" class="quick-comm-btn" title="Call ${lead.phone}">📞</a>
          <a href="https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}" target="_blank" class="quick-comm-btn" title="WhatsApp client">💬</a>
        </div>
        <button class="btn btn-clean" style="font-size: 0.72rem; color: var(--admin-gold); text-decoration: underline; cursor: pointer;" onclick="openLeadDrawer(${lead.id})">
          Details &rarr;
        </button>
      </div>
    </div>
  `;
}

function initKanbanDragEvents() {
  const cards = document.querySelectorAll('.lead-card');
  const wrappers = document.querySelectorAll('.kanban-cards-wrapper');

  cards.forEach(card => {
    card.addEventListener('dragstart', (e) => {
      card.classList.add('dragging');
      e.dataTransfer.setData('text/plain', JSON.stringify({
        leadId: card.getAttribute('data-lead-id'),
        currentStage: card.getAttribute('data-current-stage')
      }));
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
    });
  });

  wrappers.forEach(wrapper => {
    wrapper.addEventListener('dragover', (e) => {
      e.preventDefault();
      wrapper.classList.add('drag-over');
    });

    wrapper.addEventListener('dragleave', () => {
      wrapper.classList.remove('drag-over');
    });

    wrapper.addEventListener('drop', async (e) => {
      e.preventDefault();
      wrapper.classList.remove('drag-over');

      try {
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        const leadId = data.leadId;
        const column = wrapper.closest('.kanban-column');
        const targetStage = column.getAttribute('data-stage');

        if (!leadId || !targetStage) return;
        if (data.currentStage === targetStage) return;

        // If target stage is "Won", trigger the Deal Closing Modal!
        if (targetStage === 'Won') {
          openDealWonModal(leadId);
          return;
        }

        // Otherwise update stage via API
        const patchRes = await fetch(`/api/admin/leads/${leadId}/stage`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({ stage: targetStage })
        });

        if (patchRes.ok) {
          showToast(`Lead moved to ${targetStage}`);
          loadKanbanBoard();
        } else {
          showToast('Failed to update stage.');
        }
      } catch (err) {
        console.error('Drop error:', err);
      }
    });
  });
}

// --------------------------------------------------------------------------
// 7. TAB 3: LEADS LIST & TABLE WITH SEARCH & EXCEL EXPORT
// --------------------------------------------------------------------------
let currentLeadsDataset = [];

async function loadLeadsTable() {
  const search = document.getElementById('leadSearchInput')?.value || '';
  const stage = document.getElementById('leadStageFilter')?.value || 'all';
  const score_label = document.getElementById('leadScoreFilter')?.value || 'all';
  const stale = document.getElementById('leadStaleFilter')?.checked ? 'true' : 'false';

  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (stage !== 'all') params.append('stage', stage);
  if (score_label !== 'all') params.append('score_label', score_label);
  if (stale === 'true') params.append('stale', 'true');

  try {
    const res = await fetch(`/api/admin/leads?${params.toString()}`, { headers: getAuthHeaders() });
    if (!res.ok) return;

    currentLeadsDataset = await res.json();
    const tableBody = document.getElementById('leadsTableBody');

    if (!tableBody) return;

    if (currentLeadsDataset.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 3rem; color: #888;">
            No client records matching the selected search criteria.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = currentLeadsDataset.map(lead => {
      const scoreLabel = lead.score_label || 'WARM';
      const scoreNum = lead.score || 50;
      const lastActive = lead.last_activity_at ? formatTimeAgo(lead.last_activity_at) : 'Recently';

      return `
        <tr>
          <td style="font-weight: 600; color: #666;">#${lead.id}</td>
          <td>
            <span class="score-badge ${scoreLabel}">
              ${scoreLabel} ${scoreNum}
            </span>
          </td>
          <td>
            <strong style="font-family: var(--font-serif); font-size: 1.1rem; color: var(--admin-charcoal); display: block;">
              ${lead.full_name}
            </strong>
            <span style="font-size: 0.72rem; color: var(--color-warmgray);">${lead.preferred_community || 'Flexible Location'}</span>
          </td>
          <td>
            <div style="display: flex; flex-direction: column;">
              <span>${lead.phone}</span>
              <span style="font-size: 0.72rem; color: #888;">${lead.email || '—'}</span>
            </div>
          </td>
          <td>
            <strong style="color: var(--admin-gold); font-size: 0.9rem;">
              ${lead.budget_aed || 'Not Specified'}
            </strong>
          </td>
          <td>
            <span class="stage-badge ${lead.stage}">
              ${lead.stage}
            </span>
          </td>
          <td>
            <span style="font-size: 0.75rem; color: #666;">${lead.source || 'Website'}</span>
          </td>
          <td>
            <span style="font-size: 0.8rem; font-weight: 500;">${lead.assigned_agent_name || 'Unassigned'}</span>
          </td>
          <td>
            <span style="font-size: 0.75rem; color: #777;">${lastActive}</span>
          </td>
          <td>
            <div style="display: flex; gap: 6px; align-items: center;">
              <button class="btn btn-outline-charcoal" style="padding: 4px 8px; font-size: 0.72rem;" onclick="openLeadDrawer(${lead.id})">
                View
              </button>
              <a href="tel:${lead.phone}" class="quick-comm-btn" title="Call">📞</a>
              <a href="https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}" target="_blank" class="quick-comm-btn" title="WhatsApp">💬</a>
            </div>
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error('Failed to load leads list:', err);
  }
}

// Export to Excel / CSV
function exportLeadsToCSV() {
  const leadsToExport = currentLeadsDataset.length > 0 ? currentLeadsDataset : [];

  if (leadsToExport.length === 0) {
    showToast('No leads available to export.');
    return;
  }

  const headers = [
    'Lead ID',
    'Full Name',
    'Phone',
    'Email',
    'Budget AED',
    'Stage',
    'Temperature',
    'Score (0-100)',
    'Preferred Location',
    'Property Type',
    'Source Form',
    'Assigned Broker',
    'Created At',
    'Last Activity',
    'Notes'
  ];

  const rows = leadsToExport.map(l => [
    l.id,
    `"${(l.full_name || '').replace(/"/g, '""')}"`,
    `"${(l.phone || '').replace(/"/g, '""')}"`,
    `"${(l.email || '').replace(/"/g, '""')}"`,
    `"${(l.budget_aed || '').replace(/"/g, '""')}"`,
    `"${(l.stage || '').replace(/"/g, '""')}"`,
    `"${(l.score_label || '').replace(/"/g, '""')}"`,
    l.score || 0,
    `"${(l.preferred_community || '').replace(/"/g, '""')}"`,
    `"${(l.property_type || '').replace(/"/g, '""')}"`,
    `"${(l.source || '').replace(/"/g, '""')}"`,
    `"${(l.assigned_agent_name || '').replace(/"/g, '""')}"`,
    `"${(l.created_at || '').replace(/"/g, '""')}"`,
    `"${(l.last_activity_at || '').replace(/"/g, '""')}"`,
    `"${(l.notes || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hadi_real_estate_leads_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('Leads downloaded as Excel-compatible CSV.');
}

// --------------------------------------------------------------------------
// 8. TAB 4: SCHEDULED VIEWINGS
// --------------------------------------------------------------------------
async function loadViewingsTable() {
  try {
    const res = await fetch('/api/admin/viewings', { headers: getAuthHeaders() });
    if (!res.ok) return;

    const viewings = await res.json();
    const tableBody = document.getElementById('viewingsTableBody');

    if (!tableBody) return;

    if (viewings.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 2.5rem; color: #888;">No viewings scheduled yet.</td></tr>`;
      return;
    }

    tableBody.innerHTML = viewings.map(v => `
      <tr>
        <td style="font-weight: 600; color: #666;">#${v.id}</td>
        <td>
          <strong style="font-family: var(--font-serif); font-size: 1.1rem; color: var(--admin-charcoal);">
            ${v.property_title}
          </strong>
        </td>
        <td><strong>${v.client_name}</strong></td>
        <td>${v.client_phone}</td>
        <td>${v.agent_name || 'Rashid Al-Mansoor'}</td>
        <td>
          <strong style="color: var(--admin-gold);">${v.viewing_date ? v.viewing_date.split('T')[0] : 'Scheduled'}</strong>
          <span style="font-size: 0.72rem; color: #666; display: block;">${v.viewing_time}</span>
        </td>
        <td>
          <span class="chip-tag" style="background: var(--admin-gold-light); color: var(--admin-gold); font-size: 0.65rem;">
            ${v.status || 'Confirmed'}
          </span>
        </td>
        <td style="font-size: 0.75rem; color: #666; max-width: 200px;">
          ${v.special_requests || '—'}
        </td>
        <td>
          <div style="display: flex; gap: 4px;">
            <a href="tel:${v.client_phone}" class="quick-comm-btn" title="Call">📞</a>
            <a href="https://wa.me/${v.client_phone.replace(/[^0-9]/g, '')}" target="_blank" class="quick-comm-btn" title="WhatsApp">💬</a>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load viewings:', err);
  }
}

// --------------------------------------------------------------------------
// 9. TAB 5: AGENT LEADERBOARD & CLOSED SALES
// --------------------------------------------------------------------------
async function loadLeaderboard() {
  try {
    const dashRes = await fetch('/api/admin/dashboard', { headers: getAuthHeaders() });
    if (dashRes.ok) {
      const dashData = await dashRes.json();
      const grid = document.getElementById('leaderboardCardsGrid');

      if (grid && dashData.leaderboard) {
        grid.innerHTML = dashData.leaderboard.map((agent, idx) => `
          <div style="background: #FFFFFF; border: 1px solid var(--admin-border); padding: 1.5rem; position: relative;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.8rem;">
              <div style="display: flex; gap: 0.9rem; align-items: center;">
                <img src="${agent.avatar_url || 'assets/images/agent1.jpg'}" alt="${agent.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 50%; border: 2px solid var(--admin-gold); flex-shrink: 0; box-shadow: 0 3px 8px rgba(0,0,0,0.1);">
                <div>
                  <span style="font-size: 0.68rem; letter-spacing: 0.15em; text-transform: uppercase; color: var(--admin-gold); font-weight: 600;">
                    RANK #${idx + 1} ADVISOR
                  </span>
                  <h3 style="font-family: var(--font-serif); font-size: 1.35rem; margin: 2px 0 0 0;">${agent.name}</h3>
                  <span style="font-size: 0.7rem; color: #888;">${agent.license_no}</span>
                </div>
              </div>
              <span style="font-family: var(--font-serif); font-size: 1.8rem; font-weight: 600; color: var(--admin-gold);">
                ${agent.achievement_percent}%
              </span>
            </div>

            <!-- Target Meter -->
            <div style="margin: 1rem 0;">
              <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: #666;">
                <span>Volume: <strong>${formatAED(agent.volume_aed)}</strong></span>
                <span>Target: ${formatAED(agent.target_aed)}</span>
              </div>
              <div class="meter-track">
                <div class="meter-fill" style="width: ${agent.achievement_percent}%;"></div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; border-top: 1px solid #F0EEE9; padding-top: 0.8rem; font-size: 0.75rem;">
              <div>
                <span style="color: #888; display: block; font-size: 0.68rem;">Deals Closed</span>
                <strong style="font-size: 0.95rem;">${agent.deals_count} transactions</strong>
              </div>
              <div>
                <span style="color: #888; display: block; font-size: 0.68rem;">2% Commission Earned</span>
                <strong style="color: var(--admin-won); font-size: 0.95rem;">${formatAED(agent.commission_aed)}</strong>
              </div>
            </div>
          </div>
        `).join('');
      }
    }

    // Load Completed Sales Table
    const salesRes = await fetch('/api/admin/sales', { headers: getAuthHeaders() });
    if (salesRes.ok) {
      const sales = await salesRes.json();
      const salesTable = document.getElementById('salesTableBody');
      if (salesTable) {
        if (sales.length === 0) {
          salesTable.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: #888;">No completed sales registered yet.</td></tr>`;
        } else {
          salesTable.innerHTML = sales.map(s => `
            <tr>
              <td style="font-weight: 600; color: #666;">#${s.id}</td>
              <td><strong style="font-family: var(--font-serif); font-size: 1.1rem;">${s.property_name}</strong></td>
              <td>${s.buyer_name}</td>
              <td>${s.agent_name}</td>
              <td style="font-family: var(--font-serif); font-size: 1.15rem; color: var(--admin-charcoal); font-weight: 600;">${formatAED(s.sale_price_aed)}</td>
              <td style="color: var(--admin-won); font-weight: 600; font-size: 1rem;">${formatAED(s.commission_aed)}</td>
              <td>${s.closing_date ? s.closing_date.split('T')[0] : '2026-09-01'}</td>
            </tr>
          `).join('');
        }
      }
    }
  } catch (err) {
    console.error('Failed to load leaderboard:', err);
  }
}

// --------------------------------------------------------------------------
// 10. TAB 6: INACTIVE LEADS (3+ DAYS NO ACTIVITY)
// --------------------------------------------------------------------------
async function loadStaleLeadsTable() {
  try {
    const res = await fetch('/api/admin/leads?stale=true', { headers: getAuthHeaders() });
    if (!res.ok) return;

    const staleLeads = await res.json();
    const tableBody = document.getElementById('staleLeadsTableBody');

    if (!tableBody) return;

    if (staleLeads.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; padding: 3rem; color: #1E824C;">
            ✓ All active buyer leads have been contacted or updated within the last 72 hours. Outstanding performance!
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = staleLeads.map(lead => {
      const scoreLabel = lead.score_label || 'WARM';
      const daysAgo = calculateDaysInactive(lead.last_activity_at || lead.created_at);

      return `
        <tr class="stale-row">
          <td style="font-weight: 600; color: #666;">#${lead.id}</td>
          <td><span class="score-badge ${scoreLabel}">${scoreLabel} ${lead.score || 50}</span></td>
          <td>
            <strong style="font-family: var(--font-serif); font-size: 1.1rem; color: var(--admin-charcoal);">
              ${lead.full_name}
            </strong>
          </td>
          <td>${lead.phone}</td>
          <td><strong style="color: var(--admin-gold);">${lead.budget_aed || 'Not Specified'}</strong></td>
          <td><span class="stage-badge ${lead.stage}">${lead.stage}</span></td>
          <td>${lead.assigned_agent_name || 'Unassigned'}</td>
          <td>
            <span class="stale-tag">⚠️ ${daysAgo} days ago</span>
          </td>
          <td>
            <div style="display: flex; gap: 6px;">
              <a href="tel:${lead.phone}" class="quick-comm-btn" style="background: #FFF;" title="Call Immediately">📞 Call</a>
              <a href="https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=Dear%20${encodeURIComponent(lead.full_name)},%20I%20am%20following%20up%20from%20Hadi%20Real%20Estate%20regarding%20your%20property%20search." 
                 target="_blank" class="quick-comm-btn" style="background: #25D366; color: #FFF; border-color: #25D366;" title="WhatsApp Follow-up">💬 WhatsApp</a>
              <button class="btn btn-outline-charcoal" style="padding: 2px 6px; font-size: 0.68rem;" onclick="openLeadDrawer(${lead.id})">
                Log Activity
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load stale leads:', err);
  }
}

// --------------------------------------------------------------------------
// 11. TAB 7: PROPERTIES & PROJECTS CRUD
// --------------------------------------------------------------------------
async function loadCrudProperties() {
  try {
    const res = await fetch('/api/properties');
    if (!res.ok) return;

    allPropertiesCache = await res.json();
    const tableBody = document.getElementById('crudPropertiesTableBody');

    if (!tableBody) return;

    tableBody.innerHTML = allPropertiesCache.map(p => `
      <tr>
        <td style="font-weight: 600; color: #666;">#${p.id}</td>
        <td>
          <strong style="font-family: var(--font-serif); font-size: 1.1rem; color: var(--admin-charcoal);">
            ${p.title}
          </strong>
        </td>
        <td>${p.community}</td>
        <td>${p.property_type}</td>
        <td><strong style="color: var(--admin-gold);">${formatAED(p.price_aed)}</strong></td>
        <td>${p.bedrooms} Beds • ${p.bathrooms} Baths • ${Number(p.sqft || 0).toLocaleString()} SqFt</td>
        <td>
          ${p.is_sold 
            ? '<span class="chip-tag" style="background: #FADBD8; color: #922B21; font-weight: 600;">SOLD OUT</span>' 
            : '<span class="chip-tag" style="background: #D4EFDF; color: #1E824C; font-weight: 600;">ACTIVE</span>'}
        </td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-outline-charcoal" style="padding: 4px 8px; font-size: 0.7rem;" onclick="openEditPropertyModal(${p.id})">
              Edit
            </button>
            <button class="btn btn-clean" style="color: var(--admin-hot); font-size: 0.7rem; cursor: pointer; padding: 4px;" onclick="deleteProperty(${p.id})">
              Delete
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load crud properties:', err);
  }
}

async function loadCrudProjects() {
  try {
    const res = await fetch('/api/offplan');
    if (!res.ok) return;

    const projects = await res.json();
    const tableBody = document.getElementById('crudProjectsTableBody');

    if (!tableBody) return;

    tableBody.innerHTML = projects.map(proj => `
      <tr>
        <td style="font-weight: 600; color: #666;">#${proj.id}</td>
        <td><strong style="font-family: var(--font-serif); font-size: 1.1rem;">${proj.name}</strong></td>
        <td>${proj.developer_name}</td>
        <td>${proj.community}</td>
        <td><strong style="color: var(--admin-gold);">${formatAED(proj.starting_price_aed)}</strong></td>
        <td>${proj.handover_date}</td>
        <td><span style="font-size: 0.75rem; color: #555;">${proj.payment_plan_summary || 'Flexible'}</span></td>
        <td>
          <button class="btn btn-clean" style="color: var(--admin-hot); font-size: 0.7rem; cursor: pointer;" onclick="deleteProject(${proj.id})">
            Delete
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load crud projects:', err);
  }
}

// Property Modals
function openAddPropertyModal() {
  document.getElementById('propModalTitle').textContent = 'Add New Luxury Property';
  document.getElementById('crudPropId').value = '';
  document.getElementById('crudPropTitle').value = '';
  document.getElementById('crudPropPrice').value = '';
  document.getElementById('crudPropBeds').value = '4';
  document.getElementById('crudPropBaths').value = '5';
  document.getElementById('crudPropSqft').value = '6500';
  document.getElementById('crudPropDesc').value = '';
  document.getElementById('crudPropSold').value = 'false';
  document.getElementById('propertyModalOverlay').classList.add('active');
}

function openEditPropertyModal(id) {
  const prop = allPropertiesCache.find(p => p.id === id);
  if (!prop) return;

  document.getElementById('propModalTitle').textContent = 'Edit Residence Details';
  document.getElementById('crudPropId').value = prop.id;
  document.getElementById('crudPropTitle').value = prop.title;
  document.getElementById('crudPropCommunity').value = prop.community;
  document.getElementById('crudPropType').value = prop.property_type;
  document.getElementById('crudPropPrice').value = prop.price_aed;
  document.getElementById('crudPropBeds').value = prop.bedrooms;
  document.getElementById('crudPropBaths').value = prop.bathrooms;
  document.getElementById('crudPropSqft').value = prop.sqft || 5000;
  document.getElementById('crudPropDesc').value = prop.description || '';
  document.getElementById('crudPropSold').value = prop.is_sold ? 'true' : 'false';
  document.getElementById('propertyModalOverlay').classList.add('active');
}

function closePropertyModal() {
  document.getElementById('propertyModalOverlay').classList.remove('active');
}

async function submitPropertyCrud(e) {
  e.preventDefault();
  const id = document.getElementById('crudPropId').value;
  const payload = {
    title: document.getElementById('crudPropTitle').value.trim(),
    community: document.getElementById('crudPropCommunity').value,
    property_type: document.getElementById('crudPropType').value,
    price_aed: document.getElementById('crudPropPrice').value,
    bedrooms: document.getElementById('crudPropBeds').value,
    bathrooms: document.getElementById('crudPropBaths').value,
    sqft: document.getElementById('crudPropSqft').value,
    description: document.getElementById('crudPropDesc').value.trim(),
    is_sold: document.getElementById('crudPropSold').value === 'true'
  };

  const url = id ? `/api/admin/properties/${id}` : '/api/admin/properties';
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      showToast(id ? 'Property updated successfully' : 'New property added to portfolio');
      closePropertyModal();
      loadCrudProperties();
      loadPropertiesCache();
    } else {
      showToast('Error saving property');
    }
  } catch (err) {
    showToast('Network error while saving property.');
  }
}

async function deleteProperty(id) {
  if (!confirm('Are you certain you wish to delete this property?')) return;
  try {
    const res = await fetch(`/api/admin/properties/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (res.ok) {
      showToast('Property removed.');
      loadCrudProperties();
      loadPropertiesCache();
    }
  } catch (err) {
    showToast('Failed to delete property.');
  }
}

// Project Modals
function openAddProjectModal() {
  document.getElementById('projectModalOverlay').classList.add('active');
}

function closeProjectModal() {
  document.getElementById('projectModalOverlay').classList.remove('active');
}

async function submitProjectCrud(e) {
  e.preventDefault();
  const payload = {
    name: document.getElementById('crudProjName').value.trim(),
    developer_name: document.getElementById('crudProjDeveloper').value.trim(),
    community: document.getElementById('crudProjCommunity').value,
    starting_price_aed: document.getElementById('crudProjPrice').value,
    handover_date: document.getElementById('crudProjHandover').value.trim(),
    payment_plan_summary: document.getElementById('crudProjPlan').value.trim(),
    description: document.getElementById('crudProjDesc').value.trim()
  };

  try {
    const res = await fetch('/api/admin/projects', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      showToast('New off-plan project added.');
      closeProjectModal();
      loadCrudProjects();
    }
  } catch (err) {
    showToast('Failed to add project.');
  }
}

async function deleteProject(id) {
  if (!confirm('Are you certain you wish to delete this off-plan development?')) return;
  try {
    const res = await fetch(`/api/admin/projects/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (res.ok) {
      showToast('Project deleted.');
      loadCrudProjects();
    }
  } catch (err) {
    showToast('Failed to delete project.');
  }
}

// --------------------------------------------------------------------------
// 12. SINGLE LEAD DRAWER / MODAL
// --------------------------------------------------------------------------
async function openLeadDrawer(leadId) {
  currentViewingLeadId = leadId;
  const overlay = document.getElementById('leadDrawerOverlay');
  overlay.classList.add('active');

  try {
    const res = await fetch(`/api/admin/leads/${leadId}`, { headers: getAuthHeaders() });
    if (!res.ok) {
      showToast('Unable to access this lead.');
      closeLeadDrawer();
      return;
    }

    const lead = await res.json();

    document.getElementById('drawerClientName').textContent = lead.full_name;
    document.getElementById('drawerLeadScoreLabel').textContent = `${lead.score_label || 'WARM'} LEAD`;
    document.getElementById('drawerLeadScoreLabel').className = `section-tag score-badge ${lead.score_label || 'WARM'}`;
    document.getElementById('drawerSourceTag').textContent = `Source: ${lead.source || 'Website'}`;

    document.getElementById('drawerPhone').textContent = lead.phone;
    document.getElementById('drawerEmail').textContent = lead.email || '—';
    document.getElementById('drawerBudget').textContent = lead.budget_aed || 'Not Specified';
    document.getElementById('drawerCommunity').textContent = lead.preferred_community || 'Flexible';
    document.getElementById('drawerPropertyType').textContent = lead.property_type || 'Prime Residence';
    document.getElementById('drawerScorePoints').textContent = `${lead.score || 50} / 100 Points`;

    // Phone / WhatsApp links
    const cleanPhone = (lead.phone || '').replace(/[^0-9]/g, '');
    document.getElementById('drawerCallBtn').href = `tel:${lead.phone}`;
    document.getElementById('drawerWhatsappBtn').href = `https://wa.me/${cleanPhone}?text=Hello%20${encodeURIComponent(lead.full_name)},%20this%20is%20${encodeURIComponent(currentUser.name)}%20from%20Hadi%20Real%20Estate.`;

    // Stage dropdown
    document.getElementById('drawerStageSelect').value = lead.stage || 'New';

    // Agent dropdown
    const agentSelect = document.getElementById('drawerAgentSelect');
    if (agentSelect) {
      agentSelect.value = lead.assigned_agent_id || 1;
      // If user is Agent, disable reassignment
      agentSelect.disabled = currentUser.role === 'Agent';
    }

    // Set default viewing date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateInput = document.getElementById('drawerViewingDate');
    if (dateInput) dateInput.value = tomorrow.toISOString().split('T')[0];

    // Render notes thread
    renderDrawerNotes(lead.notes_list || lead.notes || []);

  } catch (err) {
    console.error('Error fetching lead details:', err);
  }
}

function closeLeadDrawer() {
  document.getElementById('leadDrawerOverlay').classList.remove('active');
  currentViewingLeadId = null;
}

function renderDrawerNotes(notes) {
  const list = document.getElementById('drawerNotesList');
  if (!list) return;

  let notesArray = [];
  if (Array.isArray(notes)) {
    notesArray = notes;
  } else if (typeof notes === 'string' && notes.trim() !== '') {
    notesArray = [{ note_text: notes, author_name: 'System/Client', created_at: new Date().toISOString() }];
  }

  if (notesArray.length === 0) {
    list.innerHTML = `<div style="font-size: 0.78rem; color: #888; font-style: italic;">No advisor notes logged yet.</div>`;
    return;
  }

  list.innerHTML = notesArray.map(n => `
    <div style="background: #F9F8F5; border: 1px solid var(--admin-border); padding: 0.75rem 1rem; font-size: 0.8rem;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.3rem;">
        <strong style="color: var(--admin-charcoal); font-size: 0.75rem;">${n.author_name || 'Advisor'}</strong>
        <span style="font-size: 0.68rem; color: #888;">${n.created_at ? formatTimeAgo(n.created_at) : 'Logged'}</span>
      </div>
      <p style="margin: 0; color: #444; line-height: 1.4;">${n.note_text}</p>
    </div>
  `).join('');
}

async function handleDrawerStageChange(newStage) {
  if (!currentViewingLeadId) return;

  if (newStage === 'Won') {
    closeLeadDrawer();
    openDealWonModal(currentViewingLeadId);
    return;
  }

  try {
    const res = await fetch(`/api/admin/leads/${currentViewingLeadId}/stage`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ stage: newStage })
    });

    if (res.ok) {
      showToast(`Lead stage updated to ${newStage}`);
      loadDashboardStats();
      loadLeadsTable();
      loadKanbanBoard();
    }
  } catch (err) {
    showToast('Failed to update stage.');
  }
}

async function handleDrawerAgentChange(agentId) {
  if (!currentViewingLeadId) return;

  const agent = allStaffCache.find(s => s.id === parseInt(agentId, 10));
  const agentName = agent ? agent.name : 'Advisor';

  try {
    const res = await fetch(`/api/admin/leads/${currentViewingLeadId}/assign`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ agent_id: agentId, agent_name: agentName })
    });

    if (res.ok) {
      showToast(`Lead reassigned to ${agentName}`);
      loadLeadsTable();
      loadKanbanBoard();
    }
  } catch (err) {
    showToast('Failed to reassign lead.');
  }
}

async function handleDrawerAddNote() {
  if (!currentViewingLeadId) return;

  const noteInput = document.getElementById('drawerNewNoteText');
  const noteText = noteInput.value.trim();

  if (!noteText) return;

  try {
    const res = await fetch(`/api/admin/leads/${currentViewingLeadId}/notes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ note_text: noteText })
    });

    if (res.ok) {
      noteInput.value = '';
      showToast('Note added to client timeline.');
      // Refresh lead details drawer
      openLeadDrawer(currentViewingLeadId);
      loadDashboardStats();
    }
  } catch (err) {
    showToast('Failed to add note.');
  }
}

async function handleDrawerBookViewing(e) {
  e.preventDefault();
  if (!currentViewingLeadId) return;

  const propSelect = document.getElementById('drawerViewingPropertySelect');
  const selectedOpt = propSelect.options[propSelect.selectedIndex];
  const property_id = propSelect.value;
  const property_title = selectedOpt ? selectedOpt.getAttribute('data-title') : 'Private Residence';
  const viewing_date = document.getElementById('drawerViewingDate').value;
  const viewing_time = document.getElementById('drawerViewingTime').value;
  const special_requests = document.getElementById('drawerViewingRequests').value.trim();

  const clientName = document.getElementById('drawerClientName').textContent;
  const clientPhone = document.getElementById('drawerPhone').textContent;

  try {
    const res = await fetch('/api/viewings', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        lead_id: currentViewingLeadId,
        property_id,
        property_title,
        client_name: clientName,
        client_phone: clientPhone,
        agent_id: currentUser.id,
        agent_name: currentUser.name,
        viewing_date,
        viewing_time,
        special_requests
      })
    });

    if (res.ok) {
      showToast('Viewing booked and registered in calendar.');
      openLeadDrawer(currentViewingLeadId);
      loadDashboardStats();
      loadViewingsTable();
    } else {
      showToast('Failed to book viewing.');
    }
  } catch (err) {
    showToast('Network error booking viewing.');
  }
}

// --------------------------------------------------------------------------
// 13. DEAL CLOSING MODAL (WON STAGE) & 2% COMMISSION LOGIC
// --------------------------------------------------------------------------
let dealWonLeadObj = null;

async function openDealWonModal(leadId) {
  try {
    const res = await fetch(`/api/admin/leads/${leadId}`, { headers: getAuthHeaders() });
    if (!res.ok) {
      showToast('Unable to access lead data.');
      return;
    }

    dealWonLeadObj = await res.json();

    document.getElementById('wonLeadId').value = dealWonLeadObj.id;
    document.getElementById('wonBuyerName').value = dealWonLeadObj.full_name;

    // Pre-select property if lead had specific interest
    const propSelect = document.getElementById('wonPropertySelect');
    if (dealWonLeadObj.specific_property_id) {
      propSelect.value = dealWonLeadObj.specific_property_id;
    } else {
      propSelect.selectedIndex = 1; // pick first available
    }

    handleWonPropertySelected();
    document.getElementById('dealWonModalOverlay').classList.add('active');
  } catch (e) {
    console.error('Failed to open deal won modal:', e);
  }
}

function closeDealWonModal() {
  document.getElementById('dealWonModalOverlay').classList.remove('active');
  dealWonLeadObj = null;
}

function handleWonPropertySelected() {
  const propSelect = document.getElementById('wonPropertySelect');
  const selectedOpt = propSelect.options[propSelect.selectedIndex];
  if (selectedOpt && selectedOpt.getAttribute('data-price')) {
    const price = selectedOpt.getAttribute('data-price');
    document.getElementById('wonSalePrice').value = price;
    calculateLiveCommission(price);
  }
}

function calculateLiveCommission(priceVal) {
  const price = parseInt(priceVal, 10);
  const commElem = document.getElementById('wonLiveCommission');
  if (!price || isNaN(price) || price <= 0) {
    commElem.textContent = 'AED 0';
    return;
  }
  const commission = Math.round(price * 0.02); // 2% commission
  commElem.textContent = formatAED(commission);
}

async function submitDealWon(e) {
  e.preventDefault();
  const leadId = document.getElementById('wonLeadId').value;
  const buyerName = document.getElementById('wonBuyerName').value;
  const propSelect = document.getElementById('wonPropertySelect');
  const propertyId = propSelect.value;
  const selectedOpt = propSelect.options[propSelect.selectedIndex];
  const propertyName = selectedOpt ? selectedOpt.getAttribute('data-title') : 'Prime UAE Residence';
  const salePrice = document.getElementById('wonSalePrice').value;

  try {
    const res = await fetch(`/api/admin/leads/${leadId}/won`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        sale_price_aed: salePrice,
        property_id: propertyId,
        property_name: propertyName,
        buyer_name: buyerName
      })
    });

    const data = await res.json();

    if (res.ok) {
      closeDealWonModal();
      showToast(`🎉 Deal Won! 2% Commission (${formatAED(Math.round(salePrice * 0.02))}) registered and property marked SOLD.`);
      loadDashboardStats();
      loadKanbanBoard();
      loadLeadsTable();
      loadPropertiesCache();
      loadCrudProperties();
    } else {
      showToast(data.error || 'Failed to close deal.');
    }
  } catch (err) {
    showToast('Network error while completing deal.');
  }
}

// --------------------------------------------------------------------------
// 14. UTILITIES
// --------------------------------------------------------------------------
function formatTimeAgo(dateStr) {
  const dt = new Date(dateStr);
  const diffSec = Math.floor((Date.now() - dt.getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

function calculateDaysInactive(dateStr) {
  const dt = new Date(dateStr);
  const diffDays = Math.floor((Date.now() - dt.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(3, diffDays);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
