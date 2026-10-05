/**
 * Deploy InkNova on VPS: git pull, build, pm2 restart.
 * Env: VPS_HOST, VPS_USER, VPS_PASS
 */
import { Client } from 'ssh2';

const host = process.env.VPS_HOST;
const username = process.env.VPS_USER;
const password = process.env.VPS_PASS;

if (!host || !username || !password) {
  console.error('Set VPS_HOST, VPS_USER, VPS_PASS');
  process.exit(1);
}

const remoteScript = `set -e
cd /var/www/inknova
git pull origin main
pnpm install --frozen-lockfile
pnpm build
pm2 restart inknova-api
pm2 save
echo Deploy done.
`;

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = '';
      let errOut = '';
      stream
        .on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`exit ${code}\n${errOut}\n${out}`));
          } else resolve(out);
        })
        .on('data', (d) => {
          out += d.toString();
          process.stdout.write(d);
        });
      stream.stderr.on('data', (d) => {
        errOut += d.toString();
        process.stderr.write(d);
      });
    });
  });
}

const conn = new Client();
conn
  .on('ready', async () => {
    try {
      await exec(conn, remoteScript);
      conn.end();
    } catch (e) {
      console.error(e);
      conn.end();
      process.exit(1);
    }
  })
  .on('error', (e) => {
    console.error(e);
    process.exit(1);
  })
  .connect({
    host,
    port: 22,
    username,
    password,
    readyTimeout: 30_000,
  });
