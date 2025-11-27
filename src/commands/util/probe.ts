import { Args, Command, Flags, ux } from '@oclif/core';
import Joi from 'joi';
import { readFile, stat } from 'node:fs/promises';
import { parse } from 'yaml';

import { GREEN, LIGHT_BLUE, RED } from '../../utils/colors.js';

type Component = 'chat' | 'record' | 'all';

interface UrlCheck {
  component: Component;
  displayName: string;
  expectedStatus: number;
  url: string;
}

interface CheckResult {
  actualStatus: number | 'ERROR';
  displayName: string;
  expectedStatus: number;
  success: boolean;
  url: string;
}

const DEFAULT_TIMEOUT_MS = 10_000;

const checkSchema = Joi.object({
  component: Joi.string().valid('chat', 'record', 'all').required(),
  displayName: Joi.string().required(),
  expectedStatus: Joi.number().integer().required(),
  url: Joi.string().required(),
});

const configSchema = Joi.object({
  checks: Joi.array().items(checkSchema).required(),
});

export default class UtilProbe extends Command {
  static override aliases = ['u:p'];

  static override args = {
    domain: Args.string({
      required: true,
      description: `The domain to check health probes for.
      Examples: 
      - test.unique.app
      - uat.unique.app
      - customer.unique.app
      `,
    }),
  };

  static override description = `
Checks health probes for a Unique deployment.
Verifies that all critical endpoints are responding with the expected HTTP status codes.

This command performs HTTP GET requests to all known health endpoints and reports their status.
If any endpoint fails to respond with the expected status code, the command exits with code 1.
`;

  static override examples = [
    {
      command: '<%= config.bin %> <%= command.id %>',
      description: 'Check health probes for the default domain (uat1.unique.app)',
    },
    {
      command: '<%= config.bin %> <%= command.id %> prod.unique.app',
      description: 'Check health probes for a production domain',
    },
    {
      command: '<%= config.bin %> <%= command.id %> customer.unique.app --api-host gateway',
      description: 'Check health probes with a custom API host',
    },
    {
      command: '<%= config.bin %> <%= command.id %> prod.unique.app -c chat',
      description: 'Check only chat-related health probes',
    },
    {
      command: '<%= config.bin %> <%= command.id %> prod.unique.app -c chat -c record',
      description: 'Check both chat and record health probes',
    },
    {
      command: '<%= config.bin %> <%= command.id %> prod.unique.app -f custom-probes.yaml',
      description: 'Use a custom config file for health probes',
    },
  ];

  static override flags = {
    'api-host': Flags.string({
      char: 'a',
      default: 'api',
      description: 'The API host prefix to use for API endpoints (e.g. "api" or "gateway").',
    }),
    component: Flags.string({
      char: 'c',
      description: 'Component(s) to check health probes for. Can be specified multiple times. If not specified, all components are checked.',
      multiple: true,
      options: ['chat', 'record'],
    }),
    config: Flags.string({
      char: 'f',
      default: 'examples/util-probe.schema.yaml',
      description: 'Path to the YAML config file containing health check definitions.',
    }),
    timeout: Flags.integer({
      char: 't',
      default: DEFAULT_TIMEOUT_MS,
      description: 'Timeout in milliseconds for each HTTP request.',
      min: 1000,
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(UtilProbe);
    const domain = args.domain;
    const apiHost = flags['api-host'];
    const components = (flags.component ?? []) as Component[];
    const configFile = flags.config;
    const timeout = flags.timeout;

    const allUrlChecks = await this.loadUrlChecks(configFile, domain, apiHost);
    const urlChecks = (components.length === 0
      ? allUrlChecks
      : allUrlChecks.filter((check) => check.component === 'all' || components.includes(check.component))
    ).sort((a, b) => a.displayName.localeCompare(b.displayName));

    this.printHeader(domain, components);

    const results = await this.checkAllUrls(urlChecks, timeout);

    this.printResults(results);
    this.printSummary(results);
  }

  private async loadUrlChecks(configFile: string, domain: string, apiHost: string): Promise<UrlCheck[]> {
    const configExists = await stat(configFile).then((s) => s.isFile()).catch(() => false);
    if (!configExists) {
      this.error(`Config file ${configFile} does not exist or is not readable.`);
    }

    const configRaw = await readFile(configFile, 'utf8');
    const config = parse(configRaw);

    const { error } = configSchema.validate(config, { abortEarly: false });
    if (error) {
      this.error(`Config file ${configFile} is invalid: ${error.details.map((d) => d.message).join(', ')}`);
    }

    return config.checks.map((check: { component: Component; displayName: string; expectedStatus: number; url: string }) => ({
      component: check.component,
      displayName: check.displayName,
      expectedStatus: check.expectedStatus,
      url: check.url
        .replace(/\{\{domain\}\}/g, domain)
        .replace(/\{\{apiHost\}\}/g, apiHost),
    }));
  }

  private async checkAllUrls(urlChecks: UrlCheck[], timeout: number): Promise<CheckResult[]> {
    const results: CheckResult[] = [];

    for (const check of urlChecks) {
      // Sequential checks to avoid overwhelming the server and for clearer output
      // eslint-disable-next-line no-await-in-loop
      const result = await this.checkUrl(check, timeout);
      results.push(result);
      this.printResult(result);
    }

    return results;
  }

  private async checkUrl(check: UrlCheck, timeout: number): Promise<CheckResult> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(check.url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      return {
        actualStatus: response.status,
        displayName: check.displayName,
        expectedStatus: check.expectedStatus,
        success: response.status === check.expectedStatus,
        url: check.url,
      };
    } catch {
      return {
        actualStatus: 'ERROR',
        displayName: check.displayName,
        expectedStatus: check.expectedStatus,
        success: false,
        url: check.url,
      };
    }
  }

  private printHeader(domain: string, components: Component[]): void {
    const componentSuffix = components.length === 0 ? '' : ` (${components.join(', ')})`;
    const headerText = `Checking Health Probes for ${domain}${componentSuffix}`;
    const boxWidth = 66;
    const padding = Math.max(0, boxWidth - headerText.length - 4);
    const paddedText = `  ${headerText}${' '.repeat(padding)}`;

    this.log(ux.colorize(LIGHT_BLUE, '╔' + '═'.repeat(boxWidth - 2) + '╗'));
    this.log(ux.colorize(LIGHT_BLUE, '║') + paddedText + ux.colorize(LIGHT_BLUE, '║'));
    this.log(ux.colorize(LIGHT_BLUE, '╚' + '═'.repeat(boxWidth - 2) + '╝'));
    this.log('');
  }

  private printResult(result: CheckResult): void {
    const statusDisplay = typeof result.actualStatus === 'number'
      ? result.actualStatus.toString()
      : result.actualStatus;

    if (result.success) {
      this.log(`${ux.colorize(GREEN, '✓')} [${ux.colorize(GREEN, statusDisplay)}] ${result.displayName} (${result.url})`);
    } else {
      const expectedNote = ` (expected: ${result.expectedStatus})`;
      this.log(`${ux.colorize(RED, '✗')} [${ux.colorize(RED, statusDisplay)}]${expectedNote} ${result.displayName} (${result.url})`);
    }
  }

  private printResults(_results: CheckResult[]): void {
    // Results are printed in real-time during checkAllUrls
    // This method exists for potential future batch printing needs
  }

  private printSummary(results: CheckResult[]): void {
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;
    const total = results.length;

    this.log('');
    this.log(ux.colorize(LIGHT_BLUE, '─'.repeat(66)));

    if (failureCount === 0) {
      this.log(ux.colorize(GREEN, `✓ All ${total} endpoints are healthy!`));
    } else {
      this.log(
        `Summary: ${ux.colorize(GREEN, `${successCount} passed`)} | ` +
        `${ux.colorize(RED, `${failureCount} failed`)} | ` +
        `Total: ${total}`
      );
      this.error(`${failureCount} endpoint(s) failed health check.`, { exit: 1 });
    }
  }
}
