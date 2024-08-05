import { Command, Flags, ux } from '@oclif/core';
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
  static description = 'Pulls images from a source, retags them, and pushes them to a new registry. For security reasons, the active session must be preemptively logged in to both docker registries. The "imageListFile" flag specifies which images to mirror. You can find an example config file in https://github.com/Unique-AG/cli/tree/main/examples.'
  static examples = [`
export SOURCE_DOCKER_REGISTRY: <VALUE>
export SOURCE_DOCKER_USERNAME: <SENSITIVE_VALUE>
export SOURCE_DOCKER_PASSWORD: <SENSITIVE_VALUE>
export TARGET_DOCKER_REGISTRY: <VALUE>
export TARGET_DOCKER_USERNAME: <SENSITIVE_VALUE>
export TARGET_DOCKER_PASSWORD: <SENSITIVE_VALUE>
docker login $SOURCE_DOCKER_REGISTRY -u $SOURCE_DOCKER_USERNAME -p $SOURCE_DOCKER_PASSWORD
docker login $TARGET_DOCKER_REGISTRY -u $TARGET_DOCKER_USERNAME -p $TARGET_DOCKER_PASSWORD
<%= config.bin %> <%= command.id %>
`, `
export SOURCE_DOCKER_REGISTRY: <VALUE>
export SOURCE_DOCKER_USERNAME: <SENSITIVE_VALUE>
export SOURCE_DOCKER_PASSWORD: <SENSITIVE_VALUE>
export TARGET_DOCKER_REGISTRY: <VALUE>
export TARGET_DOCKER_USERNAME: <SENSITIVE_VALUE>
export TARGET_DOCKER_PASSWORD: <SENSITIVE_VALUE>
docker login $SOURCE_DOCKER_REGISTRY -u $SOURCE_DOCKER_USERNAME -p $SOURCE_DOCKER_PASSWORD
az acr login --name polishednight8579
<%= config.bin %> <%= command.id %>
`]

  static flags = {
    batchSize: Flags.integer({
      char: 'b',
      default: BATCH_SIZE,
      description: 'Number of images to transfer in a single batch in parallel. The higher the number, the more resources will be consumed.',
      max: 8,
      min: 1
    }),
    imageListFile: Flags.string({
      char: 'f',
      default: `examples/mirror-images.schema.yaml`,
      description: 'Path to file that contains a list of images to mirror.',
      required: true
    }),
    sourceRegistry: Flags.string({
      char: 's',
      description: 'Source registry from where the images will be pulled, this overrides the value specified in the imageListFile.'
    }),
    targetRegistry: Flags.string({
      char: 't',
      description: 'Target registry where the images will go, this overrides the value specified in the imageListFile.'
    }),
  }

  public async run(): Promise<void> {
    const { flags: { batchSize, imageListFile, sourceRegistry, targetRegistry } } = await this.parse(MirrorImages)
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
        await Promise.all(batch.map(async ({name}: {name: string}) => {
          const fullSourceTag = `${source}/${name}`;
          const fullTargetTag = `${target}/${name}`;

              this.log(`Pulling ${ux.colorize(LIGHT_BLUE, `${fullSourceTag}`)}, tagging it as ${ux.colorize(LIGHT_BLUE, `${fullTargetTag} and shipping it back out again.`)}.`);
              ux.action.start(`Transferring ${fullSourceTag} to ${fullTargetTag}`);
              ux.action.status = 'Pulling';
              await dockerPull(fullSourceTag);
              ux.action.status = 'Tagging';
              await dockerMove(fullSourceTag, fullTargetTag);
              ux.action.status = 'Pushing';
              await dockerPush(fullTargetTag);
              ux.action.stop();
        }));
      }));
    } catch (error: unknown) {
      const errorMessage = (error as Error).message;
      this.error(`Error transferring images: ${errorMessage}`);
    }
  }
}
