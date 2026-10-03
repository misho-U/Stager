/**
 * Auth failures, split so route handlers can map them to the right status.
 *
 * The distinction matters: 401 tells the browser to go log in, 403 tells it
 * that logging in again will not help.
 */
export class UnauthenticatedError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'UnauthenticatedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'You do not have access to this resource') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * The sign-in service could not be asked whether anyone is signed in: an
 * outage, not a signed-out visitor. Answered with 503, never a trip to the
 * login page, which could not sign anyone in either (see isAuthOutage).
 */
export class AuthUnavailableError extends Error {
  constructor(message = 'The sign-in service cannot be reached') {
    super(message);
    this.name = 'AuthUnavailableError';
  }
}
