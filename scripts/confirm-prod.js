const readline = require('readline');
const { execSync } = require('child_process');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

console.log('\n⚠️  You are about to deploy to PRODUCTION.');
rl.question('Continue? (y/N) ', (answer) => {
  rl.close();
  process.stdin.destroy();
  if (answer !== 'y') {
    console.log('Aborted.');
    process.exit(1);
  }
  const cmd = process.argv.slice(2).join(' ');
  execSync(cmd, { stdio: ['pipe', 'inherit', 'inherit'] });
});
