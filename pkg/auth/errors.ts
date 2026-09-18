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
