import {
  User,
  Product,
  Ingredient,
  Recipe,
  ProductionBatch,
  Delivery,
  Sale,
  SalePayment,
  PaymentStatus,
  DailyClosing,
  CashHandover,
  Purchase,
  Supplier,
  Expense,
  AuditLog,
  AppSettings,
  Role,
  BranchId,
  BranchScope
} from '../types';

const STORAGE_KEYS = {
  USERS: 'miaawaa_users_v2',
  PRODUCTS: 'miaawaa_products_v2',
  INGREDIENTS: 'miaawaa_ingredients_v2',
  RECIPES: 'miaawaa_recipes_v2',
  PRODUCTION: 'miaawaa_production_v2',
  DELIVERIES: 'miaawaa_deliveries_v2',
  SALES: 'miaawaa_sales_v2',
  CLOSINGS: 'miaawaa_closings_v2',
  HANDOVERS: 'miaawaa_handovers_v2',
  PURCHASES: 'miaawaa_purchases_v2',
  SUPPLIERS: 'miaawaa_suppliers_v2',
  EXPENSES: 'miaawaa_expenses_v2',
  AUDIT_LOGS: 'miaawaa_audit_logs_v2',
  SETTINGS: 'miaawaa_settings_v2',
  INIT_FLAG: 'miaawaa_initialized_v2'
};

// Default precomputed hashes for initial accounts (passwords: 'Admin@123', 'Manager@123', 'Baker@123', 'Sales@123')
// We also support runtime hashing for all user creations/resets
const INITIAL_USERS: User[] = [
  {
    id: 'usr_admin_init',
    username: 'admin',
    displayName: 'System Administrator (Admin)',
    passwordHash: 'a717b2c1993da0dc951b0a9cecc309a84930ab36cfeb9d43ac819df2ff989873', // admin:c0ka_salt_admin_init
    salt: 'c0ka_salt_admin_init',
    role: 'owner',
    branch: 'both',
    status: 'active',
    createdAt: '2026-10-03T08:00:00Z',
    lastLoginAt: null,
    mustChangePassword: true
  },
  {
    id: 'usr_owner_1',
    username: 'owner',
    displayName: 'Alemayehu Tadesse (Owner)',
    passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // Admin@123 default
    salt: 'c0ka_salt_owner_99',
    role: 'owner',
    branch: 'both',
    status: 'active',
    createdAt: '2026-09-01T08:00:00Z',
    lastLoginAt: '2026-10-02T10:15:00Z'
  },
  {
    id: 'usr_manager_1',
    username: 'manager',
    displayName: 'Birhanu Bekele (Manager)',
    passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // Manager@123
    salt: 'c0ka_salt_mgr_88',
    role: 'manager',
    branch: 'both',
    status: 'active',
    createdAt: '2026-09-01T08:30:00Z',
    lastLoginAt: '2026-10-02T09:40:00Z'
  },
  {
    id: 'usr_baker_1',
    username: 'baker_coka',
    displayName: 'Derartu Gemechu (Night Baker)',
    passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // Baker@123
    salt: 'c0ka_salt_bkr_77',
    role: 'production',
    branch: 'coka',
    status: 'active',
    createdAt: '2026-09-02T06:00:00Z',
    lastLoginAt: '2026-10-02T04:20:00Z'
  },
  {
    id: 'usr_sales_coka',
    username: 'sales_coka',
    displayName: 'Chaltu Negash (Coka Sales)',
    passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // Sales@123
    salt: 'c0ka_salt_scoka_66',
    role: 'sales',
    branch: 'coka',
    status: 'active',
    createdAt: '2026-09-02T06:30:00Z',
    lastLoginAt: '2026-10-02T07:10:00Z'
  },
  {
    id: 'usr_sales_mizan',
    username: 'sales_mizan',
    displayName: 'Tolosa Dibaba (Mizan Sales)',
    passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // Sales@123
    salt: 'c0ka_salt_smizan_55',
    role: 'sales',
    branch: 'mizan',
    status: 'active',
    createdAt: '2026-09-02T07:00:00Z',
    lastLoginAt: '2026-10-02T06:45:00Z'
  }
];

const INITIAL_INGREDIENTS: Ingredient[] = [
  {
    id: 'ing_flour',
    code: 'ING-FLOUR',
    name: {
      en: 'Premium Wheat Flour (Daakuu)',
      om: 'Daakuu Qamadii Qulqulluu',
      am: 'ጥራት ያለው የስንዴ ዱቄት'
    },
    unit: 'kg',
    currentStock: 2450,
    minStockAlert: 500,
    unitCost: 110
  },
  {
    id: 'ing_yeast',
    code: 'ING-YEAST',
    name: {
      en: 'Dry Instant Yeast (Raacitii)',
      om: 'Raacitii Daabboo',
      am: 'ደረቅ እርሾ'
    },
    unit: 'kg',
    currentStock: 35.5,
    minStockAlert: 10,
    unitCost: 450
  },
  {
    id: 'ing_sugar',
    code: 'ING-SUGAR',
    name: {
      en: 'Refined White Sugar (Sukkaara)',
      om: 'Sukkaara Adii',
      am: 'ነጭ ስኳር'
    },
    unit: 'kg',
    currentStock: 210,
    minStockAlert: 50,
    unitCost: 130
  },
  {
    id: 'ing_oil',
    code: 'ING-OIL',
    name: {
      en: 'Pure Vegetable Cooking Oil (Zayitii)',
      om: 'Zayitii Nyaataa Qulqulluu',
      am: 'የምግብ ዘይት'
    },
    unit: 'liters',
    currentStock: 280,
    minStockAlert: 60,
    unitCost: 190
  },
  {
    id: 'ing_cake_mix',
    code: 'ING-CAKE',
    name: {
      en: 'Cake Ingredients & Vanilla Essence',
      om: 'Meeshaalee Keekii fi Vaanilaa',
      am: 'የኬክ ግብዓቶችና ቫኒላ'
    },
    unit: 'kg',
    currentStock: 65,
    minStockAlert: 20,
    unitCost: 320
  },
  {
    id: 'ing_bags',
    code: 'ING-BAGS',
    name: {
      en: 'Paper & Plastic Packaging Bags (Kiisii)',
      om: 'Waraqaa fi Kiisii Saamsamaa',
      am: 'የወረቀትና ፌስታል ማሸጊያዎች'
    },
    unit: 'kg',
    currentStock: 115,
    minStockAlert: 30,
    unitCost: 160
  }
];

export const DEFAULT_NINE_PRODUCTS: Product[] = [
  {
    id: 'prod_bread_10',
    code: 'PRD-BRD-10',
    name: {
      en: '10 Birr Bread',
      om: 'Daabboo qarshii 10',
      am: 'ዳቦ ባለ 10 ብር'
    },
    unit: 'piece',
    unitPrice: 10,
    expectedYield: 500,
    recipeId: 'rec_bread_10',
    active: true
  },
  {
    id: 'prod_bread_15',
    code: 'PRD-BRD-15',
    name: {
      en: '15 Birr Bread',
      om: 'Daabboo qarshii 15',
      am: 'ዳቦ ባለ 15 ብር'
    },
    unit: 'piece',
    unitPrice: 15,
    expectedYield: 340,
    recipeId: 'rec_bread_15',
    active: true
  },
  {
    id: 'prod_bread_25',
    code: 'PRD-BRD-25',
    name: {
      en: '25 Birr Bread',
      om: 'Daabboo qarshii 25',
      am: 'ዳቦ ባለ 25 ብር'
    },
    unit: 'piece',
    unitPrice: 25,
    expectedYield: 240,
    recipeId: 'rec_bread_25',
    active: true
  },
  {
    id: 'prod_bread_160',
    code: 'PRD-BRD-160',
    name: {
      en: '160 Birr Bread',
      om: 'Daabboo qarshii 160',
      am: 'ዳቦ ባለ 160 ብር'
    },
    unit: 'piece',
    unitPrice: 160,
    expectedYield: 40,
    recipeId: 'rec_bread_160',
    active: true
  },
  {
    id: 'prod_cookies_1kg',
    code: 'PRD-COK-800',
    name: {
      en: 'Cookies 1kg',
      om: 'Kuukii kiiloo 1 qarshii 800',
      am: 'ኵኪስ 1 ኪሎ 800 ብር'
    },
    unit: 'kg',
    unitPrice: 800,
    expectedYield: 20,
    recipeId: 'rec_cookies_1kg',
    active: true
  },
  {
    id: 'prod_cake_1kg',
    code: 'PRD-CAK-1000',
    name: {
      en: 'Cake 1kg',
      om: 'Keekii kiiloo 1 qarshii 1,000',
      am: 'ኬክ 1 ኪሎ 1000 ብር'
    },
    unit: 'kg',
    unitPrice: 1000,
    expectedYield: 15,
    recipeId: 'rec_cake_1kg',
    active: true
  },
  {
    id: 'prod_biscuit_35',
    code: 'PRD-BSC-35',
    name: {
      en: 'Biscuit 35 Birr',
      om: 'Biskuutii qarshii 35',
      am: 'ብስኩት 35 ብር'
    },
    unit: 'piece',
    unitPrice: 35,
    expectedYield: 160,
    recipeId: 'rec_biscuit_35',
    active: true
  },
  {
    id: 'prod_bombolino_35',
    code: 'PRD-BMB-35',
    name: {
      en: 'Bombolino 35 Birr',
      om: 'Bomboliinoo qarshii 35',
      am: 'ቦንቦሊኖ 35 ብር'
    },
    unit: 'piece',
    unitPrice: 35,
    expectedYield: 150,
    recipeId: 'rec_bombolino_35',
    active: true
  },
  {
    id: 'prod_donut_70',
    code: 'PRD-DNT-70',
    name: {
      en: 'Donut 70 Birr',
      om: 'Doonaatii qarshii 70',
      am: 'ዶናት 70 ብር'
    },
    unit: 'piece',
    unitPrice: 70,
    expectedYield: 100,
    recipeId: 'rec_donut_70',
    active: true
  }
];

// Preserved historical sample products to maintain integrity of historical records
const HISTORICAL_SAMPLE_PRODUCTS: Product[] = [
  {
    id: 'prod_standard_loaf',
    code: 'PRD-STD-01',
    name: {
      en: 'Standard Artisanal White Loaf (Historical)',
      om: 'Daabboo Adii Standardii (Seenaa)',
      am: 'መደበኛ ነጭ ዳቦ (ታሪካዊ)'
    },
    unitPrice: 25,
    unit: 'piece',
    expectedYield: 240,
    recipeId: 'rec_standard_loaf',
    active: false
  },
  {
    id: 'prod_wheat_loaf',
    code: 'PRD-WHT-02',
    name: {
      en: 'Whole Wheat Healthy Loaf (Historical)',
      om: 'Daabboo Qamadii Guutuu (Seenaa)',
      am: 'የሙሉ ስንዴ ጤናማ ዳቦ (ታሪካዊ)'
    },
    unitPrice: 35,
    unit: 'piece',
    expectedYield: 200,
    recipeId: 'rec_wheat_loaf',
    active: false
  },
  {
    id: 'prod_sweet_bread',
    code: 'PRD-SWT-03',
    name: {
      en: 'Sweet Milk Butter Bread (Historical)',
      om: 'Daabboo Mi’aawaa Aannanii (Seenaa)',
      am: 'ጣፋጭ የወተት ዳቦ (ታሪካዊ)'
    },
    unitPrice: 30,
    unit: 'piece',
    expectedYield: 220,
    recipeId: 'rec_sweet_bread',
    active: false
  }
];

const INITIAL_PRODUCTS: Product[] = [
  ...DEFAULT_NINE_PRODUCTS,
  ...HISTORICAL_SAMPLE_PRODUCTS
];

// Initial Configurable Recipe Template (from Section 9):
// Flour: 50 kg, Yeast: 0.5 kg, Sugar: 3 kg, Oil: 5 liters, Cake ingredients: 2 kg, Bags: 2 kg
const INITIAL_RECIPES: Recipe[] = [
  {
    id: 'rec_standard_loaf',
    productId: 'prod_standard_loaf',
    name: 'Standard 50kg Batch Recipe',
    ingredients: [
      { ingredientId: 'ing_flour', quantity: 50, unit: 'kg' },
      { ingredientId: 'ing_yeast', quantity: 0.5, unit: 'kg' },
      { ingredientId: 'ing_sugar', quantity: 3, unit: 'kg' },
      { ingredientId: 'ing_oil', quantity: 5, unit: 'liters' },
      { ingredientId: 'ing_cake_mix', quantity: 1, unit: 'kg' }
    ],
    packaging: [
      { ingredientId: 'ing_bags', quantity: 2, unit: 'kg' }
    ]
  },
  {
    id: 'rec_wheat_loaf',
    productId: 'prod_wheat_loaf',
    name: 'Whole Wheat 50kg Batch Recipe',
    ingredients: [
      { ingredientId: 'ing_flour', quantity: 50, unit: 'kg' },
      { ingredientId: 'ing_yeast', quantity: 0.6, unit: 'kg' },
      { ingredientId: 'ing_sugar', quantity: 2, unit: 'kg' },
      { ingredientId: 'ing_oil', quantity: 4, unit: 'liters' },
      { ingredientId: 'ing_cake_mix', quantity: 0.5, unit: 'kg' }
    ],
    packaging: [
      { ingredientId: 'ing_bags', quantity: 2, unit: 'kg' }
    ]
  },
  {
    id: 'rec_sweet_bread',
    productId: 'prod_sweet_bread',
    name: 'Sweet Milk 50kg Batch Recipe',
    ingredients: [
      { ingredientId: 'ing_flour', quantity: 50, unit: 'kg' },
      { ingredientId: 'ing_yeast', quantity: 0.5, unit: 'kg' },
      { ingredientId: 'ing_sugar', quantity: 5, unit: 'kg' },
      { ingredientId: 'ing_oil', quantity: 6, unit: 'liters' },
      { ingredientId: 'ing_cake_mix', quantity: 2, unit: 'kg' }
    ],
    packaging: [
      { ingredientId: 'ing_bags', quantity: 2, unit: 'kg' }
    ]
  }
];

const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'sup_1',
    name: 'Adaama Flour Mills Share Company',
    phone: '+251 22 111 4589',
    email: 'sales@adaamaflour.et',
    address: 'Industrial Zone, Adaama, Oromia',
    supplies: ['Wheat Flour', 'Bran Flour']
  },
  {
    id: 'sup_2',
    name: 'Wonji Sugar Factor Distribution Agency',
    phone: '+251 22 220 1024',
    email: 'info@wonjisugar.et',
    address: 'Wonji, Oromia',
    supplies: ['White Refined Sugar']
  },
  {
    id: 'sup_3',
    name: 'Oromia Edible Oil Enterprise',
    phone: '+251 11 465 7800',
    email: 'orders@oromiaoil.et',
    address: 'Addis Ababa / Dukem depot',
    supplies: ['Vegetable Oil', 'Shortening']
  },
  {
    id: 'sup_4',
    name: 'Addis Bakery Packaging & Yeast Importers',
    phone: '+251 11 551 9087',
    email: 'yeast@addispack.com',
    address: 'Merkato, Addis Ababa',
    supplies: ['Dry Instant Yeast', 'Paper & Plastic Bags']
  }
];

const INITIAL_SETTINGS: AppSettings = {
  bakeryName: "Mi'aawaa Bakery",
  logoUrl: '/src/assets/images/miaawaa_bakery_logo_1790965805541.jpg',
  defaultLanguage: 'en',
  supportedLanguages: ['en', 'om', 'am'],
  businessTimezone: 'Africa/Addis_Ababa (UTC+3)',
  currency: 'ETB',
  businessDate: '2026-10-02'
};

const INITIAL_PRODUCTION: ProductionBatch[] = [
  {
    id: 'bat_20261002_01',
    batchNumber: 'BATCH-20261002-01',
    date: '2026-10-02',
    productId: 'prod_standard_loaf',
    totalProduced: 500,
    rejectedQty: 10,
    saleableQty: 490,
    ingredientsUsed: [
      { ingredientId: 'ing_flour', quantity: 100, unit: 'kg' },
      { ingredientId: 'ing_yeast', quantity: 1, unit: 'kg' },
      { ingredientId: 'ing_sugar', quantity: 6, unit: 'kg' },
      { ingredientId: 'ing_oil', quantity: 10, unit: 'liters' },
      { ingredientId: 'ing_cake_mix', quantity: 2, unit: 'kg' },
      { ingredientId: 'ing_bags', quantity: 4, unit: 'kg' }
    ],
    status: 'completed',
    notes: 'Early morning night batch completed on time at 03:30 AM',
    createdBy: 'usr_baker_1',
    creatorName: 'Derartu Gemechu (Night Baker)',
    createdAt: '2026-10-02T03:35:00Z'
  },
  {
    id: 'bat_20261002_02',
    batchNumber: 'BATCH-20261002-02',
    date: '2026-10-02',
    productId: 'prod_wheat_loaf',
    totalProduced: 250,
    rejectedQty: 5,
    saleableQty: 245,
    ingredientsUsed: [
      { ingredientId: 'ing_flour', quantity: 60, unit: 'kg' },
      { ingredientId: 'ing_yeast', quantity: 0.7, unit: 'kg' },
      { ingredientId: 'ing_sugar', quantity: 2.5, unit: 'kg' },
      { ingredientId: 'ing_oil', quantity: 5, unit: 'liters' },
      { ingredientId: 'ing_bags', quantity: 2, unit: 'kg' }
    ],
    status: 'completed',
    notes: 'Whole wheat batch with excellent crust consistency',
    createdBy: 'usr_baker_1',
    creatorName: 'Derartu Gemechu (Night Baker)',
    createdAt: '2026-10-02T04:45:00Z'
  }
];

const INITIAL_DELIVERIES: Delivery[] = [
  {
    id: 'del_20261002_01',
    deliveryNumber: 'DISP-20261002-01',
    date: '2026-10-02',
    dispatchTime: '05:15 AM',
    batchId: 'bat_20261002_01',
    productId: 'prod_standard_loaf',
    fromBranch: 'coka',
    toBranch: 'coka',
    dispatchQty: 260,
    receivedQty: 260,
    damagedMissingQty: 0,
    status: 'received',
    dispatchedBy: 'usr_baker_1',
    dispatcherName: 'Derartu Gemechu',
    receivedBy: 'usr_sales_coka',
    receiverName: 'Chaltu Negash',
    receivedAt: '2026-10-02T05:30:00Z',
    notes: 'Transferred to Coka front retail counter'
  },
  {
    id: 'del_20261002_02',
    deliveryNumber: 'DISP-20261002-02',
    date: '2026-10-02',
    dispatchTime: '05:30 AM',
    batchId: 'bat_20261002_01',
    productId: 'prod_standard_loaf',
    fromBranch: 'coka',
    toBranch: 'mizan',
    dispatchQty: 230,
    receivedQty: 230,
    damagedMissingQty: 0,
    status: 'received',
    dispatchedBy: 'usr_baker_1',
    dispatcherName: 'Derartu Gemechu',
    receivedBy: 'usr_sales_mizan',
    receiverName: 'Tolosa Dibaba',
    receivedAt: '2026-10-02T06:15:00Z',
    notes: 'Early morning van delivery to Mizan retail branch'
  },
  {
    id: 'del_20261002_03',
    deliveryNumber: 'DISP-20261002-03',
    date: '2026-10-02',
    dispatchTime: '05:45 AM',
    batchId: 'bat_20261002_02',
    productId: 'prod_wheat_loaf',
    fromBranch: 'coka',
    toBranch: 'coka',
    dispatchQty: 145,
    receivedQty: 145,
    damagedMissingQty: 0,
    status: 'received',
    dispatchedBy: 'usr_baker_1',
    dispatcherName: 'Derartu Gemechu',
    receivedBy: 'usr_sales_coka',
    receiverName: 'Chaltu Negash',
    receivedAt: '2026-10-02T06:00:00Z',
    notes: 'Coka counter whole wheat supply'
  },
  {
    id: 'del_20261002_04',
    deliveryNumber: 'DISP-20261002-04',
    date: '2026-10-02',
    dispatchTime: '05:45 AM',
    batchId: 'bat_20261002_02',
    productId: 'prod_wheat_loaf',
    fromBranch: 'coka',
    toBranch: 'mizan',
    dispatchQty: 100,
    receivedQty: 100,
    damagedMissingQty: 0,
    status: 'received',
    dispatchedBy: 'usr_baker_1',
    dispatcherName: 'Derartu Gemechu',
    receivedBy: 'usr_sales_mizan',
    receiverName: 'Tolosa Dibaba',
    receivedAt: '2026-10-02T06:20:00Z',
    notes: 'Mizan counter whole wheat allocation'
  }
];

const INITIAL_SALES: Sale[] = [
  {
    id: 'sal_coka_01',
    saleNumber: 'SL-COKA-1001',
    date: '2026-10-02',
    branch: 'coka',
    productId: 'prod_bread_25',
    quantity: 100,
    unitPrice: 25,
    discount: 0,
    totalAmount: 2500,
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    amountPaid: 2500,
    remainingBalance: 0,
    customerName: 'Abebe Desta',
    customerPhone: '0911223344',
    payments: [
      {
        id: 'pmt_coka_01',
        saleId: 'sal_coka_01',
        customerName: 'Abebe Desta',
        branch: 'coka',
        amount: 2500,
        paymentMethod: 'cash',
        date: '2026-10-02',
        recordedBy: 'usr_sales_coka',
        recorderName: 'Chaltu Negash',
        type: 'full_payment',
        createdAt: '2026-10-02T08:15:00Z'
      }
    ],
    recordedBy: 'usr_sales_coka',
    recorderName: 'Chaltu Negash',
    createdAt: '2026-10-02T08:15:00Z'
  },
  {
    id: 'sal_coka_down_01',
    saleNumber: 'SL-COKA-1002',
    date: '2026-10-02',
    branch: 'coka',
    productId: 'prod_cake_1kg',
    quantity: 2,
    unitPrice: 1000,
    discount: 0,
    totalAmount: 2000,
    paymentMethod: 'cash',
    paymentStatus: 'partial',
    amountPaid: 800,
    remainingBalance: 1200,
    customerName: 'Tigist Alemu',
    customerPhone: '0921445566',
    notes: 'Wedding cake reservation - initial down payment (ቀብድ) received in cash',
    payments: [
      {
        id: 'pmt_coka_dp_01',
        saleId: 'sal_coka_down_01',
        customerName: 'Tigist Alemu',
        branch: 'coka',
        amount: 800,
        paymentMethod: 'cash',
        date: '2026-10-02',
        recordedBy: 'usr_sales_coka',
        recorderName: 'Chaltu Negash',
        type: 'initial_down_payment',
        notes: 'Initial cash down payment (ቀብድ)',
        createdAt: '2026-10-02T09:00:00Z'
      }
    ],
    recordedBy: 'usr_sales_coka',
    recorderName: 'Chaltu Negash',
    createdAt: '2026-10-02T09:00:00Z'
  },
  {
    id: 'sal_mizan_01',
    saleNumber: 'SL-MIZ-2001',
    date: '2026-10-02',
    branch: 'mizan',
    productId: 'prod_bread_10',
    quantity: 200,
    unitPrice: 10,
    discount: 0,
    totalAmount: 2000,
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    amountPaid: 2000,
    remainingBalance: 0,
    customerName: 'Walk-in Retail',
    payments: [
      {
        id: 'pmt_miz_01',
        saleId: 'sal_mizan_01',
        customerName: 'Walk-in Retail',
        branch: 'mizan',
        amount: 2000,
        paymentMethod: 'cash',
        date: '2026-10-02',
        recordedBy: 'usr_sales_mizan',
        recorderName: 'Tolosa Dibaba',
        type: 'full_payment',
        createdAt: '2026-10-02T08:45:00Z'
      }
    ],
    recordedBy: 'usr_sales_mizan',
    recorderName: 'Tolosa Dibaba',
    createdAt: '2026-10-02T08:45:00Z'
  },
  {
    id: 'sal_mizan_down_01',
    saleNumber: 'SL-MIZ-2002',
    date: '2026-10-02',
    branch: 'mizan',
    productId: 'prod_bread_160',
    quantity: 10,
    unitPrice: 160,
    discount: 0,
    totalAmount: 1600,
    paymentMethod: 'digital',
    paymentStatus: 'partial',
    amountPaid: 1100,
    remainingBalance: 500,
    customerName: 'Gemechu Desta',
    customerPhone: '0933557799',
    notes: 'Large loaf order with partial balance cleared',
    payments: [
      {
        id: 'pmt_miz_dp_01',
        saleId: 'sal_mizan_down_01',
        customerName: 'Gemechu Desta',
        branch: 'mizan',
        amount: 600,
        paymentMethod: 'digital',
        date: '2026-10-02',
        recordedBy: 'usr_sales_mizan',
        recorderName: 'Tolosa Dibaba',
        type: 'initial_down_payment',
        notes: 'Initial Telebirr deposit (ቀብድ)',
        createdAt: '2026-10-02T09:30:00Z'
      },
      {
        id: 'pmt_miz_sub_01',
        saleId: 'sal_mizan_down_01',
        customerName: 'Gemechu Desta',
        branch: 'mizan',
        amount: 500,
        paymentMethod: 'cash',
        date: '2026-10-02',
        recordedBy: 'usr_sales_mizan',
        recorderName: 'Tolosa Dibaba',
        type: 'subsequent_payment',
        notes: 'Cash payment towards remaining balance',
        createdAt: '2026-10-02T11:15:00Z'
      }
    ],
    recordedBy: 'usr_sales_mizan',
    recorderName: 'Tolosa Dibaba',
    createdAt: '2026-10-02T09:30:00Z'
  },
  {
    id: 'sal_coka_unpaid_01',
    saleNumber: 'SL-COKA-1003',
    date: '2026-10-02',
    branch: 'coka',
    productId: 'prod_cookies_1kg',
    quantity: 2.5,
    unitPrice: 800,
    discount: 0,
    totalAmount: 2000,
    paymentMethod: 'cash',
    paymentStatus: 'unpaid',
    amountPaid: 0,
    remainingBalance: 2000,
    customerName: 'Hailu Merga',
    customerPhone: '0944668800',
    notes: 'Store credit - payment promised upon evening pickup',
    payments: [],
    recordedBy: 'usr_sales_coka',
    recorderName: 'Chaltu Negash',
    createdAt: '2026-10-02T10:15:00Z'
  }
];

const INITIAL_PURCHASES: Purchase[] = [
  {
    id: 'pur_01',
    invoiceNumber: 'INV-20260930-01',
    date: '2026-09-30',
    supplierId: 'sup_1',
    supplierName: 'Adaama Flour Mills Share Company',
    items: [
      { ingredientId: 'ing_flour', quantity: 2000, unit: 'kg', unitCost: 110, totalCost: 220000 }
    ],
    totalAmount: 220000,
    paymentStatus: 'paid',
    recordedBy: 'usr_manager_1',
    recorderName: 'Birhanu Bekele (Manager)',
    createdAt: '2026-09-30T11:00:00Z'
  },
  {
    id: 'pur_02',
    invoiceNumber: 'INV-20261001-02',
    date: '2026-10-01',
    supplierId: 'sup_4',
    supplierName: 'Addis Bakery Packaging & Yeast Importers',
    items: [
      { ingredientId: 'ing_yeast', quantity: 30, unit: 'kg', unitCost: 450, totalCost: 13500 },
      { ingredientId: 'ing_bags', quantity: 100, unit: 'kg', unitCost: 160, totalCost: 16000 }
    ],
    totalAmount: 29500,
    paymentStatus: 'paid',
    recordedBy: 'usr_manager_1',
    recorderName: 'Birhanu Bekele (Manager)',
    createdAt: '2026-10-01T14:30:00Z'
  }
];

const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'exp_01',
    expenseNumber: 'EXP-20261001-01',
    date: '2026-10-01',
    branch: 'both',
    category: 'transport',
    amount: 1800,
    paymentMethod: 'cash',
    description: 'Fuel for bread delivery van (Coka to Mizan route)',
    recordedBy: 'usr_manager_1',
    recorderName: 'Birhanu Bekele',
    createdAt: '2026-10-01T16:00:00Z'
  },
  {
    id: 'exp_02',
    expenseNumber: 'EXP-20261001-02',
    date: '2026-10-01',
    branch: 'coka',
    category: 'utilities',
    amount: 3200,
    paymentMethod: 'digital',
    description: 'Electric utility payment for main bakery oven heaters',
    recordedBy: 'usr_manager_1',
    recorderName: 'Birhanu Bekele',
    createdAt: '2026-10-01T17:15:00Z'
  }
];

const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud_01',
    timestamp: '2026-09-01T08:00:00Z',
    actorId: 'usr_owner_1',
    actorName: 'Alemayehu Tadesse',
    actorRole: 'owner',
    action: 'CREATE_USER',
    targetType: 'User',
    targetId: 'usr_manager_1',
    details: 'Provisioned manager account Birhanu Bekele with both branches scope'
  },
  {
    id: 'aud_02',
    timestamp: '2026-09-02T07:00:00Z',
    actorId: 'usr_owner_1',
    actorName: 'Alemayehu Tadesse',
    actorRole: 'owner',
    action: 'CREATE_USER',
    targetType: 'User',
    targetId: 'usr_sales_mizan',
    details: 'Provisioned Mizan sales staff Tolosa Dibaba without email requirement'
  },
  {
    id: 'aud_03',
    timestamp: '2026-09-15T09:00:00Z',
    actorId: 'usr_owner_1',
    actorName: 'Alemayehu Tadesse',
    actorRole: 'owner',
    action: 'UPDATE_LOGO',
    targetType: 'Settings',
    targetId: 'branding',
    details: 'Configured official Mi\'aawaa Bakery emblem logo'
  }
];

// Helper to get from LocalStorage with fallback
function getStored<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error(`Error loading key ${key} from storage:`, e);
    return defaultValue;
  }
}

// Helper to save to LocalStorage
function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving key ${key} to storage:`, e);
  }
}

class StorageService {
  private subscribers: Set<() => void> = new Set();
  private isSyncing: boolean = false;
  private lastSyncTime: string | null = null;
  private isConnected: boolean = false;
  private eventSource: any = null;

  constructor() {
    this.ensureInitialized();
    if (typeof window !== 'undefined') {
      setTimeout(() => this.initServerSync(), 50);
    }
  }

  public subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  public notifySubscribers(): void {
    this.subscribers.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.warn('[Storage] Subscriber callback error:', err);
      }
    });
  }

  public getSyncStatus(): { isConnected: boolean; isSyncing: boolean; lastSyncTime: string | null } {
    return {
      isConnected: this.isConnected,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime
    };
  }

  public async syncFromServer(): Promise<boolean> {
    if (this.isSyncing) return true;
    this.isSyncing = true;
    this.notifySubscribers();

    try {
      const res = await fetch('/api/sync/all');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data) {
        if (data.mode) {
          localStorage.setItem('miaawaa_system_mode', data.mode);
        }

        if (Array.isArray(data.users) && data.users.length > 0) {
          // Merge users with passwords from local storage if available so offline auth works
          const localUsers = getStored<User[]>(STORAGE_KEYS.USERS, []);
          const mergedUsers = data.users.map((u: any) => {
            const loc = localUsers.find(lu => lu.id === u.id);
            return {
              ...u,
              mustChangePassword: u.mustChangePassword !== undefined ? Boolean(u.mustChangePassword) : (loc ? loc.mustChangePassword : false),
              passwordHash: loc ? loc.passwordHash : u.passwordHash,
              salt: loc ? loc.salt : u.salt
            };
          });
          setStored(STORAGE_KEYS.USERS, mergedUsers);
        }

        if (Array.isArray(data.products) && data.products.length > 0) setStored(STORAGE_KEYS.PRODUCTS, data.products);
        if (Array.isArray(data.ingredients) && data.ingredients.length > 0) setStored(STORAGE_KEYS.INGREDIENTS, data.ingredients);
        if (Array.isArray(data.recipes) && data.recipes.length > 0) setStored(STORAGE_KEYS.RECIPES, data.recipes);
        if (Array.isArray(data.productionBatches)) setStored(STORAGE_KEYS.PRODUCTION, data.productionBatches);
        if (Array.isArray(data.deliveries)) setStored(STORAGE_KEYS.DELIVERIES, data.deliveries);
        if (Array.isArray(data.sales)) setStored(STORAGE_KEYS.SALES, data.sales);
        if (Array.isArray(data.dailyClosings)) setStored(STORAGE_KEYS.CLOSINGS, data.dailyClosings);
        if (Array.isArray(data.cashHandovers)) setStored(STORAGE_KEYS.HANDOVERS, data.cashHandovers);
        if (Array.isArray(data.purchases)) setStored(STORAGE_KEYS.PURCHASES, data.purchases);
        if (Array.isArray(data.suppliers)) setStored(STORAGE_KEYS.SUPPLIERS, data.suppliers);
        if (Array.isArray(data.expenses)) setStored(STORAGE_KEYS.EXPENSES, data.expenses);
        if (Array.isArray(data.auditLogs)) setStored(STORAGE_KEYS.AUDIT_LOGS, data.auditLogs);
        if (data.settings) setStored(STORAGE_KEYS.SETTINGS, data.settings);

        this.isConnected = true;
        this.lastSyncTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        this.notifySubscribers();
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[Sync] Sync from server notice (working in local cache mode):', err);
      this.isConnected = false;
      this.notifySubscribers();
      return false;
    } finally {
      this.isSyncing = false;
      this.notifySubscribers();
    }
  }

  public initServerSync(): void {
    // 1. Initial sync
    this.syncFromServer();

    // 2. Set up SSE connection
    if (typeof window !== 'undefined' && 'EventSource' in window) {
      try {
        if (this.eventSource) {
          this.eventSource.close();
        }
        const es = new EventSource('/api/realtime/stream');
        this.eventSource = es;
        es.onopen = () => {
          this.isConnected = true;
          this.notifySubscribers();
        };
        es.addEventListener('sync', (evt) => {
          try {
            this.syncFromServer();
          } catch (e) {
            console.warn('[SSE] sync event error:', e);
          }
        });
        es.addEventListener('mode_change', (evt: any) => {
          try {
            console.log('[SSE] System environment mode changed on server, resynchronizing...');
            if (typeof window !== 'undefined') {
              window.location.reload();
            }
          } catch (e) {
            console.warn('[SSE] mode_change event error:', e);
          }
        });
        es.onerror = () => {
          this.isConnected = false;
          this.notifySubscribers();
        };
      } catch (e) {
        console.warn('[SSE] EventSource init failed:', e);
      }
    }

    // 3. Listen for window focus & network restoration
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => this.syncFromServer());
      window.addEventListener('online', () => this.syncFromServer());
    }
  }

  // ----------------------------------------------------------------------
  // DEMO MODE & SYSTEM ENVIRONMENT CONTROLS (ADMIN ONLY)
  // ----------------------------------------------------------------------
  public isDemoMode(): boolean {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('miaawaa_system_mode') === 'demo';
    }
    return false;
  }

  public getSystemMode(): 'production' | 'demo' {
    return this.isDemoMode() ? 'demo' : 'production';
  }

  public async toggleDemoMode(enabled: boolean, actor: User): Promise<{ success: boolean; mode: string; isDemoMode: boolean }> {
    if (actor.role !== 'owner' && actor.username !== 'admin') {
      throw new Error('Unauthorized: Only the System Administrator can enable or disable Demo Mode.');
    }
    if (this.isSyncing) {
      throw new Error('Cannot switch mode while a synchronization or transaction is currently in progress.');
    }

    const res = await fetch('/api/admin/demo-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled, actorId: actor.id })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to toggle Demo Mode on server.');
    }

    localStorage.setItem('miaawaa_system_mode', data.mode);
    this.notifySubscribers();
    return data;
  }

  // ----------------------------------------------------------------------
  // SECURE AUTHENTICATION & PASSWORD MANAGEMENT
  // ----------------------------------------------------------------------
  public async changeInitialPassword(
    username: string,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<{ success: boolean; user?: any; error?: string }> {
    const res = await fetch('/api/auth/change-initial-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, currentPassword, newPassword, confirmPassword })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to change initial admin password.');
    }
    return data;
  }

  public async changePassword(
    actorId: string,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actorId, currentPassword, newPassword, confirmPassword })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to change password.');
    }
    return data;
  }

  public async apiPost(url: string, body: any): Promise<any> {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn(`[API POST ${url}]`, err);
        return null;
      }
      return await res.json().catch(() => null);
    } catch (e) {
      console.warn(`[API POST ${url}] network error:`, e);
      return null;
    }
  }

  public async apiPut(url: string, body: any): Promise<any> {
    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn(`[API PUT ${url}]`, err);
        return null;
      }
      return await res.json().catch(() => null);
    } catch (e) {
      console.warn(`[API PUT ${url}] network error:`, e);
      return null;
    }
  }

  public ensureInitialized(): void {
    const initialized = localStorage.getItem(STORAGE_KEYS.INIT_FLAG);
    if (!initialized) {
      this.resetToDefaults();
    } else {
      this.migrateCatalogAndSales();
    }
  }

  public migrateCatalogAndSales(): void {
    try {
      const storedProds = getStored<Product[]>(STORAGE_KEYS.PRODUCTS, []);
      let prodsModified = false;

      // Ensure all 9 default products exist in the catalog
      for (const newP of DEFAULT_NINE_PRODUCTS) {
        const existingIdx = storedProds.findIndex(p => p.id === newP.id);
        if (existingIdx === -1) {
          storedProds.push({ ...newP });
          prodsModified = true;
        } else {
          // If deactivated by mistake, reactivate
          if (storedProds[existingIdx].active === false) {
            storedProds[existingIdx].active = true;
            prodsModified = true;
          }
        }
      }

      // Mark old sample products as inactive in the active catalog (archive them without deleting)
      for (const p of storedProds) {
        if (['prod_standard_loaf', 'prod_wheat_loaf', 'prod_sweet_bread'].includes(p.id) && p.active !== false) {
          p.active = false;
          prodsModified = true;
        }
      }

      if (prodsModified) {
        setStored(STORAGE_KEYS.PRODUCTS, storedProds);
      }

      // Ensure all sales have down payment attributes and payments array
      const storedSales = getStored<Sale[]>(STORAGE_KEYS.SALES, []);
      let salesModified = false;
      for (const s of storedSales) {
        if (!s.paymentStatus || s.amountPaid === undefined || s.remainingBalance === undefined || !s.payments) {
          s.paymentStatus = s.paymentStatus || 'paid';
          s.amountPaid = s.amountPaid !== undefined ? s.amountPaid : s.totalAmount;
          s.remainingBalance = s.remainingBalance !== undefined ? s.remainingBalance : 0;
          if (!s.payments || s.payments.length === 0) {
            if (s.amountPaid > 0) {
              s.payments = [
                {
                  id: 'pmt_' + s.id + '_1',
                  saleId: s.id,
                  customerName: s.customerName || 'Customer',
                  branch: s.branch,
                  amount: s.amountPaid,
                  paymentMethod: s.paymentMethod,
                  date: s.date,
                  recordedBy: s.recordedBy,
                  recorderName: s.recorderName,
                  type: 'full_payment',
                  createdAt: s.createdAt
                }
              ];
            } else {
              s.payments = [];
            }
          }
          salesModified = true;
        }
      }
      if (salesModified) {
        setStored(STORAGE_KEYS.SALES, storedSales);
      }
    } catch (err) {
      console.warn('Error during catalog migration:', err);
    }
  }

  public resetToDefaults(): void {
    setStored(STORAGE_KEYS.USERS, INITIAL_USERS);
    setStored(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    setStored(STORAGE_KEYS.INGREDIENTS, INITIAL_INGREDIENTS);
    setStored(STORAGE_KEYS.RECIPES, INITIAL_RECIPES);
    setStored(STORAGE_KEYS.PRODUCTION, INITIAL_PRODUCTION);
    setStored(STORAGE_KEYS.DELIVERIES, INITIAL_DELIVERIES);
    setStored(STORAGE_KEYS.SALES, INITIAL_SALES);
    setStored(STORAGE_KEYS.CLOSINGS, []);
    setStored(STORAGE_KEYS.HANDOVERS, []);
    setStored(STORAGE_KEYS.PURCHASES, INITIAL_PURCHASES);
    setStored(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
    setStored(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
    setStored(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
    setStored(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    localStorage.setItem(STORAGE_KEYS.INIT_FLAG, 'true');
  }

  // AUDIT LOGS
  public logAudit(log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      ...log,
      id: 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString()
    };
    logs.unshift(newLog);
    setStored(STORAGE_KEYS.AUDIT_LOGS, logs.slice(0, 500)); // retain last 500
    return newLog;
  }

  public getAuditLogs(): AuditLog[] {
    return getStored<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
  }

  // APP SETTINGS
  public getSettings(): AppSettings {
    return getStored<AppSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  }

  public updateSettings(settings: Partial<AppSettings>, actor: User): AppSettings {
    // Only owner can update settings
    if (actor.role !== 'owner') {
      throw new Error('Unauthorized: Only the Owner can modify system settings or branding.');
    }
    const current = this.getSettings();
    const updated: AppSettings = { ...current, ...settings };
    setStored(STORAGE_KEYS.SETTINGS, updated);

    this.logAudit({
      actorId: actor.id,
      actorName: actor.displayName,
      actorRole: actor.role,
      action: 'UPDATE_SETTINGS',
      targetType: 'AppSettings',
      targetId: 'global',
      details: `Updated settings: ${Object.keys(settings).join(', ')}`
    });

    this.apiPut('/api/settings', { settings: updated, actorId: actor.id });
    this.notifySubscribers();

    return updated;
  }

  // USER MANAGEMENT (OWNER ONLY)
  public getUsers(): User[] {
    return getStored<User[]>(STORAGE_KEYS.USERS, []);
  }

  public getUserById(id: string): User | undefined {
    return this.getUsers().find(u => u.id === id);
  }

  public getUserByUsername(username: string): User | undefined {
    const clean = username.trim().toLowerCase();
    return this.getUsers().find(u => u.username.toLowerCase() === clean);
  }

  public createUser(userData: {
    username: string;
    displayName: string;
    passwordHash: string;
    salt: string;
    role: Role;
    branch: BranchScope;
    status: 'active' | 'inactive';
  }, actor: User): User {
    if (actor.role !== 'owner') {
      throw new Error('Unauthorized: Only Owner / Administrator can create user accounts.');
    }

    const cleanUsername = userData.username.trim().toLowerCase();
    if (!cleanUsername) {
      throw new Error('Username is required.');
    }

    if (!/^[a-z0-9_]{3,24}$/.test(cleanUsername)) {
      throw new Error('Username must be 3-24 characters and only contain letters, numbers, or underscore.');
    }

    const existing = this.getUserByUsername(cleanUsername);
    if (existing) {
      throw new Error(`Username "${cleanUsername}" is already taken.`);
    }

    // Role-branch assignment validation according to Section 3:
    // Production Staff: Coka Branch
    // Coka Sales Staff: Coka Branch
    // Mizan Sales Staff: Mizan Branch
    // Owner / Manager: both
    let validBranch: BranchScope = userData.branch;
    if (userData.role === 'production') {
      validBranch = 'coka';
    } else if (userData.role === 'sales' && validBranch === 'both') {
      validBranch = 'coka'; // sales must be assigned to coka or mizan
    } else if (userData.role === 'owner' || userData.role === 'manager') {
      validBranch = 'both';
    }

    const users = this.getUsers();
    const newUser: User = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      username: cleanUsername,
      displayName: userData.displayName.trim(),
      passwordHash: userData.passwordHash,
      salt: userData.salt,
      role: userData.role,
      branch: validBranch,
      status: userData.status,
      createdAt: new Date().toISOString(),
      lastLoginAt: null
    };

    users.push(newUser);
    setStored(STORAGE_KEYS.USERS, users);

    this.logAudit({
      actorId: actor.id,
      actorName: actor.displayName,
      actorRole: actor.role,
      action: 'CREATE_USER',
      targetType: 'User',
      targetId: newUser.id,
      details: `Created user ${newUser.username} (${newUser.displayName}) with role ${newUser.role} on branch ${newUser.branch}`
    });

    this.apiPost('/api/users', {
      username: newUser.username,
      displayName: newUser.displayName,
      passwordHash: newUser.passwordHash,
      salt: newUser.salt,
      role: newUser.role,
      branch: newUser.branch,
      actorId: actor.id
    });
    this.notifySubscribers();

    return newUser;
  }

  public updateUser(userId: string, updates: {
    username?: string;
    displayName?: string;
    role?: Role;
    branch?: BranchScope;
    status?: 'active' | 'inactive';
  }, actor: User): User {
    if (actor.role !== 'owner') {
      throw new Error('Unauthorized: Only Owner / Administrator can update user accounts.');
    }

    const users = this.getUsers();
    const target = users.find(u => u.id === userId);
    if (!target) {
      throw new Error('User not found.');
    }

    // Self-lockout check: Ensure owner cannot deactivate themselves or remove their own owner role
    if (target.id === actor.id) {
      if (updates.status === 'inactive') {
        throw new Error('Security protection: You cannot deactivate your own active Owner account.');
      }
      if (updates.role && updates.role !== 'owner') {
        throw new Error('Security protection: You cannot demote your own account from Owner / Administrator.');
      }
    }

    // Ensure at least one active owner remains
    if (target.role === 'owner' && (updates.role !== undefined || updates.status !== undefined)) {
      const activeOwners = users.filter(u => u.role === 'owner' && u.status === 'active' && u.id !== target.id);
      if (activeOwners.length === 0) {
        if (updates.status === 'inactive' || (updates.role && updates.role !== 'owner')) {
          throw new Error('Security violation: System must maintain at least one active Owner / Administrator account.');
        }
      }
    }

    if (updates.username) {
      const cleanUsername = updates.username.trim().toLowerCase();
      if (!/^[a-z0-9_]{3,24}$/.test(cleanUsername)) {
        throw new Error('Username must be 3-24 characters and only contain letters, numbers, or underscore.');
      }
      const existing = users.find(u => u.username.toLowerCase() === cleanUsername && u.id !== userId);
      if (existing) {
        throw new Error(`Username "${cleanUsername}" is already taken.`);
      }
      target.username = cleanUsername;
    }

    if (updates.displayName) {
      target.displayName = updates.displayName.trim();
    }

    if (updates.role) {
      target.role = updates.role;
      if (updates.role === 'production') target.branch = 'coka';
      else if (updates.role === 'owner' || updates.role === 'manager') target.branch = 'both';
    }

    if (updates.branch) {
      if (target.role === 'production') {
        target.branch = 'coka';
      } else if (target.role === 'sales') {
        target.branch = updates.branch === 'both' ? 'coka' : updates.branch;
      } else {
        target.branch = updates.branch;
      }
    }

    if (updates.status) {
      target.status = updates.status;
    }

    setStored(STORAGE_KEYS.USERS, users);

    this.logAudit({
      actorId: actor.id,
      actorName: actor.displayName,
      actorRole: actor.role,
      action: 'EDIT_USER',
      targetType: 'User',
      targetId: target.id,
      details: `Updated user ${target.username}: ${JSON.stringify(updates)}`
    });

    this.apiPut(`/api/users/${target.id}`, {
      displayName: target.displayName,
      role: target.role,
      branch: target.branch,
      status: target.status,
      actorId: actor.id
    });
    this.notifySubscribers();

    return target;
  }

  public resetPassword(userId: string, newHash: string, newSalt: string, actor: User): void {
    if (actor.role !== 'owner') {
      throw new Error('Unauthorized: Only Owner / Administrator can reset user passwords.');
    }

    const users = this.getUsers();
    const target = users.find(u => u.id === userId);
    if (!target) {
      throw new Error('User not found.');
    }

    target.passwordHash = newHash;
    target.salt = newSalt;
    setStored(STORAGE_KEYS.USERS, users);

    this.logAudit({
      actorId: actor.id,
      actorName: actor.displayName,
      actorRole: actor.role,
      action: 'RESET_PASSWORD',
      targetType: 'User',
      targetId: target.id,
      details: `Password securely reset for user "${target.username}"`
    });

    this.apiPost(`/api/users/${target.id}/reset-password`, {
      newPasswordHash: newHash,
      newSalt: newSalt,
      actorId: actor.id
    });
    this.notifySubscribers();
  }

  public recordLogin(userId: string): void {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
      user.lastLoginAt = new Date().toISOString();
      setStored(STORAGE_KEYS.USERS, users);
    }
  }

  // PRODUCTS & RECIPES
  public getProducts(onlyActive: boolean = true): Product[] {
    const list = getStored<Product[]>(STORAGE_KEYS.PRODUCTS, []);
    if (!onlyActive) return list;
    return list.filter(p => p.active !== false);
  }

  public getAllProducts(): Product[] {
    return getStored<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  }

  public getProductById(id: string): Product | undefined {
    return this.getAllProducts().find(p => p.id === id);
  }

  public getRecipes(): Recipe[] {
    return getStored<Recipe[]>(STORAGE_KEYS.RECIPES, []);
  }

  public getRecipeByProductId(productId: string): Recipe | undefined {
    return this.getRecipes().find(r => r.productId === productId);
  }

  public updateProductPrice(productId: string, unitPrice: number, actor: User): Product {
    if (actor.role !== 'owner' && actor.role !== 'manager') {
      throw new Error('Unauthorized: Only Owner or Manager can modify product prices.');
    }
    if (unitPrice <= 0) {
      throw new Error('Product price must be greater than zero.');
    }
    const allProducts = this.getAllProducts();
    const prod = allProducts.find(p => p.id === productId);
    if (!prod) throw new Error('Product not found.');
    const oldPrice = prod.unitPrice;
    prod.unitPrice = unitPrice;
    setStored(STORAGE_KEYS.PRODUCTS, allProducts);

    this.logAudit({
      actorId: actor.id,
      actorName: actor.displayName,
      actorRole: actor.role,
      action: 'UPDATE_PRODUCT_PRICE',
      targetType: 'Product',
      targetId: prod.id,
      details: `Updated unit price for "${prod.name.en}" (${prod.name.am} / ${prod.name.om}) from ${oldPrice} ETB to ${unitPrice} ETB`
    });

    this.apiPut(`/api/products/${prod.id}/price`, {
      unitPrice,
      actorId: actor.id
    });
    this.notifySubscribers();

    return prod;
  }

  // INGREDIENTS & INVENTORY
  public getIngredients(): Ingredient[] {
    return getStored<Ingredient[]>(STORAGE_KEYS.INGREDIENTS, []);
  }

  public getIngredientById(id: string): Ingredient | undefined {
    return this.getIngredients().find(i => i.id === id);
  }

  public adjustIngredientStock(ingredientId: string, newStock: number, reason: string, actor: User): Ingredient {
    if (actor.role !== 'owner' && actor.role !== 'manager') {
      throw new Error('Unauthorized: Only Owner or Manager can adjust inventory stock.');
    }
    const ingredients = this.getIngredients();
    const item = ingredients.find(i => i.id === ingredientId);
    if (!item) throw new Error('Ingredient not found.');
    const oldStock = item.currentStock;
    item.currentStock = Math.max(0, newStock);
    setStored(STORAGE_KEYS.INGREDIENTS, ingredients);

    this.logAudit({
      actorId: actor.id,
      actorName: actor.displayName,
      actorRole: actor.role,
      action: 'ADJUST_STOCK',
      targetType: 'Ingredient',
      targetId: ingredientId,
      details: `Adjusted ${item.code} from ${oldStock} to ${item.currentStock} ${item.unit}. Reason: ${reason}`
    });

    this.apiPut(`/api/ingredients/${item.id}/stock`, {
      newStock: item.currentStock,
      reason,
      actorId: actor.id
    });
    this.notifySubscribers();

    return item;
  }

  // PRODUCTION MODULE
  public getProductionBatches(): ProductionBatch[] {
    return getStored<ProductionBatch[]>(STORAGE_KEYS.PRODUCTION, []);
  }

  public recordProductionBatch(data: {
    productId: string;
    totalProduced: number;
    rejectedQty: number;
    ingredientsUsed: Array<{ ingredientId: string; quantity: number; unit: any }>;
    notes: string;
  }, actor: User): ProductionBatch {
    if (actor.role !== 'production' && actor.role !== 'owner' && actor.role !== 'manager') {
      throw new Error('Unauthorized: Only Production Staff, Manager, or Owner can record production.');
    }

    if (data.totalProduced <= 0) {
      throw new Error('Total produced quantity must be greater than zero.');
    }

    if (data.rejectedQty < 0 || data.rejectedQty > data.totalProduced) {
      throw new Error('Rejected quantity cannot be negative or exceed total produced.');
    }

    // Formula: Saleable production = Total produced - Rejected production
    const saleableQty = data.totalProduced - data.rejectedQty;

    // Deduct ingredient inventory ATOMICALLY
    const ingredients = this.getIngredients();
    for (const usage of data.ingredientsUsed) {
      const ing = ingredients.find(i => i.id === usage.ingredientId);
      if (ing) {
        ing.currentStock = Math.max(0, ing.currentStock - usage.quantity);
      }
    }
    setStored(STORAGE_KEYS.INGREDIENTS, ingredients);

    const batches = this.getProductionBatches();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const batchNumber = `BATCH-${dateStr}-${(batches.length + 1).toString().padStart(3, '0')}`;

    const newBatch: ProductionBatch = {
      id: 'bat_' + Date.now(),
      batchNumber,
      date: new Date().toISOString().slice(0, 10),
      productId: data.productId,
      totalProduced: data.totalProduced,
      rejectedQty: data.rejectedQty,
      saleableQty,
      ingredientsUsed: data.ingredientsUsed,
      status: 'completed',
      notes: data.notes || '',
      createdBy: actor.id,
      creatorName: actor.displayName,
      createdAt: new Date().toISOString()
    };

    batches.unshift(newBatch);
    setStored(STORAGE_KEYS.PRODUCTION, batches);

    this.logAudit({
      actorId: actor.id,
      actorName: actor.displayName,
      actorRole: actor.role,
      action: 'RECORD_PRODUCTION',
      targetType: 'ProductionBatch',
      targetId: newBatch.id,
      details: `Recorded batch ${newBatch.batchNumber}: ${newBatch.totalProduced} produced, ${newBatch.rejectedQty} rejected, ${saleableQty} saleable. Ingredients deducted.`
    });

    this.apiPost('/api/production-batches', {
      productId: data.productId,
      totalProduced: data.totalProduced,
      rejectedQty: data.rejectedQty,
      ingredientsUsed: data.ingredientsUsed,
      notes: data.notes,
      actorId: actor.id
    });
    this.notifySubscribers();

    return newBatch;
  }

  // DISTRIBUTION MODULE
  public getDeliveries(branchFilter?: BranchId): Delivery[] {
    const list = getStored<Delivery[]>(STORAGE_KEYS.DELIVERIES, []);
    if (!branchFilter) return list;
    return list.filter(d => d.toBranch === branchFilter);
  }

  public dispatchBread(data: {
    batchId: string;
    productId: string;
    toBranch: BranchId;
    dispatchQty: number;
    dispatchTime: string;
    notes: string;
  }, actor: User): Delivery {
    if (actor.role !== 'production' && actor.role !== 'owner' && actor.role !== 'manager') {
      throw new Error('Unauthorized: Only Production Staff, Manager, or Owner can dispatch bread.');
    }

    if (data.dispatchQty <= 0) {
      throw new Error('Dispatch quantity must be greater than zero.');
    }

    const deliveries = this.getDeliveries();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const deliveryNumber = `DISP-${dateStr}-${(deliveries.length + 1).toString().padStart(3, '0')}`;

    const newDelivery: Delivery = {
      id: 'del_' + Date.now(),
      deliveryNumber,
      date: new Date().toISOString().slice(0, 10),
      dispatchTime: data.dispatchTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      batchId: data.batchId,
      productId: data.productId,
      fromBranch: 'coka',
      toBranch: data.toBranch,
      dispatchQty: data.dispatchQty,
      receivedQty: null,
      damagedMissingQty: null,
      status: 'dispatched',
      dispatchedBy: actor.id,
      dispatcherName: actor.displayName,
      receivedBy: null,
      receiverName: null,
      receivedAt: null,
      notes: data.notes || ''
    };

    deliveries.unshift(newDelivery);
    setStored(STORAGE_KEYS.DELIVERIES, deliveries);

    this.logAudit({
      actorId: actor.id,
      actorName: actor.displayName,
      actorRole: actor.role,
      action: 'DISPATCH_BREAD',
      targetType: 'Delivery',
      targetId: newDelivery.id,
      details: `Dispatched ${data.dispatchQty} loaves to ${data.toBranch} branch (${newDelivery.deliveryNumber})`
    });

    this.apiPost('/api/deliveries', {
      batchId: data.batchId,
      productId: data.productId,
      toBranch: data.toBranch,
      dispatchQty: data.dispatchQty,
      notes: data.notes,
      actorId: actor.id
    });
    this.notifySubscribers();

    return newDelivery;
  }

  // DELIVERIES CONFIRMATION BY SALES STAFF
  public confirmDelivery(deliveryId: string, data: {
    receivedQty: number;
    damagedMissingQty: number;
    notes?: string;
  }, actor: User): Delivery {
    if (actor.role !== 'sales' && actor.role !== 'owner' && actor.role !== 'manager') {
      throw new Error('Unauthorized: Only Sales Staff (or Manager/Owner) can confirm deliveries.');
    }

    const deliveries = this.getDeliveries();
    const target = deliveries.find(d => d.id === deliveryId);
    if (!target) throw new Error('Delivery not found.');

    // If user is sales staff, ensure they only confirm deliveries for their branch!
    if (actor.role === 'sales' && actor.branch !== target.toBranch) {
      throw new Error(`Unauthorized: You are assigned to ${actor.branch} and cannot confirm deliveries for ${target.toBranch}.`);
    }

    target.receivedQty = data.receivedQty;
    target.damagedMissingQty = data.damagedMissingQty;
    target.receivedBy = actor.id;
    target.receiverName = actor.displayName;
    target.receivedAt = new Date().toISOString();
    target.status = data.damagedMissingQty > 0 || (target.dispatchQty !== data.receivedQty)
      ? 'discrepancy'
      : 'received';

    if (data.notes) {
      target.notes = (target.notes ? target.notes + ' | ' : '') + data.notes;
    }

    setStored(STORAGE_KEYS.DELIVERIES, deliveries);

    this.logAudit({
      actorId: actor.id,
      actorName: actor.displayName,
      actorRole: actor.role,
      action: 'CONFIRM_DELIVERY',
      targetType: 'Delivery',
      targetId: target.id,
      details: `Confirmed delivery ${target.deliveryNumber} at ${target.toBranch}: received ${data.receivedQty}, damaged/missing ${data.damagedMissingQty}`
    });

    this.apiPut(`/api/deliveries/${target.id}/confirm`, {
      receivedQty: data.receivedQty,
      damagedMissingQty: data.damagedMissingQty,
      notes: data.notes,
      actorId: actor.id
    });
    this.notifySubscribers();

    return target;
  }

  // SALES MODULE
  public getSales(branchFilter?: BranchId): Sale[] {
    const list = getStored<Sale[]>(STORAGE_KEYS.SALES, []);
    if (!branchFilter) return list;
    return list.filter(s => s.branch === branchFilter);
  }

  public recordSale(data: {
    branch: BranchId;
    productId: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    paymentMethod: 'cash' | 'digital';
    paymentType?: 'full' | 'down_payment' | 'unpaid';
    initialAmountPaid?: number;
    customerName?: string;
    customerPhone?: string;
    notes?: string;
  }, actor: User): Sale {
    if (actor.role === 'sales' && actor.branch !== data.branch) {
      throw new Error(`Unauthorized: You cannot record sales for branch ${data.branch}.`);
    }

    if (data.quantity <= 0) {
      throw new Error('Sale quantity must be greater than zero.');
    }

    const prod = this.getProductById(data.productId);
    if (prod && prod.unit === 'piece' && !Number.isInteger(data.quantity)) {
      throw new Error('Piece-based products must use whole-number quantities.');
    }

    const discount = Number(data.discount || 0);
    const totalAmount = Math.max(0, (data.quantity * data.unitPrice) - discount);
    const pType = data.paymentType || 'full';

    let paymentStatus: PaymentStatus = 'paid';
    let amountPaid = 0;
    let remainingBalance = 0;
    const payments: SalePayment[] = [];

    const saleId = 'sal_' + Date.now();
    const branchPrefix = data.branch === 'coka' ? 'COKA' : 'MIZ';
    const saleNumber = `SL-${branchPrefix}-${Date.now().toString().slice(-6)}`;
    const custName = data.customerName?.trim() || (pType === 'full' ? 'Walk-in Customer' : '');
    const custPhone = data.customerPhone?.trim() || '';

    if (pType === 'down_payment') {
      if (!custName) {
        throw new Error('Mandatory: Customer name is required for down-payment sales.');
      }
      if (!custPhone) {
        throw new Error('Mandatory: Customer phone number is required for down-payment sales.');
      }
      const initPaid = Number(data.initialAmountPaid || 0);
      if (initPaid <= 0) {
        throw new Error('A down payment must be greater than zero.');
      }
      if (initPaid > totalAmount) {
        throw new Error('Payment cannot exceed total sale amount.');
      }

      amountPaid = initPaid;
      remainingBalance = totalAmount - initPaid;
      paymentStatus = remainingBalance === 0 ? 'paid' : 'partial';

      payments.push({
        id: 'pmt_' + Date.now() + '_1',
        saleId,
        customerName: custName,
        branch: data.branch,
        amount: initPaid,
        paymentMethod: data.paymentMethod,
        date: new Date().toISOString().slice(0, 10),
        recordedBy: actor.id,
        recorderName: actor.displayName,
        type: 'initial_down_payment',
        notes: data.notes || 'Initial down payment (ቀብድ)',
        createdAt: new Date().toISOString()
      });
    } else if (pType === 'unpaid') {
      if (!custName) {
        throw new Error('Mandatory: Customer name is required for credit/unpaid sales.');
      }
      if (!custPhone) {
        throw new Error('Mandatory: Customer phone number is required for credit/unpaid sales.');
      }
      amountPaid = 0;
      remainingBalance = totalAmount;
      paymentStatus = 'unpaid';
    } else {
      // Full payment
      amountPaid = totalAmount;
      remainingBalance = 0;
      paymentStatus = 'paid';

      payments.push({
        id: 'pmt_' + Date.now() + '_1',
        saleId,
        customerName: custName || 'Walk-in Customer',
        branch: data.branch,
        amount: totalAmount,
        paymentMethod: data.paymentMethod,
        date: new Date().toISOString().slice(0, 10),
        recordedBy: actor.id,
        recorderName: actor.displayName,
        type: 'full_payment',
        notes: data.notes || '',
        createdAt: new Date().toISOString()
      });
    }

    const sales = this.getSales();
    const newSale: Sale = {
      id: saleId,
      saleNumber,
      date: new Date().toISOString().slice(0, 10),
      branch: data.branch,
      productId: data.productId,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      discount,
      totalAmount,
      paymentMethod: data.paymentMethod,
      paymentStatus,
      amountPaid,
      remainingBalance,
      customerName: custName,
      customerPhone: custPhone,
      payments,
      notes: data.notes || '',
      recordedBy: actor.id,
      recorderName: actor.displayName,
      createdAt: new Date().toISOString()
    };

    sales.unshift(newSale);
    setStored(STORAGE_KEYS.SALES, sales);

    this.logAudit({
      actorId: actor.id,
      actorName: actor.displayName,
      actorRole: actor.role,
      action: 'RECORD_SALE',
      targetType: 'Sale',
      targetId: newSale.id,
      details: `Recorded ${paymentStatus} sale ${saleNumber} at ${data.branch}: ${data.quantity} units of ${prod?.name.en || data.productId} for ${totalAmount} ETB (Paid: ${amountPaid} ETB via ${data.paymentMethod}, Remaining: ${remainingBalance} ETB)`
    });

    this.apiPost('/api/sales', {
      branch: data.branch,
      productId: data.productId,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      discount,
      paymentMethod: data.paymentMethod,
      paymentType: pType,
      initialAmountPaid: data.initialAmountPaid,
      customerName: custName,
      customerPhone: custPhone,
      notes: data.notes,
      actorId: actor.id
    });
    this.notifySubscribers();

    return newSale;
  }

  public recordSubsequentPayment(data: {
    saleId: string;
    amount: number;
    paymentMethod: 'cash' | 'digital';
    notes?: string;
  }, actor: User): { sale: Sale; payment: SalePayment } {
    const sales = this.getSales();
    const sale = sales.find(s => s.id === data.saleId);
    if (!sale) {
      throw new Error('Sale transaction not found.');
    }

    if (actor.role === 'sales' && actor.branch !== sale.branch) {
      throw new Error(`Unauthorized: You can only record payments for your assigned branch (${actor.branch}).`);
    }

    if (data.amount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    if (data.amount > sale.remainingBalance) {
      throw new Error(`Payment amount (${data.amount} ETB) cannot exceed the remaining balance (${sale.remainingBalance} ETB).`);
    }

    sale.amountPaid += data.amount;
    sale.remainingBalance -= data.amount;
    if (sale.remainingBalance <= 0) {
      sale.remainingBalance = 0;
      sale.paymentStatus = 'paid';
    } else {
      sale.paymentStatus = 'partial';
    }

    const newPayment: SalePayment = {
      id: 'pmt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      saleId: sale.id,
      customerName: sale.customerName || 'Customer',
      branch: sale.branch,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      date: new Date().toISOString().slice(0, 10),
      recordedBy: actor.id,
      recorderName: actor.displayName,
      type: 'subsequent_payment',
      notes: data.notes || '',
      createdAt: new Date().toISOString()
    };

    if (!sale.payments) {
      sale.payments = [];
    }
    sale.payments.push(newPayment);

    setStored(STORAGE_KEYS.SALES, sales);

    this.logAudit({
      actorId: actor.id,
      actorName: actor.displayName,
      actorRole: actor.role,
      action: 'RECORD_PAYMENT',
      targetType: 'SalePayment',
      targetId: newPayment.id,
      details: `Recorded subsequent payment of ${data.amount} ETB (${data.paymentMethod}) for sale ${sale.saleNumber} (${sale.customerName}). Remaining balance: ${sale.remainingBalance} ETB`
    });

    this.apiPost(`/api/sales/${sale.id}/payments`, {
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      notes: data.notes,
      actorId: actor.id
    });
    this.notifySubscribers();

    return { sale, payment: newPayment };
  }

  public getCustomerBalances(branchFilter?: BranchId): Sale[] {
    const sales = this.getSales(branchFilter);
    return sales.filter(s => s.paymentStatus !== 'paid' || (s.remainingBalance > 0));
  }

  public getAllPayments(branchFilter?: BranchId, dateFilter?: string): SalePayment[] {
    const sales = this.getSales(branchFilter);
    const result: SalePayment[] = [];
    for (const sale of sales) {
      if (sale.payments && Array.isArray(sale.payments)) {
        for (const p of sale.payments) {
          if (!dateFilter || p.date === dateFilter) {
            result.push(p);
          }
        }
      } else if (sale.amountPaid > 0) {
        if (!dateFilter || sale.date === dateFilter) {
          result.push({
            id: 'legacy_' + sale.id,
            saleId: sale.id,
            customerName: sale.customerName || 'Customer',
            branch: sale.branch,
            amount: sale.amountPaid,
            paymentMethod: sale.paymentMethod,
            date: sale.date,
            recordedBy: sale.recordedBy,
            recorderName: sale.recorderName,
            type: 'full_payment',
            createdAt: sale.createdAt
          });
        }
      }
    }
    return result;
  }

  public getCashCollected(branchFilter?: BranchId, dateFilter?: string): number {
    return this.getAllPayments(branchFilter, dateFilter)
      .filter(p => p.paymentMethod === 'cash')
      .reduce((sum, p) => sum + p.amount, 0);
  }

  public getDigitalCollected(branchFilter?: BranchId, dateFilter?: string): number {
    return this.getAllPayments(branchFilter, dateFilter)
      .filter(p => p.paymentMethod === 'digital')
      .reduce((sum, p) => sum + p.amount, 0);
  }

  public getTotalOutstandingReceivables(branchFilter?: BranchId): number {
    return this.getSales(branchFilter).reduce((sum, s) => sum + (s.remainingBalance || 0), 0);
  }

  // DAILY CLOSING MODULE
  public getDailyClosings(branchFilter?: BranchId): DailyClosing[] {
    const list = getStored<DailyClosing[]>(STORAGE_KEYS.CLOSINGS, []);
    if (!branchFilter) return list;
    return list.filter(c => c.branch === branchFilter);
  }

  public submitDailyClosing(data: {
    branch: BranchId;
    stockItems: DailyClosing['stockItems'];
    cash: DailyClosing['cash'];
    notes: string;
  }, actor: User): DailyClosing {
    if (actor.role === 'sales' && actor.branch !== data.branch) {
      throw new Error(`Unauthorized: You cannot submit closing for branch ${data.branch}.`);
    }

    // Require explanations for any stock discrepancy
    for (const item of data.stockItems) {
      if (item.discrepancy !== 0 && (!item.discrepancyReason || !item.discrepancyReason.trim())) {
        throw new Error('Mandatory: An explanation is required for every stock discrepancy.');
      }
    }

    // Require explanations for cash discrepancy
    if (data.cash.cashDiscrepancy !== 0 && (!data.cash.cashDiscrepancyReason || !data.cash.cashDiscrepancyReason.trim())) {
      throw new Error('Mandatory: An explanation is required for any cash discrepancy.');
    }

    const closings = this.getDailyClosings();
    const newClosing: DailyClosing = {
      id: 'cls_' + Date.now(),
      date: new Date().toISOString().slice(0, 10),
      branch: data.branch,
      stockItems: data.stockItems,
      cash: data.cash,
      status: 'submitted',
      submittedBy: actor.id,
      submitterName: actor.displayName,
      submittedAt: new Date().toISOString(),
      notes: data.notes || ''
    };

    closings.unshift(newClosing);
    setStored(STORAGE_KEYS.CLOSINGS, closings);

    // Automatically create the CashHandover entry!
    const handovers = this.getCashHandovers();
    const newHandover: CashHandover = {
      id: 'hnd_' + Date.now(),
      closingId: newClosing.id,
      date: newClosing.date,
      branch: data.branch,
      amountCounted: data.cash.actualCashCounted,
      amountCollected: 0,
      amountConfirmed: 0,
      status: 'counted',
      salesStaffId: actor.id,
      salesStaffName: actor.displayName,
      collectedByStaffId: null,
      collectedByStaffName: null,
      collectedAt: null,
      confirmedByManagerId: null,
      confirmedByManagerName: null,
      confirmedAt: null,
      notes: `Generated from closing ${newClosing.id}`
    };

    handovers.unshift(newHandover);
    setStored(STORAGE_KEYS.HANDOVERS, handovers);

    this.logAudit({
      actorId: actor.id,
      actorName: actor.displayName,
      actorRole: actor.role,
      action: 'SUBMIT_CLOSING',
      targetType: 'DailyClosing',
      targetId: newClosing.id,
      details: `Submitted daily closing for ${data.branch} branch: Counted Cash ${data.cash.actualCashCounted} ETB, Expected ${data.cash.expectedCash} ETB`
    });

    this.apiPost('/api/daily-closings', {
      branch: data.branch,
      stockItems: data.stockItems,
      cash: data.cash,
      notes: data.notes,
      actorId: actor.id
    });
    this.notifySubscribers();

    return newClosing;
  }

  // CASH HANDOVER & RECONCILIATION
  public getCashHandovers(branchFilter?: BranchId): CashHandover[] {
    const list = getStored<CashHandover[]>(STORAGE_KEYS.HANDOVERS, []);
    if (!branchFilter) return list;
    return list.filter(h => h.branch === branchFilter);
  }

  // Production staff collects Mizan cash at night
  public collectMizanCash(handoverId: string, amountCollected: number, notes: string, actor: User): CashHandover {
    if (actor.role !== 'production' && actor.role !== 'owner' && actor.role !== 'manager') {
      throw new Error('Unauthorized: Only Production Staff (or Owner/Manager) can collect Mizan night cash.');
    }

    const handovers = this.getCashHandovers();
    const target = handovers.find(h => h.id === handoverId);
    if (!target) throw new Error('Cash handover record not found.');
    if (target.branch !== 'mizan') throw new Error('This operation is specifically for Mizan branch cash collection.');

    target.amountCollected = amountCollected;
    target.status = 'collected_in_transit';
    target.collectedByStaffId = actor.id;
    target.collectedByStaffName = actor.displayName;
    target.collectedAt = new Date().toISOString();
    if (notes) target.notes += ' | ' + notes;

    setStored(STORAGE_KEYS.HANDOVERS, handovers);

    this.logAudit({
      actorId: actor.id,
      actorName: actor.displayName,
      actorRole: actor.role,
      action: 'COLLECT_CASH',
      targetType: 'CashHandover',
      targetId: target.id,
      details: `Production staff collected ${amountCollected} ETB from Mizan branch (now in transit to manager)`
    });

    this.apiPut(`/api/cash-handovers/${target.id}/collect`, {
      amountCollected,
      notes,
      actorId: actor.id
    });
    this.notifySubscribers();

    return target;
  }

  // Manager confirms cash receipt (for both Coka and Mizan)
  public confirmCashReceipt(handoverId: string, amountConfirmed: number, notes: string, actor: User): CashHandover {
    if (actor.role !== 'manager' && actor.role !== 'owner') {
      throw new Error('Unauthorized: Only Manager or Owner can confirm cash receipt.');
    }

    const handovers = this.getCashHandovers();
    const target = handovers.find(h => h.id === handoverId);
    if (!target) throw new Error('Cash handover record not found.');

    target.amountConfirmed = amountConfirmed;
    target.status = 'confirmed_by_manager';
    target.confirmedByManagerId = actor.id;
    target.confirmedByManagerName = actor.displayName;
    target.confirmedAt = new Date().toISOString();
    if (notes) target.notes += ' | ' + notes;

    setStored(STORAGE_KEYS.HANDOVERS, handovers);

    this.logAudit({
      actorId: actor.id,
      actorName: actor.displayName,
      actorRole: actor.role,
      action: 'CONFIRM_CASH',
      targetType: 'CashHandover',
      targetId: target.id,
      details: `Manager confirmed receipt of ${amountConfirmed} ETB from ${target.branch} branch`
    });

    this.apiPut(`/api/cash-handovers/${target.id}/confirm`, {
      amountConfirmed,
      notes,
      actorId: actor.id
    });
    this.notifySubscribers();

    return target;
  }

  // PURCHASES MODULE
  public getPurchases(): Purchase[] {
    return getStored<Purchase[]>(STORAGE_KEYS.PURCHASES, []);
  }

  public recordPurchase(data: {
    supplierId: string;
    items: Purchase['items'];
  }, actor: User): Purchase {
    if (actor.role !== 'manager' && actor.role !== 'owner') {
      throw new Error('Unauthorized: Only Manager or Owner can record purchases.');
    }

    const suppliers = this.getSuppliers();
    const supplier = suppliers.find(s => s.id === data.supplierId);
    const supplierName = supplier ? supplier.name : 'Unknown Supplier';

    let totalAmount = 0;
    const ingredients = this.getIngredients();

    // Increment inventory stock and compute total
    for (const item of data.items) {
      totalAmount += item.totalCost;
      const ing = ingredients.find(i => i.id === item.ingredientId);
      if (ing) {
        ing.currentStock += item.quantity;
        // Optionally update unit cost average
        ing.unitCost = item.unitCost;
      }
    }
    setStored(STORAGE_KEYS.INGREDIENTS, ingredients);

    const purchases = this.getPurchases();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const invoiceNumber = `INV-${dateStr}-${(purchases.length + 1).toString().padStart(3, '0')}`;

    const newPurchase: Purchase = {
      id: 'pur_' + Date.now(),
      invoiceNumber,
      date: new Date().toISOString().slice(0, 10),
      supplierId: data.supplierId,
      supplierName,
      items: data.items,
      totalAmount,
      paymentStatus: 'paid',
      recordedBy: actor.id,
      recorderName: actor.displayName,
      createdAt: new Date().toISOString()
    };

    purchases.unshift(newPurchase);
    setStored(STORAGE_KEYS.PURCHASES, purchases);

    this.logAudit({
      actorId: actor.id,
      actorName: actor.displayName,
      actorRole: actor.role,
      action: 'RECORD_PURCHASE',
      targetType: 'Purchase',
      targetId: newPurchase.id,
      details: `Recorded purchase ${invoiceNumber} from ${supplierName} for ${totalAmount} ETB. Inventory credited.`
    });

    this.apiPost('/api/purchases', {
      supplierId: data.supplierId,
      supplierName,
      items: data.items,
      totalAmount,
      paymentStatus: 'paid',
      actorId: actor.id
    });
    this.notifySubscribers();

    return newPurchase;
  }

  // SUPPLIERS
  public getSuppliers(): Supplier[] {
    return getStored<Supplier[]>(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
  }

  public addSupplier(supplierData: Omit<Supplier, 'id'>, actor: User): Supplier {
    if (actor.role !== 'manager' && actor.role !== 'owner') {
      throw new Error('Unauthorized: Only Manager or Owner can add suppliers.');
    }
    const suppliers = this.getSuppliers();
    const newSupplier: Supplier = {
      ...supplierData,
      id: 'sup_' + Date.now()
    };
    suppliers.push(newSupplier);
    setStored(STORAGE_KEYS.SUPPLIERS, suppliers);

    this.apiPost('/api/suppliers', {
      name: supplierData.name,
      phone: supplierData.phone,
      email: supplierData.email,
      address: supplierData.address,
      supplies: supplierData.supplies,
      actorId: actor.id
    });
    this.notifySubscribers();

    return newSupplier;
  }

  // EXPENSES MODULE
  public getExpenses(): Expense[] {
    return getStored<Expense[]>(STORAGE_KEYS.EXPENSES, []);
  }

  public recordExpense(data: {
    branch: BranchScope;
    category: Expense['category'];
    amount: number;
    paymentMethod: 'cash' | 'digital';
    description: string;
  }, actor: User): Expense {
    if (actor.role !== 'manager' && actor.role !== 'owner') {
      throw new Error('Unauthorized: Only Manager or Owner can record operating expenses.');
    }

    if (data.amount <= 0) {
      throw new Error('Expense amount must be greater than zero.');
    }

    const expenses = this.getExpenses();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const expenseNumber = `EXP-${dateStr}-${(expenses.length + 1).toString().padStart(3, '0')}`;

    const newExpense: Expense = {
      id: 'exp_' + Date.now(),
      expenseNumber,
      date: new Date().toISOString().slice(0, 10),
      branch: data.branch,
      category: data.category,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      description: data.description || '',
      recordedBy: actor.id,
      recorderName: actor.displayName,
      createdAt: new Date().toISOString()
    };

    expenses.unshift(newExpense);
    setStored(STORAGE_KEYS.EXPENSES, expenses);

    this.logAudit({
      actorId: actor.id,
      actorName: actor.displayName,
      actorRole: actor.role,
      action: 'RECORD_EXPENSE',
      targetType: 'Expense',
      targetId: newExpense.id,
      details: `Recorded ${data.category} expense ${expenseNumber} of ${data.amount} ETB for ${data.branch} branch`
    });

    this.apiPost('/api/expenses', {
      branch: data.branch,
      category: data.category,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      description: data.description,
      actorId: actor.id
    });
    this.notifySubscribers();

    return newExpense;
  }
}

export const storage = new StorageService();
