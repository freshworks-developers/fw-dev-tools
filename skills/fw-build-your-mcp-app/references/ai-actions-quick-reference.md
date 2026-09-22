# MCP app Quick Reference

## File Structure

```
app-root/
├── actions.json          # Action definitions
└── server/
    └── server.js         # SMI implementations
```

---

## actions.json Template

```json
{
  "functionName": {
    "display_name": "Human Readable Name",
    "description": "What this action does",
    "parameters": {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "object",
      "properties": {
        "field1": { "type": "string", "description": "Field description" },
        "field2": { "type": "number", "description": "Field description" }
      },
      "required": ["field1"]
    },
    "response": {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "object",
      "properties": {
        "id": { "type": "string", "description": "Resource ID" },
        "status": { "type": "string", "description": "Status" }
      },
      "required": ["id"]
    }
  }
}
```

---

## server.js Template

```javascript
exports = {
  functionName: async function(args) {
    const { field1, field2 } = args;
    
    try {
      const response = await $request.invokeTemplate('requestTemplate', {
        context: {},
        body: JSON.stringify({ field1, field2 })
      });
      
      return renderData(null, {
        data: {
          response: JSON.parse(response.response)
        }
      });
      
    } catch (error) {
      return renderData({
        status: error.status || 500,
        message: error.message || 'Action failed'
      });
    }
  }
};
```

---

## Critical Rules

### Request Schema
- ✅ MUST be flat (no nested objects)
- ✅ MUST NOT contain arrays
- ✅ Supported types: string, number, boolean, integer
- ❌ NOT supported: object, array, null

### Response Schema
- ✅ CAN be nested
- ✅ CAN contain arrays
- ✅ Include only essential fields
- ✅ Mark only IDs as required

### Function Names
- ✅ 2-40 characters
- ✅ Alphanumeric + underscores
- ✅ Case-sensitive
- ❌ Cannot start with number
- ❌ Cannot contain spaces/hyphens

---

## Handling Nested API Requirements

**Problem:** API requires nested object, but request schema must be flat.

**Solution:** Construct in server.js

```javascript
// Flat request schema
{
  "parameters": {
    "properties": {
      "name": { "type": "string" },
      "email": { "type": "string" }
    }
  }
}

// Construct nested in server.js
exports = {
  createContact: async function(args) {
    const requestBody = {
      contact: {  // Nest here
        name: args.name,
        email: args.email
      }
    };
    
    const response = await $request.invokeTemplate('api', {
      body: JSON.stringify(requestBody)
    });
  }
};
```

---

## renderData() Usage

**Success:**
```javascript
renderData(null, {
  data: {
    response: responseData,
    response_variables: { key: value }
  }
});
```

**Error:**
```javascript
renderData({
  status: 500,
  message: "Error message"
});
```

---

## Testing

```bash
# Start FDK test server
fdk run

# Open in browser
https://localhost:10001/web/test

# Select type: actions
# Select action to test
# Edit payload
# Click Simulate
```

---

## Validation Checklist

- [ ] Function name matches in actions.json and server.js
- [ ] Request schema is flat
- [ ] Response includes only essential fields
- [ ] Uses $request.invokeTemplate() for API calls
- [ ] Uses renderData() correctly
- [ ] Includes error handling
- [ ] Request template declared in manifest.json
- [ ] Run `fdk validate`

---

## Common Mistakes

1. **Nested objects in request** → Keep flat, construct in server.js
2. **Arrays in request** → Not allowed, construct in server.js
3. **Function name mismatch** → Must match exactly (case-sensitive)
4. **Not using request templates** → Always use $request.invokeTemplate()
5. **Incorrect renderData()** → First arg is error (or null)
6. **Too many response fields** → Include only essentials

---

## Full Guide

For complete details, see: `.cursor/rules/ai-actions.mdc`
