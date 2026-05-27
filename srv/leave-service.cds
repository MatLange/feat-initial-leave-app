using leavemanager from '../db/leave-requests';

// Requires authenticated user; restrict approve/reject to 'Manager' role in production.
@requires: 'any'
service LeaveService @(path: '/leave') {

  @odata.draft.enabled
  entity LeaveRequests as projection on leavemanager.LeaveRequests
    actions {
      action submit()                    returns LeaveRequests;
      action approve()                   returns LeaveRequests;
      action reject(reason: String(500)) returns LeaveRequests;
    };

  // Employees is reference data — no delete, no bulk operations.
  // Insert allowed so tests and admin tooling can seed data.
  @Capabilities.DeleteRestrictions.Deletable: false
  entity Employees as projection on leavemanager.Employees;
}
