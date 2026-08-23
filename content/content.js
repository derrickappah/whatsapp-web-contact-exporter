/**
 * WhatsApp Web Exporter - Content Script (v2.1.8)
 * Comprehensive Multi-Schema Extractor for Labels, Contacts & Groups
 */

(function () {
  'use strict';

  function normalizeJid(id) {
    if (!id) return '';
    if (typeof id === 'string') return id;
    if (id._serialized) return id._serialized;
    if (id.user && id.server) return `${id.user}@${id.server}`;
    if (typeof id === 'object') {
      if (id.id) return normalizeJid(id.id);
      if (id.user) return `${id.user}@${id.server || 'c.us'}`;
      if (id._serialized) return id._serialized;
    }
    return String(id);
  }

  function cleanPhone(raw) {
    if (!raw) return '';
    return String(raw).replace(/[^0-9]/g, '');
  }

  function formatContact(item, groupName = '', groupRole = '') {
    if (!item) return null;
    const jid = normalizeJid(item.id || item.jid || item.user);
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
    const rawLabels = item.labels || item.labelIds || item.labelList || (item.label !== undefined ? [item.label] : []);
    if (Array.isArray(rawLabels)) {
      labels = rawLabels.map(l => (typeof l === 'object' ? (l.name || l.id) : String(l))).filter(Boolean);
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
      } catch (e) {
        resolve([]);
      }
    });
  }

  function queryPageContext(timeoutMs = 400) {
    return new Promise((resolve) => {
      const requestId = 'req_' + Math.random().toString(36).substring(2);
      let resolved = false;

      const handler = (event) => {
        if (event.source !== window || !event.data || event.data.type !== 'WA_EXPORTER_PAGE_RESPONSE') return;
        if (event.data.requestId === requestId) {
          resolved = true;
          window.removeEventListener('message', handler);
          resolve(event.data.data);
        }
      };

      window.addEventListener('message', handler);
      window.postMessage({ type: 'WA_EXPORTER_PAGE_QUERY', requestId }, '*');

      setTimeout(() => {
        if (!resolved) {
          window.removeEventListener('message', handler);
          resolve(null);
        }
      }, timeoutMs);
    });
  }

  // Fast on-demand database reader across all relevant stores & live page context
  async function extractData(action, payload) {
    const contactsMap = new Map();
    const groupsMap = new Map();
    const groupMembersMap = new Map();
    const labelsMap = new Map();
    const labelAssociations = new Map();

    // 1. Query live page context (window.Store / MAIN world) for instant live labels
    try {
      const livePageData = await queryPageContext(350);
      if (livePageData) {
        if (Array.isArray(livePageData.labels)) {
          livePageData.labels.forEach(l => {
            if (l && l.id) {
              labelsMap.set(String(l.id), {
                id: String(l.id),
                name: l.name || `Label ${l.id}`,
                color: l.color || '#00a884',
                count: l.count || 0
              });
            }
          });
        }
        if (livePageData.labelAssociations && typeof livePageData.labelAssociations === 'object') {
          for (const [k, arr] of Object.entries(livePageData.labelAssociations)) {
            if (!labelAssociations.has(k)) labelAssociations.set(k, new Set());
            if (Array.isArray(arr)) {
              arr.forEach(jid => labelAssociations.get(k).add(jid));
            }
          }
        }
      }
    } catch (e) {}

    let dbNames = ['wawc', 'model-storage'];
    if (indexedDB.databases) {
      try {
        const dbs = await indexedDB.databases();
        const foundNames = dbs.map(d => d.name).filter(Boolean);
        if (foundNames.length > 0) {
          const matched = foundNames.filter(name => 
            name === 'wawc' || 
            name === 'model-storage' || 
            name.startsWith('wawc_') || 
            name.includes('storage')
          );
          if (matched.length > 0) dbNames = Array.from(new Set([...matched, ...dbNames]));
        }
      } catch (e) {}
    }

    for (const dbName of dbNames) {
      await new Promise((resolve) => {
        try {
          const req = indexedDB.open(dbName);
          req.onerror = () => resolve(false);
          req.onblocked = () => resolve(false);

          req.onsuccess = async (ev) => {
            const db = ev.target.result;
            const storeNames = Array.from(db.objectStoreNames);

            // 1. Contacts Stores
            const contactStores = storeNames.filter(s => s.toLowerCase().includes('contact'));
            for (const cStore of contactStores) {
              try {
                const items = await readStoreAll(db, cStore);
                items.forEach(item => {
                  const formatted = formatContact(item);
                  if (formatted) {
                    if (!contactsMap.has(formatted.phoneNumber)) {
                      contactsMap.set(formatted.phoneNumber, formatted);
                    } else {
                      const existing = contactsMap.get(formatted.phoneNumber);
                      if (formatted.savedName && !existing.savedName) existing.savedName = formatted.savedName;
                      if (formatted.displayName && formatted.displayName !== existing.phoneNumber) existing.displayName = formatted.displayName;
                      if (Array.isArray(formatted.labels) && formatted.labels.length > 0) {
                        existing.labels = Array.from(new Set([...existing.labels, ...formatted.labels]));
                      }
                    }
                  }
                });
              } catch (e) {}
            }

            // 2. Chats Stores
            const chatStores = storeNames.filter(s => s.toLowerCase().includes('chat'));
            for (const chStore of chatStores) {
              try {
                const chats = await readStoreAll(db, chStore);
                chats.forEach(chat => {
                  const jid = normalizeJid(chat.id || chat.jid);
                  if (!jid) return;

                  const rawChatLabels = chat.labels || chat.labelIds || chat.labelList || (chat.label !== undefined ? [chat.label] : []);
                  const chatLabels = Array.isArray(rawChatLabels) ? rawChatLabels.map(l => (typeof l === 'object' ? (l.name || l.id) : String(l))).filter(Boolean) : [];

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
                        timestamp: chat.t || 0,
                        labels: chatLabels
                      });
                    } else {
                      const g = groupsMap.get(jid);
                      if (pCount > g.memberCount) g.memberCount = pCount;
                      if (groupName && groupName !== 'WhatsApp Group') g.name = groupName;
                      if (chatLabels.length > 0) g.labels = Array.from(new Set([...(g.labels || []), ...chatLabels]));
                    }

                    // Extract inlined participants if present in chat
                    const rawParticipants = chat.groupMetadata?.participants || chat.participants;
                    if (Array.isArray(rawParticipants) && rawParticipants.length > 0) {
                      const members = [];
                      rawParticipants.forEach(p => {
                        const pJid = normalizeJid(typeof p === 'string' ? p : (p?.id || p?.jid || p?.user));
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
                    if (phone) {
                      if (!contactsMap.has(phone)) {
                        const formatted = formatContact(chat);
                        if (formatted) {
                          if (chatLabels.length > 0) formatted.labels = Array.from(new Set([...formatted.labels, ...chatLabels]));
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
                            labels: chatLabels
                          });
                        }
                      } else {
                        const existing = contactsMap.get(phone);
                        if (chat.name && !existing.savedName && chat.name !== phone && !chat.name.startsWith('+')) {
                          existing.savedName = chat.name;
                          existing.displayName = chat.name;
                          existing.isSaved = true;
                        }
                        if (chatLabels.length > 0) {
                          existing.labels = Array.from(new Set([...(existing.labels || []), ...chatLabels]));
                        }
                      }
                    }
                  }

                  // Record label associations from chat
                  if (chatLabels.length > 0) {
                    chatLabels.forEach(lbl => {
                      const lId = String(lbl);
                      if (!labelAssociations.has(lId)) labelAssociations.set(lId, new Set());
                      labelAssociations.get(lId).add(jid);
                      const phone = cleanPhone(jid.replace(/@.*$/, ''));
                      if (phone) labelAssociations.get(lId).add(phone);
                    });
                  }
                });
              } catch (e) {}
            }

            // 3. Group Metadata & Participant Stores
            const gmStores = storeNames.filter(s => 
              s.toLowerCase().includes('group') || 
              s.toLowerCase().includes('participant') ||
              s.toLowerCase().includes('member')
            );

            for (const gmStore of gmStores) {
              try {
                const metas = await readStoreAll(db, gmStore);
                metas.forEach(meta => {
                  if (!meta) return;
                  const rawId = meta.id || meta.jid || meta.groupJid || meta.groupId || meta.chatId || (meta.key && typeof meta.key === 'string' ? meta.key : '');
                  let groupJid = normalizeJid(rawId);
                  
                  if (!groupJid || !groupJid.endsWith('@g.us')) {
                    if (meta.user && meta.server === 'g.us') groupJid = `${meta.user}@g.us`;
                  }
                  if (!groupJid || !groupJid.endsWith('@g.us')) return;

                  const groupName = meta.subject || meta.name || meta.title || groupsMap.get(groupJid)?.name || 'WhatsApp Group';
                  const rawParticipants = meta.participants || meta.members || meta.participantList || [];
                  const members = [];

                  if (Array.isArray(rawParticipants)) {
                    rawParticipants.forEach(p => {
                      const pJid = normalizeJid(typeof p === 'string' ? p : (p?.id || p?.jid || p?.user));
                      const phone = cleanPhone(pJid.replace(/@.*$/, ''));
                      if (!phone) return;

                      const role = (p && (p.isSuperAdmin || p.role === 'superadmin' || p.role === 'creator')) 
                        ? 'Super Admin' 
                        : ((p && (p.isAdmin || p.role === 'admin')) ? 'Admin' : 'Member');
                        
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

                  const memberTotal = members.length || (Array.isArray(rawParticipants) ? rawParticipants.length : (meta.size || meta.participantCount || meta.memberCount || 0));

                  if (members.length > 0) {
                    groupMembersMap.set(groupJid, members);
                  }

                  if (!groupsMap.has(groupJid)) {
                    groupsMap.set(groupJid, {
                      id: groupJid,
                      name: groupName,
                      memberCount: memberTotal,
                      timestamp: meta.creation || 0,
                      labels: []
                    });
                  } else {
                    const g = groupsMap.get(groupJid);
                    if (memberTotal > g.memberCount) g.memberCount = memberTotal;
                    if (groupName && groupName !== 'WhatsApp Group') g.name = groupName;
                  }
                });
              } catch (e) {}
            }

            // 4. Labels Stores (label, label-item, label-association, labeled-jid, etc.)
            const labelStores = storeNames.filter(s => s.toLowerCase().includes('label'));
            for (const lStore of labelStores) {
              try {
                const items = await readStoreAll(db, lStore);
                items.forEach(item => {
                  if (!item) return;

                  // Label definition
                  if (item.name && item.id !== undefined) {
                    const lId = String(item.id);
                    const lCount = typeof item.count === 'number' ? item.count : (typeof item.itemCount === 'number' ? item.itemCount : (typeof item.chatCount === 'number' ? item.chatCount : 0));
                    if (!labelsMap.has(lId)) {
                      labelsMap.set(lId, {
                        id: lId,
                        name: item.name,
                        color: item.hexColor || item.color || '#00a884',
                        count: lCount
                      });
                    } else {
                      const existing = labelsMap.get(lId);
                      if (item.name) existing.name = item.name;
                      if (item.hexColor || item.color) existing.color = item.hexColor || item.color;
                      if (lCount > 0) existing.count = Math.max(existing.count || 0, lCount);
                    }
                  }

                  // Association: item.labels array (e.g. { id: jid, labels: ["1", "2"] })
                  const itemLabels = item.labels || item.labelIds || item.labelList;
                  if (Array.isArray(itemLabels) && itemLabels.length > 0) {
                    const targetJid = normalizeJid(item.id || item.jid || item.chatId || item.contactId || item.parentId);
                    const phoneOnly = cleanPhone(targetJid.replace(/@.*$/, ''));
                    itemLabels.forEach(lbl => {
                      const lId = String(typeof lbl === 'object' ? (lbl.id || lbl.name || lbl.labelId) : lbl);
                      if (lId) {
                        if (!labelAssociations.has(lId)) labelAssociations.set(lId, new Set());
                        if (targetJid) labelAssociations.get(lId).add(targetJid);
                        if (phoneOnly) labelAssociations.get(lId).add(phoneOnly);
                      }
                    });
                  }

                  // Association: item.jids / item.jidList array (e.g. { id: labelId, jids: [...] })
                  const jidList = item.jids || item.jidList || item.chatList || item.associations || item.items || item.itemIds;
                  if (Array.isArray(jidList) && jidList.length > 0) {
                    const lId = String(item.id || item.labelId || item.label || '');
                    if (lId) {
                      if (!labelAssociations.has(lId)) labelAssociations.set(lId, new Set());
                      jidList.forEach(j => {
                        const targetJid = normalizeJid(typeof j === 'object' ? (j.id || j.jid || j.parentId) : j);
                        const phoneOnly = cleanPhone(targetJid.replace(/@.*$/, ''));
                        if (targetJid) labelAssociations.get(lId).add(targetJid);
                        if (phoneOnly) labelAssociations.get(lId).add(phoneOnly);
                      });
                    }
                  }

                  // Association: item.labelItemCollection
                  if (Array.isArray(item.labelItemCollection) && item.labelItemCollection.length > 0) {
                    const lId = String(item.id || item.labelId || '');
                    if (lId) {
                      if (!labelAssociations.has(lId)) labelAssociations.set(lId, new Set());
                      item.labelItemCollection.forEach(entry => {
                        const targetJid = normalizeJid(entry.parentId || entry.itemId || entry.id || entry.jid || entry.chatId);
                        const phoneOnly = cleanPhone(targetJid.replace(/@.*$/, ''));
                        if (targetJid) labelAssociations.get(lId).add(targetJid);
                        if (phoneOnly) labelAssociations.get(lId).add(phoneOnly);
                      });
                    }
                  }

                  // Association: single labelId + parentId/itemId
                  let lId = '';
                  let targetJid = '';

                  if (item.labelId !== undefined) {
                    lId = String(item.labelId);
                    targetJid = normalizeJid(item.parentId || item.labeledId || item.itemId || item.chatId || item.contactId || item.jid);
                  } else if (item.label !== undefined && typeof item.label !== 'object') {
                    lId = String(item.label);
                    targetJid = normalizeJid(item.parentId || item.labeledId || item.itemId || item.chatId || item.contactId || item.jid);
                  }

                  if (!lId || !targetJid) {
                    const rawId = typeof item.id === 'string' ? item.id : '';
                    if (rawId.includes('_')) {
                      const parts = rawId.split('_');
                      if (parts.length >= 2) {
                        if (/^\d+$/.test(parts[0])) {
                          lId = parts[0];
                          targetJid = normalizeJid(parts.slice(1).join('_'));
                        } else if (/^\d+$/.test(parts[parts.length - 1])) {
                          lId = parts[parts.length - 1];
                          targetJid = normalizeJid(parts.slice(0, -1).join('_'));
                        }
                      }
                    }
                  }

                  if (lId && targetJid) {
                    if (!labelAssociations.has(lId)) labelAssociations.set(lId, new Set());
                    labelAssociations.get(lId).add(targetJid);
                    const phoneOnly = cleanPhone(targetJid.replace(/@.*$/, ''));
                    if (phoneOnly) labelAssociations.get(lId).add(phoneOnly);
                  }
                });
              } catch (e) {}
            }

            db.close();
            resolve(true);
          };
        } catch (e) {
          resolve(false);
        }
      });
    }

    // Build label ID -> readable Name dictionary
    const labelIdToName = new Map();
    labelsMap.forEach(lbl => {
      labelIdToName.set(String(lbl.id), lbl.name);
      if (lbl.name) labelIdToName.set(lbl.name, lbl.name);
    });

    // Enrich contacts with human-readable label names and associations
    contactsMap.forEach(c => {
      if (Array.isArray(c.labels)) {
        c.labels = c.labels.map(lbl => labelIdToName.get(String(lbl)) || String(lbl));
      } else {
        c.labels = [];
      }

      // Associate contacts matching label associations
      for (const [lId, jidsSet] of labelAssociations.entries()) {
        const phoneMatch = cleanPhone(c.phoneNumber);
        const jidVariants = [
          c.id,
          c.jid,
          phoneMatch,
          `${phoneMatch}@c.us`,
          `${phoneMatch}@s.whatsapp.net`
        ].filter(Boolean);

        const hasMatch = jidVariants.some(j => jidsSet.has(j));
        if (hasMatch) {
          const labelName = labelIdToName.get(String(lId)) || lId;
          if (!c.labels.includes(labelName)) {
            c.labels.push(labelName);
          }
        }
      }
    });

    // Enrich groups with labels
    groupsMap.forEach(g => {
      if (Array.isArray(g.labels)) {
        g.labels = g.labels.map(l => labelIdToName.get(String(l)) || String(l));
      } else {
        g.labels = [];
      }

      for (const [lId, jidsSet] of labelAssociations.entries()) {
        if (jidsSet.has(g.id)) {
          const labelName = labelIdToName.get(String(lId)) || lId;
          if (!g.labels.includes(labelName)) {
            g.labels.push(labelName);
          }
        }
      }
    });

    // Update label counts accurately across both contacts and groups
    labelsMap.forEach(label => {
      const strId = String(label.id);
      const assoc = new Set([
        ...(labelAssociations.get(strId) || []),
        ...(labelAssociations.get(Number(strId)) || []),
        ...(labelAssociations.get(label.name) || [])
      ]);

      let matchedCount = 0;
      contactsMap.forEach(c => {
        if (c.labels && (c.labels.includes(label.name) || c.labels.includes(strId))) {
          matchedCount++;
        }
      });
      groupsMap.forEach(g => {
        if (g.labels && (g.labels.includes(label.name) || g.labels.includes(strId))) {
          matchedCount++;
        }
      });

      const directAssocCount = Array.from(assoc).filter(j => j.includes('@')).length;
      label.count = Math.max(label.count || 0, directAssocCount, matchedCount);
    });

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
