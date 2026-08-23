/**
 * WhatsApp Web Live Page-Context Script (MAIN World) - v2.2.0
 * Comprehensive Multi-Engine Extractor: window.require + Webpack Collections + Live DOM + window.Store
 */

(function () {
  'use strict';

  function normalizeJid(id) {
    if (!id) return '';
    if (typeof id === 'string') return id;
    if (id._serialized) return id._serialized;
    if (id.user && id.server) return `${id.user}@${id.server}`;
    if (typeof id === 'object') {
      if (id._serialized) return id._serialized;
      if (id.id) return normalizeJid(id.id);
      if (id.user) return `${id.user}@${id.server || 'c.us'}`;
    }
    return String(id);
  }

  function cleanPhone(raw) {
    if (!raw) return '';
    return String(raw).replace(/[^0-9]/g, '');
  }

  // Find module by name or by predicate
  function findModule(predicate) {
    if (window.webpackChunkwhatsapp_web_client) {
      try {
        let req;
        window.webpackChunkwhatsapp_web_client.push([
          [Symbol()],
          {},
          (r) => { req = r; }
        ]);

        if (req && req.c) {
          for (const id in req.c) {
            const m = req.c[id]?.exports;
            if (!m) continue;
            if (predicate(m)) return m;
            if (m.default && predicate(m.default)) return m.default;
          }
        }
      } catch (e) {}
    }
    return null;
  }

  function getRequireModule(name) {
    if (typeof window.require === 'function') {
      try {
        const mod = window.require(name);
        if (mod) return mod;
      } catch (e) {}
    }
    return null;
  }

  function getCollections() {
    let LabelCol = null;
    let ChatCol = null;
    let GroupMetaCol = null;

    // 1. Try window.require
    const waCols = getRequireModule('WAWebCollections') || getRequireModule('WAWebLabelCollection') || getRequireModule('WAWebChatCollection');
    if (waCols) {
      LabelCol = waCols.LabelCollection || waCols.Label;
      ChatCol = waCols.ChatCollection || waCols.Chat;
      GroupMetaCol = waCols.GroupMetadataCollection || waCols.GroupMetadata;
    }

    // 2. Try window.Store
    if (window.Store) {
      if (!LabelCol && window.Store.Label) LabelCol = window.Store.Label;
      if (!ChatCol && window.Store.Chat) ChatCol = window.Store.Chat;
      if (!GroupMetaCol && window.Store.GroupMetadata) GroupMetaCol = window.Store.GroupMetadata;
    }

    // 3. Try searching Webpack modules
    if (!LabelCol || !ChatCol) {
      findModule((m) => {
        if (!LabelCol && (m.LabelCollection || (m.models && m._models && m.name === 'LabelCollection') || (m._models && m._modelClass && String(m._modelClass).includes('Label')))) {
          LabelCol = m.LabelCollection || m;
        }
        if (!ChatCol && (m.ChatCollection || (m.models && m._models && m.name === 'ChatCollection') || (m._models && m._modelClass && String(m._modelClass).includes('Chat')))) {
          ChatCol = m.ChatCollection || m;
        }
        if (!GroupMetaCol && (m.GroupMetadataCollection || m.GroupMetadata)) {
          GroupMetaCol = m.GroupMetadataCollection || m.GroupMetadata;
        }
        return Boolean(LabelCol && ChatCol);
      });
    }

    return { LabelCol, ChatCol, GroupMetaCol };
  }

  function extractLivePageData() {
    const labelsMap = new Map();
    const labelAssociations = new Map();

    const { LabelCol, ChatCol } = getCollections();

    // 1. Extract from LabelCollection
    if (LabelCol) {
      const list = LabelCol._models || LabelCol.models || (typeof LabelCol.toArray === 'function' ? LabelCol.toArray() : []);
      list.forEach(item => {
        const lId = String(item.id || item.labelId || '');
        if (!lId) return;

        const labelName = item.name || item.subject || `Label ${lId}`;
        const labelColor = item.hexColor || item.color || '#00a884';
        const itemsList = item.labelItemCollection?._models || item.labelItemCollection?.models || (typeof item.labelItemCollection?.toArray === 'function' ? item.labelItemCollection.toArray() : []) || [];
        const rawCount = typeof item.count === 'number' ? item.count : (itemsList.length || 0);

        if (!labelsMap.has(lId)) {
          labelsMap.set(lId, {
            id: lId,
            name: labelName,
            color: labelColor,
            count: rawCount
          });
        }

        if (Array.isArray(itemsList)) {
          itemsList.forEach(entry => {
            const targetJid = normalizeJid(entry.parentId || entry.itemId || entry.id || entry.jid || entry.chatId || entry.labeledId);
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

    // 2. Extract from ChatCollection
    if (ChatCol) {
      const list = ChatCol._models || ChatCol.models || (typeof ChatCol.toArray === 'function' ? ChatCol.toArray() : []);
      list.forEach(chat => {
        const jid = normalizeJid(chat.id);
        if (!jid) return;

        const rawLabels = chat.labels || chat.labelIds || [];
        if (Array.isArray(rawLabels) && rawLabels.length > 0) {
          rawLabels.forEach(lbl => {
            const lId = String(typeof lbl === 'object' ? (lbl.id || lbl.name || lbl.labelId) : lbl);
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

    // 3. Scan WhatsApp Web DOM for labeled chat rows
    try {
      const chatElements = document.querySelectorAll('[data-testid="cell-frame-container"], [role="listitem"], #pane-side > div > div > div > div');
      chatElements.forEach(el => {
        // Check for colored label icons or tooltips
        const labelPills = el.querySelectorAll('[data-testid*="label"], [aria-label*="label" i], span[style*="color"], svg[style*="color"]');
        labelPills.forEach(pill => {
          const text = pill.getAttribute('aria-label') || pill.getAttribute('title') || pill.textContent || '';
          if (text) {
            labelsMap.forEach(lbl => {
              if (text.toLowerCase().includes(lbl.name.toLowerCase())) {
                if (!labelAssociations.has(lbl.id)) labelAssociations.set(lbl.id, new Set());
                // Extract phone or name from chat row
                const rowText = el.innerText || '';
                const phoneMatch = rowText.match(/\+?\d[\d\s-]{7,}\d/);
                if (phoneMatch) {
                  const cleaned = cleanPhone(phoneMatch[0]);
                  if (cleaned) labelAssociations.get(lbl.id).add(cleaned);
                }
              }
            });
          }
        });
      });
    } catch (e) {}

    // Convert sets to arrays for postMessage
    const associationsObj = {};
    labelAssociations.forEach((set, key) => {
      associationsObj[key] = Array.from(set);
    });

    // Update label count accurately from associations
    labelsMap.forEach(label => {
      const set = labelAssociations.get(label.id);
      if (set && set.size > (label.count || 0)) {
        label.count = set.size;
      }
    });

    return {
      labels: Array.from(labelsMap.values()),
      labelAssociations: associationsObj
    };
  }

  // Handle messages from isolated content script
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
