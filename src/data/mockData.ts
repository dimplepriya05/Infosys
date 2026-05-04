import type {
  User, Claim, Policy, AuditLog, NotificationTemplate,
  PasswordPolicy, WorkflowRule, ClaimVolumePoint
} from '@/types';

// ─── Users ────────────────────────────────────────────────────────────────────

export const MOCK_USERS: User[] = [
  {
    id: 1, name: 'Alice Admin', email: 'admin@insure.com',
    role: 'Admin', avatar: 'AA', avatarBg: '#7c3aed',
    phone: '+1 (555) 100-0001', department: 'Operations',
    isActive: true, createdAt: '2022-01-10', lastLogin: '2024-01-23',
  },
  {
    id: 2, name: 'James Adjuster', email: 'adjuster@insure.com',
    role: 'Claims Adjuster', avatar: 'JA', avatarBg: '#0d9488',
    phone: '+1 (555) 100-0002', department: 'Claims',
    isActive: true, createdAt: '2022-03-15', lastLogin: '2024-01-23',
  },
  {
    id: 3, name: 'Uma Underwriter', email: 'uw@insure.com',
    role: 'Underwriter', avatar: 'UU', avatarBg: '#f59e0b',
    phone: '+1 (555) 100-0003', department: 'Underwriting',
    isActive: true, createdAt: '2022-05-20', lastLogin: '2024-01-22',
  },
  {
    id: 4, name: 'Paul Holder', email: 'ph@insure.com',
    role: 'Policyholder', avatar: 'PH', avatarBg: '#2563eb',
    phone: '+1 (555) 234-5678', department: undefined,
    isActive: true, createdAt: '2023-01-05', lastLogin: '2024-01-21',
  },
  {
    id: 5, name: 'Pat Partner', email: 'partner@insure.com',
    role: 'Partner/TPA', avatar: 'PP', avatarBg: '#ef4444',
    phone: '+1 (555) 100-0005', department: 'TPA Relations',
    isActive: true, createdAt: '2023-06-01', lastLogin: '2024-01-20',
  },
];

// Demo password map (in real app: never store plaintext)
export const DEMO_PASSWORDS: Record<string, string> = {
  'admin@insure.com': 'admin123',
  'adjuster@insure.com': 'adj123',
  'uw@insure.com': 'uw123',
  'ph@insure.com': 'ph123',
  'partner@insure.com': 'pt123',
};

// ─── Policies ─────────────────────────────────────────────────────────────────

export const MOCK_POLICIES: Policy[] = [
  {
    id: 'AUTO-9921', type: 'Auto Insurance', status: 'Active',
    holderId: 4, holder: 'Paul Holder',
    premium: 1200, coverage: 50000,
    startDate: '2024-01-15', renewalDate: '2025-01-15',
    vehicle: 'Toyota Camry 2020', riskScore: 72,
  },
  {
    id: 'HLTH-4421', type: 'Health Insurance', status: 'Active',
    holderId: 4, holder: 'Paul Holder',
    premium: 2400, coverage: 500000,
    startDate: '2024-01-01', renewalDate: '2024-12-31',
    members: 3, riskScore: 58,
  },
  {
    id: 'PROP-1123', type: 'Property Insurance', status: 'Active',
    holderId: 4, holder: 'Paul Holder',
    premium: 1800, coverage: 350000,
    startDate: '2024-03-01', renewalDate: '2025-03-01',
    address: '123 Main St, Anytown CA', riskScore: 45,
  },
  {
    id: 'AUTO-5512', type: 'Auto Insurance', status: 'Active',
    holderId: 5, holder: 'Dave Brown',
    premium: 980, coverage: 35000,
    startDate: '2023-07-01', renewalDate: '2024-07-01',
    vehicle: 'Honda Civic 2019', riskScore: 65,
  },
  {
    id: 'HLTH-3311', type: 'Health Insurance', status: 'Expired',
    holderId: 5, holder: 'Lucy Liu',
    premium: 1800, coverage: 250000,
    startDate: '2023-01-01', renewalDate: '2023-12-31',
    members: 1, riskScore: 80,
  },
];

// ─── Claims ───────────────────────────────────────────────────────────────────

export const MOCK_CLAIMS: Claim[] = [
  {
    id: 'CLM-2024-001', type: 'Auto', status: 'Assessment', priority: 'High',
    policyholderId: 4, policyholder: 'Paul Holder',
    assigneeId: 2, assignee: 'James Adjuster',
    policyId: 'AUTO-9921', amount: 15000,
    reserveAmount: 18000, deductible: 1500, depreciationPercent: 12, netPayableAmount: 14640,
    description: 'Rear-end collision on I-95. Significant bumper and trunk damage.',
    incidentDate: '2024-01-14', incidentType: 'Accident', incidentLocation: 'I-95, Miami FL',
    filedDate: '2024-01-15', updatedAt: '2024-01-20',
    notes: [
      { id: 'n1', authorId: 2, author: 'James Adjuster', content: 'Requesting photos of the damage from policyholder.', createdAt: '2024-01-16T10:30:00Z' },
      { id: 'n2', authorId: 4, author: 'Paul Holder', content: 'Photos uploaded in documents section.', createdAt: '2024-01-17T14:00:00Z' },
    ],
    documents: [
      { id: 'd1', name: 'Police_Report.pdf', size: 512000, mimeType: 'application/pdf', status: 'Verified', version: 1, uploadedBy: 'Paul Holder', uploadedAt: '2024-01-15' },
      { id: 'd2', name: 'Damage_Photos.zip', size: 8800000, mimeType: 'application/zip', status: 'Verified', version: 1, uploadedBy: 'Paul Holder', uploadedAt: '2024-01-17' },
      { id: 'd3', name: 'Repair_Estimate.pdf', size: 256000, mimeType: 'application/pdf', status: 'Pending', version: 2, uploadedBy: 'James Adjuster', uploadedAt: '2024-01-19' },
    ],
    timeline: [
      { id: 't1', action: 'Claim filed by policyholder', actor: 'Paul Holder', timestamp: '2024-01-15T09:00:00Z', color: '#2563eb' },
      { id: 't2', action: 'Claim assigned to adjuster', actor: 'System', timestamp: '2024-01-15T09:05:00Z', color: '#8b5cf6' },
      { id: 't3', action: 'Documents requested', actor: 'James Adjuster', timestamp: '2024-01-16T10:30:00Z', color: '#f59e0b' },
      { id: 't4', action: 'Documents received and verified', actor: 'System', timestamp: '2024-01-17T14:00:00Z', color: '#22c55e' },
      { id: 't5', action: 'Status changed to Assessment', actor: 'James Adjuster', timestamp: '2024-01-20T11:00:00Z', color: '#0d9488' },
    ],
  },
  {
    id: 'CLM-2024-002', type: 'Health', status: 'Submitted', priority: 'Medium',
    policyholderId: 4, policyholder: 'Sarah Connor',
    assigneeId: 2, assignee: 'James Adjuster',
    policyId: 'HLTH-4421', amount: 8500,
    description: 'Emergency appendectomy surgery and 3-day hospitalization.',
    incidentDate: '2024-01-17', incidentType: 'Medical Emergency',
    filedDate: '2024-01-18', updatedAt: '2024-01-18',
    notes: [], documents: [],
    timeline: [
      { id: 't1', action: 'Claim submitted via portal', actor: 'Sarah Connor', timestamp: '2024-01-18T08:00:00Z', color: '#2563eb' },
    ],
  },
  {
    id: 'CLM-2024-003', type: 'Property', status: 'Settlement', priority: 'High',
    policyholderId: 5, policyholder: 'Mike Johnson',
    assigneeId: 2, assignee: 'James Adjuster',
    policyId: 'PROP-1123', amount: 45000,
    reserveAmount: 48000, deductible: 2500, depreciationPercent: 8, netPayableAmount: 41000,
    approvedAmount: 41000,
    description: 'Kitchen fire caused by electrical fault. Extensive structural damage.',
    incidentDate: '2024-01-09', incidentType: 'Fire',
    filedDate: '2024-01-10', updatedAt: '2024-01-22',
    decisionType: 'APPROVED', decisionReason: 'Fire investigation confirms accidental electrical fault. Full coverage applies after deductible.',
    notes: [], documents: [],
    timeline: [
      { id: 't1', action: 'Claim filed', actor: 'Mike Johnson', timestamp: '2024-01-10T10:00:00Z', color: '#2563eb' },
      { id: 't2', action: 'Fire investigator dispatched', actor: 'James Adjuster', timestamp: '2024-01-11T09:00:00Z', color: '#f59e0b' },
      { id: 't3', action: 'Investigation report received', actor: 'System', timestamp: '2024-01-15T16:00:00Z', color: '#22c55e' },
      { id: 't4', action: 'Claim approved — full coverage', actor: 'James Adjuster', timestamp: '2024-01-18T14:30:00Z', color: '#0d9488' },
      { id: 't5', action: 'Moved to Settlement stage', actor: 'System', timestamp: '2024-01-22T09:00:00Z', color: '#8b5cf6' },
    ],
    payments: [{ id: 'pay-1', claimId: 'CLM-2024-003', amount: 41000, method: 'Bank Transfer', accountDetails: '****4821', status: 'Processing', initiatedAt: '2024-01-22' }],
  },
  {
    id: 'CLM-2024-004', type: 'Life', status: 'Closed', priority: 'Low',
    policyholderId: 5, policyholder: 'Emma Wilson',
    assigneeId: 2, assignee: 'James Adjuster',
    policyId: 'LIFE-7832', amount: 100000,
    approvedAmount: 100000,
    description: 'Life insurance claim following policyholder passing. Beneficiary: Robert Wilson.',
    filedDate: '2023-12-01', updatedAt: '2024-01-05',
    decisionType: 'APPROVED', decisionReason: 'All documentation verified. Death certificate confirmed. Full policy amount approved.',
    notes: [], documents: [],
    timeline: [
      { id: 't1', action: 'Claim filed by beneficiary', actor: 'Robert Wilson', timestamp: '2023-12-01T10:00:00Z', color: '#2563eb' },
      { id: 't2', action: 'Documentation review complete', actor: 'James Adjuster', timestamp: '2023-12-15T14:00:00Z', color: '#22c55e' },
      { id: 't3', action: 'Claim approved — full benefit', actor: 'James Adjuster', timestamp: '2023-12-20T11:00:00Z', color: '#0d9488' },
      { id: 't4', action: 'Payment completed', actor: 'System', timestamp: '2023-12-28T09:00:00Z', color: '#22c55e' },
      { id: 't5', action: 'Claim closed', actor: 'System', timestamp: '2024-01-05T08:00:00Z', color: '#94a3b8' },
    ],
    payments: [{ id: 'pay-2', claimId: 'CLM-2024-004', amount: 100000, method: 'Bank Transfer', accountDetails: '****9312', status: 'Completed', initiatedAt: '2023-12-28', completedAt: '2023-12-30', referenceNumber: 'TXN-2023-98321' }],
  },
  {
    id: 'CLM-2024-005', type: 'Auto', status: 'Triage', priority: 'Medium',
    policyholderId: 5, policyholder: 'Dave Brown',
    assigneeId: undefined, assignee: 'Unassigned',
    policyId: 'AUTO-5512', amount: 3200,
    description: 'Windshield crack and minor hood dent from road debris on highway.',
    incidentDate: '2024-01-20', incidentType: 'Accident',
    filedDate: '2024-01-21', updatedAt: '2024-01-21',
    notes: [], documents: [],
    timeline: [
      { id: 't1', action: 'Claim submitted', actor: 'Dave Brown', timestamp: '2024-01-21T11:00:00Z', color: '#2563eb' },
    ],
  },
  {
    id: 'CLM-2024-006', type: 'Health', status: 'Decision', priority: 'High',
    policyholderId: 5, policyholder: 'Lucy Liu',
    assigneeId: 2, assignee: 'James Adjuster',
    policyId: 'HLTH-3311', amount: 22000,
    reserveAmount: 25000, deductible: 1000, depreciationPercent: 0, netPayableAmount: 21000,
    description: 'Chemotherapy treatment cycle — 6 sessions. Policy expired during treatment.',
    incidentDate: '2024-01-11', incidentType: 'Medical Treatment',
    filedDate: '2024-01-12', updatedAt: '2024-01-23',
    notes: [], documents: [],
    timeline: [
      { id: 't1', action: 'Claim submitted', actor: 'Lucy Liu', timestamp: '2024-01-12T09:00:00Z', color: '#2563eb' },
      { id: 't2', action: 'Policy expiry flagged', actor: 'System', timestamp: '2024-01-12T09:01:00Z', color: '#ef4444' },
      { id: 't3', action: 'Escalated for senior review', actor: 'James Adjuster', timestamp: '2024-01-18T15:00:00Z', color: '#f59e0b' },
    ],
  },
];

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export const MOCK_AUDIT_LOGS: AuditLog[] = [
  { id: 1, userId: 1, user: 'Alice Admin', action: 'User role updated → Claims Adjuster', target: 'James Adjuster', targetType: 'user', ipAddress: '192.168.1.10', timestamp: '2024-01-23 14:32' },
  { id: 2, userId: 2, user: 'James Adjuster', action: 'Claim status changed → Assessment', target: 'CLM-2024-001', targetType: 'claim', ipAddress: '192.168.1.22', timestamp: '2024-01-23 13:15' },
  { id: 3, userId: 4, user: 'Paul Holder', action: 'Document uploaded', target: 'CLM-2024-001', targetType: 'claim', ipAddress: '10.0.0.5', timestamp: '2024-01-23 11:04' },
  { id: 4, userId: 1, user: 'Alice Admin', action: 'Password policy modified', target: 'System Settings', targetType: 'system', ipAddress: '192.168.1.10', timestamp: '2024-01-22 16:45' },
  { id: 5, userId: 3, user: 'Uma Underwriter', action: 'Policy approved', target: 'PROP-9981', targetType: 'policy', ipAddress: '192.168.1.31', timestamp: '2024-01-22 15:30' },
  { id: 6, userId: 2, user: 'James Adjuster', action: 'Decision recorded → Approved', target: 'CLM-2024-003', targetType: 'claim', ipAddress: '192.168.1.22', timestamp: '2024-01-22 14:30' },
  { id: 7, userId: 1, user: 'Alice Admin', action: 'New user created', target: 'Pat Partner', targetType: 'user', ipAddress: '192.168.1.10', timestamp: '2024-01-21 10:00' },
  { id: 8, userId: 4, user: 'Paul Holder', action: 'New claim filed', target: 'CLM-2024-001', targetType: 'claim', ipAddress: '10.0.0.5', timestamp: '2024-01-15 09:00' },
];

// ─── Reports Data ─────────────────────────────────────────────────────────────

export const CLAIM_VOLUME_DATA: ClaimVolumePoint[] = [
  { month: 'Jan', count: 42, approved: 31, denied: 8 },
  { month: 'Feb', count: 68, approved: 52, denied: 11 },
  { month: 'Mar', count: 55, approved: 40, denied: 9 },
  { month: 'Apr', count: 90, approved: 71, denied: 14 },
  { month: 'May', count: 74, approved: 58, denied: 12 },
  { month: 'Jun', count: 88, approved: 67, denied: 15 },
  { month: 'Jul', count: 61, approved: 49, denied: 8 },
  { month: 'Aug', count: 95, approved: 78, denied: 13 },
  { month: 'Sep', count: 80, approved: 63, denied: 11 },
  { month: 'Oct', count: 72, approved: 55, denied: 12 },
  { month: 'Nov', count: 85, approved: 68, denied: 14 },
  { month: 'Dec', count: 78, approved: 61, denied: 13 },
];

// ─── System Settings ──────────────────────────────────────────────────────────

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 10, expiryDays: 90, maxFailedAttempts: 5,
  requireUppercase: true, requireNumbers: true, requireSpecial: true, enable2FA: false,
};

export const DEFAULT_WORKFLOW_RULE: WorkflowRule = {
  autoAssignThreshold: 25, highValueThreshold: 10000, tatSlaDays: 14, escalationDays: 3,
};

export const DEFAULT_NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  { id: 'nt1', trigger: 'Claim Submitted', subject: 'Your claim has been received — {id}', body: 'Dear {name},\n\nYour claim {id} has been received and is under review. Our team will contact you within 2 business days.\n\nTeam InsureClaim' },
  { id: 'nt2', trigger: 'Status Update', subject: 'Claim {id} status updated', body: 'Dear {name},\n\nYour claim {id} has been updated to {status}. Log in to your portal to view the latest details.\n\nTeam InsureClaim' },
  { id: 'nt3', trigger: 'Decision Notice', subject: 'Decision on your claim {id}', body: 'Dear {name},\n\nA decision has been made on your claim {id}. Please log in to your account to review the outcome and next steps.\n\nTeam InsureClaim' },
  { id: 'nt4', trigger: 'Payment Initiated', subject: 'Payment initiated for claim {id}', body: 'Dear {name},\n\nA payment of {amount} has been initiated for claim {id} via {method}. Please allow 3-5 business days for processing.\n\nTeam InsureClaim' },
];
