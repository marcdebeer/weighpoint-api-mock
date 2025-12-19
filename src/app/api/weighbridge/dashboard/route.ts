import type { NextRequest } from 'next/server';

import { logger } from 'src/utils/logger';
import { STATUS, response, handleError } from 'src/utils/response';
import { _organizations, _sites, _weighbridges, _products, _clients, _hauliers, _vehicles, _drivers } from 'src/_mock/_weighbridge';
import { _orders } from 'src/_mock/_orders';
import { _tickets } from 'src/_mock/_tickets';
import { _stockpiles, _stockAlerts } from 'src/_mock/_stock';
import { _securityTransactions, _driverInductions, _vehicleInspections } from 'src/_mock/_security';

// ----------------------------------------------------------------------

export const runtime = 'edge';

// GET /api/weighbridge/dashboard
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const siteId = searchParams.get('siteId');
    const period = searchParams.get('period') || 'today'; // today, week, month

    // Get all data
    const orders = _orders();
    const tickets = _tickets();
    const stockpiles = _stockpiles();
    const stockAlerts = _stockAlerts();
    const securityTransactions = _securityTransactions();
    const inductions = _driverInductions();
    const inspections = _vehicleInspections();

    // Filter by site if specified
    const filteredOrders = siteId ? orders.filter((o) => o.siteId === siteId) : orders;
    const filteredTickets = siteId ? tickets.filter((t) => t.siteId === siteId) : tickets;
    const filteredStockpiles = siteId ? stockpiles.filter((sp) => sp.siteId === siteId) : stockpiles;
    const filteredAlerts = siteId ? stockAlerts.filter((a) => a.siteId === siteId) : stockAlerts;
    const filteredTransactions = siteId
      ? securityTransactions.filter((t) => t.siteId === siteId)
      : securityTransactions;

    // Calculate statistics
    const dashboardData = {
      // Summary cards
      summary: {
        totalOrders: filteredOrders.length,
        pendingOrders: filteredOrders.filter((o) => o.status === 'pending').length,
        activeOrders: filteredOrders.filter((o) => ['approved', 'checked_in', 'in_progress'].includes(o.status)).length,
        completedOrders: filteredOrders.filter((o) => o.status === 'completed').length,

        totalTickets: filteredTickets.length,
        activeTickets: filteredTickets.filter((t) => !['finalized', 'voided'].includes(t.status)).length,
        finalizedTickets: filteredTickets.filter((t) => t.status === 'finalized').length,

        totalTonnage: filteredTickets
          .filter((t) => t.netWeightTonnes)
          .reduce((sum, t) => sum + (t.netWeightTonnes || 0), 0),
        totalValue: filteredTickets
          .filter((t) => t.totalValue)
          .reduce((sum, t) => sum + (t.totalValue || 0), 0),
      },

      // Stock overview
      stock: {
        totalStockpiles: filteredStockpiles.length,
        totalQuantityTonnes: filteredStockpiles.reduce((sum, sp) => sum + sp.currentQuantityTonnes, 0),
        totalValue: filteredStockpiles.reduce((sum, sp) => sum + sp.totalValue, 0),
        lowStockCount: filteredStockpiles.filter((sp) => sp.isLowStock).length,
        overstockCount: filteredStockpiles.filter((sp) => sp.isOverstock).length,
        activeAlerts: filteredAlerts.filter((a) => a.isActive).length,
        criticalAlerts: filteredAlerts.filter((a) => a.isActive && a.severity === 'critical').length,
      },

      // Security overview
      security: {
        todayTransactions: filteredTransactions.length,
        accessGranted: filteredTransactions.filter((t) => t.accessGranted).length,
        accessDenied: filteredTransactions.filter((t) => t.accessDenied).length,
        manualOverrides: filteredTransactions.filter((t) => t.manualOverride).length,
        validInductions: inductions.filter((i) => i.isValid).length,
        expiredInductions: inductions.filter((i) => i.status === 'expired').length,
        passedInspections: inspections.filter((i) => i.status === 'passed').length,
        failedInspections: inspections.filter((i) => i.status === 'failed').length,
      },

      // Entity counts
      entities: {
        organizations: _organizations().length,
        sites: _sites().length,
        weighbridges: _weighbridges().length,
        products: _products().length,
        clients: _clients().length,
        hauliers: _hauliers().length,
        vehicles: _vehicles().length,
        drivers: _drivers().length,
      },

      // Recent activity
      recentOrders: filteredOrders
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          clientName: o.clientName,
          productName: o.productName,
          status: o.status,
          type: o.type,
          orderedQuantityTonnes: o.orderedQuantityTonnes,
          createdAt: o.createdAt,
        })),

      recentTickets: filteredTickets
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map((t) => ({
          id: t.id,
          ticketNumber: t.ticketNumber,
          vehicleRegistration: t.vehicleRegistration,
          driverName: t.driverName,
          productName: t.productName,
          status: t.status,
          type: t.type,
          netWeightTonnes: t.netWeightTonnes,
          createdAt: t.createdAt,
        })),

      activeAlerts: filteredAlerts
        .filter((a) => a.isActive)
        .sort((a, b) => {
          const severityOrder = { critical: 0, warning: 1, info: 2 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        })
        .slice(0, 5)
        .map((a) => ({
          id: a.id,
          type: a.type,
          severity: a.severity,
          title: a.title,
          stockpileName: a.stockpileName,
          productName: a.productName,
          createdAt: a.createdAt,
        })),

      // Charts data (simplified for mock)
      charts: {
        ordersByStatus: {
          pending: filteredOrders.filter((o) => o.status === 'pending').length,
          approved: filteredOrders.filter((o) => o.status === 'approved').length,
          checkedIn: filteredOrders.filter((o) => o.status === 'checked_in').length,
          inProgress: filteredOrders.filter((o) => o.status === 'in_progress').length,
          completed: filteredOrders.filter((o) => o.status === 'completed').length,
          rejected: filteredOrders.filter((o) => o.status === 'rejected').length,
          cancelled: filteredOrders.filter((o) => o.status === 'cancelled').length,
        },
        ticketsByType: {
          inbound: filteredTickets.filter((t) => t.type === 'inbound').length,
          outbound: filteredTickets.filter((t) => t.type === 'outbound').length,
        },
        tonnageByProduct: _products().slice(0, 6).map((p) => ({
          product: p.name,
          tonnage: filteredTickets
            .filter((t) => t.productId === p.id && t.netWeightTonnes)
            .reduce((sum, t) => sum + (t.netWeightTonnes || 0), 0),
        })),
      },
    };

    logger('[Dashboard] data', 'loaded');
    return response(dashboardData, STATUS.OK);
  } catch (error) {
    return handleError('Dashboard - GET', error);
  }
}
