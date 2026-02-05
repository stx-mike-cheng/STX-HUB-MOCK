/**
 * ================================================================
 *  STX-HUB MOCK SERVICE (COA Search + Import APIs)
 *  PREPARED BY: Mike Cheng
 *  PURPOSE: Internal testing ONLY to help EMS team validate flows
 *  SCOPE:   NOT for real UAT or production use
 *  NOTES:
 *    - Static/dummy responses to mimic HUB behavior
 *    - No auth, no DB, no audit; minimal hardening only
 *    - Remove once FPT delivers the real HUB API endpoints
 * ================================================================
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dayjs from 'dayjs';
import crypto from 'crypto';

const app = express();

// --- Basic hardening & logging (still NOT UAT/PROD grade) ---
app.use(helmet());
app.use(cors()); // Allow EMS calls during internal testing
app.use(express.json({ limit: '2mb' }));
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('combined'));
}


// ---------- Helpers ----------
function nowFds() {
  return dayjs().format('YYYY-MM-DD HH:mm:ss.SSS');
}

function guid() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

function capitalize(s) {
  return (s || '').charAt(0).toUpperCase() + (s || '').slice(1);
}

function buildImportResponse({
  ok = true,
  entity = 'data',
  received = 1,
  processed = 1,
  success = 1,
  fail = 0,
  errors = []
} = {}) {
  return {
    status: ok ? 'Success' : 'Failure',
    message: ok
      ? `${capitalize(entity)} master data imported successfully`
      : `${capitalize(entity)} master data import failed`,
    timestamp: nowFds(),  // keep here for testing. we can disable on the final payload
    requestId: guid(),  // keep here for testing. we can disable on the final payload
    jobId: `mock-${Date.now()}`,  // keep here for testing. we can disable on the final payload
    receivedCount: received,
    processedCount: processed,
    successCount: success,
    failCount: fail,
    errors
  };
}

/**
 * Count items under a specific array property in the request body.
 * Input : (req, arrayName)
 * Output: number (length) or 0 if not present
 */
function computeCounts(req, arrayName) {
  if (!req || !req.body) return 0;

  const body = req.body;

  // Case 1: body[arrayName] exists and is an array
  if (Array.isArray(body[arrayName])) {
    return body[arrayName].length;
  }

  // Case 2: body.items[arrayName] pattern (if EMS nests objects differently)
  if (body.items && Array.isArray(body.items[arrayName])) {
    return body.items[arrayName].length;
  }

  // Not found
  return 0;
}

/**
 * Generic handler:
 * - respects ?mode=ok|empty|partial|error (and optional ?fail=n for partial)
 * - uses computeCounts(req, arrayName) to derive counts
 * - returns consistent envelope + timestamp + requestId
 */
function importHandler(arrayName, entityLabel) {
  return (req, res) => {
    const mode = (req.query.mode || 'ok').toLowerCase();
    const count = computeCounts(req, arrayName);

    // Baseline counts
    let receivedCount = count;
    let processedCount = count;
    let successCount = count;
    let failCount = 0;
    let status = 'Success';
    let message = `${entityLabel} master data imported successfully`;
    let errors = [];
    let errorLineNumber = null;
    let errorMessage = null;

    switch (mode) {
      case 'empty':
        receivedCount = 0;
        processedCount = 0;
        successCount = 0;
        failCount = 0;
        break;

      case 'partial':
        // Simple rule: fail 1 (or override via ?fail=n), but never exceed processedCount
        failCount = Math.min(
          processedCount,
          Number.isFinite(Number(req.query.fail)) ? Number(req.query.fail) : (processedCount > 0 ? 1 : 0)
        );
        successCount = Math.max(0, processedCount - failCount);
        if (failCount > 0) {
          errors = [{ lineNo: 1, message: 'Validation error (mock)' }];
        }
        break;

      case 'error':
        // Entire batch fails
        status = 'Failure';
        message = `${entityLabel} master data import failed`;
        processedCount = 0;
        successCount = 0;
        failCount = receivedCount;
        errors = [{ lineNo: 1, message: 'Simulated server error (mock)' }];
        errorLineNumber = 1;
        errorMessage = 'Simulated import failure';
        break;

      case 'ok':
      default:
        // keep baseline
        break;
    }

    // Build base and enhance with timestamp/requestId + error props if present
    const base = buildImportResponse({
      ok: status === 'Success',
      entity: entityLabel,
      received: receivedCount,
      processed: processedCount,
      success: successCount,
      fail: failCount,
      errors
    });

    const payload = {
      ...base,
      timestamp: nowFds(),
      requestId: guid(),
      ...(errorLineNumber !== null ? { errorLineNumber } : {}),
      ...(errorMessage !== null ? { errorMessage } : {})
    };

    return res.status(200).json(payload);
  };
}

// ---------- Data Search ----------
// 1) COAs
app.get('/api/v1/coas/search', (req, res) => {
  const mode = (req.query.mode || 'ok').toLowerCase();

  if (mode === 'empty') {
    return res.status(200).json({
      status: 'Success',
      message: 'COA data search completed',
      timestamp: nowFds(),
      recordCount: 0,
      coas: []
    });
  }

  if (mode === 'error') {
    return res.status(200).json({
      status: 'Failure',
      message: 'COA data search failed',
      timestamp: nowFds(),
      recordCount: 0,
      coas: [],
      errorMessage: 'Simulated error for testing'
    });
  }

  // Default = success with one record
  const payload = {
    status: 'Success',
    message: 'COA data search completed',
    timestamp: nowFds(),
    recordCount: 1,
    coas: [
      {
        lineNo: 1,
        accountNumber: '100100',
        description: 'Cash Account',
        debitCreditFlag: 'D',
        accountType: 'AP',
        fxPositionType: 'CASH',
        balanceControlFlag: 'N',
        revaluationFlag: 'N',
        activeFlag: 'Y',
        lastUpdateProgramId: 'GLA+',
        lastUpdateUserId: 'ADMIN',
        lastUpdateDatetime: '2025-11-04 23:23:23.000',
        errorMessage: null
      }
    ]
  };

  return res.status(200).json(payload);
});

// ---------- Data Import ----------
app.post('/api/v1/business-groups/import', importHandler('businessGroups',  'Business group'));
app.post('/api/v1/customers/import',       importHandler('customers',       'Customer'));
app.post('/api/v1/suppliers/import',       importHandler('suppliers',       'Supplier'));
app.post('/api/v1/supplier-banks/import',  importHandler('supplierBanks',   'Supplier bank'));
app.post('/api/v1/exchange-rates/import',  importHandler('exchangeRates',   'Exchange rate'));
app.post('/api/v1/trades/import',          importHandler('trades',          'Trade'));

// ---------- Health check ----------
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: nowFds() }));

// ---------- Server bind ----------
const PORT = process.env.PORT || 4000;  // .28 currently has PORT env set to 4000
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`[stx-hub-mock] listening at http://${HOST}:${PORT}`);
});

/**
 * =================== REMINDERS ===================
 * 1) Do NOT point real UAT or production traffic here.
 * 2) This mock is temporary; replace with real HUB APIs once ready.
 * 3) If you need to simulate more fields, extend buildImportResponse()
 *    and post routes with additional mock data as required by FDS.
 * =================================================
 */
