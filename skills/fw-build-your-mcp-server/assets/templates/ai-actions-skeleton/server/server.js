/**
 * MCP server - Server Methods
 *
 * CRITICAL RULES:
 * 1. Function name MUST match actions.json key exactly (case-sensitive)
 * 2. Parameters MUST be flat (no nested objects/arrays in actions.json)
 * 3. Construct nested structures HERE, not in actions.json
 * 4. Use renderData(null, data) for success
 * 5. Use renderData({ status, message }) for errors
 * 6. Use $request.invokeTemplate() for external API calls
 * 7. Keep complexity low (max 7) - extract helpers if needed
 */

// Sanitize before `renderData`: vendor error payloads may contain internal URLs, stack traces,
// tokens, or other sensitive data. Strip or map them to short, user-safe strings for the
// `message` passed to `renderData`; log the full error server-side only.
//
const __sanitizeMessageForClient = (value) => {
  let text;
  if (value == null || value === '') {
    text = 'Unknown error';
  } else if (typeof value === 'string') {
    text = value;
  } else if (typeof value === 'object') {
    if (typeof value.message === 'string') text = value.message;
    else if (typeof value.error === 'string') text = value.error;
    else if (value.error && typeof value.error.message === 'string') text = value.error.message;
    else if (typeof value.error_description === 'string') text = value.error_description;
    else text = JSON.stringify(value);
  } else {
    text = String(value);
  }
  text = text.replace(/https?:\/\/[^\s"'<>]+/gi, '[redacted]');
  if (text.length > 400) text = `${text.slice(0, 400)}…`;
  return text;
};

const __formatError = (error, functionName) => {
  console.error(`[${functionName}] Error:`, error);
  let message;
  try {
    message = error.response ? JSON.parse(error.response) : error.message;
  } catch {
    message = error.response || error.message || 'Unknown error';
  }
  return { status: error.status || 500, message: __sanitizeMessageForClient(message) };
};

exports = {

  getResource: async function(args) {
    try {
      const { resource_id } = args;

      const response = await $request.invokeTemplate('getResource', {
        context: { resource_id: resource_id }
      });

      const responseData = JSON.parse(response.response);
      renderData(null, responseData);

    } catch (error) {
      const formattedError = __formatError(error, 'getResource');
      renderData(formattedError, null);
    }
  },

  createResource: async function(args) {
    try {
      const { name, description } = args;

      const requestBody = {
        name: name,
        description: description || ''
      };

      const response = await $request.invokeTemplate('createResource', {
        body: JSON.stringify(requestBody)
      });

      const responseData = JSON.parse(response.response);
      renderData(null, responseData);

    } catch (error) {
      const formattedError = __formatError(error, 'createResource');
      renderData(formattedError, null);
    }
  }

};
