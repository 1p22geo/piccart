import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

export function browserChannel() {
  if (process.env.PLAYWRIGHT_CHANNEL) return process.env.PLAYWRIGHT_CHANNEL;
  if (process.platform === 'win32' && !existsSync(chromium.executablePath()) &&
      existsSync(join(process.env.ProgramFiles ?? '', 'Google/Chrome/Application/chrome.exe'))) return 'chrome';
  return undefined;
}
