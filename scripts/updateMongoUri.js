const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');

function convertSrvToDirectHosts(srvUri) {
  const match = srvUri.match(/^mongodb\+srv:\/\/(.+?):(.+?)@([^\/]+)\/(.+?)(\?.*)?$/);
  if (!match) {
    return null;
  }
  const [, username, password, /* hostFromSrv */, database /*, query*/] = match;

  // Hosts and options discovered via DNS queries
  const hosts = [
    'ac-mwsuaad-shard-00-00.okjmkgy.mongodb.net:27017',
    'ac-mwsuaad-shard-00-01.okjmkgy.mongodb.net:27017',
    'ac-mwsuaad-shard-00-02.okjmkgy.mongodb.net:27017',
  ];
  const opts = 'replicaSet=atlas-cjj7ki-shard-0&authSource=admin&ssl=true';

  const encodedUser = encodeURIComponent(username);
  const encodedPass = encodeURIComponent(password);

  return `mongodb://${encodedUser}:${encodedPass}@${hosts.join(',')}/${database}?${opts}`;
}

function run() {
  if (!fs.existsSync(envPath)) {
    console.error('No .env file found at', envPath);
    process.exit(1);
  }
  const original = fs.readFileSync(envPath, 'utf8');
  const lines = original.split(/\r?\n/);
  let changed = false;
  const newLines = lines.map((line) => {
    if (!line.startsWith('MONGO_URI=')) return line;
    const value = line.slice('MONGO_URI='.length);
    const newUri = convertSrvToDirectHosts(value);
    if (!newUri) {
      console.log('MONGO_URI is not an SRV URI; no change made.');
      return line;
    }
    changed = true;
    return `MONGO_URI=${newUri}`;
  });

  if (!changed) {
    console.log('No changes needed.');
    return;
  }

  fs.writeFileSync(envPath, newLines.join('\n'));
  console.log('Updated MONGO_URI to non-SRV multi-host format.');
}

run();


