import cds from '@sap/cds';

type LeaveStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
type LeaveType   = 'Annual' | 'Sick' | 'Special';

interface LeaveRequest {
  ID: string;
  employee_ID: string;
  startDate: string;
  endDate: string;
  leaveType: LeaveType;
  reason?: string;
  status: LeaveStatus;
  approver?: string;
  rejectionReason?: string;
  durationDays?: number;
}

export default class LeaveService extends cds.ApplicationService {
  async init() {
    this.before(['CREATE', 'UPDATE'], 'LeaveRequests', this.validateDates);
    this.after('READ', 'LeaveRequests', this.computeDurationDays);
    this.on('submit',  'LeaveRequests', this.handleSubmit);
    this.on('approve', 'LeaveRequests', this.handleApprove);
    this.on('reject',  'LeaveRequests', this.handleReject);
    return super.init();
  }

  private validateDates = async (req: cds.Request): Promise<void> => {
    const { startDate, endDate } = req.data as Partial<LeaveRequest>;
    if (!startDate || !endDate) return;

    const start = new Date(startDate);
    const end   = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start > end) {
      return req.reject(400, 'Startdatum darf nicht nach dem Enddatum liegen.');
    }
    if (start < today) {
      return req.reject(400, 'Startdatum darf nicht in der Vergangenheit liegen.');
    }
  };

  private computeDurationDays = (results: LeaveRequest | LeaveRequest[], _req: cds.Request): void => {
    const list = Array.isArray(results) ? results : [results];
    for (const item of list) {
      if (item.startDate && item.endDate) {
        const diffMs = new Date(item.endDate).getTime() - new Date(item.startDate).getTime();
        item.durationDays = Math.max(1, Math.round(diffMs / 86_400_000) + 1);
      }
    }
  };

  private handleSubmit = async (req: cds.Request): Promise<LeaveRequest | undefined> => {
    const { ID } = req.params[0] as { ID: string };
    const { LeaveRequests } = this.entities;

    const order = await SELECT.one.from(LeaveRequests).where({ ID }) as LeaveRequest | null;
    if (!order) return req.reject(404, `Urlaubsantrag ${ID} nicht gefunden.`);

    if (order.status !== 'Draft') {
      return req.reject(422,
        `Nur Anträge im Status 'Draft' können eingereicht werden. Aktueller Status: ${order.status}`);
    }

    const days = Math.round(
      (new Date(order.endDate).getTime() - new Date(order.startDate).getTime()) / 86_400_000
    ) + 1;
    if (days < 1) return req.reject(422, 'Der Antrag muss mindestens einen Tag umfassen.');

    await UPDATE(LeaveRequests).set({ status: 'Submitted' }).where({ ID });
    return SELECT.one.from(LeaveRequests).where({ ID }) as Promise<LeaveRequest>;
  };

  private handleApprove = async (req: cds.Request): Promise<LeaveRequest | undefined> => {
    const { ID } = req.params[0] as { ID: string };
    const { LeaveRequests } = this.entities;

    const order = await SELECT.one.from(LeaveRequests).where({ ID }) as LeaveRequest | null;
    if (!order) return req.reject(404, `Urlaubsantrag ${ID} nicht gefunden.`);

    if (order.status !== 'Submitted') {
      return req.reject(422,
        `Nur Anträge im Status 'Submitted' können genehmigt werden. Aktueller Status: ${order.status}`);
    }

    const approver = req.user?.id ?? 'system';
    await UPDATE(LeaveRequests).set({ status: 'Approved', approver }).where({ ID });
    return SELECT.one.from(LeaveRequests).where({ ID }) as Promise<LeaveRequest>;
  };

  private handleReject = async (req: cds.Request): Promise<LeaveRequest | undefined> => {
    const { ID } = req.params[0] as { ID: string };
    const { reason } = req.data as { reason?: string };
    const { LeaveRequests } = this.entities;

    if (!reason || reason.trim() === '') {
      return req.reject(400, 'Ein Ablehnungsgrund ist erforderlich.');
    }

    const order = await SELECT.one.from(LeaveRequests).where({ ID }) as LeaveRequest | null;
    if (!order) return req.reject(404, `Urlaubsantrag ${ID} nicht gefunden.`);

    if (order.status !== 'Submitted') {
      return req.reject(422,
        `Nur Anträge im Status 'Submitted' können abgelehnt werden. Aktueller Status: ${order.status}`);
    }

    await UPDATE(LeaveRequests).set({ status: 'Rejected', rejectionReason: reason }).where({ ID });
    return SELECT.one.from(LeaveRequests).where({ ID }) as Promise<LeaveRequest>;
  };
}
