import { randomUUID } from 'crypto';
import type { AppDatabase } from '../database/db';
import { APP_ERROR_CODES, AppError } from '../types/appError';
import type { ProductRepository } from '../repositories/productRepository';
import type { SaleRepository } from '../repositories/saleRepository';
import type { ProductStore } from './productStore';
import type {
  CreateSaleBatchInput,
  CreateSaleInput,
  PaymentMethod,
  RegisterSaleBatchResult,
  Sale,
  SalesChartData,
  SalesChartPeriod,
  SalesChartPoint,
  SalesChartQuery,
  SalesSummary,
} from '../types/sale';
import { PAYMENT_METHOD_LABELS } from '../types/sale';
import type { DashboardAnalytics, TodayDashboardMetrics } from '../types/dashboard';
import type { SaleHistoryListQuery } from '../types/saleHistory';
import { clampReferenceDate, parseDateKey, toDateKey } from '../utils/dateKey';
import {
  getPreviousChartRange,
  resolveChartDateRange,
} from '../utils/chartDateRange';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

const PAYMENT_METHODS: PaymentMethod[] = ['pix', 'dinheiro', 'debito_credito'];

function parsePaymentMethod(value: string): PaymentMethod {
  if (PAYMENT_METHODS.includes(value as PaymentMethod)) {
    return value as PaymentMethod;
  }

  throw new AppError(APP_ERROR_CODES.SALE_INVALID_PAYMENT_METHOD);
}

function calcChangePercent(current: number, previous: number): number | null {
  if (previous === 0) {
    return null;
  }

  return ((current - previous) / previous) * 100;
}

function toSoldAtString(date: Date): string {
  return `${toDateKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatDayLabel(dateKey: string): string {
  const [, month, day] = dateKey.split('-');
  return `${day}/${month}`;
}

const MONTH_LABELS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

export class SaleService {
  constructor(
    private readonly db: AppDatabase,
    private readonly sales: SaleRepository,
    private readonly products: ProductRepository,
    private readonly productStore: ProductStore,
  ) {}

  register(input: CreateSaleInput): Sale {
    if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
      throw new AppError(APP_ERROR_CODES.SALE_INVALID_QUANTITY);
    }

    const discount = input.discount ?? 0;
    const customerName = input.customerName?.trim() ?? '';
    const paymentMethod = parsePaymentMethod(input.paymentMethod);

    if (discount < 0) {
      throw new AppError(APP_ERROR_CODES.SALE_DISCOUNT_NEGATIVE);
    }

    let sale!: Sale;

    this.db.transaction(() => {
      const product = this.productStore.getById(input.productId);

      if (!product) {
        throw new AppError(APP_ERROR_CODES.PRODUCT_NOT_FOUND);
      }

      if (product.quantity < input.quantity) {
        throw new AppError(APP_ERROR_CODES.SALE_INSUFFICIENT_STOCK);
      }

      const subtotal = product.price * input.quantity;

      if (discount > subtotal) {
        throw new AppError(APP_ERROR_CODES.SALE_DISCOUNT_EXCEEDS_SUBTOTAL);
      }

      const soldAt = toSoldAtString(new Date());
      sale = {
        id: randomUUID(),
        productId: product.id,
        productName: product.name,
        productBarcode: product.barcode,
        unitPrice: product.price,
        quantity: input.quantity,
        discount,
        total: subtotal - discount,
        soldAt,
        customerName,
        paymentMethod,
      };

      this.products.decreaseQuantity(product.id, input.quantity, soldAt, 'transaction');
      this.sales.insert(sale, 'transaction');
    });

    return sale;
  }

  registerBatch(input: CreateSaleBatchInput): RegisterSaleBatchResult {
    if (!input.items.length) {
      throw new AppError(APP_ERROR_CODES.SALE_EMPTY_CART);
    }

    const orderDiscount = input.orderDiscount ?? 0;
    const customerName = input.customerName?.trim() ?? '';
    const paymentMethod = parsePaymentMethod(input.paymentMethod);

    if (orderDiscount < 0) {
      throw new AppError(APP_ERROR_CODES.SALE_DISCOUNT_NEGATIVE);
    }

    const sales: Sale[] = [];

    this.db.transaction(() => {
      const soldAtBase = Date.now();
      const lineSubtotals: number[] = [];
      const resolvedItems: Array<{
        productId: string;
        productName: string;
        productBarcode: string;
        unitPrice: number;
        quantity: number;
        lineDiscount: number;
      }> = [];

      for (const item of input.items) {
        if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
          throw new AppError(APP_ERROR_CODES.SALE_BATCH_INVALID_QUANTITY);
        }

        const lineDiscount = item.discount ?? 0;

        if (lineDiscount < 0) {
          throw new AppError(APP_ERROR_CODES.SALE_DISCOUNT_NEGATIVE);
        }

        const product = this.productStore.getById(item.productId);

        if (!product) {
          throw new AppError(APP_ERROR_CODES.PRODUCT_NOT_FOUND);
        }

        const duplicateQty = input.items
          .filter((entry) => entry.productId === item.productId)
          .reduce((sum, entry) => sum + entry.quantity, 0);

        if (product.quantity < duplicateQty) {
          throw new AppError(APP_ERROR_CODES.SALE_INSUFFICIENT_STOCK_NAMED, { name: product.name });
        }

        const subtotal = product.price * item.quantity;

        if (lineDiscount > subtotal) {
          throw new AppError(APP_ERROR_CODES.SALE_LINE_DISCOUNT_EXCEEDS_SUBTOTAL, { name: product.name });
        }

        lineSubtotals.push(subtotal);
        resolvedItems.push({
          productId: product.id,
          productName: product.name,
          productBarcode: product.barcode,
          unitPrice: product.price,
          quantity: item.quantity,
          lineDiscount,
        });
      }

      const subtotalSum = lineSubtotals.reduce((sum, value) => sum + value, 0);

      if (orderDiscount > subtotalSum) {
        throw new AppError(APP_ERROR_CODES.SALE_ORDER_DISCOUNT_EXCEEDS_SUBTOTAL);
      }

      const distributedDiscounts = this.distributeOrderDiscount(lineSubtotals, orderDiscount);

      for (let index = 0; index < resolvedItems.length; index += 1) {
        const item = resolvedItems[index];
        const discount = item.lineDiscount + distributedDiscounts[index];
        const subtotal = lineSubtotals[index];
        const total = subtotal - discount;
        const soldAt = toSoldAtString(new Date(soldAtBase + index));

        const sale: Sale = {
          id: randomUUID(),
          productId: item.productId,
          productName: item.productName,
          productBarcode: item.productBarcode,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          discount,
          total,
          soldAt,
          customerName,
          paymentMethod,
        };

        this.products.decreaseQuantity(item.productId, item.quantity, soldAt, 'transaction');
        this.sales.insert(sale, 'transaction');

        sales.push(sale);
      }
    });

    const total = sales.reduce((sum, sale) => sum + sale.total, 0);

    return { sales, total };
  }

  private distributeOrderDiscount(subtotals: number[], orderDiscount: number): number[] {
    const discounts = subtotals.map(() => 0);
    let remaining = orderDiscount;

    for (let index = subtotals.length - 1; index >= 0 && remaining > 0; index -= 1) {
      const available = subtotals[index] - discounts[index];
      const applied = Math.min(remaining, available);
      discounts[index] += applied;
      remaining -= applied;
    }

    if (remaining > 0) {
      throw new AppError(APP_ERROR_CODES.SALE_ORDER_DISCOUNT_APPLY_FAILED);
    }

    return discounts;
  }

  list(): Sale[] {
    return this.sales.findAll();
  }

  listHistory(query: SaleHistoryListQuery) {
    return this.sales.findHistoryPage(query);
  }

  getSummary(): SalesSummary {
    const todayKey = toDateKey(new Date());
    const totals = this.sales.getSummaryTotals();
    const today = this.sales.getTodaySummary(todayKey);

    return {
      totalSales: totals.totalSales,
      totalRevenue: totals.totalRevenue,
      todaySales: today.todaySales,
      todayRevenue: today.todayRevenue,
    };
  }

  getChartData(query: SalesChartQuery): SalesChartData {
    const { dateFrom, dateTo } = resolveChartDateRange(query);
    let points: SalesChartPoint[] = [];

    if (query.period === 'day' && dateFrom === dateTo) {
      points = this.getDayChartPoints(parseDateKey(dateTo) ?? clampReferenceDate(dateTo));
    } else if (query.period === 'year') {
      points = this.getRangeMonthChartPoints(dateFrom, dateTo);
    } else {
      points = this.getRangeDayChartPoints(dateFrom, dateTo);
    }

    const totalRevenue = points.reduce((sum, point) => sum + point.revenue, 0);
    const totalSales = points.reduce((sum, point) => sum + point.salesCount, 0);

    return {
      period: query.period,
      dateFrom,
      dateTo,
      points,
      totalRevenue,
      totalSales,
    };
  }

  private getRangeDayChartPoints(dateFrom: string, dateTo: string): SalesChartPoint[] {
    const rows = this.sales.getDailyBuckets(dateFrom, dateTo);
    const points: SalesChartPoint[] = [];
    const start = parseDateKey(dateFrom);

    if (!start) {
      return points;
    }

    const end = parseDateKey(dateTo);

    if (!end) {
      return points;
    }

    const cursor = new Date(start);

    while (cursor <= end) {
      const dateKey = toDateKey(cursor);
      const row = rows.get(dateKey);

      points.push({
        label: formatDayLabel(dateKey),
        revenue: row?.revenue ?? 0,
        salesCount: row?.sales_count ?? 0,
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    return points;
  }

  private getRangeMonthChartPoints(dateFrom: string, dateTo: string): SalesChartPoint[] {
    const start = parseDateKey(dateFrom);
    const end = parseDateKey(dateTo);

    if (!start || !end) {
      return [];
    }

    const points: SalesChartPoint[] = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const endLimit = new Date(end.getFullYear(), end.getMonth(), 1);

    while (cursor <= endLimit) {
      const year = cursor.getFullYear();
      const month = cursor.getMonth();
      const monthStart = `${year}-${pad(month + 1)}-01`;
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const monthEnd = `${year}-${pad(month + 1)}-${pad(daysInMonth)}`;
      const rangeStart = monthStart < dateFrom ? dateFrom : monthStart;
      const rangeEnd = monthEnd > dateTo ? dateTo : monthEnd;
      const stats = this.sales.getStatsForRange(rangeStart, rangeEnd);

      points.push({
        label: MONTH_LABELS[month],
        revenue: stats.revenue,
        salesCount: stats.sales,
      });

      cursor.setMonth(cursor.getMonth() + 1);
    }

    return points;
  }

  private getDayChartPoints(reference: Date): SalesChartPoint[] {
    const dateKey = toDateKey(reference);
    const rows = this.sales.getHourlyBuckets(dateKey);
    const bucketMap = new Map(rows.map((row) => [row.bucket, row]));

    return Array.from({ length: 24 }, (_, hour) => {
      const bucket = pad(hour);
      const row = bucketMap.get(bucket);

      return {
        label: `${bucket}h`,
        revenue: row?.revenue ?? 0,
        salesCount: row?.sales_count ?? 0,
      };
    });
  }

  getDashboardAnalytics(query: SalesChartQuery): DashboardAnalytics {
    const { dateFrom, dateTo } = resolveChartDateRange(query);
    const previousRange = getPreviousChartRange(dateFrom, dateTo);

    const currentStats = this.sales.getStatsForRange(dateFrom, dateTo);
    const previousStats = this.sales.getStatsForRange(
      previousRange.dateFrom,
      previousRange.dateTo,
    );

    return {
      period: query.period,
      dateFrom,
      dateTo,
      today: this.getTodayMetrics(new Date()),
      periodComparison: {
        revenueChangePercent: calcChangePercent(currentStats.revenue, previousStats.revenue),
        salesChangePercent: calcChangePercent(currentStats.sales, previousStats.sales),
      },
      topProducts: this.sales.getTopProducts(dateFrom, dateTo, 5),
      paymentMethods: this.getPaymentBreakdown(dateFrom, dateTo),
    };
  }

  private getTodayMetrics(now: Date): TodayDashboardMetrics {
    const todayKey = toDateKey(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = toDateKey(yesterday);

    const todayStats = this.sales.getStatsForRange(todayKey, todayKey);
    const yesterdayStats = this.sales.getStatsForRange(yesterdayKey, yesterdayKey);

    return {
      sales: todayStats.sales,
      revenue: todayStats.revenue,
      ticketAverage: todayStats.sales > 0 ? todayStats.revenue / todayStats.sales : 0,
      salesChangePercent: calcChangePercent(todayStats.sales, yesterdayStats.sales),
      revenueChangePercent: calcChangePercent(todayStats.revenue, yesterdayStats.revenue),
    };
  }

  private getPaymentBreakdown(startKey: string, endKey: string) {
    const rows = this.sales.getPaymentBreakdown(startKey, endKey);
    const rowMap = new Map(rows.map((row) => [row.payment_method, row]));

    return PAYMENT_METHODS.map((method) => {
      const row = rowMap.get(method);

      return {
        method,
        label: PAYMENT_METHOD_LABELS[method],
        count: row?.count ?? 0,
        revenue: row?.revenue ?? 0,
      };
    }).filter((item) => item.count > 0);
  }
}
