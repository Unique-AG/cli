#!/usr/bin/env -S node --disable-warning=DEP0180

import {execute} from '@oclif/core'

await execute({dir: import.meta.url})
