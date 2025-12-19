import type { NextRequest } from 'next/server';

import { logger } from 'src/utils/logger';
import { STATUS, response, handleError } from 'src/utils/response';
import { _clients } from 'src/_mock/_weighbridge';

// ----------------------------------------------------------------------

export const runtime = 'edge';

// GET /api/weighbridge/clients
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const clientId = searchParams.get('id');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.toLowerCase();
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const perPage = parseInt(searchParams.get('perPage') ?? '20', 10);

    let clients = _clients();

    // Get single client by ID
    if (clientId) {
      const client = clients.find((c) => c.id === clientId);

      if (!client) {
        return response({ message: 'Client not found!' }, STATUS.NOT_FOUND);
      }

      logger('[Clients] details', client.id);
      return response({ client }, STATUS.OK);
    }

    // Apply filters
    if (type) {
      clients = clients.filter((c) => c.type === type);
    }

    if (status) {
      clients = clients.filter((c) => c.status === status);
    }

    if (search) {
      clients = clients.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.code.toLowerCase().includes(search) ||
          c.contactName.toLowerCase().includes(search) ||
          c.contactEmail.toLowerCase().includes(search)
      );
    }

    // Pagination
    const totalItems = clients.length;
    const totalPages = Math.ceil(totalItems / perPage);
    const startIndex = (page - 1) * perPage;
    const paginatedClients = clients.slice(startIndex, startIndex + perPage);

    logger('[Clients] list', paginatedClients.length);
    return response(
      {
        clients: paginatedClients,
        pagination: {
          page,
          perPage,
          totalItems,
          totalPages,
          hasMore: page < totalPages,
        },
        filters: {
          types: ['customer', 'supplier'],
          statuses: ['active', 'suspended'],
        },
      },
      STATUS.OK
    );
  } catch (error) {
    return handleError('Clients - GET', error);
  }
}
