// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_futuristic_warbound.sql';
import m0001 from './0001_luxuriant_killer_shrike.sql';
import m0002 from './0002_happy_annihilus.sql';
import m0003 from './0003_military_skreet.sql';
import m0004 from './0004_demonic_scorpion.sql';
import m0005 from './0005_violet_anita_blake.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002,
m0003,
m0004,
m0005
    }
  }
  