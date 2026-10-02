# Freshservice: Accessing Service Catalog Form Data via `requested_items`

## Key Concept

Service catalog tickets store form field data in `requested_items`, **not** in ticket-level `custom_fields`. For service catalog requests, `ticket.custom_fields` is almost always `null`.

## API Endpoint

```
GET /api/v2/tickets/{id}/requested_items
```

## Response Structure

```json
{
  "requested_items": [
    {
      "id": 100001,
      "custom_fields": [
        { "name": "employee_name", "value": "Jane Doe" },
        { "name": "department", "value": "Engineering" },
        { "name": "laptop_model", "value": "MacBook Pro 16" }
      ]
    }
  ]
}
```

Each item in `requested_items` corresponds to a service item. The `custom_fields` array within each item holds the form field names and values.

## Flattening `custom_fields` into a Key-Value Map

```javascript
function flattenRequestedItems(requestedItems) {
  var fields = {};
  for (var i = 0; i < requestedItems.length; i++) {
    var cf = requestedItems[i].custom_fields || [];
    for (var j = 0; j < cf.length; j++) {
      fields[cf[j].name] = cf[j].value;
    }
  }
  return fields;
}
```

## Request Template (`config/requests.json`)

```json
{
  "getRequestedItems": {
    "schema": {
      "method": "GET",
      "host": "<%= iparam.freshservice_domain %>",
      "path": "/api/v2/tickets/<%= context.ticket_id %>/requested_items",
      "headers": {
        "Authorization": "Basic <%= encode(iparam.freshservice_api_key) %>",
        "Content-Type": "application/json"
      }
    }
  }
}
```

## Usage in Server Code

```javascript
var resp = await $request.invokeTemplate("getRequestedItems", {
  context: { ticket_id: args.data.ticket.id }
});
var body = JSON.parse(resp.response);
var fields = flattenRequestedItems(body.requested_items);
// fields.employee_name === "Jane Doe"
```

## Common Pitfall

Do **not** read `ticket.custom_fields` for service catalog data — it will be `null`. Always fetch `/requested_items` separately.
