const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MIME_OVERRIDES = { '.svg': 'image/svg+xml' };

const widgetPath = path.join(__dirname, '..', 'widget', 'chat-widget.js');
const content = fs.readFileSync(widgetPath, 'utf8');
const prodContent = content.replace(/wbgdpxogtpqijkqyaeke/g, 'rukppthsduuvsfjynfmw');

const tmpFile = path.join(__dirname, '..', '.chat-widget-prod.js');
fs.writeFileSync(tmpFile, prodContent);

function uploadClientAssets() {
  const assetsDir = path.join(__dirname, '..', 'assets', 'clients');
  if (!fs.existsSync(assetsDir)) return;
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

try {
  execSync('npx supabase link --project-ref rukppthsduuvsfjynfmw', { stdio: ['pipe', 'inherit', 'inherit'] });

  try {
    execSync('npx supabase storage rm ss:///widget/chat-widget.js --experimental --yes', { stdio: ['pipe', 'inherit', 'inherit'] });
  } catch (e) {
    console.log('Note: old file not found in storage (may already be deleted). Continuing...');
  }
  execSync(`npx supabase storage cp .chat-widget-prod.js ss:///widget/chat-widget.js --experimental`, { stdio: ['pipe', 'inherit', 'inherit'] });
  console.log('\n✅ Widget deployed to production.');

  console.log('\nUploading client assets...');
  uploadClientAssets();
  console.log('✅ Client assets deployed to production.');
} finally {
  execSync('npx supabase link --project-ref wbgdpxogtpqijkqyaeke', { stdio: ['pipe', 'inherit', 'inherit'] });
  try { fs.unlinkSync(tmpFile); } catch (e) { /* ignore */ }
}
