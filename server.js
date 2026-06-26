import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = 5001;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://127.0.0.1:3000', 'https://localhost:5173', 'https://localhost:5174', 'https://127.0.0.1:5173', 'https://127.0.0.1:5174'] }));
app.use(express.json({ limit: '50mb' }));

// ─── Directories ────────────────────────────────────────────────────────────
const LOCAL_DATA = path.join(__dirname, 'local_data');
const UPLOADS_DIR = path.join(LOCAL_DATA, 'uploads');
const MAIN_DATA_FILE = path.join(LOCAL_DATA, 'main.json');

// EOL/PDI data files
const DATA_FILE = path.join(LOCAL_DATA, 'reports.json');
const GOLDEN_FILE = path.join(LOCAL_DATA, 'goldenSamples.json');
const QI_REF_FILE = path.join(LOCAL_DATA, 'qiPdiRefSamples.json');
const QI_REPORTS_FILE = path.join(LOCAL_DATA, 'qiPdiReports.json');
const MOTORS_FILE = path.join(LOCAL_DATA, 'motors.json');
const EOL_FILES = [DATA_FILE, GOLDEN_FILE, QI_REF_FILE, QI_REPORTS_FILE, MOTORS_FILE];

// Ensure directories and files exist
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const fileLocks = new Map();
const lockFile = async (file) => {
    while (fileLocks.get(file)) {
        await new Promise(r => setTimeout(r, 10));
    }
    fileLocks.set(file, true);
};
const unlockFile = (file) => { fileLocks.delete(file); };

const readJson = (file, defaultVal = {}) => {
    try {
        if (!fs.existsSync(file)) return defaultVal;
        const content = fs.readFileSync(file, 'utf8').trim();
        if (!content) return defaultVal;
        const parsed = JSON.parse(content);
        // If default is an array but parsed is not, return default to prevent .push() crashes
        if (Array.isArray(defaultVal) && !Array.isArray(parsed)) return defaultVal;
        return parsed;
    } catch { return defaultVal; }
};

const writeJson = (file, data) => {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
};

const ensureFile = (file, defaultData = []) => {
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify(defaultData, null, 2), 'utf8');
    }
};

EOL_FILES.forEach(f => ensureFile(f));

// Ensure main.json has all default keys (merges missing keys without overwriting existing data)
const DEFAULT_MAIN = {
    programs: [],
    workOrders: [],
    vendors: [],
    parts: [],
    poRequests: [],
    traceability: [],
    deliveryPlanning: [],
    users: [],
    subscriptions: {},
    permissions: {},
    notifications: [],
    stats: {}
};

if (!fs.existsSync(MAIN_DATA_FILE)) {
    writeJson(MAIN_DATA_FILE, DEFAULT_MAIN);
} else {
    const existing = readJson(MAIN_DATA_FILE);
    let needsUpdate = false;
    for (const key of Object.keys(DEFAULT_MAIN)) {
        if (!(key in existing)) {
            existing[key] = DEFAULT_MAIN[key];
            needsUpdate = true;
        }
    }
    if (needsUpdate) writeJson(MAIN_DATA_FILE, existing);
}

// Migrate data from legacy db.json if it exists and main.json is empty
const migrateFromDbJson = () => {
    const dbJson = path.join(__dirname, 'db.json');
    if (fs.existsSync(dbJson)) {
        try {
            const content = fs.readFileSync(dbJson, 'utf8').trim();
            const legacy = content ? JSON.parse(content) : {};
            const current = readJson(MAIN_DATA_FILE);
            const hasData = current && current.programs && current.programs.length > 0;
            if (!hasData) {
                const merged = { ...DEFAULT_MAIN };
                let migrated = false;
                for (const key of Object.keys(DEFAULT_MAIN)) {
                    if (legacy[key] && Array.isArray(legacy[key]) && legacy[key].length > 0) {
                        merged[key] = legacy[key];
                        migrated = true;
                    }
                }
                writeJson(MAIN_DATA_FILE, merged);
                if (migrated) console.log('Migrated data from db.json to local_data/main.json');
            }
        } catch (e) {
            console.warn('Could not migrate db.json:', e.message);
        }
    }
};

migrateFromDbJson();

// Serve uploaded files
app.use('/uploads', (req, res, next) => {
    const filePath = decodeURIComponent(req.path);
    const fullPath = path.resolve(path.join(UPLOADS_DIR, filePath));
    if (!fullPath.startsWith(path.resolve(UPLOADS_DIR))) {
        return res.status(403).json({ error: 'Access denied' });
    }
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        return res.sendFile(fullPath);
    }
    res.status(404).json({ error: 'File not found' });
});

// ─── Multer for file uploads (main app) ─────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

// ============================================================================
// MAIN APP DATA ENDPOINTS
// ============================================================================

// GET /api/data — return everything from main.json
app.get('/api/data', (req, res) => {
    try {
        const data = readJson(MAIN_DATA_FILE);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to load data' });
    }
});

// POST /api/save — store a specific key or full update
app.post('/api/save', (req, res) => {
    try {
        const data = readJson(MAIN_DATA_FILE);
        const body = req.body;

        const mergeByKey = (existing, incoming) => {
            if (!Array.isArray(existing) || !Array.isArray(incoming)) return incoming;
            const map = new Map();
            // Index existing items by ID (items without IDs get numeric temp keys)
            let tempIdx = 0;
            existing.forEach(item => {
                if (item && item.id != null) map.set(`id_${item.id}`, item);
                else map.set(`temp_${tempIdx++}`, item);
            });
            // Merge incoming items (update existing or add new)
            incoming.forEach(item => {
                if (item && item.id != null) map.set(`id_${item.id}`, item);
                else map.set(`temp_${tempIdx++}`, item);
            });
            return [...map.values()];
        };

        if (body.key && body.data !== undefined) {
            const existing = data[body.key];
            data[body.key] = mergeByKey(existing, body.data);
        } else {
            for (const key of Object.keys(body)) {
                if (key !== 'updatedAt' && key !== 'source') {
                    data[key] = mergeByKey(data[key], body[key]);
                }
            }
        }
        writeJson(MAIN_DATA_FILE, data);
        res.json({ status: 'success' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// POST /api/upload — file upload
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ fileName: req.file.filename });
});

// POST /api/subscribe — push notification subscription
app.post('/api/subscribe', (req, res) => {
    try {
        const data = readJson(MAIN_DATA_FILE);
        if (!data.subscriptions) data.subscriptions = {};
        const { userId, subscription } = req.body;
        if (userId && subscription) {
            data.subscriptions[userId] = subscription;
            writeJson(MAIN_DATA_FILE, data);
        }
        res.status(201).json({});
    } catch (err) {
        res.status(500).json({ error: 'Could not save subscription' });
    }
});

// POST /api/notify — trigger notification
app.post('/api/notify', (req, res) => {
    // Store notification in main.json for in-app display
    try {
        const data = readJson(MAIN_DATA_FILE);
        if (!data.notifications) data.notifications = [];
        const { userId, title, body: msgBody } = req.body;
        if (title) {
            data.notifications.push({
                id: Date.now(),
                userId: userId || 'broadcast',
                title,
                body: msgBody || '',
                timestamp: new Date().toISOString(),
                read: false
            });
            writeJson(MAIN_DATA_FILE, data);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to send notification' });
    }
});

// ============================================================================
// GOLDEN SAMPLES ENDPOINTS
// ============================================================================

app.get('/api/golden-samples', (req, res) => res.json(readJson(GOLDEN_FILE, [])));

app.post('/api/golden-samples', (req, res) => {
    try {
        const items = readJson(GOLDEN_FILE, []);
        const newItem = { id: Date.now(), ...req.body };
        items.push(newItem);
        writeJson(GOLDEN_FILE, items);
        res.status(201).json(newItem);
    } catch (err) {
        res.status(500).json({ error: 'Failed to save golden sample' });
    }
});

app.put('/api/golden-samples/:id', (req, res) => {
    try {
        const items = readJson(GOLDEN_FILE, []);
        const id = parseInt(req.params.id, 10);
        const idx = items.findIndex(item => item.id === id);
        if (idx !== -1) {
            items[idx] = { ...items[idx], ...req.body, id };
            writeJson(GOLDEN_FILE, items);
            return res.json(items[idx]);
        }
        res.status(404).json({ message: 'Golden sample not found' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update golden sample' });
    }
});

app.delete('/api/golden-samples/:id', (req, res) => {
    try {
        let items = readJson(GOLDEN_FILE, []);
        const id = parseInt(req.params.id, 10);
        items = items.filter(item => item.id !== id);
        writeJson(GOLDEN_FILE, items);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete golden sample' });
    }
});

// ============================================================================
// QI/PDI REFERENCES ENDPOINTS
// ============================================================================

app.get('/api/qi-pdi-ref', (req, res) => res.json(readJson(QI_REF_FILE, [])));

app.post('/api/qi-pdi-ref', (req, res) => {
    try {
        const items = readJson(QI_REF_FILE, []);
        const newItem = { id: Date.now(), ...req.body };
        items.push(newItem);
        writeJson(QI_REF_FILE, items);
        res.status(201).json(newItem);
    } catch (err) {
        res.status(500).json({ error: 'Failed to save QI/PDI reference' });
    }
});

app.put('/api/qi-pdi-ref/:id', (req, res) => {
    try {
        const items = readJson(QI_REF_FILE, []);
        const id = parseInt(req.params.id, 10);
        const idx = items.findIndex(item => item.id === id);
        if (idx !== -1) {
            items[idx] = { ...items[idx], ...req.body, id };
            writeJson(QI_REF_FILE, items);
            return res.json(items[idx]);
        }
        res.status(404).json({ message: 'QI/PDI reference not found' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update QI/PDI reference' });
    }
});

app.delete('/api/qi-pdi-ref/:id', (req, res) => {
    try {
        let items = readJson(QI_REF_FILE, []);
        const id = parseInt(req.params.id, 10);
        items = items.filter(item => item.id !== id);
        writeJson(QI_REF_FILE, items);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete QI/PDI reference' });
    }
});

// ============================================================================
// QI/PDI REPORTS ENDPOINTS
// ============================================================================

app.get('/api/qi-pdi-reports', (req, res) => res.json(readJson(QI_REPORTS_FILE, [])));

app.post('/api/qi-pdi-reports', (req, res) => {
    try {
        const items = readJson(QI_REPORTS_FILE, []);
        const newItem = { id: Date.now(), ...req.body };
        items.push(newItem);
        writeJson(QI_REPORTS_FILE, items);
        res.status(201).json(newItem);
    } catch (err) {
        res.status(500).json({ error: 'Failed to save QI/PDI report' });
    }
});

app.put('/api/qi-pdi-reports/:id', (req, res) => {
    try {
        const items = readJson(QI_REPORTS_FILE, []);
        const id = parseInt(req.params.id, 10);
        const idx = items.findIndex(item => item.id === id);
        if (idx !== -1) {
            items[idx] = { ...items[idx], ...req.body, id };
            writeJson(QI_REPORTS_FILE, items);
            return res.json(items[idx]);
        }
        res.status(404).json({ message: 'QI/PDI report not found' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update QI/PDI report' });
    }
});

// ============================================================================
// MOTORS ENDPOINTS
// ============================================================================

app.get('/api/motors', (req, res) => res.json(readJson(MOTORS_FILE, [])));

app.post('/api/motors', (req, res) => {
    try {
        const items = readJson(MOTORS_FILE, []);
        const newItem = { id: Date.now(), ...req.body };
        items.push(newItem);
        writeJson(MOTORS_FILE, items);
        res.status(201).json(newItem);
    } catch (err) {
        res.status(500).json({ error: 'Failed to save motor' });
    }
});

app.put('/api/motors/:id', (req, res) => {
    try {
        const items = readJson(MOTORS_FILE, []);
        const id = parseInt(req.params.id, 10);
        const idx = items.findIndex(item => item.id === id);
        if (idx !== -1) {
            items[idx] = { ...items[idx], ...req.body, id };
            writeJson(MOTORS_FILE, items);
            return res.json(items[idx]);
        }
        res.status(404).json({ message: 'Motor not found' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update motor' });
    }
});

// ============================================================================
// ORIGINAL REPORTS ENDPOINTS (with file uploads)
// ============================================================================

const eolStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const eolUpload = multer({ storage: eolStorage, limits: { fileSize: 100 * 1024 * 1024 } });

app.post('/api/reports', eolUpload.fields([
    { name: 'torqueSpeed', maxCount: 1 },
    { name: 'backEmf', maxCount: 1 }
]), (req, res) => {
    try {
        let metadata = {};
        if (req.body.report) metadata = JSON.parse(req.body.report);
        else if (req.body.metadata) metadata = JSON.parse(req.body.metadata);
        else throw new Error('No metadata or report field found in request');

        // Reject non-object payloads and strip server-controlled keys so a client
        // cannot override id/files/timestamps or inject arbitrary nested structures.
        if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) {
            throw new Error('Report metadata must be an object');
        }
        const RESERVED_KEYS = ['id', 'files', 'timestamp', 'torqueSpeedFilePresent', 'backEmfFilePresent'];
        RESERVED_KEYS.forEach(k => { delete metadata[k]; });

        const newReport = {
            id: Date.now(),
            ...metadata,
            torqueSpeedFilePresent: !!req.files?.torqueSpeed,
            backEmfFilePresent: !!req.files?.backEmf,
            files: {
                torqueSpeed: req.files['torqueSpeed'] ? req.files['torqueSpeed'][0].path : null,
                backEmf: req.files['backEmf'] ? req.files['backEmf'][0].path : null
            },
            timestamp: new Date().toISOString()
        };

        const reports = readJson(DATA_FILE, []);
        reports.push(newReport);
        writeJson(DATA_FILE, reports);

        res.status(201).json({ ok: true, message: 'Report saved successfully!', reportId: newReport.id });
    } catch (error) {
        res.status(500).json({ ok: false, error: 'Failed to save report data locally.' });
    }
});

app.get('/api/reports', (req, res) => {
    try {
        const reports = readJson(DATA_FILE, []);
        const clean = reports.map(({ files, ...rest }) => rest);
        res.json({ ok: true, data: clean });
    } catch {
        res.status(500).json({ ok: false, error: 'Failed to load reports' });
    }
});

app.get('/api/reports/:id', (req, res) => {
    try {
        const reports = readJson(DATA_FILE, []);
        const report = reports.find(r => r.id === parseInt(req.params.id, 10));
        if (!report) return res.status(404).json({ ok: false, error: 'Report not found' });
        const { files, ...rest } = report;
        res.json({ ok: true, data: rest });
    } catch {
        res.status(500).json({ ok: false, error: 'Failed to load report' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend API running on port ${PORT}`);
    console.log(`Data stored in: ${LOCAL_DATA}`);
});
