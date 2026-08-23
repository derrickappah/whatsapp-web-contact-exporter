/**
 * WhatsApp Web Contact Exporter - Popup Controller
 */

(function () {
  'use strict';

  let currentTab = 'all';
  let allContacts = [];
  let groups = [];
  let labels = [];
  let selectedIds = new Set();
  let whatsappTabId = null;

  // DOM Elements
  const statusDot = document.querySelector('.status-dot');
  const statusText = document.getElementById('status-text');
  const notConnectedBanner = document.getElementById('banner-not-connected');
  const btnRefresh = document.getElementById('btn-refresh');
  const statTotal = document.getElementById('stat-total');
  const statUnsaved = document.getElementById('stat-unsaved');
  const statGroups = document.getElementById('stat-groups');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const statCards = document.querySelectorAll('.stat-card');
  const searchInput = document.getElementById('search-input');
  const chkSelectAll = document.getElementById('chk-select-all');
  const selectionSummary = document.getElementById('selection-summary');
  const loadingSpinner = document.getElementById('loading-spinner');
  const itemsList = document.getElementById('items-list');
  const emptyState = document.getElementById('empty-state');
  const formatButtons = document.querySelectorAll('.btn-format');

  /**
   * Find active WhatsApp Web Tab
   */
  async function findWhatsAppTab() {
    return new Promise((resolve) => {
      chrome.tabs.query({ url: 'https://web.whatsapp.com/*' }, (tabs) => {
        if (tabs && tabs.length > 0) {
          const active = tabs.find(t => t.active) || tabs[0];
          resolve(active);
        } else {
          resolve(null);
        }
      });
    });
  }

  /**
   * Send RPC action to WhatsApp Web content script
   */
  function sendToContentScript(action, payload = {}) {
    return new Promise((resolve, reject) => {
      if (!whatsappTabId) {
        return reject(new Error('WhatsApp Web tab not found'));
      }
      chrome.tabs.sendMessage(whatsappTabId, { action, payload }, (response) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        if (!response || !response.success) {
          return reject(new Error(response?.error || 'Failed to fetch data'));
        }
        resolve(response.data);
      });
    });
  }

  /**
   * Update Status Indicator UI
   */
  function setStatus(state, msg) {
    statusDot.className = 'status-dot';
    if (state === 'online') {
      statusDot.classList.add('dot-online');
      notConnectedBanner.classList.add('hidden');
    } else if (state === 'warning') {
      statusDot.classList.add('dot-warning');
      notConnectedBanner.classList.remove('hidden');
    } else {
      statusDot.classList.add('dot-offline');
      notConnectedBanner.classList.remove('hidden');
    }
    statusText.textContent = msg;
  }

  /**
   * Load Data from WhatsApp Web
   */
  async function loadData() {
    loadingSpinner.classList.remove('hidden');
    itemsList.classList.add('hidden');
    emptyState.classList.add('hidden');

    try {
      const tab = await findWhatsAppTab();
      if (!tab) {
        setStatus('offline', 'WhatsApp Web tab not open');
        loadingSpinner.classList.add('hidden');
        emptyState.classList.remove('hidden');
        emptyState.innerHTML = '<p>Please open <a href="https://web.whatsapp.com" target="_blank" style="color:#00a884;font-weight:600;">web.whatsapp.com</a> and log in.</p>';
        return;
      }

      whatsappTabId = tab.id;
      setStatus('warning', 'Connecting to WhatsApp...');

      const [contactsData, groupsData, labelsData] = await Promise.all([
        sendToContentScript('GET_ALL_CONTACTS').catch(() => []),
        sendToContentScript('GET_GROUPS').catch(() => []),
        sendToContentScript('GET_LABELS').catch(() => [])
      ]);

      allContacts = contactsData || [];
      groups = groupsData || [];
      labels = labelsData || [];

      // Recalculate label counts if needed
      labels.forEach(l => {
        let count = l.count || 0;
        const matching = allContacts.filter(c => c.labels && (c.labels.includes(l.name) || c.labels.includes(l.id)));
        l.count = Math.max(count, matching.length);
      });

      const unsavedCount = allContacts.filter(c => !c.isSaved).length;
      statTotal.textContent = allContacts.length.toLocaleString();
      statUnsaved.textContent = unsavedCount.toLocaleString();
      statGroups.textContent = groups.length.toLocaleString();

      setStatus('online', 'Connected to WhatsApp Web');

      selectAllVisible();
      renderCurrentView();

      // Proactively resolve any groups with 0 member count
      resolveMissingGroupCounts();

    } catch (err) {
      console.error('[Popup] Load error:', err);
      setStatus('offline', 'Could not read WhatsApp data');
      emptyState.classList.remove('hidden');
      emptyState.innerHTML = `<p style="color:#ea0038;">Error: ${err.message}</p><p style="margin-top:6px;font-size:11px;">Make sure WhatsApp Web is open and fully loaded.</p>`;
    } finally {
      loadingSpinner.classList.add('hidden');
    }
  }

  /**
   * Background resolver for groups missing member counts
   */
  async function resolveMissingGroupCounts() {
    const uncounted = groups.filter(g => !g.memberCount || g.memberCount === 0);
    for (const g of uncounted) {
      try {
        const members = await sendToContentScript('GET_GROUP_MEMBERS', { groupJid: g.id });
        if (members && members.length > 0) {
          g.memberCount = members.length;
          // Update live DOM badge if present
          const badge = document.querySelector(`.badge-group-${CSS.escape(g.id)}`);
          if (badge) {
            badge.textContent = `${members.length} members`;
          }
        }
      } catch (e) {}
    }
  }

  /**
   * Get Filtered Items according to current Tab & Search
   */
  function getFilteredItems() {
    const q = searchInput.value.toLowerCase().trim();

    if (currentTab === 'all') {
      return allContacts.filter(c => {
        if (!q) return true;
        return (c.displayName && c.displayName.toLowerCase().includes(q)) ||
               (c.phoneNumber && c.phoneNumber.includes(q)) ||
               (c.savedName && c.savedName.toLowerCase().includes(q)) ||
               (c.about && c.about.toLowerCase().includes(q));
      });
    }

    if (currentTab === 'unsaved') {
      return allContacts.filter(c => !c.isSaved).filter(c => {
        if (!q) return true;
        return (c.displayName && c.displayName.toLowerCase().includes(q)) ||
               (c.phoneNumber && c.phoneNumber.includes(q)) ||
               (c.about && c.about.toLowerCase().includes(q));
      });
    }

    if (currentTab === 'groups') {
      return groups.filter(g => {
        if (!q) return true;
        return g.name && g.name.toLowerCase().includes(q);
      });
    }

    if (currentTab === 'labels') {
      return labels.filter(l => {
        if (!q) return true;
        return l.name && l.name.toLowerCase().includes(q);
      });
    }

    return [];
  }

  /**
   * Render View
   */
  function renderCurrentView() {
    const items = getFilteredItems();
    itemsList.innerHTML = '';

    if (items.length === 0) {
      itemsList.classList.add('hidden');
      emptyState.classList.remove('hidden');
      emptyState.innerHTML = '<p>No items found matching your filter.</p>';
      updateSelectionSummary();
      return;
    }

    emptyState.classList.add('hidden');
    itemsList.classList.remove('hidden');

    const fragment = document.createDocumentFragment();

    if (currentTab === 'all' || currentTab === 'unsaved') {
      items.forEach(c => {
        const itemEl = document.createElement('div');
        itemEl.className = 'contact-item';

        const isChecked = selectedIds.has(c.phoneNumber || c.id);
        const initial = (c.displayName || c.phoneNumber || '?').charAt(0).toUpperCase();

        itemEl.innerHTML = `
          <input type="checkbox" data-id="${c.phoneNumber || c.id}" ${isChecked ? 'checked' : ''}>
          <div class="contact-avatar">${initial}</div>
          <div class="contact-info">
            <div class="contact-name-row">
              <span class="contact-name">${c.displayName || 'Unknown'}</span>
              ${c.isSaved ? '<span class="badge badge-saved">Saved</span>' : '<span class="badge badge-unsaved">Unsaved</span>'}
              ${c.isBusiness ? '<span class="badge badge-role">Business</span>' : ''}
            </div>
            <span class="contact-details">${c.formattedNumber || c.phoneNumber} ${c.about ? '• ' + c.about : ''}</span>
          </div>
        `;

        const chk = itemEl.querySelector('input');
        chk.addEventListener('change', () => {
          if (chk.checked) {
            selectedIds.add(c.phoneNumber || c.id);
          } else {
            selectedIds.delete(c.phoneNumber || c.id);
          }
          updateSelectionSummary();
        });

        fragment.appendChild(itemEl);
      });
    } else if (currentTab === 'groups') {
      items.forEach(g => {
        const itemEl = document.createElement('div');
        itemEl.className = 'group-item';

        const isChecked = selectedIds.has(g.id);
        const memberText = (g.memberCount && g.memberCount > 0) ? `${g.memberCount} members` : 'Loading count...';

        itemEl.innerHTML = `
          <input type="checkbox" data-id="${g.id}" ${isChecked ? 'checked' : ''}>
          <div class="contact-avatar" style="background:rgba(18,140,126,0.15);color:#128c7e;">👥</div>
          <div class="contact-info">
            <div class="contact-name-row">
              <span class="contact-name">${g.name}</span>
              <span class="badge badge-role badge-group-${CSS.escape(g.id)}">${memberText}</span>
            </div>
            <span class="contact-details">Group ID: ${g.id}</span>
          </div>
          <button class="btn-quick-export" style="background:#00a884;color:#fff;border:none;padding:4px 8px;border-radius:4px;font-size:10px;cursor:pointer;font-weight:600;">Export</button>
        `;

        const chk = itemEl.querySelector('input');
        chk.addEventListener('change', () => {
          if (chk.checked) {
            selectedIds.add(g.id);
          } else {
            selectedIds.delete(g.id);
          }
          updateSelectionSummary();
        });

        const quickExportBtn = itemEl.querySelector('.btn-quick-export');
        quickExportBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          quickExportGroup(g);
        });

        // Trigger immediate fetch if missing count
        if (!g.memberCount || g.memberCount === 0) {
          sendToContentScript('GET_GROUP_MEMBERS', { groupJid: g.id }).then(members => {
            if (members && members.length > 0) {
              g.memberCount = members.length;
              const badge = itemEl.querySelector(`.badge-group-${CSS.escape(g.id)}`);
              if (badge) badge.textContent = `${members.length} members`;
            }
          }).catch(() => {});
        }

        fragment.appendChild(itemEl);
      });
    } else if (currentTab === 'labels') {
      items.forEach(l => {
        const itemEl = document.createElement('div');
        itemEl.className = 'group-item';

        const isChecked = selectedIds.has(l.id);

        itemEl.innerHTML = `
          <input type="checkbox" data-id="${l.id}" ${isChecked ? 'checked' : ''}>
          <div class="contact-avatar" style="background:${l.color || '#00a884'};color:#fff;">🏷️</div>
          <div class="contact-info">
            <div class="contact-name-row">
              <span class="contact-name">${l.name}</span>
              <span class="badge badge-saved">${l.count || 0} items</span>
            </div>
          </div>
        `;

        const chk = itemEl.querySelector('input');
        chk.addEventListener('change', () => {
          if (chk.checked) {
            selectedIds.add(l.id);
          } else {
            selectedIds.delete(l.id);
          }
          updateSelectionSummary();
        });

        fragment.appendChild(itemEl);
      });
    }

    itemsList.appendChild(fragment);
    updateSelectionSummary();
  }

  async function quickExportGroup(group) {
    try {
      const members = await sendToContentScript('GET_GROUP_MEMBERS', { groupJid: group.id });
      if (!members || members.length === 0) {
        alert('No members found for this group.');
        return;
      }
      const cleanName = (group.name || 'group').replace(/[^a-zA-Z0-9_-]/g, '_');
      const dateStr = new Date().toISOString().slice(0, 10);
      window.WAExporters.exportToCSV(members, `group_${cleanName}_members_${dateStr}.csv`);
    } catch (err) {
      alert('Failed to export group: ' + err.message);
    }
  }

  function selectAllVisible() {
    const items = getFilteredItems();
    items.forEach(item => {
      selectedIds.add(item.phoneNumber || item.id);
    });
    updateSelectionSummary();
  }

  function deselectAllVisible() {
    const items = getFilteredItems();
    items.forEach(item => {
      selectedIds.delete(item.phoneNumber || item.id);
    });
    updateSelectionSummary();
  }

  function updateSelectionSummary() {
    const visibleItems = getFilteredItems();
    const visibleSelected = visibleItems.filter(item => selectedIds.has(item.phoneNumber || item.id));

    selectionSummary.textContent = `${visibleSelected.length} of ${visibleItems.length} selected`;
    chkSelectAll.checked = visibleItems.length > 0 && visibleSelected.length === visibleItems.length;
    chkSelectAll.indeterminate = visibleSelected.length > 0 && visibleSelected.length < visibleItems.length;
  }

  // Event Listeners
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.getAttribute('data-tab');
      selectedIds.clear();
      selectAllVisible();
      renderCurrentView();
    });
  });

  statCards.forEach(card => {
    card.addEventListener('click', () => {
      const tabName = card.getAttribute('data-tab');
      const targetBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
      if (targetBtn) targetBtn.click();
    });
  });

  searchInput.addEventListener('input', () => {
    renderCurrentView();
  });

  chkSelectAll.addEventListener('change', () => {
    if (chkSelectAll.checked) {
      selectAllVisible();
    } else {
      deselectAllVisible();
    }
    renderCurrentView();
  });

  btnRefresh.addEventListener('click', () => {
    loadData();
  });

  formatButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const format = btn.getAttribute('data-format');
      await executeExport(format);
    });
  });

  async function executeExport(format) {
    if (!window.WAExporters) {
      alert('Exporters module not loaded');
      return;
    }

    let exportList = [];
    let filePrefix = 'whatsapp_contacts';

    try {
      if (currentTab === 'groups') {
        const selectedGroupIds = Array.from(selectedIds).filter(id => id.endsWith('@g.us'));
        if (selectedGroupIds.length === 0) {
          alert('Please select at least one group to export');
          return;
        }

        const membersMap = new Map();
        for (const gId of selectedGroupIds) {
          const members = await sendToContentScript('GET_GROUP_MEMBERS', { groupJid: gId });
          if (Array.isArray(members)) {
            members.forEach(m => {
              const key = `${gId}_${m.phoneNumber || m.id}`;
              membersMap.set(key, m);
            });
          }
        }
        exportList = Array.from(membersMap.values());
        filePrefix = 'whatsapp_group_members';

      } else if (currentTab === 'labels') {
        const selectedLabelIds = Array.from(selectedIds);
        const selectedLabelNames = labels.filter(l => selectedLabelIds.includes(l.id)).map(l => l.name);
        
        exportList = allContacts.filter(c => {
          if (!c.labels) return false;
          return c.labels.some(lbl => selectedLabelIds.includes(lbl) || selectedLabelNames.includes(lbl));
        });
        filePrefix = 'whatsapp_labeled_contacts';

      } else {
        const visible = getFilteredItems();
        exportList = visible.filter(c => selectedIds.has(c.phoneNumber || c.id));
        filePrefix = currentTab === 'unsaved' ? 'whatsapp_unsaved_numbers' : 'whatsapp_contacts';
      }

      if (exportList.length === 0) {
        alert('No items selected to export!');
        return;
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `${filePrefix}_${dateStr}.${format === 'xlsx' ? 'xls' : format}`;

      if (format === 'csv') {
        window.WAExporters.exportToCSV(exportList, filename);
      } else if (format === 'xlsx') {
        window.WAExporters.exportToExcel(exportList, filename);
      } else if (format === 'vcf') {
        window.WAExporters.exportToVCard(exportList, filename);
      } else if (format === 'json') {
        window.WAExporters.exportToJSON(exportList, filename);
      }

    } catch (err) {
      console.error('[Export Error]', err);
      alert('Export failed: ' + err.message);
    }
  }

  loadData();

})();
