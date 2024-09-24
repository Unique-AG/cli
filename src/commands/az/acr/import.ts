import { Command, Flags, Interfaces, ux } from '@oclif/core';
import Joi from 'joi';
import { readFile, stat } from 'node:fs/promises';
import { parse } from 'yaml';

import { AcrImportOrder, acrImport } from '../../../utils/az.js';
import { LIGHT_BLUE } from '../../../utils/colors.js';

const BATCH_SIZE = 4;

const imageSchema = Joi.object({
  name: Joi.string().required()
});

const schema = Joi.object({
  images: Joi.array().items(imageSchema).required(),
  sourceRegistry: Joi.string(),
  targetRegistryName: Joi.string()
});

export default class AzAcrImport extends Command {
  static aliases = ['a:a:i'];
  static args = {}
  static description = `
Instructs the Azure CLI to import multiple images to an Azure Container Registry. 
If you do not use Azure Container Registry, you might want to use the included mirror:images command which supports any target registry.
The "image-list-file" flag specifies which images to import. You can find an example config file in https://github.com/Unique-AG/cli/tree/main/examples.

You must have the azure-cli installed and the active session must be preemptively logged in to the matching azure subscription.

⚠ The Azure CLI command needs the password supplied as a flag. The CLI itself does never print the flag but you should still take care of the logs and the command history.
⚠ Do set an environment variable for the password to avoid it being passed as text, see the example.
⚠ Most systems pass secrets as environment variables, so normally no explicit password is needed in the command.
`

  static examples = [`
export SOURCE_PASSWORD=<SENSITIVE_VALUE>
<%= config.bin %> <%= command.id %>
`]

  static flags = {
    'batch-size': Flags.integer({
      char: 'b',
      default: BATCH_SIZE,
      description: 'Number of images to transfer in a single batch in parallel. The higher the number, the more resources will be consumed.',
      max: 8,
      min: 1
    }),
    'image-list-file': Flags.string({
      char: 'f',
      default: `examples/az-acr-import.schema.yaml`,
      description: 'Path to file that contains a list of images to import.',
      required: true
    }),
    'no-wait': Flags.boolean({
      char: 'w',
      default: false,
      description: 'By default all imports are awaited. If you want to trigger the import in the background, set this flag.',
      required: true
    }),
    'source-password': Flags.string({
      char: 'p',
      description: `⚠ Do not pass plaintext values but use an environment variable instead.
Password for the source registry.
`,
      required: true,
      
    }),
    'source-username': Flags.string({
      char: 'u',
      description: 'Username of the source registry.',
      required: true
    }),
  }

  private flags!: Interfaces.InferredFlags<typeof AzAcrImport.flags>

  public async run(): Promise<void> {
    const { flags } = await this.parse(AzAcrImport);
    this.flags = flags;
    const batchSize = this.flags['batch-size'];
    const imageListFile = this.flags['image-list-file'];
    const sourceUsername = this.flags['source-username'];
    const sourcePassword = this.flags['source-password'];
    const noWait = this.flags['no-wait'];

    try {
      // Parse (if exists) config map
      const configMapValid = (await stat(imageListFile)).isFile();
      if (!configMapValid) {
        this.error(`Config map ${imageListFile} does not exist or is not readable.`);
      }

      const configMapRaw = await readFile(imageListFile, 'utf8');
      const imageListYaml = parse(configMapRaw);

      const { error } = schema.validate(imageListYaml, { abortEarly: false });
      if (error) {
        this.error(`Config map ${imageListFile} does not follow the schema. Errors: ${error.details.map((detail) => detail.message).join(', ')}`);
      }

      const source = imageListYaml.sourceRegistry;
      const targetName = imageListYaml.targetRegistryName;

      if (!source || !targetName) {
        this.error(`Source and target registries must be specified either in the config file or as flags.`);
      }

      if (/\.?azurecr\.io$|\.io$/.test(targetName)) {
        this.error(`Do only supply the name to the target, not the full URL.`);
      }

      this.log(`Starting to transfer images from [${ux.colorize(LIGHT_BLUE, source)}] to [${ux.colorize(LIGHT_BLUE, targetName)}].`);

      const { images } = imageListYaml;

      const batches = [];
      for (let i = 0; i < images.length; i += batchSize) {
        batches.push(images.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        // Specifically want to wait in the loop to be sequential! It should be slower…
        // eslint-disable-next-line no-await-in-loop
        const operations = await Promise.allSettled(batch.map(async ({ name }: { name: string }) => {
          const fullSourceTag = `${source}/${name}`;

          this.log(`Instructing the target registry to import ${ux.colorize(LIGHT_BLUE, `${fullSourceTag}`)}.`);
          const order: AcrImportOrder = {
            fullSourceTag,
            noWait,
            password: sourcePassword,
            targetRegistryName: targetName,
            targetTag: name,
            username: sourceUsername
          };
          await acrImport(order);
        }));

        const rejectedOperations = operations.filter((operation) => operation.status === 'rejected');
        if (rejectedOperations.length > 0) {
          for (const operation of rejectedOperations) this.warn((operation as PromiseRejectedResult).reason);
          throw new Error(`${rejectedOperations.length} images failed to transfer.`);
        }

        this.log(`Batch of ${batch.length} images transferred.`);
      }

    } catch (error: unknown) {
      const errorMessage = (error as Error).message;
      this.error(`Error transferring images: ${errorMessage}`);
    }
  }
}
