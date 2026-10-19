import test, { beforeEach } from 'node:test';
import assert from 'node:assert';
import { TicketService } from '../src/lib/ticketService.ts';

beforeEach(() => {
  TicketService.resetStore();
});

test('TicketService.getTickets returns synthetic fixtures', () => {
  const tickets = TicketService.getTickets();
  assert.strictEqual(tickets.length >= 3, true);
  assert.strictEqual(tickets[0].ticketNumber, 'TICK-1001');
});

test('TicketService.getTickets filters by status and priority', () => {
  const openTickets = TicketService.getTickets({ status: 'open' });
  for (const t of openTickets) {
    assert.strictEqual(t.status, 'open');
  }

  const urgentTickets = TicketService.getTickets({ priority: 'urgent' });
  for (const t of urgentTickets) {
    assert.strictEqual(t.priority, 'urgent');
  }
});

test('TicketService.getTickets searches by keywords in title and description', () => {
  const results = TicketService.getTickets({ searchQuery: 'webhook' });
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].ticketNumber, 'TICK-1001');
});

test('TicketService.createTicket generates unique ticket and computes SLA', () => {
  const newTicket = TicketService.createTicket({
    title: 'Cannot reset two-factor auth password',
    description: 'User locked out of production dashboard after losing phone authenticator token.',
    priority: 'urgent',
    category: 'account',
    customerId: 'usr-cust-01',
  });

  assert.ok(newTicket.id);
  assert.strictEqual(newTicket.ticketNumber.startsWith('TICK-'), true);
  assert.strictEqual(newTicket.status, 'open');
  assert.strictEqual(newTicket.priority, 'urgent');
  assert.ok(newTicket.slaDueAt);

  // Urgent target is 2 hours
  const due = new Date(newTicket.slaDueAt).getTime();
  const created = new Date(newTicket.createdAt).getTime();
  const diffHours = (due - created) / (1000 * 60 * 60);
  assert.strictEqual(Math.round(diffHours), 2);
});

test('TicketService.createTicket validates minimum length', () => {
  assert.throws(
    () => {
      TicketService.createTicket({
        title: 'Hi',
        description: 'Too short',
        priority: 'low',
        category: 'general',
        customerId: 'usr-cust-01',
      });
    },
    { message: /Ticket title must be at least 5 characters/ }
  );
});

test('TicketService.updateTicket updates status and sets resolvedAt', () => {
  const updated = TicketService.updateTicket(
    'tkt-001',
    { status: 'resolved' },
    'usr-agent-01'
  );
  assert.strictEqual(updated.status, 'resolved');
  assert.ok(updated.resolvedAt);

  // Cannot reopen invalid closed without reopening
  TicketService.updateTicket('tkt-001', { status: 'closed' }, 'usr-agent-01');
  assert.throws(
    () => {
      TicketService.updateTicket('tkt-001', { status: 'in_progress' }, 'usr-agent-01');
    },
    { message: /Closed tickets must be reopened first/ }
  );
});

test('TicketService.addComment appends internal and external notes', () => {
  const comment = TicketService.addComment(
    'tkt-001',
    'usr-agent-01',
    'Applied workaround patch to billing service',
    true
  );

  assert.strictEqual(comment.isInternal, true);
  assert.strictEqual(comment.content, 'Applied workaround patch to billing service');

  const ticket = TicketService.getTicketById('tkt-001');
  assert.ok(ticket);
  assert.ok(ticket.comments);
  const found = ticket.comments.find((c) => c.id === comment.id);
  assert.ok(found);
});

test('TicketService.calculateSLA correctly identifies breaches', () => {
  // Past date creation that exceeded urgent SLA (2 hours)
  const pastCreated = new Date(Date.now() - 4 * 60 * 60 * 1000);
  const sla = TicketService.calculateSLA('urgent', pastCreated, 'open', null);
  assert.strictEqual(sla.isBreached, true);
  assert.strictEqual(sla.formattedRemaining.includes('overdue'), true);
});

test('TicketService.getMetrics calculates dashboard summary counters', () => {
  const metrics = TicketService.getMetrics();
  assert.strictEqual(typeof metrics.total, 'number');
  assert.strictEqual(typeof metrics.open, 'number');
  assert.strictEqual(typeof metrics.resolved, 'number');
  assert.strictEqual(metrics.total >= 3, true);
});
