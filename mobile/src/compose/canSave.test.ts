import { canSave } from './canSave';

describe('canSave', () => {
  it('allows a note and one to five photos', () => {
    expect(canSave('Crack in the stair', 1)).toBe(true);
    expect(canSave('Crack in the stair', 5)).toBe(true);
  });

  it('blocks a blank note, zero photos, and a sixth photo', () => {
    expect(canSave('   ', 1)).toBe(false);
    expect(canSave('Crack in the stair', 0)).toBe(false);
    expect(canSave('Crack in the stair', 6)).toBe(false);
  });

  it('blocks a note longer than 500 characters', () => {
    expect(canSave('a'.repeat(501), 1)).toBe(false);
    expect(canSave('a'.repeat(500), 1)).toBe(true);
  });
});
