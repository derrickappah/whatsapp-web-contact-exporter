/**
 * WhatsApp Web Live Page-Context Script (MAIN World)
 * Extracts in-memory window.Store Labels, Chats, and Group Metadata in real-time.
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

  function extractLivePageData() {
    const labelsMap = new Map();
    const labelAssociations = new Map();
    const contactsMap = new Map();
    const groupsMap = new Map();

    // 1. Webpack live module extraction
    if (window.webpackChunkwhatsapp_web_client) {
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

          // Check for LabelCollection
          const labelCol = mod.LabelCollection || mod.default?.LabelCollection || (mod.Label && mod.Label.models ? mod.Label : null);
          if (labelCol) {
            const list = labelCol._models || labelCol.models || (typeof labelCol.toArray === 'function' ? labelCol.toArray() : []);
            list.forEach(item => {
              const lId = String(item.id || item.labelId || '');
              if (!lId) return;

              const labelName = item.name || item.subject || `Label ${lId}`;
              const labelColor = item.hexColor || item.color || '#00a884';
              const itemsList = item.labelItemCollection?._models || item.labelItemCollection?.models || item.labelItemCollection || [];
              const rawCount = typeof item.count === 'number' ? item.count : (itemsList.length || 0);

              if (!labelsMap.has(lId)) {
                labelsMap.set(lId, {
                  id: lId,
                  name: labelName,
                  color: labelColor,
                  count: rawCount
                });
              }

              // Extract associated chats from labelItemCollection
              if (Array.isArray(itemsList)) {
                itemsList.forEach(entry => {
                  const targetJid = normalizeJid(entry.parentId || entry.itemId || entry.id || entry.jid || entry.chatId);
                  if (targetJid) {
                    if (!labelAssociations.has(lId)) labelAssociations.set(lId, new Set());
                    labelAssociations.get(lId).add(targetJid);
                    const phone = cleanPhone(targetJid.replace(/@.*$/, ''));
                    if (phone) labelAssociations.get(lId).add(phone);
                  }
                });
              }
            });
          }

          // Check for ChatCollection
          const chatCol = mod.ChatCollection || mod.default?.ChatCollection || (mod.Chat && mod.Chat.models ? mod.Chat : null);
          if (chatCol) {
            const list = chatCol._models || chatCol.models || (typeof chatCol.toArray === 'function' ? chatCol.toArray() : []);
            list.forEach(chat => {
              const jid = normalizeJid(chat.id);
              if (!jid) return;

              const rawLabels = chat.labels || chat.labelIds || [];
              if (Array.isArray(rawLabels) && rawLabels.length > 0) {
                rawLabels.forEach(lbl => {
                  const lId = String(typeof lbl === 'object' ? (lbl.id || lbl.name) : lbl);
                  if (lId) {
                    if (!labelAssociations.has(lId)) labelAssociations.set(lId, new Set());
                    labelAssociations.get(lId).add(jid);
                    const phone = cleanPhone(jid.replace(/@.*$/, ''));
                    if (phone) labelAssociations.get(lId).add(phone);
                  }
                });
              }
            });
          }
        }
      } catch (err) {}
    }

    // 2. Direct window.Store extraction
    if (window.Store) {
      try {
        if (window.Store.Label) {
          const list = window.Store.Label._models || window.Store.Label.models || [];
          list.forEach(item => {
            const lId = String(item.id || '');
            if (!lId) return;

            const labelName = item.name || item.subject || `Label ${lId}`;
            const labelColor = item.hexColor || item.color || '#00a884';
            const itemsList = item.labelItemCollection?._models || item.labelItemCollection?.models || [];
            const rawCount = typeof item.count === 'number' ? item.count : (itemsList.length || 0);

            if (!labelsMap.has(lId)) {
              labelsMap.set(lId, {
                id: lId,
                name: labelName,
                color: labelColor,
                count: rawCount
              });
            } else {
              const existing = labelsMap.get(lId);
              if (rawCount > existing.count) existing.count = rawCount;
            }

            if (Array.isArray(itemsList)) {
              itemsList.forEach(entry => {
                const targetJid = normalizeJid(entry.parentId || entry.itemId || entry.id || entry.jid || entry.chatId);
                if (targetJid) {
                  if (!labelAssociations.has(lId)) labelAssociations.set(lId, new Set());
                  labelAssociations.get(lId).add(targetJid);
                  const phone = cleanPhone(targetJid.replace(/@.*$/, ''));
                  if (phone) labelAssociations.get(lId).add(phone);
                }
              });
            }
          });
        }

        if (window.Store.Chat) {
          const list = window.Store.Chat._models || window.Store.Chat.models || [];
          list.forEach(chat => {
            const jid = normalizeJid(chat.id);
            if (!jid) return;

            const rawLabels = chat.labels || chat.labelIds || [];
            if (Array.isArray(rawLabels) && rawLabels.length > 0) {
              rawLabels.forEach(lbl => {
                const lId = String(typeof lbl === 'object' ? (lbl.id || lbl.name) : lbl);
                if (lId) {
                  if (!labelAssociations.has(lId)) labelAssociations.set(lId, new Set());
                  labelAssociations.get(lId).add(jid);
                  const phone = cleanPhone(jid.replace(/@.*$/, ''));
                  if (phone) labelAssociations.get(lId).add(phone);
                }
              });
            }
          });
        }
      } catch (err) {}
    }

    // Convert sets to arrays for serialization
    const associationsObj = {};
    labelAssociations.forEach((set, key) => {
      associationsObj[key] = Array.from(set);
    });

    return {
      labels: Array.from(labelsMap.values()),
      labelAssociations: associationsObj
    };
  }

  // Listen for queries from content script
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || event.data.type !== 'WA_EXPORTER_PAGE_QUERY') return;
    const requestId = event.data.requestId;

    try {
      const liveData = extractLivePageData();
      window.postMessage({
        type: 'WA_EXPORTER_PAGE_RESPONSE',
        requestId,
        data: liveData
      }, '*');
    } catch (err) {
      window.postMessage({
        type: 'WA_EXPORTER_PAGE_RESPONSE',
        requestId,
        data: null
      }, '*');
    }
  });

})();
