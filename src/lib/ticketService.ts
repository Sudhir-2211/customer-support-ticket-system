import type {
  Ticket,
  CreateTicketInput,
  UpdateTicketInput,
  TicketFilter,
  TicketComment,
  TicketPriority,
  TicketStatus,
  SLACalculation,
  UserProfile,
} from '../types/ticket.ts';
import { SLA_TARGET_HOURS } from '../types/ticket.ts';
import { SYNTHETIC_TICKETS, SYNTHETIC_USERS } from './sampleData.ts';

let ticketsStore: Ticket[] = [...SYNTHETIC_TICKETS];
let usersStore: UserProfile[] = [...SYNTHETIC_USERS];
let ticketSequence = 1004;

export class TicketService {
  /**
   * Resets in-memory store to initial sample data (useful for test isolation)
   */
  static resetStore() {
    ticketsStore = JSON.parse(JSON.stringify(SYNTHETIC_TICKETS));
    usersStore = JSON.parse(JSON.stringify(SYNTHETIC_USERS));
    ticketSequence = 1004;
  }

  /**
   * Computes SLA due date and breach status based on priority targets
   */
  static calculateSLA(
    priority: TicketPriority,
    createdAt: Date,
    status: TicketStatus,
    resolvedAt?: Date | null
  ): SLACalculation {
    const hours = SLA_TARGET_HOURS[priority] || 24;
    const dueAt = new Date(createdAt.getTime() + hours * 60 * 60 * 1000);
    const comparisonTime = resolvedAt ? resolvedAt.getTime() : Date.now();
    const remainingMs = dueAt.getTime() - comparisonTime;
    const isBreached = remainingMs < 0;
    const remainingMinutes = Math.round(remainingMs / (60 * 1000));

    let formattedRemaining: string;
    if (status === 'resolved' || status === 'closed') {
      formattedRemaining = isBreached ? 'Breached before resolution' : 'Met SLA';
    } else if (isBreached) {
      const overHours = Math.abs(Math.round(remainingMinutes / 60));
      formattedRemaining = `${overHours}h overdue`;
    } else {
      const remHours = Math.floor(remainingMinutes / 60);
      const remMins = Math.abs(remainingMinutes % 60);
      formattedRemaining = `${remHours}h ${remMins}m remaining`;
    }

    return {
      dueAt,
      isBreached,
      remainingMinutes,
      formattedRemaining,
    };
  }

  /**
   * List tickets with optional status, priority, category, or search filters
   */
  static getTickets(filter: TicketFilter = {}): Ticket[] {
    return ticketsStore.filter((ticket) => {
      if (filter.status && filter.status !== 'all' && ticket.status !== filter.status) {
        return false;
      }
      if (filter.priority && filter.priority !== 'all' && ticket.priority !== filter.priority) {
        return false;
      }
      if (filter.category && filter.category !== 'all' && ticket.category !== filter.category) {
        return false;
      }
      if (filter.searchQuery && filter.searchQuery.trim()) {
        const query = filter.searchQuery.toLowerCase();
        const matchesTitle = ticket.title.toLowerCase().includes(query);
        const matchesDesc = ticket.description.toLowerCase().includes(query);
        const matchesNum = ticket.ticketNumber.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesNum) return false;
      }
      return true;
    });
  }

  /**
   * Fetch a single ticket by its ID
   */
  static getTicketById(id: string): Ticket | null {
    const ticket = ticketsStore.find((t) => t.id === id);
    return ticket ? { ...ticket } : null;
  }

  /**
   * Create a new support ticket
   */
  static createTicket(input: CreateTicketInput): Ticket {
    if (!input.title || input.title.trim().length < 5) {
      throw new Error('Ticket title must be at least 5 characters long');
    }
    if (!input.description || input.description.trim().length < 10) {
      throw new Error('Ticket description must be at least 10 characters long');
    }

    const now = new Date();
    const targetHours = SLA_TARGET_HOURS[input.priority] || 24;
    const slaDueAt = new Date(now.getTime() + targetHours * 60 * 60 * 1000).toISOString();

    const customer = usersStore.find((u) => u.id === input.customerId);
    const newTicket: Ticket = {
      id: `tkt-${Date.now()}`,
      ticketNumber: `TICK-${ticketSequence++}`,
      title: input.title.trim(),
      description: input.description.trim(),
      status: 'open',
      priority: input.priority,
      category: input.category,
      customerId: input.customerId,
      customer,
      assignedAgentId: null,
      assignedAgent: null,
      slaDueAt,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      comments: [],
    };

    ticketsStore.unshift(newTicket);
    return newTicket;
  }

  /**
   * Update ticket status, priority, or assigned agent
   */
  static updateTicket(id: string, update: UpdateTicketInput, changedBy: string): Ticket {
    const index = ticketsStore.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new Error(`Ticket with ID ${id} not found`);
    }

    const current = ticketsStore[index];
    const now = new Date();

    if (update.status && update.status !== current.status) {
      // Valid transition check
      if (current.status === 'closed' && update.status !== 'open') {
        throw new Error('Closed tickets must be reopened first');
      }
      current.status = update.status;
      if (update.status === 'resolved' || update.status === 'closed') {
        current.resolvedAt = now.toISOString();
      } else {
        current.resolvedAt = null;
      }
    }

    if (update.priority && update.priority !== current.priority) {
      current.priority = update.priority;
      // Recalculate SLA due time if ticket is still open
      if (current.status !== 'resolved' && current.status !== 'closed') {
        const hours = SLA_TARGET_HOURS[update.priority] || 24;
        current.slaDueAt = new Date(new Date(current.createdAt).getTime() + hours * 60 * 60 * 1000).toISOString();
      }
    }

    if (update.assignedAgentId !== undefined) {
      current.assignedAgentId = update.assignedAgentId;
      current.assignedAgent = update.assignedAgentId
        ? usersStore.find((u) => u.id === update.assignedAgentId) || null
        : null;
    }

    current.updatedAt = now.toISOString();
    ticketsStore[index] = { ...current };
    return ticketsStore[index];
  }

  /**
   * Add a response or internal note to a ticket thread
   */
  static addComment(
    ticketId: string,
    authorId: string,
    content: string,
    isInternal: boolean = false
  ): TicketComment {
    if (!content || !content.trim()) {
      throw new Error('Comment content cannot be empty');
    }

    const ticket = ticketsStore.find((t) => t.id === ticketId);
    if (!ticket) {
      throw new Error(`Ticket with ID ${ticketId} not found`);
    }

    const author = usersStore.find((u) => u.id === authorId);
    const comment: TicketComment = {
      id: `cmt-${Date.now()}`,
      ticketId,
      authorId,
      author,
      content: content.trim(),
      isInternal,
      createdAt: new Date().toISOString(),
    };

    if (!ticket.comments) {
      ticket.comments = [];
    }
    ticket.comments.push(comment);
    ticket.updatedAt = new Date().toISOString();

    return comment;
  }

  /**
   * Summary metrics for dashboard
   */
  static getMetrics() {
    const total = ticketsStore.length;
    const open = ticketsStore.filter((t) => t.status === 'open').length;
    const inProgress = ticketsStore.filter((t) => t.status === 'in_progress').length;
    const resolved = ticketsStore.filter((t) => t.status === 'resolved' || t.status === 'closed').length;

    let breached = 0;
    for (const t of ticketsStore) {
      const sla = this.calculateSLA(t.priority, new Date(t.createdAt), t.status, t.resolvedAt ? new Date(t.resolvedAt) : null);
      if (sla.isBreached && t.status !== 'resolved' && t.status !== 'closed') {
        breached++;
      }
    }

    return {
      total,
      open,
      inProgress,
      resolved,
      breached,
    };
  }
}
