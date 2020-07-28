import fs from 'fs';
import rm from 'rimraf';
import mkdirp from 'mkdirp';

const LOCAL_DIR = '/tmp/.mars';
const SESSION_FILE = '/tmp/.mars/session';

export default {
  set(session) {
    if (!fs.existsSync(LOCAL_DIR)) {
      mkdirp.sync(LOCAL_DIR);
    }

    fs.writeFileSync(SESSION_FILE, JSON.stringify(session));

    return session;
  },
  get() {
    try {
      const data = fs.readFileSync(SESSION_FILE);
      return JSON.parse(data);
    } catch (err) {
      return null;
    }
  },
  rm() {
    try {
      rm.sync(SESSION_FILE);
      return null;
    } catch (err) {
      return null;
    }
  },
};
