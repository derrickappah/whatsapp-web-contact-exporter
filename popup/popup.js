/**
 * WhatsApp Web Exporter Pro - Popup Controller
 * Manages Dashboard, Search, Country Segmentation, Group Inspection & Multi-Format Exports
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

  const btnMask = document.getElementById('btn-mask');
  const btnCopyAll = document.getElementById('btn-copy-all');
  const btnSettings = document.getElementById('btn-settings');
  const btnRefresh = document.getElementById('btn-refresh');

  const exportModeSelect = document.getElementById('export-mode-select');
  const btnMainExport = document.getElementById('btn-main-export');
  const formatButtons = document.querySelectorAll('.btn-format:not(.btn-primary-export)');

  // Settings Modal
  const settingsModal = document.getElementById('settings-modal');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const settingDelimiter = document.getElementById('setting-delimiter');
  const settingAutoDedupe = document.getElementById('setting-auto-dedupe');
  const settingPrivacyMask = document.getElementById('setting-privacy-mask');

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
   * Load User Settings
   */
  async function initSettings() {
    if (window.WASettings) {
      userSettings = await window.WASettings.getSettings();
      if (userSettings.delimiter) settingDelimiter.value = userSettings.delimiter;
      settingAutoDedupe.checked = Boolean(userSettings.autoDeduplicate);
      settingPrivacyMask.checked = Boolean(userSettings.maskNumbers);
      isMasked = Boolean(userSettings.maskNumbers);
      if (userSettings.defaultFormat) exportModeSelect.value = userSettings.defaultFormat;
    }
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
            return reject(new Error(chrome.runtime.lastError.message || 'Connection failed'));
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
      // Single unified query to content script (10ms)
      const initialData = await sendToContentScript('GET_INITIAL_DATA').catch(() => ({ contacts: [], groups: [], labels: [] }));

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
    filterCountrySelect.innerHTML = '<option value="">All Countries 🌐</option>';
    const sortedCountries = Array.from(countryMap.values()).sort((a, b) => b.count - a.count);
    sortedCountries.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.iso;
      opt.textContent = `${c.flag} ${c.name} (${c.count})`;
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

        itemEl.innerHTML = `
          <input type="checkbox" data-id="${id}" ${isChecked ? 'checked' : ''}>
          <div class="contact-avatar">${c.countryFlag || initial}</div>
          <div class="contact-info">
            <div class="contact-name-row">
              <span class="contact-name">${c.displayName || 'Unknown'}</span>
              ${c.isSaved ? '<span class="badge badge-saved">Saved</span>' : '<span class="badge badge-unsaved">Unsaved</span>'}
              ${c.isBusiness ? '<span class="badge badge-role">Biz</span>' : ''}
            </div>
            <span class="contact-details">${displayPhone} • ${c.countryName || 'Global'} ${c.about ? '• ' + c.about : ''}</span>
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
        const memberText = (g.memberCount && g.memberCount > 0) ? `${g.memberCount} members` : 'Group';

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

        // Trigger on-demand count if zero
        if (!g.memberCount || g.memberCount === 0) {
          sendToContentScript('GET_GROUP_MEMBERS', { groupJid: g.id }).then(members => {
            if (members && members.length > 0) {
              g.memberCount = members.length;
              const badge = itemEl.querySelector(`[data-group-badge="${CSS.escape(g.id)}"]`);
              if (badge) badge.textContent = `${members.length} members`;
            }
          }).catch(() => {});
        }

        fragment.appendChild(itemEl);
      });

    } else if (currentTab === 'countries') {
      nextBatch.forEach(c => {
        const itemEl = document.createElement('div');
        itemEl.className = 'country-item';
        itemEl.innerHTML = `
          <div class="contact-avatar" style="font-size:16px;">${c.flag}</div>
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

        itemEl.innerHTML = `
          <input type="checkbox" data-id="${l.id}" ${isChecked ? 'checked' : ''}>
          <div class="contact-avatar" style="background:${l.color || '#00a884'}22;color:${l.color || '#00a884'};">🏷️</div>
          <div class="contact-info">
            <div class="contact-name-row">
              <span class="contact-name">${l.name}</span>
              <span class="badge badge-role">${l.count || 0} chats</span>
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
        quickExportBtn.addEventListener('click', () => {
          const labeled = allContacts.filter(c => c.labels && (c.labels.includes(l.name) || c.labels.includes(l.id)));
          exportContactsList(labeled, `label_${l.name.toLowerCase()}_contacts`);
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

    if (visible.length === 0) {
      selectionSummary.textContent = '0 selected';
      chkSelectAll.checked = false;
    } else if (selectedCount === visible.length) {
      selectionSummary.textContent = `All ${visible.length} selected`;
      chkSelectAll.checked = true;
    } else {
      selectionSummary.textContent = `${selectedCount} of ${visible.length} selected`;
      chkSelectAll.checked = false;
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

      showToast(`Extracting members from ${selectedGroups.length} groups...`);
      const allMembersMap = new Map();

      for (const g of selectedGroups) {
        const members = await sendToContentScript('GET_GROUP_MEMBERS', { groupJid: g.id }).catch(() => []);
        members.forEach(m => {
          if (m.phoneNumber) allMembersMap.set(m.phoneNumber, m);
        });
      }

      targetContacts = Array.from(allMembersMap.values());
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

    switch (format) {
      case 'csv':
        window.WAExporters.exportToCSV(contacts, filename, delimiter);
        break;
      case 'xlsx':
        window.WAExporters.exportToExcel(contacts, filename, filenamePrefix);
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
        window.WAExporters.exportToCSV(contacts, filename, delimiter);
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

    // Privacy Mask Toggle
    btnMask.addEventListener('click', () => {
      isMasked = !isMasked;
      renderCurrentView();
      showToast(isMasked ? '👁️ Privacy Mask Enabled' : '👁️ Numbers Visible');
    });

    // Copy to clipboard
    btnCopyAll.addEventListener('click', copySelectedNumbers);

    // Refresh
    btnRefresh.addEventListener('click', loadData);

    // Format buttons
    formatButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const format = btn.getAttribute('data-format');
        performExport(format);
      });
    });

    btnMainExport.addEventListener('click', () => performExport());

    // Settings Modal
    btnSettings.addEventListener('click', () => {
      settingsModal.classList.remove('hidden');
    });

    btnCloseSettings.addEventListener('click', () => {
      settingsModal.classList.add('hidden');
    });

    btnSaveSettings.addEventListener('click', async () => {
      if (window.WASettings) {
        userSettings = await window.WASettings.saveSettings({
          delimiter: settingDelimiter.value,
          autoDeduplicate: settingAutoDedupe.checked,
          maskNumbers: settingPrivacyMask.checked
        });
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
