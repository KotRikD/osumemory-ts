import * as dotenv from 'dotenv';
import fs from 'fs';

const curDir = fs.readdirSync('./');
if (!curDir.includes('tsosu.env')) {
    fs.writeFileSync(
        './tsosu.env',
        `DEBUG_LOG=false
CALCULATE_PP=true
ENABLE_KEY_OVERLAY=true
WS_SEND_INTERVAL=150
POLL_RATE=150
KEYOVERLAY_POLL_RATE=150

DEFAULT_IP=127.0.0.1
DEFAULT_PORT=24050
STATIC_FOLDER_PATH=./static`
    );
}

dotenv.config({
    path: 'tsosu.env'
});

export const config = {
    debugLogging: (process.env.DEBUG_LOG || '') === 'true',
    calculatePP: (process.env.CALCULATE_PP || '') === 'true',
    enableKeyOverlay: (process.env.ENABLE_KEY_OVERLAY || '') === 'true',
    wsSendInterval: Number(process.env.WS_SEND_INTERVAL || '500'),
    pollRate: Number(process.env.POLL_RATE || '500'),
    keyOverlayPollRate: Number(process.env.KEYOVERLAY_POLL_RATE || '100'),

    defaultIP: process.env.DEFAULT_IP || '127.0.0.1',
    defaultPort: Number(process.env.DEFAULT_PORT || '24050'),
    staticFolderPath: process.env.STATIC_FOLDER_PATH || './static'
};
