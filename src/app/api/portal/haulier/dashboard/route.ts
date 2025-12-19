import type { NextRequest } from 'next/server';

import { logger } from 'src/utils/logger';
import { STATUS, response, handleError } from 'src/utils/response';
import { _orders } from 'src/_mock/_orders';
import { _tickets } from 'src/_mock/_tickets';
import { _vehicles, _drivers } from 'src/_mock/_weighbridge';

// ----------------------------------------------------------------------

export const runtime = 'edge';

// Mock haulier ID for demonstration
const MOCK_HAULIER_ID = 'haulier_001';

// GET /api/portal/haulier/dashboard - Get haulier dashboard statistics
export async function GET(req: NextRequest) {
  try {
    // Get haulier's orders (jobs)
    const jobs = _orders().filter((order) => order.haulierId === MOCK_HAULIER_ID);

    // Get haulier's vehicles and drivers
    const vehicles = _vehicles().filter((v: { haulierId?: string }) => v.haulierId === MOCK_HAULIER_ID);
    const drivers = _drivers().filter((d: { haulierId?: string }) => d.haulierId === MOCK_HAULIER_ID);

    // Get haulier's tickets through their orders
    const haulierOrderIds = new Set(jobs.map((j) => j.id));
    const tickets = _tickets().filter((t) => t.orderId && haulierOrderIds.has(t.orderId));

    // Calculate job statistics
    const jobStats = {
      total: jobs.length,
      pending: jobs.filter((j) => j.status === 'pending').length,
      assigned: jobs.filter((j) => j.status === 'approved').length,
      inProgress: jobs.filter((j) => j.status === 'in_progress').length,
      completed: jobs.filter((j) => j.status === 'completed').length,
    };

    // Calculate fleet statistics
    const fleetStats = {
      totalVehicles: vehicles.length,
      activeVehicles: vehicles.filter((v: { status?: string }) => v.status === 'active').length,
      totalDrivers: drivers.length,
      activeDrivers: drivers.filter((d: { status?: string }) => d.status === 'active').length,
    };

    // Calculate earnings (mock)
    const completedTickets = tickets.filter((t) => t.status === 'finalized');
    const totalTonnage = completedTickets.reduce((sum, t) => sum + (t.netWeightKg || 0), 0) / 1000;
    const estimatedEarnings = totalTonnage * 15; // Mock rate of $15 per tonne

    const earningsStats = {
      totalTonnage,
      estimatedEarnings,
      completedTickets: completedTickets.length,
      pendingPayment: estimatedEarnings * 0.3, // 30% pending
    };

    // Recent jobs (last 5)
    const recentJobs = jobs
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map((job) => ({
        id: job.id,
        jobNumber: job.orderNumber,
        clientName: job.clientName,
        productName: job.productName,
        status: job.status,
        scheduledDate: job.scheduledDate,
      }));

    // Upcoming jobs (scheduled for future)
    const upcomingJobs = jobs
      .filter((j) => new Date(j.scheduledDate) > new Date() && j.status !== 'completed')
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
      .slice(0, 5)
      .map((job) => ({
        id: job.id,
        jobNumber: job.orderNumber,
        clientName: job.clientName,
        productName: job.productName,
        status: job.status,
        scheduledDate: job.scheduledDate,
      }));

    const dashboardData = {
      jobStats,
      fleetStats,
      earningsStats,
      recentJobs,
      upcomingJobs,
    };

    logger('[Haulier Portal - Dashboard]', 'stats fetched');
    return response(dashboardData, STATUS.OK);
  } catch (error) {
    return handleError('Haulier Portal - Dashboard GET', error);
  }
}
