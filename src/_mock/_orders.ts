import { fSub } from 'src/utils/set-date';

import { _mock } from './_mock';
import { _sites, _clients, _hauliers, _vehicles, _drivers, _products } from './_weighbridge';

// ----------------------------------------------------------------------
// ORDERS MOCK DATA
// Order lifecycle: pending → approved → checked_in → in_progress → completed
// ----------------------------------------------------------------------

export const ORDER_STATUSES = [
  'pending',
  'approved',
  'checked_in',
  'in_progress',
  'completed',
  'rejected',
  'cancelled',
] as const;

export const ORDER_TYPES = ['inbound', 'outbound'] as const;

export const ORDER_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

// ----------------------------------------------------------------------
// ORDERS
// ----------------------------------------------------------------------

export const _orders = () => {
  const sites = _sites();
  const clients = _clients();
  const hauliers = _hauliers();
  const vehicles = _vehicles();
  const drivers = _drivers();
  const products = _products();

  return Array.from({ length: 50 }, (_, index) => {
    const site = sites[index % sites.length];
    const client = clients[index % clients.length];
    const haulier = hauliers[index % hauliers.length];
    const vehicle = vehicles[index % vehicles.length];
    const driver = drivers[index % drivers.length];
    const product = products[index % products.length];

    const status = ORDER_STATUSES[index % ORDER_STATUSES.length];
    const type = ORDER_TYPES[index % ORDER_TYPES.length];
    const createdAt = fSub({ days: 30 - Math.floor(index / 2) });

    // Calculate dates based on status
    const approvedAt = ['approved', 'checked_in', 'in_progress', 'completed'].includes(status)
      ? fSub({ days: 29 - Math.floor(index / 2), hours: 2 })
      : null;
    const checkedInAt = ['checked_in', 'in_progress', 'completed'].includes(status)
      ? fSub({ days: 28 - Math.floor(index / 2), hours: 4 })
      : null;
    const completedAt = status === 'completed'
      ? fSub({ days: 28 - Math.floor(index / 2), hours: 8 })
      : null;

    // Quantities
    const orderedQuantityTonnes = Math.floor(20 + Math.random() * 30);
    const deliveredQuantityTonnes = status === 'completed'
      ? orderedQuantityTonnes + (Math.random() - 0.5) * 2
      : 0;

    return {
      id: `order_${_mock.id(index % 40) || index}`,
      orderNumber: `ORD-${new Date().getFullYear()}-${String(index + 1).padStart(5, '0')}`,
      siteId: site.id,
      siteName: site.name,
      organizationId: site.organizationId,

      // Type and status
      type,
      status,
      priority: ORDER_PRIORITIES[index % ORDER_PRIORITIES.length],

      // Parties
      clientId: client.id,
      clientName: client.name,
      haulierId: haulier.id,
      haulierName: haulier.name,
      vehicleId: vehicle.id,
      vehicleRegistration: vehicle.registrationNumber,
      driverId: driver.id,
      driverName: driver.fullName,

      // Product
      productId: product.id,
      productName: product.name,
      productCode: product.code,

      // Quantities
      orderedQuantityTonnes,
      deliveredQuantityTonnes: Number(deliveredQuantityTonnes.toFixed(3)),
      variancePercentage: status === 'completed'
        ? Number(((deliveredQuantityTonnes - orderedQuantityTonnes) / orderedQuantityTonnes * 100).toFixed(2))
        : null,

      // Pricing
      pricePerTonne: product.pricePerTonne,
      totalValue: Number((orderedQuantityTonnes * product.pricePerTonne).toFixed(2)),

      // Reference numbers
      purchaseOrderNumber: `PO-${client.code}-${String(index + 1).padStart(4, '0')}`,
      deliveryNoteNumber: status === 'completed'
        ? `DN-${String(index + 1).padStart(6, '0')}`
        : null,
      externalReference: index % 3 === 0 ? `EXT-REF-${index}` : null,

      // Dates
      scheduledDate: fSub({ days: 28 - Math.floor(index / 2) }),
      expiryDate: fSub({ days: -7 + Math.floor(index / 2) }),
      createdAt,
      approvedAt,
      checkedInAt,
      completedAt,
      updatedAt: fSub({ days: Math.floor(index / 3) }),

      // Approval
      approvedBy: approvedAt ? `user_${_mock.id(index % 10)}` : null,
      approvedByName: approvedAt ? _mock.fullName(index % 10) : null,
      rejectionReason: status === 'rejected' ? 'Documentation incomplete' : null,
      cancellationReason: status === 'cancelled' ? 'Client requested cancellation' : null,

      // Notes
      notes: index % 4 === 0 ? _mock.sentence(index) : null,
      internalNotes: index % 5 === 0 ? 'Priority customer - expedite processing' : null,

      // Tickets count (populated from tickets)
      ticketsCount: status === 'completed' ? Math.floor(Math.random() * 3) + 1 : 0,
    };
  });
};

// Generate orders for a specific site
export const _ordersBySite = (siteId: string) => {
  return _orders().filter((order) => order.siteId === siteId);
};

// Generate orders for a specific client
export const _ordersByClient = (clientId: string) => {
  return _orders().filter((order) => order.clientId === clientId);
};

// Generate orders by status
export const _ordersByStatus = (status: string) => {
  return _orders().filter((order) => order.status === status);
};
