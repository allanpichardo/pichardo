import * as migration_20261114_235748_initial from './20261114_235748_initial';
import * as migration_20261115_234109_media_pipeline from './20261115_234109_media_pipeline';
import * as migration_20261116_022008_content_model from './20261116_022008_content_model';

export const migrations = [
  {
    up: migration_20261114_235748_initial.up,
    down: migration_20261114_235748_initial.down,
    name: '20261114_235748_initial',
  },
  {
    up: migration_20261115_234109_media_pipeline.up,
    down: migration_20261115_234109_media_pipeline.down,
    name: '20261115_234109_media_pipeline',
  },
  {
    up: migration_20261116_022008_content_model.up,
    down: migration_20261116_022008_content_model.down,
    name: '20261116_022008_content_model'
  },
];
