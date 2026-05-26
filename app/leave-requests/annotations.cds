using LeaveService from '../../srv/leave-service';

// ─── List Report ─────────────────────────────────────────────────────────────

annotate LeaveService.LeaveRequests with @(
  UI.LineItem: [
    {
      $Type      : 'UI.DataFieldForAnnotation',
      Target     : '@UI.DataPoint#StatusIndicator',
      Label      : 'Status',
      @UI.Importance: #High
    },
    {
      $Type: 'UI.DataField',
      Value: employee_ID,
      Label: 'Mitarbeiter',
      @UI.Importance: #High
    },
    {
      $Type: 'UI.DataField',
      Value: type,
      Label: 'Typ',
      @UI.Importance: #High
    },
    {
      $Type: 'UI.DataField',
      Value: startDate,
      Label: 'Von',
      @UI.Importance: #Medium
    },
    {
      $Type: 'UI.DataField',
      Value: endDate,
      Label: 'Bis',
      @UI.Importance: #Medium
    },
    {
      $Type: 'UI.DataField',
      Value: durationDays,
      Label: 'Dauer (Tage)',
      @UI.Importance: #Medium
    },
  ],

  // DataPoint for status with criticality
  // Draft=0 (neutral), Submitted=2 (warning/orange), Approved=3 (success/green), Rejected=1 (error/red)
  UI.DataPoint#StatusIndicator: {
    Value      : status,
    Title      : 'Status',
    Criticality: {
      $edmJson: {
        $If: [
          { $Eq: [ { $Path: 'status' }, 'Draft'     ] }, 0,
          { $If: [
            { $Eq: [ { $Path: 'status' }, 'Submitted' ] }, 2,
            { $If: [
              { $Eq: [ { $Path: 'status' }, 'Approved'  ] }, 3,
              1
            ] }
          ] }
        ]
      }
    },
  },

  UI.SelectionFields: [ status, type, startDate ],

  UI.HeaderInfo: {
    TypeName:       'Leave Request',
    TypeNamePlural: 'Leave Requests',
    Title          : { Value: employee_ID },
  },

  UI.Facets: [
    {
      $Type : 'UI.ReferenceFacet',
      Label : 'General',
      Target: '@UI.FieldGroup#General',
    },
    {
      $Type : 'UI.ReferenceFacet',
      Label : 'Status',
      Target: '@UI.FieldGroup#StatusInfo',
    },
  ],

  UI.FieldGroup#General: {
    Label: 'General',
    Data : [
      { $Type: 'UI.DataField', Value: employee_ID,  Label: 'Mitarbeiter' },
      { $Type: 'UI.DataField', Value: type,         Label: 'Typ'         },
      { $Type: 'UI.DataField', Value: startDate,    Label: 'Von'         },
      { $Type: 'UI.DataField', Value: endDate,      Label: 'Bis'         },
      { $Type: 'UI.DataField', Value: durationDays, Label: 'Dauer (Tage)'},
      { $Type: 'UI.DataField', Value: reason,       Label: 'Begründung'  },
    ],
  },

  UI.FieldGroup#StatusInfo: {
    Label: 'Status',
    Data : [
      { $Type: 'UI.DataField', Value: status,          Label: 'Status'          },
      { $Type: 'UI.DataField', Value: approver,        Label: 'Genehmigt von'   },
      { $Type: 'UI.DataField', Value: rejectionReason, Label: 'Ablehnungsgrund' },
    ],
  },
);

// ─── Field Labels ─────────────────────────────────────────────────────────────

annotate LeaveService.LeaveRequests with {
  employee        @Common.Label: 'Mitarbeiter'
                  @Common.ValueList: {
                    CollectionPath: 'Employees',
                    Parameters    : [
                      {
                        $Type            : 'Common.ValueListParameterOut',
                        LocalDataProperty: employee_ID,
                        ValueListProperty: 'ID',
                      },
                      {
                        $Type            : 'Common.ValueListParameterDisplayOnly',
                        ValueListProperty: 'name',
                      },
                    ],
                  };
  startDate       @Common.Label: 'Von';
  endDate         @Common.Label: 'Bis';
  type            @Common.Label: 'Typ'
                  @Common.ValueListWithFixedValues;
  reason          @Common.Label: 'Begründung';
  status          @Common.Label: 'Status'
                  @Common.ValueListWithFixedValues;
  approver        @Common.Label: 'Genehmigt von';
  rejectionReason @Common.Label: 'Ablehnungsgrund';
  durationDays    @Common.Label: 'Dauer (Tage)';
}
