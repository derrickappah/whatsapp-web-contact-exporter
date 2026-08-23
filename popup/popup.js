/**
 * WhatsApp Web Exporter Pro - Popup Controller (v2.1)
 * Manages Dashboard, Live Search, Country Segmentation, Custom Columns, ZIP Exports & Activity History
 */

document.addEventListener('DOMContentLoaded', async () => {
  'use strict';

  // DOM Elements
  const statusIndicator = document.getElementById('status-indicator');
  const statusText = document.getElementById('status-text');
  const bannerNotConnected = document.getElementById('banner-not-connected');

  const statTotal = document.getElementById('stat-total');
  const statUnsaved = document.getElementById('stat-unsaved');
  const statGroups = document.getElementById('stat-groups');
  const statCountries = document.getElementById('stat-countries');

  const tabButtons = document.querySelectorAll('.tab-btn');
  const searchInput = document.getElementById('search-input');
  const chkSelectAll = document.getElementById('chk-select-all');
  const selectionSummary = document.getElementById('selection-summary');

  const filterCountrySelect = document.getElementById('filter-country-select');
  const filterTypeSelect = document.getElementById('filter-type-select');
  const btnResetFilters = document.getElementById('btn-reset-filters');

  const listContainer = document.getElementById('list-container');
  const loadingSpinner = document.getElementById('loading-spinner');
  const itemsList = document.getElementById('items-list');
  const emptyState = document.getElementById('empty-state');

  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const btnMask = document.getElementById('btn-mask');
  const btnCopyAll = document.getElementById('btn-copy-all');
  const btnSettings = document.getElementById('btn-settings');
  const btnRefresh = document.getElementById('btn-refresh');

  const exportModeSelect = document.getElementById('export-mode-select');
  const btnMainExport = document.getElementById('btn-main-export');

  // Settings & History Modal Elements
  const settingsModal = document.getElementById('settings-modal');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const modalTabBtns = document.querySelectorAll('.modal-tab-btn');
  const modalTabPrefs = document.getElementById('modal-tab-prefs');
  const modalTabHistory = document.getElementById('modal-tab-history');

  const settingTheme = document.getElementById('setting-theme');
  const settingDelimiter = document.getElementById('setting-delimiter');
  const settingAutoDedupe = document.getElementById('setting-auto-dedupe');
  const settingMergeGroups = document.getElementById('setting-merge-groups');
  const settingPrivacyMask = document.getElementById('setting-privacy-mask');
  const columnsGrid = document.getElementById('columns-selector-grid');

  const historyList = document.getElementById('history-list');
  const btnClearHistory = document.getElementById('btn-clear-history');

  const toastPopup = document.getElementById('toast-popup');

  // Application State
  let allContacts = [];
  let groups = [];
  let labels = [];
  let countryMap = new Map(); // iso -> { name, flag, count, contacts }
  let selectedIds = new Set();
  let currentTab = 'all';
  let isMasked = false;
  let userSettings = {};
  let searchTimeout = null;
  let renderedCount = 0;
  const CHUNK_SIZE = 100;

  // Initialize
  await initSettings();
  await loadData();
  setupEventListeners();

  /**
   * Load User Settings & Theme
   */
  async function initSettings() {
    if (window.WASettings) {
      userSettings = await window.WASettings.getSettings();
      applyTheme(userSettings.theme || 'auto');
      if (settingTheme) settingTheme.value = userSettings.theme || 'auto';
      if (userSettings.delimiter) settingDelimiter.value = userSettings.delimiter;
      settingAutoDedupe.checked = Boolean(userSettings.autoDeduplicate);
      settingMergeGroups.checked = Boolean(userSettings.mergeMultiGroups !== false);
      settingPrivacyMask.checked = Boolean(userSettings.maskNumbers);
      isMasked = Boolean(userSettings.maskNumbers);
      if (userSettings.defaultFormat) exportModeSelect.value = userSettings.defaultFormat;

      // Populate Column Checkboxes
      if (userSettings.selectedColumns && columnsGrid) {
        columnsGrid.querySelectorAll('input[data-col]').forEach(chk => {
          const colKey = chk.getAttribute('data-col');
          if (userSettings.selectedColumns[colKey] !== undefined) {
            chk.checked = Boolean(userSettings.selectedColumns[colKey]);
          }
        });
      }
    }
  }

  function applyTheme(theme) {
    document.body.classList.remove('theme-light', 'theme-dark');
    if (theme === 'light') {
      document.body.classList.add('theme-light');
    } else if (theme === 'dark') {
      document.body.classList.add('theme-dark');
    }
  }

  function toggleTheme() {
    const current = userSettings.theme || 'auto';
    let next = 'dark';
    if (current === 'dark') next = 'light';
    else if (current === 'light') next = 'auto';

    userSettings.theme = next;
    applyTheme(next);
    if (settingTheme) settingTheme.value = next;
    if (window.WASettings) window.WASettings.saveSettings({ theme: next });
    showToast(`Theme: ${next.toUpperCase()}`);
  }

  /**
   * Toast notification helper
   */
  function showToast(msg) {
    if (!toastPopup) return;
    toastPopup.textContent = msg;
    toastPopup.classList.add('show');
    setTimeout(() => {
      toastPopup.classList.remove('show');
    }, 2400);
  }

  /**
   * Status indicator helper
   */
  function setStatus(state, message) {
    const dot = statusIndicator.querySelector('.status-dot');
    dot.className = 'status-dot';
    if (state === 'online') {
      dot.classList.add('dot-online');
      bannerNotConnected.classList.add('hidden');
    } else if (state === 'warning') {
      dot.classList.add('dot-warning');
      bannerNotConnected.classList.remove('hidden');
    } else {
      dot.classList.add('dot-offline');
      bannerNotConnected.classList.remove('hidden');
    }
    statusText.textContent = message;
  }

  /**
   * Query WhatsApp Web active tab
   */
  async function sendToContentScript(action, payload = {}) {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || !tabs[0] || !tabs[0].id) {
          return reject(new Error('No active WhatsApp Web tab found'));
        }

        const tab = tabs[0];
        if (!tab.url || !tab.url.includes('web.whatsapp.com')) {
          return reject(new Error('Please open WhatsApp Web (web.whatsapp.com)'));
        }

        chrome.tabs.sendMessage(tab.id, { action, payload }, (response) => {
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError.message || 'Connection failed. Please refresh web.whatsapp.com'));
          }
          if (response && response.success) {
            resolve(response.data);
          } else {
            reject(new Error(response?.error || 'Operation failed'));
          }
        });
      });
    });
  }

  /**
   * Load & Process WhatsApp Data
   */
  async function loadData() {
    loadingSpinner.classList.remove('hidden');
    itemsList.classList.add('hidden');
    emptyState.classList.add('hidden');
    setStatus('warning', 'Connecting to WhatsApp...');

    try {
      const initialData = await sendToContentScript('GET_INITIAL_DATA');

      let rawContacts = initialData.contacts || [];
      groups = initialData.groups || [];
      labels = initialData.labels || [];

      // Normalize and Deduplicate Contacts
      const seen = new Set();
      allContacts = [];
      countryMap = new Map();

      rawContacts.forEach(c => {
        const phone = c.phoneNumber || (c.id && !c.id.includes('@g.us') ? c.id.replace(/@.*$/, '') : '');
        if (!phone) return;

        if (userSettings.autoDeduplicate && seen.has(phone)) {
          return;
        }
        seen.add(phone);

        const countryInfo = window.WAPhoneUtils ? window.WAPhoneUtils.detectCountry(phone) : { iso: 'XX', name: 'International', flag: '🌐' };
        c.countryName = countryInfo.name;
        c.countryFlag = countryInfo.flag;
        c.countryIso = countryInfo.iso;

        allContacts.push(c);

        // Group by country
        if (!countryMap.has(c.countryIso)) {
          countryMap.set(c.countryIso, {
            name: c.countryName,
            flag: c.countryFlag,
            iso: c.countryIso,
            count: 0,
            contacts: []
          });
        }
        const countryGroup = countryMap.get(c.countryIso);
        countryGroup.count++;
        countryGroup.contacts.push(c);
      });

      // Update Stats Counters
      const unsavedCount = allContacts.filter(c => !c.isSaved).length;
      statTotal.textContent = allContacts.length.toLocaleString();
      statUnsaved.textContent = unsavedCount.toLocaleString();
      statGroups.textContent = groups.length.toLocaleString();
      statCountries.textContent = countryMap.size.toLocaleString();

      // Populate Country Filter Dropdown
      populateCountryFilter();

      setStatus('online', 'Connected to WhatsApp Web');
      selectAllVisible();
      renderCurrentView();

    } catch (err) {
      console.warn('[Popup Load Warning]', err);
      setStatus('offline', 'Could not read WhatsApp data');
      emptyState.classList.remove('hidden');
      emptyState.innerHTML = `<p style="color:#ea0038;">Error: ${err.message}</p><p style="margin-top:6px;font-size:11px;">Make sure WhatsApp Web is open and fully loaded.</p>`;
    } finally {
      loadingSpinner.classList.add('hidden');
    }
  }

  function populateCountryFilter() {
    filterCountrySelect.innerHTML = '<option value="">All Countries (All)</option>';
    const sortedCountries = Array.from(countryMap.values()).sort((a, b) => b.count - a.count);
    sortedCountries.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.iso;
      opt.textContent = `${c.iso} — ${c.name} (${c.count})`;
      filterCountrySelect.appendChild(opt);
    });
  }

  /**
   * Filter Items based on active tab, search, country, and type
   */
  function getFilteredItems() {
    const q = searchInput.value.toLowerCase().trim();
    const selectedCountry = filterCountrySelect.value;
    const selectedType = filterTypeSelect.value;

    if (currentTab === 'all' || currentTab === 'unsaved') {
      return allContacts.filter(c => {
        if (currentTab === 'unsaved' && c.isSaved) return false;
        if (selectedCountry && c.countryIso !== selectedCountry) return false;
        if (selectedType === 'saved' && !c.isSaved) return false;
        if (selectedType === 'unsaved' && c.isSaved) return false;
        if (selectedType === 'business' && !c.isBusiness) return false;

        if (!q) return true;
        return (c.displayName && c.displayName.toLowerCase().includes(q)) ||
               (c.phoneNumber && c.phoneNumber.includes(q)) ||
               (c.countryName && c.countryName.toLowerCase().includes(q)) ||
               (c.savedName && c.savedName.toLowerCase().includes(q)) ||
               (c.about && c.about.toLowerCase().includes(q));
      });
    }

    if (currentTab === 'groups') {
      return groups.filter(g => {
        if (!q) return true;
        return (g.name && g.name.toLowerCase().includes(q)) ||
               (g.id && g.id.toLowerCase().includes(q));
      });
    }

    if (currentTab === 'countries') {
      return Array.from(countryMap.values()).filter(c => {
        if (!q) return true;
        return c.name.toLowerCase().includes(q) || c.iso.toLowerCase().includes(q);
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
   * Render View with Chunked DOM Rendering
   */
  function renderCurrentView() {
    const items = getFilteredItems();
    itemsList.innerHTML = '';
    renderedCount = 0;

    if (items.length === 0) {
      itemsList.classList.add('hidden');
      emptyState.classList.remove('hidden');
      updateSelectionSummary();
      return;
    }

    emptyState.classList.add('hidden');
    itemsList.classList.remove('hidden');

    renderNextChunk(items);
    updateSelectionSummary();
  }

  function getCountryFlagHtml(iso, name = '') {
    if (!iso || iso === 'XX' || iso.length !== 2) {
      return '<span class="country-pill">🌐</span>';
    }
    const isoLower = iso.toLowerCase();
    return `<img class="country-flag-img" src="https://flagcdn.com/w40/${isoLower}.png" srcset="https://flagcdn.com/w80/${isoLower}.png 2x" width="17" height="12" alt="${name || iso}" onerror="this.outerHTML='<span class=\\'country-pill\\'>${iso}</span>'">`;
  }

  function getCountryFlagLargeHtml(iso, name = '') {
    if (!iso || iso === 'XX' || iso.length !== 2) {
      return '<span style="font-size:14px;">🌐</span>';
    }
    const isoLower = iso.toLowerCase();
    return `<img class="country-flag-large" src="https://flagcdn.com/w40/${isoLower}.png" srcset="https://flagcdn.com/w80/${isoLower}.png 2x" width="22" height="15" alt="${name || iso}" onerror="this.outerHTML='<span class=\\'country-pill\\'>${iso}</span>'">`;
  }

  function renderNextChunk(items) {
    if (!items || renderedCount >= items.length) return;

    const nextBatch = items.slice(renderedCount, renderedCount + CHUNK_SIZE);
    renderedCount += nextBatch.length;
    const fragment = document.createDocumentFragment();

    if (currentTab === 'all' || currentTab === 'unsaved') {
      nextBatch.forEach(c => {
        const itemEl = document.createElement('div');
        itemEl.className = 'contact-item';

        const id = c.phoneNumber || c.id;
        const isChecked = selectedIds.has(id);
        const initial = (c.displayName || c.phoneNumber || '?').charAt(0).toUpperCase();
        const displayPhone = isMasked && window.WAPhoneUtils ? window.WAPhoneUtils.maskPhone(c.phoneNumber) : (c.formattedNumber || `+${c.phoneNumber}`);
        const flagHtml = getCountryFlagHtml(c.countryIso, c.countryName);

        itemEl.innerHTML = `
          <input type="checkbox" data-id="${id}" ${isChecked ? 'checked' : ''}>
          <div class="contact-avatar">${initial}</div>
          <div class="contact-info">
            <div class="contact-name-row">
              <span class="contact-name">${c.displayName || 'Unknown'}</span>
              ${c.isSaved ? '<span class="badge badge-saved">Saved</span>' : '<span class="badge badge-unsaved">Unsaved</span>'}
              ${c.isBusiness ? '<span class="badge badge-role">Biz</span>' : ''}
            </div>
            <span class="contact-details">${flagHtml} ${displayPhone} • ${c.countryName || 'Global'} ${c.about ? '• ' + c.about : ''}</span>
          </div>
        `;

        const chk = itemEl.querySelector('input');
        chk.addEventListener('change', () => {
          if (chk.checked) selectedIds.add(id);
          else selectedIds.delete(id);
          updateSelectionSummary();
        });

        fragment.appendChild(itemEl);
      });

    } else if (currentTab === 'groups') {
      nextBatch.forEach(g => {
        const itemEl = document.createElement('div');
        itemEl.className = 'group-item';

        const isChecked = selectedIds.has(g.id);
        const memberText = (g.memberCount && g.memberCount > 0) ? `${g.memberCount} members` : 'Loading...';

        itemEl.innerHTML = `
          <input type="checkbox" data-id="${g.id}" ${isChecked ? 'checked' : ''}>
          <div class="contact-avatar" style="background:rgba(18,140,126,0.15);color:#128c7e;">👥</div>
          <div class="contact-info">
            <div class="contact-name-row">
              <span class="contact-name">${g.name}</span>
              <span class="badge badge-role" data-group-badge="${g.id}">${memberText}</span>
            </div>
            <span class="contact-details">ID: ${g.id}</span>
          </div>
          <button class="btn-quick-export" data-group-id="${g.id}">Export</button>
        `;

        const chk = itemEl.querySelector('input');
        chk.addEventListener('change', () => {
          if (chk.checked) selectedIds.add(g.id);
          else selectedIds.delete(g.id);
          updateSelectionSummary();
        });

        const quickExportBtn = itemEl.querySelector('.btn-quick-export');
        quickExportBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          quickExportSingleGroup(g);
        });

        if (!g.memberCount || g.memberCount === 0) {
          sendToContentScript('GET_GROUP_MEMBERS', { groupJid: g.id }).then(members => {
            if (members && members.length > 0) {
              g.memberCount = members.length;
              const badge = itemEl.querySelector(`[data-group-badge="${CSS.escape(g.id)}"]`);
              if (badge) badge.textContent = `${members.length} members`;
            } else {
              const badge = itemEl.querySelector(`[data-group-badge="${CSS.escape(g.id)}"]`);
              if (badge) badge.textContent = 'Group';
            }
          }).catch(() => {
            const badge = itemEl.querySelector(`[data-group-badge="${CSS.escape(g.id)}"]`);
            if (badge) badge.textContent = 'Group';
          });
        }

        fragment.appendChild(itemEl);
      });

    } else if (currentTab === 'countries') {
      nextBatch.forEach(c => {
        const itemEl = document.createElement('div');
        itemEl.className = 'country-item';
        const flagLarge = getCountryFlagLargeHtml(c.iso, c.name);

        itemEl.innerHTML = `
          <div class="contact-avatar country-flag-avatar">${flagLarge}</div>
          <div class="contact-info">
            <div class="contact-name-row">
              <span class="contact-name">${c.name}</span>
              <span class="badge badge-role">${c.count} contacts</span>
            </div>
            <span class="contact-details">ISO Code: ${c.iso}</span>
          </div>
          <button class="btn-quick-export" data-iso="${c.iso}">Export</button>
        `;

        const exportBtn = itemEl.querySelector('.btn-quick-export');
        exportBtn.addEventListener('click', () => {
          exportContactsList(c.contacts, `${c.name.toLowerCase()}_contacts`);
        });

        fragment.appendChild(itemEl);
      });

    } else if (currentTab === 'labels') {
      nextBatch.forEach(l => {
        const itemEl = document.createElement('div');
        itemEl.className = 'group-item';
        const isChecked = selectedIds.has(l.id);
        const contactMatches = allContacts.filter(c => c.labels && (c.labels.includes(l.name) || c.labels.includes(l.id))).length;
        const groupMatches = groups.filter(g => g.labels && (g.labels.includes(l.name) || g.labels.includes(l.id))).length;
        const totalCount = Math.max(l.count || 0, contactMatches + groupMatches);

        itemEl.innerHTML = `
          <input type="checkbox" data-id="${l.id}" ${isChecked ? 'checked' : ''}>
          <div class="contact-avatar" style="background:${l.color || '#00a884'}22;color:${l.color || '#00a884'};">🏷️</div>
          <div class="contact-info">
            <div class="contact-name-row">
              <span class="contact-name">${l.name}</span>
              <span class="badge badge-role">${totalCount} chats</span>
            </div>
            <span class="contact-details">Label ID: ${l.id}</span>
          </div>
          <button class="btn-quick-export" data-label-id="${l.id}">Export</button>
        `;

        const chk = itemEl.querySelector('input');
        chk.addEventListener('change', () => {
          if (chk.checked) selectedIds.add(l.id);
          else selectedIds.delete(l.id);
          updateSelectionSummary();
        });

        const quickExportBtn = itemEl.querySelector('.btn-quick-export');
        quickExportBtn.addEventListener('click', async () => {
          const labeledContacts = allContacts.filter(c => c.labels && (c.labels.includes(l.name) || c.labels.includes(l.id)));
          const labeledGroups = groups.filter(g => g.labels && (g.labels.includes(l.name) || g.labels.includes(l.id)));
          
          let target = [...labeledContacts];
          for (const g of labeledGroups) {
            const members = await sendToContentScript('GET_GROUP_MEMBERS', { groupJid: g.id }).catch(() => []);
            target = target.concat(members);
          }

          if (target.length === 0) {
            showToast(`No contacts currently associated with label "${l.name}"`);
            return;
          }

          exportContactsList(target, `label_${l.name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()}_contacts`);
        });

        fragment.appendChild(itemEl);
      });
    }

    itemsList.appendChild(fragment);
  }

  function selectAllVisible() {
    selectedIds.clear();
    const items = getFilteredItems();
    items.forEach(i => selectedIds.add(i.phoneNumber || i.id));
    chkSelectAll.checked = true;
    updateSelectionSummary();
  }

  function updateSelectionSummary() {
    const visible = getFilteredItems();
    let selectedCount = 0;
    visible.forEach(i => {
      if (selectedIds.has(i.phoneNumber || i.id)) selectedCount++;
    });

    const btnExportText = document.getElementById('btn-export-text');
    const itemType = currentTab === 'groups' ? 'Groups' : (currentTab === 'labels' ? 'Labels' : 'Contacts');

    if (visible.length === 0) {
      selectionSummary.textContent = '0 selected';
      chkSelectAll.checked = false;
      if (btnExportText) btnExportText.textContent = 'Export (0)';
      if (btnMainExport) btnMainExport.disabled = true;
    } else if (selectedCount === visible.length) {
      selectionSummary.textContent = `All ${visible.length} selected`;
      chkSelectAll.checked = true;
      if (btnExportText) btnExportText.textContent = `Export (${visible.length} ${itemType})`;
      if (btnMainExport) btnMainExport.disabled = false;
    } else {
      selectionSummary.textContent = `${selectedCount} of ${visible.length} selected`;
      chkSelectAll.checked = false;
      if (btnExportText) btnExportText.textContent = selectedCount > 0 ? `Export (${selectedCount} ${itemType})` : 'Export (0)';
      if (btnMainExport) btnMainExport.disabled = selectedCount === 0;
    }
  }

  /**
   * Export Selected Contacts
   */
  async function performExport(formatOverride) {
    const format = formatOverride || exportModeSelect.value || 'csv';
    let targetContacts = [];
    let filenamePrefix = 'whatsapp_contacts';

    if (currentTab === 'all' || currentTab === 'unsaved') {
      const visible = getFilteredItems();
      targetContacts = visible.filter(c => selectedIds.has(c.phoneNumber || c.id));
      filenamePrefix = currentTab === 'unsaved' ? 'whatsapp_unsaved_leads' : 'whatsapp_all_contacts';
    } else if (currentTab === 'groups') {
      const selectedGroups = groups.filter(g => selectedIds.has(g.id));
      if (selectedGroups.length === 0) {
        showToast('Please select at least one group');
        return;
      }

      // Handle ZIP Export Mode for Multiple Groups
      if (format === 'zip') {
        showToast(`Preparing ZIP archive for ${selectedGroups.length} groups...`);
        const groupsWithMembers = [];

        for (const g of selectedGroups) {
          const members = await sendToContentScript('GET_GROUP_MEMBERS', { groupJid: g.id }).catch(() => []);
          groupsWithMembers.push({ name: g.name, members });
        }

        const dateStr = new Date().toISOString().slice(0, 10);
        const zipName = `whatsapp_groups_${dateStr}.zip`;
        window.WAExporters.exportGroupsToZip(groupsWithMembers, zipName, 'csv', userSettings.delimiter || ',', userSettings.selectedColumns);

        if (window.WASettings) {
          window.WASettings.addHistoryEntry({
            filename: zipName,
            format: 'ZIP',
            count: groupsWithMembers.reduce((acc, g) => acc + g.members.length, 0),
            source: `${selectedGroups.length} Groups`
          });
        }

        showToast(`🎉 Exported ${selectedGroups.length} groups into ZIP!`);
        return;
      }

      showToast(`Extracting members from ${selectedGroups.length} groups...`);
      let allGroupMembers = [];

      for (const g of selectedGroups) {
        const members = await sendToContentScript('GET_GROUP_MEMBERS', { groupJid: g.id }).catch(() => []);
        allGroupMembers = allGroupMembers.concat(members);
      }

      if (userSettings.mergeMultiGroups !== false && window.WAExporters.mergeGroupContacts) {
        targetContacts = window.WAExporters.mergeGroupContacts(allGroupMembers);
      } else {
        targetContacts = allGroupMembers;
      }

      filenamePrefix = selectedGroups.length === 1 ? `group_${selectedGroups[0].name.replace(/[^a-zA-Z0-9_-]/g, '_')}_members` : 'whatsapp_group_members';

    } else if (currentTab === 'countries') {
      targetContacts = getFilteredItems().flatMap(c => c.contacts);
      filenamePrefix = 'whatsapp_country_contacts';
    } else if (currentTab === 'labels') {
      const selectedLabels = labels.filter(l => selectedIds.has(l.id));
      targetContacts = allContacts.filter(c => selectedLabels.some(l => c.labels && (c.labels.includes(l.name) || c.labels.includes(l.id))));
      filenamePrefix = 'whatsapp_labeled_contacts';
    }

    if (!targetContacts || targetContacts.length === 0) {
      showToast('No contacts selected for export');
      return;
    }

    exportContactsList(targetContacts, filenamePrefix, format);
  }

  function exportContactsList(contacts, filenamePrefix, format = 'csv') {
    if (!contacts || contacts.length === 0) {
      showToast('No contacts found');
      return;
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `${filenamePrefix}_${dateStr}.${format === 'xlsx' ? 'xls' : (format === 'txt' ? 'txt' : (format === 'html' ? 'html' : (format === 'vcf' ? 'vcf' : (format === 'json' ? 'json' : 'csv'))))}`;

    if (!window.WAExporters) {
      showToast('Export library not loaded');
      return;
    }

    const delimiter = userSettings.delimiter || ',';
    const columns = userSettings.selectedColumns;

    switch (format) {
      case 'csv':
        window.WAExporters.exportToCSV(contacts, filename, delimiter, columns);
        break;
      case 'xlsx':
        window.WAExporters.exportToExcel(contacts, filename, filenamePrefix, columns);
        break;
      case 'vcf':
        window.WAExporters.exportToVCard(contacts, filename);
        break;
      case 'google':
        window.WAExporters.exportToGoogleContactsCSV(contacts, `google_contacts_${dateStr}.csv`);
        break;
      case 'crm':
        window.WAExporters.exportToCRMCSV(contacts, `crm_leads_${dateStr}.csv`);
        break;
      case 'txt':
        window.WAExporters.exportToPlainText(contacts, filename);
        break;
      case 'html':
        window.WAExporters.exportToHTMLReport(contacts, filename, filenamePrefix.replace(/_/g, ' '));
        break;
      case 'json':
        window.WAExporters.exportToJSON(contacts, filename);
        break;
      default:
        window.WAExporters.exportToCSV(contacts, filename, delimiter, columns);
    }

    // Record export history
    if (window.WASettings) {
      window.WASettings.addHistoryEntry({
        filename: filename,
        format: format.toUpperCase(),
        count: contacts.length,
        source: currentTab.toUpperCase()
      });
    }

    showToast(`🎉 Exported ${contacts.length} contacts (${format.toUpperCase()})`);
  }

  async function quickExportSingleGroup(g) {
    showToast(`Loading members for ${g.name}...`);
    try {
      const members = await sendToContentScript('GET_GROUP_MEMBERS', { groupJid: g.id });
      if (!members || members.length === 0) {
        showToast('No members found in this group');
        return;
      }
      const cleanName = g.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      exportContactsList(members, `group_${cleanName}_members`, exportModeSelect.value || 'csv');
    } catch (e) {
      showToast('Error exporting group');
    }
  }

  /**
   * Copy Numbers to Clipboard
   */
  async function copySelectedNumbers() {
    const visible = getFilteredItems();
    let target = visible.filter(c => selectedIds.has(c.phoneNumber || c.id));
    if (target.length === 0) target = visible;

    const numbers = target.map(c => c.phoneNumber ? `+${c.phoneNumber}` : '').filter(Boolean);
    if (numbers.length === 0) {
      showToast('No numbers to copy');
      return;
    }

    try {
      await navigator.clipboard.writeText(numbers.join('\n'));
      showToast(`📋 Copied ${numbers.length} numbers to clipboard!`);
    } catch (e) {
      showToast('Could not copy to clipboard');
    }
  }

  /**
   * Render Recent Exports Log
   */
  async function renderExportHistory() {
    if (!historyList || !window.WASettings) return;
    const settings = await window.WASettings.getSettings();
    const history = settings.exportHistory || [];

    if (history.length === 0) {
      historyList.innerHTML = '<p class="text-muted" style="font-size:11px;padding:16px;text-align:center;">No export history yet.</p>';
      return;
    }

    historyList.innerHTML = '';
    history.forEach(item => {
      const card = document.createElement('div');
      card.className = 'history-card';
      const timeStr = new Date(item.timestamp).toLocaleDateString() + ' ' + new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      card.innerHTML = `
        <div class="history-info">
          <span class="history-filename">${item.filename}</span>
          <span class="history-meta">${item.count} contacts • ${item.source || 'Export'} • ${timeStr}</span>
        </div>
        <span class="badge badge-role">${item.format}</span>
      `;
      historyList.appendChild(card);
    });
  }

  /**
   * Event Listeners Setup
   */
  function setupEventListeners() {
    // Tab switching
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTab = btn.getAttribute('data-tab');
        selectAllVisible();
        renderCurrentView();
      });
    });

    // Stat cards click to tab
    document.querySelectorAll('.stat-card').forEach(card => {
      card.addEventListener('click', () => {
        const tab = card.getAttribute('data-tab');
        const targetBtn = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
        if (targetBtn) targetBtn.click();
      });
    });

    // Infinite scroll listener for fast rendering
    listContainer.addEventListener('scroll', () => {
      if (listContainer.scrollTop + listContainer.clientHeight >= listContainer.scrollHeight - 80) {
        renderNextChunk(getFilteredItems());
      }
    });

    // Search input with debounce
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        selectAllVisible();
        renderCurrentView();
      }, 200);
    });

    // Select all checkbox
    chkSelectAll.addEventListener('change', () => {
      const visible = getFilteredItems();
      if (chkSelectAll.checked) {
        visible.forEach(i => selectedIds.add(i.phoneNumber || i.id));
      } else {
        visible.forEach(i => selectedIds.delete(i.phoneNumber || i.id));
      }
      renderCurrentView();
    });

    // Filter dropdowns
    filterCountrySelect.addEventListener('change', () => {
      selectAllVisible();
      renderCurrentView();
    });

    filterTypeSelect.addEventListener('change', () => {
      selectAllVisible();
      renderCurrentView();
    });

    btnResetFilters.addEventListener('click', () => {
      searchInput.value = '';
      filterCountrySelect.value = '';
      filterTypeSelect.value = 'all';
      selectAllVisible();
      renderCurrentView();
      showToast('Filters reset');
    });

    function triggerAnimation(btn, animClass, duration = 650) {
      if (!btn) return;
      btn.classList.remove(animClass);
      // Force reflow
      void btn.offsetWidth;
      btn.classList.add(animClass);
      setTimeout(() => btn.classList.remove(animClass), duration);
    }

    // Theme toggle with 360° spin animation
    btnThemeToggle.addEventListener('click', () => {
      triggerAnimation(btnThemeToggle, 'anim-theme-spin', 550);
      toggleTheme();
    });

    // Privacy Mask Toggle with eye blink animation
    btnMask.addEventListener('click', () => {
      triggerAnimation(btnMask, 'anim-eye-blink', 450);
      isMasked = !isMasked;
      renderCurrentView();
      showToast(isMasked ? '👁️ Privacy Mask Enabled' : '👁️ Numbers Visible');
    });

    // Copy to clipboard with pop & bounce animation
    btnCopyAll.addEventListener('click', () => {
      triggerAnimation(btnCopyAll, 'anim-copy-pop', 500);
      copySelectedNumbers();
    });

    // Refresh with smooth 360° spin animation
    btnRefresh.addEventListener('click', () => {
      triggerAnimation(btnRefresh, 'anim-refresh-spin', 650);
      loadData();
    });

    // Export trigger
    btnMainExport.addEventListener('click', () => performExport());

    // Settings Modal with gear rotation animation
    btnSettings.addEventListener('click', () => {
      triggerAnimation(btnSettings, 'anim-gear-spin', 600);
      settingsModal.classList.remove('hidden');
      renderExportHistory();
    });

    btnCloseSettings.addEventListener('click', () => {
      settingsModal.classList.add('hidden');
    });

    // Modal Tabs
    modalTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        modalTabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.getAttribute('data-modal-tab');
        if (tab === 'history') {
          modalTabPrefs.classList.add('hidden');
          modalTabHistory.classList.remove('hidden');
          renderExportHistory();
        } else {
          modalTabPrefs.classList.remove('hidden');
          modalTabHistory.classList.add('hidden');
        }
      });
    });

    // Clear History
    if (btnClearHistory) {
      btnClearHistory.addEventListener('click', async () => {
        if (window.WASettings) await window.WASettings.clearHistory();
        renderExportHistory();
        showToast('History cleared');
      });
    }

    // Save Settings
    btnSaveSettings.addEventListener('click', async () => {
      const selectedColumns = {};
      if (columnsGrid) {
        columnsGrid.querySelectorAll('input[data-col]').forEach(chk => {
          selectedColumns[chk.getAttribute('data-col')] = chk.checked;
        });
      }

      if (window.WASettings) {
        userSettings = await window.WASettings.saveSettings({
          theme: settingTheme.value,
          delimiter: settingDelimiter.value,
          autoDeduplicate: settingAutoDedupe.checked,
          mergeMultiGroups: settingMergeGroups.checked,
          maskNumbers: settingPrivacyMask.checked,
          selectedColumns: selectedColumns
        });
        applyTheme(userSettings.theme || 'auto');
        isMasked = Boolean(userSettings.maskNumbers);
      }
      settingsModal.classList.add('hidden');
      showToast('Preferences saved');
      renderCurrentView();
    });

    // Keyboard navigation shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        settingsModal.classList.add('hidden');
        if (searchInput.value) {
          searchInput.value = '';
          renderCurrentView();
        }
      } else if (e.key === 'Enter' && !settingsModal.classList.contains('hidden')) {
        btnSaveSettings.click();
      }
    });
  }

});
