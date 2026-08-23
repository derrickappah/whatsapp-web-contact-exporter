const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = path.resolve(__dirname, '..', 'screenshots');
const downloadsDir = 'C:\\Users\\DELL\\Downloads\\screenshots';

const tiles = [
  {
    name: 'promo_small_440x280',
    width: 440,
    height: 280,
    html: `
      <div style="width:440px;height:280px;background:radial-gradient(circle at 50% 30%, #182229 0%, #0b141a 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#fff;border:1px solid rgba(255,255,255,0.1);">
        <div style="width:54px;height:54px;background:#25d366;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(37,211,102,0.4);margin-bottom:14px;">
          <svg style="width:32px;height:32px;fill:#fff;" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
        </div>
        <h2 style="font-size:18px;font-weight:800;letter-spacing:-0.3px;margin-bottom:6px;">WA Exporter Pro</h2>
        <p style="font-size:12px;color:#8696a0;max-width:320px;line-height:1.4;margin-bottom:14px;">Export WhatsApp Contacts, Leads & Groups to Excel, CSV & vCard</p>
        <div style="display:flex;gap:8px;font-size:10px;font-weight:700;color:#00a884;">
          <span style="background:rgba(0,168,132,0.15);padding:3px 8px;border-radius:12px;">🔒 100% Privacy</span>
          <span style="background:rgba(0,168,132,0.15);padding:3px 8px;border-radius:12px;">⚡ 1-Click Export</span>
          <span style="background:rgba(0,168,132,0.15);padding:3px 8px;border-radius:12px;">👥 Multi-Group ZIP</span>
        </div>
      </div>
    `
  },
  {
    name: 'promo_marquee_1400x560',
    width: 1400,
    height: 560,
    html: `
      <div style="width:1400px;height:560px;background:radial-gradient(circle at 60% 40%, #1a2730 0%, #0b141a 100%);display:flex;align-items:center;justify-content:space-between;padding:60px 80px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#fff;position:relative;overflow:hidden;">
        <div style="max-width:650px;display:flex;flex-direction:column;gap:16px;">
          <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(0,168,132,0.18);color:#00a884;border:1px solid rgba(0,168,132,0.3);padding:6px 16px;border-radius:20px;font-size:13px;font-weight:800;letter-spacing:1px;width:fit-content;">
            🚀 #1 WHATSAPP WEB EXPORTER PRO
          </div>
          <h1 style="font-size:42px;font-weight:900;letter-spacing:-1px;line-height:1.15;">Export Contacts, Leads & Groups in Seconds</h1>
          <p style="font-size:18px;color:#8696a0;line-height:1.5;">Export all your saved contacts, unsaved chat leads, group participants, and business labels directly to Excel, CSV, vCard (.vcf), and ZIP archives.</p>
          <div style="display:flex;gap:14px;margin-top:8px;">
            <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);padding:10px 18px;border-radius:10px;font-size:14px;font-weight:700;">📊 Excel & CSV</div>
            <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);padding:10px 18px;border-radius:10px;font-size:14px;font-weight:700;">📱 vCard (.vcf)</div>
            <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);padding:10px 18px;border-radius:10px;font-size:14px;font-weight:700;">📦 Multi-Group ZIP</div>
            <div style="background:rgba(0,168,132,0.2);color:#25d366;border:1px solid rgba(37,211,102,0.3);padding:10px 18px;border-radius:10px;font-size:14px;font-weight:700;">🔒 100% Client-Side</div>
          </div>
        </div>
        <div style="width:460px;height:420px;background:#111b21;border-radius:16px;box-shadow:0 30px 80px rgba(0,0,0,0.7),0 0 0 1px rgba(255,255,255,0.1);display:flex;flex-direction:column;padding:24px;justify-content:space-between;">
          <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:14px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:36px;height:36px;background:#25d366;border-radius:50%;display:flex;align-items:center;justify-content:center;">
                <svg style="width:20px;height:20px;fill:#fff;" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
              </div>
              <div><div style="font-size:14px;font-weight:800;">WA Exporter Pro</div><div style="font-size:11px;color:#25d366;">● Connected</div></div>
            </div>
            <span style="background:rgba(0,168,132,0.15);color:#00a884;font-size:11px;font-weight:700;padding:2px 8px;border-radius:6px;">v2.1 Pro</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:12px;"><div style="font-size:20px;font-weight:800;color:#fff;">2,450</div><div style="font-size:11px;color:#8696a0;">Total Contacts</div></div>
            <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:12px;"><div style="font-size:20px;font-weight:800;color:#25d366;">842</div><div style="font-size:11px;color:#8696a0;">Unsaved Leads</div></div>
          </div>
          <div style="background:rgba(255,255,255,0.03);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:8px;">
            <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;"><span>Kwame Mensah</span><span style="color:#25d366;font-weight:700;">+233 24 123 4567</span></div>
            <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;"><span>Sarah Jenkins</span><span style="color:#f59e0b;font-weight:700;">+1 415 555 2671</span></div>
            <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;"><span>Amara Okafor</span><span style="color:#25d366;font-weight:700;">+234 80 987 6543</span></div>
          </div>
          <div style="background:#00a884;color:#fff;border-radius:8px;padding:12px;font-weight:800;font-size:13px;text-align:center;box-shadow:0 4px 14px rgba(0,168,132,0.4);">📥 Export All 2,450 Leads Now</div>
        </div>
      </div>
    `
  }
];

const tempTilePath = path.resolve(__dirname, 'temp_tile_harness.html');

tiles.forEach(tile => {
  const fullHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>* { margin: 0; padding: 0; box-sizing: border-box; } body { width: ${tile.width}px; height: ${tile.height}px; overflow: hidden; }</style></head><body>${tile.html}</body></html>`;
  fs.writeFileSync(tempTilePath, fullHtml, 'utf8');
  const fileUrl = `file:///${tempTilePath.replace(/\\/g, '/')}`;

  const outLocal = path.join(outputDir, `${tile.name}.png`);
  const outDownloads = path.join(downloadsDir, `${tile.name}.png`);

  const cmd = `"${chromePath}" --headless --disable-gpu --hide-scrollbars --window-size=${tile.width},${tile.height} --screenshot="${outLocal}" "${fileUrl}"`;
  execSync(cmd, { stdio: 'inherit' });
  fs.copyFileSync(outLocal, outDownloads);

  console.log(`Rendered ${tile.name}.png (${tile.width}x${tile.height})`);
});

if (fs.existsSync(tempTilePath)) fs.unlinkSync(tempTilePath);
console.log('All promo tiles generated successfully!');
