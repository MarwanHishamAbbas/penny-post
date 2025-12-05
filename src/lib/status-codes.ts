export const HttpStatus = {
  // 2xx Success
  OK: 200, // GET, PUT - request successful
  CREATED: 201, // POST - resource created
  ACCEPTED: 202, // Request accepted, processing later
  NO_CONTENT: 204, // DELETE - success, nothing to return

  // 3xx Redirection
  MOVED_PERMANENTLY: 301, // Resource moved permanently
  FOUND: 302, // Resource found at different URL
  NOT_MODIFIED: 304, // Cached version is still valid

  // 4xx Client Errors
  BAD_REQUEST: 400, // Invalid syntax, bad query params
  UNAUTHORIZED: 401, // Not logged in, no token
  FORBIDDEN: 403, // Logged in but no permission
  NOT_FOUND: 404, // Resource doesn't exist
  METHOD_NOT_ALLOWED: 405, // Wrong HTTP method
  CONFLICT: 409, // Duplicate entry, already exists
  GONE: 410, // Resource deleted permanently
  UNPROCESSABLE_ENTITY: 422, // Validation failed
  TOO_MANY_REQUESTS: 429, // Rate limited

  // 5xx Server Errors
  INTERNAL_SERVER_ERROR: 500, // Something broke on the server
  NOT_IMPLEMENTED: 501, // Feature not built yet
  BAD_GATEWAY: 502, // Upstream server error
  SERVICE_UNAVAILABLE: 503, // Server down or overloaded
  GATEWAY_TIMEOUT: 504, // Upstream server timeout
} as const;
