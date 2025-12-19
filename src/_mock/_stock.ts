import { fSub } from 'src/utils/set-date';

import { _mock } from './_mock';
import { _sites, _products } from './_weighbridge';
import { _tickets } from './_tickets';

// ----------------------------------------------------------------------
// STOCK & STOCKPILES MOCK DATA
// Stock movements are triggered by ticket finalization
// ----------------------------------------------------------------------

export const STOCKPILE_STATUSES = ['active', 'inactive', 'depleted'] as const;

export const MOVEMENT_TYPES = ['inbound', 'outbound', 'adjustment', 'transfer'] as const;

export const ADJUSTMENT_REASONS = [
  'physical_count',
  'evaporation_loss',
  'spillage',
  'quality_downgrade',
  'system_correction',
  'theft',
  'other',
] as const;

// ----------------------------------------------------------------------
// STOCKPILES
// ----------------------------------------------------------------------

export const _stockpiles = () => {
  const sites = _sites();
  const products = _products();

  return Array.from({ length: 20 }, (_, index) => {
    const site = sites[index % sites.length];
    const product = products[index % products.length];
    const createdAt = fSub({ days: 200 - index * 5 });

    const capacityTonnes = 5000 + (index % 5) * 2000;
    const currentQuantityTonnes = Math.floor(capacityTonnes * (0.3 + Math.random() * 0.5));
    const utilizationPercentage = Number(((currentQuantityTonnes / capacityTonnes) * 100).toFixed(1));

    return {
      id: `stockpile_${_mock.id(index)}`,
      siteId: site.id,
      siteName: site.name,
      organizationId: site.organizationId,
      productId: product.id,
      productName: product.name,
      productCode: product.code,

      // Identification
      name: `${product.name} Stockpile ${(index % 3) + 1}`,
      code: `SP-${site.code}-${product.code}-${(index % 3) + 1}`,
      location: `Bay ${String.fromCharCode(65 + (index % 8))}${(index % 5) + 1}`,

      // Status
      status: STOCKPILE_STATUSES[index % STOCKPILE_STATUSES.length],

      // Capacity and quantities
      capacityTonnes,
      currentQuantityTonnes,
      reservedQuantityTonnes: Math.floor(currentQuantityTonnes * 0.1),
      availableQuantityTonnes: Math.floor(currentQuantityTonnes * 0.9),
      utilizationPercentage,

      // Alerts
      lowStockThresholdTonnes: Math.floor(capacityTonnes * 0.2),
      highStockThresholdTonnes: Math.floor(capacityTonnes * 0.9),
      isLowStock: currentQuantityTonnes < capacityTonnes * 0.2,
      isOverstock: currentQuantityTonnes > capacityTonnes * 0.9,

      // Quality tracking
      lastQualityCheckDate: fSub({ days: index * 3 }),
      averageMoistureContent: 8 + Math.random() * 4,
      qualityGrade: ['A', 'A', 'B', 'A', 'B'][index % 5],

      // Value
      valuePerTonne: product.pricePerTonne,
      totalValue: Number((currentQuantityTonnes * product.pricePerTonne).toFixed(2)),

      // Timestamps
      createdAt,
      updatedAt: fSub({ hours: index * 2 }),
      lastMovementAt: fSub({ hours: index * 4 }),

      // Notes
      notes: index % 4 === 0 ? _mock.sentence(index) : null,
    };
  });
};

// ----------------------------------------------------------------------
// STOCK MOVEMENTS
// ----------------------------------------------------------------------

export const _stockMovements = () => {
  const stockpiles = _stockpiles();
  const tickets = _tickets().filter((t) => t.status === 'finalized');

  return Array.from({ length: 100 }, (_, index) => {
    const stockpile = stockpiles[index % stockpiles.length];
    const ticket = tickets[index % tickets.length];
    const type = MOVEMENT_TYPES[index % MOVEMENT_TYPES.length];
    const createdAt = fSub({ days: 30 - Math.floor(index / 4), hours: index % 24 });

    // Quantity based on movement type
    let quantityTonnes: number;
    if (type === 'adjustment') {
      quantityTonnes = (Math.random() - 0.5) * 100; // Can be positive or negative
    } else {
      quantityTonnes = 15 + Math.random() * 35;
    }

    const isInbound = type === 'inbound' || (type === 'adjustment' && quantityTonnes > 0);

    return {
      id: `movement_${_mock.id(index)}`,
      stockpileId: stockpile.id,
      stockpileName: stockpile.name,
      siteId: stockpile.siteId,
      siteName: stockpile.siteName,
      organizationId: stockpile.organizationId,
      productId: stockpile.productId,
      productName: stockpile.productName,

      // Movement details
      type,
      direction: isInbound ? 'in' : 'out',
      quantityTonnes: Number(Math.abs(quantityTonnes).toFixed(3)),
      signedQuantityTonnes: Number(quantityTonnes.toFixed(3)),

      // Running balance
      balanceBeforeTonnes: Number((stockpile.currentQuantityTonnes - quantityTonnes).toFixed(3)),
      balanceAfterTonnes: stockpile.currentQuantityTonnes,

      // Source reference
      ticketId: type !== 'adjustment' ? ticket?.id : null,
      ticketNumber: type !== 'adjustment' ? ticket?.ticketNumber : null,
      orderId: type !== 'adjustment' ? ticket?.orderId : null,
      orderNumber: type !== 'adjustment' ? ticket?.orderNumber : null,

      // For adjustments
      adjustmentReason: type === 'adjustment'
        ? ADJUSTMENT_REASONS[index % ADJUSTMENT_REASONS.length]
        : null,
      adjustmentNotes: type === 'adjustment'
        ? 'Adjustment based on physical stocktake'
        : null,

      // For transfers
      sourceStockpileId: type === 'transfer' && !isInbound
        ? stockpile.id
        : null,
      destinationStockpileId: type === 'transfer' && isInbound
        ? stockpile.id
        : null,
      transferStockpileId: type === 'transfer'
        ? stockpiles[(index + 1) % stockpiles.length].id
        : null,

      // Value
      valuePerTonne: stockpile.valuePerTonne,
      totalValue: Number((Math.abs(quantityTonnes) * stockpile.valuePerTonne).toFixed(2)),

      // User
      createdBy: `user_${_mock.id(index % 10)}`,
      createdByName: _mock.fullName(index % 10),

      // Timestamps
      createdAt,
      movementDate: createdAt,

      // Notes
      notes: index % 5 === 0 ? _mock.sentence(index) : null,

      // Sync status
      syncStatus: ['synced', 'synced', 'pending'][index % 3],
    };
  });
};

// ----------------------------------------------------------------------
// STOCK ALERTS
// ----------------------------------------------------------------------

export const ALERT_TYPES = ['low_stock', 'overstock', 'discrepancy', 'quality'] as const;
export const ALERT_SEVERITIES = ['info', 'warning', 'critical'] as const;

export const _stockAlerts = () => {
  const stockpiles = _stockpiles();

  return Array.from({ length: 15 }, (_, index) => {
    const stockpile = stockpiles[index % stockpiles.length];
    const type = ALERT_TYPES[index % ALERT_TYPES.length];
    const createdAt = fSub({ days: 10 - index, hours: index * 2 });

    return {
      id: `alert_${_mock.id(index)}`,
      stockpileId: stockpile.id,
      stockpileName: stockpile.name,
      siteId: stockpile.siteId,
      siteName: stockpile.siteName,
      organizationId: stockpile.organizationId,
      productId: stockpile.productId,
      productName: stockpile.productName,

      // Alert details
      type,
      severity: ALERT_SEVERITIES[index % ALERT_SEVERITIES.length],
      title: type === 'low_stock'
        ? `Low stock alert for ${stockpile.productName}`
        : type === 'overstock'
          ? `Overstock warning for ${stockpile.productName}`
          : type === 'discrepancy'
            ? `Stock discrepancy detected`
            : `Quality issue reported`,
      message: _mock.sentence(index),

      // Thresholds
      thresholdValue: type === 'low_stock'
        ? stockpile.lowStockThresholdTonnes
        : type === 'overstock'
          ? stockpile.highStockThresholdTonnes
          : null,
      currentValue: stockpile.currentQuantityTonnes,

      // Status
      isActive: index < 8,
      isAcknowledged: index >= 5 && index < 10,
      acknowledgedBy: index >= 5 && index < 10 ? `user_${_mock.id(index % 5)}` : null,
      acknowledgedByName: index >= 5 && index < 10 ? _mock.fullName(index % 5) : null,
      acknowledgedAt: index >= 5 && index < 10 ? fSub({ days: 5 - index }) : null,

      isResolved: index >= 10,
      resolvedBy: index >= 10 ? `user_${_mock.id(index % 5)}` : null,
      resolvedByName: index >= 10 ? _mock.fullName(index % 5) : null,
      resolvedAt: index >= 10 ? fSub({ days: 2 }) : null,
      resolutionNotes: index >= 10 ? 'Stock replenished via delivery' : null,

      // Timestamps
      createdAt,
      updatedAt: fSub({ hours: index }),
    };
  });
};

// Get stockpiles by site
export const _stockpilesBySite = (siteId: string) => {
  return _stockpiles().filter((sp) => sp.siteId === siteId);
};

// Get stockpiles by product
export const _stockpilesByProduct = (productId: string) => {
  return _stockpiles().filter((sp) => sp.productId === productId);
};

// Get movements by stockpile
export const _movementsByStockpile = (stockpileId: string) => {
  return _stockMovements().filter((m) => m.stockpileId === stockpileId);
};

// Get low stock alerts
export const _lowStockAlerts = () => {
  return _stockAlerts().filter((a) => a.type === 'low_stock' && a.isActive);
};
