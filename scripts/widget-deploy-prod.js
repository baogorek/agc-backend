const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const widgetPath = path.join(__dirname, '..', 'widget', 'chat-widget.js');
const content = fs.readFileSync(widgetPath, 'utf8');
const prodContent = content.replace(/wbgdpxogtpqijkqyaeke/g, 'rukppthsduuvsfjynfmw');

// Use project-local temp file (Supabase CLI doesn't handle Windows temp paths)
const tmpFile = path.join(__dirname, '..', '.chat-widget-prod.js');
fs.writeFileSync(tmpFile, prodContent);

try {
  execSync('npx supabase link --project-ref rukppthsduuvsfjynfmw', { stdio: ['pipe', 'inherit', 'inherit'] });
  // Remove old file (ignore errors if it doesn't exist)
  try {
    execSync('npx supabase storage rm ss:///widget/chat-widget.js --experimental --yes', { stdio: ['pipe', 'inherit', 'inherit'] });
  } catch (e) {
    console.log('Note: old file not found in storage (may already be deleted). Continuing...');
  }
  execSync(`npx supabase storage cp .chat-widget-prod.js ss:///widget/chat-widget.js --experimental`, { stdio: ['pipe', 'inherit', 'inherit'] });
  console.log('\n✅ Widget deployed to production.');
} finally {
  execSync('npx supabase link --project-ref wbgdpxogtpqijkqyaeke', { stdio: ['pipe', 'inherit', 'inherit'] });
  try { fs.unlinkSync(tmpFile); } catch (e) { /* ignore */ }
}
