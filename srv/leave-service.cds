using leavemanager from '../db/leave-requests';

service LeaveService @(path: '/leave') {

  @odata.draft.enabled
  entity LeaveRequests as projection on leavemanager.LeaveRequests
    actions {
      action submit()                    returns LeaveRequests;
      action approve()                   returns LeaveRequests;
      action reject(reason: String(500)) returns LeaveRequests;
    };

  @readonly
  entity Employees as projection on leavemanager.Employees;
}
