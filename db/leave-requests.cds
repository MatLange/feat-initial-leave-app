namespace leavemanager;
using { cuid, managed } from '@sap/cds/common';

entity Employees : cuid, managed {
  name       : String(200) @mandatory;
  email      : String(200);
  department : String(100);
}

entity LeaveRequests : cuid, managed {
  employee        : Association to Employees @mandatory;
  startDate       : Date @mandatory;
  endDate         : Date @mandatory;
  type            : String(20) @mandatory
    @assert.range enum { Annual; Sick; Special; };
  reason          : String(500);
  status          : String(20) default 'Draft'
    @assert.range enum { Draft; Submitted; Approved; Rejected; };
  approver        : String(100);
  rejectionReason : String(500);
  durationDays    : virtual Integer;
}
