import type { NextRequest } from 'next/server';

import { uuidv4 } from 'src/utils/uuidv4';
import { logger } from 'src/utils/logger';
import { STATUS, response, handleError } from 'src/utils/response';
import {
  _stockpiles,
  _stockMovements,
  _stockAlerts,
  STOCKPILE_STATUSES,
  MOVEMENT_TYPES,
  ADJUSTMENT_REASONS,
  ALERT_TYPES,
} from 'src/_mock/_stock';

// ----------------------------------------------------------------------

export const runtime = 'edge';

// Endpoint actions
const ENDPOINTS = {
  STOCKPILES: 'stockpiles',
  STOCKPILE: 'stockpile',
  MOVEMENTS: 'movements',
  ADJUSTMENT: 'adjustment',
  ALERTS: 'alerts',
  ACKNOWLEDGE_ALERT: 'acknowledge-alert',
  RESOLVE_ALERT: 'resolve-alert',
};

// In-memory stores
let stockpilesData: Map<string, ReturnType<typeof _stockpiles>[number]> | null = null;
let movementsData: Map<string, ReturnType<typeof _stockMovements>[number]> | null = null;
let alertsData: Map<string, ReturnType<typeof _stockAlerts>[number]> | null = null;

function initializeData() {
  if (!stockpilesData) {
    stockpilesData = new Map(_stockpiles().map((sp) => [sp.id, sp]));
  }
  if (!movementsData) {
    movementsData = new Map(_stockMovements().map((m) => [m.id, m]));
  }
  if (!alertsData) {
    alertsData = new Map(_stockAlerts().map((a) => [a.id, a]));
  }
}

// GET /api/weighbridge/stock
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const endpoint = searchParams.get('endpoint') || ENDPOINTS.STOCKPILES;

    switch (endpoint) {
      case ENDPOINTS.STOCKPILES:
        return getStockpiles(req);
      case ENDPOINTS.STOCKPILE:
        return getStockpile(req);
      case ENDPOINTS.MOVEMENTS:
        return getMovements(req);
      case ENDPOINTS.ALERTS:
        return getAlerts(req);
      default:
        return getStockpiles(req);
    }
  } catch (error) {
    return handleError('Stock - GET', error);
  }
}

// POST /api/weighbridge/stock
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const endpoint = searchParams.get('endpoint');

    switch (endpoint) {
      case ENDPOINTS.ADJUSTMENT:
        return createAdjustment(req);
      case ENDPOINTS.ACKNOWLEDGE_ALERT:
        return acknowledgeAlert(req);
      case ENDPOINTS.RESOLVE_ALERT:
        return resolveAlert(req);
      default:
        return response({ message: 'Invalid endpoint!' }, STATUS.BAD_REQUEST);
    }
  } catch (error) {
    return handleError('Stock - POST', error);
  }
}

// Get stockpiles list
async function getStockpiles(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const siteId = searchParams.get('siteId');
  const productId = searchParams.get('productId');
  const status = searchParams.get('status');
  const lowStockOnly = searchParams.get('lowStockOnly') === 'true';

  initializeData();
  let stockpiles = Array.from(stockpilesData!.values());

  if (siteId) {
    stockpiles = stockpiles.filter((sp) => sp.siteId === siteId);
  }

  if (productId) {
    stockpiles = stockpiles.filter((sp) => sp.productId === productId);
  }

  if (status) {
    stockpiles = stockpiles.filter((sp) => sp.status === status);
  }

  if (lowStockOnly) {
    stockpiles = stockpiles.filter((sp) => sp.isLowStock);
  }

  logger('[Stock] stockpiles-list', stockpiles.length);
  return response(
    {
      stockpiles,
      summary: {
        totalStockpiles: stockpiles.length,
        totalQuantityTonnes: stockpiles.reduce((sum, sp) => sum + sp.currentQuantityTonnes, 0),
        totalValue: stockpiles.reduce((sum, sp) => sum + sp.totalValue, 0),
        lowStockCount: stockpiles.filter((sp) => sp.isLowStock).length,
        overstockCount: stockpiles.filter((sp) => sp.isOverstock).length,
      },
      filters: {
        statuses: STOCKPILE_STATUSES,
      },
    },
    STATUS.OK
  );
}

// Get single stockpile
async function getStockpile(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const stockpileId = searchParams.get('id');

  if (!stockpileId) {
    return response({ message: 'Stockpile ID is required!' }, STATUS.BAD_REQUEST);
  }

  initializeData();

  const stockpile = stockpilesData!.get(stockpileId);

  if (!stockpile) {
    return response({ message: 'Stockpile not found!' }, STATUS.NOT_FOUND);
  }

  // Get movements for this stockpile
  const movements = Array.from(movementsData!.values())
    .filter((m) => m.stockpileId === stockpileId)
    .slice(0, 20);

  logger('[Stock] stockpile-details', stockpileId);
  return response({ stockpile, movements }, STATUS.OK);
}

// Get stock movements
async function getMovements(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const stockpileId = searchParams.get('stockpileId');
  const siteId = searchParams.get('siteId');
  const type = searchParams.get('type');
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const perPage = parseInt(searchParams.get('perPage') ?? '20', 10);

  initializeData();
  let movements = Array.from(movementsData!.values());

  if (stockpileId) {
    movements = movements.filter((m) => m.stockpileId === stockpileId);
  }

  if (siteId) {
    movements = movements.filter((m) => m.siteId === siteId);
  }

  if (type) {
    movements = movements.filter((m) => m.type === type);
  }

  // Sort by date descending
  movements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Pagination
  const totalItems = movements.length;
  const totalPages = Math.ceil(totalItems / perPage);
  const startIndex = (page - 1) * perPage;
  const paginatedMovements = movements.slice(startIndex, startIndex + perPage);

  logger('[Stock] movements-list', paginatedMovements.length);
  return response(
    {
      movements: paginatedMovements,
      pagination: {
        page,
        perPage,
        totalItems,
        totalPages,
        hasMore: page < totalPages,
      },
      filters: {
        types: MOVEMENT_TYPES,
      },
    },
    STATUS.OK
  );
}

// Get stock alerts
async function getAlerts(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const siteId = searchParams.get('siteId');
  const activeOnly = searchParams.get('activeOnly') !== 'false';

  initializeData();
  let alerts = Array.from(alertsData!.values());

  if (siteId) {
    alerts = alerts.filter((a) => a.siteId === siteId);
  }

  if (activeOnly) {
    alerts = alerts.filter((a) => a.isActive);
  }

  // Sort by severity and date
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  logger('[Stock] alerts-list', alerts.length);
  return response(
    {
      alerts,
      summary: {
        total: alerts.length,
        critical: alerts.filter((a) => a.severity === 'critical').length,
        warning: alerts.filter((a) => a.severity === 'warning').length,
        info: alerts.filter((a) => a.severity === 'info').length,
      },
      filters: {
        types: ALERT_TYPES,
      },
    },
    STATUS.OK
  );
}

// Create stock adjustment
async function createAdjustment(req: NextRequest) {
  const body = await req.json();
  const { stockpileId, quantityTonnes, reason, notes, createdBy, createdByName } = body;

  if (!stockpileId || quantityTonnes === undefined || !reason) {
    return response(
      { message: 'Stockpile ID, quantity, and reason are required!' },
      STATUS.BAD_REQUEST
    );
  }

  initializeData();

  const stockpile = stockpilesData!.get(stockpileId);

  if (!stockpile) {
    return response({ message: 'Stockpile not found!' }, STATUS.NOT_FOUND);
  }

  const now = new Date().toISOString();
  const movementCount = movementsData!.size + 1;
  const isInbound = quantityTonnes > 0;

  // Create movement record
  const newMovement = {
    id: `movement_${uuidv4()}`,
    stockpileId,
    stockpileName: stockpile.name,
    siteId: stockpile.siteId,
    siteName: stockpile.siteName,
    organizationId: stockpile.organizationId,
    productId: stockpile.productId,
    productName: stockpile.productName,
    type: 'adjustment' as const,
    direction: isInbound ? ('in' as const) : ('out' as const),
    quantityTonnes: Math.abs(quantityTonnes),
    signedQuantityTonnes: quantityTonnes,
    balanceBeforeTonnes: stockpile.currentQuantityTonnes,
    balanceAfterTonnes: stockpile.currentQuantityTonnes + quantityTonnes,
    ticketId: null,
    ticketNumber: null,
    orderId: null,
    orderNumber: null,
    adjustmentReason: reason,
    adjustmentNotes: notes || null,
    sourceStockpileId: null,
    destinationStockpileId: null,
    transferStockpileId: null,
    valuePerTonne: stockpile.valuePerTonne,
    totalValue: Math.abs(quantityTonnes) * stockpile.valuePerTonne,
    createdBy: createdBy || 'user_system',
    createdByName: createdByName || 'System',
    createdAt: now,
    movementDate: now,
    notes: notes || null,
    syncStatus: 'pending' as const,
  };

  movementsData!.set(newMovement.id, newMovement);

  // Update stockpile
  const updatedStockpile = {
    ...stockpile,
    currentQuantityTonnes: stockpile.currentQuantityTonnes + quantityTonnes,
    availableQuantityTonnes: stockpile.availableQuantityTonnes + quantityTonnes,
    utilizationPercentage: Number(
      (((stockpile.currentQuantityTonnes + quantityTonnes) / stockpile.capacityTonnes) * 100).toFixed(1)
    ),
    totalValue: (stockpile.currentQuantityTonnes + quantityTonnes) * stockpile.valuePerTonne,
    isLowStock: stockpile.currentQuantityTonnes + quantityTonnes < stockpile.lowStockThresholdTonnes,
    isOverstock: stockpile.currentQuantityTonnes + quantityTonnes > stockpile.highStockThresholdTonnes,
    lastMovementAt: now,
    updatedAt: now,
  };

  stockpilesData!.set(stockpileId, updatedStockpile);

  logger('[Stock] adjustment-created', newMovement.id);
  return response({ movement: newMovement, stockpile: updatedStockpile }, STATUS.OK);
}

// Acknowledge alert
async function acknowledgeAlert(req: NextRequest) {
  const body = await req.json();
  const { alertId, acknowledgedBy, acknowledgedByName } = body;

  if (!alertId) {
    return response({ message: 'Alert ID is required!' }, STATUS.BAD_REQUEST);
  }

  initializeData();

  const alert = alertsData!.get(alertId);

  if (!alert) {
    return response({ message: 'Alert not found!' }, STATUS.NOT_FOUND);
  }

  const now = new Date().toISOString();

  const updatedAlert = {
    ...alert,
    isAcknowledged: true,
    acknowledgedBy: acknowledgedBy || 'user_system',
    acknowledgedByName: acknowledgedByName || 'System',
    acknowledgedAt: now,
    updatedAt: now,
  };

  alertsData!.set(alertId, updatedAlert);

  logger('[Stock] alert-acknowledged', alertId);
  return response({ alert: updatedAlert }, STATUS.OK);
}

// Resolve alert
async function resolveAlert(req: NextRequest) {
  const body = await req.json();
  const { alertId, resolvedBy, resolvedByName, resolutionNotes } = body;

  if (!alertId) {
    return response({ message: 'Alert ID is required!' }, STATUS.BAD_REQUEST);
  }

  initializeData();

  const alert = alertsData!.get(alertId);

  if (!alert) {
    return response({ message: 'Alert not found!' }, STATUS.NOT_FOUND);
  }

  const now = new Date().toISOString();

  const updatedAlert = {
    ...alert,
    isActive: false,
    isResolved: true,
    resolvedBy: resolvedBy || 'user_system',
    resolvedByName: resolvedByName || 'System',
    resolvedAt: now,
    resolutionNotes: resolutionNotes || null,
    updatedAt: now,
  };

  alertsData!.set(alertId, updatedAlert);

  logger('[Stock] alert-resolved', alertId);
  return response({ alert: updatedAlert }, STATUS.OK);
}
