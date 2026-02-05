/**
 * Professional Logging Utility for Production
 * 
 * Categories:
 * - INFO: General operational information
 * - PERF: Performance and cache metrics  
 * - AUTH: Authentication events
 * - PAY: Payment/subscription events
 * - ERROR: Error conditions
 */

type LogLevel = 'INFO' | 'PERF' | 'AUTH' | 'PAY' | 'ERROR' | 'WARN';

interface LogOptions {
    userId?: string;
    operation?: string;
    duration?: number;
    metadata?: Record<string, any>;
}

const formatTimestamp = () => new Date().toISOString();

const formatLog = (level: LogLevel, message: string, options?: LogOptions): string => {
    const parts = [
        `[${formatTimestamp()}]`,
        `[${level}]`,
        message
    ];
    
    if (options?.operation) parts.push(`op=${options.operation}`);
    if (options?.userId) parts.push(`user=${options.userId.slice(0, 8)}...`);
    if (options?.duration !== undefined) parts.push(`${options.duration}ms`);
    
    return parts.join(' ');
};

export const logger = {
    info: (message: string, options?: LogOptions) => {
        console.log(formatLog('INFO', message, options));
    },

    perf: (message: string, options?: LogOptions) => {
        console.log(formatLog('PERF', message, options));
    },

    auth: (message: string, options?: LogOptions) => {
        console.log(formatLog('AUTH', message, options));
    },

    pay: (message: string, options?: LogOptions) => {
        console.log(formatLog('PAY', message, options));
    },

    warn: (message: string, options?: LogOptions) => {
        console.warn(formatLog('WARN', message, options));
    },

    error: (message: string, error?: any, options?: LogOptions) => {
        console.error(formatLog('ERROR', message, options), error?.message || error || '');
    },

    request: (method: string, path: string, userId?: string, ip?: string) => {
        const parts = [`[${formatTimestamp()}]`, `[REQ]`, method, path];
        if (userId) parts.push(`user=${userId.slice(0, 8)}...`);
        if (ip) parts.push(`ip=${ip}`);
        console.log(parts.join(' '));
    }
};
