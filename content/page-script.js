/**
 * WhatsApp Web Multi-Engine Contact, Group & Label Extractor
 * Page-Context Script (MAIN world)
 */

(function () {
  'use strict';

  if (window.__WA_EXPORTER_INITIALIZED__) return;
  window.__WA_EXPORTER_INITIALIZED__ = true;

  const State = {
    contacts: new Map(),
    groups: new Map(),
    groupMembers: new Map(),
    labels: new Map(),
    labelAssociations: new Map(),
    findGroupMetaFn: null,
    chatCollection: null,
    groupMetadataCollection: null,
    ready: false
  };

  function normalizeJid(id) {
    if (!id) return '';
    if (typeof id === 'string') return id;
    if (id._serialized) return id._serialized;
    if (id.user && id.server) return `${id.user}@${id.server}`;
    return String(id);
  }

  function cleanPhone(raw) {
    if (!raw) return '';
    const digits = String(raw).replace(/[^0-9]/g, '');
    return digits;
  }

  function formatContact(item, groupName = '', groupRole = '') {
    if (!item) return null;
    const jid = normalizeJid(item.id || item.jid);
    if (!jid || jid.endsWith('@g.us') || jid.endsWith('@broadcast') || jid.endsWith('@newsletter')) {
      return null;
    }

    const rawPhone = item.phoneNumber || item.number || item.phone || (item.id && item.id.user ? item.id.user : jid.replace(/@.*$/, ''));
    const phone = cleanPhone(rawPhone);
    if (!phone || phone.length < 5) return null;

    const savedName = item.name || item.savedName || item.shortName || '';
    const pushName = item.pushname || item.notifyName || item.publicName || '';
    const formattedTitle = item.formattedTitle || item.formattedName || item.verifiedName || '';
    
    const isSaved = Boolean(
      item.isMyContact || 
      item.isAddressBookContact || 
      item.isContact || 
      (savedName && savedName !== phone && savedName !== `+${phone}`)
    );

    const displayName = savedName || pushName || formattedTitle || `+${phone}`;
    const isBusiness = Boolean(item.isBusiness || item.isEnterprise || item.verifiedName);
    const about = item.about || item.status || item.description || '';

    let labels = [];
    if (Array.isArray(item.labels)) {
      labels = item.labels.map(l => (typeof l === 'object' ? (l.name || l.id) : String(l))).filter(Boolean);
    }

    return {
      id: jid,
      jid: jid,
      phoneNumber: phone,
      formattedNumber: `+${phone}`,
      savedName: (savedName && savedName !== phone && savedName !== `+${phone}`) ? savedName : '',
      publicName: pushName,
      displayName: displayName,
      isSaved: isSaved,
      isBusiness: isBusiness,
      about: typeof about === 'string' ? about : '',
      groupName: groupName || '',
      groupRole: groupRole || 'Member',
      labels: labels
    };
  }

  /**
   * IndexedDB Storage Scanner
   */
  async function extractFromIndexedDB() {
    try {
      let dbNames = ['wawc', 'model-storage', 'wawc_db_enc', 'whatsapp_db'];
      if (indexedDB.databases) {
        const found = await indexedDB.databases();
        const names = found.map(d => d.name).filter(Boolean);
        if (names.length > 0) {
          dbNames = Array.from(new Set([...names, ...dbNames]));
        }
      }

      for (const dbName of dbNames) {
        try {
          await scanDatabase(dbName);
        } catch (e) {}
      }

      updateLabelCounts();
    } catch (err) {
      console.warn('[WA-Exporter] IndexedDB scan notice:', err);
    }
  }

  function scanDatabase(dbName) {
    return new Promise((resolve) => {
      const req = indexedDB.open(dbName);

      req.onerror = () => resolve(false);
      req.onsuccess = async (event) => {
        const db = event.target.result;
        const storeNames = Array.from(db.objectStoreNames);

        // Contacts
        const contactStores = storeNames.filter(s => s.toLowerCase().includes('contact'));
        for (const store of contactStores) {
          const rawContacts = await getAllStoreData(db, store);
          rawContacts.forEach(item => {
            const formatted = formatContact(item);
            if (formatted) State.contacts.set(formatted.phoneNumber, formatted);
          });
        }

        // Chats
        const chatStores = storeNames.filter(s => s.toLowerCase().includes('chat'));
        for (const store of chatStores) {
          const rawChats = await getAllStoreData(db, store);
          rawChats.forEach(chat => {
            const jid = normalizeJid(chat.id);
            if (jid.endsWith('@g.us')) {
              let pCount = 0;
              let participants = [];

              if (chat.groupMetadata && Array.isArray(chat.groupMetadata.participants)) {
                participants = chat.groupMetadata.participants;
                pCount = participants.length;
              } else if (Array.isArray(chat.participants)) {
                participants = chat.participants;
                pCount = participants.length;
              } else if (typeof chat.size === 'number') {
                pCount = chat.size;
              }

              const existing = State.groups.get(jid);
              const bestCount = Math.max(pCount, existing?.memberCount || 0);

              State.groups.set(jid, {
                id: jid,
                name: chat.name || chat.formattedTitle || existing?.name || 'WhatsApp Group',
                memberCount: bestCount,
                timestamp: chat.t || existing?.timestamp || 0
              });

              if (participants.length > 0) {
                processParticipants(jid, chat.name || 'Group', participants);
              }

            } else if (jid.endsWith('@c.us') || jid.endsWith('@s.whatsapp.net')) {
              const phone = cleanPhone(jid.replace(/@.*$/, ''));
              if (phone && !State.contacts.has(phone)) {
                const formatted = formatContact(chat);
                if (formatted) {
                  State.contacts.set(phone, formatted);
                } else {
                  State.contacts.set(phone, {
                    id: jid,
                    jid: jid,
                    phoneNumber: phone,
                    formattedNumber: `+${phone}`,
                    savedName: (chat.name && chat.name !== phone) ? chat.name : '',
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
            }

            if (Array.isArray(chat.labels)) {
              chat.labels.forEach(lblId => {
                const lId = String(typeof lblId === 'object' ? (lblId.id || lblId.name) : lblId);
                if (!State.labelAssociations.has(lId)) State.labelAssociations.set(lId, new Set());
                State.labelAssociations.get(lId).add(jid);
              });
            }
          });
        }

        // Group Metadata & Participants
        const groupMetaStores = storeNames.filter(s => s.toLowerCase().includes('group') || s.toLowerCase().includes('participant'));
        for (const store of groupMetaStores) {
          const rawMetas = await getAllStoreData(db, store);
          rawMetas.forEach(meta => {
            const groupJid = normalizeJid(meta.id);
            if (!groupJid.endsWith('@g.us')) return;

            let participants = [];
            if (Array.isArray(meta.participants)) {
              participants = meta.participants;
            } else if (Array.isArray(meta.members)) {
              participants = meta.members;
            }

            const pCount = participants.length || (typeof meta.size === 'number' ? meta.size : (typeof meta.count === 'number' ? meta.count : 0));
            const groupName = meta.subject || meta.name || State.groups.get(groupJid)?.name || 'WhatsApp Group';

            const existing = State.groups.get(groupJid);
            const bestCount = Math.max(pCount, existing?.memberCount || 0);

            State.groups.set(groupJid, {
              id: groupJid,
              name: groupName,
              memberCount: bestCount,
              timestamp: meta.creation || existing?.timestamp || 0
            });

            if (participants.length > 0) {
              processParticipants(groupJid, groupName, participants);
            }
          });
        }

        // Labels
        const labelStores = storeNames.filter(s => s.toLowerCase().includes('label'));
        for (const store of labelStores) {
          const raw = await getAllStoreData(db, store);
          raw.forEach(item => {
            if (item.name && item.id !== undefined) {
              const lId = String(item.id);
              if (!State.labels.has(lId)) {
                State.labels.set(lId, {
                  id: lId,
                  name: item.name,
                  color: item.hexColor || item.color || '#00a884',
                  count: item.count || 0,
                  itemIds: new Set()
                });
              }
            }
            if (item.labelId !== undefined || item.labeledId !== undefined || item.associationId !== undefined) {
              const lId = String(item.labelId || item.parentId || item.id?.split('_')?.[0]);
              const targetId = normalizeJid(item.labeledId || item.itemId || item.chatId || item.contactId || item.id?.split('_')?.[1]);
              if (lId && targetId) {
                if (!State.labelAssociations.has(lId)) State.labelAssociations.set(lId, new Set());
                State.labelAssociations.get(lId).add(targetId);
              }
            }
          });
        }

        db.close();
        resolve(true);
      };
    });
  }

  function processParticipants(groupJid, groupName, participants) {
    const memberList = [];

    participants.forEach(p => {
      const pJid = normalizeJid(typeof p === 'string' ? p : (p?.id || p?.jid));
      const phone = cleanPhone(pJid.replace(/@.*$/, ''));
      if (!phone) return;

      const role = (p && p.isSuperAdmin) ? 'Super Admin' : ((p && p.isAdmin) ? 'Admin' : 'Member');
      const existing = State.contacts.get(phone);

      if (existing) {
        memberList.push({
          ...existing,
          groupName: groupName,
          groupRole: role
        });
      } else {
        const m = {
          id: pJid,
          jid: pJid,
          phoneNumber: phone,
          formattedNumber: `+${phone}`,
          savedName: (p && p.name && p.name !== phone) ? p.name : '',
          publicName: (p && p.pushname) ? p.pushname : '',
          displayName: (p && (p.name || p.pushname)) || `+${phone}`,
          isSaved: Boolean(p && p.name && p.name !== phone && !p.name.startsWith('+')),
          isBusiness: false,
          about: '',
          groupName: groupName,
          groupRole: role,
          labels: []
        };
        memberList.push(m);
        State.contacts.set(phone, m);
      }
    });

    if (memberList.length > 0) {
      State.groupMembers.set(groupJid, memberList);
      if (State.groups.has(groupJid)) {
        const g = State.groups.get(groupJid);
        g.memberCount = Math.max(g.memberCount || 0, memberList.length);
      }
    }
  }

  function updateLabelCounts() {
    State.labels.forEach(label => {
      const assocSet = State.labelAssociations.get(label.id) || new Set();
      State.contacts.forEach(c => {
        if (c.labels && (c.labels.includes(label.name) || c.labels.includes(label.id))) {
          assocSet.add(c.id || c.phoneNumber);
        }
      });
      label.count = Math.max(label.count || 0, assocSet.size);
    });
  }

  function getAllStoreData(db, storeName) {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch (e) {
        resolve([]);
      }
    });
  }

  /**
   * Webpack Live Store Inspection & Proactive Group Loader
   */
  function initWebpack() {
    if (!window.webpackChunkwhatsapp_web_client) return;

    try {
      let modules = {};
      window.webpackChunkwhatsapp_web_client.push([
        [Math.random()],
        {},
        (require) => {
          modules = require.c || {};
        }
      ]);

      for (const key in modules) {
        const mod = modules[key]?.exports;
        if (!mod) continue;

        if (!State.chatCollection && (mod.ChatCollection || mod.default?.ChatCollection)) {
          State.chatCollection = mod.ChatCollection || mod.default?.ChatCollection;
        }

        if (!State.groupMetadataCollection && (mod.GroupMetadataCollection || mod.default?.GroupMetadataCollection)) {
          State.groupMetadataCollection = mod.GroupMetadataCollection || mod.default?.GroupMetadataCollection;
        }

        if (!State.findGroupMetaFn) {
          if (typeof mod.findGroupMetadata === 'function') State.findGroupMetaFn = mod.findGroupMetadata;
          else if (typeof mod.default?.findGroupMetadata === 'function') State.findGroupMetaFn = mod.default.findGroupMetadata;
          else if (typeof mod.queryGroupMetadata === 'function') State.findGroupMetaFn = mod.queryGroupMetadata;
          else if (typeof mod.default?.queryGroupMetadata === 'function') State.findGroupMetaFn = mod.default.queryGroupMetadata;
        }

        // Group Metadata Collection models
        const groupCol = mod.GroupMetadataCollection || mod.default?.GroupMetadataCollection || (mod.GroupMetadata && mod.GroupMetadata.models ? mod.GroupMetadata : null);
        if (groupCol) {
          const list = groupCol._models || groupCol.models || (typeof groupCol.toArray === 'function' ? groupCol.toArray() : []);
          list.forEach(gMeta => {
            const gJid = normalizeJid(gMeta.id);
            if (gJid.endsWith('@g.us')) {
              const participants = gMeta.participants ? (gMeta.participants._models || gMeta.participants.models || gMeta.participants) : [];
              const groupName = gMeta.subject || State.groups.get(gJid)?.name || 'WhatsApp Group';
              if (participants && participants.length > 0) {
                processParticipants(gJid, groupName, participants);
              }
            }
          });
        }
      }
    } catch (err) {
      console.warn('[WA-Exporter] Webpack inspection notice:', err);
    }
  }

  /**
   * Resolve any pending/unloaded groups
   */
  async function resolvePendingGroups() {
    initWebpack();

    for (const [jid, group] of State.groups.entries()) {
      if (!group.memberCount || group.memberCount === 0 || !State.groupMembers.has(jid)) {
        try {
          // 1. Try Chat model
          if (State.chatCollection && typeof State.chatCollection.get === 'function') {
            const chat = State.chatCollection.get(jid);
            if (chat && chat.groupMetadata) {
              if (typeof chat.groupMetadata.load === 'function' && (!chat.groupMetadata.participants || chat.groupMetadata.participants.length === 0)) {
                await chat.groupMetadata.load().catch(() => {});
              }
              const participants = chat.groupMetadata.participants ? (chat.groupMetadata.participants._models || chat.groupMetadata.participants.models || chat.groupMetadata.participants) : [];
              if (participants && participants.length > 0) {
                processParticipants(jid, group.name, participants);
                continue;
              }
            }
          }

          // 2. Try findGroupMetadata function
          if (typeof State.findGroupMetaFn === 'function') {
            const meta = await State.findGroupMetaFn(jid).catch(() => null);
            if (meta && meta.participants) {
              const participants = meta.participants._models || meta.participants.models || meta.participants;
              if (participants && participants.length > 0) {
                processParticipants(jid, group.name, participants);
                continue;
              }
            }
          }

          // 3. Try GroupMetadataCollection
          if (State.groupMetadataCollection && typeof State.groupMetadataCollection.find === 'function') {
            const meta = await State.groupMetadataCollection.find(jid).catch(() => null);
            if (meta && meta.participants) {
              const participants = meta.participants._models || meta.participants.models || meta.participants;
              if (participants && participants.length > 0) {
                processParticipants(jid, group.name, participants);
                continue;
              }
            }
          }
        } catch (e) {}
      }
    }
  }

  /**
   * Synchronize all data
   */
  async function syncAllData() {
    await extractFromIndexedDB();
    initWebpack();
    updateLabelCounts();
    State.ready = State.contacts.size > 0 || State.groups.size > 0;
    return true;
  }

  /**
   * Get Active Chat Info
   */
  function getActiveChat() {
    try {
      const header = document.querySelector('header');
      if (header) {
        const titleEl = header.querySelector('[data-testid="conversation-info-header"] span[dir="auto"], span[title][dir="auto"]');
        const subtitleEl = header.querySelector('[data-testid="conversation-info-header-chat-subtitle"]');
        const headerTitle = titleEl ? (titleEl.getAttribute('title') || titleEl.textContent.trim()) : '';

        const isGroup = Boolean(
          subtitleEl ||
          header.textContent.includes('click here for group info') ||
          header.textContent.includes('group members') ||
          (headerTitle && Array.from(State.groups.values()).some(g => g.name === headerTitle))
        );

        if (headerTitle) {
          const matchedGroup = Array.from(State.groups.values()).find(g => g.name === headerTitle);
          return {
            id: matchedGroup ? matchedGroup.id : 'active@g.us',
            name: headerTitle,
            isGroup: isGroup,
            memberCount: matchedGroup ? matchedGroup.memberCount : 0
          };
        }
      }
    } catch (e) {}
    return null;
  }

  /**
   * Get Group Members for a specific group only
   */
  async function getGroupMembers(groupJid) {
    await syncAllData();

    if (!groupJid) {
      const active = getActiveChat();
      if (active && active.isGroup) {
        groupJid = active.id;
      }
    }

    if (!groupJid) {
      return [];
    }

    const cleanGroupJid = normalizeJid(groupJid);

    // Try resolving pending metadata if not cached yet
    if (!State.groupMembers.has(cleanGroupJid) || State.groupMembers.get(cleanGroupJid).length === 0) {
      await resolvePendingGroups();
    }

    if (State.groupMembers.has(cleanGroupJid)) {
      const members = State.groupMembers.get(cleanGroupJid);
      if (members.length > 0) return members;
    }

    // Try matching by raw user id or partial JID
    const userPart = cleanGroupJid.replace(/@.*$/, '');
    for (const [jid, list] of State.groupMembers.entries()) {
      if (jid === cleanGroupJid || jid.includes(userPart)) {
        return list;
      }
    }

    // Strictly return empty array if this group has no resolved participants yet
    return [];
  }

  // Handle messages from Content Script
  window.addEventListener('message', async (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.target !== 'WA_EXPORTER_PAGE') return;

    const { action, requestId, payload } = data;

    try {
      await syncAllData();
      let responseData = null;

      switch (action) {
        case 'PING':
          responseData = { ready: true, count: State.contacts.size, groups: State.groups.size };
          break;

        case 'GET_ALL_CONTACTS':
          responseData = Array.from(State.contacts.values());
          break;

        case 'GET_GROUPS':
          // Run background resolution for any 0 member count groups
          resolvePendingGroups().catch(() => {});
          responseData = Array.from(State.groups.values());
          break;

        case 'GET_GROUP_MEMBERS':
          responseData = await getGroupMembers(payload?.groupJid);
          break;

        case 'GET_ACTIVE_CHAT':
          responseData = getActiveChat();
          break;

        case 'GET_LABELS':
          responseData = Array.from(State.labels.values());
          break;

        default:
          throw new Error(`Unknown action: ${action}`);
      }

      window.postMessage({
        target: 'WA_EXPORTER_CONTENT',
        requestId: requestId,
        success: true,
        data: responseData
      }, '*');

    } catch (err) {
      console.error('[WA-Exporter Page Error]', err);
      window.postMessage({
        target: 'WA_EXPORTER_CONTENT',
        requestId: requestId,
        success: false,
        error: err.message || 'Operation failed'
      }, '*');
    }
  });

  syncAllData().then(() => {
    resolvePendingGroups().catch(() => {});
  });

})();
