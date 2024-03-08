import { config } from './config';

const colors = {
    info: '\x1b[1m\x1b[40m\x1b[42m',
    error: '\x1b[1m\x1b[37m\x1b[41m',
    debug: '\x1b[1m\x1b[37m\x1b[44m',
    warn: '\x1b[1m\x1b[40m\x1b[43m',
    reset: '\x1b[0m',
    grey: '\x1b[90m'
};

export function colorText(status: string) {
    const colorCode = colors[status] || colors.reset;
    const timestamp = new Date().toISOString().split('T')[1].replace('Z', '');

    const time = `${colors.grey}${timestamp}${colors.reset}`;
    return `${time} ${colorCode} ${status.toUpperCase()} ${colors.reset}`;
}

export const wLogger = {
    info: (...args: any) => {
        const colored_text = colorText('info');
        console.log(colored_text, ...args);
    },
    debug: (...args: any) => {
        if (config.debugLogging != true) return;

        const colored_text = colorText('debug');
        console.log(colored_text, ...args);
    },
    error: (...args: any) => {
        const colored_text = colorText('error');
        console.log(colored_text, ...args);
    },
    warn: (...args: any) => {
        const colored_text = colorText('warn');
        console.log(colored_text, ...args);
    }
};
