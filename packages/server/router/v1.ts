import { HttpServer, Websocket, sendJson } from '../index';
import { directoryWalker } from '../utils/directories';

export default function buildV1Api({
    app,
    websocket
}: {
    app: HttpServer;
    websocket: Websocket;
}) {
    app.server.on('upgrade', function (request, socket, head) {
        if (request.url === '/ws') {
            websocket.socket.handleUpgrade(
                request,
                socket,
                head,
                function (ws) {
                    websocket.socket.emit('connection', ws, request);
                }
            );
        }
    });

    app.route(/^\/Songs\/(?<filePath>.*)/, 'GET', (req, res) => {
        const url = req.pathname || '/';

        const osuInstance: any = req.instanceManager.getInstance();
        if (!osuInstance) {
            res.statusCode = 500;
            return sendJson(res, { error: 'not_ready' });
        }

        const { settings } = osuInstance.entities.getServices(['settings']);
        if (settings.songsFolder === '') {
            res.statusCode = 500;
            return sendJson(res, { error: 'not_ready' });
        }

        directoryWalker({
            res,
            baseUrl: url,
            pathname: req.params.filePath,
            folderPath: settings.songsFolder
        });
    });
}
