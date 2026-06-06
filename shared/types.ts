export type UserRole = 'PROCUREMENT_STAFF' | 'PROCUREMENT_MANAGER' | 'PROCUREMENT_DIRECTOR' | 'SUPPLIER' | 'ADMIN';

export type SupplierLevel = 'A' | 'B' | 'C' | 'D';

export type SupplierStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export type ProcurementStatus = 'DRAFT' | 'PUBLISHED' | 'BIDDING' | 'EVALUATING' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'AWARDED' | 'CONTRACT_SIGNED' | 'FULFILLING' | 'COMPLETED' | 'CANCELLED';

export type BiddingRoundStatus = 'PENDING' | 'ACTIVE' | 'ENDED';

export type BidStatus = 'VALID' | 'INVALID' | 'OUTBIDDED';

export type ApprovalDecision = 'APPROVED' | 'REJECTED';

export type ContractStatus = 'DRAFT' | 'PENDING_SIGNATURE' | 'SIGNED' | 'EXECUTING' | 'COMPLETED' | 'TERMINATED';

export type AuditLogLevel = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface HistoricalScores {
  price: number;
  quality: number;
  delivery: number;
  service: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  supplierId?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  address?: string;
  qualifications: string[];
  level: SupplierLevel;
  performanceScore: number;
  status: SupplierStatus;
  categories: string[];
  historicalScores: HistoricalScores;
  createdAt: string;
  updatedAt: string;
}

export interface ProcurementRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  budget: number;
  startPrice: number;
  requiredQualifications: string[];
  minSupplierLevel: SupplierLevel;
  deadline: string;
  maxRounds: number;
  minPriceDrop: number;
  status: ProcurementStatus;
  totalSavings?: number;
  createdBy: string;
  createdAt: string;
  publishedAt?: string;
  biddingEndedAt?: string;
  awardedAt?: string;
  currentRoundNumber: number;
  consecutiveNoBidRounds: number;
  invitedSuppliers: Supplier[];
}

export interface BiddingRound {
  id: string;
  procurementId: string;
  roundNumber: number;
  startTime: string;
  endTime: string;
  status: BiddingRoundStatus;
  lowestPrice?: number;
  bidCount: number;
}

export interface Bid {
  id: string;
  procurementId: string;
  roundId: string;
  supplierId: string;
  price: number;
  timestamp: string;
  status: BidStatus;
  rank?: number;
  anonymousName: string;
  priceDropPercent?: number;
}

export interface EvaluationResult {
  id: string;
  procurementId: string;
  supplierId: string;
  supplier: Supplier;
  finalPrice: number;
  priceScore: number;
  historyScore: number;
  totalScore: number;
  rank: number;
  isRecommended: boolean;
  evaluatedAt: string;
}

export interface ApprovalRecord {
  id: string;
  procurementId: string;
  approverId: string;
  approverRole: UserRole;
  requiredRole: UserRole;
  budgetOverrun: number;
  decision?: ApprovalDecision;
  comment?: string;
  decidedAt?: string;
  createdAt: string;
}

export interface Contract {
  id: string;
  procurementId: string;
  supplierId: string;
  amount: number;
  status: ContractStatus;
  content: string;
  signedByBuyer?: string;
  signedBySupplier?: string;
  signedAt?: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

export interface FulfillmentRecord {
  id: string;
  contractId: string;
  receiptNo: string;
  deliveredQuantity: number;
  acceptedQuantity: number;
  qualityScore: number;
  deliveryDate: string;
  performanceDelta: number;
  inspectionReport?: string;
  createdAt: string;
}

export interface Inventory {
  id: string;
  productName: string;
  productCode: string;
  category: string;
  quantity: number;
  unit: string;
  safetyStockLevel: number;
  lastUpdatedAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId: string;
  details?: string;
  ipAddress?: string;
  level: AuditLogLevel;
  timestamp: string;
}

export interface MonthlyReport {
  id: string;
  month: string;
  totalProjects: number;
  avgPriceDrop: number;
  awardDeviationRate: number;
  totalSavings: number;
  comparisonData: {
    currentMonth: Record<string, number>;
    lastMonth: Record<string, number>;
  };
  generatedAt: string;
}

export interface CreateProcurementRequest {
  title: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  budget: number;
  startPrice: number;
  requiredQualifications: string[];
  minSupplierLevel: SupplierLevel;
  deadline: string;
  maxRounds?: number;
  minPriceDrop?: number;
}

export interface SubmitBidRequest {
  procurementId: string;
  roundId: string;
  price: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface BiddingRealTimeData {
  procurementId: string;
  currentRound: BiddingRound;
  lowestPrice: number;
  bidCount: number;
  anonymousRanking: Array<{
    rank: number;
    anonymousName: string;
    price: number;
  }>;
  timeRemaining: number;
}

export interface ComparisonChartData {
  labels: string[];
  currentMonth: number[];
  lastMonth: number[];
}

export const BIDDING_RULES = {
  MIN_PRICE_DROP: 0.02,
  MAX_ROUNDS: 5,
  ROUND_DURATION_MINUTES: 30,
  MAX_CONSECUTIVE_NO_BID_ROUNDS: 2,
} as const;

export const SCORING_WEIGHTS = {
  PRICE: 0.7,
  HISTORY: 0.3,
} as const;

export const APPROVAL_THRESHOLDS = {
  DIRECTOR_APPROVAL_AMOUNT: 500000,
  MANAGER_OVERRUN_THRESHOLD: 0.1,
  DIRECTOR_OVERRUN_THRESHOLD: 0.3,
} as const;

export const PERFORMANCE_WEIGHTS = {
  PRICE: 0.3,
  QUALITY: 0.3,
  DELIVERY: 0.2,
  SERVICE: 0.2,
} as const;
