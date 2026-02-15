const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MIME_OVERRIDES = { '.svg': 'image/svg+xml' };

const widgetPath = path.join(__dirname, '..', 'widget', 'chat-widget.js');

try {
  execSync('npx supabase storage rm ss:///widget/chat-widget.js --experimental --yes', { stdio: ['pipe', 'inherit', 'inherit'] });
} catch (e) {
  console.log('Note: old file not found in storage (may already be deleted). Continuing...');
}
execSync(`npx supabase storage cp ${widgetPath} ss:///widget/chat-widget.js --experimental`, { stdio: ['pipe', 'inherit', 'inherit'] });
console.log('\n✅ Widget deployed to staging.');

console.log('\nUploading client assets...');
const assetsDir = path.join(__dirname, '..', 'assets', 'clients');
if (fs.existsSync(assetsDir)) {
  for (const client of fs.readdirSync(assetsDir)) {
    const clientDir = path.join(assetsDir, client);
    if (!fs.statSync(clientDir).isDirectory()) continue;
    for (const file of fs.readdirSync(clientDir)) {
      const localPath = path.join(clientDir, file);
      const remotePath = `ss:///widget/${file}`;
      console.log(`  Uploading ${client}/${file}...`);
      try {
        execSync(`npx supabase storage rm ${remotePath} --experimental --yes`, { stdio: ['pipe', 'pipe', 'pipe'] });
      } catch (e) { /* file may not exist yet */ }
      const ext = path.extname(file).toLowerCase();
      const ctFlag = MIME_OVERRIDES[ext] ? ` --content-type ${MIME_OVERRIDES[ext]}` : '';
      execSync(`npx supabase storage cp ${localPath} ${remotePath} --experimental${ctFlag}`, { stdio: ['pipe', 'inherit', 'inherit'] });
    }
  }
}
console.log('✅ Client assets deployed to staging.');
