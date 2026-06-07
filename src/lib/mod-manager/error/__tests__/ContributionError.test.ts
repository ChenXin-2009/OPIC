import {
  ContributionError, ContributionIdConflictError,
  ContributionNotFoundError, CommandExecutionError,
} from '../ContributionError';

describe('ContributionError', () => {
  it('should construct with message', () => {
    const err = new ContributionError('contrib err');
    expect(err.message).toBe('contrib err');
    expect(err.name).toBe('ContributionError');
  });

  it('should construct with contributionId and modId', () => {
    const err = new ContributionError('err', 'cid', 'mod1');
    expect(err.contributionId).toBe('cid');
    expect(err.modId).toBe('mod1');
  });
});

describe('ContributionIdConflictError', () => {
  it('should construct with ids', () => {
    const err = new ContributionIdConflictError('cid', 'existingMod', 'newMod');
    expect(err.message).toContain('cid');
    expect(err.name).toBe('ContributionIdConflictError');
  });
});

describe('ContributionNotFoundError', () => {
  it('should construct with id and type', () => {
    const err = new ContributionNotFoundError('cid', 'widget');
    expect(err.message).toContain('widget');
    expect(err.name).toBe('ContributionNotFoundError');
  });
});

describe('CommandExecutionError', () => {
  it('should construct with details', () => {
    const original = new Error('cmd failed');
    const err = new CommandExecutionError('cmd1', 'mod1', original);
    expect(err.message).toContain('cmd1');
    expect(err.originalError).toBe(original);
    expect(err.name).toBe('CommandExecutionError');
  });
});
