import { fSub } from 'src/utils/set-date';

import { _mock } from './_mock';
import { _sites, _vehicles, _drivers } from './_weighbridge';
import { _orders } from './_orders';

// ----------------------------------------------------------------------
// ACCESS CONTROL & SECURITY MOCK DATA
// RFID-based access control with checkpoint validation
// ----------------------------------------------------------------------

export const CHECKPOINT_TYPES = [
  'entrance',
  'tare_weighbridge',
  'gross_weighbridge',
  'loading_bay',
  'exit',
] as const;

export const ACCESS_EVENTS = [
  'card_presented',
  'access_granted',
  'access_denied',
  'gate_opened',
  'gate_closed',
  'timeout',
] as const;

export const DENIAL_REASONS = [
  'invalid_card',
  'expired_card',
  'unauthorized_vehicle',
  'no_active_order',
  'induction_expired',
  'vehicle_inspection_failed',
  'outside_operating_hours',
  'blacklisted',
] as const;

// ----------------------------------------------------------------------
// CHECKPOINTS (Physical access points)
// ----------------------------------------------------------------------

export const _checkpoints = () => {
  const sites = _sites();

  const checkpointConfigs = [
    { type: 'entrance', name: 'Main Entrance Gate' },
    { type: 'tare_weighbridge', name: 'Tare Weighbridge Access' },
    { type: 'gross_weighbridge', name: 'Gross Weighbridge Access' },
    { type: 'loading_bay', name: 'Loading Bay Access' },
    { type: 'exit', name: 'Exit Gate' },
  ];

  return sites.flatMap((site, siteIndex) =>
    checkpointConfigs.map((config, configIndex) => {
      const index = siteIndex * checkpointConfigs.length + configIndex;
      return {
        id: `checkpoint_${_mock.id(index)}`,
        siteId: site.id,
        siteName: site.name,
        organizationId: site.organizationId,

        type: config.type as (typeof CHECKPOINT_TYPES)[number],
        name: `${site.name} - ${config.name}`,
        code: `CP-${site.code}-${config.type.toUpperCase().slice(0, 3)}`,

        // Hardware
        rfidReaderId: `RFID-R-${_mock.id(index).slice(0, 8).toUpperCase()}`,
        boomGateId: `GATE-${_mock.id(index).slice(0, 8).toUpperCase()}`,
        cameraId: `CAM-${_mock.id(index).slice(0, 8).toUpperCase()}`,

        // Status
        isOnline: index % 10 !== 3,
        lastHeartbeat: fSub({ minutes: index % 10 }),

        // Configuration
        autoOpenOnValidCard: true,
        gateTimeoutSeconds: 30,
        requireManualClose: config.type === 'loading_bay',

        // ThingsBoard integration
        thingsboardDeviceId: `tb_checkpoint_${_mock.id(index)}`,

        createdAt: fSub({ days: 300 - index }),
        updatedAt: fSub({ days: index % 30 }),
      };
    })
  );
};

// ----------------------------------------------------------------------
// SECURITY TRANSACTIONS (Access events log)
// ----------------------------------------------------------------------

export const _securityTransactions = () => {
  const checkpoints = _checkpoints();
  const vehicles = _vehicles();
  const drivers = _drivers();
  const orders = _orders().filter((o) =>
    ['approved', 'checked_in', 'in_progress', 'completed'].includes(o.status)
  );

  return Array.from({ length: 200 }, (_, index) => {
    const checkpoint = checkpoints[index % checkpoints.length];
    const vehicle = vehicles[index % vehicles.length];
    const driver = drivers[index % drivers.length];
    const order = orders[index % orders.length];
    const eventType = ACCESS_EVENTS[index % ACCESS_EVENTS.length];
    const createdAt = fSub({ days: 14 - Math.floor(index / 15), hours: index % 24, minutes: (index * 7) % 60 });

    const isGranted = eventType === 'access_granted' || eventType === 'gate_opened';
    const isDenied = eventType === 'access_denied';

    return {
      id: `txn_${_mock.id(index)}`,
      transactionNumber: `SEC-${new Date().getFullYear()}-${String(index + 1).padStart(7, '0')}`,

      // Location
      checkpointId: checkpoint.id,
      checkpointName: checkpoint.name,
      checkpointType: checkpoint.type,
      siteId: checkpoint.siteId,
      siteName: checkpoint.siteName,
      organizationId: checkpoint.organizationId,

      // Event details
      eventType,
      eventTimestamp: createdAt,

      // RFID data
      rfidCardId: driver.rfidCardId,
      rfidReadTimestamp: createdAt,

      // Vehicle and driver
      vehicleId: vehicle.id,
      vehicleRegistration: vehicle.registrationNumber,
      vehicleRfidTagId: vehicle.rfidTagId,
      driverId: driver.id,
      driverName: driver.fullName,
      driverIdNumber: driver.idNumber,

      // Order reference
      orderId: isGranted ? order?.id : null,
      orderNumber: isGranted ? order?.orderNumber : null,

      // Access decision
      accessGranted: isGranted,
      accessDenied: isDenied,
      denialReason: isDenied ? DENIAL_REASONS[index % DENIAL_REASONS.length] : null,

      // Gate operation
      gateOpened: eventType === 'gate_opened',
      gateClosed: eventType === 'gate_closed',
      gateOpenDuration: eventType === 'gate_closed' ? 15 + (index % 30) : null,

      // Manual override
      manualOverride: index % 20 === 0,
      overrideBy: index % 20 === 0 ? `user_${_mock.id(index % 5)}` : null,
      overrideByName: index % 20 === 0 ? _mock.fullName(index % 5) : null,
      overrideReason: index % 20 === 0 ? 'VIP visitor - manager approval' : null,

      // Media
      capturedImageUrl: _mock.image.product(index % 24),
      vehicleImageUrl: _mock.image.product((index + 12) % 24),

      // Timestamps
      createdAt,

      // Sync status
      syncStatus: ['synced', 'synced', 'synced', 'pending'][index % 4],
    };
  });
};

// ----------------------------------------------------------------------
// DRIVER INDUCTIONS
// ----------------------------------------------------------------------

export const INDUCTION_STATUSES = ['pending', 'in_progress', 'completed', 'expired', 'failed'] as const;

export const _driverInductions = () => {
  const drivers = _drivers();
  const sites = _sites();

  return Array.from({ length: 40 }, (_, index) => {
    const driver = drivers[index % drivers.length];
    const site = sites[index % sites.length];
    const status = INDUCTION_STATUSES[index % INDUCTION_STATUSES.length];
    const createdAt = fSub({ days: 180 - index * 3 });

    const isCompleted = status === 'completed';
    const isExpired = status === 'expired';

    return {
      id: `induction_${_mock.id(index)}`,
      inductionNumber: `IND-${new Date().getFullYear()}-${String(index + 1).padStart(5, '0')}`,

      // Driver
      driverId: driver.id,
      driverName: driver.fullName,
      driverIdNumber: driver.idNumber,
      haulierId: driver.haulierId,

      // Site
      siteId: site.id,
      siteName: site.name,
      organizationId: site.organizationId,

      // Status
      status,

      // Safety training
      safetyVideoWatched: isCompleted || status === 'in_progress',
      safetyVideoWatchedAt: isCompleted || status === 'in_progress'
        ? fSub({ days: 175 - index * 3 })
        : null,

      // Quiz
      quizAttempts: isCompleted ? 1 : status === 'failed' ? 2 : 0,
      quizScore: isCompleted ? 80 + (index % 20) : status === 'failed' ? 50 + (index % 20) : null,
      quizPassedAt: isCompleted ? fSub({ days: 174 - index * 3 }) : null,
      quizFailedAt: status === 'failed' ? fSub({ days: 174 - index * 3 }) : null,

      // Physical inspection
      physicalInspectionCompleted: isCompleted,
      physicalInspectionDate: isCompleted ? fSub({ days: 173 - index * 3 }) : null,
      inspectedBy: isCompleted ? `user_${_mock.id(index % 5)}` : null,
      inspectedByName: isCompleted ? _mock.fullName(index % 5) : null,

      // PPE verification
      ppeVerified: isCompleted,
      ppeItems: isCompleted
        ? ['hard_hat', 'safety_vest', 'safety_boots', 'safety_glasses']
        : [],

      // Certificate
      certificateNumber: isCompleted
        ? `CERT-${site.code}-${String(index + 1).padStart(5, '0')}`
        : null,
      certificateIssuedAt: isCompleted ? fSub({ days: 172 - index * 3 }) : null,
      certificateExpiryDate: isCompleted
        ? fSub({ days: isExpired ? 10 : -180 + index * 3 })
        : null,

      // Validity
      validityDays: 365,
      isValid: isCompleted && !isExpired,

      // Timestamps
      createdAt,
      startedAt: status !== 'pending' ? fSub({ days: 178 - index * 3 }) : null,
      completedAt: isCompleted ? fSub({ days: 172 - index * 3 }) : null,
      expiredAt: isExpired ? fSub({ days: 5 }) : null,
      updatedAt: fSub({ days: index }),

      // Notes
      notes: index % 5 === 0 ? _mock.sentence(index) : null,
    };
  });
};

// ----------------------------------------------------------------------
// VEHICLE INSPECTIONS
// ----------------------------------------------------------------------

export const INSPECTION_STATUSES = ['pending', 'passed', 'failed', 'conditional'] as const;

export const _vehicleInspections = () => {
  const vehicles = _vehicles();
  const sites = _sites();

  return Array.from({ length: 30 }, (_, index) => {
    const vehicle = vehicles[index % vehicles.length];
    const site = sites[index % sites.length];
    const status = INSPECTION_STATUSES[index % INSPECTION_STATUSES.length];
    const createdAt = fSub({ days: 90 - index * 2 });

    const isPassed = status === 'passed';
    const isFailed = status === 'failed';

    // Inspection checklist items
    const checklistItems = [
      { item: 'Brakes', passed: index % 10 !== 5 },
      { item: 'Tires', passed: index % 8 !== 3 },
      { item: 'Lights', passed: index % 12 !== 7 },
      { item: 'Mirrors', passed: true },
      { item: 'Horn', passed: true },
      { item: 'Windshield', passed: index % 15 !== 9 },
      { item: 'Fire Extinguisher', passed: index % 6 !== 2 },
      { item: 'Reflective Triangles', passed: index % 7 !== 4 },
      { item: 'First Aid Kit', passed: true },
      { item: 'Tarpaulin', passed: index % 5 !== 1 },
    ];

    const failedItems = checklistItems.filter((c) => !c.passed).map((c) => c.item);

    return {
      id: `inspection_${_mock.id(index)}`,
      inspectionNumber: `INS-${new Date().getFullYear()}-${String(index + 1).padStart(5, '0')}`,

      // Vehicle
      vehicleId: vehicle.id,
      vehicleRegistration: vehicle.registrationNumber,
      vehicleType: vehicle.type,
      haulierId: vehicle.haulierId,

      // Site
      siteId: site.id,
      siteName: site.name,
      organizationId: site.organizationId,

      // Status
      status,

      // Checklist
      checklistItems,
      totalItems: checklistItems.length,
      passedItems: checklistItems.filter((c) => c.passed).length,
      failedItems,

      // Documents verification
      roadworthyVerified: isPassed || status === 'conditional',
      roadworthyExpiryDate: vehicle.roadworthyExpiryDate,
      insuranceVerified: isPassed || status === 'conditional',
      insuranceExpiryDate: vehicle.insuranceExpiryDate,

      // Inspector
      inspectorId: `user_${_mock.id(index % 5)}`,
      inspectorName: _mock.fullName(index % 5),

      // Timestamps
      scheduledAt: fSub({ days: 91 - index * 2 }),
      startedAt: fSub({ days: 90 - index * 2, hours: 8 }),
      completedAt: fSub({ days: 90 - index * 2, hours: 9 }),
      createdAt,
      updatedAt: fSub({ days: index }),

      // Validity
      validUntil: isPassed || status === 'conditional'
        ? fSub({ days: -90 + index * 2 })
        : null,

      // Conditional pass details
      conditionalNotes: status === 'conditional'
        ? 'Minor issues to be addressed within 7 days'
        : null,
      conditionalDeadline: status === 'conditional'
        ? fSub({ days: -7 })
        : null,

      // Failure details
      failureReason: isFailed
        ? `Failed items: ${failedItems.join(', ')}`
        : null,
      requiredActions: isFailed
        ? failedItems.map((item) => `Repair/Replace ${item}`)
        : null,

      // Photos
      photoUrls: [
        _mock.image.product(index % 24),
        _mock.image.product((index + 1) % 24),
      ],

      // Notes
      notes: index % 4 === 0 ? _mock.sentence(index) : null,
    };
  });
};

// Get transactions by checkpoint
export const _transactionsByCheckpoint = (checkpointId: string) => {
  return _securityTransactions().filter((t) => t.checkpointId === checkpointId);
};

// Get transactions by vehicle
export const _transactionsByVehicle = (vehicleId: string) => {
  return _securityTransactions().filter((t) => t.vehicleId === vehicleId);
};

// Get transactions by driver
export const _transactionsByDriver = (driverId: string) => {
  return _securityTransactions().filter((t) => t.driverId === driverId);
};

// Get denied transactions
export const _deniedTransactions = () => {
  return _securityTransactions().filter((t) => t.accessDenied);
};

// Get inductions by driver
export const _inductionsByDriver = (driverId: string) => {
  return _driverInductions().filter((i) => i.driverId === driverId);
};

// Get valid inductions
export const _validInductions = () => {
  return _driverInductions().filter((i) => i.isValid);
};

// Get inspections by vehicle
export const _inspectionsByVehicle = (vehicleId: string) => {
  return _vehicleInspections().filter((i) => i.vehicleId === vehicleId);
};
