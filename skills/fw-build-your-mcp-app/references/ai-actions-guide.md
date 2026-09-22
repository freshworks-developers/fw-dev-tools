---
description: Build your own MCP server on Freshworks Platform 3.0. Implementation guide for actions.json and server.js.
globs:
  - "**/actions.json"
  - "**/server/server.js"
alwaysApply: false
---

# Build your own MCP server — implementation guide

**CRITICAL:** This guide is how an MCP app is implemented. For core concepts, see `ai-actions-core.md`. This guide is loaded when working with `actions.json` or `server.js` files.

---

## What is an MCP app?

An MCP app is how you build your own MCP server on Platform 3.0. Each tool is an `actions.json` entry with:
- A unique function name
- Input JSON Schema (request parameters)
- Response JSON Schema (output structure)
- A backend callback (SMI function) with the SAME name that executes the action

**Purpose:** Makes tool/function calling predictable for UIs, assistants, and automations that can:
- Introspect available actions
- Validate inputs against schemas
- Handle typed responses

**Invocation:** Actions are triggered by:
- Platform events (e.g., onTicketCreate)
- Workflow automator
- Frontend app components

---

## Supported Products

MCP apps are available in:
- ✅ Freshdesk
- ✅ Freshchat
- ✅ Freshworks CRM
- ✅ Freshcaller

---

## File Structure

MCP apps require two files:

```
app-root/
├── actions.json          # Action definitions (schemas, parameters, responses)
└── server/
    └── server.js         # SMI function implementations
```

**CRITICAL:** The function name in `actions.json` MUST match the function name in `server.js` (case-sensitive).

---

## actions.json Schema Structure

### Complete Schema Template

```json
{
  "<functionCallbackName>": {
    "display_name": "<human-readable action name>",
    "description": "<clear description of what this action does>",
    "parameters": {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "object",
      "properties": {
        "<input_field1>": {
          "type": "string",
          "description": "<field description>"
        },
        "<input_field2>": {
          "type": "number",
          "description": "<field description>"
        }
      },
      "required": ["<input_field1>"]
    },
    "response": {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "object",
      "properties": {
        "<response_field1>": {
          "type": "string",
          "description": "<field description>"
        },
        "<response_field2>": {
          "type": "object",
          "description": "<nested object description>",
          "properties": {
            "nested_field": {
              "type": "string"
            }
          }
        }
      },
      "required": ["<response_field1>"]
    }
  }
}
```

---

## Request Schema Rules (CRITICAL CONSTRAINTS)

### ✅ ALWAYS Follow These Rules:

1. **Flat Structure Only**
   - ❌ NEVER use nested objects in request parameters
   - ❌ NEVER use arrays in request parameters
   - ✅ ALWAYS keep request schema flat (single level)

2. **Field Types**
   - ✅ Supported types: `string`, `number`, `boolean`, `integer`
   - ❌ NOT supported: `object`, `array`, `null`

3. **Required Fields**
   - ✅ Mark essential fields as `required`
   - ✅ Use `required` array to list mandatory fields

### ❌ WRONG - Nested Object in Request Schema

```json
{
  "createContact": {
    "parameters": {
      "type": "object",
      "properties": {
        "contact": {
          "type": "object",          // ❌ INVALID - nested object
          "properties": {
            "name": { "type": "string" },
            "email": { "type": "string" }
          }
        }
      }
    }
  }
}
```

### ❌ WRONG - Array in Request Schema

```json
{
  "bulkCreateContacts": {
    "parameters": {
      "type": "object",
      "properties": {
        "contacts": {
          "type": "array",           // ❌ INVALID - array not allowed
          "items": {
            "type": "object"
          }
        }
      }
    }
  }
}
```

### ✅ CORRECT - Flat Request Schema

```json
{
  "createContact": {
    "display_name": "Create Contact",
    "description": "Creates a new contact in the system",
    "parameters": {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "object",
      "properties": {
        "name": {
          "type": "string",
          "description": "Contact name"
        },
        "email": {
          "type": "string",
          "description": "Contact email address"
        },
        "phone": {
          "type": "string",
          "description": "Contact phone number"
        },
        "company": {
          "type": "string",
          "description": "Company name"
        }
      },
      "required": ["name", "email"]
    }
  }
}
```

---

## Handling Nested Objects/Arrays in API Calls

**Problem:** API requires nested object or array, but request schema must be flat.

**Solution:** Construct nested structures in `server.js` SMI function.

### Example: API Requires Nested Object

**API Requirement:**
```json
POST /api/contacts
{
  "contact": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Step 1: Flat Request Schema in actions.json**
```json
{
  "createContact": {
    "parameters": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "email": { "type": "string" }
      },
      "required": ["name", "email"]
    }
  }
}
```

**Step 2: Construct Nested Object in server.js**
```javascript
exports = {
  createContact: async function(args) {
    const { name, email } = args;
    
    // Construct nested object for API
    const requestBody = {
      contact: {
        name: name,
        email: email
      }
    };
    
    try {
      const response = await $request.invokeTemplate('createContactRequest', {
        context: {},
        body: JSON.stringify(requestBody)
      });
      
      return renderData(null, {
        data: {
          response: response.response
        }
      });
    } catch (error) {
      return renderData({ status: 500, message: error.message });
    }
  }
};
```

### Example: API Requires Array

**API Requirement:**
```json
POST /api/contacts/bulk
{
  "contacts": [
    { "name": "John", "email": "john@example.com" }
  ]
}
```

**Step 1: Flat Request Schema (Single Object)**
```json
{
  "createContact": {
    "parameters": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "email": { "type": "string" }
      },
      "required": ["name", "email"]
    }
  }
}
```

**Step 2: Construct Array with Single Object in server.js**
```javascript
exports = {
  createContact: async function(args) {
    const { name, email } = args;
    
    // Construct array with single object for API
    const requestBody = {
      contacts: [
        {
          name: name,
          email: email
        }
      ]
    };
    
    try {
      const response = await $request.invokeTemplate('bulkCreateContactRequest', {
        context: {},
        body: JSON.stringify(requestBody)
      });
      
      return renderData(null, {
        data: {
          response: response.response
        }
      });
    } catch (error) {
      return renderData({ status: 500, message: error.message });
    }
  }
};
```

**CRITICAL:** You can only create single objects, NOT bulk operations, since array support is not available in request schemas.

---

## Response Schema Rules

### ✅ ALWAYS Follow These Rules:

1. **Include Only Essential Fields**
   - ✅ Include only fields that will be used by other actions or workflows
   - ❌ DO NOT generate schemas for the entire API response
   - ✅ Keep response schema minimal and focused

2. **Nested Objects ARE Allowed**
   - ✅ Response schemas CAN support nested objects
   - ✅ Response schemas CAN support multiple layers
   - ✅ Use nested objects when API returns structured data

3. **Field Optionality**
   - ✅ Make response fields **optional (nullable)** by default
   - ✅ Only mark IDs as required (they must always be present)
   - ❌ DO NOT mark all fields as required

4. **Arrays in Responses**
   - ✅ Arrays ARE allowed in response schemas
   - ✅ Use arrays for list responses
   - ✅ Use objects for single-item responses

5. **Pass Through Responses**
   - ✅ Avoid unnecessary transformation of responses
   - ✅ Pass responses through as-is when possible
   - ✅ Additional fields in response are allowed by default

### ✅ CORRECT - Minimal Response Schema

```json
{
  "createContact": {
    "response": {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "description": "Contact ID"
        },
        "name": {
          "type": "string",
          "description": "Contact name"
        },
        "email": {
          "type": "string",
          "description": "Contact email"
        }
      },
      "required": ["id"]
    }
  }
}
```

### ✅ CORRECT - Nested Response Schema

```json
{
  "getContact": {
    "response": {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "description": "Contact ID"
        },
        "contact": {
          "type": "object",
          "description": "Contact details",
          "properties": {
            "name": { "type": "string" },
            "email": { "type": "string" },
            "address": {
              "type": "object",
              "properties": {
                "street": { "type": "string" },
                "city": { "type": "string" }
              }
            }
          }
        }
      },
      "required": ["id"]
    }
  }
}
```

### ✅ CORRECT - Array Response Schema

```json
{
  "listContacts": {
    "response": {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "object",
      "properties": {
        "contacts": {
          "type": "array",
          "description": "List of contacts",
          "items": {
            "type": "object",
            "properties": {
              "id": { "type": "string" },
              "name": { "type": "string" },
              "email": { "type": "string" }
            }
          }
        },
        "total": {
          "type": "number",
          "description": "Total number of contacts"
        }
      },
      "required": ["contacts"]
    }
  }
}
```

---

## Function Naming Rules

**CRITICAL:** Function names must follow strict naming conventions.

### ✅ Valid Function Names:

- **Case-sensitive**: `createContact` ≠ `CreateContact`
- **Alphanumeric**: `[a-z]`, `[A-Z]`, `[0-9]`
- **Underscores allowed**: `create_contact`, `get_ticket_status`
- **Length**: 2 to 40 characters
- **Must NOT start with number**: ❌ `1createContact`
- **Must NOT contain spaces**: ❌ `create contact`

### ✅ CORRECT Examples:

```
createContact
getTicketStatus
update_user_profile
fetchData123
syncContacts_v2
```

### ❌ WRONG Examples:

```
1createContact        // ❌ Starts with number
create contact        // ❌ Contains space
create-contact        // ❌ Contains hyphen (use underscore)
c                     // ❌ Too short (< 2 chars)
thisIsAVeryLongFunctionNameThatExceedsFortyCharacters  // ❌ Too long (> 40 chars)
```

---

## SMI Function Implementation in server.js

### Complete SMI Function Template

```javascript
exports = {
  <functionCallbackName>: async function(args) {
    // Extract parameters from args
    const { param1, param2 } = args;
    
    // Construct request body (if API requires nested structure)
    const requestBody = {
      // Transform flat parameters to API-required structure
    };
    
    try {
      // Call external API using request template
      const response = await $request.invokeTemplate('apiRequestTemplate', {
        context: {
          // Context variables for request template
        },
        body: JSON.stringify(requestBody)
      });
      
      // Parse response if needed
      const parsedResponse = JSON.parse(response.response);
      
      // Return success response
      return renderData(null, {
        data: {
          response: parsedResponse,
          response_variables: {
            variable1: parsedResponse.id,
            variable2: parsedResponse.status
          }
        }
      });
      
    } catch (error) {
      console.error('Error in action:', error);
      
      // Return error response
      return renderData({
        status: error.status || 500,
        message: error.message || 'Action failed'
      });
    }
  }
};
```

### renderData() Method Rules

**Signature:** `renderData(error, data)`

**Success Response:**
```javascript
renderData(null, {
  data: {
    response: responseData,
    response_variables: {
      key1: value1,
      key2: value2
    }
  }
});
```

**Error Response:**
```javascript
renderData({
  status: 403,
  message: "Error while processing the request"
});
```

**CRITICAL:**
- ✅ First argument is ALWAYS `error` object (or `null` for success)
- ✅ For success, pass `null` as first argument
- ✅ For error, pass object with `status` and `message`

---

## Using Request Templates for External APIs

**CRITICAL:** ALWAYS use request templates for third-party API calls.

### Step 1: Define Request Template in config/requests.json

```json
{
  "createContactRequest": {
    "schema": {
      "protocol": "https",
      "method": "POST",
      "host": "api.example.com",
      "path": "/v1/contacts",
      "headers": {
        "Authorization": "Bearer <%= iparam.api_key %>",
        "Content-Type": "application/json"
      }
    }
  }
}
```

### Step 2: Declare Request in manifest.json

```json
{
  "modules": {
    "common": {
      "requests": {
        "createContactRequest": {}
      }
    }
  }
}
```

### Step 3: Use in SMI Function

```javascript
exports = {
  createContact: async function(args) {
    const response = await $request.invokeTemplate('createContactRequest', {
      context: {},
      body: JSON.stringify({ name: args.name, email: args.email })
    });
    
    return renderData(null, { data: { response: response.response } });
  }
};
```

**Note:** Third-party libraries (like axios) can ONLY be used with proper justification if request templates are unable to make the API call.

---

## Authentication Methods

### API Key Authentication

```json
{
  "apiRequest": {
    "schema": {
      "headers": {
        "Authorization": "Bearer <%= iparam.api_key %>"
      }
    }
  }
}
```

### OAuth Authentication

```json
{
  "oauthRequest": {
    "schema": {
      "headers": {
        "Authorization": "Bearer <%= access_token %>"
      }
    },
    "options": {
      "oauth": "oauth_integration_name"
    }
  }
}
```

**CRITICAL:** Confirm authentication patterns against official vendor documentation and Freshworks App SDK / OAuth docs ([developers.freshworks.com](https://developers.freshworks.com/docs/app-sdk/v3.0/common/introduction/)).

---

## Testing Actions

### Step 1: Create Test Data

Create sample payload JSON files in `<app root>/server/test_data/`:

```json
{
  "name": "John Doe",
  "email": "john@example.com"
}
```

### Step 2: Run FDK Test Server

```bash
cd <app-directory>
fdk run
```

### Step 3: Test in Browser

1. Open `https://localhost:10001/web/test`
2. From **Select type**, choose `actions`
3. In **Select an action**, choose the action to test
4. Edit payload if needed
5. Click **Simulate**
   - **Success**: Action worked
   - **Failed**: Invalid payload or implementation error

---

## Validation Checklist

Before finalizing actions, verify:

### actions.json Validation:
- [ ] Function names are 2-40 characters, alphanumeric + underscores
- [ ] Function names do NOT start with numbers
- [ ] Request schema is FLAT (no nested objects or arrays)
- [ ] Response schema includes only essential fields
- [ ] IDs are marked as required in response schema
- [ ] All fields have clear descriptions
- [ ] `$schema` is set to `http://json-schema.org/draft-07/schema#`

### server.js Validation:
- [ ] Function name matches `actions.json` exactly (case-sensitive)
- [ ] Uses `$request.invokeTemplate()` for external API calls
- [ ] Constructs nested objects/arrays in function body (not in schema)
- [ ] Uses `renderData(null, data)` for success
- [ ] Uses `renderData(error)` for errors
- [ ] Includes error handling with try-catch
- [ ] Logs errors with `console.error()`

### manifest.json Validation:
- [ ] All request templates declared in `modules.common.requests`

### General Validation:
- [ ] Run `fdk validate` and fix all errors
- [ ] Test action using FDK test server
- [ ] Verify response matches schema

---

## Common Mistakes to Avoid

### ❌ MISTAKE 1: Nested Objects in Request Schema

```json
// ❌ WRONG
{
  "createContact": {
    "parameters": {
      "properties": {
        "contact": {
          "type": "object",  // ❌ NOT ALLOWED
          "properties": { ... }
        }
      }
    }
  }
}
```

**Fix:** Keep request schema flat, construct nested object in `server.js`.

### ❌ MISTAKE 2: Arrays in Request Schema

```json
// ❌ WRONG
{
  "bulkCreate": {
    "parameters": {
      "properties": {
        "items": {
          "type": "array"  // ❌ NOT ALLOWED
        }
      }
    }
  }
}
```

**Fix:** Accept single object parameters, construct array in `server.js`.

### ❌ MISTAKE 3: Including Entire API Response in Schema

```json
// ❌ WRONG - Too many fields
{
  "getContact": {
    "response": {
      "properties": {
        "id": { ... },
        "name": { ... },
        "email": { ... },
        "created_at": { ... },
        "updated_at": { ... },
        "metadata": { ... },
        "internal_id": { ... },
        // ... 20 more fields
      }
    }
  }
}
```

**Fix:** Include only essential fields that will be used by other actions.

### ❌ MISTAKE 4: Function Name Mismatch

```json
// actions.json
{
  "createContact": { ... }
}
```

```javascript
// server.js
exports = {
  CreateContact: function(args) { ... }  // ❌ WRONG - case mismatch
};
```

**Fix:** Ensure exact match (case-sensitive).

### ❌ MISTAKE 5: Not Using Request Templates

```javascript
// ❌ WRONG - Using axios directly
const axios = require('axios');

exports = {
  createContact: async function(args) {
    const response = await axios.post('https://api.example.com/contacts', args);
    return renderData(null, { data: { response: response.data } });
  }
};
```

**Fix:** Use `$request.invokeTemplate()` with request templates.

### ❌ MISTAKE 6: Incorrect renderData() Usage

```javascript
// ❌ WRONG - Missing null for success
renderData({ data: { response: data } });

// ❌ WRONG - Error as second argument
renderData(null, { status: 500, message: 'Error' });
```

**Fix:**
```javascript
// ✅ CORRECT - Success
renderData(null, { data: { response: data } });

// ✅ CORRECT - Error
renderData({ status: 500, message: 'Error' });
```

---

## Best Practices

### 1. Clear Descriptions
- ✅ Write clear, concise descriptions for actions and fields
- ✅ Explain what each parameter does
- ✅ Document expected formats (e.g., "ISO 8601 date string")

### 2. Minimal Response Schemas
- ✅ Include only fields that will be used by other actions
- ✅ Avoid over-specifying response structure
- ✅ Let additional fields pass through by default

### 3. Error Handling
- ✅ Always use try-catch in SMI functions
- ✅ Log errors with `console.error()`
- ✅ Return meaningful error messages
- ✅ Include HTTP status codes in errors

### 4. Request Template Usage
- ✅ Define all external API calls as request templates
- ✅ Use `<%= iparam.variable %>` for installation parameters
- ✅ Use `<%= access_token %>` for OAuth
- ✅ Declare all request templates in manifest.json

### 5. Testing
- ✅ Create comprehensive test payloads
- ✅ Test both success and error scenarios
- ✅ Validate response structure matches schema
- ✅ Test with FDK test server before deployment

### 6. Documentation
- ✅ Document each action's purpose
- ✅ Provide example payloads
- ✅ Document required vs optional fields
- ✅ Include authentication requirements

---

## Summary

**Key Takeaways:**

1. **Request schemas MUST be flat** - No nested objects or arrays
2. **Response schemas CAN be nested** - Include only essential fields
3. **Function names MUST match exactly** - Case-sensitive, alphanumeric + underscores
4. **Use request templates** - For all external API calls
5. **Use renderData() correctly** - `null` for success, error object for failures
6. **Construct complex structures in server.js** - Not in schemas
7. **Test thoroughly** - Use FDK test server before deployment

**When in doubt:**
- Use official Freshworks developer documentation and vendor API docs for specifics
- Follow the examples in this guide
- Run `fdk validate` to catch errors early

---

## References

Use [Freshworks developer documentation](https://developers.freshworks.com/docs/app-sdk/v3.0/common/introduction/) and this guide for:
- Creating **`actions.json`** on Platform 3.0
- Implementing SMI functions in **`server.js`**
- Request templates for external APIs
- OAuth and secure configuration
- Testing with the FDK test server
