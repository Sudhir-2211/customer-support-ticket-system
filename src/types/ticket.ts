export type TicketStatus = 'open' | 'in_progress' | 'waiting_on_customer' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketCategory = 'technical' | 'billing' | 'account' | 'feature_request' | 'general';
export type UserRole = 'customer' | 'agent' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  authorId: string;
  author?: UserProfile;
  content: string;
  isInternal: boolean;
  createdAt: string;
}

export interface TicketAuditLog {
  id: string;
  ticketId: string;
  changedBy: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  customerId: string;
  customer?: UserProfile;
  assignedAgentId?: string | null;
  assignedAgent?: UserProfile | null;
  slaDueAt: string;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  comments?: TicketComment[];
}

export interface CreateTicketInput {
  title: string;
  description: string;
  priority: TicketPriority;
  category: TicketCategory;
  customerId: string;
}

export interface UpdateTicketInput {
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedAgentId?: string | null;
}

export interface TicketFilter {
  status?: TicketStatus | 'all';
  priority?: TicketPriority | 'all';
  category?: TicketCategory | 'all';
  searchQuery?: string;
  assignedToMe?: boolean;
}

export interface SLACalculation {
  dueAt: Date;
  isBreached: boolean;
  remainingMinutes: number;
  formattedRemaining: string;
}

/** Standard SLA Resolution Targets by Priority (in hours) */
export const SLA_TARGET_HOURS: Record<TicketPriority, number> = {
  urgent: 2,
  high: 8,
  medium: 24,
  low: 48,
};
