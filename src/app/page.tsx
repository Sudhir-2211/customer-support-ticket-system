'use client';

import React, { useState, useEffect } from 'react';
import { TicketService } from '../lib/ticketService';
import type { Ticket, TicketStatus, TicketPriority, TicketCategory } from '../types/ticket';

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [metrics, setMetrics] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0, breached: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  
  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  
  // Create form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<TicketPriority>('medium');
  const [newCategory, setNewCategory] = useState<TicketCategory>('general');

  // Comment input
  const [newComment, setNewComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);

  const refreshData = () => {
    const list = TicketService.getTickets({
      searchQuery: search,
      status: statusFilter === 'all' ? undefined : (statusFilter as TicketStatus),
      priority: priorityFilter === 'all' ? undefined : (priorityFilter as TicketPriority),
    });
    setTickets(list);
    setMetrics(TicketService.getMetrics());
    if (selectedTicket) {
      const refreshedSelected = TicketService.getTicketById(selectedTicket.id);
      setSelectedTicket(refreshedSelected);
    }
  };

  useEffect(() => {
    refreshData();
  }, [search, statusFilter, priorityFilter]);

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDesc) return;
    try {
      TicketService.createTicket({
        title: newTitle,
        description: newDesc,
        priority: newPriority,
        category: newCategory,
        customerId: 'usr-cust-01',
      });
      setNewTitle('');
      setNewDesc('');
      setIsCreateOpen(false);
      refreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newComment.trim()) return;
    try {
      TicketService.addComment(
        selectedTicket.id,
        'usr-agent-01',
        newComment,
        isInternalComment
      );
      setNewComment('');
      refreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleStatusChange = (status: TicketStatus) => {
    if (!selectedTicket) return;
    try {
      TicketService.updateTicket(selectedTicket.id, { status }, 'usr-agent-01');
      refreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="container">
      <header className="header">
        <div className="header-title">
          <h1>Customer Support Ticket System</h1>
          <p>Multi-tier SLA tracking, priority routing, and customer interaction logs</p>
        </div>
        <button id="new-ticket-btn" className="btn-primary" onClick={() => setIsCreateOpen(true)}>
          + New Ticket
        </button>
      </header>

      {/* Metrics Row */}
      <section className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Tickets</span>
          <span className="stat-value">{metrics.total}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Open</span>
          <span className="stat-value" style={{ color: '#93c5fd' }}>{metrics.open}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">In Progress</span>
          <span className="stat-value" style={{ color: '#d8b4fe' }}>{metrics.inProgress}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Resolved</span>
          <span className="stat-value" style={{ color: '#6ee7b7' }}>{metrics.resolved}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">SLA Breached</span>
          <span className="stat-value" style={{ color: '#fca5a5' }}>{metrics.breached}</span>
        </div>
      </section>

      {/* Filters */}
      <div className="filters-bar">
        <input
          id="search-tickets-input"
          type="text"
          placeholder="Search tickets by title, description, or number..."
          className="search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          id="status-filter-select"
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          id="priority-filter-select"
          className="filter-select"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Ticket List */}
      <div className="ticket-grid">
        {tickets.map((t) => {
          const sla = TicketService.calculateSLA(
            t.priority,
            new Date(t.createdAt),
            t.status,
            t.resolvedAt ? new Date(t.resolvedAt) : null
          );
          return (
            <div
              key={t.id}
              className="ticket-card"
              onClick={() => setSelectedTicket(t)}
            >
              <div className="ticket-card-header">
                <span className="ticket-num">{t.ticketNumber}</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span className={`badge badge-${t.status}`}>{t.status.replace('_', ' ')}</span>
                  <span className={`badge badge-${t.priority}`}>{t.priority}</span>
                </div>
              </div>
              <h2 className="ticket-title">{t.title}</h2>
              <p className="ticket-desc">{t.description}</p>
              <div className="ticket-meta">
                <span>Customer: {t.customer?.fullName || 'Anonymous'}</span>
                <span style={{ color: sla.isBreached ? '#fca5a5' : '#94a3b8' }}>
                  SLA: {sla.formattedRemaining}
                </span>
                <span>Assigned: {t.assignedAgent?.fullName || 'Unassigned'}</span>
              </div>
            </div>
          );
        })}
        {tickets.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            No tickets found matching current filters.
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      {isCreateOpen && (
        <div className="modal-backdrop" onClick={() => setIsCreateOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1.25rem', fontSize: '1.35rem' }}>Create New Support Ticket</h2>
            <form onSubmit={handleCreateTicket}>
              <div className="form-group">
                <label>Ticket Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cannot complete Stripe checkout payment"
                  className="form-control"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Description & Error Details</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe the issue, reproduction steps, or error codes..."
                  className="form-control"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    className="form-control"
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TicketPriority)}
                  >
                    <option value="urgent">Urgent (2h SLA)</option>
                    <option value="high">High (8h SLA)</option>
                    <option value="medium">Medium (24h SLA)</option>
                    <option value="low">Low (48h SLA)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select
                    className="form-control"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as TicketCategory)}
                  >
                    <option value="technical">Technical</option>
                    <option value="billing">Billing</option>
                    <option value="account">Account</option>
                    <option value="feature_request">Feature Request</option>
                    <option value="general">General</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="filter-select"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <div className="modal-backdrop" onClick={() => setSelectedTicket(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span className="ticket-num">{selectedTicket.ticketNumber}</span>
              <button
                className="filter-select"
                style={{ padding: '0.25rem 0.5rem', cursor: 'pointer' }}
                onClick={() => setSelectedTicket(null)}
              >
                Close ✕
              </button>
            </div>
            <h2 style={{ fontSize: '1.35rem', marginBottom: '0.5rem' }}>{selectedTicket.title}</h2>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <span className={`badge badge-${selectedTicket.status}`}>{selectedTicket.status.replace('_', ' ')}</span>
              <span className={`badge badge-${selectedTicket.priority}`}>{selectedTicket.priority}</span>
              <span className="badge" style={{ background: 'rgba(255,255,255,0.1)' }}>{selectedTicket.category}</span>
            </div>
            <p style={{ color: '#cbd5e1', lineHeight: '1.5', marginBottom: '1.5rem', whiteSpace: 'pre-line' }}>
              {selectedTicket.description}
            </p>

            {/* Quick Status Action */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1.5rem', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Update Status:</span>
              <button
                className="filter-select"
                onClick={() => handleStatusChange('open')}
              >
                Open
              </button>
              <button
                className="filter-select"
                onClick={() => handleStatusChange('in_progress')}
              >
                In Progress
              </button>
              <button
                className="filter-select"
                onClick={() => handleStatusChange('resolved')}
              >
                Resolve
              </button>
            </div>

            {/* Comments Thread */}
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Conversation Thread</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {selectedTicket.comments?.map((c) => (
                <div
                  key={c.id}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    background: c.isInternal ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                    border: c.isInternal ? '1px dashed rgba(245, 158, 11, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                    <span>
                      {c.author?.fullName || 'User'} {c.isInternal && <strong style={{ color: '#fde047' }}>[INTERNAL NOTE]</strong>}
                    </span>
                    <span>{new Date(c.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: '#e2e8f0', whiteSpace: 'pre-line' }}>{c.content}</p>
                </div>
              ))}
              {(!selectedTicket.comments || selectedTicket.comments.length === 0) && (
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>No comments yet.</p>
              )}
            </div>

            {/* Add Comment Form */}
            <form onSubmit={handleAddComment}>
              <div className="form-group">
                <textarea
                  rows={3}
                  required
                  placeholder="Type a response or internal note..."
                  className="form-control"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#fde047', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isInternalComment}
                    onChange={(e) => setIsInternalComment(e.target.checked)}
                  />
                  Internal Note (hidden from customer)
                </label>
                <button type="submit" className="btn-primary">
                  Post Response
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
