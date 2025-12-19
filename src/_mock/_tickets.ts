import { fSub } from 'src/utils/set-date';

import { _mock } from './_mock';
import { _orders } from './_orders';
import { _sites, _weighbridges, _vehicles, _drivers, _products } from './_weighbridge';

// ----------------------------------------------------------------------
// TICKETS MOCK DATA
// Ticket lifecycle: open → tare_captured → gross_captured → finalized
// For inbound: Gross (loaded) → Tare (empty) → Net calculated
// For outbound: Tare (empty) → Gross (loaded) → Net calculated
// ----------------------------------------------------------------------

export const TICKET_STATUSES = [
  'open',
  'tare_captured',
  'gross_captured',
  'finalized',
  'voided',
] as const;

// ----------------------------------------------------------------------
// TICKETS
// ----------------------------------------------------------------------

export const _tickets = () => {
  const orders = _orders().filter((o) => ['in_progress', 'completed'].includes(o.status));
  const sites = _sites();
  const weighbridges = _weighbridges();
  const vehicles = _vehicles();
  const drivers = _drivers();
  const products = _products();

  return Array.from({ length: 80 }, (_, index) => {
    const order = orders[index % orders.length];
    const site = sites.find((s) => s.id === order?.siteId) || sites[0];
    const siteWeighbridges = weighbridges.filter((wb) => wb.siteId === site.id);
    const tareWeighbridge = siteWeighbridges[0] || weighbridges[0];
    const grossWeighbridge = siteWeighbridges[1] || siteWeighbridges[0] || weighbridges[1];
    const vehicle = vehicles[index % vehicles.length];
    const driver = drivers[index % drivers.length];
    const product = products[index % products.length];

    const status = TICKET_STATUSES[index % TICKET_STATUSES.length];
    const type = index % 2 === 0 ? 'outbound' : 'inbound';
    const createdAt = fSub({ days: 20 - Math.floor(index / 4), hours: index % 24 });

    // Weight calculations
    const vehicleTareKg = vehicle.tareWeightKg;
    const payloadKg = Math.floor(15000 + Math.random() * 20000);
    const grossWeightKg = vehicleTareKg + payloadKg;
    const netWeightKg = grossWeightKg - vehicleTareKg;

    // Determine which weights are captured based on status
    const hasTare = ['tare_captured', 'gross_captured', 'finalized'].includes(status);
    const hasGross = ['gross_captured', 'finalized'].includes(status);
    const isFinalized = status === 'finalized';

    // Timestamps for weight captures
    const tareDateTime = hasTare ? fSub({ days: 20 - Math.floor(index / 4), hours: index % 24, minutes: 15 }) : null;
    const grossDateTime = hasGross ? fSub({ days: 20 - Math.floor(index / 4), hours: index % 24, minutes: 45 }) : null;
    const finalizedAt = isFinalized ? fSub({ days: 20 - Math.floor(index / 4), hours: index % 24, minutes: 50 }) : null;

    return {
      id: `ticket_${_mock.id(index % 40) || index}`,
      ticketNumber: `TKT-${new Date().getFullYear()}-${String(index + 1).padStart(6, '0')}`,
      orderId: order?.id || null,
      orderNumber: order?.orderNumber || null,
      siteId: site.id,
      siteName: site.name,
      organizationId: site.organizationId,

      // Type and status
      type,
      status,

      // Vehicle and driver
      vehicleId: vehicle.id,
      vehicleRegistration: vehicle.registrationNumber,
      vehicleType: vehicle.type,
      driverId: driver.id,
      driverName: driver.fullName,
      driverIdNumber: driver.idNumber,

      // Product
      productId: product.id,
      productName: product.name,
      productCode: product.code,

      // Tare weight (first weighing for outbound, second for inbound)
      tareWeightKg: hasTare ? vehicleTareKg : null,
      tareDateTime,
      tareWeighbridgeId: hasTare ? tareWeighbridge.id : null,
      tareWeighbridgeName: hasTare ? tareWeighbridge.name : null,
      tareOperatorId: hasTare ? `user_${_mock.id(index % 10)}` : null,
      tareOperatorName: hasTare ? _mock.fullName(index % 10) : null,
      tareImageUrl: hasTare ? _mock.image.product(index % 24) : null,

      // Gross weight (second weighing for outbound, first for inbound)
      grossWeightKg: hasGross ? grossWeightKg : null,
      grossDateTime,
      grossWeighbridgeId: hasGross ? grossWeighbridge.id : null,
      grossWeighbridgeName: hasGross ? grossWeighbridge.name : null,
      grossOperatorId: hasGross ? `user_${_mock.id((index + 1) % 10)}` : null,
      grossOperatorName: hasGross ? _mock.fullName((index + 1) % 10) : null,
      grossImageUrl: hasGross ? _mock.image.product((index + 1) % 24) : null,

      // Net weight (calculated)
      netWeightKg: isFinalized ? netWeightKg : null,
      netWeightTonnes: isFinalized ? Number((netWeightKg / 1000).toFixed(3)) : null,

      // Pricing
      pricePerTonne: product.pricePerTonne,
      totalValue: isFinalized ? Number(((netWeightKg / 1000) * product.pricePerTonne).toFixed(2)) : null,

      // Quality
      moisturePercentage: isFinalized && index % 3 === 0 ? 8 + Math.random() * 5 : null,
      qualityGrade: isFinalized && index % 4 === 0 ? ['A', 'B', 'C'][index % 3] : null,
      qualityNotes: isFinalized && index % 5 === 0 ? 'Sample taken for lab analysis' : null,

      // Seals
      sealNumber: type === 'outbound' && hasGross ? `SEAL-${String(index + 1).padStart(6, '0')}` : null,
      sealVerified: type === 'inbound' && hasTare ? true : null,

      // Timestamps
      createdAt,
      updatedAt: finalizedAt || grossDateTime || tareDateTime || createdAt,
      finalizedAt,

      // Void info
      voidedAt: status === 'voided' ? fSub({ days: 19 - Math.floor(index / 4) }) : null,
      voidedBy: status === 'voided' ? `user_${_mock.id(0)}` : null,
      voidReason: status === 'voided' ? 'Incorrect vehicle assigned' : null,

      // Notes
      notes: index % 6 === 0 ? _mock.sentence(index) : null,

      // Sync status (for edge-central sync)
      syncStatus: ['synced', 'synced', 'pending', 'synced'][index % 4],
      lastSyncAt: fSub({ minutes: index * 5 }),
    };
  });
};

// Get tickets by order
export const _ticketsByOrder = (orderId: string) => {
  return _tickets().filter((ticket) => ticket.orderId === orderId);
};

// Get tickets by site
export const _ticketsBySite = (siteId: string) => {
  return _tickets().filter((ticket) => ticket.siteId === siteId);
};

// Get tickets by status
export const _ticketsByStatus = (status: string) => {
  return _tickets().filter((ticket) => ticket.status === status);
};

// Get tickets by vehicle
export const _ticketsByVehicle = (vehicleId: string) => {
  return _tickets().filter((ticket) => ticket.vehicleId === vehicleId);
};

// Get active tickets (not finalized or voided)
export const _activeTickets = () => {
  return _tickets().filter((ticket) => !['finalized', 'voided'].includes(ticket.status));
};
