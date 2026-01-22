const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (!key) continue;
    const value = rest.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(path.join(process.cwd(), '.env'));

const token = process.env.CLOUDFLARE_API_TOKEN;
if (!token) {
  console.error('CLOUDFLARE_API_TOKEN not set');
  process.exit(1);
}

const query = `
query ($name: String!) {
  __type(name: $name) {
    name
    enumValues { name }
  }
}
`;

async function run() {
  const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables: { name: 'HttpRequestsAdaptiveGroupsOrderBy' } }),
  });
  const data = await res.json();
  if (data.errors) {
    console.error(JSON.stringify(data.errors, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(data, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
