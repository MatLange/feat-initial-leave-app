namespace leavemanager;
using { cuid, managed } from '@sap/cds/common';

type LeaveStatus : String(20) enum { Draft; Submitted; Approved; Rejected; };
type LeaveType   : String(20) enum { Annual; Sick; Special; };

entity Employees : cuid, managed {
  name       : String(200) @mandatory;
  email      : String(200);
  department : String(100);
}

entity LeaveRequests : cuid, managed {
  employee        : Association to Employees @mandatory;
  startDate       : Date @mandatory;
  endDate         : Date @mandatory;
  leaveType       : LeaveType @mandatory;
  reason          : String(500);
  status          : LeaveStatus default 'Draft';
  approver        : String(100);
  rejectionReason : String(500);
  virtual durationDays : Integer @readonly;
}
