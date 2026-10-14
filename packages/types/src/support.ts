export interface SupportTicket { id: string; organizationId: string; subject: string; status: 'OPEN' | 'CLOSED'; createdAt: string; updatedAt: string; }
export interface SupportMessage { id: string; body: string; fromPlatform: boolean; createdAt: string; }
export interface SupportThread { ticket: SupportTicket; messages: SupportMessage[]; }
export interface InboxNotification { id: string; ticketId: string; kind: 'SUPPORT_REPLY' | 'SUPPORT_STATUS'; createdAt: string; ticket: { subject: string }; }
