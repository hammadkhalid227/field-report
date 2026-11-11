import { failureForStatus } from './httpTransport';

describe('server failures', () => {
  it('retries when the server is unavailable', () => {
    expect(failureForStatus(503, 'The server is unavailable').retryable).toBe(
      true,
    );
    expect(failureForStatus(429, 'Slow down').retryable).toBe(true);
  });

  it('stops when the server rejects the request', () => {
    expect(failureForStatus(422, 'Rejected').retryable).toBe(false);
    expect(failureForStatus(400, 'Bad request').retryable).toBe(false);
  });
});
