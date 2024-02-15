import { wLogger } from '@tosu/common';
import http, { IncomingMessage, ServerResponse } from 'http';

import { getContentType, sendJson } from '../utils/index';

export interface ExtendedIncomingMessage extends IncomingMessage {
    instanceManager: any;
    query: { [key: string]: string };
    params: { [key: string]: string };
    getContentType: (text: string) => string;
    sendJson: (
        response: http.ServerResponse,
        json: object | any[]
    ) => http.ServerResponse<http.IncomingMessage>;
}

type RequestHandler = (
    req: ExtendedIncomingMessage,
    res: http.ServerResponse,
    next: () => void
) => void;

type RouteHandler = {
    (req: ExtendedIncomingMessage, res: ServerResponse): void;
};

export class HttpServer {
    private middlewares: RequestHandler[] = [];
    server: http.Server;
    private routes: {
        [method: string]: [
            {
                path: string | RegExp;
                handler: RouteHandler;
            }
        ];
    } = {};

    constructor() {
        // @ts-ignore
        this.server = http.createServer(this.handleRequest.bind(this));
    }

    use(middleware: RequestHandler) {
        this.middlewares.push(middleware);
    }

    route(
        path: string | RegExp,
        method:
            | 'GET'
            | 'POST'
            | 'HEAD'
            | 'PUT'
            | 'DELETE'
            | 'CONNECT'
            | 'OPTIONS'
            | 'TRACE'
            | 'PATCH',
        handler: RouteHandler
    ) {
        // @ts-ignore
        if (this.routes[method] == null) this.routes[method] = [];

        // @ts-ignore
        const find = this.routes[method].find((r) => r.path == path);
        if (!find) this.routes[method].push({ path, handler });
    }

    private handleRequest(
        req: ExtendedIncomingMessage,
        res: http.ServerResponse
    ) {
        const startTime = performance.now();
        let index = 0;

        res.on('finish', () => {
            const finishTime = performance.now();
            wLogger.debug(
                `[${(finishTime - startTime).toFixed(2)}ms] ${req.method} ${
                    res.statusCode
                } ${res.getHeader('content-type')} ${req.url}`
            );
        });

        const next = () => {
            if (index < this.middlewares.length) {
                const middleware = this.middlewares[index++];
                middleware(req, res, next);

                return;
            }

            this.handleNext(req, res);
        };

        next();
    }

    private handleNext(req: ExtendedIncomingMessage, res: http.ServerResponse) {
        const method = req.method || 'GET';
        const hostname = req.headers.host; // Hostname
        const url = req.url || '/'; // URL

        const parsedURL = new URL(`http://${hostname}${req.url}`);

        // parse query parameters
        req.query = {};
        req.params = {};

        // add functions (thats probably shittiest way to do so, but i want to try it)
        req.getContentType = getContentType;
        req.sendJson = sendJson;

        parsedURL.searchParams.forEach(
            (value, key) => (req.query[key] = value)
        );

        const routes = this.routes[method] || [];
        for (let i = 0; i < routes.length; i++) {
            const route = routes[i];
            let routeExists = false;

            if (route.path instanceof RegExp && route.path.test(url)) {
                routeExists = true;

                // turn groups to route params
                const array = Object.keys(route.path.exec(url)?.groups || {});
                for (let g = 0; g < array.length; g++) {
                    const key = array[g];
                    const value = route.path.exec(url)?.groups?.[key];

                    if (key == null || value == null) continue;
                    req.params[key] = value;
                }
            } else if (typeof route.path == 'string')
                routeExists = route.path == url;

            if (!routeExists) continue;
            return route.handler(req, res);
        }

        res.statusCode = 404;
        res.end('Not Found');
        return;
    }

    listen(port: number, hostname: string) {
        this.server.listen(port, hostname, () => {
            wLogger.info(`Web server started on http://${hostname}:${port}`);
        });
    }
}
