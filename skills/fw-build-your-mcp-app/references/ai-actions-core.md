---
description: MCP app core concepts - Critical rules that apply when working with Freshworks Platform 3.0 actions
alwaysApply: true
---

# MCP app core concepts

An MCP app (build your own MCP server) extends automation flows in Freshworks products (Freshdesk, Freshchat, CRM, Freshcaller).

## Critical Constraints

### Request Schema Rules (MUST FOLLOW)

**Request schemas MUST be flat:**
- ❌ NEVER use nested objects in request parameters
- ✅ Arrays of primitives ARE allowed: `"type": "array", "items": {"type": "string"}`
- ❌ Arrays of objects NOT allowed: `"type": "array", "items": {"type": "object"}`
- ✅ ALWAYS keep request schema flat (single level)
- ✅ Supported types: `string`, `number`, `boolean`, `integer`
- ✅ Supported: arrays of primitives (`array` with primitive items)
- ❌ NOT supported: nested `object`, arrays of objects, `null`

**Example - WRONG:**
```json
{
  "createContact": {
    "parameters": {
      "properties": {
        "contact": {
          "type": "object",  // ❌ INVALID
          "properties": { ... }
        }
      }
    }
  }
}
```

**Example - CORRECT:**
```json
{
  "createContact": {
    "parameters": {
      "properties": {
        "name": { "type": "string" },
        "email": { "type": "string" }
      },
      "required": ["name", "email"]
    }
  }
}
```

### Handling Nested Structures

**Problem:** API requires nested object/array, but request schema must be flat.

**Solution:** Construct nested structures in `server.js`:

```javascript
exports = {
  createContact: async function(args) {
    const { name, email } = args;
    
    // Construct nested object for API
    const requestBody = {
      contact: { name, email }
    };
    
    const response = await $request.invokeTemplate('createContactRequest', {
      body: JSON.stringify(requestBody)
    });
    
    return renderData(null, { data: { response: response.response } });
  }
};
```

### Response Schema Rules

- ✅ Response schemas CAN have nested objects and arrays
- ✅ Include only essential fields (not entire API response)
- ✅ Make fields optional by default (only IDs required)
- ✅ Pass responses through as-is when possible

### Function Naming

- ✅ Case-sensitive: `createContact` ≠ `CreateContact`
- ✅ Alphanumeric + underscores: `create_contact`
- ✅ Length: 2-40 characters
- ❌ Must NOT start with number
- ❌ Must NOT contain spaces or hyphens

**CRITICAL:** Function name in `actions.json` MUST match function name in `server.js` exactly.

### renderData() Method

**Success:**
```javascript
renderData(null, { data: { response: responseData } });
```

**Error:**
```javascript
renderData({ status: 500, message: "Error message" });
```

**CRITICAL:** First argument is ALWAYS error object (or `null` for success).

## File Structure

```
app-root/
├── actions.json          # Action definitions (schemas)
└── server/
    └── server.js         # SMI function implementations
```

## When working with an MCP app

For detailed implementation guidance, refer to the comprehensive MCP app guide which loads automatically when you open `actions.json` or `server.js` files.

Use the official Freshworks developer docs for platform details (e.g. [App SDK introduction](https://developers.freshworks.com/docs/app-sdk/v3.0/common/introduction/)).
