import chalk from 'chalk';
// import S3 from 'aws-sdk/clients/s3';
import path from 'path';
import parseArgs from 'yargs-parser';
import { GraphQLClient } from 'graphql-request';
import inquirer from 'inquirer';
import sha256 from 'crypto-js/sha256';
import Session from './session';

const API_URL = 'http://localhost:4000';
// const API_URL = 'http://mars.st/api';

// const BUCKET_URL = 'mars-capture-dev';
// const BUCKET_URL = 'http://mars.st/bucket';

// const s3 = new S3({
//   params: {
//     Bucket: BUCKET_URL,
//   },
// });

export default async function run(args) {
  try {
    const cmd = args[2];
    const props = {
      stage: 'production',
      configFile: './mars.config.js',
      ...parseArgs(args),
    };

    const { token } = Session.get() || {};
    let client = new GraphQLClient(API_URL, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    switch (cmd) {
      case 'up': {
        console.log(chalk.green('MARS UP'));

        let config;
        try {
          // eslint-disable-next-line
          config = require(path.resolve('.', props.configFile));
        } catch (err) {
          config = undefined;
        }
        if (!config) throw new Error('A configuration file with a function is required!');

        const definition = await config(props.stage);
        if (!definition) throw new Error('The configuration file did not return an object');
        if (!definition.secret) throw new Error('Secret is required!');

        try {
          client = new GraphQLClient(API_URL, {
            headers: {
              authorization: `Bearer ${definition.secret}`,
            },
          });

          // const project = await client.request(`mutation ($form: upsertProjectForm) {
          //   project: upsertProject(form: $form) {
          //     id
          //   }
          // }`, {
          //   form: {
          //     name: definition.project,
          //   },
          // });

          // Create/Update Clusters
          const artifacts = await Promise.all(
            Object.entries(definition.clusters).map(async ([name, clusterDefinition]) => {
              if (!clusterDefinition.builder?.fn) throw new Error('Builder is required!');
              console.log(chalk.green(`CREATE ${name} WITH ${clusterDefinition.builder.name}`));

              const artifact = await clusterDefinition.builder.fn();
              return {
                name,
                artifact,
              };
            }),
          );

          console.log(artifacts);
          console.log(chalk.green('ARTIFACTS READY'));

          // const file = fs.createReadStream(buildArtifact);
          // const result = await new Promise((resolve, reject) => {
          //   s3.upload({
          //     Key: 'build.zip',
          //     Body: file,
          //   }, (err, data) => {
          //     if (err) return reject(err);
          //     return resolve(data);
          //   });
          // });

          // console.log(result);

          // Run completion hooks
          await Promise.all(
            Object.entries(definition.clusters).map(([, clusterDefinition]) => (
              clusterDefinition.builder?.onSuccess?.()
            )),
          );

          console.log(chalk.green('MARS UP COMPLETE'));
        } catch (err) {
          await Promise.all(
            Object.entries(definition.clusters).map(([, clusterDefinition]) => (
              clusterDefinition.builder?.onError?.()
            )),
          ).catch(() => {});

          throw err;
        }
        break;
      }
      case 'enroll': {
        console.log(chalk.green('>>> ENROLL <<<'));
        const form = await inquirer.prompt([
          {
            type: 'input',
            name: 'email',
            message: 'What is your Email?',
          },
          {
            type: 'input',
            name: 'password',
            message: 'What is your Password?',
          },
        ]);
        const password = sha256(form.password).toString();

        const session = await client.request(`
          mutation ($form: enrollForm!) {
            session: enroll(form: $form) {
              token
            }
          }
        `, {
          form: {
            email: form.email,
            password,
          },
        });

        Session.set(session.session);
        break;
      }
      case 'login': {
        console.log(chalk.green('>>> LOGIN <<<'));
        const form = await inquirer.prompt([
          {
            type: 'input',
            name: 'email',
            message: 'What is your Email?',
          },
          {
            type: 'input',
            name: 'password',
            message: 'What is your Password?',
          },
        ]);
        const password = sha256(form.password).toString();

        const session = await client.request(`
          mutation ($form: loginForm!) {
            session: login(form: $form) {
              token
            }
          }
        `, {
          form: {
            email: form.email,
            password,
          },
        });

        Session.set(session.session);
        break;
      }
      case 'logout': {
        console.log(chalk.green('>>> LOGOUT <<<'));
        if (!token) break;

        await client.request(`
          mutation ($form: logoutForm!) {
            session: logout(form: $form) {
              token
            }
          }
        `, {
          form: {
            token,
          },
        });

        Session.rm();
        break;
      }
      case 'whoami': {
        console.log(chalk.green('>>> WHO AM I? <<<'));
        const session = await client.request(`
          query {
            session: currentSession {
              user {
                email
              }
            }
          }
        `);

        if (!session?.session?.user?.email) {
          console.log(chalk.green('You are not logged in!'));
          break;
        }

        console.log(chalk.green(session?.session?.user?.email));
        break;
      }
      default: {
        console.log(chalk.red('Command not found!'));
      }
    }
  } catch (err) {
    console.log(chalk.red(err.message || 'Something went wrong!'));
  }
}
