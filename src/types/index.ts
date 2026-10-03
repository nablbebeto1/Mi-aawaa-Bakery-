import { Language } from '../i18n';

export type Role = 'owner' | 'manager' | 'production' | 'sales';

export type BranchId = 'coka' | 'mizan';
export type BranchScope = 'coka' | 'mizan' | 'both';

export interface User {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  salt: string;
  role: Role;
  branch: BranchScope;
  status: 'active' | 'inactive';
  createdAt: string;
  lastLoginAt: string | null;
  mustChangePassword?: boolean;
}

export interface Product {
  id: string;
  code: string;
  name: Record<Language, string>;
  unitPrice: number; // in ETB
  unit: 'piece' | 'kg'; // piece whole number, kg decimal
  expectedYield?: number; // expected loaves per standard recipe if applicable
  recipeId?: string;
  active?: boolean;
}

export type UnitType = 'kg' | 'g' | 'liters' | 'ml' | 'pieces' | 'packs';

export interface Ingredient {
  id: string;
  code: string;
  name: Record<Language, string>;
  unit: UnitType;
  currentStock: number;
  minStockAlert: number;
  unitCost: number; // in ETB
}

export interface RecipeItem {
  ingredientId: string;
  quantity: number;
  unit: UnitType;
}

export interface Recipe {
  id: string;
  productId: string;
  name: string;
  ingredients: RecipeItem[];
  packaging: RecipeItem[];
}

export interface ProductionBatch {
  id: string;
  batchNumber: string;
  date: string;
  productId: string;
  totalProduced: number;
  rejectedQty: number;
  saleableQty: number; // totalProduced - rejectedQty
  ingredientsUsed: RecipeItem[];
  status: 'completed';
  notes: string;
  createdBy: string;
  creatorName: string;
  createdAt: string;
}

export type DeliveryStatus = 'dispatched' | 'received' | 'discrepancy';

export interface Delivery {
  id: string;
  deliveryNumber: string;
  date: string;
  dispatchTime: string;
  batchId: string;
  productId: string;
  fromBranch: 'coka';
  toBranch: BranchId;
  dispatchQty: number;
  receivedQty: number | null;
  damagedMissingQty: number | null;
  status: DeliveryStatus;
  dispatchedBy: string;
  dispatcherName: string;
  receivedBy: string | null;
  receiverName: string | null;
  receivedAt: string | null;
  notes: string;
}

export type PaymentStatus = 'paid' | 'partial' | 'unpaid';

export interface SalePayment {
  id: string;
  saleId: string;
  customerName: string;
  branch: BranchId;
  amount: number;
  paymentMethod: 'cash' | 'digital';
  date: string;
  recordedBy: string;
  recorderName: string;
  type: 'full_payment' | 'initial_down_payment' | 'subsequent_payment';
  notes?: string;
  createdAt: string;
}

export interface Sale {
  id: string;
  saleNumber: string;
  date: string;
  branch: BranchId;
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalAmount: number; // (quantity * unitPrice) - discount
  paymentMethod: 'cash' | 'digital';
  paymentStatus: PaymentStatus;
  amountPaid: number;
  remainingBalance: number;
  customerName?: string;
  customerPhone?: string;
  payments: SalePayment[];
  notes?: string;
  recordedBy: string;
  recorderName: string;
  createdAt: string;
}

export interface ClosingStockItem {
  productId: string;
  openingStock: number;
  deliveriesReceived: number;
  quantitySold: number;
  unsoldBread: number;
  damagedWasted: number;
  expectedStock: number; // openingStock + deliveriesReceived - quantitySold - damagedWasted
  physicalCount: number;
  discrepancy: number; // physicalCount - expectedStock
  discrepancyReason: string;
}

export interface ClosingCashReconciliation {
  openingCash: number;
  cashSales: number;
  otherCashReceipts: number;
  authorizedCashExpenses: number;
  authorizedCashRefunds: number;
  expectedCash: number; // openingCash + cashSales + otherCashReceipts - authorizedCashExpenses - authorizedCashRefunds
  actualCashCounted: number;
  cashDiscrepancy: number; // actualCashCounted - expectedCash
  cashDiscrepancyReason: string;
  digitalPaymentsTotal: number;
}

export interface DailyClosing {
  id: string;
  date: string;
  branch: BranchId;
  stockItems: ClosingStockItem[];
  cash: ClosingCashReconciliation;
  status: 'submitted' | 'reconciled';
  submittedBy: string;
  submitterName: string;
  submittedAt: string;
  notes: string;
}

export type CashHandoverStatus = 'counted' | 'collected_in_transit' | 'confirmed_by_manager';

export interface CashHandover {
  id: string;
  closingId: string;
  date: string;
  branch: BranchId;
  amountCounted: number;
  amountCollected: number;
  amountConfirmed: number;
  status: CashHandoverStatus;
  salesStaffId: string;
  salesStaffName: string;
  collectedByStaffId: string | null;
  collectedByStaffName: string | null;
  collectedAt: string | null;
  confirmedByManagerId: string | null;
  confirmedByManagerName: string | null;
  confirmedAt: string | null;
  notes: string;
}

export interface PurchaseItem {
  ingredientId: string;
  quantity: number;
  unit: UnitType;
  unitCost: number;
  totalCost: number;
}

export interface Purchase {
  id: string;
  invoiceNumber: string;
  date: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  totalAmount: number;
  paymentStatus: 'paid' | 'pending';
  recordedBy: string;
  recorderName: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  supplies: string[];
}

export type ExpenseCategory =
  | 'transport'
  | 'utilities'
  | 'maintenance'
  | 'packaging'
  | 'ingredients'
  | 'other';

export interface Expense {
  id: string;
  expenseNumber: string;
  date: string;
  branch: BranchScope;
  category: ExpenseCategory;
  amount: number;
  paymentMethod: 'cash' | 'digital';
  description: string;
  recordedBy: string;
  recorderName: string;
  createdAt: string;
}

export type AuditAction =
  | 'CREATE_USER'
  | 'EDIT_USER'
  | 'RESET_PASSWORD'
  | 'ACTIVATE_USER'
  | 'DEACTIVATE_USER'
  | 'UPDATE_LOGO'
  | 'REMOVE_LOGO'
  | 'UPDATE_SETTINGS'
  | 'CONFIRM_CASH'
  | 'COLLECT_CASH'
  | 'RECORD_PRODUCTION'
  | 'DISPATCH_BREAD'
  | 'CONFIRM_DELIVERY'
  | 'SUBMIT_CLOSING'
  | 'RECORD_SALE'
  | 'RECORD_PAYMENT'
  | 'UPDATE_PRODUCT_PRICE'
  | 'RECORD_PURCHASE'
  | 'RECORD_EXPENSE'
  | 'ADJUST_STOCK';

export interface AuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: Role;
  action: AuditAction;
  targetType: string;
  targetId: string;
  details: string;
}

export interface AppSettings {
  bakeryName: string;
  logoUrl: string | null;
  defaultLanguage: Language;
  supportedLanguages: Language[];
  businessTimezone: string;
  currency: string;
  businessDate: string;
}
