import * as migration_20261114_235748_initial from './20261114_235748_initial';

export const migrations = [
  {
    up: migration_20261114_235748_initial.up,
    down: migration_20261114_235748_initial.down,
    name: '20261114_235748_initial'
  },
];
