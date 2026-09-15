import { readFileSync } from 'node:fs';
import path from 'node:path';

export type Environment = {
  webPort: number;
  apiPort: number;
  dataDir: string;
  cookieName: string;
};

type EnvironmentsFile = {
  retentionDays: number;
  environments: Record<string, Environment>;
};

const environmentsPath = path.join(import.meta.dirname, '../../../config/environments.json');

// Every server listens on the loopback address and nowhere else.
export const LOOPBACK = '127.0.0.1';

export function loadEnvironment(name: string = process.env.SPINDLE_ENV ?? 'development'): {
  name: string;
  environment: Environment;
} {
  const file = JSON.parse(readFileSync(environmentsPath, 'utf8')) as EnvironmentsFile;
  const environment = file.environments[name];
  if (!environment) {
    throw new Error(`No environment called "${name}" in config/environments.json.`);
  }
  return { name, environment };
}
