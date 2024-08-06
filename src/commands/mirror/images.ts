import { Command, Flags, Interfaces, ux } from '@oclif/core';
import Joi from 'joi';
import { readFile, stat } from 'node:fs/promises';
import { parse } from 'yaml';

import { LIGHT_BLUE } from '../../utils/colors.js';
import { dockerMove, dockerPull, dockerPush } from '../../utils/docker.js';

const BATCH_SIZE = 2;

const imageSchema = Joi.object({
  name: Joi.string().required()
});

const schema = Joi.object({
  images: Joi.array().items(imageSchema).required(),
  sourceRegistry: Joi.string(),
  targetRegistry: Joi.string()
});

export default class MirrorImages extends Command {
  static aliases = ['m:i'];
  static args = {}
<<<<<<< Updated upstream
  static description = 'Pulls images from a source, retags them, and pushes them to a new registry. For security reasons, the active session must be preemptively logged in to both docker registries. The command treats images as immutable and will refuse to retag an image if it already exists in the target registry.'
=======
  static description = `
Pulls images from a source, retags them, and pushes them to a new registry.
The "image-list-file" flag specifies which images to mirror. You can find an example config file in https://github.com/Unique-AG/cli/tree/main/examples.

For security reasons, the active session must be preemptively logged in to both OCI registries.`

>>>>>>> Stashed changes
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
    'batch-size': Flags.integer({
      char: 'b',
      default: BATCH_SIZE,
      description: 'Number of images to transfer in a single batch in parallel. The higher the number, the more resources will be consumed.',
      max: 8,
      min: 1
    }),
    'image-list-file': Flags.string({
      char: 'f',
      default: `examples/mirror-images.schema.yaml`,
      description: 'Path to file that contains a list of images to mirror.',
      required: true
    }),
    'source-registry': Flags.string({
      char: 's',
      description: 'Source registry from where the images will be pulled, this overrides the value specified in the image-list-file.'
    }),
    'target-registry': Flags.string({
      char: 't',
      description: 'Target registry where the images will go, this overrides the value specified in the image-list-file.'
    }),
  }

  private flags!: Interfaces.InferredFlags<typeof MirrorImages.flags>

  public async run(): Promise<void> {
    const { flags } = await this.parse(MirrorImages);
    this.flags = flags;
    const batchSize = this.flags['batch-size'];
    const imageListFile = this.flags['image-list-file'];
    const sourceRegistry = this.flags['source-registry'];
    const targetRegistry = this.flags['target-registry'];

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

      const source = sourceRegistry || imageListYaml.sourceRegistry;
      const target = targetRegistry || imageListYaml.targetRegistry;

      if (!source || !target) {
        this.error(`Source and target registries must be specified either in the config file or as flags.`);
      }

      this.log(`Starting to transfer images from [${ux.colorize(LIGHT_BLUE, source)}] to [${ux.colorize(LIGHT_BLUE, target)}].`);

      const { images } = imageListYaml;

      const batches = [];
      for (let i = 0; i < images.length; i += batchSize) {
        batches.push(images.slice(i, i + batchSize));
      }

      await Promise.all(batches.map(async (batch) => {
        await Promise.all(batch.map(async ({ name }: { name: string }) => {
          const fullSourceTag = `${source}/${name}`;
          const fullTargetTag = `${target}/${name}`;

          this.log(`Pulling ${ux.colorize(LIGHT_BLUE, `${fullSourceTag}`)}, tagging it as ${ux.colorize(LIGHT_BLUE, `${fullTargetTag} and shipping it back out again.`)}.`);
          await dockerPull(fullSourceTag);
          await dockerMove(fullSourceTag, fullTargetTag);
          await dockerPush(fullTargetTag);
        }));
      }));
    } catch (error: unknown) {
      const errorMessage = (error as Error).message;
      this.error(`Error transferring images: ${errorMessage}`);
    }
  }
}
