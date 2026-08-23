const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = path.resolve(__dirname, '..', 'screenshots');
const downloadsDir = 'C:\\Users\\DELL\\Downloads\\screenshots';

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });

const popupCss = fs.readFileSync(path.resolve(__dirname, '..', 'popup', 'popup.css'), 'utf8');

const screenshots = [
  {
    name: 'screenshot1_contacts_dashboard',
    title: 'Instant WhatsApp Contact & Lead Exporter',
    subtitle: 'Export all saved contacts & unsaved chat leads to CSV, Excel, vCard, and CRM with 1 click',
    tag: '⚡ 1-CLICK EXPORT',
    theme: 'dark',
    renderHtml: `
      <div class="showcase-card">
        <div class="app-container" style="box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
          <div class="page-view">
            <header class="app-header">
              <div class="brand">
                <div class="logo-circle"><img src="../icons/logo.svg" class="logo-icon-img"></div>
                <div class="title-group">
                  <div class="title-row"><h1>WA Exporter Pro</h1><span class="version-tag">v2.1</span></div>
                  <div class="status-badge"><span class="status-dot dot-online"></span><span>Connected to WhatsApp Web</span></div>
                </div>
              </div>
              <div class="header-actions">
                <button class="btn-icon"><svg viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg></button>
                <button class="btn-icon"><svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg></button>
                <button class="btn-icon"><svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg></button>
                <button class="btn-icon"><svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg></button>
                <button class="btn-icon"><svg viewBox="0 0 24 24"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg></button>
              </div>
            </header>
            <div class="stats-row">
              <div class="stat-card"><span class="stat-num">2,450</span><span class="stat-title">Total Contacts</span></div>
              <div class="stat-card"><span class="stat-num text-accent">842</span><span class="stat-title">Unsaved Leads</span></div>
              <div class="stat-card"><span class="stat-num">38</span><span class="stat-title">Groups</span></div>
              <div class="stat-card"><span class="stat-num">14</span><span class="stat-title">Countries</span></div>
            </div>
            <nav class="nav-tabs">
              <button class="tab-btn active">All Contacts</button>
              <button class="tab-btn">Unsaved Leads</button>
              <button class="tab-btn">Group Chats</button>
              <button class="tab-btn">Countries</button>
              <button class="tab-btn">Labels</button>
            </nav>
            <div class="controls-bar">
              <div class="search-wrapper">
                <svg viewBox="0 0 24 24" class="search-icon"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                <input type="text" placeholder="Search name, phone, country, group...">
              </div>
              <div class="selection-actions">
                <label class="select-all-label"><input type="checkbox" checked> <span>2,450 selected</span></label>
              </div>
            </div>
            <main class="list-container">
              <div class="items-list">
                <div class="contact-item">
                  <input type="checkbox" checked>
                  <div class="contact-avatar">K</div>
                  <div class="contact-info">
                    <div class="contact-name-row"><span class="contact-name">Kwame Mensah</span><span class="badge badge-saved">Saved</span><span class="badge badge-role">Biz</span></div>
                    <span class="contact-details"><span class="country-pill">GH</span> +233 24 123 4567 • Ghana • CEO & Founder</span>
                  </div>
                </div>
                <div class="contact-item">
                  <input type="checkbox" checked>
                  <div class="contact-avatar">S</div>
                  <div class="contact-info">
                    <div class="contact-name-row"><span class="contact-name">+1 415 555 2671</span><span class="badge badge-unsaved">Unsaved</span></div>
                    <span class="contact-details"><span class="country-pill">US</span> +1 415 555 2671 • United States • Product Lead</span>
                  </div>
                </div>
                <div class="contact-item">
                  <input type="checkbox" checked>
                  <div class="contact-avatar">A</div>
                  <div class="contact-info">
                    <div class="contact-name-row"><span class="contact-name">Amara Okafor</span><span class="badge badge-saved">Saved</span></div>
                    <span class="contact-details"><span class="country-pill">NG</span> +234 80 987 6543 • Nigeria • Software Engineer</span>
                  </div>
                </div>
                <div class="contact-item">
                  <input type="checkbox" checked>
                  <div class="contact-avatar">O</div>
                  <div class="contact-info">
                    <div class="contact-name-row"><span class="contact-name">+44 7911 123456</span><span class="badge badge-unsaved">Unsaved</span><span class="badge badge-role">Biz</span></div>
                    <span class="contact-details"><span class="country-pill">GB</span> +44 7911 123456 • United Kingdom • London UK</span>
                  </div>
                </div>
              </div>
            </main>
            <footer class="export-footer">
              <div class="export-controls-box">
                <select class="export-mode-select">
                  <option>CSV Spreadsheet (.csv)</option>
                  <option>Excel Workbook (.xls)</option>
                  <option>vCard for Phone / iCloud (.vcf)</option>
                  <option>Google Contacts Import (.csv)</option>
                </select>
                <button class="btn-main-export">
                  <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                  <span>Export (2,450 Contacts)</span>
                </button>
              </div>
            </footer>
          </div>
        </div>
      </div>
    `
  },
  {
    name: 'screenshot2_group_chats',
    title: 'Extract WhatsApp Group Members & ZIP Bundler',
    subtitle: 'Capture all group participants, admin roles, and export individual groups to ZIP archive',
    tag: '👥 GROUP CHAT EXPORTER',
    theme: 'dark',
    renderHtml: `
      <div class="showcase-card">
        <div class="app-container" style="box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
          <div class="page-view">
            <header class="app-header">
              <div class="brand">
                <div class="logo-circle"><img src="../icons/logo.svg" class="logo-icon-img"></div>
                <div class="title-group">
                  <div class="title-row"><h1>WA Exporter Pro</h1><span class="version-tag">v2.1</span></div>
                  <div class="status-badge"><span class="status-dot dot-online"></span><span>Connected to WhatsApp Web</span></div>
                </div>
              </div>
              <div class="header-actions">
                <button class="btn-icon"><svg viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg></button>
                <button class="btn-icon"><svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg></button>
                <button class="btn-icon"><svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg></button>
                <button class="btn-icon"><svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg></button>
                <button class="btn-icon"><svg viewBox="0 0 24 24"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg></button>
              </div>
            </header>
            <div class="stats-row">
              <div class="stat-card"><span class="stat-num">2,450</span><span class="stat-title">Total Contacts</span></div>
              <div class="stat-card"><span class="stat-num text-accent">842</span><span class="stat-title">Unsaved Leads</span></div>
              <div class="stat-card"><span class="stat-num">38</span><span class="stat-title">Groups</span></div>
              <div class="stat-card"><span class="stat-num">14</span><span class="stat-title">Countries</span></div>
            </div>
            <nav class="nav-tabs">
              <button class="tab-btn">All Contacts</button>
              <button class="tab-btn">Unsaved Leads</button>
              <button class="tab-btn active">Group Chats</button>
              <button class="tab-btn">Countries</button>
              <button class="tab-btn">Labels</button>
            </nav>
            <div class="controls-bar">
              <div class="search-wrapper">
                <svg viewBox="0 0 24 24" class="search-icon"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                <input type="text" placeholder="Search groups...">
              </div>
              <div class="selection-actions">
                <label class="select-all-label"><input type="checkbox" checked> <span>38 groups selected</span></label>
              </div>
            </div>
            <main class="list-container">
              <div class="items-list">
                <div class="group-item">
                  <input type="checkbox" checked>
                  <div class="contact-avatar" style="background:rgba(18,140,126,0.15);color:#128c7e;">👥</div>
                  <div class="contact-info">
                    <div class="contact-name-row"><span class="contact-name">Tech Founders & Startups Africa</span><span class="badge badge-role">256 members</span></div>
                    <span class="contact-details">ID: 120363024829482948@g.us</span>
                  </div>
                  <button class="btn-quick-export">Export</button>
                </div>
                <div class="group-item">
                  <input type="checkbox" checked>
                  <div class="contact-avatar" style="background:rgba(18,140,126,0.15);color:#128c7e;">👥</div>
                  <div class="contact-info">
                    <div class="contact-name-row"><span class="contact-name">Global Marketing Masters 2026</span><span class="badge badge-role">184 members</span></div>
                    <span class="contact-details">ID: 120363098371928374@g.us</span>
                  </div>
                  <button class="btn-quick-export">Export</button>
                </div>
                <div class="group-item">
                  <input type="checkbox" checked>
                  <div class="contact-avatar" style="background:rgba(18,140,126,0.15);color:#128c7e;">👥</div>
                  <div class="contact-info">
                    <div class="contact-name-row"><span class="contact-name">E-Commerce & Dropshipping Hub</span><span class="badge badge-role">512 members</span></div>
                    <span class="contact-details">ID: 120363198273847291@g.us</span>
                  </div>
                  <button class="btn-quick-export">Export</button>
                </div>
                <div class="group-item">
                  <input type="checkbox" checked>
                  <div class="contact-avatar" style="background:rgba(18,140,126,0.15);color:#128c7e;">👥</div>
                  <div class="contact-info">
                    <div class="contact-name-row"><span class="contact-name">Real Estate Investors Network</span><span class="badge badge-role">94 members</span></div>
                    <span class="contact-details">ID: 120363294827183920@g.us</span>
                  </div>
                  <button class="btn-quick-export">Export</button>
                </div>
              </div>
            </main>
            <footer class="export-footer">
              <div class="export-controls-box">
                <select class="export-mode-select">
                  <option selected>ZIP Archive (Separate Group Files)</option>
                  <option>CSV Spreadsheet (.csv)</option>
                  <option>Excel Workbook (.xls)</option>
                </select>
                <button class="btn-main-export">
                  <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                  <span>Export 38 Groups (ZIP)</span>
                </button>
              </div>
            </footer>
          </div>
        </div>
      </div>
    `
  },
  {
    name: 'screenshot3_country_breakdown',
    title: 'Smart Country Filter & International Dial Codes',
    subtitle: 'Automatically detects country prefixes, flags, and lets you segment contacts by nation',
    tag: '🌍 240+ COUNTRIES',
    theme: 'dark',
    renderHtml: `
      <div class="showcase-card">
        <div class="app-container" style="box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
          <div class="page-view">
            <header class="app-header">
              <div class="brand">
                <div class="logo-circle"><img src="../icons/logo.svg" class="logo-icon-img"></div>
                <div class="title-group">
                  <div class="title-row"><h1>WA Exporter Pro</h1><span class="version-tag">v2.1</span></div>
                  <div class="status-badge"><span class="status-dot dot-online"></span><span>Connected to WhatsApp Web</span></div>
                </div>
              </div>
              <div class="header-actions">
                <button class="btn-icon"><svg viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg></button>
                <button class="btn-icon"><svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg></button>
                <button class="btn-icon"><svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg></button>
                <button class="btn-icon"><svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg></button>
                <button class="btn-icon"><svg viewBox="0 0 24 24"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg></button>
              </div>
            </header>
            <div class="stats-row">
              <div class="stat-card"><span class="stat-num">2,450</span><span class="stat-title">Total Contacts</span></div>
              <div class="stat-card"><span class="stat-num text-accent">842</span><span class="stat-title">Unsaved Leads</span></div>
              <div class="stat-card"><span class="stat-num">38</span><span class="stat-title">Groups</span></div>
              <div class="stat-card"><span class="stat-num">14</span><span class="stat-title">Countries</span></div>
            </div>
            <nav class="nav-tabs">
              <button class="tab-btn">All Contacts</button>
              <button class="tab-btn">Unsaved Leads</button>
              <button class="tab-btn">Group Chats</button>
              <button class="tab-btn active">Countries</button>
              <button class="tab-btn">Labels</button>
            </nav>
            <div class="controls-bar">
              <div class="search-wrapper">
                <svg viewBox="0 0 24 24" class="search-icon"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                <input type="text" placeholder="Search countries...">
              </div>
              <div class="selection-actions">
                <span class="text-muted" style="font-size:11px;">14 Countries Detected</span>
              </div>
            </div>
            <main class="list-container">
              <div class="items-list">
                <div class="country-item">
                  <div class="contact-avatar country-flag-avatar"><span class="country-pill" style="font-size:11px;padding:3px 6px;">GH</span></div>
                  <div class="contact-info">
                    <div class="contact-name-row"><span class="contact-name">Ghana (+233)</span><span class="badge badge-role">1,120 contacts</span></div>
                    <span class="contact-details">ISO: GH • Dial Prefix: +233</span>
                  </div>
                  <button class="btn-quick-export">Export</button>
                </div>
                <div class="country-item">
                  <div class="contact-avatar country-flag-avatar"><span class="country-pill" style="font-size:11px;padding:3px 6px;">US</span></div>
                  <div class="contact-info">
                    <div class="contact-name-row"><span class="contact-name">United States (+1)</span><span class="badge badge-role">540 contacts</span></div>
                    <span class="contact-details">ISO: US • Dial Prefix: +1</span>
                  </div>
                  <button class="btn-quick-export">Export</button>
                </div>
                <div class="country-item">
                  <div class="contact-avatar country-flag-avatar"><span class="country-pill" style="font-size:11px;padding:3px 6px;">NG</span></div>
                  <div class="contact-info">
                    <div class="contact-name-row"><span class="contact-name">Nigeria (+234)</span><span class="badge badge-role">485 contacts</span></div>
                    <span class="contact-details">ISO: NG • Dial Prefix: +234</span>
                  </div>
                  <button class="btn-quick-export">Export</button>
                </div>
                <div class="country-item">
                  <div class="contact-avatar country-flag-avatar"><span class="country-pill" style="font-size:11px;padding:3px 6px;">GB</span></div>
                  <div class="contact-info">
                    <div class="contact-name-row"><span class="contact-name">United Kingdom (+44)</span><span class="badge badge-role">305 contacts</span></div>
                    <span class="contact-details">ISO: GB • Dial Prefix: +44</span>
                  </div>
                  <button class="btn-quick-export">Export</button>
                </div>
              </div>
            </main>
            <footer class="export-footer">
              <div class="export-controls-box">
                <select class="export-mode-select">
                  <option>CSV Spreadsheet (.csv)</option>
                  <option>Excel Workbook (.xls)</option>
                  <option>vCard for Phone / iCloud (.vcf)</option>
                </select>
                <button class="btn-main-export">
                  <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                  <span>Export All Countries (2,450)</span>
                </button>
              </div>
            </footer>
          </div>
        </div>
      </div>
    `
  },
  {
    name: 'screenshot4_settings_columns',
    title: 'Custom Column Selector & Export Preferences',
    subtitle: 'Tailor your spreadsheets with custom delimiters, deduplication rules, and 13 configurable columns',
    tag: '⚙️ CUSTOMIZABLE EXPORTS',
    theme: 'dark',
    renderHtml: `
      <div class="showcase-card">
        <div class="app-container" style="box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
          <div class="page-view">
            <header class="settings-page-header">
              <div class="settings-header-title">
                <h2>⚙️ Settings & History</h2>
              </div>
            </header>
            <nav class="settings-subtabs">
              <button class="settings-subtab-btn">General</button>
              <button class="settings-subtab-btn active">Custom Columns</button>
              <button class="settings-subtab-btn">Export History</button>
            </nav>
            <div class="settings-page-body">
              <div class="settings-section-card">
                <div class="columns-header-row">
                  <span class="card-section-title">Exported Columns (CSV & Excel)</span>
                  <div class="columns-actions-group">
                    <button class="btn-text-small" style="color:var(--primary);font-weight:700;">Select All</button>
                    <button class="btn-text-small">Deselect All</button>
                  </div>
                </div>
                <p class="section-description">Choose which fields to include when exporting contacts to CSV or Excel spreadsheets:</p>
                <div class="columns-grid">
                  <label class="col-chk-label"><input type="checkbox" checked> Phone Number</label>
                  <label class="col-chk-label"><input type="checkbox" checked> Formatted Phone</label>
                  <label class="col-chk-label"><input type="checkbox" checked> Country Name & ISO</label>
                  <label class="col-chk-label"><input type="checkbox" checked> Display Name</label>
                  <label class="col-chk-label"><input type="checkbox" checked> Address Book Name</label>
                  <label class="col-chk-label"><input type="checkbox" checked> Public Push Name</label>
                  <label class="col-chk-label"><input type="checkbox" checked> Saved Status (Yes/No)</label>
                  <label class="col-chk-label"><input type="checkbox" checked> Account Type (Biz)</label>
                  <label class="col-chk-label"><input type="checkbox" checked> About / Bio Status</label>
                  <label class="col-chk-label"><input type="checkbox" checked> Group Name</label>
                  <label class="col-chk-label"><input type="checkbox" checked> Group Role</label>
                  <label class="col-chk-label"><input type="checkbox" checked> Business Labels</label>
                  <label class="col-chk-label"><input type="checkbox" checked> WhatsApp JID</label>
                </div>
              </div>
              <div class="privacy-box">
                <strong>🔒 100% Client-Side Privacy Guarantee</strong>
                <p>All processing runs strictly in your local browser sandbox. No data or numbers ever leave your machine.</p>
              </div>
            </div>
            <footer class="settings-page-footer">
              <button class="btn-secondary-action">← Return to Home</button>
              <button class="btn-save-settings">Save Preferences</button>
            </footer>
          </div>
        </div>
      </div>
    `
  },
  {
    name: 'screenshot5_dark_privacy_mode',
    title: 'Screen Privacy Mode & Dark/Light Themes',
    subtitle: 'Mask phone numbers for screen sharing, recordings, and live demonstrations with 1 click',
    tag: '🔒 PRIVACY SHIELD',
    theme: 'dark',
    renderHtml: `
      <div class="showcase-card">
        <div class="app-container" style="box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
          <div class="page-view">
            <header class="app-header">
              <div class="brand">
                <div class="logo-circle"><img src="../icons/logo.svg" class="logo-icon-img"></div>
                <div class="title-group">
                  <div class="title-row"><h1>WA Exporter Pro</h1><span class="version-tag">v2.1</span></div>
                  <div class="status-badge"><span class="status-dot dot-online"></span><span>Privacy Mask Active</span></div>
                </div>
              </div>
              <div class="header-actions">
                <button class="btn-icon"><svg viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg></button>
                <button class="btn-icon" style="color:var(--primary);background:rgba(0,168,132,0.15);"><svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg></button>
                <button class="btn-icon"><svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg></button>
                <button class="btn-icon"><svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg></button>
                <button class="btn-icon"><svg viewBox="0 0 24 24"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg></button>
              </div>
            </header>
            <div class="stats-row">
              <div class="stat-card"><span class="stat-num">2,450</span><span class="stat-title">Total Contacts</span></div>
              <div class="stat-card"><span class="stat-num text-accent">842</span><span class="stat-title">Unsaved Leads</span></div>
              <div class="stat-card"><span class="stat-num">38</span><span class="stat-title">Groups</span></div>
              <div class="stat-card"><span class="stat-num">14</span><span class="stat-title">Countries</span></div>
            </div>
            <nav class="nav-tabs">
              <button class="tab-btn active">All Contacts</button>
              <button class="tab-btn">Unsaved Leads</button>
              <button class="tab-btn">Group Chats</button>
              <button class="tab-btn">Countries</button>
              <button class="tab-btn">Labels</button>
            </nav>
            <main class="list-container">
              <div class="items-list">
                <div class="contact-item">
                  <input type="checkbox" checked>
                  <div class="contact-avatar">K</div>
                  <div class="contact-info">
                    <div class="contact-name-row"><span class="contact-name">Kwame Mensah</span><span class="badge badge-saved">Saved</span></div>
                    <span class="contact-details"><span class="country-pill">GH</span> +233 24 ••• ••67 • Ghana</span>
                  </div>
                </div>
                <div class="contact-item">
                  <input type="checkbox" checked>
                  <div class="contact-avatar">S</div>
                  <div class="contact-info">
                    <div class="contact-name-row"><span class="contact-name">+1 415 ••• ••71</span><span class="badge badge-unsaved">Unsaved</span></div>
                    <span class="contact-details"><span class="country-pill">US</span> +1 415 ••• ••71 • United States</span>
                  </div>
                </div>
                <div class="contact-item">
                  <input type="checkbox" checked>
                  <div class="contact-avatar">A</div>
                  <div class="contact-info">
                    <div class="contact-name-row"><span class="contact-name">Amara Okafor</span><span class="badge badge-saved">Saved</span></div>
                    <span class="contact-details"><span class="country-pill">NG</span> +234 80 ••• ••43 • Nigeria</span>
                  </div>
                </div>
              </div>
            </main>
            <footer class="export-footer">
              <div class="export-controls-box">
                <select class="export-mode-select">
                  <option>vCard for Phone / iCloud (.vcf)</option>
                  <option>CSV Spreadsheet (.csv)</option>
                  <option>Excel Workbook (.xls)</option>
                </select>
                <button class="btn-main-export">
                  <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                  <span>Export Masked (2,450)</span>
                </button>
              </div>
            </footer>
          </div>
        </div>
      </div>
    `
  }
];

const tempHarnessPath = path.resolve(__dirname, 'temp_screenshot_harness.html');

screenshots.forEach((item, index) => {
  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    ${popupCss}
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    html, body {
      width: 1280px;
      height: 800px;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: radial-gradient(circle at 50% 20%, #111b21 0%, #0b141a 100%);
      color: #e9edef;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .canvas-container {
      width: 1280px;
      height: 800px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 30px 40px;
      background: radial-gradient(ellipse at top, #182229 0%, #0b141a 70%);
      position: relative;
    }

    .header-banner {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .feature-tag {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      background: rgba(0, 168, 132, 0.15);
      color: #00a884;
      padding: 4px 14px;
      border-radius: 20px;
      border: 1px solid rgba(0, 168, 132, 0.3);
    }

    .main-heading {
      font-size: 26px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.5px;
    }

    .sub-heading {
      font-size: 14px;
      color: #8696a0;
      max-width: 750px;
    }

    .showcase-area {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      margin-top: 10px;
    }

    .showcase-card {
      width: 440px;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08);
      background: #111b21;
    }

    .app-container {
      width: 440px;
      height: 570px;
    }

    .bottom-features-bar {
      display: flex;
      align-items: center;
      gap: 30px;
      font-size: 12px;
      color: #aebac1;
      font-weight: 600;
      padding-top: 10px;
    }

    .bottom-feature-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
  </style>
</head>
<body class="theme-dark">
  <div class="canvas-container">
    <div class="header-banner">
      <span class="feature-tag">${item.tag}</span>
      <h1 class="main-heading">${item.title}</h1>
      <p class="sub-heading">${item.subtitle}</p>
    </div>

    <div class="showcase-area">
      ${item.renderHtml}
    </div>

    <div class="bottom-features-bar">
      <div class="bottom-feature-item">🔒 100% Client-Side Local</div>
      <div class="bottom-feature-item">⚡ Instant CSV & Excel Export</div>
      <div class="bottom-feature-item">📱 Phonebook vCard (.vcf)</div>
      <div class="bottom-feature-item">👥 ZIP Multi-Group Bundler</div>
    </div>
  </div>
</body>
</html>`;

  fs.writeFileSync(tempHarnessPath, fullHtml, 'utf8');
  const fileUrl = `file:///${tempHarnessPath.replace(/\\/g, '/')}`;
  
  const outPngLocal = path.join(outputDir, `${item.name}.png`);
  const outPngDownloads = path.join(downloadsDir, `${item.name}.png`);

  const cmd = `"${chromePath}" --headless --disable-gpu --hide-scrollbars --window-size=1280,800 --screenshot="${outPngLocal}" "${fileUrl}"`;
  execSync(cmd, { stdio: 'inherit' });
  fs.copyFileSync(outPngLocal, outPngDownloads);

  console.log(`[${index + 1}/5] Rendered ${item.name}.png (1280x800)`);
});

if (fs.existsSync(tempHarnessPath)) fs.unlinkSync(tempHarnessPath);
console.log('All 5 Chrome Web Store screenshots generated successfully!');
