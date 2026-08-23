/**
 * WhatsApp Web Exporter - Ultra-Lightweight Content Script (v2.1.2)
 * High-speed, non-blocking IndexedDB reader with strict timeout guards and in-memory cache.
 */

(function () {
  'use strict';

  // In-memory cache to make repeated calls instantaneous
  let cachedData = null;
  let cacheTime = 0;
  const CACHE_TTL = 30000; // 30 seconds

  function normalizeJid(id) {
    if (!id) return '';
    if (typeof id === 'string') return id;
    if (id._serialized) return id._serialized;
    if (id.user && id.server) return `${id.user}@${id.server}`;
    if (typeof id === 'object') {
      if (id.id) return normalizeJid(id.id);
    }
    return String(id);
  }

  function cleanPhone(raw) {
    if (!raw) return '';
    return String(raw).replace(/[^0-9]/g, '');
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

  function readStoreAll(db, storeName) {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
        tx.onerror = () => resolve([]);
        tx.onabort = () => resolve([]);
      } catch (e) {
        resolve([]);
      }
    });
  }

  // Safe database inspection with strict 400ms timeout per DB
  function inspectDatabase(dbName) {
    return new Promise((resolve) => {
      let isDone = false;
      const finish = (result) => {
        if (!isDone) {
          isDone = true;
          resolve(result);
        }
      };

      const timer = setTimeout(() => finish(null), 400);

      try {
        const req = indexedDB.open(dbName);

        req.onblocked = () => {
          clearTimeout(timer);
          finish(null);
        };

        req.onupgradeneeded = (e) => {
          // If database doesn't exist, don't create it
          try {
            if (e.target && e.target.transaction) e.target.transaction.abort();
          } catch (err) {}
          clearTimeout(timer);
          finish(null);
        };

        req.onerror = () => {
          clearTimeout(timer);
          finish(null);
        };

        req.onsuccess = (ev) => {
          clearTimeout(timer);
          finish(ev.target.result);
        };
      } catch (e) {
        clearTimeout(timer);
        finish(null);
      }
    });
  }

  // Comprehensive on-demand database reader
  async function extractData(action, payload) {
    // Return from cache if fresh
    if (cachedData && (Date.now() - cacheTime < CACHE_TTL)) {
      if (action === 'GET_INITIAL_DATA') {
        return {
          contacts: Array.from(cachedData.contactsMap.values()),
          groups: Array.from(cachedData.groupsMap.values()),
          labels: Array.from(cachedData.labelsMap.values())
        };
      }
      if (action === 'GET_ALL_CONTACTS') return Array.from(cachedData.contactsMap.values());
      if (action === 'GET_GROUPS') return Array.from(cachedData.groupsMap.values());
      if (action === 'GET_GROUP_MEMBERS') {
        const targetJid = normalizeJid(payload?.groupJid);
        if (!targetJid) return [];
        return cachedData.groupMembersMap.get(targetJid) || [];
      }
      if (action === 'GET_LABELS') return Array.from(cachedData.labelsMap.values());
    }

    let dbNames = ['wawc', 'model-storage'];
    if (indexedDB.databases) {
      try {
        const dbs = await indexedDB.databases();
        const existingNames = dbs.map(d => d.name).filter(Boolean);
        if (existingNames.length > 0) {
          dbNames = existingNames.filter(name => 
            name === 'wawc' || 
            name.includes('model') || 
            name.includes('storage') || 
            name.includes('wawc')
          );
        }
      } catch (e) {}
    }

    const contactsMap = new Map();
    const groupsMap = new Map();
    const groupMembersMap = new Map();
    const labelsMap = new Map();
    const labelAssociations = new Map();

    for (const dbName of dbNames) {
      const db = await inspectDatabase(dbName);
      if (!db) continue;

      try {
        const storeNames = Array.from(db.objectStoreNames);

        // 1. Contacts Store
        const contactStores = storeNames.filter(s => s.toLowerCase().includes('contact'));
        for (const cStore of contactStores) {
          const items = await readStoreAll(db, cStore);
          items.forEach(item => {
            const formatted = formatContact(item);
            if (formatted) {
              if (!contactsMap.has(formatted.phoneNumber) || (formatted.savedName && !contactsMap.get(formatted.phoneNumber).savedName)) {
                contactsMap.set(formatted.phoneNumber, formatted);
              }
            }
          });
        }

        // 2. Chats Store
        const chatStores = storeNames.filter(s => s.toLowerCase().includes('chat'));
        for (const chStore of chatStores) {
          const chats = await readStoreAll(db, chStore);
          chats.forEach(chat => {
            const jid = normalizeJid(chat.id);
            if (!jid) return;

            if (jid.endsWith('@g.us')) {
              const pCount = (chat.groupMetadata && Array.isArray(chat.groupMetadata.participants))
                ? chat.groupMetadata.participants.length
                : (Array.isArray(chat.participants)
                  ? chat.participants.length
                  : (chat.groupMetadata?.size || chat.size || chat.participantCount || 0));

              const groupName = chat.name || chat.formattedTitle || chat.subject || 'WhatsApp Group';

              if (!groupsMap.has(jid)) {
                groupsMap.set(jid, {
                  id: jid,
                  name: groupName,
                  memberCount: pCount,
                  timestamp: chat.t || 0
                });
              } else {
                const existing = groupsMap.get(jid);
                if (pCount > existing.memberCount) existing.memberCount = pCount;
                if (groupName && groupName !== 'WhatsApp Group') existing.name = groupName;
              }

              // Extract participants if directly stored in chat
              const rawParticipants = chat.groupMetadata?.participants || chat.participants;
              if (Array.isArray(rawParticipants) && rawParticipants.length > 0) {
                const members = [];
                rawParticipants.forEach(p => {
                  const pJid = normalizeJid(typeof p === 'string' ? p : (p?.id || p?.jid));
                  const phone = cleanPhone(pJid.replace(/@.*$/, ''));
                  if (!phone) return;
                  const role = (p && p.isSuperAdmin) ? 'Super Admin' : ((p && p.isAdmin) ? 'Admin' : 'Member');
                  const m = formatContact(p, groupName, role) || {
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
                    groupName,
                    groupRole: role,
                    labels: []
                  };
                  members.push(m);
                });
                if (members.length > 0) {
                  groupMembersMap.set(jid, members);
                  if (groupsMap.has(jid)) groupsMap.get(jid).memberCount = Math.max(groupsMap.get(jid).memberCount, members.length);
                }
              }

            } else if (jid.endsWith('@c.us') || jid.endsWith('@s.whatsapp.net')) {
              const phone = cleanPhone(jid.replace(/@.*$/, ''));
              if (phone && !contactsMap.has(phone)) {
                const formatted = formatContact(chat);
                if (formatted) {
                  contactsMap.set(phone, formatted);
                } else {
                  contactsMap.set(phone, {
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

            // Labels on chat
            if (Array.isArray(chat.labels)) {
              chat.labels.forEach(lblId => {
                const lId = String(typeof lblId === 'object' ? (lblId.id || lblId.name) : lblId);
                if (!labelAssociations.has(lId)) labelAssociations.set(lId, new Set());
                labelAssociations.get(lId).add(jid);
              });
            }
          });
        }

        // 3. Group metadata & participant stores
        const metaStores = storeNames.filter(s => s.toLowerCase().includes('group') || s.toLowerCase().includes('participant'));
        for (const gmStore of metaStores) {
          const metas = await readStoreAll(db, gmStore);
          metas.forEach(meta => {
            const groupJid = normalizeJid(meta.id || meta.jid || meta.groupJid);
            if (!groupJid || !groupJid.endsWith('@g.us')) return;

            const groupName = meta.subject || meta.name || groupsMap.get(groupJid)?.name || 'WhatsApp Group';
            const participants = meta.participants || meta.members || meta.participantList || [];
            const members = [];

            if (Array.isArray(participants)) {
              participants.forEach(p => {
                const pJid = normalizeJid(typeof p === 'string' ? p : (p?.id || p?.jid));
                const phone = cleanPhone(pJid.replace(/@.*$/, ''));
                if (!phone) return;

                const role = (p && p.isSuperAdmin) ? 'Super Admin' : ((p && p.isAdmin) ? 'Admin' : 'Member');
                const existing = contactsMap.get(phone);

                if (existing) {
                  members.push({ ...existing, groupName, groupRole: role });
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
                    groupName,
                    groupRole: role,
                    labels: []
                  };
                  members.push(m);
                  contactsMap.set(phone, m);
                }
              });
            }

            const totalCount = members.length || (Array.isArray(participants) ? participants.length : (meta.size || meta.participantCount || 0));

            if (members.length > 0) {
              groupMembersMap.set(groupJid, members);
            }

            if (!groupsMap.has(groupJid)) {
              groupsMap.set(groupJid, {
                id: groupJid,
                name: groupName,
                memberCount: totalCount,
                timestamp: meta.creation || 0
              });
            } else {
              const g = groupsMap.get(groupJid);
              if (totalCount > g.memberCount) g.memberCount = totalCount;
              if (groupName && groupName !== 'WhatsApp Group') g.name = groupName;
            }
          });
        }

        // 4. Labels Store
        const labelStores = storeNames.filter(s => s.toLowerCase().includes('label'));
        for (const lStore of labelStores) {
          const items = await readStoreAll(db, lStore);
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
            if (item.labelId !== undefined || item.labeledId !== undefined || item.associationId !== undefined || item.itemId !== undefined) {
              const lId = String(item.labelId || item.parentId || item.id?.split('_')?.[0]);
              const targetId = normalizeJid(item.labeledId || item.itemId || item.chatId || item.contactId || item.id?.split('_')?.[1]);
              if (lId && targetId) {
                if (!labelAssociations.has(lId)) labelAssociations.set(lId, new Set());
                labelAssociations.get(lId).add(targetId);
              }
            }
          });
        }

      } catch (e) {
        console.warn('[WA Exporter DB Read Error]', e);
      } finally {
        try {
          db.close();
        } catch (e) {}
      }
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

    // Save to in-memory cache
    cachedData = {
      contactsMap,
      groupsMap,
      groupMembersMap,
      labelsMap
    };
    cacheTime = Date.now();

    if (action === 'GET_INITIAL_DATA') {
      return {
        contacts: Array.from(contactsMap.values()),
        groups: Array.from(groupsMap.values()),
        labels: Array.from(labelsMap.values())
      };
    }

    if (action === 'GET_ALL_CONTACTS') return Array.from(contactsMap.values());
    if (action === 'GET_GROUPS') return Array.from(groupsMap.values());
    if (action === 'GET_GROUP_MEMBERS') {
      const targetJid = normalizeJid(payload?.groupJid);
      if (!targetJid) return [];
      return groupMembersMap.get(targetJid) || [];
    }
    if (action === 'GET_LABELS') return Array.from(labelsMap.values());

    return [];
  }

  // Handle on-demand RPC queries from extension popup with 2.5s top-level timeout
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.action) return;

    (async () => {
      let isAnswered = false;
      const timeout = setTimeout(() => {
        if (!isAnswered) {
          isAnswered = true;
          sendResponse({ success: true, data: { contacts: [], groups: [], labels: [] } });
        }
      }, 2500);

      try {
        if (message.action === 'PING') {
          clearTimeout(timeout);
          isAnswered = true;
          return sendResponse({ success: true, data: { ready: true } });
        }

        const data = await extractData(message.action, message.payload);
        clearTimeout(timeout);
        if (!isAnswered) {
          isAnswered = true;
          sendResponse({ success: true, data: data || [] });
        }
      } catch (err) {
        clearTimeout(timeout);
        if (!isAnswered) {
          isAnswered = true;
          sendResponse({ success: false, error: err.message });
        }
      }
    })();

    return true;
  });

})();
