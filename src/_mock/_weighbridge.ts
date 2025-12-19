import { fSub } from 'src/utils/set-date';

import { _mock } from './_mock';

// ----------------------------------------------------------------------
// WEIGHBRIDGE SYSTEM MOCK DATA
// Based on protocol-ts specification for distributed weighbridge management
// ----------------------------------------------------------------------

// Organization statuses
export const ORGANIZATION_STATUSES = ['active', 'suspended', 'pending'] as const;

// Site statuses
export const SITE_STATUSES = ['operational', 'maintenance', 'offline'] as const;

// Weighbridge statuses
export const WEIGHBRIDGE_STATUSES = ['online', 'offline', 'calibrating', 'error'] as const;

// ----------------------------------------------------------------------
// ORGANIZATIONS
// ----------------------------------------------------------------------

export const _organizations = () =>
  Array.from({ length: 5 }, (_, index) => {
    const createdAt = fSub({ days: 365 - index * 30 });

    return {
      id: `org_${_mock.id(index)}`,
      name: _mock.companyNames(index),
      code: `ORG${String(index + 1).padStart(3, '0')}`,
      status: ORGANIZATION_STATUSES[index % ORGANIZATION_STATUSES.length],
      contactEmail: _mock.email(index),
      contactPhone: _mock.phoneNumber(index),
      address: _mock.fullAddress(index),
      timezone: 'Africa/Johannesburg',
      currency: 'ZAR',
      settings: {
        allowOfflineOperations: true,
        syncIntervalSeconds: 60,
        ticketPrefix: `TKT-${index + 1}`,
        orderPrefix: `ORD-${index + 1}`,
      },
      thingsboardTenantId: `tb_tenant_${_mock.id(index)}`,
      createdAt,
      updatedAt: fSub({ days: index * 5 }),
    };
  });

// ----------------------------------------------------------------------
// SITES
// ----------------------------------------------------------------------

const SITE_NAMES = [
  'Johannesburg Central Depot',
  'Cape Town Port Facility',
  'Durban Industrial Hub',
  'Pretoria North Yard',
  'Bloemfontein Distribution',
  'Port Elizabeth Terminal',
  'East London Weighing Station',
  'Nelspruit Processing Center',
];

export const _sites = () => {
  const organizations = _organizations();

  return Array.from({ length: 8 }, (_, index) => {
    const org = organizations[index % organizations.length];
    const createdAt = fSub({ days: 300 - index * 20 });

    return {
      id: `site_${_mock.id(index)}`,
      organizationId: org.id,
      name: SITE_NAMES[index],
      code: `SITE${String(index + 1).padStart(3, '0')}`,
      status: SITE_STATUSES[index % SITE_STATUSES.length],
      address: _mock.fullAddress(index + 10),
      coordinates: {
        latitude: -26.2041 + index * 0.5,
        longitude: 28.0473 + index * 0.3,
      },
      contactName: _mock.fullName(index),
      contactEmail: _mock.email(index + 5),
      contactPhone: _mock.phoneNumber(index + 5),
      operatingHours: {
        monday: { open: '06:00', close: '18:00' },
        tuesday: { open: '06:00', close: '18:00' },
        wednesday: { open: '06:00', close: '18:00' },
        thursday: { open: '06:00', close: '18:00' },
        friday: { open: '06:00', close: '18:00' },
        saturday: { open: '07:00', close: '13:00' },
        sunday: null,
      },
      settings: {
        requireDriverInduction: true,
        requireVehicleInspection: true,
        maxVehicleWeightKg: 60000,
        tolerancePercentage: 2.0,
      },
      createdAt,
      updatedAt: fSub({ days: index * 3 }),
    };
  });
};

// ----------------------------------------------------------------------
// WEIGHBRIDGES
// ----------------------------------------------------------------------

const WEIGHBRIDGE_MODELS = [
  'Avery Weigh-Tronix ZM303',
  'Mettler Toledo IND570',
  'Rice Lake 920i',
  'Cardinal Scale 225',
  'Fairbanks Scales FB2558',
];

export const _weighbridges = () => {
  const sites = _sites();

  return Array.from({ length: 12 }, (_, index) => {
    const site = sites[index % sites.length];
    const createdAt = fSub({ days: 250 - index * 15 });

    return {
      id: `wb_${_mock.id(index)}`,
      siteId: site.id,
      organizationId: site.organizationId,
      name: `Weighbridge ${index + 1}`,
      code: `WB${String(index + 1).padStart(3, '0')}`,
      status: WEIGHBRIDGE_STATUSES[index % WEIGHBRIDGE_STATUSES.length],
      type: index % 2 === 0 ? 'inbound' : 'outbound',
      model: WEIGHBRIDGE_MODELS[index % WEIGHBRIDGE_MODELS.length],
      manufacturer: WEIGHBRIDGE_MODELS[index % WEIGHBRIDGE_MODELS.length].split(' ')[0],
      serialNumber: `SN-${_mock.id(index).slice(0, 8).toUpperCase()}`,
      capacityKg: 80000,
      divisionKg: 20,
      platformLength: 18 + (index % 4) * 2,
      platformWidth: 3 + (index % 2),
      lastCalibrationDate: fSub({ days: 30 + index * 10 }),
      nextCalibrationDate: fSub({ days: -335 + index * 10 }),
      calibrationCertificateNumber: `CAL-2024-${String(index + 1).padStart(4, '0')}`,
      thingsboardDeviceId: `tb_device_${_mock.id(index)}`,
      mqttTopic: `weighbridge/${site.id}/${_mock.id(index)}/weight`,
      ipAddress: `192.168.${1 + (index % 5)}.${100 + index}`,
      port: 5000 + index,
      createdAt,
      updatedAt: fSub({ days: index * 2 }),
    };
  });
};

// ----------------------------------------------------------------------
// PRODUCTS
// ----------------------------------------------------------------------

const PRODUCT_NAMES = [
  'Thermal Coal',
  'Metallurgical Coal',
  'Iron Ore Fines',
  'Iron Ore Lumps',
  'Manganese Ore',
  'Chrome Ore',
  'Limestone',
  'Dolomiteite',
  'Granite Aggregate',
  'River Sand',
  'Building Sand',
  'Crusite Rock',
];

const PRODUCT_CATEGORIES = ['Coal', 'Iron Ore', 'Minerals', 'Aggregates', 'Sand'] as const;

export const _products = () =>
  Array.from({ length: 12 }, (_, index) => {
    const createdAt = fSub({ days: 400 - index * 20 });

    return {
      id: `prod_${_mock.id(index)}`,
      name: PRODUCT_NAMES[index],
      code: `PRD${String(index + 1).padStart(3, '0')}`,
      category: PRODUCT_CATEGORIES[index % PRODUCT_CATEGORIES.length],
      description: _mock.description(index),
      unitOfMeasure: 'tonnes',
      density: 1.2 + (index % 5) * 0.3,
      pricePerTonne: _mock.number.price(index) * 10,
      isActive: index !== 3,
      requiresQualityCheck: index % 3 === 0,
      specifications: {
        moistureContent: index % 10 + 2,
        ashContent: index % 15 + 5,
        calorificValue: index % 2 === 0 ? 5500 + index * 100 : null,
      },
      createdAt,
      updatedAt: fSub({ days: index * 4 }),
    };
  });

// ----------------------------------------------------------------------
// CLIENTS
// ----------------------------------------------------------------------

export const _clients = () =>
  Array.from({ length: 15 }, (_, index) => {
    const createdAt = fSub({ days: 350 - index * 15 });

    return {
      id: `client_${_mock.id(index)}`,
      name: _mock.companyNames(index),
      code: `CLT${String(index + 1).padStart(3, '0')}`,
      type: index % 3 === 0 ? 'supplier' : 'customer',
      status: index === 2 ? 'suspended' : 'active',
      contactName: _mock.fullName(index),
      contactEmail: _mock.email(index),
      contactPhone: _mock.phoneNumber(index),
      billingAddress: _mock.fullAddress(index),
      shippingAddress: _mock.fullAddress(index + 5),
      taxNumber: `TAX${_mock.id(index).slice(0, 10).toUpperCase()}`,
      paymentTermsDays: [7, 14, 30, 45, 60][index % 5],
      creditLimit: _mock.number.nativeL(index) * 100,
      currentBalance: _mock.number.nativeM(index) * 10,
      notes: index % 4 === 0 ? _mock.sentence(index) : null,
      createdAt,
      updatedAt: fSub({ days: index * 2 }),
    };
  });

// ----------------------------------------------------------------------
// HAULIERS (Transport Companies)
// ----------------------------------------------------------------------

const HAULIER_NAMES = [
  'Swift Logistics',
  'Heavy Haul Transport',
  'Premier Trucking',
  'National Freight Services',
  'Express Cargo Movers',
  'Industrial Transport Solutions',
  'Mining Logistics Co',
  'Bulk Carriers Ltd',
];

export const _hauliers = () =>
  Array.from({ length: 8 }, (_, index) => {
    const createdAt = fSub({ days: 320 - index * 25 });

    return {
      id: `haulier_${_mock.id(index)}`,
      name: HAULIER_NAMES[index],
      code: `HLR${String(index + 1).padStart(3, '0')}`,
      status: index === 1 ? 'suspended' : 'active',
      contactName: _mock.fullName(index + 10),
      contactEmail: _mock.email(index + 10),
      contactPhone: _mock.phoneNumber(index + 10),
      address: _mock.fullAddress(index + 15),
      fleetSize: 10 + index * 5,
      activeDrivers: 8 + index * 4,
      insuranceProvider: _mock.companyNames(index + 5),
      insuranceExpiryDate: fSub({ days: -180 + index * 30 }),
      contractStartDate: fSub({ days: 365 + index * 30 }),
      contractEndDate: fSub({ days: -365 + index * 30 }),
      ratePerKm: 15 + index * 2,
      ratePerTonne: 50 + index * 10,
      createdAt,
      updatedAt: fSub({ days: index * 3 }),
    };
  });

// ----------------------------------------------------------------------
// VEHICLES
// ----------------------------------------------------------------------

const VEHICLE_TYPES = [
  'Side Tipper',
  'End Tipper',
  'Flatbed',
  'Walking Floor',
  'Tanker',
  'Interlink',
];

const VEHICLE_MAKES = ['Scania', 'Volvo', 'MAN', 'Mercedes-Benz', 'DAF', 'Iveco'];

export const _vehicles = () => {
  const hauliers = _hauliers();

  return Array.from({ length: 24 }, (_, index) => {
    const haulier = hauliers[index % hauliers.length];
    const createdAt = fSub({ days: 280 - index * 8 });

    return {
      id: `vehicle_${_mock.id(index)}`,
      haulierId: haulier.id,
      registrationNumber: `${['GP', 'CA', 'ND', 'WC', 'EC'][index % 5]} ${String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')} ${['ABC', 'DEF', 'GHI', 'JKL', 'MNO'][index % 5]}`,
      type: VEHICLE_TYPES[index % VEHICLE_TYPES.length],
      make: VEHICLE_MAKES[index % VEHICLE_MAKES.length],
      model: `${VEHICLE_MAKES[index % VEHICLE_MAKES.length]} R${450 + index * 10}`,
      year: 2018 + (index % 6),
      vin: `VIN${_mock.id(index).slice(0, 14).toUpperCase()}`,
      tareWeightKg: 8000 + (index % 10) * 500,
      maxPayloadKg: 30000 + (index % 5) * 2000,
      status: ['active', 'active', 'active', 'maintenance', 'inactive'][index % 5],
      roadworthyExpiryDate: fSub({ days: -90 + index * 15 }),
      insuranceExpiryDate: fSub({ days: -120 + index * 20 }),
      lastInspectionDate: fSub({ days: 30 + index * 5 }),
      nextInspectionDate: fSub({ days: -60 + index * 5 }),
      rfidTagId: `RFID-V-${_mock.id(index).slice(0, 8).toUpperCase()}`,
      authorizedProducts: ['prod_' + _mock.id(index % 12), 'prod_' + _mock.id((index + 1) % 12)],
      createdAt,
      updatedAt: fSub({ days: index }),
    };
  });
};

// ----------------------------------------------------------------------
// DRIVERS
// ----------------------------------------------------------------------

export const _drivers = () => {
  const hauliers = _hauliers();

  return Array.from({ length: 30 }, (_, index) => {
    const haulier = hauliers[index % hauliers.length];
    const createdAt = fSub({ days: 260 - index * 6 });

    return {
      id: `driver_${_mock.id(index)}`,
      haulierId: haulier.id,
      firstName: _mock.firstName(index),
      lastName: _mock.lastName(index),
      fullName: _mock.fullName(index),
      email: _mock.email(index),
      phone: _mock.phoneNumber(index),
      idNumber: `${70 + (index % 30)}0${String(index).padStart(2, '0')}${String(Math.floor(Math.random() * 9000) + 1000)}08${index % 2}`,
      licenseNumber: `DL${_mock.id(index).slice(0, 10).toUpperCase()}`,
      licenseType: ['C', 'C1', 'EC', 'EC1'][index % 4],
      licenseExpiryDate: fSub({ days: -365 + index * 20 }),
      status: ['active', 'active', 'active', 'suspended', 'inactive'][index % 5],
      rfidCardId: `RFID-D-${_mock.id(index).slice(0, 8).toUpperCase()}`,
      inductionStatus: ['completed', 'completed', 'pending', 'expired'][index % 4],
      inductionExpiryDate: fSub({ days: -180 + index * 15 }),
      safetyTrainingDate: fSub({ days: 60 + index * 10 }),
      profileImageUrl: _mock.image.avatar(index % 24),
      emergencyContactName: _mock.fullName(index + 10),
      emergencyContactPhone: _mock.phoneNumber(index + 10),
      createdAt,
      updatedAt: fSub({ days: index }),
    };
  });
};
