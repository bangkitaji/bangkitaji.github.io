/**
 * Whoosh Seat Manifest & Layout Visualizer
 * Pure JavaScript Frontend Logic
 */

// Station and Track Segment definitions
const STATIONS = ['Halim', 'Karawang', 'Padalarang', 'Tegalluar'];
const SEGMENT_DEFINITIONS = [
  { id: 'HLM-KRW', name: 'Halim — Karawang', from: 0, to: 1 },
  { id: 'KRW-PDL', name: 'Karawang — Padalarang', from: 1, to: 2 },
  { id: 'PDL-TGL', name: 'Padalarang — Tegalluar', from: 2, to: 3 }
];

// KCIC Whoosh CR400AF Car Configurations
const CAR_CONFIGS = {
  '01': {
    carNum: '01',
    name: 'Gerbong 01',
    classes: 'First Class & Business Class',
    badgeClass: 'mixed',
    isFrontLocomotive: true,
    rows: [
      // Rows 1-3: First Class (2-1 config: A, C - aisle - F)
      { row: 1, cls: 'First Class', left: ['A', 'C'], right: ['F'] },
      { row: 2, cls: 'First Class', left: ['A', 'C'], right: ['F'] },
      { row: 3, cls: 'First Class', left: ['A', 'C'], right: ['F'] },
      // Rows 4-10: Business Class (2-2 config: A, C - aisle - D, F)
      { row: 4, cls: 'Business Class', left: ['A', 'C'], right: ['D', 'F'] },
      { row: 5, cls: 'Business Class', left: ['A', 'C'], right: ['D', 'F'] },
      { row: 6, cls: 'Business Class', left: ['A', 'C'], right: ['D', 'F'] },
      { row: 7, cls: 'Business Class', left: ['A', 'C'], right: ['D', 'F'] },
      { row: 8, cls: 'Business Class', left: ['A', 'C'], right: ['D', 'F'] },
      { row: 9, cls: 'Business Class', left: ['A', 'C'], right: ['D', 'F'] },
      { row: 10, cls: 'Business Class', left: ['A', 'C'], right: ['D', 'F'] }
    ]
  },
  '02': {
    carNum: '02',
    name: 'Gerbong 02',
    classes: 'Premium Economy Class',
    badgeClass: 'premium',
    rows: [
      { row: 1, cls: 'Premium Economy Class', left: ['A', 'B', 'C'], right: ['D', 'F'] },
      ...Array.from({ length: 17 }, (_, i) => ({
        row: i + 2,
        cls: 'Premium Economy Class',
        left: ['A', 'B', 'C'],
        right: ['D', 'F']
      }))
    ]
  },
  '03': {
    carNum: '03',
    name: 'Gerbong 03',
    classes: 'Premium Economy Class',
    badgeClass: 'premium',
    rows: Array.from({ length: 18 }, (_, i) => ({
      row: i + 1,
      cls: 'Premium Economy Class',
      left: ['A', 'B', 'C'],
      right: ['D', 'F']
    }))
  },
  '04': {
    carNum: '04',
    name: 'Gerbong 04',
    classes: 'Premium Economy Class (Akses Difabel)',
    badgeClass: 'premium',
    isWheelchairAccessible: true,
    rows: Array.from({ length: 16 }, (_, i) => ({
      row: i + 1,
      cls: 'Premium Economy Class',
      left: ['A', 'B', 'C'],
      right: ['D', 'F']
    }))
  },
  '05': {
    carNum: '05',
    name: 'Gerbong 05',
    classes: 'Premium Economy Class & Restorasi (Bistro)',
    badgeClass: 'premium',
    isBistroCar: true,
    rows: Array.from({ length: 15 }, (_, i) => ({
      row: i + 1,
      cls: 'Premium Economy Class',
      left: ['A', 'B', 'C'],
      right: ['D', 'F']
    }))
  },
  '06': {
    carNum: '06',
    name: 'Gerbong 06',
    classes: 'Premium Economy Class',
    badgeClass: 'premium',
    rows: Array.from({ length: 18 }, (_, i) => ({
      row: i + 1,
      cls: 'Premium Economy Class',
      left: ['A', 'B', 'C'],
      right: ['D', 'F']
    }))
  },
  '07': {
    carNum: '07',
    name: 'Gerbong 07',
    classes: 'Premium Economy Class',
    badgeClass: 'premium',
    rows: Array.from({ length: 18 }, (_, i) => ({
      row: i + 1,
      cls: 'Premium Economy Class',
      left: ['A', 'B', 'C'],
      right: ['D', 'F']
    }))
  },
  '08': {
    carNum: '08',
    name: 'Gerbong 08',
    classes: 'First Class & Premium Economy Class',
    badgeClass: 'mixed',
    isRearLocomotive: true,
    rows: [
      // Rows 1-3: First Class (2-1 config)
      { row: 1, cls: 'First Class', left: ['A', 'C'], right: ['F'] },
      { row: 2, cls: 'First Class', left: ['A', 'C'], right: ['F'] },
      { row: 3, cls: 'First Class', left: ['A', 'C'], right: ['F'] },
      // Rows 4-12: Premium Economy (3-2 config)
      ...Array.from({ length: 9 }, (_, i) => ({
        row: i + 4,
        cls: 'Premium Economy Class',
        left: ['A', 'B', 'C'],
        right: ['D', 'F']
      }))
    ]
  }
};

// Global App State
const state = {
  currentTripId: null,
  trip: null,
  records: [],
  activeCar: '01',
  selectedSegment: 'ALL',
  emptyOnly: false,
  positionFilter: 'ALL',
  searchQuery: '',
  // Computed seat mapping: key = `car_seatCode` -> { records: [], segmentsOccupied: [0, 1], ... }
  seatMap: new Map()
};

// Elements
const el = {
  tripSelect: document.getElementById('tripSelect'),
  tripSummaryBadge: document.getElementById('tripSummaryBadge'),
  kpiTotalSeats: document.getElementById('kpiTotalSeats'),
  kpiAvailableSeats: document.getElementById('kpiAvailableSeats'),
  kpiAvailablePercent: document.getElementById('kpiAvailablePercent'),
  kpiOccupiedSeats: document.getElementById('kpiOccupiedSeats'),
  kpiOccupancyRate: document.getElementById('kpiOccupancyRate'),
  kpiTotalTickets: document.getElementById('kpiTotalTickets'),
  statFirstClass: document.getElementById('statFirstClass'),
  statBusinessClass: document.getElementById('statBusinessClass'),
  statPremiumClass: document.getElementById('statPremiumClass'),
  barFirstClass: document.getElementById('barFirstClass'),
  barBusinessClass: document.getElementById('barBusinessClass'),
  barPremiumClass: document.getElementById('barPremiumClass'),
  kpiAvailableSub: document.getElementById('kpiAvailableSub'),
  kpiOccupiedSub: document.getElementById('kpiOccupiedSub'),
  trainCarsContainer: document.getElementById('trainCarsContainer'),
  segmentSelect: document.getElementById('segmentSelect'),
  toggleEmptyOnly: document.getElementById('toggleEmptyOnly'),
  positionFilterGroup: document.getElementById('positionFilterGroup'),
  searchInput: document.getElementById('searchInput'),
  btnClearSearch: document.getElementById('btnClearSearch'),
  activeCarBadge: document.getElementById('activeCarBadge'),
  activeCarTitle: document.getElementById('activeCarTitle'),
  activeCarSpecs: document.getElementById('activeCarSpecs'),
  carOccupiedCount: document.getElementById('carOccupiedCount'),
  carEmptyCount: document.getElementById('carEmptyCount'),
  driverCabIndicator: document.getElementById('driverCabIndicator'),
  bistroIndicator: document.getElementById('bistroIndicator'),
  wheelchairIndicator: document.getElementById('wheelchairIndicator'),
  seatGridContainer: document.getElementById('seatGridContainer'),
  // Modals
  seatDetailBackdrop: document.getElementById('seatDetailBackdrop'),
  seatDetailModal: document.getElementById('seatDetailModal'),
  btnCloseDetailModal: document.getElementById('btnCloseDetailModal'),
  btnCloseDetailFooter: document.getElementById('btnCloseDetailFooter'),
  modalSeatBadge: document.getElementById('modalSeatBadge'),
  modalSeatTitle: document.getElementById('modalSeatTitle'),
  modalSeatClass: document.getElementById('modalSeatClass'),
  modalStatusBanner: document.getElementById('modalStatusBanner'),
  modalStatusIcon: document.getElementById('modalStatusIcon'),
  modalStatusTitle: document.getElementById('modalStatusTitle'),
  modalStatusDesc: document.getElementById('modalStatusDesc'),
  modalTimeline: document.getElementById('modalTimeline'),
  modalPassengerSection: document.getElementById('modalPassengerSection'),
  modalPassengerList: document.getElementById('modalPassengerList'),
  // Upload Modal
  uploadModalBackdrop: document.getElementById('uploadModalBackdrop'),
  btnOpenUploadModal: document.getElementById('btnOpenUploadModal'),
  btnCloseUploadModal: document.getElementById('btnCloseUploadModal'),
  btnCancelUpload: document.getElementById('btnCancelUpload'),
  btnSubmitUpload: document.getElementById('btnSubmitUpload'),
  csvDropzone: document.getElementById('csvDropzone'),
  csvFileInput: document.getElementById('csvFileInput'),
  btnBrowseFile: document.getElementById('btnBrowseFile'),
  csvPasteTextarea: document.getElementById('csvPasteTextarea'),
  uploadAlert: document.getElementById('uploadAlert'),
  btnExportEmpty: document.getElementById('btnExportEmpty'),
  btnExportExcel: document.getElementById('btnExportExcel'),
  fileInfoBadge: document.getElementById('fileInfoBadge'),
  toastContainer: document.getElementById('toastContainer'),
  // Flush Modal
  flushModalBackdrop: document.getElementById('flushModalBackdrop'),
  btnOpenFlushModal: document.getElementById('btnOpenFlushModal'),
  btnCloseFlushModal: document.getElementById('btnCloseFlushModal'),
  btnCancelFlush: document.getElementById('btnCancelFlush'),
  btnConfirmFlushEmpty: document.getElementById('btnConfirmFlushEmpty'),
  btnConfirmFlushReseed: document.getElementById('btnConfirmFlushReseed'),
  flushAlert: document.getElementById('flushAlert'),
  // Mobile & PWA Elements
  btnInstallPwa: document.getElementById('btnInstallPwa'),
  btnToggleMobileActions: document.getElementById('btnToggleMobileActions'),
  mobileActionsBackdrop: document.getElementById('mobileActionsBackdrop'),
  mobileActionsSheet: document.getElementById('mobileActionsSheet'),
  btnCloseMobileActions: document.getElementById('btnCloseMobileActions'),
  offlineIndicatorBadge: document.getElementById('offlineIndicatorBadge'),
  mBtnUpload: document.getElementById('mBtnUpload'),
  mBtnExportExcel: document.getElementById('mBtnExportExcel'),
  mBtnExportCSV: document.getElementById('mBtnExportCSV'),
  mBtnInstall: document.getElementById('mBtnInstall'),
  mBtnFlush: document.getElementById('mBtnFlush'),
  bNavCars: document.getElementById('bNavCars'),
  bNavFilter: document.getElementById('bNavFilter'),
  bNavUpload: document.getElementById('bNavUpload'),
  bNavExport: document.getElementById('bNavExport'),
  bNavMore: document.getElementById('bNavMore')
};

// ==========================================================================
// HELPERS
// ==========================================================================

function formatSeatCode(rowNum, letter) {
  const paddedRow = String(rowNum).padStart(3, '0');
  return `${paddedRow}${letter}`;
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : '⚠️'}</span>
    <span>${message}</span>
  `;
  el.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Convert route string (e.g. 'Halim—Padalarang') into list of segment indices occupied [0, 1]
function getRouteSegments(origin, destination) {
  const origIdx = STATIONS.findIndex(s => s.toLowerCase() === (origin || '').toLowerCase());
  const destIdx = STATIONS.findIndex(s => s.toLowerCase() === (destination || '').toLowerCase());

  if (origIdx === -1 || destIdx === -1 || origIdx >= destIdx) {
    // Default to whole trip if unparseable
    return [0, 1, 2];
  }

  const occupied = [];
  for (let i = origIdx; i < destIdx; i++) {
    occupied.push(i);
  }
  return occupied;
}

// Check which segments are required for the currently selected filter
function getRequiredSegments(segmentFilter) {
  switch (segmentFilter) {
    case 'HLM-KRW': return [0];
    case 'KRW-PDL': return [1];
    case 'PDL-TGL': return [2];
    case 'HLM-PDL': return [0, 1];
    case 'KRW-TGL': return [1, 2];
    case 'HLM-TGL': return [0, 1, 2];
    case 'ALL':
    default:
      return [0, 1, 2];
  }
}

// ==========================================================================
// DATA PROCESSING & SEAT MAP COMPUTATION
// ==========================================================================

function processManifestData() {
  state.seatMap.clear();

  // 1. Pre-populate all theoretical seats across all 8 cars
  Object.keys(CAR_CONFIGS).forEach(carNum => {
    const config = CAR_CONFIGS[carNum];
    config.rows.forEach(r => {
      const allLetters = [...r.left, ...r.right];
      allLetters.forEach(letter => {
        const seatCode = formatSeatCode(r.row, letter);
        const key = `${carNum}_${seatCode}`;
        state.seatMap.set(key, {
          car: carNum,
          seat: seatCode,
          row: r.row,
          letter: letter,
          seatClass: r.cls,
          records: [],
          occupiedSegments: new Set()
        });
      });
    });
  });

  // 2. Map actual bookings from manifest records
  state.records.forEach(rec => {
    let car = rec.car || '01';
    if (car.length === 1) car = '0' + car;
    const seat = rec.seat;
    const key = `${car}_${seat}`;

    let seatObj = state.seatMap.get(key);
    if (!seatObj) {
      // Create ad-hoc seat if not in predefined list (e.g. edge case row)
      const row = parseInt(seat.slice(0, 3), 10) || 1;
      const letter = seat.slice(3) || 'A';
      seatObj = {
        car: car,
        seat: seat,
        row: row,
        letter: letter,
        seatClass: rec.seat_class || 'Premium Economy Class',
        records: [],
        occupiedSegments: new Set()
      };
      state.seatMap.set(key, seatObj);
    }

    seatObj.records.push(rec);

    // Calculate occupied segment indices
    const segs = getRouteSegments(rec.origin, rec.destination);
    segs.forEach(s => seatObj.occupiedSegments.add(s));
  });
}

/**
 * Determine the status of a seat given the active segment filter
 * Returns: 'AVAILABLE' | 'OCCUPIED' | 'PARTIAL'
 */
function getSeatStatus(seatObj, segmentFilter) {
  const reqSegments = getRequiredSegments(segmentFilter);

  if (segmentFilter === 'ALL') {
    if (seatObj.occupiedSegments.size === 0) {
      return 'AVAILABLE';
    } else if (seatObj.occupiedSegments.size === 3) {
      return 'OCCUPIED';
    } else {
      return 'PARTIAL';
    }
  }

  // If a specific segment is chosen (e.g. HLM-PDL [0, 1]):
  // Any overlap with required segments means the seat is NOT available for this journey!
  const hasConflict = reqSegments.some(s => seatObj.occupiedSegments.has(s));
  return hasConflict ? 'OCCUPIED' : 'AVAILABLE';
}

// ==========================================================================
// CLIENT-SIDE OFFLINE STORAGE ENGINE (IndexedDB)
// ==========================================================================

const WhooshLocalDB = {
  db: null,

  async init() {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('WhooshOfflineDB', 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('trips')) {
          const tripStore = db.createObjectStore('trips', { keyPath: 'id', autoIncrement: true });
          tripStore.createIndex('trip_date_train', ['trip_date', 'train_code'], { unique: false });
        }
        if (!db.objectStoreNames.contains('records')) {
          const recStore = db.createObjectStore('records', { keyPath: 'id', autoIncrement: true });
          recStore.createIndex('trip_id', 'trip_id', { unique: false });
        }
      };
      req.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };
      req.onerror = (e) => {
        console.warn('[OfflineDB] IndexedDB error:', e);
        reject(e);
      };
    });
  },

  async getTrips() {
    try {
      await this.init();
      return new Promise((resolve) => {
        const tx = this.db.transaction('trips', 'readonly');
        const req = tx.objectStore('trips').getAll();
        req.onsuccess = () => {
          const trips = (req.result || []).sort((a, b) => b.id - a.id);
          resolve(trips);
        };
        req.onerror = () => resolve([]);
      });
    } catch (_) {
      return [];
    }
  },

  async getManifest(tripId) {
    try {
      await this.init();
      return new Promise((resolve) => {
        const tx = this.db.transaction(['trips', 'records'], 'readonly');
        const tReq = tx.objectStore('trips').get(Number(tripId));
        let trip = null;
        tReq.onsuccess = () => { trip = tReq.result; };

        const recIndex = tx.objectStore('records').index('trip_id');
        const rReq = recIndex.getAll(Number(tripId));
        tx.oncomplete = () => {
          resolve({ trip, records: rReq.result || [] });
        };
        tx.onerror = () => resolve({ trip: null, records: [] });
      });
    } catch (_) {
      return { trip: null, records: [] };
    }
  },

  async saveTrip(records) {
    await this.init();
    if (!records || !records.length) throw new Error('Tidak ada data penumpang untuk disimpan.');

    const first = records[0];
    const tripDate = first.tripDate || '04/09/2026';
    const trainCode = first.trainCode || 'G1043';

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['trips', 'records'], 'readwrite');
      const tripStore = tx.objectStore('trips');
      const recStore = tx.objectStore('records');

      const getAllReq = tripStore.getAll();
      getAllReq.onsuccess = () => {
        const allTrips = getAllReq.result || [];
        const existing = allTrips.find(t => t.trip_date === tripDate && t.train_code === trainCode);

        let tripId;
        if (existing) {
          tripId = existing.id;
          existing.total_bookings = records.length;
          existing.created_at = new Date().toISOString();
          tripStore.put(existing);

          const recIndex = recStore.index('trip_id');
          const oldReq = recIndex.getAll(tripId);
          oldReq.onsuccess = () => {
            (oldReq.result || []).forEach(r => recStore.delete(r.id));
            records.forEach(r => {
              recStore.add({
                trip_id: tripId,
                booking_code: r.bookingCode || '',
                ticket_number: r.ticketNo || '',
                passenger_type: r.passType || 'Full price ticket',
                trip_date: r.tripDate || tripDate,
                train_code: r.trainCode || trainCode,
                car: r.car || '01',
                seat_class: r.seatClass || 'Premium Economy Class',
                seat: r.seat || '',
                route: r.route || 'Halim—Tegalluar',
                origin: (r.route ? r.route.split(/[—–\-]+/)[0] : 'Halim').trim(),
                destination: (r.route ? r.route.split(/[—–\-]+/)[1] : 'Tegalluar').trim()
              });
            });
          };
        } else {
          const addReq = tripStore.add({
            trip_date: tripDate,
            train_code: trainCode,
            total_bookings: records.length,
            created_at: new Date().toISOString()
          });
          addReq.onsuccess = () => {
            tripId = addReq.result;
            records.forEach(r => {
              recStore.add({
                trip_id: tripId,
                booking_code: r.bookingCode || '',
                ticket_number: r.ticketNo || '',
                passenger_type: r.passType || 'Full price ticket',
                trip_date: r.tripDate || tripDate,
                train_code: r.trainCode || trainCode,
                car: r.car || '01',
                seat_class: r.seatClass || 'Premium Economy Class',
                seat: r.seat || '',
                route: r.route || 'Halim—Tegalluar',
                origin: (r.route ? r.route.split(/[—–\-]+/)[0] : 'Halim').trim(),
                destination: (r.route ? r.route.split(/[—–\-]+/)[1] : 'Tegalluar').trim()
              });
            });
          };
        }
      };

      tx.oncomplete = () => {
        resolve({ success: true, tripDate, trainCode, totalRecords: records.length });
      };
      tx.onerror = (e) => reject(e);
    });
  },

  async flushAll() {
    try {
      await this.init();
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(['trips', 'records'], 'readwrite');
        tx.objectStore('trips').clear();
        tx.objectStore('records').clear();
        tx.oncomplete = () => resolve(true);
        tx.onerror = (e) => reject(e);
      });
    } catch (_) {
      return false;
    }
  }
};

// ==========================================================================
// DATA RETRIEVAL (HYBRID: SERVER + OFFLINE IndexedDB)
// ==========================================================================

async function fetchTrips() {
  let trips = [];
  let isOnline = false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1800);
    const res = await fetch('/api/trips', { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.trips) {
        trips = data.trips;
        isOnline = true;
      }
    }
  } catch (_) {
    isOnline = false;
  }

  // Update status badge
  if (el.offlineIndicatorBadge) {
    el.offlineIndicatorBadge.textContent = isOnline ? '🟢 Terhubung ke Server' : '📱 Mode Mandiri (Offline-Ready)';
    el.offlineIndicatorBadge.style.color = isOnline ? '#34D399' : '#60A5FA';
  }

  // If server had trips, sync into local DB as offline backup
  if (isOnline && trips.length > 0) {
    // Online mode
    populateTripSelector(trips);
    const latestTripId = trips[0].id;
    await loadManifest(latestTripId);
    return;
  }

  // Fallback to client-side IndexedDB
  const localTrips = await WhooshLocalDB.getTrips();

  if (localTrips && localTrips.length > 0) {
    populateTripSelector(localTrips);
    const latestTripId = localTrips[0].id;
    await loadManifest(latestTripId);
    return;
  }

  // If completely empty on first launch on mobile: auto-seed from local manifest_data.csv!
  try {
    const csvRes = await fetch('manifest_data.csv');
    if (csvRes.ok) {
      const csvText = await csvRes.text();
      const wb = XLSX.read(csvText, { type: 'string' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
      const { records } = parseWorksheetRows(rawRows);
      if (records.length > 0) {
        await WhooshLocalDB.saveTrip(records);
        const seededTrips = await WhooshLocalDB.getTrips();
        if (seededTrips.length > 0) {
          populateTripSelector(seededTrips);
          await loadManifest(seededTrips[0].id);
          return;
        }
      }
    }
  } catch (_) {}

  // Empty state
  el.tripSelect.innerHTML = '<option value="">(Belum ada data manifest)</option>';
  state.currentTripId = null;
  state.trip = null;
  state.records = [];
  el.tripSummaryBadge.textContent = 'Database Kosong';
  processManifestData();
  renderAll();
}

async function loadManifest(tripId) {
  try {
    // Try server first
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1800);
      const res = await fetch(`/api/manifest?trip_id=${tripId}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.trip) {
          state.currentTripId = tripId;
          state.trip = data.trip;
          state.records = data.records || [];
          el.tripSummaryBadge.textContent = `${state.trip.train_code} • ${state.trip.trip_date}`;
          processManifestData();
          renderAll();
          return;
        }
      }
    } catch (_) {}

    // Fallback to IndexedDB
    const { trip, records } = await WhooshLocalDB.getManifest(tripId);
    if (trip) {
      state.currentTripId = tripId;
      state.trip = trip;
      state.records = records || [];
      el.tripSummaryBadge.textContent = `${state.trip.train_code} • ${state.trip.trip_date}`;
      processManifestData();
      renderAll();
    } else {
      showToast('Data perjalanan tidak ditemukan.', 'error');
    }
  } catch (err) {
    console.error('Gagal memuat manifest:', err);
    showToast('Gagal memuat data manifest.', 'error');
  }
}

// ==========================================================================
// RENDERING
// ==========================================================================

function populateTripSelector(trips) {
  el.tripSelect.innerHTML = '';
  trips.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = `${t.train_code} — ${t.trip_date} (${t.total_bookings} Penumpang)`;
    el.tripSelect.appendChild(opt);
  });
}

function renderAll() {
  renderKPICards();
  renderTrainStrip();
  renderSeatGrid();
}

function renderKPICards() {
  let totalSeats = 0;
  let fullyOccupied = 0;
  let partialOccupied = 0;
  let pureEmpty = 0;

  let firstTotal = 0, firstOccupied = 0;
  let businessTotal = 0, businessOccupied = 0;
  let premiumTotal = 0, premiumOccupied = 0;

  state.seatMap.forEach(seat => {
    totalSeats++;
    const isPureEmpty = seat.occupiedSegments.size === 0;
    const isFullOccupied = seat.occupiedSegments.size === 3;
    const isPartial = seat.occupiedSegments.size > 0 && seat.occupiedSegments.size < 3;

    if (state.selectedSegment === 'ALL') {
      if (isPureEmpty) pureEmpty++;
      else if (isFullOccupied) fullyOccupied++;
      else if (isPartial) partialOccupied++;

      // In ALL mode, class stats track any seat with booking
      const hasBooking = seat.occupiedSegments.size > 0;
      if (seat.seatClass === 'First Class') {
        firstTotal++;
        if (hasBooking) firstOccupied++;
      } else if (seat.seatClass === 'Business Class') {
        businessTotal++;
        if (hasBooking) businessOccupied++;
      } else {
        premiumTotal++;
        if (hasBooking) premiumOccupied++;
      }
    } else {
      // Segment specific
      const status = getSeatStatus(seat, state.selectedSegment);
      if (status === 'AVAILABLE') pureEmpty++;
      else fullyOccupied++;

      if (seat.seatClass === 'First Class') {
        firstTotal++;
        if (status === 'OCCUPIED') firstOccupied++;
      } else if (seat.seatClass === 'Business Class') {
        businessTotal++;
        if (status === 'OCCUPIED') businessOccupied++;
      } else {
        premiumTotal++;
        if (status === 'OCCUPIED') premiumOccupied++;
      }
    }
  });

  if (state.selectedSegment === 'ALL') {
    const totalBookedSeats = fullyOccupied + partialOccupied;
    const occRate = totalSeats > 0 ? ((totalBookedSeats / totalSeats) * 100).toFixed(1) : 0;
    const availRate = totalSeats > 0 ? ((pureEmpty / totalSeats) * 100).toFixed(1) : 0;

    if (el.kpiTotalSeats) el.kpiTotalSeats.textContent = totalSeats;
    if (el.kpiAvailableSeats) el.kpiAvailableSeats.textContent = pureEmpty;
    if (el.kpiAvailablePercent) el.kpiAvailablePercent.textContent = `${availRate}%`;
    if (el.kpiAvailableSub) el.kpiAvailableSub.innerHTML = `+<strong>${partialOccupied}</strong> kursi terisi sebagian`;

    if (el.kpiOccupiedSeats) el.kpiOccupiedSeats.textContent = totalBookedSeats;
    if (el.kpiOccupancyRate) el.kpiOccupancyRate.textContent = `${occRate}%`;
    if (el.kpiOccupiedSub) el.kpiOccupiedSub.innerHTML = `(${fullyOccupied} Penuh • ${partialOccupied} Parsial)`;
  } else {
    const occRate = totalSeats > 0 ? ((fullyOccupied / totalSeats) * 100).toFixed(1) : 0;
    const availRate = totalSeats > 0 ? ((pureEmpty / totalSeats) * 100).toFixed(1) : 0;

    if (el.kpiTotalSeats) el.kpiTotalSeats.textContent = totalSeats;
    if (el.kpiAvailableSeats) el.kpiAvailableSeats.textContent = pureEmpty;
    if (el.kpiAvailablePercent) el.kpiAvailablePercent.textContent = `${availRate}%`;
    if (el.kpiAvailableSub) el.kpiAvailableSub.textContent = `Tersedia pada segmen ini`;

    if (el.kpiOccupiedSeats) el.kpiOccupiedSeats.textContent = fullyOccupied;
    if (el.kpiOccupancyRate) el.kpiOccupancyRate.textContent = `${occRate}%`;
    if (el.kpiOccupiedSub) el.kpiOccupiedSub.textContent = `Terisi pada segmen ini`;
  }

  el.kpiTotalTickets.textContent = state.records.length;

  // Class breakdown
  el.statFirstClass.textContent = `${firstOccupied}/${firstTotal}`;
  el.barFirstClass.style.width = `${firstTotal > 0 ? (firstOccupied / firstTotal) * 100 : 0}%`;

  el.statBusinessClass.textContent = `${businessOccupied}/${businessTotal}`;
  el.barBusinessClass.style.width = `${businessTotal > 0 ? (businessOccupied / businessTotal) * 100 : 0}%`;

  el.statPremiumClass.textContent = `${premiumOccupied}/${premiumTotal}`;
  el.barPremiumClass.style.width = `${premiumTotal > 0 ? (premiumOccupied / premiumTotal) * 100 : 0}%`;
}

function renderTrainStrip() {
  el.trainCarsContainer.innerHTML = '';

  Object.keys(CAR_CONFIGS).forEach(carNum => {
    const config = CAR_CONFIGS[carNum];
    const carSeats = [];
    state.seatMap.forEach(s => {
      if (s.car === carNum) carSeats.push(s);
    });

    let occupiedInCar = 0;
    let emptyInCar = 0;
    carSeats.forEach(s => {
      if (state.selectedSegment === 'ALL') {
        if (s.occupiedSegments.size > 0) occupiedInCar++;
        else emptyInCar++;
      } else {
        const status = getSeatStatus(s, state.selectedSegment);
        if (status === 'OCCUPIED') occupiedInCar++;
        else emptyInCar++;
      }
    });

    const occPercent = carSeats.length > 0 ? Math.round((occupiedInCar / carSeats.length) * 100) : 0;

    const card = document.createElement('div');
    card.className = `train-car-card ${state.activeCar === carNum ? 'active' : ''} ${config.isFrontLocomotive ? 'locomotive-front' : ''} ${config.isRearLocomotive ? 'locomotive-rear' : ''}`;
    card.dataset.car = carNum;

    let occFillClass = '';
    if (occPercent > 75) occFillClass = 'high';
    else if (occPercent > 40) occFillClass = 'mid';

    card.innerHTML = `
      <div class="car-strip-top">
        <span class="car-num-badge">G${carNum}</span>
        <span class="car-class-badge ${config.badgeClass}">
          ${carNum === '01' ? '1st/Bisnis' : carNum === '08' ? '1st/Prem' : carNum === '05' ? 'Bistro' : 'Ekonomi'}
        </span>
      </div>
      <div class="car-occ-bar">
        <div class="car-occ-fill ${occFillClass}" style="width: ${occPercent}%"></div>
      </div>
      <div class="car-strip-bottom">
        <span>${occPercent}% Terisi</span>
        <span class="car-empty-tag">${emptyInCar} Kosong</span>
      </div>
    `;

    card.addEventListener('click', () => {
      state.activeCar = carNum;
      document.querySelectorAll('.train-car-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      renderSeatGrid();
    });

    el.trainCarsContainer.appendChild(card);
  });
}

function renderSeatGrid() {
  const config = CAR_CONFIGS[state.activeCar];
  if (!config) return;

  // Update Coach Header Info
  el.activeCarBadge.textContent = `Gerbong ${config.carNum}`;
  el.activeCarTitle.textContent = config.classes;

  // Car amenities flags
  el.driverCabIndicator.style.display = (config.isFrontLocomotive || config.isRearLocomotive) ? 'block' : 'none';
  el.bistroIndicator.style.display = config.isBistroCar ? 'flex' : 'none';
  el.wheelchairIndicator.style.display = config.isWheelchairAccessible ? 'flex' : 'none';

  // Calculate stats for current car
  let carTotal = 0;
  let carOccupied = 0;
  let carEmpty = 0;

  state.seatMap.forEach(s => {
    if (s.car === state.activeCar) {
      carTotal++;
      const status = getSeatStatus(s, state.selectedSegment);
      if (status === 'OCCUPIED') carOccupied++;
      else carEmpty++;
    }
  });

  el.activeCarSpecs.textContent = `${carTotal} Kursi Total`;
  el.carOccupiedCount.textContent = carOccupied;
  el.carEmptyCount.textContent = carEmpty;

  // Clear and re-render grid
  el.seatGridContainer.innerHTML = '';

  config.rows.forEach(rowDef => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'seat-row';

    // Row Number Label
    const rowLabel = document.createElement('div');
    rowLabel.className = 'row-label';
    rowLabel.textContent = String(rowDef.row).padStart(2, '0');
    rowDiv.appendChild(rowLabel);

    // Left Cluster (A, B, C or A, C)
    const leftCluster = document.createElement('div');
    leftCluster.className = 'seat-cluster left';
    rowDef.left.forEach(letter => {
      const seatNode = createSeatElement(state.activeCar, rowDef.row, letter);
      leftCluster.appendChild(seatNode);
    });
    rowDiv.appendChild(leftCluster);

    // Aisle
    const aisle = document.createElement('div');
    aisle.className = 'seat-aisle';
    aisle.textContent = 'LORONG';
    rowDiv.appendChild(aisle);

    // Right Cluster (D, F or F)
    const rightCluster = document.createElement('div');
    rightCluster.className = 'seat-cluster right';
    rowDef.right.forEach(letter => {
      const seatNode = createSeatElement(state.activeCar, rowDef.row, letter);
      rightCluster.appendChild(seatNode);
    });
    rowDiv.appendChild(rightCluster);

    el.seatGridContainer.appendChild(rowDiv);
  });
}

function createSeatElement(carNum, rowNum, letter) {
  const seatCode = formatSeatCode(rowNum, letter);
  const key = `${carNum}_${seatCode}`;
  const seatObj = state.seatMap.get(key) || {
    car: carNum,
    seat: seatCode,
    row: rowNum,
    letter: letter,
    seatClass: 'Premium Economy Class',
    records: [],
    occupiedSegments: new Set()
  };

  const status = getSeatStatus(seatObj, state.selectedSegment);

  const seatNode = document.createElement('div');
  seatNode.className = `seat-node ${status.toLowerCase()}`;
  seatNode.dataset.key = key;
  seatNode.dataset.letter = letter;

  // Filter Checks:
  let isFilteredOut = false;

  // 1. Empty Only Filter
  if (state.emptyOnly && status === 'OCCUPIED') {
    isFilteredOut = true;
  }

  // 2. Position Filter (WINDOW / AISLE / MIDDLE)
  if (state.positionFilter === 'WINDOW' && !['A', 'F'].includes(letter)) {
    isFilteredOut = true;
  } else if (state.positionFilter === 'AISLE' && !['C', 'D'].includes(letter)) {
    isFilteredOut = true;
  } else if (state.positionFilter === 'MIDDLE' && letter !== 'B') {
    isFilteredOut = true;
  }

  if (isFilteredOut) {
    seatNode.classList.add('filtered-out');
  }

  // Search Check
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    const matchesSeat = seatCode.toLowerCase().includes(q) || `${rowNum}${letter}`.toLowerCase().includes(q);
    const matchesBooking = seatObj.records.some(r =>
      (r.booking_code && r.booking_code.toLowerCase().includes(q)) ||
      (r.ticket_number && r.ticket_number.toLowerCase().includes(q))
    );

    if (matchesSeat || matchesBooking) {
      seatNode.classList.add('search-match');
    }
  }

  seatNode.innerHTML = `
    <div class="seat-headrest"></div>
    <div class="seat-cushion">
      <span class="seat-letter">${letter}</span>
      <span class="seat-code">${String(rowNum).padStart(2, '0')}</span>
    </div>
  `;

  seatNode.addEventListener('click', () => openSeatDetailModal(seatObj, status));

  return seatNode;
}

// ==========================================================================
// SEAT DETAIL MODAL
// ==========================================================================

function openSeatDetailModal(seatObj, currentStatus) {
  el.modalSeatBadge.textContent = seatObj.seat;
  el.modalSeatTitle.textContent = `Kursi ${seatObj.seat} • Gerbong ${seatObj.car}`;
  el.modalSeatClass.textContent = `${seatObj.seatClass} (${['A', 'F'].includes(seatObj.letter) ? 'Jendela' : ['C', 'D'].includes(seatObj.letter) ? 'Lorong' : 'Tengah'})`;

  // Status Banner
  el.modalStatusBanner.className = `seat-status-banner ${currentStatus.toLowerCase()}`;
  if (currentStatus === 'AVAILABLE') {
    el.modalStatusIcon.textContent = '🟢';
    el.modalStatusTitle.textContent = 'Kursi Kosong (Tersedia)';
    el.modalStatusDesc.textContent = state.selectedSegment === 'ALL'
      ? 'Kursi ini belum dipesan untuk seluruh stasiun perjalanan kereta.'
      : `Kursi ini kosong pada segmen relasi yang Anda pilih.`;
  } else if (currentStatus === 'OCCUPIED') {
    el.modalStatusIcon.textContent = '🔴';
    el.modalStatusTitle.textContent = 'Kursi Terisi (Booked)';
    el.modalStatusDesc.textContent = 'Kursi ini telah dipesan oleh penumpang pada segmen relasi ini.';
  } else {
    el.modalStatusIcon.textContent = '🟡';
    el.modalStatusTitle.textContent = 'Terisi Parsial (Staggered Bookings)';
    el.modalStatusDesc.textContent = 'Kursi ini dipesan di beberapa stasiun tertentu, namun kosong di stasiun lainnya.';
  }

  // Segment Timeline
  el.modalTimeline.innerHTML = '';
  SEGMENT_DEFINITIONS.forEach((seg, idx) => {
    const isOccupied = seatObj.occupiedSegments.has(idx);
    const step = document.createElement('div');
    step.className = 'timeline-step';
    step.innerHTML = `
      <span class="step-route">${seg.name}</span>
      <span class="step-status-tag ${isOccupied ? 'taken' : 'free'}">
        ${isOccupied ? '🔴 TERISI' : '🟢 KOSONG'}
      </span>
    `;
    el.modalTimeline.appendChild(step);
  });

  // Passenger List
  if (seatObj.records.length > 0) {
    el.modalPassengerSection.style.display = 'block';
    el.modalPassengerList.innerHTML = '';
    seatObj.records.forEach((r, idx) => {
      const card = document.createElement('div');
      card.className = 'passenger-card';
      card.innerHTML = `
        <div class="passenger-info-item">
          <span class="info-label">Kode Booking</span>
          <span class="info-val">${r.booking_code || '-'}</span>
        </div>
        <div class="passenger-info-item">
          <span class="info-label">Nomor Tiket</span>
          <span class="info-val">${r.ticket_number || '-'}</span>
        </div>
        <div class="passenger-info-item">
          <span class="info-label">Tipe Tiket</span>
          <span class="info-val">${r.passenger_type || '-'}</span>
        </div>
        <div class="passenger-info-item">
          <span class="info-label">Rute Perjalanan</span>
          <span class="info-val" style="color: #60A5FA;">${r.route || '-'}</span>
        </div>
      `;
      el.modalPassengerList.appendChild(card);
    });
  } else {
    el.modalPassengerSection.style.display = 'none';
  }

  el.seatDetailBackdrop.classList.add('show');
}

function closeSeatDetailModal() {
  el.seatDetailBackdrop.classList.remove('show');
}

// ==========================================================================
// UPLOAD MANIFEST FLOW
// ==========================================================================

// ==========================================================================
// UPLOAD MANIFEST FLOW (EXCEL & CSV)
// ==========================================================================

function openUploadModal() {
  el.uploadAlert.style.display = 'none';
  el.csvPasteTextarea.value = '';
  if (el.fileInfoBadge) {
    el.fileInfoBadge.style.display = 'none';
    el.fileInfoBadge.innerHTML = '';
  }
  if (el.csvFileInput) el.csvFileInput.value = '';
  el.uploadModalBackdrop.classList.add('show');
}

function closeUploadModal() {
  el.uploadModalBackdrop.classList.remove('show');
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
    throw new Error('Tidak dapat menemukan baris header manifest (BOOKING CODE, SEAT, CLASS, dll) pada file.');
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

    if (seat || bookingCode) {
      records.push({
        bookingCode, ticketNo, passType, tripDate, trainCode, car, seatClass, seat, route
      });
    }
  }

  return { headerRowIdx, colMap, records };
}

function recordsToCSV(records) {
  const headers = ['BOOKING CODE', 'TICKET NUMBER', 'PASSENGER TYPE', 'TRIP DATE', 'TRAIN CODE', 'STAMFFORM CODE', 'CLASS', 'SEAT', 'ROUTE'];
  const lines = [headers.join(';')];
  records.forEach(r => {
    lines.push([
      r.bookingCode,
      r.ticketNo,
      r.passType,
      r.tripDate,
      r.trainCode,
      r.car,
      r.seatClass,
      r.seat,
      r.route
    ].join(';'));
  });
  return lines.join('\n');
}

function processUploadedFile(file) {
  if (!file) return;
  const nameLower = file.name.toLowerCase();
  const isExcel = nameLower.endsWith('.xlsx') || nameLower.endsWith('.xls') ||
                  file.type.includes('spreadsheet') || file.type.includes('excel');

  if (isExcel) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        if (!wb.SheetNames || !wb.SheetNames.length) {
          showToast('File Excel tidak memiliki lembar kerja!', 'error');
          return;
        }
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false, dateNF: 'dd/mm/yyyy' });
        const { headerRowIdx, records } = parseWorksheetRows(rawRows);

        if (!records.length) {
          showToast('Tidak ada data penumpang yang valid ditemukan pada file Excel.', 'warning');
          return;
        }

        const cleanCSV = recordsToCSV(records);
        el.csvPasteTextarea.value = cleanCSV;

        if (el.fileInfoBadge) {
          el.fileInfoBadge.style.display = 'flex';
          const titleNotice = headerRowIdx > 0 ? ' • Judul banner otomatis dilewati' : '';
          el.fileInfoBadge.innerHTML = `📊 <strong>Excel Terdeteksi:</strong> ${file.name} (Sheet: "${sheetName}", <strong>${records.length}</strong> penumpang terdeteksi${titleNotice})`;
        }
        showToast(`File Excel "${file.name}" berhasil dibaca (${records.length} penumpang)!`, 'success');
      } catch (err) {
        console.error(err);
        showToast(`Gagal membaca file Excel: ${err.message}`, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  } else {
    // CSV file
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      try {
        const wb = XLSX.read(text, { type: 'string' });
        if (wb.SheetNames && wb.SheetNames.length) {
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false, dateNF: 'dd/mm/yyyy' });
          const { records } = parseWorksheetRows(rawRows);
          if (records.length > 0) {
            el.csvPasteTextarea.value = recordsToCSV(records);
            if (el.fileInfoBadge) {
              el.fileInfoBadge.style.display = 'flex';
              el.fileInfoBadge.innerHTML = `📄 <strong>CSV Terdeteksi:</strong> ${file.name} (<strong>${records.length}</strong> baris penumpang)`;
            }
            showToast(`File CSV "${file.name}" siap diunggah!`, 'success');
            return;
          }
        }
      } catch (_) {}

      // Fallback
      el.csvPasteTextarea.value = text;
      if (el.fileInfoBadge) {
        el.fileInfoBadge.style.display = 'flex';
        const rowCount = text.split(/\r?\n/).filter(l => l.trim()).length - 1;
        el.fileInfoBadge.innerHTML = `📄 <strong>CSV Terdeteksi:</strong> ${file.name} (~${rowCount} baris data penumpang)`;
      }
      showToast(`File CSV "${file.name}" siap diunggah!`, 'success');
    };
    reader.readAsText(file);
  }
}

async function handleUpload(csvText) {
  if (!csvText || !csvText.trim()) {
    el.uploadAlert.className = 'alert-box error';
    el.uploadAlert.textContent = 'Harap pilih file Excel / CSV atau masukkan data manifest.';
    el.uploadAlert.style.display = 'block';
    return;
  }

  el.btnSubmitUpload.disabled = true;
  el.btnSubmitUpload.innerHTML = '<span>Menyimpan ke Database HP...</span>';

  try {
    // 1. Parse records
    const wb = XLSX.read(csvText, { type: 'string' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
    const { records } = parseWorksheetRows(rawRows);

    if (!records || !records.length) {
      throw new Error('Tidak ditemukan catatan penumpang yang valid.');
    }

    // 2. Save directly to local IndexedDB (instant offline storage on phone!)
    await WhooshLocalDB.saveTrip(records);

    // 3. Background sync to server if online
    try {
      fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv_text: csvText })
      }).catch(() => {});
    } catch (_) {}

    const first = records[0];
    const successMsg = `Manifest ${first.trainCode} (${first.tripDate}) berhasil disimpan (${records.length} penumpang)!`;

    el.uploadAlert.className = 'alert-box success';
    el.uploadAlert.textContent = successMsg;
    el.uploadAlert.style.display = 'block';
    showToast(successMsg, 'success');

    setTimeout(async () => {
      closeUploadModal();
      await fetchTrips();
    }, 800);
  } catch (err) {
    el.uploadAlert.className = 'alert-box error';
    el.uploadAlert.textContent = err.message || 'Gagal menyimpan data manifest.';
    el.uploadAlert.style.display = 'block';
  } finally {
    el.btnSubmitUpload.disabled = false;
    el.btnSubmitUpload.innerHTML = '<span>Simpan & Perbarui Database</span>';
  }
}

// ==========================================================================
// FLUSH / RESET DATABASE (OFFLINE + SERVER SYNC)
// ==========================================================================

function openFlushModal() {
  if (el.flushAlert) el.flushAlert.style.display = 'none';
  el.flushModalBackdrop.classList.add('show');
}

function closeFlushModal() {
  el.flushModalBackdrop.classList.remove('show');
}

async function handleFlush(reseed = false) {
  const btn = reseed ? el.btnConfirmFlushReseed : el.btnConfirmFlushEmpty;
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span>Memproses...</span>';

  try {
    // 1. Clear local IndexedDB
    await WhooshLocalDB.flushAll();

    // 2. If reseed requested, re-load default manifest
    if (reseed) {
      try {
        const csvRes = await fetch('manifest_data.csv');
        if (csvRes.ok) {
          const csvText = await csvRes.text();
          const wb = XLSX.read(csvText, { type: 'string' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
          const { records } = parseWorksheetRows(rawRows);
          if (records.length > 0) {
            await WhooshLocalDB.saveTrip(records);
          }
        }
      } catch (_) {}
    }

    // 3. Background server flush if online
    try {
      fetch(`/api/flush${reseed ? '?reseed=true' : ''}`, { method: 'POST' }).catch(() => {});
    } catch (_) {}

    const successMsg = reseed 
      ? 'Database berhasil di-reset ke manifest bawaan (G1043 • 384 penumpang)!'
      : 'Database berhasil dikosongkan total. Siap untuk upload baru!';

    el.flushAlert.className = 'alert-box success';
    el.flushAlert.textContent = successMsg;
    el.flushAlert.style.display = 'block';
    showToast(successMsg, 'success');

    setTimeout(async () => {
      closeFlushModal();
      await fetchTrips();
    }, 800);
  } catch (err) {
    el.flushAlert.className = 'alert-box error';
    el.flushAlert.textContent = err.message || 'Gagal membersihkan database.';
    el.flushAlert.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

// ==========================================================================
// EXPORT EMPTY SEATS (EXCEL & CSV)
// ==========================================================================

function getEmptySeatsData() {
  const trainCode = state.trip ? state.trip.train_code : 'Whoosh';
  const tripDate = state.trip ? state.trip.trip_date.replace(/\//g, '-') : 'date';
  const seg = state.selectedSegment;

  const rows = [
    ['NO_KA', 'TANGGAL', 'GERBONG', 'NOMOR_KURSI', 'KELAS', 'POSISI', 'SEGMEN_TERSEDIA']
  ];

  state.seatMap.forEach(seat => {
    const status = getSeatStatus(seat, state.selectedSegment);
    if (status === 'AVAILABLE') {
      const pos = ['A', 'F'].includes(seat.letter) ? 'Jendela' : ['C', 'D'].includes(seat.letter) ? 'Lorong' : 'Tengah';
      rows.push([
        trainCode,
        tripDate,
        `G${seat.car}`,
        seat.seat,
        seat.seatClass,
        pos,
        seg === 'ALL' ? 'Seluruh Rute' : seg
      ]);
    }
  });

  return { trainCode, tripDate, seg, rows };
}

function exportEmptySeatsCSV() {
  const { trainCode, tripDate, seg, rows } = getEmptySeatsData();

  if (rows.length <= 1) {
    showToast('Tidak ada kursi kosong untuk diexport.', 'warning');
    return;
  }

  const csvContent = rows.map(r => r.join(';')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `kursi_kosong_${trainCode}_${tripDate}_segmen_${seg}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);

  showToast(`Berhasil mengekspor ${rows.length - 1} kursi kosong ke format CSV!`, 'success');
}

function exportEmptySeatsExcel() {
  const { trainCode, tripDate, seg, rows } = getEmptySeatsData();

  if (rows.length <= 1) {
    showToast('Tidak ada kursi kosong untuk diexport.', 'warning');
    return;
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 24 }, { wch: 12 }, { wch: 26 }
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Kursi Kosong Whoosh');
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `kursi_kosong_${trainCode}_${tripDate}_segmen_${seg}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);

  showToast(`Berhasil mengekspor ${rows.length - 1} kursi kosong ke Excel (.xlsx)!`, 'success');
}

// ==========================================================================
// EVENT LISTENERS INITIALIZATION
// ==========================================================================

function initEventListeners() {
  // Trip dropdown change
  el.tripSelect.addEventListener('change', e => {
    if (e.target.value) {
      loadManifest(e.target.value);
    }
  });

  // Segment select change
  el.segmentSelect.addEventListener('change', e => {
    state.selectedSegment = e.target.value;
    renderAll();
  });

  // Empty only toggle
  el.toggleEmptyOnly.addEventListener('change', e => {
    state.emptyOnly = e.target.checked;
    renderSeatGrid();
  });

  // Position filter pills
  el.positionFilterGroup.querySelectorAll('.pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      el.positionFilterGroup.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.positionFilter = btn.dataset.pos;
      renderSeatGrid();
    });
  });

  // Search input
  el.searchInput.addEventListener('input', e => {
    state.searchQuery = e.target.value.trim();
    el.btnClearSearch.style.display = state.searchQuery ? 'block' : 'none';
    renderSeatGrid();
  });

  el.btnClearSearch.addEventListener('click', () => {
    el.searchInput.value = '';
    state.searchQuery = '';
    el.btnClearSearch.style.display = 'none';
    renderSeatGrid();
  });

  // Export Empty Seats
  el.btnExportEmpty.addEventListener('click', exportEmptySeatsCSV);
  if (el.btnExportExcel) {
    el.btnExportExcel.addEventListener('click', exportEmptySeatsExcel);
  }

  // Seat Detail Modal
  el.btnCloseDetailModal.addEventListener('click', closeSeatDetailModal);
  el.btnCloseDetailFooter.addEventListener('click', closeSeatDetailModal);
  el.seatDetailBackdrop.addEventListener('click', e => {
    if (e.target === el.seatDetailBackdrop) closeSeatDetailModal();
  });

  // Upload Modal
  el.btnOpenUploadModal.addEventListener('click', openUploadModal);
  el.btnCloseUploadModal.addEventListener('click', closeUploadModal);
  el.btnCancelUpload.addEventListener('click', closeUploadModal);
  el.uploadModalBackdrop.addEventListener('click', e => {
    if (e.target === el.uploadModalBackdrop) closeUploadModal();
  });

  el.btnBrowseFile.addEventListener('click', () => el.csvFileInput.click());
  el.csvFileInput.addEventListener('change', e => {
    if (e.target.files && e.target.files[0]) {
      processUploadedFile(e.target.files[0]);
    }
  });

  // Drag and Drop
  el.csvDropzone.addEventListener('dragover', e => {
    e.preventDefault();
    el.csvDropzone.classList.add('dragover');
  });

  el.csvDropzone.addEventListener('dragleave', () => {
    el.csvDropzone.classList.remove('dragover');
  });

  el.csvDropzone.addEventListener('drop', e => {
    e.preventDefault();
    el.csvDropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  });

  // Submit Upload
  el.btnSubmitUpload.addEventListener('click', () => {
    const text = el.csvPasteTextarea.value;
    handleUpload(text);
  });

  // Flush Database Modal
  if (el.btnOpenFlushModal) {
    el.btnOpenFlushModal.addEventListener('click', openFlushModal);
    el.btnCloseFlushModal.addEventListener('click', closeFlushModal);
    el.btnCancelFlush.addEventListener('click', closeFlushModal);
    el.flushModalBackdrop.addEventListener('click', e => {
      if (e.target === el.flushModalBackdrop) closeFlushModal();
    });

    el.btnConfirmFlushEmpty.addEventListener('click', () => handleFlush(false));
    el.btnConfirmFlushReseed.addEventListener('click', () => handleFlush(true));
  }

  // Mobile Actions Bottom Sheet
  if (el.btnToggleMobileActions) {
    el.btnToggleMobileActions.addEventListener('click', () => {
      el.mobileActionsBackdrop.classList.add('show');
    });
  }
  if (el.btnCloseMobileActions) {
    el.btnCloseMobileActions.addEventListener('click', () => {
      el.mobileActionsBackdrop.classList.remove('show');
    });
  }
  if (el.mobileActionsBackdrop) {
    el.mobileActionsBackdrop.addEventListener('click', (e) => {
      if (e.target === el.mobileActionsBackdrop) {
        el.mobileActionsBackdrop.classList.remove('show');
      }
    });
  }

  // Actions inside Mobile Actions Sheet
  if (el.mBtnUpload) {
    el.mBtnUpload.addEventListener('click', () => {
      el.mobileActionsBackdrop.classList.remove('show');
      openUploadModal();
    });
  }
  if (el.mBtnExportExcel) {
    el.mBtnExportExcel.addEventListener('click', () => {
      el.mobileActionsBackdrop.classList.remove('show');
      exportEmptySeatsExcel();
    });
  }
  if (el.mBtnExportCSV) {
    el.mBtnExportCSV.addEventListener('click', () => {
      el.mobileActionsBackdrop.classList.remove('show');
      exportEmptySeatsCSV();
    });
  }
  if (el.mBtnFlush) {
    el.mBtnFlush.addEventListener('click', () => {
      el.mobileActionsBackdrop.classList.remove('show');
      openFlushModal();
    });
  }
  if (el.mBtnInstall) {
    el.mBtnInstall.addEventListener('click', () => {
      el.mobileActionsBackdrop.classList.remove('show');
      triggerPwaInstall();
    });
  }

  // Persistent Mobile Bottom Navigation Items
  if (el.bNavCars) {
    el.bNavCars.addEventListener('click', () => {
      updateBottomNavActive(el.bNavCars);
      el.trainCarsContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
  if (el.bNavFilter) {
    el.bNavFilter.addEventListener('click', () => {
      updateBottomNavActive(el.bNavFilter);
      el.segmentSelect.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.segmentSelect.focus();
    });
  }
  if (el.bNavUpload) {
    el.bNavUpload.addEventListener('click', () => {
      openUploadModal();
    });
  }
  if (el.bNavExport) {
    el.bNavExport.addEventListener('click', () => {
      exportEmptySeatsExcel();
    });
  }
  if (el.bNavMore) {
    el.bNavMore.addEventListener('click', () => {
      el.mobileActionsBackdrop.classList.add('show');
    });
  }

  // PWA Install Button in Header
  if (el.btnInstallPwa) {
    el.btnInstallPwa.addEventListener('click', triggerPwaInstall);
  }
}

function updateBottomNavActive(activeBtn) {
  document.querySelectorAll('.bottom-nav-item').forEach(b => b.classList.remove('active'));
  activeBtn.classList.add('active');
}

// PWA Install Banner & Registration
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  if (el.btnInstallPwa) el.btnInstallPwa.style.display = 'inline-flex';
  if (el.mBtnInstall) el.mBtnInstall.style.display = 'flex';
});

function triggerPwaInstall() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then((choice) => {
      if (choice.outcome === 'accepted') {
        showToast('Whoosh Seats berhasil dipasang di HP!', 'success');
        if (el.btnInstallPwa) el.btnInstallPwa.style.display = 'none';
        if (el.mBtnInstall) el.mBtnInstall.style.display = 'none';
      }
      deferredInstallPrompt = null;
    });
  } else {
    showToast('Buka menu titik tiga (⋮) di Chrome HP ➔ "Tambahkan ke Layar Utama" / "Install Aplikasi"', 'info');
  }
}

// Register Service Worker for Offline PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('[PWA] Service Worker aktif:', reg.scope))
      .catch((err) => console.warn('[PWA] Service Worker gagal:', err));
  });
}

// Start App
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  fetchTrips();
});

