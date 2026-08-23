/**
 * WhatsApp Web Exporter - Content Script
 * Dual-Bridge: Interacts with page script & provides direct IndexedDB fallback
 */

(function () {
  'use strict';

  console.log('[WA-Exporter] Content script initialized on web.whatsapp.com');

  // Inject page-script.js into page context
  function injectPageScript() {
    try {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('content/page-script.js');
      script.onload = function () {
        this.remove();
      };
      (document.head || document.documentElement).appendChild(script);
    } catch (err) {
      console.warn('[WA-Exporter] Script injection notice:', err);
    }
  }

  injectPageScript();

  // Pending RPC Requests map
  const pendingRequests = new Map();

  function sendToPage(action, payload = {}) {
    return new Promise((resolve, reject) => {
      const requestId = 'req_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      const timeout = setTimeout(() => {
        if (pendingRequests.has(requestId)) {
          pendingRequests.delete(requestId);
          reject(new Error(`Timeout on action: ${action}`));
        }
      }, 6000);

      pendingRequests.set(requestId, { resolve, reject, timeout });

      window.postMessage({
        target: 'WA_EXPORTER_PAGE',
        action: action,
        requestId: requestId,
        payload: payload
      }, '*');
    });
  }

  // Listen for responses from Page Script
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.target !== 'WA_EXPORTER_CONTENT' || !data.requestId) return;

    const request = pendingRequests.get(data.requestId);
    if (request) {
      clearTimeout(request.timeout);
      pendingRequests.delete(data.requestId);

      if (data.success) {
        request.resolve(data.data);
      } else {
        request.reject(new Error(data.error || 'Operation failed'));
      }
    }
  });

  // Direct Content Script IndexedDB Deep Scanner
  async function directIndexedDBExtract(action, payload) {
    let dbNames = ['wawc', 'model-storage', 'wawc_db_enc', 'whatsapp_db'];
    if (indexedDB.databases) {
      try {
        const dbs = await indexedDB.databases();
        const found = dbs.map(d => d.name).filter(Boolean);
        if (found.length > 0) dbNames = Array.from(new Set([...found, ...dbNames]));
      } catch (e) {}
    }

    const contactsMap = new Map();
    const groupsMap = new Map();
    const membersMap = new Map();
    const labelsMap = new Map();
    const labelAssociations = new Map();

    for (const dbName of dbNames) {
      await new Promise((res) => {
        const req = indexedDB.open(dbName);
        req.onerror = () => res(false);
        req.onsuccess = async (ev) => {
          const db = ev.target.result;
          const stores = Array.from(db.objectStoreNames);

          // 1. Contacts
          const cStores = stores.filter(s => s.toLowerCase().includes('contact'));
          for (const cStore of cStores) {
            try {
              const tx = db.transaction(cStore, 'readonly');
              const items = await new Promise(r => {
                const gr = tx.objectStore(cStore).getAll();
                gr.onsuccess = () => r(gr.result || []);
                gr.onerror = () => r([]);
              });
              items.forEach(item => {
                const rawPhone = item.phoneNumber || item.number || (item.id && item.id.user ? item.id.user : (typeof item.id === 'string' ? item.id.replace(/@.*$/, '') : ''));
                const phone = String(rawPhone).replace(/[^0-9]/g, '');
                if (phone && phone.length >= 5) {
                  const savedName = item.name || item.savedName || '';
                  const pushName = item.pushname || item.notifyName || '';
                  const isSaved = Boolean(item.isMyContact || item.isAddressBookContact || (savedName && savedName !== phone && savedName !== `+${phone}`));
                  const displayName = savedName || pushName || `+${phone}`;

                  contactsMap.set(phone, {
                    id: `${phone}@c.us`,
                    jid: `${phone}@c.us`,
                    phoneNumber: phone,
                    formattedNumber: `+${phone}`,
                    savedName: isSaved ? savedName : '',
                    publicName: pushName,
                    displayName: displayName,
                    isSaved: isSaved,
                    isBusiness: Boolean(item.isBusiness || item.isEnterprise),
                    about: item.about || item.status || '',
                    groupName: '',
                    groupRole: 'Member',
                    labels: Array.isArray(item.labels) ? item.labels : []
                  });
                }
              });
            } catch (e) {}
          }

          // 2. Chats
          const chStores = stores.filter(s => s.toLowerCase().includes('chat'));
          for (const chStore of chStores) {
            try {
              const tx = db.transaction(chStore, 'readonly');
              const chats = await new Promise(r => {
                const gr = tx.objectStore(chStore).getAll();
                gr.onsuccess = () => r(gr.result || []);
                gr.onerror = () => r([]);
              });
              chats.forEach(chat => {
                const jid = String(chat.id?._serialized || chat.id || '');
                if (jid.endsWith('@g.us')) {
                  const pCount = (chat.groupMetadata && Array.isArray(chat.groupMetadata.participants)) ? chat.groupMetadata.participants.length : (Array.isArray(chat.participants) ? chat.participants.length : 0);
                  if (!groupsMap.has(jid) || groupsMap.get(jid).memberCount === 0) {
                    groupsMap.set(jid, {
                      id: jid,
                      name: chat.name || chat.formattedTitle || 'WhatsApp Group',
                      memberCount: pCount,
                      timestamp: chat.t || 0
                    });
                  }
                } else if (jid.endsWith('@c.us') || jid.endsWith('@s.whatsapp.net')) {
                  const phone = String(jid.replace(/@.*$/, '')).replace(/[^0-9]/g, '');
                  if (phone && !contactsMap.has(phone)) {
                    contactsMap.set(phone, {
                      id: jid,
                      jid: jid,
                      phoneNumber: phone,
                      formattedNumber: `+${phone}`,
                      savedName: chat.name || '',
                      publicName: '',
                      displayName: chat.name || chat.formattedTitle || `+${phone}`,
                      isSaved: Boolean(chat.name && chat.name !== phone && !chat.name.startsWith('+')),
                      isBusiness: false,
                      about: '',
                      groupName: '',
                      groupRole: '',
                      labels: []
                    });
                  }
                }

                // Chat label associations
                if (Array.isArray(chat.labels)) {
                  chat.labels.forEach(lblId => {
                    const lId = String(typeof lblId === 'object' ? (lblId.id || lblId.name) : lblId);
                    if (!labelAssociations.has(lId)) labelAssociations.set(lId, new Set());
                    labelAssociations.get(lId).add(jid);
                  });
                }
              });
            } catch (e) {}
          }

          // 3. Group Metadata & Participants
          const gmStores = stores.filter(s => s.toLowerCase().includes('group') || s.toLowerCase().includes('participant'));
          for (const gmStore of gmStores) {
            try {
              const tx = db.transaction(gmStore, 'readonly');
              const metas = await new Promise(r => {
                const gr = tx.objectStore(gmStore).getAll();
                gr.onsuccess = () => r(gr.result || []);
                gr.onerror = () => r([]);
              });
              metas.forEach(meta => {
                const gJid = String(meta.id?._serialized || meta.id || '');
                if (!gJid.endsWith('@g.us')) return;

                const groupName = meta.subject || meta.name || groupsMap.get(gJid)?.name || 'WhatsApp Group';
                const participants = meta.participants || meta.members || [];
                const members = [];

                participants.forEach(p => {
                  const pJid = String(p.id?._serialized || (typeof p === 'string' ? p : p.id) || '');
                  const phone = String(pJid.replace(/@.*$/, '')).replace(/[^0-9]/g, '');
                  if (!phone) return;

                  const role = p.isSuperAdmin ? 'Super Admin' : (p.isAdmin ? 'Admin' : 'Member');
                  const existing = contactsMap.get(phone);
                  if (existing) {
                    members.push({ ...existing, groupName, groupRole: role });
                  } else {
                    const m = {
                      id: pJid,
                      jid: pJid,
                      phoneNumber: phone,
                      formattedNumber: `+${phone}`,
                      savedName: (p.name && p.name !== phone) ? p.name : '',
                      publicName: p.pushname || '',
                      displayName: p.name || p.pushname || `+${phone}`,
                      isSaved: Boolean(p.name && p.name !== phone && !p.name.startsWith('+')),
                      isBusiness: false,
                      about: '',
                      groupName,
                      groupRole: role,
                      labels: []
                    };
                    members.push(m);
                    contactsMap.set(phone, m);
                  }
                });

                membersMap.set(gJid, members);
                groupsMap.set(gJid, {
                  id: gJid,
                  name: groupName,
                  memberCount: members.length || participants.length,
                  timestamp: meta.creation || 0
                });
              });
            } catch (e) {}
          }

          // 4. Labels
          const lStores = stores.filter(s => s.toLowerCase().includes('label'));
          for (const lStore of lStores) {
            try {
              const tx = db.transaction(lStore, 'readonly');
              const items = await new Promise(r => {
                const gr = tx.objectStore(lStore).getAll();
                gr.onsuccess = () => r(gr.result || []);
                gr.onerror = () => r([]);
              });
              items.forEach(item => {
                if (item.name && item.id !== undefined) {
                  const lId = String(item.id);
                  if (!labelsMap.has(lId)) {
                    labelsMap.set(lId, {
                      id: lId,
                      name: item.name,
                      color: item.hexColor || item.color || '#00a884',
                      count: item.count || 0
                    });
                  }
                }
                if (item.labelId !== undefined || item.labeledId !== undefined || item.associationId !== undefined) {
                  const lId = String(item.labelId || item.parentId || item.id?.split('_')?.[0]);
                  const targetId = String(item.labeledId || item.itemId || item.chatId || item.contactId || item.id?.split('_')?.[1]);
                  if (lId && targetId) {
                    if (!labelAssociations.has(lId)) labelAssociations.set(lId, new Set());
                    labelAssociations.get(lId).add(targetId);
                  }
                }
              });
            } catch (e) {}
          }

          db.close();
          res(true);
        };
      });
    }

    // Update label counts
    labelsMap.forEach(label => {
      const assoc = labelAssociations.get(label.id) || new Set();
      contactsMap.forEach(c => {
        if (c.labels && (c.labels.includes(label.name) || c.labels.includes(label.id))) {
          assoc.add(c.id || c.phoneNumber);
        }
      });
      label.count = Math.max(label.count || 0, assoc.size);
    });

    if (action === 'GET_ALL_CONTACTS') return Array.from(contactsMap.values());
    if (action === 'GET_GROUPS') return Array.from(groupsMap.values());
    if (action === 'GET_GROUP_MEMBERS') {
      const gJid = payload?.groupJid;
      if (!gJid) return [];
      const cleanJid = String(gJid);
      if (membersMap.has(cleanJid)) return membersMap.get(cleanJid);
      const userPart = cleanJid.replace(/@.*$/, '');
      for (const [key, val] of membersMap.entries()) {
        if (key.includes(userPart)) return val;
      }
      return [];
    }
    if (action === 'GET_LABELS') return Array.from(labelsMap.values());
    return [];
  }

  // Handle messages from Extension Popup / Background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.action) return;

    (async () => {
      try {
        let result = null;
        try {
          result = await sendToPage(message.action, message.payload);
        } catch (e) {
          result = await directIndexedDBExtract(message.action, message.payload);
        }

        // If result is null/undefined or failed, try direct IndexedDB extract
        if (result === null || result === undefined) {
          result = await directIndexedDBExtract(message.action, message.payload);
        }

        sendResponse({ success: true, data: result || [] });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();

    return true;
  });

  // Toast notification helper
  function showToast(msg, type = 'success') {
    let toast = document.querySelector('.wae-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'wae-toast';
      document.body.appendChild(toast);
    }
    toast.className = `wae-toast ${type} wae-show`;
    toast.textContent = msg;
    setTimeout(() => {
      toast.classList.remove('wae-show');
    }, 3500);
  }

  // In-Page Quick Export Modal
  function createQuickModal() {
    if (document.getElementById('wae-quick-modal')) return;

    const backdrop = document.createElement('div');
    backdrop.id = 'wae-quick-modal';
    backdrop.className = 'wae-modal-backdrop';

    backdrop.innerHTML = `
      <div class="wae-modal-card">
        <div class="wae-modal-header">
          <h3 class="wae-modal-title">
            <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
            Export WhatsApp Contacts
          </h3>
          <button class="wae-modal-close" id="wae-modal-close-btn" title="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="wae-modal-body">
          <div class="wae-option-group">
            <span class="wae-option-label">Select Source</span>
            <div class="wae-radio-cards">
              <div class="wae-radio-card" data-source="current_group" id="wae-opt-group">
                <div class="wae-card-title">Active Group 👥</div>
                <div class="wae-card-desc">Export all members in current chat</div>
              </div>
              <div class="wae-radio-card selected" data-source="all_contacts">
                <div class="wae-card-title">All Contacts 📇</div>
                <div class="wae-card-desc">Saved address book & direct chats</div>
              </div>
              <div class="wae-radio-card" data-source="unsaved">
                <div class="wae-card-title">Unsaved Only ❓</div>
                <div class="wae-card-desc">Only numbers not in address book</div>
              </div>
              <div class="wae-radio-card" data-source="all_groups">
                <div class="wae-card-title">All Groups 🌐</div>
                <div class="wae-card-desc">Members from all joined groups</div>
              </div>
            </div>
          </div>

          <div class="wae-option-group">
            <span class="wae-option-label">Export Format</span>
            <div class="wae-formats-grid">
              <button class="wae-format-btn active" data-format="csv">CSV</button>
              <button class="wae-format-btn" data-format="xlsx">Excel</button>
              <button class="wae-format-btn" data-format="vcf">vCard</button>
              <button class="wae-format-btn" data-format="json">JSON</button>
            </div>
          </div>

          <button class="wae-btn-primary" id="wae-modal-export-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
            Export Now
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    let selectedSource = 'all_contacts';
    let selectedFormat = 'csv';

    backdrop.querySelectorAll('.wae-radio-card').forEach(card => {
      card.addEventListener('click', () => {
        backdrop.querySelectorAll('.wae-radio-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedSource = card.getAttribute('data-source');
      });
    });

    backdrop.querySelectorAll('.wae-format-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        backdrop.querySelectorAll('.wae-format-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedFormat = btn.getAttribute('data-format');
      });
    });

    const closeBtn = backdrop.querySelector('#wae-modal-close-btn');
    closeBtn.addEventListener('click', () => backdrop.classList.remove('wae-open'));
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) backdrop.classList.remove('wae-open');
    });

    const exportBtn = backdrop.querySelector('#wae-modal-export-btn');
    exportBtn.addEventListener('click', async () => {
      try {
        exportBtn.disabled = true;
        exportBtn.innerHTML = 'Extracting contacts...';

        let contacts = [];
        let filenamePrefix = 'whatsapp_contacts';

        if (selectedSource === 'current_group') {
          const active = await sendToPage('GET_ACTIVE_CHAT').catch(() => null);
          contacts = await directIndexedDBExtract('GET_GROUP_MEMBERS', { groupJid: active?.id });
          const cleanGroupName = (active?.name || 'group').replace(/[^a-zA-Z0-9_-]/g, '_');
          filenamePrefix = `group_${cleanGroupName}_members`;
        } else if (selectedSource === 'all_contacts') {
          contacts = await directIndexedDBExtract('GET_ALL_CONTACTS');
          filenamePrefix = 'whatsapp_all_contacts';
        } else if (selectedSource === 'unsaved') {
          const all = await directIndexedDBExtract('GET_ALL_CONTACTS');
          contacts = all.filter(c => !c.isSaved);
          filenamePrefix = 'whatsapp_unsaved_numbers';
        } else if (selectedSource === 'all_groups') {
          const all = await directIndexedDBExtract('GET_ALL_CONTACTS');
          contacts = all.filter(c => c.groupName);
          filenamePrefix = 'whatsapp_all_group_members';
        }

        if (!contacts || contacts.length === 0) {
          throw new Error('No contacts found. Please make sure WhatsApp Web is loaded.');
        }

        const dateStr = new Date().toISOString().slice(0, 10);
        const filename = `${filenamePrefix}_${dateStr}.${selectedFormat === 'xlsx' ? 'xls' : selectedFormat}`;

        if (window.WAExporters) {
          if (selectedFormat === 'csv') {
            window.WAExporters.exportToCSV(contacts, filename);
          } else if (selectedFormat === 'xlsx') {
            window.WAExporters.exportToExcel(contacts, filename);
          } else if (selectedFormat === 'vcf') {
            window.WAExporters.exportToVCard(contacts, filename);
          } else if (selectedFormat === 'json') {
            window.WAExporters.exportToJSON(contacts, filename);
          }
        }

        showToast(`🎉 Exported ${contacts.length} contacts (${selectedFormat.toUpperCase()})`);
        backdrop.classList.remove('wae-open');

      } catch (err) {
        showToast(`❌ ${err.message}`, 'error');
      } finally {
        exportBtn.disabled = false;
        exportBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
          Export Now
        `;
      }
    });
  }

  // Floating Action Button (FAB)
  function injectFAB() {
    if (document.getElementById('wae-fab-container')) return;

    const fab = document.createElement('div');
    fab.id = 'wae-fab-container';
    fab.className = 'wae-fab-container';
    fab.innerHTML = `
      <button class="wae-fab-btn" title="WhatsApp Contacts Exporter">
        <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
      </button>
    `;

    fab.querySelector('.wae-fab-btn').addEventListener('click', () => {
      createQuickModal();
      document.getElementById('wae-quick-modal')?.classList.add('wae-open');
    });

    document.body.appendChild(fab);
  }

  // Clean up any previously injected header buttons
  function removeHeaderButtons() {
    try {
      document.querySelectorAll('.wae-header-btn').forEach(el => el.remove());
    } catch (e) {}
  }

  window.addEventListener('load', () => {
    removeHeaderButtons();
    createQuickModal();
    injectFAB();
  });

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    removeHeaderButtons();
    createQuickModal();
    injectFAB();
  }

})();
