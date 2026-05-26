---
name: ui5-patterns
description: UI5 controller patterns, view XML, model binding, event handling, and fragment usage. Use when building custom UI5 views, controllers, or extending Fiori Elements apps.
---

# UI5 Patterns

## Core Rules

1. **No global state** — use models attached to view or component
2. **`byId()` only within the owning controller** — never access other views' controls
3. **OData operations via `ODataModel`** — never manual fetch/axios calls
4. **Fragments** for reusable UI (dialogs, popovers) — not copy-pasted XML
5. **Event handlers in controller** — no inline JS in XML views

## File Structure

```
webapp/
├── Component.js             # App component
├── manifest.json            # App descriptor (routes, models, i18n)
├── controller/
│   ├── BaseController.js    # Shared controller utilities
│   ├── List.controller.js   # List view controller
│   └── Detail.controller.js # Detail view controller
├── view/
│   ├── List.view.xml        # List view
│   └── Detail.view.xml      # Detail view
├── fragment/
│   └── CreateDialog.fragment.xml
├── model/
│   └── formatter.js         # Formatting functions
└── i18n/
    └── i18n.properties      # Texts
```

## Controller Pattern

```javascript
sap.ui.define([
  'sap/ui/core/mvc/Controller',
  'sap/ui/model/json/JSONModel',
  'sap/m/MessageToast',
  'sap/m/MessageBox'
], function (Controller, JSONModel, MessageToast, MessageBox) {
  'use strict';

  return Controller.extend('my.namespace.controller.OrderList', {

    onInit: function () {
      // Initialize view model
      const oViewModel = new JSONModel({
        busy: false,
        selectedCount: 0
      });
      this.getView().setModel(oViewModel, 'viewModel');

      // Attach route match handler
      const oRouter = this.getOwnerComponent().getRouter();
      oRouter.getRoute('orderList').attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function (oEvent) {
      this._loadData();
    },

    _loadData: function () {
      this._setViewBusy(true);
      const oModel = this.getView().getModel();

      oModel.read('/Orders', {
        success: (oData) => {
          this._setViewBusy(false);
        },
        error: (oError) => {
          this._setViewBusy(false);
          MessageBox.error(this._getText('errorLoadingOrders'));
        }
      });
    },

    onSubmitOrder: function (oEvent) {
      const oModel = this.getView().getModel();
      const oContext = oEvent.getSource().getBindingContext();

      this._setViewBusy(true);
      oModel.callFunction('/submitForApproval', {
        method: 'POST',
        urlParameters: { OrderID: oContext.getProperty('ID') },
        success: () => {
          this._setViewBusy(false);
          MessageToast.show(this._getText('orderSubmitted'));
          oModel.refresh();
        },
        error: (oError) => {
          this._setViewBusy(false);
          MessageBox.error(oError.message);
        }
      });
    },

    onNavToDetail: function (oEvent) {
      const oBindingContext = oEvent.getSource().getBindingContext();
      const sOrderId = oBindingContext.getProperty('ID');
      this.getOwnerComponent().getRouter().navTo('orderDetail', { orderId: sOrderId });
    },

    // Shared helpers
    _setViewBusy: function (bBusy) {
      this.getView().getModel('viewModel').setProperty('/busy', bBusy);
    },

    _getText: function (sKey, aArgs) {
      return this.getOwnerComponent().getModel('i18n').getResourceBundle().getText(sKey, aArgs);
    }

  });
});
```

## View XML Pattern

```xml
<mvc:View
  controllerName="my.namespace.controller.OrderList"
  xmlns="sap.m"
  xmlns:mvc="sap.ui.core.mvc"
  xmlns:core="sap.ui.core"
  displayBlock="true">

  <Page
    title="{i18n>orderListTitle}"
    busy="{viewModel>/busy}">

    <content>
      <List
        id="orderList"
        items="{
          path: '/Orders',
          sorter: { path: 'createdAt', descending: true }
        }"
        noDataText="{i18n>noOrders}"
        mode="SingleSelectMaster"
        selectionChange="onNavToDetail">

        <items>
          <ObjectListItem
            title="{orderNumber}"
            number="{
              path: 'totalAmount',
              type: 'sap.ui.model.type.Currency',
              parts: ['totalAmount', 'currency_code']
            }"
            intro="{customerName}">

            <attributes>
              <ObjectAttribute text="{status}" />
            </attributes>

            <firstStatus>
              <ObjectStatus
                text="{status}"
                state="{
                  path: 'status',
                  formatter: '.formatter.statusState'
                }" />
            </firstStatus>
          </ObjectListItem>
        </items>
      </List>
    </content>

    <footer>
      <Toolbar>
        <ToolbarSpacer />
        <Button text="{i18n>createOrder}" press="onCreateOrder" type="Emphasized" />
      </Toolbar>
    </footer>
  </Page>
</mvc:View>
```

## Fragment Pattern (Reusable Dialog)

```xml
<!-- webapp/fragment/CreateOrderDialog.fragment.xml -->
<core:FragmentDefinition
  xmlns="sap.m"
  xmlns:core="sap.ui.core"
  xmlns:f="sap.ui.layout.form">

  <Dialog id="createOrderDialog" title="{i18n>createOrder}" contentWidth="500px">
    <content>
      <f:SimpleForm editable="true" layout="ResponsiveGridLayout">
        <f:content>
          <Label text="{i18n>orderNumber}" required="true" />
          <Input id="orderNumberInput" value="{createModel>/orderNumber}" maxLength="20" />

          <Label text="{i18n>customer}" required="true" />
          <Select id="customerSelect" items="{/Customers}" selectedKey="{createModel>/customerId}">
            <items>
              <core:Item key="{ID}" text="{name}" />
            </items>
          </Select>
        </f:content>
      </f:SimpleForm>
    </content>

    <buttons>
      <Button text="{i18n>create}" type="Emphasized" press="onCreateConfirm" />
      <Button text="{i18n>cancel}" press="onCreateCancel" />
    </buttons>
  </Dialog>
</core:FragmentDefinition>
```

```javascript
// Load and open fragment in controller
onCreateOrder: function () {
  if (!this._pCreateDialog) {
    this._pCreateDialog = this.loadFragment({ name: 'my.namespace.fragment.CreateOrderDialog' });
  }
  this._pCreateDialog.then((oDialog) => {
    // Initialize dialog model
    const oCreateModel = new JSONModel({ orderNumber: '', customerId: '' });
    this.getView().setModel(oCreateModel, 'createModel');
    oDialog.open();
  });
},

onCreateCancel: function () {
  this.byId('createOrderDialog').close();
},

onCreateConfirm: function () {
  const oCreateData = this.getView().getModel('createModel').getData();
  if (!oCreateData.orderNumber) {
    MessageBox.error(this._getText('orderNumberRequired'));
    return;
  }
  // Create via OData model...
  const oModel = this.getView().getModel();
  oModel.create('/Orders', oCreateData, {
    success: () => {
      this.byId('createOrderDialog').close();
      MessageToast.show(this._getText('orderCreated'));
    },
    error: (oError) => MessageBox.error(oError.message)
  });
}
```

## Model Binding Patterns

```javascript
// JSONModel for view state (not persisted)
const oViewModel = new JSONModel({ busy: false, editMode: false });
this.getView().setModel(oViewModel, 'viewModel');

// Element binding (bind view to one entity)
this.getView().bindElement({
  path: `/Orders('${orderId}')`,
  events: {
    dataRequested: () => this._setViewBusy(true),
    dataReceived: () => this._setViewBusy(false)
  }
});

// Bind table to navigation property
this.byId('itemsTable').bindItems({
  path: 'items',
  template: new ColumnListItem({ ... })
});
```

## OData V4 Model Pattern (Fiori Elements extension)

```javascript
// For custom extensions within Fiori Elements (OData V4)
sap.ui.define(['sap/ui/core/mvc/ControllerExtension'], function (ControllerExtension) {
  'use strict';

  return ControllerExtension.extend('my.namespace.ext.OrderListExtension', {
    override: {
      onBeforeRendering: function () {
        // Called before rendering — access Fiori Elements internal API
      }
    },

    onCustomAction: function (oBindingContext) {
      const sOrderId = oBindingContext.getProperty('ID');
      // Use ExtensionAPI for Fiori Elements integration
      this.base.getExtensionAPI().invokeAction('OrderService.submitForApproval', [oBindingContext]);
    }
  });
});
```

## Formatter Functions

```javascript
// webapp/model/formatter.js
sap.ui.define([], function () {
  'use strict';

  return {
    statusState: function (sStatus) {
      switch (sStatus) {
        case 'Approved':  return 'Success';
        case 'Rejected':  return 'Error';
        case 'Pending':   return 'Warning';
        default:          return 'None';
      }
    },

    formatAmount: function (fAmount, sCurrency) {
      if (!fAmount) return '';
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: sCurrency || 'EUR'
      }).format(fAmount);
    }
  };
});

// Usage in view XML:
// formatter: '.formatter.statusState'   (note the dot — references controller's formatter property)
// In controller: this.formatter = formatter;  (import formatter and expose it)
```

## Anti-Patterns

```javascript
// WRONG - global state
window.myAppData = { orders: [] };

// CORRECT - JSONModel on component
this.getOwnerComponent().setModel(new JSONModel({ orders: [] }), 'appData');


// WRONG - DOM manipulation
document.getElementById('myControl').style.display = 'none';

// CORRECT - model property drives visibility
this.getView().getModel('viewModel').setProperty('/showSection', false);
// In XML: visible="{viewModel>/showSection}"


// WRONG - accessing other view's controls
const oOtherControl = sap.ui.getCore().byId('OtherView--someButton');

// CORRECT - use routing or events to communicate between views
```

## Integration with Other Skills

- **fiori-elements**: Fiori Elements annotations generate the standard UI; use ui5-patterns for custom extensions
- **cap-handlers**: Custom actions implemented in handlers are called via OData from UI5
- **systematic-debugging**: Debug binding issues with the UI5 diagnostics tool (Ctrl+Alt+Shift+P)
