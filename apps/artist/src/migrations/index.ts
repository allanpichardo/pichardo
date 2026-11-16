import * as migration_20261114_235748_initial from './20261114_235748_initial';
import * as migration_20261115_234109_media_pipeline from './20261115_234109_media_pipeline';

export const migrations = [
  {
    up: migration_20261114_235748_initial.up,
    down: migration_20261114_235748_initial.down,
    name: '20261114_235748_initial',
  },
  {
    up: migration_20261115_234109_media_pipeline.up,
    down: migration_20261115_234109_media_pipeline.down,
    name: '20261115_234109_media_pipeline'
  },
];
