import { fSub } from 'src/utils/set-date';

import { _mock } from './_mock';
import { _sites, _weighbridges } from './_weighbridge';

// ----------------------------------------------------------------------
// DEVICE MANAGEMENT MOCK DATA
// Telemetry, Health, Calibration, Maintenance, and Alerts
// ----------------------------------------------------------------------

// Status types
export const DEVICE_CONNECTION_STATUSES = ['connected', 'disconnected', 'reconnecting', 'error'] as const;
export const DEVICE_HEALTH_STATUSES = ['healthy', 'degraded', 'critical', 'offline'] as const;
export const CALIBRATION_STATUSES = ['valid', 'due_soon', 'overdue', 'in_progress'] as const;
export const MAINTENANCE_TYPES = ['scheduled', 'unscheduled', 'emergency', 'calibration'] as const;
export const MAINTENANCE_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'] as const;
export const MAINTENANCE_PRIORITIES = ['low', 'normal', 'high', 'critical'] as const;

export const DEVICE_ALERT_TYPES = [
  'connectivity_lost',
  'connectivity_unstable',
  'calibration_due',
  'calibration_overdue',
  'load_cell_error',
  'load_cell_drift',
  'temperature_high',
  'temperature_low',
  'humidity_high',
  'power_fluctuation',
  'weight_variance',
  'performance_degraded',
  'maintenance_due',
  'certificate_expiring',
] as const;

// ----------------------------------------------------------------------
// DEVICE TELEMETRY
// ----------------------------------------------------------------------

const LOAD_CELL_POSITIONS = ['front-left', 'front-right', 'rear-left', 'rear-right'];

export const _deviceTelemetry = () => {
  const weighbridges = _weighbridges();

  return weighbridges.map((wb, index) => {
    const isOnline = wb.status === 'online';
    const hasIssues = index % 5 === 0;

    return {
      id: `telem_${_mock.id(index)}`,
      weighbridgeId: wb.id,
      timestamp: new Date().toISOString(),
      currentWeightKg: isOnline ? Math.floor(Math.random() * 40000) + 5000 : 0,
      isStable: isOnline && !hasIssues,
      stabilitySeconds: isOnline ? Math.random() * 5 + 1 : 0,
      temperature: 20 + Math.random() * 15 + (hasIssues ? 10 : 0),
      humidity: 40 + Math.random() * 30,
      voltage: 220 + Math.random() * 20 - 10,
      signalStrength: isOnline ? -30 - Math.random() * 40 : -100,
      loadCells: LOAD_CELL_POSITIONS.map((position, cellIndex) => ({
        cellId: `lc_${index}_${cellIndex}`,
        position,
        rawValue: 10000 + Math.floor(Math.random() * 5000),
        calibratedValue: 10000 + Math.floor(Math.random() * 5000),
        deviationPercent: hasIssues && cellIndex === 0 ? 2.5 : Math.random() * 0.5,
        status: hasIssues && cellIndex === 0 ? 'warning' : 'normal',
      })),
      connectionStatus: isOnline
        ? 'connected'
        : wb.status === 'error'
          ? 'error'
          : 'disconnected',
      lastHeartbeat: isOnline
        ? new Date(Date.now() - Math.random() * 5000).toISOString()
        : fSub({ hours: index + 1 }),
      latencyMs: isOnline ? Math.floor(Math.random() * 80) + 20 : 0,
      packetLoss: isOnline ? Math.random() * 2 : 100,
      cpuUsage: isOnline ? 15 + Math.random() * 30 : 0,
      memoryUsage: isOnline ? 30 + Math.random() * 40 : 0,
      diskUsage: 10 + Math.random() * 20,
      uptime: isOnline ? Math.floor(Math.random() * 2592000) + 86400 : 0, // 1-30 days in seconds
    };
  });
};

// ----------------------------------------------------------------------
// DEVICE HEALTH
// ----------------------------------------------------------------------

const COMPONENT_TYPES = ['load_cell', 'indicator', 'network', 'power', 'sensor', 'software'] as const;

export const _deviceHealth = () => {
  const weighbridges = _weighbridges();
  const sites = _sites();

  return weighbridges.map((wb, index) => {
    const site = sites.find((s) => s.id === wb.siteId);
    const isOnline = wb.status === 'online';
    const hasIssues = index % 4 === 0;
    const healthScore = isOnline ? (hasIssues ? 65 + Math.random() * 15 : 85 + Math.random() * 15) : 0;

    const healthStatus = !isOnline
      ? 'offline'
      : healthScore < 70
        ? 'critical'
        : healthScore < 85
          ? 'degraded'
          : 'healthy';

    return {
      id: `health_${_mock.id(index)}`,
      weighbridgeId: wb.id,
      weighbridgeName: wb.name,
      siteId: wb.siteId,
      siteName: site?.name || 'Unknown Site',
      healthScore: Math.round(healthScore),
      healthStatus,
      components: COMPONENT_TYPES.map((type, compIndex) => ({
        name: type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        type,
        status: hasIssues && compIndex === 0 ? 'warning' : isOnline ? 'ok' : 'error',
        healthPercent: isOnline ? (hasIssues && compIndex === 0 ? 70 : 90 + Math.random() * 10) : 0,
        lastCheck: fSub({ minutes: Math.floor(Math.random() * 60) }),
        message: hasIssues && compIndex === 0 ? 'Slight deviation detected' : null,
      })),
      lastHealthCheck: fSub({ minutes: Math.floor(Math.random() * 30) }),
      activeIssues: hasIssues
        ? [
            {
              id: `issue_${_mock.id(index)}`,
              type: 'hardware',
              severity: 'warning',
              title: 'Load cell deviation detected',
              description: 'Front-left load cell showing 2.5% deviation from calibrated value',
              firstDetected: fSub({ days: 2 }),
              lastOccurred: fSub({ hours: 1 }),
              occurrenceCount: 5,
              isAcknowledged: false,
              acknowledgedBy: null,
              acknowledgedAt: null,
            },
          ]
        : [],
      predictedFailure: hasIssues ? fSub({ days: -30 }) : null,
      maintenanceRecommendation: hasIssues ? 'Schedule load cell inspection within 2 weeks' : null,
    };
  });
};

// ----------------------------------------------------------------------
// CALIBRATION RECORDS
// ----------------------------------------------------------------------

export const _calibrationRecords = () => {
  const weighbridges = _weighbridges();
  const sites = _sites();

  const records: any[] = [];

  weighbridges.forEach((wb, wbIndex) => {
    const site = sites.find((s) => s.id === wb.siteId);

    // Create 2-3 calibration records per weighbridge
    const recordCount = 2 + (wbIndex % 2);

    for (let i = 0; i < recordCount; i++) {
      const calibrationDate = fSub({ days: 365 * i + wbIndex * 10 });
      const expiryDate = fSub({ days: 365 * i - 365 + wbIndex * 10 });
      const isLatest = i === 0;

      // Determine status based on expiry
      const daysUntilExpiry = Math.floor(
        (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      let status: (typeof CALIBRATION_STATUSES)[number] = 'valid';
      if (daysUntilExpiry < 0) status = 'overdue';
      else if (daysUntilExpiry < 30) status = 'due_soon';

      const testWeight = 40000;
      const errorKg = Math.random() * 20 - 10;

      records.push({
        id: `cal_${_mock.id(wbIndex * 10 + i)}`,
        weighbridgeId: wb.id,
        weighbridgeName: wb.name,
        siteId: wb.siteId,
        siteName: site?.name || 'Unknown Site',
        calibrationDate,
        expiryDate,
        certificateNumber: `CAL-${2024 - i}-${String(wbIndex + 1).padStart(4, '0')}`,
        status: isLatest ? status : 'valid',
        performedBy: _mock.fullName(wbIndex + i),
        technicianCompany: 'Precision Calibration Services',
        technicianContact: _mock.phoneNumber(wbIndex),
        testWeightKg: testWeight,
        indicatedWeightKg: testWeight + errorKg,
        errorKg,
        errorPercent: (errorKg / testWeight) * 100,
        passedVerification: Math.abs(errorKg) < 40,
        adjustmentsMade: i === 0 && wbIndex % 3 === 0 ? 'Zero point adjusted, span calibration performed' : null,
        loadCellAdjustments:
          i === 0 && wbIndex % 3 === 0
            ? LOAD_CELL_POSITIONS.map((_, idx) => ({
                cellId: `lc_${wbIndex}_${idx}`,
                adjustment: Math.random() * 2 - 1,
              }))
            : [],
        certificateUrl: `/certificates/cal-${wbIndex}-${i}.pdf`,
        reportUrl: `/reports/cal-report-${wbIndex}-${i}.pdf`,
        notes: i === 0 ? 'Annual calibration completed successfully' : null,
        createdAt: calibrationDate,
      });
    }
  });

  return records;
};

// ----------------------------------------------------------------------
// MAINTENANCE EVENTS
// ----------------------------------------------------------------------

export const _maintenanceEvents = () => {
  const weighbridges = _weighbridges();
  const sites = _sites();

  const events: any[] = [];

  weighbridges.forEach((wb, wbIndex) => {
    const site = sites.find((s) => s.id === wb.siteId);

    // Create 3-5 maintenance events per weighbridge
    const eventCount = 3 + (wbIndex % 3);

    for (let i = 0; i < eventCount; i++) {
      const isCompleted = i > 0;
      const isScheduled = i === 0 && wbIndex % 2 === 0;
      const scheduledDate = isCompleted ? fSub({ days: 30 * i + wbIndex * 5 }) : fSub({ days: -14 + wbIndex });

      events.push({
        id: `maint_${_mock.id(wbIndex * 10 + i)}`,
        weighbridgeId: wb.id,
        weighbridgeName: wb.name,
        siteId: wb.siteId,
        siteName: site?.name || 'Unknown Site',
        type: MAINTENANCE_TYPES[i % MAINTENANCE_TYPES.length],
        status: isCompleted ? 'completed' : isScheduled ? 'scheduled' : 'in_progress',
        priority: MAINTENANCE_PRIORITIES[(wbIndex + i) % MAINTENANCE_PRIORITIES.length],
        scheduledDate,
        startedAt: isCompleted || !isScheduled ? fSub({ days: 30 * i + wbIndex * 5, hours: 2 }) : null,
        completedAt: isCompleted ? fSub({ days: 30 * i + wbIndex * 5, hours: -2 }) : null,
        estimatedDurationMinutes: 120 + i * 30,
        actualDurationMinutes: isCompleted ? 110 + i * 30 + Math.floor(Math.random() * 30) : null,
        title: [
          'Quarterly preventive maintenance',
          'Load cell inspection and cleaning',
          'Indicator display replacement',
          'Network connectivity repair',
          'Platform crack repair',
        ][i % 5],
        description: _mock.description(wbIndex + i),
        workPerformed: isCompleted
          ? 'Inspected all components, cleaned load cells, tested accuracy, verified calibration'
          : null,
        partsReplaced: isCompleted && i % 2 === 0 ? ['Junction box seal', 'Cable connector'] : null,
        assignedTo: _mock.fullName(wbIndex + i),
        technicianCompany: 'Industrial Scale Services',
        laborCost: isCompleted ? 1500 + Math.floor(Math.random() * 500) : null,
        partsCost: isCompleted && i % 2 === 0 ? 350 + Math.floor(Math.random() * 200) : null,
        totalCost: isCompleted ? 1500 + Math.floor(Math.random() * 500) + (i % 2 === 0 ? 350 : 0) : null,
        beforePhotos: isCompleted ? [`/maintenance/before-${wbIndex}-${i}.jpg`] : [],
        afterPhotos: isCompleted ? [`/maintenance/after-${wbIndex}-${i}.jpg`] : [],
        notes: isCompleted ? 'Maintenance completed successfully. All systems operational.' : null,
        createdAt: fSub({ days: 35 * i + wbIndex * 5 }),
        updatedAt: isCompleted ? fSub({ days: 30 * i + wbIndex * 5 }) : fSub({ days: 0 }),
      });
    }
  });

  return events;
};

// ----------------------------------------------------------------------
// DEVICE ALERTS
// ----------------------------------------------------------------------

const ALERT_MESSAGES: Record<string, { title: string; message: string; unit?: string }> = {
  connectivity_lost: {
    title: 'Device Offline',
    message: 'Connection to weighbridge has been lost. Last heartbeat received over 5 minutes ago.',
  },
  connectivity_unstable: {
    title: 'Unstable Connection',
    message: 'Intermittent connectivity detected. Packet loss exceeds acceptable threshold.',
    unit: '%',
  },
  calibration_due: {
    title: 'Calibration Due Soon',
    message: 'Calibration certificate expires within 30 days. Schedule calibration.',
    unit: 'days',
  },
  calibration_overdue: {
    title: 'Calibration Overdue',
    message: 'Calibration certificate has expired. Device should not be used for trade purposes.',
    unit: 'days',
  },
  load_cell_error: {
    title: 'Load Cell Error',
    message: 'Load cell reading outside acceptable range. Immediate inspection required.',
    unit: 'kg',
  },
  load_cell_drift: {
    title: 'Load Cell Drift Detected',
    message: 'Gradual drift detected in load cell readings. Calibration recommended.',
    unit: '%',
  },
  temperature_high: {
    title: 'High Temperature',
    message: 'Operating temperature exceeds recommended maximum. Check ventilation.',
    unit: '°C',
  },
  temperature_low: {
    title: 'Low Temperature',
    message: 'Operating temperature below recommended minimum.',
    unit: '°C',
  },
  humidity_high: {
    title: 'High Humidity',
    message: 'Humidity levels exceed safe operating range. Risk of moisture damage.',
    unit: '%',
  },
  power_fluctuation: {
    title: 'Power Fluctuation',
    message: 'Voltage irregularities detected. Check power supply.',
    unit: 'V',
  },
  weight_variance: {
    title: 'Weight Variance Detected',
    message: 'Significant variance between expected and measured weights.',
    unit: '%',
  },
  performance_degraded: {
    title: 'Performance Degraded',
    message: 'System performance below optimal levels. Response times elevated.',
    unit: 'ms',
  },
  maintenance_due: {
    title: 'Maintenance Due',
    message: 'Scheduled maintenance is due. Please arrange service.',
    unit: 'days',
  },
  certificate_expiring: {
    title: 'Certificate Expiring',
    message: 'Trade certification expires soon. Renewal required.',
    unit: 'days',
  },
};

export const _deviceAlerts = () => {
  const weighbridges = _weighbridges();
  const sites = _sites();

  const alerts: any[] = [];

  weighbridges.forEach((wb, wbIndex) => {
    const site = sites.find((s) => s.id === wb.siteId);

    // Create 0-3 alerts per weighbridge
    const alertCount = wbIndex % 4;

    for (let i = 0; i < alertCount; i++) {
      const alertType = DEVICE_ALERT_TYPES[(wbIndex + i) % DEVICE_ALERT_TYPES.length];
      const alertInfo = ALERT_MESSAGES[alertType];
      const severity = i === 0 ? 'critical' : i === 1 ? 'warning' : 'info';
      const isActive = i < 2;
      const isAcknowledged = i === 1;

      alerts.push({
        id: `alert_${_mock.id(wbIndex * 10 + i)}`,
        weighbridgeId: wb.id,
        weighbridgeName: wb.name,
        siteId: wb.siteId,
        siteName: site?.name || 'Unknown Site',
        alertType,
        severity,
        title: alertInfo.title,
        message: alertInfo.message,
        thresholdValue: alertInfo.unit ? 30 + i * 10 : null,
        currentValue: alertInfo.unit ? 35 + i * 15 : null,
        unit: alertInfo.unit || null,
        isActive,
        triggeredAt: fSub({ hours: i * 6 + wbIndex }),
        resolvedAt: isActive ? null : fSub({ hours: i * 3 }),
        isAcknowledged,
        acknowledgedBy: isAcknowledged ? _mock.fullName(wbIndex) : null,
        acknowledgedAt: isAcknowledged ? fSub({ hours: i * 4 }) : null,
        acknowledgementNote: isAcknowledged ? 'Investigating issue' : null,
        isResolved: !isActive,
        resolvedBy: !isActive ? _mock.fullName(wbIndex + 1) : null,
        resolutionNote: !isActive ? 'Issue resolved after maintenance' : null,
        autoResolve: alertType === 'connectivity_lost',
        autoResolveCondition: alertType === 'connectivity_lost' ? 'Device reconnects' : null,
        createdAt: fSub({ hours: i * 6 + wbIndex }),
        updatedAt: fSub({ hours: i * 2 }),
      });
    }
  });

  return alerts;
};

// ----------------------------------------------------------------------
// DEVICE PERFORMANCE METRICS
// ----------------------------------------------------------------------

export const _devicePerformance = (period: 'day' | 'week' | 'month' | 'year' = 'week') => {
  const weighbridges = _weighbridges();

  return weighbridges.map((wb, index) => {
    const isOnline = wb.status === 'online';
    const baseWeighings = period === 'day' ? 25 : period === 'week' ? 150 : period === 'month' ? 600 : 7000;
    const totalWeighings = isOnline ? baseWeighings + Math.floor(Math.random() * baseWeighings * 0.3) : 0;
    const avgTonnagePerWeighing = 25 + Math.random() * 10;

    const periodDays = period === 'day' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 365;

    return {
      weighbridgeId: wb.id,
      weighbridgeName: wb.name,
      period,
      periodStart: fSub({ days: periodDays }),
      periodEnd: new Date().toISOString(),
      totalWeighings,
      totalTonnage: Math.round(totalWeighings * avgTonnagePerWeighing),
      averageWeighingsPerHour: isOnline ? Math.round((totalWeighings / (periodDays * 12)) * 10) / 10 : 0,
      peakWeighingsPerHour: isOnline ? Math.floor(Math.random() * 8) + 5 : 0,
      peakHour: '10:00',
      averageWeighingDurationSeconds: isOnline ? 45 + Math.floor(Math.random() * 30) : 0,
      averageStabilizationSeconds: isOnline ? 3 + Math.random() * 2 : 0,
      averageVariancePercent: isOnline ? Math.random() * 1.5 : 0,
      outOfToleranceCount: isOnline ? Math.floor(Math.random() * 5) : 0,
      uptimePercent: isOnline ? 95 + Math.random() * 5 : 0,
      downtimeMinutes: isOnline ? Math.floor(Math.random() * 120) : periodDays * 24 * 60,
      maintenanceMinutes: Math.floor(Math.random() * 60),
      weighingsByHour: Array.from({ length: 24 }, (_, hour) => ({
        hour,
        count: hour >= 6 && hour <= 18 ? Math.floor(Math.random() * 10) + 2 : Math.floor(Math.random() * 3),
      })),
      weighingsByDay: Array.from({ length: Math.min(periodDays, 30) }, (_, dayIndex) => ({
        date: fSub({ days: periodDays - dayIndex - 1 }),
        count: isOnline ? Math.floor(Math.random() * 40) + 15 : 0,
        tonnage: isOnline ? Math.floor(Math.random() * 1000) + 400 : 0,
      })),
      throughputTrend: Array.from({ length: Math.min(periodDays, 30) }, (_, dayIndex) => ({
        date: fSub({ days: periodDays - dayIndex - 1 }),
        weighings: isOnline ? Math.floor(Math.random() * 40) + 15 : 0,
        tonnage: isOnline ? Math.floor(Math.random() * 1000) + 400 : 0,
      })),
    };
  });
};

// ----------------------------------------------------------------------
// DEVICE DASHBOARD DATA
// ----------------------------------------------------------------------

export const _deviceDashboard = () => {
  const sites = _sites();
  const weighbridges = _weighbridges();
  const health = _deviceHealth();
  const alerts = _deviceAlerts();
  const telemetry = _deviceTelemetry();

  const onlineSites = sites.filter((s) => s.status === 'operational').length;
  const maintenanceSites = sites.filter((s) => s.status === 'maintenance').length;
  const offlineSites = sites.filter((s) => s.status === 'offline').length;

  const onlineWeighbridges = weighbridges.filter((wb) => wb.status === 'online').length;
  const offlineWeighbridges = weighbridges.filter((wb) => wb.status === 'offline').length;
  const calibratingWeighbridges = weighbridges.filter((wb) => wb.status === 'calibrating').length;
  const errorWeighbridges = weighbridges.filter((wb) => wb.status === 'error').length;

  const healthyCount = health.filter((h) => h.healthStatus === 'healthy').length;
  const degradedCount = health.filter((h) => h.healthStatus === 'degraded').length;
  const criticalCount = health.filter((h) => h.healthStatus === 'critical').length;
  const offlineCount = health.filter((h) => h.healthStatus === 'offline').length;
  const avgHealthScore =
    health.reduce((sum, h) => sum + h.healthScore, 0) / health.length;

  const activeAlerts = alerts.filter((a) => a.isActive);
  const criticalAlerts = activeAlerts.filter((a) => a.severity === 'critical').length;
  const warningAlerts = activeAlerts.filter((a) => a.severity === 'warning').length;
  const infoAlerts = activeAlerts.filter((a) => a.severity === 'info').length;
  const unacknowledgedAlerts = activeAlerts.filter((a) => !a.isAcknowledged).length;

  const calibrationRecords = _calibrationRecords();
  const latestCalibrations = weighbridges.map((wb) => {
    const records = calibrationRecords.filter((r) => r.weighbridgeId === wb.id);
    return records.sort((a, b) => new Date(b.calibrationDate).getTime() - new Date(a.calibrationDate).getTime())[0];
  });
  const validCalibrations = latestCalibrations.filter((c) => c?.status === 'valid').length;
  const dueSoonCalibrations = latestCalibrations.filter((c) => c?.status === 'due_soon').length;
  const overdueCalibrations = latestCalibrations.filter((c) => c?.status === 'overdue').length;

  const maintenanceEvents = _maintenanceEvents();
  const scheduledMaintenance = maintenanceEvents.filter((m) => m.status === 'scheduled').length;
  const inProgressMaintenance = maintenanceEvents.filter((m) => m.status === 'in_progress').length;

  return {
    summary: {
      totalSites: sites.length,
      operationalSites: onlineSites,
      maintenanceSites,
      offlineSites,
      totalWeighbridges: weighbridges.length,
      onlineWeighbridges,
      offlineWeighbridges,
      calibratingWeighbridges,
      errorWeighbridges,
    },
    healthOverview: {
      healthy: healthyCount,
      degraded: degradedCount,
      critical: criticalCount,
      offline: offlineCount,
      averageHealthScore: Math.round(avgHealthScore),
    },
    alertSummary: {
      total: activeAlerts.length,
      critical: criticalAlerts,
      warning: warningAlerts,
      info: infoAlerts,
      unacknowledged: unacknowledgedAlerts,
    },
    calibrationStatus: {
      valid: validCalibrations,
      dueSoon: dueSoonCalibrations,
      overdue: overdueCalibrations,
      inProgress: 0,
      nextDueDate: fSub({ days: -15 }),
      nextDueWeighbridge: weighbridges[0]?.name || null,
    },
    maintenanceStatus: {
      scheduledCount: scheduledMaintenance,
      inProgressCount: inProgressMaintenance,
      overdueCount: 1,
      nextMaintenanceDate: fSub({ days: -7 }),
      nextMaintenanceWeighbridge: weighbridges[2]?.name || null,
    },
    recentAlerts: activeAlerts.slice(0, 5),
    recentTelemetry: telemetry.slice(0, 5),
    charts: {
      deviceStatusDistribution: [
        { status: 'Online', count: onlineWeighbridges },
        { status: 'Offline', count: offlineWeighbridges },
        { status: 'Calibrating', count: calibratingWeighbridges },
        { status: 'Error', count: errorWeighbridges },
      ],
      healthScoresByDevice: health.map((h) => ({
        name: h.weighbridgeName,
        score: h.healthScore,
      })),
      alertsOverTime: Array.from({ length: 7 }, (_, i) => ({
        date: fSub({ days: 6 - i }),
        critical: Math.floor(Math.random() * 3),
        warning: Math.floor(Math.random() * 5),
        info: Math.floor(Math.random() * 4),
      })),
      uptimeByDevice: weighbridges.map((wb, i) => ({
        name: wb.name,
        uptime: wb.status === 'online' ? 95 + Math.random() * 5 : 0,
      })),
      throughputByDevice: weighbridges.map((wb, i) => ({
        name: wb.name,
        weighings: wb.status === 'online' ? Math.floor(Math.random() * 200) + 100 : 0,
        tonnage: wb.status === 'online' ? Math.floor(Math.random() * 5000) + 2500 : 0,
      })),
    },
  };
};
