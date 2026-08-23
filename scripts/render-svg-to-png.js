const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const svgPath = path.resolve(__dirname, '..', 'icons', 'logo.svg');
const iconsDir = path.resolve(__dirname, '..', 'icons');
const tempHtmlPath = path.resolve(__dirname, 'temp_render.html');

const svgContent = fs.readFileSync(svgPath, 'utf8');

const sizes = [16, 32, 48, 128];

sizes.forEach(size => {
  const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: ${size}px;
      height: ${size}px;
      overflow: hidden;
      background: transparent;
    }
    svg {
      width: ${size}px;
      height: ${size}px;
      display: block;
    }
  </style>
</head>
<body>
  ${svgContent}
</body>
</html>`;

  fs.writeFileSync(tempHtmlPath, html, 'utf8');
  const outPng = path.join(iconsDir, `icon${size}.png`);
  const fileUrl = `file:///${tempHtmlPath.replace(/\\/g, '/')}`;

  const cmd = `"${chromePath}" --headless --disable-gpu --default-background-color=00000000 --hide-scrollbars --window-size=${size},${size} --screenshot="${outPng}" "${fileUrl}"`;
  
  execSync(cmd, { stdio: 'inherit' });
  console.log(`Rendered icon${size}.png (${size}x${size})`);
});

if (fs.existsSync(tempHtmlPath)) {
  fs.unlinkSync(tempHtmlPath);
}

console.log('All icons generated successfully!');
