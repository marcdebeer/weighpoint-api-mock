import type { NextRequest } from 'next/server';

import { logger } from 'src/utils/logger';
import { STATUS, response, handleError } from 'src/utils/response';
import { _orders, ORDER_STATUSES } from 'src/_mock/_orders';

// ----------------------------------------------------------------------

export const runtime = 'edge';

// Mock haulier ID for demonstration
const MOCK_HAULIER_ID = 'haulier_001';

// Job statuses for haulier portal
const JOB_STATUSES = [
  { value: 'pending', label: 'Pending Assignment' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

// GET /api/portal/haulier/jobs - Get haulier's jobs (orders assigned to this haulier)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const jobId = searchParams.get('id');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const perPage = parseInt(searchParams.get('perPage') ?? '20', 10);
    const search = searchParams.get('search')?.toLowerCase();

    // Get orders assigned to this haulier (jobs)
    let jobs = _orders()
      .filter((order) => order.haulierId === MOCK_HAULIER_ID)
      .map((order) => ({
        id: order.id,
        jobNumber: order.orderNumber,
        clientName: order.clientName,
        siteName: order.siteName,
        productName: order.productName,
        productCode: order.productCode,
        type: order.type,
        status: order.status,
        vehicleRegistration: order.vehicleRegistration,
        driverName: order.driverName,
        orderedQuantityTonnes: order.orderedQuantityTonnes,
        deliveredQuantityTonnes: order.deliveredQuantityTonnes,
        scheduledDate: order.scheduledDate,
        createdAt: order.createdAt,
        ticketsCount: order.ticketsCount,
      }));

    // Get single job by ID
    if (jobId) {
      const job = jobs.find((j) => j.id === jobId);

      if (!job) {
        return response({ message: 'Job not found!' }, STATUS.NOT_FOUND);
      }

      logger('[Haulier Portal - Jobs] details', job.id);
      return response({ job }, STATUS.OK);
    }

    // Apply filters
    if (status) {
      jobs = jobs.filter((job) => job.status === status);
    }

    if (search) {
      jobs = jobs.filter(
        (job) =>
          job.jobNumber.toLowerCase().includes(search) ||
          job.clientName.toLowerCase().includes(search) ||
          job.productName.toLowerCase().includes(search) ||
          job.vehicleRegistration.toLowerCase().includes(search)
      );
    }

    // Sort by scheduled date descending
    jobs.sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());

    // Pagination
    const totalItems = jobs.length;
    const totalPages = Math.ceil(totalItems / perPage);
    const startIndex = (page - 1) * perPage;
    const paginatedJobs = jobs.slice(startIndex, startIndex + perPage);

    logger('[Haulier Portal - Jobs] list', paginatedJobs.length);
    return response(
      {
        jobs: paginatedJobs,
        pagination: {
          page,
          perPage,
          totalItems,
          totalPages,
          hasMore: page < totalPages,
        },
        filters: {
          statuses: JOB_STATUSES,
        },
      },
      STATUS.OK
    );
  } catch (error) {
    return handleError('Haulier Portal - Jobs GET', error);
  }
}

// POST /api/portal/haulier/jobs - Accept/decline job assignment
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, action, vehicleId, driverId, notes } = body;

    if (!jobId || !action) {
      return response({ message: 'Job ID and action are required!' }, STATUS.BAD_REQUEST);
    }

    if (!['accept', 'decline'].includes(action)) {
      return response({ message: 'Invalid action!' }, STATUS.BAD_REQUEST);
    }

    // In a real app, would update the order in the database
    logger('[Haulier Portal - Jobs] action', { jobId, action });

    return response(
      {
        message: action === 'accept' ? 'Job accepted successfully' : 'Job declined',
        jobId,
        action,
      },
      STATUS.OK
    );
  } catch (error) {
    return handleError('Haulier Portal - Jobs POST', error);
  }
}
