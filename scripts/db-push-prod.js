const { execSync } = require('child_process');

try {
  execSync('npx supabase link --project-ref rukppthsduuvsfjynfmw', { stdio: ['pipe', 'inherit', 'inherit'] });
  execSync('npx supabase db push', { stdio: ['pipe', 'inherit', 'inherit'] });
  console.log('\n✅ Database pushed to production.');
} finally {
  execSync('npx supabase link --project-ref wbgdpxogtpqijkqyaeke', { stdio: ['pipe', 'inherit', 'inherit'] });
}
