import cp from 'child_process';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import rm from 'rimraf';
import Zip from 'adm-zip';
import { v4 as uuid } from 'uuid';

export default function meteor(props = {}) {
  const buildId = uuid();
  const {
    architecture = 'os.linux.x86_64',
    dockerfileUrl = 'https://raw.githubusercontent.com/meteor/galaxy-images/master/galaxy-app/Dockerfile',
    dockerfilePath,
  } = props;

  const buildPath = path.resolve('.', `../${buildId}/bundle`);
  const bundlePath = path.resolve('.', `../${buildId}.zip`);

  return {
    name: 'Meteor',
    fn: async () => {
      rm.sync(path.resolve(buildPath, '..'));

      cp.execSync(`meteor build --directory --server-only --architecture ${architecture} ../${buildId}`, { stdio: 'inherit' });

      if (dockerfilePath) {
        const dockerfile = path.resolve('.', dockerfilePath);
        fs.copyFileSync(dockerfile, `${buildPath}/Dockerfile`);
      } else {
        const externalDockerFile = await fetch(dockerfileUrl);
        await new Promise((resolve) => {
          const file = fs.createWriteStream(`${buildPath}/Dockerfile`);
          externalDockerFile.body.pipe(file);
          file.on('finish', () => {
            resolve();
          });
        });
      }

      const zip = new Zip();
      zip.addLocalFolder(buildPath, '.');
      zip.writeZip(bundlePath);
      rm.sync(path.resolve(buildPath, '..'));

      return bundlePath;
    },
    onError() {
      rm.sync(path.resolve(buildPath, '..'));
      rm.sync(bundlePath);
    },
    onSuccess() {
      rm.sync(bundlePath);
    },
  };
}
