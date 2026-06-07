import { Logger, LogLevel, parseLogLevel, configureLoggerFromEnv, logger } from '../logger';

describe('Logger', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should create logger with default config', () => {
    const log = new Logger();
    expect(log.getLevel()).toBe(LogLevel.INFO);
  });

  it('should create logger with custom config', () => {
    const log = new Logger({ level: LogLevel.DEBUG, json: true, colorize: false, prefix: 'test' });
    expect(log.getLevel()).toBe(LogLevel.DEBUG);
  });

  it('should set and get level', () => {
    const log = new Logger();
    log.setLevel(LogLevel.ERROR);
    expect(log.getLevel()).toBe(LogLevel.ERROR);
  });

  it('should log debug messages at DEBUG level', () => {
    const log = new Logger({ level: LogLevel.DEBUG });
    log.debug('test debug');
    expect(consoleLogSpy).toHaveBeenCalled();
  });

  it('should not log debug messages at INFO level', () => {
    const log = new Logger({ level: LogLevel.INFO });
    log.debug('test debug');
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('should log info messages', () => {
    const log = new Logger({ level: LogLevel.INFO });
    log.info('test info');
    expect(consoleLogSpy).toHaveBeenCalled();
  });

  it('should log warn messages to console.warn', () => {
    const log = new Logger({ level: LogLevel.INFO });
    log.warn('test warn');
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  it('should log error messages to console.error', () => {
    const log = new Logger({ level: LogLevel.INFO });
    log.error('test error');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should include context in structured output', () => {
    const log = new Logger({ level: LogLevel.INFO, colorize: false });
    log.info('test', { key: 'value' });
    const output = consoleLogSpy.mock.calls[0][0];
    expect(output).toContain('test');
    expect(output).toContain('"key":"value"');
  });

  it('should output JSON format when configured', () => {
    const log = new Logger({ level: LogLevel.INFO, json: true, colorize: false });
    log.info('json test');
    const output = consoleLogSpy.mock.calls[0][0];
    const parsed = JSON.parse(output);
    expect(parsed.message).toBe('json test');
    expect(parsed.level).toBe('INFO');
    expect(parsed.timestamp).toBeDefined();
  });

  it('should not apply colorize when colorize is false', () => {
    const log = new Logger({ level: LogLevel.INFO, colorize: false });
    log.info('no color');
    const output = consoleLogSpy.mock.calls[0][0];
    expect(output).not.toContain('\x1b[');
  });

  it('should apply colorize when colorize is true', () => {
    const log = new Logger({ level: LogLevel.INFO, colorize: true });
    log.info('with color');
    const output = consoleLogSpy.mock.calls[0][0];
    expect(output).toContain('\x1b[');
  });

  it('should include prefix in output', () => {
    const log = new Logger({ level: LogLevel.INFO, colorize: false, prefix: 'MYAPP' });
    log.info('prefixed');
    const output = consoleLogSpy.mock.calls[0][0];
    expect(output).toContain('[MYAPP]');
  });

  it('should create child logger with combined prefix', () => {
    const parent = new Logger({ level: LogLevel.INFO, colorize: false, prefix: 'app' });
    const child = parent.child('db');
    child.info('child test');
    const output = consoleLogSpy.mock.calls[0][0];
    expect(output).toContain('[app:db]');
  });

  it('should include error stack in output', () => {
    const log = new Logger({ level: LogLevel.INFO, colorize: false });
    const err = new Error('test error');
    log.error('error occurred', err);
    const output = consoleErrorSpy.mock.calls[0][0];
    expect(output).toContain('test error');
    expect(output).toContain('Error: test error');
  });

  it('should filter messages below configured level', () => {
    const log = new Logger({ level: LogLevel.WARN });
    log.info('should not appear');
    log.warn('should appear');
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalled();
  });
});

describe('parseLogLevel', () => {
  it('should parse DEBUG', () => {
    expect(parseLogLevel('DEBUG')).toBe(LogLevel.DEBUG);
  });

  it('should parse INFO', () => {
    expect(parseLogLevel('INFO')).toBe(LogLevel.INFO);
  });

  it('should parse WARN', () => {
    expect(parseLogLevel('WARN')).toBe(LogLevel.WARN);
  });

  it('should parse WARNING', () => {
    expect(parseLogLevel('WARNING')).toBe(LogLevel.WARN);
  });

  it('should parse ERROR', () => {
    expect(parseLogLevel('ERROR')).toBe(LogLevel.ERROR);
  });

  it('should parse SILENT', () => {
    expect(parseLogLevel('SILENT')).toBe(LogLevel.SILENT);
  });

  it('should parse NONE', () => {
    expect(parseLogLevel('NONE')).toBe(LogLevel.SILENT);
  });

  it('should return INFO for unknown level', () => {
    expect(parseLogLevel('UNKNOWN')).toBe(LogLevel.INFO);
  });

  it('should be case-insensitive', () => {
    expect(parseLogLevel('debug')).toBe(LogLevel.DEBUG);
    expect(parseLogLevel('Debug')).toBe(LogLevel.DEBUG);
  });
});

describe('configureLoggerFromEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.AUDIT_LOG_LEVEL;
    delete process.env.LOG_LEVEL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should configure from AUDIT_LOG_LEVEL', () => {
    process.env.AUDIT_LOG_LEVEL = 'DEBUG';
    configureLoggerFromEnv();
    expect(logger.getLevel()).toBe(LogLevel.DEBUG);
  });

  it('should configure from LOG_LEVEL when AUDIT_LOG_LEVEL is not set', () => {
    process.env.LOG_LEVEL = 'ERROR';
    configureLoggerFromEnv();
    expect(logger.getLevel()).toBe(LogLevel.ERROR);
  });

  it('should prefer AUDIT_LOG_LEVEL over LOG_LEVEL', () => {
    process.env.AUDIT_LOG_LEVEL = 'DEBUG';
    process.env.LOG_LEVEL = 'ERROR';
    configureLoggerFromEnv();
    expect(logger.getLevel()).toBe(LogLevel.DEBUG);
  });

  it('should not change level when no env var is set', () => {
    const originalLevel = logger.getLevel();
    configureLoggerFromEnv();
    expect(logger.getLevel()).toBe(originalLevel);
  });
});
