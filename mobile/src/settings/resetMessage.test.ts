import { resetMessage } from './resetMessage';

describe('resetMessage', () => {
  it('names one unsent report', () => {
    expect(resetMessage(1)).toBe(
      'This removes 1 report that has not reached the server. Reports already on the server stay there.',
    );
  });

  it('names several unsent reports', () => {
    expect(resetMessage(3)).toContain('3 reports');
    expect(resetMessage(3)).toContain(
      'Reports already on the server stay there.',
    );
  });

  it('still says the server is kept when nothing is unsent', () => {
    expect(resetMessage(0)).toBe(
      'This clears the saved list on this phone. Reports already on the server stay there.',
    );
  });
});
