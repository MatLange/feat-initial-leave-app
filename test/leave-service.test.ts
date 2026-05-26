import cds from '@sap/cds';

const { GET, POST, PATCH, DELETE, expect: cdExpect } = cds.test('.').in(__dirname, '..');

// Factory function for mock leave requests
const getMockLeaveRequest = (overrides: Partial<Record<string, unknown>> = {}) => {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() + 7); // next week
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 4); // +4 days → 5 working days

  return {
    employee_ID: '', // will be set after employee creation
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    type: 'Annual',
    reason: 'Summer vacation',
    ...overrides,
  };
};

const getMockEmployee = (overrides: Partial<Record<string, unknown>> = {}) => ({
  name: `Test Employee ${Date.now()}`,
  email: `test${Date.now()}@example.com`,
  department: 'Engineering',
  ...overrides,
});

describe('LeaveService', () => {
  let employeeId: string;

  // Create a test employee before all tests
  beforeAll(async () => {
    const { status, data } = await POST('/leave/Employees', getMockEmployee());
    expect(status).toBe(201);
    employeeId = data.ID;
  });

  // ─── Happy Path Tests ────────────────────────────────────────────────────────

  describe('Happy Path: Create → Submit → Approve', () => {
    it('creates a leave request with status Draft', async () => {
      const { status, data } = await POST(
        '/leave/LeaveRequests',
        getMockLeaveRequest({ employee_ID: employeeId })
      );
      expect(status).toBe(201);
      expect(data.status).toBe('Draft');
      expect(data.ID).toBeDefined();
    });

    it('transitions Draft → Submitted → Approved', async () => {
      // Step 1: Create
      const { data: created } = await POST(
        '/leave/LeaveRequests',
        getMockLeaveRequest({ employee_ID: employeeId })
      );
      expect(created.status).toBe('Draft');

      // Step 2: Submit
      const { status: submitStatus, data: submitted } = await POST(
        `/leave/LeaveRequests(${created.ID})/LeaveService.submit`,
        {}
      );
      expect(submitStatus).toBe(200);
      expect(submitted.status).toBe('Submitted');

      // Step 3: Approve
      const { status: approveStatus, data: approved } = await POST(
        `/leave/LeaveRequests(${created.ID})/LeaveService.approve`,
        {}
      );
      expect(approveStatus).toBe(200);
      expect(approved.status).toBe('Approved');
    });
  });

  describe('Happy Path: Create → Submit → Reject', () => {
    it('transitions Draft → Submitted → Rejected with reason', async () => {
      // Step 1: Create
      const { data: created } = await POST(
        '/leave/LeaveRequests',
        getMockLeaveRequest({ employee_ID: employeeId })
      );
      expect(created.status).toBe('Draft');

      // Step 2: Submit
      const { data: submitted } = await POST(
        `/leave/LeaveRequests(${created.ID})/LeaveService.submit`,
        {}
      );
      expect(submitted.status).toBe('Submitted');

      // Step 3: Reject with reason
      const rejectReason = 'zu kurzfristig beantragt';
      const { status: rejectStatus, data: rejected } = await POST(
        `/leave/LeaveRequests(${created.ID})/LeaveService.reject`,
        { reason: rejectReason }
      );
      expect(rejectStatus).toBe(200);
      expect(rejected.status).toBe('Rejected');
      expect(rejected.rejectionReason).toBe(rejectReason);
    });
  });

  // ─── Error Cases ─────────────────────────────────────────────────────────────

  describe('Validation: date constraints', () => {
    it('rejects CREATE when startDate is after endDate (400)', async () => {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() + 10);
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 7); // endDate BEFORE startDate

      const { status } = await POST('/leave/LeaveRequests', {
        ...getMockLeaveRequest({ employee_ID: employeeId }),
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });
      expect(status).toBe(400);
    });

    it('rejects CREATE when startDate is in the past (400)', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dayAfterYesterday = new Date();
      dayAfterYesterday.setDate(dayAfterYesterday.getDate() + 5);

      const { status } = await POST('/leave/LeaveRequests', {
        ...getMockLeaveRequest({ employee_ID: employeeId }),
        startDate: yesterday.toISOString().split('T')[0],
        endDate: dayAfterYesterday.toISOString().split('T')[0],
      });
      expect(status).toBe(400);
    });
  });

  describe('Action errors: submit()', () => {
    it('rejects submit() on non-Draft request (422)', async () => {
      // Create and submit once
      const { data: created } = await POST(
        '/leave/LeaveRequests',
        getMockLeaveRequest({ employee_ID: employeeId })
      );
      await POST(`/leave/LeaveRequests(${created.ID})/LeaveService.submit`, {});

      // Second submit should fail with 422
      const { status } = await POST(
        `/leave/LeaveRequests(${created.ID})/LeaveService.submit`,
        {}
      );
      expect(status).toBe(422);
    });
  });

  describe('Action errors: approve()', () => {
    it('rejects approve() on non-Submitted request (422)', async () => {
      // Create but do NOT submit
      const { data: created } = await POST(
        '/leave/LeaveRequests',
        getMockLeaveRequest({ employee_ID: employeeId })
      );

      // Try to approve a Draft request — should fail
      const { status } = await POST(
        `/leave/LeaveRequests(${created.ID})/LeaveService.approve`,
        {}
      );
      expect(status).toBe(422);
    });
  });

  describe('Action errors: reject()', () => {
    it('rejects reject() without reason (400)', async () => {
      // Create and submit
      const { data: created } = await POST(
        '/leave/LeaveRequests',
        getMockLeaveRequest({ employee_ID: employeeId })
      );
      await POST(`/leave/LeaveRequests(${created.ID})/LeaveService.submit`, {});

      // Try to reject without a reason
      const { status } = await POST(
        `/leave/LeaveRequests(${created.ID})/LeaveService.reject`,
        { reason: '' }
      );
      expect(status).toBe(400);
    });
  });

  // ─── durationDays calculation ─────────────────────────────────────────────

  describe('Computed field: durationDays', () => {
    it('calculates durationDays correctly (5 days for a Mon–Fri week)', async () => {
      // Use fixed dates: Monday to Friday = 5 days
      const nextMonday = new Date();
      // Find next Monday
      const daysUntilMonday = (8 - nextMonday.getDay()) % 7 || 7;
      nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
      const friday = new Date(nextMonday);
      friday.setDate(nextMonday.getDate() + 4); // Friday

      const { data: created } = await POST('/leave/LeaveRequests', {
        ...getMockLeaveRequest({ employee_ID: employeeId }),
        startDate: nextMonday.toISOString().split('T')[0],
        endDate: friday.toISOString().split('T')[0],
      });

      const { data: fetched } = await GET(`/leave/LeaveRequests(${created.ID})`);
      // endDate - startDate = 4 days, but durationDays = endDate - startDate + 1 (inclusive)
      expect(fetched.durationDays).toBe(5);
    });

    it('calculates durationDays = 1 for single day request', async () => {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 14);
      const dateStr = nextWeek.toISOString().split('T')[0];

      const { data: created } = await POST('/leave/LeaveRequests', {
        ...getMockLeaveRequest({ employee_ID: employeeId }),
        startDate: dateStr,
        endDate: dateStr,
      });

      const { data: fetched } = await GET(`/leave/LeaveRequests(${created.ID})`);
      expect(fetched.durationDays).toBe(1);
    });
  });
});
