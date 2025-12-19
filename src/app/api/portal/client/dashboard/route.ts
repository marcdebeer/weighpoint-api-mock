import type { NextRequest } from 'next/server';

import { logger } from 'src/utils/logger';
import { STATUS, response, handleError } from 'src/utils/response';
import { _orders } from 'src/_mock/_orders';
import { _tickets } from 'src/_mock/_tickets';

// ----------------------------------------------------------------------

export const runtime = 'edge';

// Mock client ID for demonstration
const MOCK_CLIENT_ID = 'client_001';

// GET /api/portal/client/dashboard - Get client dashboard statistics
export async function GET(req: NextRequest) {
  try {
    const orders = _orders().filter((order) => order.clientId === MOCK_CLIENT_ID);
    const clientOrderIds = new Set(orders.map((o) => o.id));
    const tickets = _tickets().filter((ticket) => ticket.orderId && clientOrderIds.has(ticket.orderId));

    // Calculate order statistics
    const orderStats = {
      total: orders.length,
      pending: orders.filter((o) => o.status === 'pending').length,
      approved: orders.filter((o) => o.status === 'approved').length,
      inProgress: orders.filter((o) => o.status === 'in_progress').length,
      completed: orders.filter((o) => o.status === 'completed').length,
      cancelled: orders.filter((o) => o.status === 'cancelled').length,
    };

    // Calculate ticket statistics
    const ticketStats = {
      total: tickets.length,
      open: tickets.filter((t) => t.status === 'open').length,
      tareWeighed: tickets.filter((t) => t.status === 'tare_captured').length,
      grossWeighed: tickets.filter((t) => t.status === 'gross_captured').length,
      finalized: tickets.filter((t) => t.status === 'finalized').length,
    };

    // Calculate tonnage
    const totalTonnage = tickets
      .filter((t) => t.status === 'finalized')
      .reduce((sum, t) => sum + (t.netWeightKg || 0), 0) / 1000;

    // Recent orders (last 5)
    const recentOrders = orders
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        productName: order.productName,
        status: order.status,
        quantity: order.orderedQuantityTonnes,
        createdAt: order.createdAt,
      }));

    // Recent tickets (last 5)
    const recentTickets = tickets
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map((ticket) => ({
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        vehicleRegistration: ticket.vehicleRegistration,
        status: ticket.status,
        netWeightKg: ticket.netWeightKg,
        createdAt: ticket.createdAt,
      }));

    const dashboardData = {
      orderStats,
      ticketStats,
      totalTonnage,
      recentOrders,
      recentTickets,
    };

    logger('[Client Portal - Dashboard]', 'stats fetched');
    return response(dashboardData, STATUS.OK);
  } catch (error) {
    return handleError('Client Portal - Dashboard GET', error);
  }
}
