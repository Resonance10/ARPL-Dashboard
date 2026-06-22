import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAIN_DATA_FILE = path.join(__dirname, 'local_data', 'main.json');
const UPLOADS_DIR = path.join(__dirname, 'local_data', 'uploads');

const OLD_SERVER = 'http://192.168.7.65:3002';

async function migrate() {
  console.log(`Fetching data from ${OLD_SERVER}/api/data ...`);
  let oldData;
  try {
    const res = await fetch(`${OLD_SERVER}/api/data`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    oldData = await res.json();
    console.log('  Received keys:', Object.keys(oldData).join(', '));
  } catch (e) {
    console.error('  Failed to fetch from old server:', e.message);
    console.log('  Make sure the old server is running at', OLD_SERVER);
    process.exit(1);
  }

  // Read current main.json
  let current = {};
  if (fs.existsSync(MAIN_DATA_FILE)) {
    try {
      current = JSON.parse(fs.readFileSync(MAIN_DATA_FILE, 'utf8'));
    } catch { /* ignore */ }
  }

  // Merge old data into current (old takes precedence for non-empty arrays)
  for (const key of Object.keys(oldData)) {
    if (Array.isArray(oldData[key]) && oldData[key].length > 0) {
      if (!current[key] || current[key].length === 0) {
        current[key] = oldData[key];
        console.log(`  Migrated ${key}: ${oldData[key].length} items`);
      } else {
        console.log(`  Skipped ${key}: already has ${current[key].length} items`);
      }
    } else if (typeof oldData[key] === 'object' && oldData[key] !== null && !Array.isArray(key)) {
      if (!current[key] || Object.keys(current[key]).length === 0) {
        current[key] = oldData[key];
        console.log(`  Migrated ${key}`);
      }
    }
  }

  // Write merged data
  fs.writeFileSync(MAIN_DATA_FILE, JSON.stringify(current, null, 2), 'utf8');
  console.log('\n✓ Data written to local_data/main.json');

  // --- Migrate uploaded files ---
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  // Collect all referenced filenames from the data
  const referencedFiles = new Set();
  for (const wo of (current.workOrders || [])) {
    if (wo.poFileName) referencedFiles.add(wo.poFileName);
  }
  for (const po of (current.poRequests || [])) {
    if (po.fileName) referencedFiles.add(po.fileName);
  }
  for (const prog of (current.programs || [])) {
    if (prog.fileName) referencedFiles.add(prog.fileName);
  }

  if (referencedFiles.size > 0) {
    console.log(`\nDownloading ${referencedFiles.size} referenced files from ${OLD_SERVER}/uploads/ ...`);
    let downloaded = 0;
    for (const fileName of referencedFiles) {
      const dest = path.join(UPLOADS_DIR, fileName);
      if (fs.existsSync(dest)) {
        console.log(`  Skipped ${fileName} (already exists)`);
        continue;
      }
      try {
        const res = await fetch(`${OLD_SERVER}/uploads/${encodeURIComponent(fileName)}`);
        if (res.ok) {
          const buffer = Buffer.from(await res.arrayBuffer());
          fs.writeFileSync(dest, buffer);
          downloaded++;
          console.log(`  Downloaded ${fileName}`);
        } else {
          console.log(`  Not found on old server: ${fileName}`);
        }
      } catch (e) {
        console.log(`  Error downloading ${fileName}: ${e.message}`);
      }
    }
    console.log(`\n✓ Downloaded ${downloaded} files to local_data/uploads/`);
  }

  console.log('\n=== Migration complete ===');
  console.log(`Start the server with: node server.js`);
}

migrate().catch(console.error);
