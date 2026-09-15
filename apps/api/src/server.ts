import { createServer, type Server, type ServerResponse } from 'node:http';

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

// The API offers one route so far. Everything else answers 404.
export function createApiServer(): Server {
  return createServer((request, response) => {
    if (request.method === 'GET' && request.url === '/health') {
      sendJson(response, 200, { status: 'ok' });
      return;
    }
    sendJson(response, 404, { error: 'not found' });
  });
}
