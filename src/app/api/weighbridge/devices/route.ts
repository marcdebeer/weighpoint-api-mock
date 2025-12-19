import type { NextRequest } from 'next/server';

import { uuidv4 } from 'src/utils/uuidv4';
import { logger } from 'src/utils/logger';
import { STATUS, response, handleError } from 'src/utils/response';
import {
  _deviceTelemetry,
  _deviceHealth,
  _calibrationRecords,
  _maintenanceEvents,
  _deviceAlerts,
  _devicePerformance,
  _deviceDashboard,
  DEVICE_ALERT_TYPES,
  MAINTENANCE_TYPES,
  MAINTENANCE_STATUSES,
  MAINTENANCE_PRIORITIES,
} from 'src/_mock/_devices';

// ----------------------------------------------------------------------

export const runtime = 'edge';

// Endpoint actions
const ENDPOINTS = {
  DASHBOARD: 'dashboard',
  TELEMETRY: 'telemetry',
  HEALTH: 'health',
  PERFORMANCE: 'performance',
  CALIBRATION: 'calibration',
  MAINTENANCE: 'maintenance',
  ALERTS: 'alerts',
  ACKNOWLEDGE_ALERT: 'acknowledge-alert',
  RESOLVE_ALERT: 'resolve-alert',
  CREATE_MAINTENANCE: 'create-maintenance',
  UPDATE_MAINTENANCE: 'update-maintenance',
};

// In-memory stores
let telemetryData: Map<string, ReturnType<typeof _deviceTelemetry>[number]> | null = null;
let healthData: Map<string, ReturnType<typeof _deviceHealth>[number]> | null = null;
let calibrationData: Map<string, ReturnType<typeof _calibrationRecords>[number]> | null = null;
let maintenanceData: Map<string, ReturnType<typeof _maintenanceEvents>[number]> | null = null;
let alertsData: Map<string, ReturnType<typeof _deviceAlerts>[number]> | null = null;

function initializeData() {
  if (!telemetryData) {
    telemetryData = new Map(_deviceTelemetry().map((t) => [t.weighbridgeId, t]));
  }
  if (!healthData) {
    healthData = new Map(_deviceHealth().map((h) => [h.weighbridgeId, h]));
  }
  if (!calibrationData) {
    calibrationData = new Map(_calibrationRecords().map((c) => [c.id, c]));
  }
  if (!maintenanceData) {
    maintenanceData = new Map(_maintenanceEvents().map((m) => [m.id, m]));
  }
  if (!alertsData) {
    alertsData = new Map(_deviceAlerts().map((a) => [a.id, a]));
  }
}

// GET /api/weighbridge/devices
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const endpoint = searchParams.get('endpoint') || ENDPOINTS.DASHBOARD;

    switch (endpoint) {
      case ENDPOINTS.DASHBOARD:
        return getDashboard(req);
      case ENDPOINTS.TELEMETRY:
        return getTelemetry(req);
      case ENDPOINTS.HEALTH:
        return getHealth(req);
      case ENDPOINTS.PERFORMANCE:
        return getPerformance(req);
      case ENDPOINTS.CALIBRATION:
        return getCalibration(req);
      case ENDPOINTS.MAINTENANCE:
        return getMaintenance(req);
      case ENDPOINTS.ALERTS:
        return getAlerts(req);
      default:
        return getDashboard(req);
    }
  } catch (error) {
    return handleError('Devices - GET', error);
  }
}

// POST /api/weighbridge/devices
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const endpoint = searchParams.get('endpoint');

    switch (endpoint) {
      case ENDPOINTS.ACKNOWLEDGE_ALERT:
        return acknowledgeAlert(req);
      case ENDPOINTS.RESOLVE_ALERT:
        return resolveAlert(req);
      case ENDPOINTS.CREATE_MAINTENANCE:
        return createMaintenance(req);
      case ENDPOINTS.UPDATE_MAINTENANCE:
        return updateMaintenance(req);
      default:
        return response({ message: 'Invalid endpoint!' }, STATUS.BAD_REQUEST);
    }
  } catch (error) {
    return handleError('Devices - POST', error);
  }
}

// Get device dashboard data
async function getDashboard(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const siteId = searchParams.get('siteId');

  const dashboardData = _deviceDashboard();

  // If siteId filter provided, filter relevant data
  if (siteId) {
    initializeData();
    const filteredHealth = Array.from(healthData!.values()).filter((h) => h.siteId === siteId);
    const filteredAlerts = Array.from(alertsData!.values()).filter((a) => a.siteId === siteId);

    dashboardData.healthOverview = {
      healthy: filteredHealth.filter((h) => h.healthStatus === 'healthy').length,
      degraded: filteredHealth.filter((h) => h.healthStatus === 'degraded').length,
      critical: filteredHealth.filter((h) => h.healthStatus === 'critical').length,
      offline: filteredHealth.filter((h) => h.healthStatus === 'offline').length,
      averageHealthScore: Math.round(
        filteredHealth.reduce((sum, h) => sum + h.healthScore, 0) / (filteredHealth.length || 1)
      ),
    };

    dashboardData.recentAlerts = filteredAlerts.filter((a) => a.isActive).slice(0, 5);
  }

  logger('[Devices] dashboard', { siteId });
  return response(dashboardData, STATUS.OK);
}

// Get device telemetry
async function getTelemetry(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const weighbridgeId = searchParams.get('weighbridgeId');
  const siteId = searchParams.get('siteId');

  initializeData();
  let telemetry = Array.from(telemetryData!.values());

  if (weighbridgeId) {
    const singleTelemetry = telemetryData!.get(weighbridgeId);
    if (!singleTelemetry) {
      return response({ message: 'Weighbridge not found!' }, STATUS.NOT_FOUND);
    }
    logger('[Devices] telemetry-single', weighbridgeId);
    return response({ telemetry: singleTelemetry }, STATUS.OK);
  }

  if (siteId) {
    const health = Array.from(healthData!.values()).filter((h) => h.siteId === siteId);
    const weighbridgeIds = health.map((h) => h.weighbridgeId);
    telemetry = telemetry.filter((t) => weighbridgeIds.includes(t.weighbridgeId));
  }

  logger('[Devices] telemetry-list', telemetry.length);
  return response({ telemetry }, STATUS.OK);
}

// Get device health
async function getHealth(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const weighbridgeId = searchParams.get('weighbridgeId');
  const siteId = searchParams.get('siteId');
  const status = searchParams.get('status');

  initializeData();
  let health = Array.from(healthData!.values());

  if (weighbridgeId) {
    const singleHealth = healthData!.get(weighbridgeId);
    if (!singleHealth) {
      return response({ message: 'Weighbridge not found!' }, STATUS.NOT_FOUND);
    }
    logger('[Devices] health-single', weighbridgeId);
    return response({ health: singleHealth }, STATUS.OK);
  }

  if (siteId) {
    health = health.filter((h) => h.siteId === siteId);
  }

  if (status) {
    health = health.filter((h) => h.healthStatus === status);
  }

  // Sort by health score ascending (worst first)
  health.sort((a, b) => a.healthScore - b.healthScore);

  logger('[Devices] health-list', health.length);
  return response(
    {
      health,
      summary: {
        total: health.length,
        healthy: health.filter((h) => h.healthStatus === 'healthy').length,
        degraded: health.filter((h) => h.healthStatus === 'degraded').length,
        critical: health.filter((h) => h.healthStatus === 'critical').length,
        offline: health.filter((h) => h.healthStatus === 'offline').length,
        averageHealthScore: Math.round(
          health.reduce((sum, h) => sum + h.healthScore, 0) / (health.length || 1)
        ),
      },
    },
    STATUS.OK
  );
}

// Get device performance metrics
async function getPerformance(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const weighbridgeId = searchParams.get('weighbridgeId');
  const period = (searchParams.get('period') || 'week') as 'day' | 'week' | 'month' | 'year';

  const performanceData = _devicePerformance(period);

  if (weighbridgeId) {
    const singlePerformance = performanceData.find((p) => p.weighbridgeId === weighbridgeId);
    if (!singlePerformance) {
      return response({ message: 'Weighbridge not found!' }, STATUS.NOT_FOUND);
    }
    logger('[Devices] performance-single', { weighbridgeId, period });
    return response({ performance: singlePerformance }, STATUS.OK);
  }

  // Aggregate summary
  const summary = {
    totalWeighings: performanceData.reduce((sum, p) => sum + p.totalWeighings, 0),
    totalTonnage: performanceData.reduce((sum, p) => sum + p.totalTonnage, 0),
    averageUptimePercent: Math.round(
      performanceData.reduce((sum, p) => sum + p.uptimePercent, 0) / performanceData.length
    ),
    averageWeighingDuration: Math.round(
      performanceData.reduce((sum, p) => sum + p.averageWeighingDurationSeconds, 0) / performanceData.length
    ),
  };

  logger('[Devices] performance-list', { period, count: performanceData.length });
  return response({ performance: performanceData, summary, period }, STATUS.OK);
}

// Get calibration records
async function getCalibration(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const weighbridgeId = searchParams.get('weighbridgeId');
  const siteId = searchParams.get('siteId');
  const status = searchParams.get('status');

  initializeData();
  let calibrations = Array.from(calibrationData!.values());

  if (weighbridgeId) {
    calibrations = calibrations.filter((c) => c.weighbridgeId === weighbridgeId);
  }

  if (siteId) {
    calibrations = calibrations.filter((c) => c.siteId === siteId);
  }

  if (status) {
    calibrations = calibrations.filter((c) => c.status === status);
  }

  // Sort by calibration date descending
  calibrations.sort(
    (a, b) => new Date(b.calibrationDate).getTime() - new Date(a.calibrationDate).getTime()
  );

  // Get latest calibration per weighbridge for summary
  const latestByWeighbridge = new Map<string, (typeof calibrations)[number]>();
  calibrations.forEach((c) => {
    if (!latestByWeighbridge.has(c.weighbridgeId)) {
      latestByWeighbridge.set(c.weighbridgeId, c);
    }
  });
  const latestCalibrations = Array.from(latestByWeighbridge.values());

  logger('[Devices] calibration-list', calibrations.length);
  return response(
    {
      calibrations,
      summary: {
        total: latestCalibrations.length,
        valid: latestCalibrations.filter((c) => c.status === 'valid').length,
        dueSoon: latestCalibrations.filter((c) => c.status === 'due_soon').length,
        overdue: latestCalibrations.filter((c) => c.status === 'overdue').length,
        inProgress: latestCalibrations.filter((c) => c.status === 'in_progress').length,
      },
    },
    STATUS.OK
  );
}

// Get maintenance events
async function getMaintenance(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const weighbridgeId = searchParams.get('weighbridgeId');
  const siteId = searchParams.get('siteId');
  const status = searchParams.get('status');
  const type = searchParams.get('type');
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const perPage = parseInt(searchParams.get('perPage') ?? '20', 10);

  initializeData();
  let maintenance = Array.from(maintenanceData!.values());

  if (weighbridgeId) {
    maintenance = maintenance.filter((m) => m.weighbridgeId === weighbridgeId);
  }

  if (siteId) {
    maintenance = maintenance.filter((m) => m.siteId === siteId);
  }

  if (status) {
    maintenance = maintenance.filter((m) => m.status === status);
  }

  if (type) {
    maintenance = maintenance.filter((m) => m.type === type);
  }

  // Sort by scheduled date descending
  maintenance.sort(
    (a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
  );

  // Pagination
  const totalItems = maintenance.length;
  const totalPages = Math.ceil(totalItems / perPage);
  const startIndex = (page - 1) * perPage;
  const paginatedMaintenance = maintenance.slice(startIndex, startIndex + perPage);

  logger('[Devices] maintenance-list', paginatedMaintenance.length);
  return response(
    {
      maintenance: paginatedMaintenance,
      pagination: {
        page,
        perPage,
        totalItems,
        totalPages,
        hasMore: page < totalPages,
      },
      summary: {
        scheduled: maintenance.filter((m) => m.status === 'scheduled').length,
        inProgress: maintenance.filter((m) => m.status === 'in_progress').length,
        completed: maintenance.filter((m) => m.status === 'completed').length,
        cancelled: maintenance.filter((m) => m.status === 'cancelled').length,
      },
      filters: {
        types: MAINTENANCE_TYPES,
        statuses: MAINTENANCE_STATUSES,
        priorities: MAINTENANCE_PRIORITIES,
      },
    },
    STATUS.OK
  );
}

// Get device alerts
async function getAlerts(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const weighbridgeId = searchParams.get('weighbridgeId');
  const siteId = searchParams.get('siteId');
  const severity = searchParams.get('severity');
  const activeOnly = searchParams.get('activeOnly') !== 'false';
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const perPage = parseInt(searchParams.get('perPage') ?? '20', 10);

  initializeData();
  let alerts = Array.from(alertsData!.values());

  if (weighbridgeId) {
    alerts = alerts.filter((a) => a.weighbridgeId === weighbridgeId);
  }

  if (siteId) {
    alerts = alerts.filter((a) => a.siteId === siteId);
  }

  if (severity) {
    alerts = alerts.filter((a) => a.severity === severity);
  }

  if (activeOnly) {
    alerts = alerts.filter((a) => a.isActive);
  }

  // Sort by severity and date
  const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime();
  });

  // Pagination
  const totalItems = alerts.length;
  const totalPages = Math.ceil(totalItems / perPage);
  const startIndex = (page - 1) * perPage;
  const paginatedAlerts = alerts.slice(startIndex, startIndex + perPage);

  logger('[Devices] alerts-list', paginatedAlerts.length);
  return response(
    {
      alerts: paginatedAlerts,
      pagination: {
        page,
        perPage,
        totalItems,
        totalPages,
        hasMore: page < totalPages,
      },
      summary: {
        total: alerts.length,
        critical: alerts.filter((a) => a.severity === 'critical').length,
        warning: alerts.filter((a) => a.severity === 'warning').length,
        info: alerts.filter((a) => a.severity === 'info').length,
        unacknowledged: alerts.filter((a) => !a.isAcknowledged).length,
      },
      filters: {
        types: DEVICE_ALERT_TYPES,
        severities: ['critical', 'warning', 'info'],
      },
    },
    STATUS.OK
  );
}

// Acknowledge device alert
async function acknowledgeAlert(req: NextRequest) {
  const body = await req.json();
  const { alertId, acknowledgedBy, acknowledgementNote } = body;

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
    acknowledgedBy: acknowledgedBy || 'System User',
    acknowledgedAt: now,
    acknowledgementNote: acknowledgementNote || null,
    updatedAt: now,
  };

  alertsData!.set(alertId, updatedAlert);

  logger('[Devices] alert-acknowledged', alertId);
  return response({ alert: updatedAlert }, STATUS.OK);
}

// Resolve device alert
async function resolveAlert(req: NextRequest) {
  const body = await req.json();
  const { alertId, resolvedBy, resolutionNote } = body;

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
    resolvedBy: resolvedBy || 'System User',
    resolvedAt: now,
    resolutionNote: resolutionNote || null,
    updatedAt: now,
  };

  alertsData!.set(alertId, updatedAlert);

  logger('[Devices] alert-resolved', alertId);
  return response({ alert: updatedAlert }, STATUS.OK);
}

// Create maintenance event
async function createMaintenance(req: NextRequest) {
  const body = await req.json();
  const {
    weighbridgeId,
    weighbridgeName,
    siteId,
    siteName,
    type,
    priority,
    scheduledDate,
    estimatedDurationMinutes,
    title,
    description,
    assignedTo,
    technicianCompany,
  } = body;

  if (!weighbridgeId || !type || !scheduledDate || !title) {
    return response(
      { message: 'Weighbridge ID, type, scheduled date, and title are required!' },
      STATUS.BAD_REQUEST
    );
  }

  initializeData();

  const now = new Date().toISOString();

  const newMaintenance = {
    id: `maint_${uuidv4()}`,
    weighbridgeId,
    weighbridgeName: weighbridgeName || 'Unknown',
    siteId: siteId || null,
    siteName: siteName || 'Unknown',
    type,
    status: 'scheduled' as const,
    priority: priority || 'normal',
    scheduledDate,
    startedAt: null,
    completedAt: null,
    estimatedDurationMinutes: estimatedDurationMinutes || 120,
    actualDurationMinutes: null,
    title,
    description: description || null,
    workPerformed: null,
    partsReplaced: null,
    assignedTo: assignedTo || null,
    technicianCompany: technicianCompany || null,
    laborCost: null,
    partsCost: null,
    totalCost: null,
    beforePhotos: [],
    afterPhotos: [],
    notes: null,
    createdAt: now,
    updatedAt: now,
  };

  maintenanceData!.set(newMaintenance.id, newMaintenance);

  logger('[Devices] maintenance-created', newMaintenance.id);
  return response({ maintenance: newMaintenance }, STATUS.OK);
}

// Update maintenance event
async function updateMaintenance(req: NextRequest) {
  const body = await req.json();
  const { maintenanceId, ...updates } = body;

  if (!maintenanceId) {
    return response({ message: 'Maintenance ID is required!' }, STATUS.BAD_REQUEST);
  }

  initializeData();

  const maintenance = maintenanceData!.get(maintenanceId);

  if (!maintenance) {
    return response({ message: 'Maintenance event not found!' }, STATUS.NOT_FOUND);
  }

  const now = new Date().toISOString();

  const updatedMaintenance = {
    ...maintenance,
    ...updates,
    updatedAt: now,
  };

  // If completing maintenance, calculate duration
  if (updates.status === 'completed' && maintenance.startedAt) {
    const startTime = new Date(maintenance.startedAt).getTime();
    const endTime = new Date(now).getTime();
    updatedMaintenance.actualDurationMinutes = Math.round((endTime - startTime) / (1000 * 60));
    updatedMaintenance.completedAt = now;
  }

  // If starting maintenance, set start time
  if (updates.status === 'in_progress' && !maintenance.startedAt) {
    updatedMaintenance.startedAt = now;
  }

  maintenanceData!.set(maintenanceId, updatedMaintenance);

  logger('[Devices] maintenance-updated', maintenanceId);
  return response({ maintenance: updatedMaintenance }, STATUS.OK);
}
