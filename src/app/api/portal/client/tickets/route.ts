import type { NextRequest } from 'next/server';

import { logger } from 'src/utils/logger';
import { STATUS, response, handleError } from 'src/utils/response';
import { _orders } from 'src/_mock/_orders';
import { _tickets, TICKET_STATUSES } from 'src/_mock/_tickets';

// ----------------------------------------------------------------------

export const runtime = 'edge';

// Mock client ID for demonstration
const MOCK_CLIENT_ID = 'client_001';

// GET /api/portal/client/tickets - Get client's tickets (read-only)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const ticketId = searchParams.get('id');
    const orderId = searchParams.get('orderId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const perPage = parseInt(searchParams.get('perPage') ?? '20', 10);
    const search = searchParams.get('search')?.toLowerCase();

    // Get client's orders first, then filter tickets by those orders
    const orders = _orders().filter((order) => order.clientId === MOCK_CLIENT_ID);
    const clientOrderIds = new Set(orders.map((o) => o.id));
    let tickets = _tickets().filter((ticket) => ticket.orderId && clientOrderIds.has(ticket.orderId));

    // Get single ticket by ID
    if (ticketId) {
      const ticket = tickets.find((t) => t.id === ticketId);

      if (!ticket) {
        return response({ message: 'Ticket not found!' }, STATUS.NOT_FOUND);
      }

      logger('[Client Portal - Tickets] details', ticket.id);
      return response({ ticket }, STATUS.OK);
    }

    // Apply filters
    if (orderId) {
      tickets = tickets.filter((ticket) => ticket.orderId === orderId);
    }

    if (status) {
      tickets = tickets.filter((ticket) => ticket.status === status);
    }

    if (search) {
      tickets = tickets.filter(
        (ticket) =>
          ticket.ticketNumber.toLowerCase().includes(search) ||
          ticket.vehicleRegistration.toLowerCase().includes(search) ||
          ticket.productName.toLowerCase().includes(search)
      );
    }

    // Sort by created date descending
    tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Pagination
    const totalItems = tickets.length;
    const totalPages = Math.ceil(totalItems / perPage);
    const startIndex = (page - 1) * perPage;
    const paginatedTickets = tickets.slice(startIndex, startIndex + perPage);

    logger('[Client Portal - Tickets] list', paginatedTickets.length);
    return response(
      {
        tickets: paginatedTickets,
        pagination: {
          page,
          perPage,
          totalItems,
          totalPages,
          hasMore: page < totalPages,
        },
        filters: {
          statuses: TICKET_STATUSES,
        },
      },
      STATUS.OK
    );
  } catch (error) {
    return handleError('Client Portal - Tickets GET', error);
  }
}
