import { createApiServer } from './server.ts';
import { LOOPBACK, loadEnvironment } from './environment.ts';

const { name, environment } = loadEnvironment();
const server = createApiServer();

server.listen(environment.apiPort, LOOPBACK, () => {
  console.log(`api listening on http://${LOOPBACK}:${environment.apiPort} (${name})`);
});
