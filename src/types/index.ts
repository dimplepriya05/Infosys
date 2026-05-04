// ─── Core Domain Types ────────────────────────────────────────────────────────

export type UserRole =
  | 'Admin'
  | 'Claims Adjuster'
  | 'Underwriter'
  | 'Policyholder'
  | 'Partner/TPA'
  | 'Finance';

export type ClaimStatus =
  | 'Draft'
  | 'Submitted'
  | 'Triage'
  | 'Assessment'
  | 'Decision'
  | 'Settlement'
  | 'Closed'
  | 'Rejected'
  | 'Withdrawn'
  | 'Review'
  | 'APPEAL_REVIEW';

export type ClaimType =
  | 'Auto'
  | 'Health'
  | 'Property'
  | 'Life'
  | 'Liability'
  | 'Travel';

export type Priority = 'High' | 'Medium' | 'Low';

export type PolicyStatus = 'Active' | 'Expired' | 'Suspended' | 'Cancelled';

export type PaymentMethod = 'Bank Transfer' | 'UPI' | 'Cheque';

export type PaymentStatus = 'PENDING' | 'INITIATED' | 'CONFIRMED' | 'FAILED' | 'RETRY' | 'Pending' | 'Processing' | 'Completed' | 'Failed';

export type DecisionType = 'APPROVED' | 'PARTIALLY_APPROVED' | 'DENIED' | 'PENDING_INFO';

export type DocumentStatus = 'Pending' | 'Verified' | 'Rejected';

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  avatarBg?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  department?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  emailNotificationsEnabled?: boolean;
  smsNotificationsEnabled?: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  sessionWarning: boolean;
}

// ─── Claim ────────────────────────────────────────────────────────────────────

export interface Claim {
  id: string;
  referenceNumber?: string;
  type: ClaimType;
  status: ClaimStatus;
  priority: Priority;
  policyholderId: number;
  policyholder: string;
  policyholderEmail?: string;
  policyholderPhone?: string;
  assigneeId?: number;
  assignee: string;
  policyId: string;
  amount: number;
  reserveAmount?: number;
  deductible?: number;
  deductibleApplied?: number;
  depreciationPercent?: number;
  taxPercent?: number;
  netPayableAmount?: number;
  approvedAmount?: number;
  isDraft?: boolean;
  description?: string;
  incidentDate?: string;
  incidentType?: string;
  incidentLocation?: string;
  filedDate: string;
  updatedAt: string;
  decisionType?: DecisionType;
  decisionReason?: string;
  notes: ClaimNote[];
  documents: ClaimDocument[];
  timeline: TimelineEvent[];
  payments?: Payment[];
  paidAmount?: number;
  isOverdue?: boolean;
  daysOverdue?: number;
  decision?: any;
  appealed?: boolean;
  
  // Validation & Risk
  validationStatus?: string;
  validationNotes?: string;
  duplicateFlag?: boolean;
  exceedsLimitFlag?: boolean;
  frequentClaimFlag?: boolean;
}

// ─── Appeal ───────────────────────────────────────────────────────────────────

export type AppealStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'DENIED' | 'WITHDRAWN';

export interface Appeal {
  id: number;
  claimId: number;
  reason: string;
  justification: string;
  status: AppealStatus;
  submittedByName: string;
  createdAt: string;
  reviewedByName?: string;
  reviewNotes?: string;
  reviewedAt?: string;
  originalDecisionId?: number;
  originalDecisionType?: DecisionType;
  originalApprovedAmount?: number;
  outcomeDecisionType?: DecisionType;
  newApprovedAmount?: number;
}

export interface ClaimNote {
  id: string;
  authorId: number;
  author: string;
  content: string;
  createdAt: string;
  internalOnly?: boolean;
}

export interface TimelineEvent {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  color: string;
  metadata?: Record<string, string>;
  reason?: string;
  internalOnly?: boolean;
  transitionedByName?: string;
  transitionedAt?: string;
  fromStatus?: string;
  toStatus?: string;
}

// ─── Policy ───────────────────────────────────────────────────────────────────

export interface Policy {
  id: string;
  type: string;
  status: PolicyStatus;
  holderId: number;
  holder: string;
  premium: number;
  coverage: number;
  startDate: string;
  renewalDate: string;
  vehicle?: string;
  address?: string;
  members?: number;
  riskScore?: number;
}

// ─── Document ─────────────────────────────────────────────────────────────────

export interface ClaimDocument {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  url?: string;
  status: DocumentStatus;
  version: number;
  uploadedBy: string;
  uploadedAt: string;
  claimId?: string;
  internalOnly?: boolean;
}

// ─── Financial ────────────────────────────────────────────────────────────────

export interface FinancialSummary {
  claimAmount: number;
  reserveAmount: number;
  deductible: number;
  depreciationPct: number;
  netPayable: number;
  requiresApproval: boolean;
}

// ─── Payment ──────────────────────────────────────────────────────────────────

export interface Payment {
  id: string;
  claimId?: string;
  amount: number;
  method: PaymentMethod;
  paymentMethod?: PaymentMethod;
  accountDetails?: string;
  bankName?: string;
  beneficiaryName?: string;
  remarks?: string;
  confirmedBy?: string;
  status: PaymentStatus;
  initiatedAt?: string;
  confirmedAt?: string;
  completedAt?: string;
  failureReason?: string;
  transactionReference?: string;
  referenceNumber?: string;
  receiptPath?: string;
  claimId?: number;
  claimReferenceNumber?: string;
  claimApprovedAmount?: number;
  claimPaidAmount?: number;
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: number;
  userId: number;
  user: string;
  action: string;
  target: string;
  targetType: 'claim' | 'policy' | 'user' | 'system';
  ipAddress: string;
  userAgent?: string;
  timestamp: string;
  metadata?: Record<string, string>;
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export interface ReportFilter {
  dateFrom?: string;
  dateTo?: string;
  product?: string;
  region?: string;
  status?: ClaimStatus;
}

export interface ClaimVolumePoint {
  month: string;
  count: number;
  approved: number;
  denied: number;
}

export interface OutcomeBreakdown {
  label: string;
  value: number;
  color: string;
}

// ─── System Settings ──────────────────────────────────────────────────────────

export interface PasswordPolicy {
  minLength: number;
  expiryDays: number;
  maxFailedAttempts: number;
  requireUppercase: boolean;
  requireNumbers: boolean;
  requireSpecial: boolean;
  enable2FA: boolean;
}

export interface WorkflowRule {
  autoAssignThreshold: number;
  highValueThreshold: number;
  tatSlaDays: number;
  escalationDays: number;
}

export interface NotificationTemplate {
  id: string;
  trigger: string;
  subject: string;
  body: string;
}

export interface ClaimRFI {
  id: number;
  requestedInfo: string;
  dueDate: string;
  status: 'PENDING' | 'FULFILLED' | 'OVERDUE';
  requestedByName?: string;
  createdAt: string;
  fulfilledByDocumentId?: number;
}

// ─── Form Types ───────────────────────────────────────────────────────────────

export interface LoginForm {
  email: string;
  password: string;
}

export interface ClaimWizardForm {
  // Step 1 – Incident
  incidentDate: string;
  incidentType: string;
  description: string;
  houseNo: string;
  street: string;
  city: string;
  state: string;
  pinCode: string;
  // Step 2 – Policy
  policyId: string;
  // Step 3 – Claim Type
  claimType: ClaimType | '';
  // Step 4 – Damages
  damages: string;
  estimatedAmount?: string;
  currency?: string;
  files?: UploadedFile[];
  declarationAccepted?: boolean;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  previewUrl?: string;
  file?: File;
  category?: string;
}

export interface ProfileForm {
  name: string;
  email: string;
  phone: string;
  address: string;
  dateOfBirth: string;
  oldPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export interface DecisionForm {
  type: DecisionType | '';
  approvedAmount?: string;
  reason: string;
  policyClauseReference?: string;
  deductibleAmount?: string;
  depreciationAmount?: string;
  freeTextNote?: string;
  requiresSupervisorReview: boolean;
  checklistVerified: boolean;
}

export interface PaymentForm {
  method: PaymentMethod;
  accountDetails: string;
  amount: string;
}

export interface ReserveForm {
  reserveAmount: string;
  deductibleApplied: string;
  depreciationPercent: string;
  taxPercent: string;
  reason?: string;
}

export interface AssessmentForm {
  causeOfLoss: string;
  damagesSummary: string;
  siteVisitScheduled: boolean;
  siteVisitDate: string;
  siteVisitOutcome: string;
  externalVerificationRequired: boolean;
  timeSpentMinutes: number;
  peerReviewRequested: boolean;
  initialReserveAmount?: string;
}

export interface Assessment {
  id?: number;
  causeOfLoss?: string;
  damagesSummary?: string;
  fraudFlags?: string;
  siteVisitScheduled?: boolean;
  siteVisitDate?: string;
  siteVisitOutcome?: string;
  externalVerificationRequired?: boolean;
  externalVerificationStatus?: string;
  timeSpentMinutes?: number;
  peerReviewRequested?: boolean;
}

export interface ReserveMovement {
  id: number;
  oldReserveAmount: number;
  newReserveAmount: number;
  adjustmentAmount: number;
  reason: string;
  adjustedByName: string;
  createdAt: string;
  approved: boolean;
}

export interface NewUserForm {
  name: string;
  email: string;
  role: UserRole;
  department?: string;
}

// ─── API Types ────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  field?: string;
}

// ─── UI Types ─────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: number;
}

export interface NavSection {
  section: string;
  items: NavItem[];
}

export type BadgeVariant =
  | 'blue' | 'green' | 'red' | 'yellow'
  | 'purple' | 'gray' | 'orange' | 'teal';

export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

export interface FilterState {
  status: string;
  priority: string;
  search: string;
  assignee: string;
  page: number;
}
