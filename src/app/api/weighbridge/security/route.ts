import type { NextRequest } from 'next/server';

import { logger } from 'src/utils/logger';
import { STATUS, response, handleError } from 'src/utils/response';
import {
  _checkpoints,
  _securityTransactions,
  _driverInductions,
  _vehicleInspections,
  CHECKPOINT_TYPES,
  ACCESS_EVENTS,
  INDUCTION_STATUSES,
  INSPECTION_STATUSES,
} from 'src/_mock/_security';

// ----------------------------------------------------------------------

export const runtime = 'edge';

// Endpoint actions
const ENDPOINTS = {
  CHECKPOINTS: 'checkpoints',
  CHECKPOINT: 'checkpoint',
  TRANSACTIONS: 'transactions',
  INDUCTIONS: 'inductions',
  INDUCTION: 'induction',
  INSPECTIONS: 'inspections',
  INSPECTION: 'inspection',
  VALIDATE_ACCESS: 'validate-access',
};

// GET /api/weighbridge/security
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const endpoint = searchParams.get('endpoint') || ENDPOINTS.CHECKPOINTS;

    switch (endpoint) {
      case ENDPOINTS.CHECKPOINTS:
        return getCheckpoints(req);
      case ENDPOINTS.CHECKPOINT:
        return getCheckpoint(req);
      case ENDPOINTS.TRANSACTIONS:
        return getTransactions(req);
      case ENDPOINTS.INDUCTIONS:
        return getInductions(req);
      case ENDPOINTS.INDUCTION:
        return getInduction(req);
      case ENDPOINTS.INSPECTIONS:
        return getInspections(req);
      case ENDPOINTS.INSPECTION:
        return getInspection(req);
      default:
        return getCheckpoints(req);
    }
  } catch (error) {
    return handleError('Security - GET', error);
  }
}

// POST /api/weighbridge/security
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const endpoint = searchParams.get('endpoint');

    switch (endpoint) {
      case ENDPOINTS.VALIDATE_ACCESS:
        return validateAccess(req);
      default:
        return response({ message: 'Invalid endpoint!' }, STATUS.BAD_REQUEST);
    }
  } catch (error) {
    return handleError('Security - POST', error);
  }
}

// Get checkpoints list
async function getCheckpoints(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const siteId = searchParams.get('siteId');
  const type = searchParams.get('type');
  const onlineOnly = searchParams.get('onlineOnly') === 'true';

  let checkpoints = _checkpoints();

  if (siteId) {
    checkpoints = checkpoints.filter((cp) => cp.siteId === siteId);
  }

  if (type) {
    checkpoints = checkpoints.filter((cp) => cp.type === type);
  }

  if (onlineOnly) {
    checkpoints = checkpoints.filter((cp) => cp.isOnline);
  }

  logger('[Security] checkpoints-list', checkpoints.length);
  return response(
    {
      checkpoints,
      summary: {
        total: checkpoints.length,
        online: checkpoints.filter((cp) => cp.isOnline).length,
        offline: checkpoints.filter((cp) => !cp.isOnline).length,
      },
      filters: {
        types: CHECKPOINT_TYPES,
      },
    },
    STATUS.OK
  );
}

// Get single checkpoint
async function getCheckpoint(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const checkpointId = searchParams.get('id');

  if (!checkpointId) {
    return response({ message: 'Checkpoint ID is required!' }, STATUS.BAD_REQUEST);
  }

  const checkpoints = _checkpoints();
  const checkpoint = checkpoints.find((cp) => cp.id === checkpointId);

  if (!checkpoint) {
    return response({ message: 'Checkpoint not found!' }, STATUS.NOT_FOUND);
  }

  // Get recent transactions for this checkpoint
  const transactions = _securityTransactions()
    .filter((t) => t.checkpointId === checkpointId)
    .slice(0, 20);

  logger('[Security] checkpoint-details', checkpointId);
  return response({ checkpoint, recentTransactions: transactions }, STATUS.OK);
}

// Get security transactions
async function getTransactions(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const siteId = searchParams.get('siteId');
  const checkpointId = searchParams.get('checkpointId');
  const vehicleId = searchParams.get('vehicleId');
  const driverId = searchParams.get('driverId');
  const eventType = searchParams.get('eventType');
  const deniedOnly = searchParams.get('deniedOnly') === 'true';
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const perPage = parseInt(searchParams.get('perPage') ?? '50', 10);

  let transactions = _securityTransactions();

  if (siteId) {
    transactions = transactions.filter((t) => t.siteId === siteId);
  }

  if (checkpointId) {
    transactions = transactions.filter((t) => t.checkpointId === checkpointId);
  }

  if (vehicleId) {
    transactions = transactions.filter((t) => t.vehicleId === vehicleId);
  }

  if (driverId) {
    transactions = transactions.filter((t) => t.driverId === driverId);
  }

  if (eventType) {
    transactions = transactions.filter((t) => t.eventType === eventType);
  }

  if (deniedOnly) {
    transactions = transactions.filter((t) => t.accessDenied);
  }

  // Sort by timestamp descending
  transactions.sort(
    (a, b) => new Date(b.eventTimestamp).getTime() - new Date(a.eventTimestamp).getTime()
  );

  // Pagination
  const totalItems = transactions.length;
  const totalPages = Math.ceil(totalItems / perPage);
  const startIndex = (page - 1) * perPage;
  const paginatedTransactions = transactions.slice(startIndex, startIndex + perPage);

  logger('[Security] transactions-list', paginatedTransactions.length);
  return response(
    {
      transactions: paginatedTransactions,
      pagination: {
        page,
        perPage,
        totalItems,
        totalPages,
        hasMore: page < totalPages,
      },
      summary: {
        totalTransactions: transactions.length,
        accessGranted: transactions.filter((t) => t.accessGranted).length,
        accessDenied: transactions.filter((t) => t.accessDenied).length,
        manualOverrides: transactions.filter((t) => t.manualOverride).length,
      },
      filters: {
        eventTypes: ACCESS_EVENTS,
      },
    },
    STATUS.OK
  );
}

// Get driver inductions
async function getInductions(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const siteId = searchParams.get('siteId');
  const driverId = searchParams.get('driverId');
  const haulierId = searchParams.get('haulierId');
  const status = searchParams.get('status');
  const validOnly = searchParams.get('validOnly') === 'true';
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const perPage = parseInt(searchParams.get('perPage') ?? '20', 10);

  let inductions = _driverInductions();

  if (siteId) {
    inductions = inductions.filter((i) => i.siteId === siteId);
  }

  if (driverId) {
    inductions = inductions.filter((i) => i.driverId === driverId);
  }

  if (haulierId) {
    inductions = inductions.filter((i) => i.haulierId === haulierId);
  }

  if (status) {
    inductions = inductions.filter((i) => i.status === status);
  }

  if (validOnly) {
    inductions = inductions.filter((i) => i.isValid);
  }

  // Sort by created date descending
  inductions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Pagination
  const totalItems = inductions.length;
  const totalPages = Math.ceil(totalItems / perPage);
  const startIndex = (page - 1) * perPage;
  const paginatedInductions = inductions.slice(startIndex, startIndex + perPage);

  logger('[Security] inductions-list', paginatedInductions.length);
  return response(
    {
      inductions: paginatedInductions,
      pagination: {
        page,
        perPage,
        totalItems,
        totalPages,
        hasMore: page < totalPages,
      },
      summary: {
        total: inductions.length,
        completed: inductions.filter((i) => i.status === 'completed').length,
        pending: inductions.filter((i) => i.status === 'pending').length,
        expired: inductions.filter((i) => i.status === 'expired').length,
        valid: inductions.filter((i) => i.isValid).length,
      },
      filters: {
        statuses: INDUCTION_STATUSES,
      },
    },
    STATUS.OK
  );
}

// Get single induction
async function getInduction(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const inductionId = searchParams.get('id');

  if (!inductionId) {
    return response({ message: 'Induction ID is required!' }, STATUS.BAD_REQUEST);
  }

  const inductions = _driverInductions();
  const induction = inductions.find((i) => i.id === inductionId);

  if (!induction) {
    return response({ message: 'Induction not found!' }, STATUS.NOT_FOUND);
  }

  logger('[Security] induction-details', inductionId);
  return response({ induction }, STATUS.OK);
}

// Get vehicle inspections
async function getInspections(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const siteId = searchParams.get('siteId');
  const vehicleId = searchParams.get('vehicleId');
  const haulierId = searchParams.get('haulierId');
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const perPage = parseInt(searchParams.get('perPage') ?? '20', 10);

  let inspections = _vehicleInspections();

  if (siteId) {
    inspections = inspections.filter((i) => i.siteId === siteId);
  }

  if (vehicleId) {
    inspections = inspections.filter((i) => i.vehicleId === vehicleId);
  }

  if (haulierId) {
    inspections = inspections.filter((i) => i.haulierId === haulierId);
  }

  if (status) {
    inspections = inspections.filter((i) => i.status === status);
  }

  // Sort by created date descending
  inspections.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Pagination
  const totalItems = inspections.length;
  const totalPages = Math.ceil(totalItems / perPage);
  const startIndex = (page - 1) * perPage;
  const paginatedInspections = inspections.slice(startIndex, startIndex + perPage);

  logger('[Security] inspections-list', paginatedInspections.length);
  return response(
    {
      inspections: paginatedInspections,
      pagination: {
        page,
        perPage,
        totalItems,
        totalPages,
        hasMore: page < totalPages,
      },
      summary: {
        total: inspections.length,
        passed: inspections.filter((i) => i.status === 'passed').length,
        failed: inspections.filter((i) => i.status === 'failed').length,
        conditional: inspections.filter((i) => i.status === 'conditional').length,
        pending: inspections.filter((i) => i.status === 'pending').length,
      },
      filters: {
        statuses: INSPECTION_STATUSES,
      },
    },
    STATUS.OK
  );
}

// Get single inspection
async function getInspection(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const inspectionId = searchParams.get('id');

  if (!inspectionId) {
    return response({ message: 'Inspection ID is required!' }, STATUS.BAD_REQUEST);
  }

  const inspections = _vehicleInspections();
  const inspection = inspections.find((i) => i.id === inspectionId);

  if (!inspection) {
    return response({ message: 'Inspection not found!' }, STATUS.NOT_FOUND);
  }

  logger('[Security] inspection-details', inspectionId);
  return response({ inspection }, STATUS.OK);
}

// Validate access (simulate RFID card scan)
async function validateAccess(req: NextRequest) {
  const body = await req.json();
  const { rfidCardId, checkpointId } = body;

  if (!rfidCardId || !checkpointId) {
    return response(
      { message: 'RFID card ID and checkpoint ID are required!' },
      STATUS.BAD_REQUEST
    );
  }

  const checkpoints = _checkpoints();
  const checkpoint = checkpoints.find((cp) => cp.id === checkpointId);

  if (!checkpoint) {
    return response({ message: 'Checkpoint not found!' }, STATUS.NOT_FOUND);
  }

  if (!checkpoint.isOnline) {
    return response({ message: 'Checkpoint is offline!' }, STATUS.BAD_REQUEST);
  }

  // Simulate access validation
  // In real system, this would check:
  // 1. Valid RFID card
  // 2. Active order for the driver/vehicle
  // 3. Valid induction
  // 4. Operating hours
  // etc.

  const isGranted = Math.random() > 0.2; // 80% grant rate for demo

  const result = {
    accessGranted: isGranted,
    checkpoint: {
      id: checkpoint.id,
      name: checkpoint.name,
      type: checkpoint.type,
    },
    rfidCardId,
    timestamp: new Date().toISOString(),
    denialReason: isGranted ? null : 'no_active_order',
    message: isGranted ? 'Access granted. Gate opening.' : 'Access denied. No active order found.',
  };

  logger('[Security] access-validation', isGranted ? 'granted' : 'denied');
  return response(result, STATUS.OK);
}
