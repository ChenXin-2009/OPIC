import { ErrorFormatter } from '../ErrorFormatter';
import { PermissionDeniedError, InvalidPermissionError } from '../PermissionError';
import { QuotaExceededError, ResourceLeakError } from '../SandboxError';
import { ServiceNotFoundError, ServiceAccessDeniedError, CircularDependencyError as ServiceCircularDependencyError } from '../ServiceError';
import { ContributionIdConflictError, CommandExecutionError } from '../ContributionError';

describe('ErrorFormatter', () => {
  it('should format PermissionDeniedError', () => {
    const err = new PermissionDeniedError('mod1', 'read', 'not allowed');
    const formatted = ErrorFormatter.format(err);
    expect(formatted.title).toContain('权限');
    expect(formatted.severity).toBe('error');
  });

  it('should format InvalidPermissionError', () => {
    const err = new InvalidPermissionError('mod1', 'admin', 'bad format');
    const formatted = ErrorFormatter.format(err);
    expect(formatted.title).toContain('格式');
  });

  it('should format QuotaExceededError', () => {
    const err = new QuotaExceededError('mod1', 'memory', 100, 200);
    const formatted = ErrorFormatter.format(err);
    expect(formatted.title).toContain('配额');
  });

  it('should format ResourceLeakError', () => {
    const err = new ResourceLeakError('mod1', 'sockets', 5);
    const formatted = ErrorFormatter.format(err);
    expect(formatted.title).toContain('资源泄漏');
    expect(formatted.severity).toBe('warning');
  });

  it('should format ServiceNotFoundError', () => {
    const err = new ServiceNotFoundError('svc1');
    const formatted = ErrorFormatter.format(err);
    expect(formatted.title).toContain('未找到');
  });

  it('should format ServiceAccessDeniedError', () => {
    const err = new ServiceAccessDeniedError('svc1', 'mod1', 'no permission');
    const formatted = ErrorFormatter.format(err);
    expect(formatted.title).toContain('访问被拒绝');
  });

  it('should format Service CircularDependencyError', () => {
    const err = new ServiceCircularDependencyError(['a', 'b', 'c']);
    const formatted = ErrorFormatter.format(err);
    expect(formatted.title).toContain('循环依赖');
  });

  it('should format ContributionIdConflictError', () => {
    const err = new ContributionIdConflictError('cid', 'existing', 'new');
    const formatted = ErrorFormatter.format(err);
    expect(formatted.title).toContain('冲突');
  });

  it('should format CommandExecutionError', () => {
    const err = new CommandExecutionError('cmd1', 'mod1', new Error('fail'));
    const formatted = ErrorFormatter.format(err);
    expect(formatted.title).toContain('执行失败');
  });

  it('should format generic error', () => {
    const err = new Error('something went wrong');
    const formatted = ErrorFormatter.format(err);
    expect(formatted.title).toBe('发生错误');
  });

  it('should formatAsText', () => {
    const err = new Error('test error');
    const text = ErrorFormatter.formatAsText(err);
    expect(text).toContain('ERROR');
    expect(text).toContain('test error');
  });

  it('should formatAsHTML', () => {
    const err = new Error('test error');
    const html = ErrorFormatter.formatAsHTML(err);
    expect(html).toContain('<div');
    expect(html).toContain('test error');
    expect(html).toContain('</div>');
  });
});
