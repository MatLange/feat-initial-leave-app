import cds from '@sap/cds';

interface LeaveRequest {
  ID: string;
  employee_ID: string;
  startDate: string;
  endDate: string;
  type: string;
  reason?: string;
  status: string;
  approver?: string;
  rejectionReason?: string;
  durationDays?: number;
}

export default class LeaveService extends cds.ApplicationService {
  async init() {
    // Validation before CREATE
    this.before('CREATE', 'LeaveRequests', this.validateDates);

    // Enrich results with computed durationDays
    this.after('READ', 'LeaveRequests', this.computeDurationDays);

    // Actions
    this.on('submit', 'LeaveRequests', this.handleSubmit);
    this.on('approve', 'LeaveRequests', this.handleApprove);
    this.on('reject', 'LeaveRequests', this.handleReject);

    return super.init();
  }

  /**
   * Validates that:
   * - startDate is not after endDate
   * - startDate is not in the past
   */
  private validateDates = async (req: cds.Request): Promise<void> => {
    const { startDate, endDate } = req.data as LeaveRequest;

    if (!startDate || !endDate) return;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start > end) {
      req.reject(400, 'Startdatum darf nicht nach dem Enddatum liegen.');
    }

    if (start < today) {
      req.reject(400, 'Startdatum darf nicht in der Vergangenheit liegen.');
    }
  };

  /**
   * Computes durationDays as the inclusive difference between startDate and endDate.
   * Minimum value is 1.
   */
  private computeDurationDays = (
    results: LeaveRequest | LeaveRequest[]
  ): void => {
    const list = Array.isArray(results) ? results : [results];
    for (const item of list) {
      if (item.startDate && item.endDate) {
        const start = new Date(item.startDate);
        const end = new Date(item.endDate);
        const diffMs = end.getTime() - start.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        item.durationDays = Math.max(1, diffDays + 1);
      }
    }
  };

  /**
   * submit(): Draft → Submitted
   * Requires at least 1 day duration.
   */
  private handleSubmit = async (req: cds.Request): Promise<LeaveRequest> => {
    const { ID } = req.params[0] as { ID: string };
    const { LeaveRequests } = this.entities;

    const request = await SELECT.one.from(LeaveRequests).where({ ID });
    if (!request) {
      req.reject(404, `Urlaubsantrag ${ID} nicht gefunden.`);
    }

    if (request.status !== 'Draft') {
      req.reject(
        422,
        `Nur Anträge im Status 'Draft' können eingereicht werden. Aktueller Status: ${request.status}`
      );
    }

    // Ensure at least 1 day
    const start = new Date(request.startDate as string);
    const end = new Date(request.endDate as string);
    const diffDays = Math.round(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    if (diffDays < 1) {
      req.reject(422, 'Der Antrag muss mindestens einen Tag umfassen.');
    }

    await UPDATE(LeaveRequests).set({ status: 'Submitted' }).where({ ID });
    return (await SELECT.one.from(LeaveRequests).where({ ID })) as LeaveRequest;
  };

  /**
   * approve(): Submitted → Approved
   * Saves req.user.id as approver.
   */
  private handleApprove = async (req: cds.Request): Promise<LeaveRequest> => {
    const { ID } = req.params[0] as { ID: string };
    const { LeaveRequests } = this.entities;

    const request = await SELECT.one.from(LeaveRequests).where({ ID });
    if (!request) {
      req.reject(404, `Urlaubsantrag ${ID} nicht gefunden.`);
    }

    if (request.status !== 'Submitted') {
      req.reject(
        422,
        `Nur Anträge im Status 'Submitted' können genehmigt werden. Aktueller Status: ${request.status}`
      );
    }

    const approver = req.user?.id ?? 'system';
    await UPDATE(LeaveRequests)
      .set({ status: 'Approved', approver })
      .where({ ID });

    return (await SELECT.one.from(LeaveRequests).where({ ID })) as LeaveRequest;
  };

  /**
   * reject(reason): Submitted → Rejected
   * reason is mandatory.
   */
  private handleReject = async (req: cds.Request): Promise<LeaveRequest> => {
    const { ID } = req.params[0] as { ID: string };
    const { reason } = req.data as { reason?: string };
    const { LeaveRequests } = this.entities;

    if (!reason || reason.trim() === '') {
      req.reject(400, 'Ein Ablehnungsgrund ist erforderlich.');
    }

    const request = await SELECT.one.from(LeaveRequests).where({ ID });
    if (!request) {
      req.reject(404, `Urlaubsantrag ${ID} nicht gefunden.`);
    }

    if (request.status !== 'Submitted') {
      req.reject(
        422,
        `Nur Anträge im Status 'Submitted' können abgelehnt werden. Aktueller Status: ${request.status}`
      );
    }

    await UPDATE(LeaveRequests)
      .set({ status: 'Rejected', rejectionReason: reason })
      .where({ ID });

    return (await SELECT.one.from(LeaveRequests).where({ ID })) as LeaveRequest;
  };
}
