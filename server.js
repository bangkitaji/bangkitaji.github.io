/**
 * Kereta Cepat Whoosh - Manifest & Seat Availability Server
 * Pure Node.js HTTP Server with built-in node:sqlite (Zero npm dependencies required!)
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');
const { DatabaseSync } = require('node:sqlite');
const XLSX = require('./xlsx.full.min.js');

const PORT = process.env.PORT || 8000;
const DB_FILE = path.join(__dirname, 'whoosh.db');
const STATIC_DIR = __dirname;

const STATIONS = ['Halim', 'Karawang', 'Padalarang', 'Tegalluar'];
const SEGMENTS = [
  { id: 'HLM-KRW', name: 'Halim — Karawang', from: 0, to: 1 },
  { id: 'KRW-PDL', name: 'Karawang — Padalarang', from: 1, to: 2 },
  { id: 'PDL-TGL', name: 'Padalarang — Tegalluar', from: 2, to: 3 }
];

// Initialize SQLite Database
const db = new DatabaseSync(DB_FILE);

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_date TEXT NOT NULL,
      train_code TEXT NOT NULL,
      total_bookings INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(trip_date, train_code)
    );
    CREATE TABLE IF NOT EXISTS manifest_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL,
      booking_code TEXT,
      ticket_number TEXT,
      passenger_type TEXT,
      trip_date TEXT,
      train_code TEXT,
      car TEXT,
      seat_class TEXT,
      seat TEXT,
      route TEXT,
      origin TEXT,
      destination TEXT,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_records_trip ON manifest_records(trip_id);
    CREATE INDEX IF NOT EXISTS idx_records_car_seat ON manifest_records(trip_id, car, seat);
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

function parseRoute(routeStr) {
  if (!routeStr) return ['', ''];
  const parts = routeStr.split(/[—–\-]+/);
  if (parts.length >= 2) {
    return [parts[0].trim(), parts[1].trim()];
  }
  return [routeStr.trim(), ''];
}

function parseWorksheetRows(rows) {
  let headerRowIdx = -1;
  const keywords = ['BOOKING', 'TICKET', 'SEAT', 'CLASS', 'TRAIN', 'ROUTE', 'STAM', 'PASSENGER', 'TIKET', 'KURSI', 'KELAS'];

  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const rowStr = (rows[i] || []).map(c => String(c || '').toUpperCase()).join(' ');
    const matchCount = keywords.filter(k => rowStr.includes(k)).length;
    if (matchCount >= 3) {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) {
    for (let i = 0; i < Math.min(rows.length, 25); i++) {
      const rowStr = (rows[i] || []).map(c => String(c || '').toUpperCase()).join(' ');
      const matchCount = keywords.filter(k => rowStr.includes(k)).length;
      if (matchCount >= 2) {
        headerRowIdx = i;
        break;
      }
    }
  }

  if (headerRowIdx === -1) {
    throw new Error('Tidak dapat menemukan baris header manifest (BOOKING CODE, SEAT, CLASS, dll) pada data.');
  }

  const headerRow = rows[headerRowIdx];
  const colMap = {};
  headerRow.forEach((cell, idx) => {
    const norm = String(cell || '')
      .replace(/[\r\n]+/g, ' ')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    if (norm) {
      colMap[norm] = idx;
    }
  });

  const records = [];
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row.length) continue;
    const hasData = row.some(c => c !== undefined && c !== null && String(c).trim() !== '');
    if (!hasData) continue;

    const getVal = (keys, fallbackIdx) => {
      for (const k of keys) {
        if (colMap[k] !== undefined && row[colMap[k]] !== undefined) {
          const v = String(row[colMap[k]]).trim();
          if (v) return v;
        }
      }
      if (fallbackIdx !== undefined && row[fallbackIdx] !== undefined) {
        return String(row[fallbackIdx]).trim();
      }
      return '';
    };

    const bookingCode = getVal(['BOOKING_CODE', 'KODE_BOOKING', 'BOOKING', 'KODE'], 0);
    const ticketNo = getVal(['TICKET_NUMBER', 'TICKET_NO', 'NO_TIKET', 'TIKET', 'TICKET'], 1);
    const passType = getVal(['PASSENGER_TYPE', 'TIPE_PENUMPANG', 'TYPE'], 2) || 'Full price ticket';
    const tripDate = getVal(['TRIP_DATE', 'DATE', 'TANGGAL'], 3);
    const trainCode = getVal(['TRAIN_CODE', 'TRAIN', 'NO_KA', 'KERETA'], 4);
    let car = getVal(['STAMFFORM_CODE', 'STAMFORM_CODE', 'STAFFORM_CODE', 'STAMFORM', 'CAR', 'GERBONG'], 5) || '01';
    if (car.length === 1) car = '0' + car;
    const seatClass = getVal(['CLASS', 'KELAS'], 6) || 'Premium Economy Class';
    const seat = getVal(['SEAT', 'KURSI', 'NO_KURSI'], 7);
    const route = getVal(['ROUTE', 'RUTE', 'RELASI'], 8) || 'Halim—Tegalluar';
    const [origin, dest] = parseRoute(route);

    if (seat || bookingCode) {
      records.push({
        bookingCode,
        ticketNo,
        passType,
        tripDate,
        trainCode,
        car,
        seatClass,
        seat,
        route,
        origin,
        dest
      });
    }
  }

  return { headerRowIdx, colMap, records };
}

function saveRecordsToTrip(records) {
  if (!records || !records.length) {
    throw new Error('Tidak ada catatan penumpang yang valid dalam file manifest.');
  }

  const first = records[0];
  const tripDate = first.tripDate || '04/09/2026';
  const trainCode = first.trainCode || 'G1043';

  // Check if trip already exists
  const checkStmt = db.prepare('SELECT id FROM trips WHERE trip_date = ? AND train_code = ?');
  const existing = checkStmt.get(tripDate, trainCode);

  let tripId;
  if (existing) {
    tripId = existing.id;
    db.prepare('DELETE FROM manifest_records WHERE trip_id = ?').run(tripId);
    db.prepare('UPDATE trips SET total_bookings = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?').run(records.length, tripId);
  } else {
    const insertTrip = db.prepare('INSERT INTO trips (trip_date, train_code, total_bookings) VALUES (?, ?, ?)');
    const res = insertTrip.run(tripDate, trainCode, records.length);
    tripId = res.lastInsertRowid;
  }

  const insertRecord = db.prepare(`
    INSERT INTO manifest_records (
      trip_id, booking_code, ticket_number, passenger_type,
      trip_date, train_code, car, seat_class, seat, route, origin, destination
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec('BEGIN TRANSACTION;');
  try {
    for (const r of records) {
      insertRecord.run(
        tripId,
        r.bookingCode,
        r.ticketNo,
        r.passType,
        r.tripDate || tripDate,
        r.trainCode || trainCode,
        r.car,
        r.seatClass,
        r.seat,
        r.route,
        r.origin,
        r.dest
      );
    }
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return { tripId, tripDate, trainCode, totalRecords: records.length };
}

function importExcel(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  if (!wb.SheetNames || !wb.SheetNames.length) {
    throw new Error('File Excel tidak memiliki lembar kerja (worksheet).');
  }
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false, dateNF: 'dd/mm/yyyy' });
  const { records } = parseWorksheetRows(rawRows);
  return saveRecordsToTrip(records);
}

function importCSV(csvText) {
  try {
    const wb = XLSX.read(csvText, { type: 'string' });
    if (wb.SheetNames && wb.SheetNames.length) {
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false, dateNF: 'dd/mm/yyyy' });
      const { records } = parseWorksheetRows(rawRows);
      if (records.length > 0) {
        return saveRecordsToTrip(records);
      }
    }
  } catch (_) {}

  // Fallback if SheetJS string parse failed
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    throw new Error('Data CSV kosong atau tidak memiliki baris data.');
  }

  let headerIdx = 0;
  const keywords = ['BOOKING', 'TICKET', 'SEAT', 'CLASS', 'TRAIN', 'ROUTE', 'STAM', 'PASSENGER', 'TIKET', 'KURSI', 'KELAS'];
  for (let i = 0; i < Math.min(lines.length, 25); i++) {
    const lUpper = lines[i].toUpperCase();
    const count = keywords.filter(k => lUpper.includes(k)).length;
    if (count >= 2) {
      headerIdx = i;
      break;
    }
  }

  const delimiter = lines[headerIdx].includes(';') ? ';' : ',';
  const headers = lines[headerIdx].split(delimiter).map(h => 
    h.replace(/[\r\n]+/g, ' ').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
  );

  const rawRows = [];
  rawRows.push(headers);
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
    if (cols.length >= 3) {
      rawRows.push(cols);
    }
  }

  const { records } = parseWorksheetRows(rawRows);
  return saveRecordsToTrip(records);
}

function seedInitialData() {
  const seeded = db.prepare("SELECT value FROM settings WHERE key = 'initialized'").get();
  if (!seeded) {
    const csvPath = path.join(__dirname, 'manifest_data.csv');
    if (fs.existsSync(csvPath)) {
      const content = fs.readFileSync(csvPath, 'utf-8');
      const res = importCSV(content);
      console.log(`[*] Manifest awal Whoosh berhasil diimport: ${res.trainCode} (${res.tripDate}) - ${res.totalRecords} penumpang.`);
    }
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('initialized', '1')").run();
  }
}

// MIME Types map
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function sendJson(res, data, status = 200) {
  const jsonStr = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(jsonStr),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
  });
  res.end(jsonStr);
}

const server = http.createServer((req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
    });
    return res.end();
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  // API Endpoints
  if (pathname === '/api/trips' && req.method === 'GET') {
    const trips = db.prepare('SELECT id, trip_date, train_code, total_bookings, created_at FROM trips ORDER BY created_at DESC').all();
    return sendJson(res, { trips });
  }

  if (pathname === '/api/manifest' && req.method === 'GET') {
    let trip;
    if (query.trip_id) {
      trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(query.trip_id);
    } else if (query.date && query.train) {
      trip = db.prepare('SELECT * FROM trips WHERE trip_date = ? AND train_code = ?').get(query.date, query.train);
    } else {
      trip = db.prepare('SELECT * FROM trips ORDER BY created_at DESC LIMIT 1').get();
    }

    if (!trip) {
      return sendJson(res, { error: 'Jadwal perjalanan tidak ditemukan.' }, 404);
    }

    const records = db.prepare(`
      SELECT id, booking_code, ticket_number, passenger_type, trip_date, train_code,
             car, seat_class, seat, route, origin, destination
      FROM manifest_records
      WHERE trip_id = ?
    `).all(trip.id);

    return sendJson(res, {
      trip,
      records,
      stations: STATIONS,
      segments: SEGMENTS
    });
  }

  if (pathname === '/api/upload' && req.method === 'POST') {
    const chunks = [];
    let totalLength = 0;
    req.on('data', chunk => {
      chunks.push(chunk);
      totalLength += chunk.length;
      if (totalLength > 50 * 1024 * 1024) { // 50MB max
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        const rawBuffer = Buffer.concat(chunks);
        const contentType = req.headers['content-type'] || '';
        let result;

        if (contentType.includes('application/json')) {
          const parsed = JSON.parse(rawBuffer.toString('utf-8'));
          if (parsed.excel_base64) {
            const buf = Buffer.from(parsed.excel_base64, 'base64');
            result = importExcel(buf);
          } else {
            result = importCSV(parsed.csv_text || '');
          }
        } else {
          // Check for Excel magic bytes (PK\x03\x04 for .xlsx or \xD0\xCF\x11\xE0 for .xls)
          const isZip = rawBuffer.length >= 4 && rawBuffer[0] === 0x50 && rawBuffer[1] === 0x4B;
          const isOldXls = rawBuffer.length >= 4 && rawBuffer[0] === 0xD0 && rawBuffer[1] === 0xCF;

          if (isZip || isOldXls) {
            result = importExcel(rawBuffer);
          } else {
            // Text CSV fallback
            let bodyStr = rawBuffer.toString('utf-8');
            if (contentType.includes('multipart/form-data')) {
              const headerEnd = bodyStr.indexOf('\r\n\r\n');
              if (headerEnd !== -1) {
                const rawContent = bodyStr.slice(headerEnd + 4);
                const boundaryEnd = rawContent.lastIndexOf('\r\n--');
                bodyStr = boundaryEnd !== -1 ? rawContent.slice(0, boundaryEnd) : rawContent;
              }
            }
            result = importCSV(bodyStr);
          }
        }

        return sendJson(res, {
          success: true,
          message: `Manifest ${result.trainCode} (${result.tripDate}) berhasil disimpan ke database SQLite!`,
          trip_id: result.tripId,
          trip_date: result.tripDate,
          train_code: result.trainCode,
          total_records: result.totalRecords
        });
      } catch (err) {
        return sendJson(res, { success: false, error: err.message }, 400);
      }
    });
    return;
  }

  if (pathname === '/api/trip' && req.method === 'DELETE') {
    const tripId = query.id;
    if (!tripId) {
      return sendJson(res, { error: 'Parameter ID diperlukan.' }, 400);
    }
    db.prepare('DELETE FROM manifest_records WHERE trip_id = ?').run(tripId);
    db.prepare('DELETE FROM trips WHERE id = ?').run(tripId);
    return sendJson(res, { success: true, message: `Data trip ID ${tripId} berhasil dihapus.` });
  }

  if (pathname === '/api/flush' && (req.method === 'POST' || req.method === 'DELETE')) {
    try {
      db.prepare('DELETE FROM manifest_records').run();
      db.prepare('DELETE FROM trips').run();
      try {
        db.prepare('DELETE FROM sqlite_sequence WHERE name IN ("trips", "manifest_records")').run();
      } catch (_) {}

      const reseed = query.reseed === 'true' || query.reseed === '1';
      console.log('FLUSH DEBUG:', { query, reseed });
      if (reseed) {
        const csvPath = path.join(__dirname, 'manifest_data.csv');
        console.log('FLUSH CSV PATH:', csvPath, fs.existsSync(csvPath));
        if (fs.existsSync(csvPath)) {
          const content = fs.readFileSync(csvPath, 'utf-8');
          const resSeed = importCSV(content);
          return sendJson(res, {
            success: true,
            message: `Database berhasil di-flush dan di-reset ke manifest bawaan (${resSeed.trainCode} • ${resSeed.tripDate}, ${resSeed.totalRecords} penumpang).`,
            reseeded: true,
            trip_id: resSeed.tripId
          });
        }
      }

      return sendJson(res, {
        success: true,
        message: 'Database berhasil dikosongkan (flushed) secara total. Siap untuk upload data baru!',
        reseeded: false
      });
    } catch (err) {
      return sendJson(res, { success: false, error: err.message }, 500);
    }
  }

  // Static File Serving
  let filePath = path.join(STATIC_DIR, pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath).toLowerCase();

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found');
    }

    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

initDb();
seedInitialData();

server.listen(PORT, () => {
  console.log('======================================================');
  console.log('🚄 KERETA CEPAT WHOOSH - SEAT MANIFEST VISUALIZER');
  console.log(`🌐 Server aktif di: http://localhost:${PORT}`);
  console.log(`💾 Database SQLite: ${DB_FILE}`);
  console.log('======================================================');
});
