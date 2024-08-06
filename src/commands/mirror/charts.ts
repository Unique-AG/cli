import { Command, Flags, Interfaces, ux } from '@oclif/core';
import Joi from 'joi';
import { readFile, rm, stat } from 'node:fs/promises';
import { temporaryDirectory } from 'tempy';
import { parse } from 'yaml';

import { GREEN, LIGHT_BLUE } from '../../utils/colors.js';
import { helmPull, helmPush } from '../../utils/helm.js';

const TEMPY_PREFIX = `qcli_`;

const chartSchema = Joi.object({
  name: Joi.string().required(),
  // eslint-disable-next-line no-warning-comments
  version: Joi.string().required() // todo: can use https://www.npmjs.com/package/joi-extension-semver to further validate
});

const schema = Joi.object({
  charts: Joi.array().items(chartSchema).required(),
  sourceRepository: Joi.string(),
  targetRepository: Joi.string()
});

export default class MirrorCharts extends Command {
  static aliases = ['m:c'];
  static args = {}
  static description = `
Pulls charts from a source and pushes them to a new registry.
The "chart-list-file" flag specifies which charts to mirror. You can find an example config file in https://github.com/Unique-AG/cli/tree/main/examples.

For security reasons, the active session must be preemptively logged in to both OCI registries.`

  static examples = [`
export SOURCE_OCI_REGISTRY: <VALUE>
export SOURCE_OCI_USERNAME: <SENSITIVE_VALUE>
export SOURCE_OCI_PASSWORD: <SENSITIVE_VALUE>
export TARGET_OCI_REGISTRY: <VALUE>
export TARGET_OCI_USERNAME: <SENSITIVE_VALUE>
export TARGET_OCI_PASSWORD: <SENSITIVE_VALUE>
docker login $SOURCE_OCI_REGISTRY -u $SOURCE_OCI_USERNAME -p $SOURCE_OCI_PASSWORD
docker login $TARGET_OCI_REGISTRY -u $TARGET_OCI_USERNAME -p $TARGET_OCI_PASSWORD
<%= config.bin %> <%= command.id %>
`, `
export SOURCE_OCI_REGISTRY: <VALUE>
export SOURCE_OCI_USERNAME: <SENSITIVE_VALUE>
export SOURCE_OCI_PASSWORD: <SENSITIVE_VALUE>
docker login $SOURCE_OCI_REGISTRY -u $SOURCE_OCI_USERNAME -p $SOURCE_OCI_PASSWORD
az acr login --name <REGISTRY_NAME>
<%= config.bin %> <%= command.id %>
`]

  static flags = {
    'chart-list-file': Flags.string({
      char: 'f',
      default: `examples/mirror-charts.schema.yaml`,
      description: 'Path to file that contains a list of charts to mirror.',
      required: true
    }),
    'keep': Flags.boolean({
      char: 'k',
      description: 'If true, keeps the downloaded tarballs.'
    }),
    'source-repository': Flags.string({
      char: 's',
      description: 'Source repository from where the charts will be pulled, this overrides the value specified in the chart-list-file.'
    }),
    'target-repository': Flags.string({
      char: 't',
      description: 'Target repository where the charts will go, this overrides the value specified in the chart-list-file.'
    }),
  }

  private flags!: Interfaces.InferredFlags<typeof MirrorCharts.flags>

  public async run(): Promise<void> {
    const { flags } = await this.parse(MirrorCharts);
    this.flags = flags;
    const chartListFile = this.flags['chart-list-file'];
    const sourceRepository = this.flags['source-repository'];
    const targetRepository = this.flags['target-repository'];
    const { keep } = this.flags;
    const clipboard = temporaryDirectory({ prefix: TEMPY_PREFIX });

    try {
      // Parse (if exists) config map
      const configMapValid = (await stat(chartListFile)).isFile();
      if (!configMapValid) {
        this.error(`Config map ${chartListFile} does not exist or is not readable.`);
      }

      const configMapRaw = await readFile(chartListFile, 'utf8');
      const chartListYaml = parse(configMapRaw);

      const { error } = schema.validate(chartListYaml, { abortEarly: false });
      if (error) {
        this.error(`Config map ${chartListYaml} does not follow the schema. Errors: ${error.details.map((detail) => detail.message).join(', ')}`);
      }

      const source = sourceRepository || chartListYaml.sourceRepository;
      const target = targetRepository || chartListYaml.targetRepository;

      if (!source || !target) {
        this.error(`Source and target registries must be specified either in the config file or as flags.`);
      }

      this.log(`Starting to transfer images from [${ux.colorize(LIGHT_BLUE, source)}] to [${ux.colorize(LIGHT_BLUE, target)}].`);
      this.log(`[${ux.colorize(GREEN, clipboard)}] is used to temporarily store charts before pushing them to the target.`);

      const { charts } = chartListYaml;


      const operations = await Promise.allSettled(charts.map(async ({ name, version }: { name: string, version: string }) => {
        const pathElements = name.split('/');
        const chartPath = pathElements.slice(0, -1).join('/'); // Remove the last element basically splitting out a charts path
        const chartName = pathElements.at(-1); // Get the last element of the array

        if (!chartPath || !chartName) {
          throw new Error(`Failed to extract the chart path and name from ${name}.`);
        }

        this.log(`Pulling ${ux.colorize(LIGHT_BLUE, `${name}`)} from ${ux.colorize(LIGHT_BLUE, source)} and pushing it to ${ux.colorize(LIGHT_BLUE, target)}.`);
        const tgzPath = await helmPull({ chartName, chartPath, clipboard, repository: source, version });
        await helmPush({ nestedPath: chartPath, repository: target, tgzPath });
      }));
      
      const rejectedOperations = operations.filter((operation) => operation.status === 'rejected');
      if (rejectedOperations.length > 0) {
        for (const operation of rejectedOperations) this.warn((operation as PromiseRejectedResult).reason);
        throw new Error(`${rejectedOperations.length} charts failed to transfer.`);
      }

      this.log(`All charts have been transferred.`);
    } catch (error: unknown) {
      const errorMessage = (error as Error).message;
      this.error(`Error transferring images: ${errorMessage}`);
    } finally {
      if (!keep) {
        await rm(clipboard, { recursive: true });
        this.log(`Temporary directory has been removed.`);
      }
    }
  }
}
