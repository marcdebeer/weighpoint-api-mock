import type { NextRequest } from 'next/server';

import { uuidv4 } from 'src/utils/uuidv4';
import { logger } from 'src/utils/logger';
import { STATUS, response, handleError } from 'src/utils/response';
import { _orders, ORDER_STATUSES, ORDER_TYPES } from 'src/_mock/_orders';

// ----------------------------------------------------------------------

export const runtime = 'edge';

// In-memory store for orders (initialized from mock data)
let ordersData: Map<string, ReturnType<typeof _orders>[number]> | null = null;

function initializeOrders() {
  if (!ordersData) {
    ordersData = new Map(_orders().map((order) => [order.id, order]));
  }
  return ordersData;
}

// Mock client ID for demonstration (in real app, would come from auth)
const MOCK_CLIENT_ID = 'client_001';

// GET /api/portal/client/orders - Get client's own orders
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const orderId = searchParams.get('id');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const perPage = parseInt(searchParams.get('perPage') ?? '20', 10);
    const search = searchParams.get('search')?.toLowerCase();

    initializeOrders();

    // Get single order by ID (only if it belongs to this client)
    if (orderId) {
      const order = ordersData!.get(orderId);

      if (!order) {
        return response({ message: 'Order not found!' }, STATUS.NOT_FOUND);
      }

      // Verify order belongs to this client
      if (order.clientId !== MOCK_CLIENT_ID) {
        return response({ message: 'Order not found!' }, STATUS.NOT_FOUND);
      }

      logger('[Client Portal - Orders] details', order.id);
      return response({ order }, STATUS.OK);
    }

    // Get client's orders
    let orders = Array.from(ordersData!.values()).filter(
      (order) => order.clientId === MOCK_CLIENT_ID
    );

    // Apply filters
    if (status) {
      orders = orders.filter((order) => order.status === status);
    }

    if (search) {
      orders = orders.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(search) ||
          order.productName.toLowerCase().includes(search) ||
          order.vehicleRegistration.toLowerCase().includes(search)
      );
    }

    // Sort by created date descending
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Pagination
    const totalItems = orders.length;
    const totalPages = Math.ceil(totalItems / perPage);
    const startIndex = (page - 1) * perPage;
    const paginatedOrders = orders.slice(startIndex, startIndex + perPage);

    logger('[Client Portal - Orders] list', paginatedOrders.length);
    return response(
      {
        orders: paginatedOrders,
        pagination: {
          page,
          perPage,
          totalItems,
          totalPages,
          hasMore: page < totalPages,
        },
        filters: {
          statuses: ORDER_STATUSES,
          types: ORDER_TYPES,
        },
      },
      STATUS.OK
    );
  } catch (error) {
    return handleError('Client Portal - Orders GET', error);
  }
}

// POST /api/portal/client/orders - Create new order (client portal)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    initializeOrders();

    const now = new Date().toISOString();
    const orderCount = ordersData!.size + 1;

    const newOrder = {
      id: `order_${uuidv4()}`,
      orderNumber: `ORD-${new Date().getFullYear()}-${String(orderCount).padStart(5, '0')}`,
      siteId: body.siteId || 'site_001',
      siteName: body.siteName || 'Main Site',
      organizationId: body.organizationId || 'org_001',
      type: body.type || 'outbound',
      status: 'pending' as const,
      priority: 'normal' as const,
      clientId: MOCK_CLIENT_ID,
      clientName: 'Acme Construction Ltd', // Would come from client's profile
      haulierId: body.haulierId || null,
      haulierName: body.haulierName || null,
      vehicleId: body.vehicleId || null,
      vehicleRegistration: body.vehicleRegistration || '',
      driverId: body.driverId || null,
      driverName: body.driverName || '',
      productId: body.productId,
      productName: body.productName || 'Unknown Product',
      productCode: body.productCode || '',
      orderedQuantityTonnes: body.orderedQuantityTonnes || 0,
      deliveredQuantityTonnes: 0,
      variancePercentage: null,
      pricePerTonne: body.pricePerTonne || 0,
      totalValue: (body.orderedQuantityTonnes || 0) * (body.pricePerTonne || 0),
      purchaseOrderNumber: body.purchaseOrderNumber || null,
      deliveryNoteNumber: null,
      externalReference: body.externalReference || null,
      scheduledDate: body.scheduledDate || now,
      expiryDate: body.expiryDate || null,
      createdAt: now,
      approvedAt: null,
      checkedInAt: null,
      completedAt: null,
      updatedAt: now,
      approvedBy: null,
      approvedByName: null,
      rejectionReason: null,
      cancellationReason: null,
      notes: body.notes || null,
      internalNotes: null,
      ticketsCount: 0,
    };

    ordersData!.set(newOrder.id, newOrder);

    logger('[Client Portal - Orders] created', newOrder.id);
    return response({ order: newOrder }, STATUS.OK);
  } catch (error) {
    return handleError('Client Portal - Orders POST', error);
  }
}
