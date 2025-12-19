import type { NextRequest } from 'next/server';

import { uuidv4 } from 'src/utils/uuidv4';
import { logger } from 'src/utils/logger';
import { STATUS, response, handleError } from 'src/utils/response';
import { _tickets, TICKET_STATUSES } from 'src/_mock/_tickets';

// ----------------------------------------------------------------------

export const runtime = 'edge';

// Endpoint actions
const ENDPOINTS = {
  LIST: 'list',
  DETAILS: 'details',
  CREATE: 'create',
  CAPTURE_TARE: 'capture-tare',
  CAPTURE_GROSS: 'capture-gross',
  FINALIZE: 'finalize',
  VOID: 'void',
};

// In-memory store for tickets
let ticketsData: Map<string, ReturnType<typeof _tickets>[number]> | null = null;

function initializeTickets() {
  if (!ticketsData) {
    ticketsData = new Map(_tickets().map((ticket) => [ticket.id, ticket]));
  }
  return ticketsData;
}

// GET /api/weighbridge/tickets
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const ticketId = searchParams.get('id');
    const orderId = searchParams.get('orderId');
    const siteId = searchParams.get('siteId');
    const vehicleId = searchParams.get('vehicleId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const perPage = parseInt(searchParams.get('perPage') ?? '20', 10);
    const search = searchParams.get('search')?.toLowerCase();
    const activeOnly = searchParams.get('activeOnly') === 'true';

    initializeTickets();
    let tickets = Array.from(ticketsData!.values());

    // Get single ticket by ID
    if (ticketId) {
      const ticket = ticketsData!.get(ticketId);

      if (!ticket) {
        return response({ message: 'Ticket not found!' }, STATUS.NOT_FOUND);
      }

      logger('[Tickets] details', ticket.id);
      return response({ ticket }, STATUS.OK);
    }

    // Apply filters
    if (orderId) {
      tickets = tickets.filter((ticket) => ticket.orderId === orderId);
    }

    if (siteId) {
      tickets = tickets.filter((ticket) => ticket.siteId === siteId);
    }

    if (vehicleId) {
      tickets = tickets.filter((ticket) => ticket.vehicleId === vehicleId);
    }

    if (status) {
      tickets = tickets.filter((ticket) => ticket.status === status);
    }

    if (type) {
      tickets = tickets.filter((ticket) => ticket.type === type);
    }

    if (activeOnly) {
      tickets = tickets.filter((ticket) => !['finalized', 'voided'].includes(ticket.status));
    }

    if (search) {
      tickets = tickets.filter(
        (ticket) =>
          ticket.ticketNumber.toLowerCase().includes(search) ||
          ticket.vehicleRegistration.toLowerCase().includes(search) ||
          ticket.driverName.toLowerCase().includes(search) ||
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

    logger('[Tickets] list', paginatedTickets.length);
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
          types: ['inbound', 'outbound'],
        },
      },
      STATUS.OK
    );
  } catch (error) {
    return handleError('Tickets - GET', error);
  }
}

// POST /api/weighbridge/tickets
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const endpoint = searchParams.get('endpoint');

    switch (endpoint) {
      case ENDPOINTS.CREATE:
        return createTicket(req);
      case ENDPOINTS.CAPTURE_TARE:
        return captureTare(req);
      case ENDPOINTS.CAPTURE_GROSS:
        return captureGross(req);
      case ENDPOINTS.FINALIZE:
        return finalizeTicket(req);
      case ENDPOINTS.VOID:
        return voidTicket(req);
      default:
        // Default to create
        return createTicket(req);
    }
  } catch (error) {
    return handleError('Tickets - POST', error);
  }
}

// Create new ticket
async function createTicket(req: NextRequest) {
  const body = await req.json();

  initializeTickets();

  const now = new Date().toISOString();
  const ticketCount = ticketsData!.size + 1;

  const newTicket = {
    id: `ticket_${uuidv4()}`,
    ticketNumber: `TKT-${new Date().getFullYear()}-${String(ticketCount).padStart(6, '0')}`,
    orderId: body.orderId || null,
    orderNumber: body.orderNumber || null,
    siteId: body.siteId,
    siteName: body.siteName || 'Unknown Site',
    organizationId: body.organizationId,
    type: body.type || 'outbound',
    status: 'open' as const,
    vehicleId: body.vehicleId,
    vehicleRegistration: body.vehicleRegistration || '',
    vehicleType: body.vehicleType || '',
    driverId: body.driverId,
    driverName: body.driverName || '',
    driverIdNumber: body.driverIdNumber || '',
    productId: body.productId,
    productName: body.productName || 'Unknown Product',
    productCode: body.productCode || '',
    tareWeightKg: null,
    tareDateTime: null,
    tareWeighbridgeId: null,
    tareWeighbridgeName: null,
    tareOperatorId: null,
    tareOperatorName: null,
    tareImageUrl: null,
    grossWeightKg: null,
    grossDateTime: null,
    grossWeighbridgeId: null,
    grossWeighbridgeName: null,
    grossOperatorId: null,
    grossOperatorName: null,
    grossImageUrl: null,
    netWeightKg: null,
    netWeightTonnes: null,
    pricePerTonne: body.pricePerTonne || 0,
    totalValue: null,
    moisturePercentage: null,
    qualityGrade: null,
    qualityNotes: null,
    sealNumber: null,
    sealVerified: null,
    createdAt: now,
    updatedAt: now,
    finalizedAt: null,
    voidedAt: null,
    voidedBy: null,
    voidReason: null,
    notes: body.notes || null,
    syncStatus: 'pending',
    lastSyncAt: now,
  };

  ticketsData!.set(newTicket.id, newTicket);

  logger('[Tickets] created', newTicket.id);
  return response({ ticket: newTicket }, STATUS.OK);
}

// Capture tare weight
async function captureTare(req: NextRequest) {
  const body = await req.json();
  const { ticketId, weightKg, weighbridgeId, weighbridgeName, operatorId, operatorName, imageUrl } = body;

  if (!ticketId || !weightKg) {
    return response({ message: 'Ticket ID and weight are required!' }, STATUS.BAD_REQUEST);
  }

  initializeTickets();

  const ticket = ticketsData!.get(ticketId);

  if (!ticket) {
    return response({ message: 'Ticket not found!' }, STATUS.NOT_FOUND);
  }

  if (ticket.status !== 'open') {
    return response({ message: 'Tare weight can only be captured for open tickets!' }, STATUS.BAD_REQUEST);
  }

  const now = new Date().toISOString();

  const updatedTicket = {
    ...ticket,
    status: 'tare_captured' as const,
    tareWeightKg: weightKg,
    tareDateTime: now,
    tareWeighbridgeId: weighbridgeId || null,
    tareWeighbridgeName: weighbridgeName || null,
    tareOperatorId: operatorId || null,
    tareOperatorName: operatorName || null,
    tareImageUrl: imageUrl || null,
    updatedAt: now,
    syncStatus: 'pending',
  };

  ticketsData!.set(ticketId, updatedTicket);

  logger('[Tickets] tare-captured', ticketId);
  return response({ ticket: updatedTicket }, STATUS.OK);
}

// Capture gross weight
async function captureGross(req: NextRequest) {
  const body = await req.json();
  const { ticketId, weightKg, weighbridgeId, weighbridgeName, operatorId, operatorName, imageUrl } = body;

  if (!ticketId || !weightKg) {
    return response({ message: 'Ticket ID and weight are required!' }, STATUS.BAD_REQUEST);
  }

  initializeTickets();

  const ticket = ticketsData!.get(ticketId);

  if (!ticket) {
    return response({ message: 'Ticket not found!' }, STATUS.NOT_FOUND);
  }

  if (ticket.status !== 'tare_captured') {
    return response({ message: 'Gross weight can only be captured after tare!' }, STATUS.BAD_REQUEST);
  }

  const now = new Date().toISOString();

  const updatedTicket = {
    ...ticket,
    status: 'gross_captured' as const,
    grossWeightKg: weightKg,
    grossDateTime: now,
    grossWeighbridgeId: weighbridgeId || null,
    grossWeighbridgeName: weighbridgeName || null,
    grossOperatorId: operatorId || null,
    grossOperatorName: operatorName || null,
    grossImageUrl: imageUrl || null,
    updatedAt: now,
    syncStatus: 'pending',
  };

  ticketsData!.set(ticketId, updatedTicket);

  logger('[Tickets] gross-captured', ticketId);
  return response({ ticket: updatedTicket }, STATUS.OK);
}

// Finalize ticket
async function finalizeTicket(req: NextRequest) {
  const body = await req.json();
  const { ticketId, sealNumber, moisturePercentage, qualityGrade, qualityNotes } = body;

  if (!ticketId) {
    return response({ message: 'Ticket ID is required!' }, STATUS.BAD_REQUEST);
  }

  initializeTickets();

  const ticket = ticketsData!.get(ticketId);

  if (!ticket) {
    return response({ message: 'Ticket not found!' }, STATUS.NOT_FOUND);
  }

  if (ticket.status !== 'gross_captured') {
    return response({ message: 'Ticket must have both weights captured to finalize!' }, STATUS.BAD_REQUEST);
  }

  if (!ticket.tareWeightKg || !ticket.grossWeightKg) {
    return response({ message: 'Both tare and gross weights are required!' }, STATUS.BAD_REQUEST);
  }

  const now = new Date().toISOString();
  const netWeightKg = ticket.grossWeightKg - ticket.tareWeightKg;
  const netWeightTonnes = Number((netWeightKg / 1000).toFixed(3));
  const totalValue = Number((netWeightTonnes * ticket.pricePerTonne).toFixed(2));

  const updatedTicket = {
    ...ticket,
    status: 'finalized' as const,
    netWeightKg,
    netWeightTonnes,
    totalValue,
    sealNumber: sealNumber || ticket.sealNumber,
    moisturePercentage: moisturePercentage ?? ticket.moisturePercentage,
    qualityGrade: qualityGrade || ticket.qualityGrade,
    qualityNotes: qualityNotes || ticket.qualityNotes,
    finalizedAt: now,
    updatedAt: now,
    syncStatus: 'pending',
  };

  ticketsData!.set(ticketId, updatedTicket);

  logger('[Tickets] finalized', ticketId);
  return response({ ticket: updatedTicket }, STATUS.OK);
}

// Void ticket
async function voidTicket(req: NextRequest) {
  const body = await req.json();
  const { ticketId, voidReason, voidedBy, voidedByName } = body;

  if (!ticketId || !voidReason) {
    return response({ message: 'Ticket ID and void reason are required!' }, STATUS.BAD_REQUEST);
  }

  initializeTickets();

  const ticket = ticketsData!.get(ticketId);

  if (!ticket) {
    return response({ message: 'Ticket not found!' }, STATUS.NOT_FOUND);
  }

  if (ticket.status === 'voided') {
    return response({ message: 'Ticket is already voided!' }, STATUS.BAD_REQUEST);
  }

  const now = new Date().toISOString();

  const updatedTicket = {
    ...ticket,
    status: 'voided' as const,
    voidedAt: now,
    voidedBy: voidedBy || 'user_system',
    voidReason,
    updatedAt: now,
    syncStatus: 'pending',
  };

  ticketsData!.set(ticketId, updatedTicket);

  logger('[Tickets] voided', ticketId);
  return response({ ticket: updatedTicket }, STATUS.OK);
}
