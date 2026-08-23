/**
 * WhatsApp Web Exporter - Ultra-Lightweight Content Script
 * Completely idle at runtime with 0.00% background CPU/RAM overhead.
 * Strictly executes on-demand when you open the popup or click export.
 */

(function () {
  'use strict';

  function normalizeJid(id) {
    if (!id) return '';
    if (typeof id === 'string') return id;
    if (id._serialized) return id._serialized;
    if (id.user && id.server) return `${id.user}@${id.server}`;
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

  // Fast single-pass database read (only runs when popup requests data)
  async function extractData(action, payload) {
    let dbNames = ['wawc', 'model-storage'];
    if (indexedDB.databases) {
      try {
        const dbs = await indexedDB.databases();
        const names = dbs.map(d => d.name).filter(Boolean);
        if (names.length > 0) dbNames = Array.from(new Set([...names, ...dbNames]));
      } catch (e) {}
    }

    const contactsMap = new Map();
    const groupsMap = new Map();
    const groupMembersMap = new Map();
    const labelsMap = new Map();
    const labelAssociations = new Map();

    for (const dbName of dbNames) {
      await new Promise((resolve) => {
        const req = indexedDB.open(dbName);
        req.onerror = () => resolve(false);
        req.onsuccess = async (ev) => {
          const db = ev.target.result;
          const storeNames = Array.from(db.objectStoreNames);

          // 1. Contacts store
          const cStore = storeNames.find(s => s.toLowerCase().includes('contact'));
          if (cStore) {
            try {
              const items = await readStoreAll(db, cStore);
              items.forEach(item => {
                const formatted = formatContact(item);
                if (formatted) contactsMap.set(formatted.phoneNumber, formatted);
              });
            } catch (e) {}
          }

          // 2. Chats store
          const chStore = storeNames.find(s => s.toLowerCase().includes('chat'));
          if (chStore) {
            try {
              const chats = await readStoreAll(db, chStore);
              chats.forEach(chat => {
                const jid = normalizeJid(chat.id);
                if (jid.endsWith('@g.us')) {
                  const pCount = (chat.groupMetadata && Array.isArray(chat.groupMetadata.participants))
                    ? chat.groupMetadata.participants.length
                    : (Array.isArray(chat.participants) ? chat.participants.length : 0);

                  if (!groupsMap.has(jid) || groupsMap.get(jid).memberCount === 0) {
                    groupsMap.set(jid, {
                      id: jid,
                      name: chat.name || chat.formattedTitle || 'WhatsApp Group',
                      memberCount: pCount,
                      timestamp: chat.t || 0
                    });
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

          // 3. Group metadata store
          const gmStore = storeNames.find(s => s.toLowerCase().includes('group') || s.toLowerCase().includes('participant'));
          if (gmStore) {
            try {
              const metas = await readStoreAll(db, gmStore);
              metas.forEach(meta => {
                const groupJid = normalizeJid(meta.id);
                if (!groupJid.endsWith('@g.us')) return;

                const groupName = meta.subject || meta.name || groupsMap.get(groupJid)?.name || 'WhatsApp Group';
                const participants = meta.participants || meta.members || [];
                const members = [];

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

                groupMembersMap.set(groupJid, members);
                groupsMap.set(groupJid, {
                  id: groupJid,
                  name: groupName,
                  memberCount: members.length || participants.length,
                  timestamp: meta.creation || 0
                });
              });
            } catch (e) {}
          }

          // 4. Labels store
          const lStore = storeNames.find(s => s.toLowerCase().includes('label'));
          if (lStore) {
            try {
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
                if (item.labelId !== undefined || item.labeledId !== undefined || item.associationId !== undefined) {
                  const lId = String(item.labelId || item.parentId || item.id?.split('_')?.[0]);
                  const targetId = normalizeJid(item.labeledId || item.itemId || item.chatId || item.contactId || item.id?.split('_')?.[1]);
                  if (lId && targetId) {
                    if (!labelAssociations.has(lId)) labelAssociations.set(lId, new Set());
                    labelAssociations.get(lId).add(targetId);
                  }
                }
              });
            } catch (e) {}
          }

          db.close();
          resolve(true);
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
      const targetJid = normalizeJid(payload?.groupJid);
      if (!targetJid) return [];
      if (groupMembersMap.has(targetJid)) return groupMembersMap.get(targetJid);
      const userPart = targetJid.replace(/@.*$/, '');
      for (const [jid, list] of groupMembersMap.entries()) {
        if (jid === targetJid || jid.includes(userPart)) return list;
      }
      return [];
    }
    if (action === 'GET_LABELS') return Array.from(labelsMap.values());

    return [];
  }

  function readStoreAll(db, storeName) {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch (e) {
        resolve([]);
      }
    });
  }

  // Handle on-demand RPC queries from extension popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.action) return;

    (async () => {
      try {
        if (message.action === 'PING') {
          return sendResponse({ success: true, data: { ready: true } });
        }
        const data = await extractData(message.action, message.payload);
        sendResponse({ success: true, data: data || [] });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();

    return true;
  });

})();
