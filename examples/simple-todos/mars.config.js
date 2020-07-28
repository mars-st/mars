const { builders, session } = require('mars');

module.exports = (stage) => {
  console.log(`deploy to ${stage}`);
  console.log('from config');

  const settings = require('./settings.json');
  console.log(settings);
  const { token } = session.get();
  console.log(token);

  return {
    id: 'todos', // required, do not change unless you want to create new instances
    name: 'todos app', // required
    secret: process.env.MARS_SECRET_ACCESS_KEY || 'somekey', // required
    clusters: {
      todos: {
        builder: builders.meteor(), // required
        source: '.', // optional, defaults to '.'
        env(cluster) {
          return {
            MONGO_URL: 'someURL',
            MONGO_OPLOG_URL: 'someOtherURL',
            ROOT_URL: cluster.url,
            PORT: cluster.port,
            METEOR_SETTINGS: JSON.stringify(settings),
          };
        },
        scaling: { // optional
          minCapacity: 1, // optional, defaults to 1
          maxCapacity: 3, // optional, defaults to 3 (which allows unlimited scaling)
          rules: {
            targetMemoryUsage: {
              type: 'target',
              metric: 'avgMemoryUsage',
              value: 70,
            },
            targetCPUUsage: {
              type: 'target',
              metric: 'avgCPUUsage',
              value: 70,
            },
            scheduledIncrease: {
              type: 'schedule',
              schedule: '* * * * * *',
              change: {
                minCapacity: 2,
                maxCapacity: 6,
              },
            },
            scheduledDecrease: {
              type: 'schedule',
              schedule: '* * * * * *',
              change: {
                minCapacity: 1,
                maxCapacity: 5,
              },
            },
          },
        },
      },
    },
    tasks: {
      loadFromDataSource: {
        schedule: '* * * * * *',
        fn() {
          console.log(process.env);
          console.log('fetch data and store it');
        },
        env(fn) {
          return {
            MONGO_URL: 'someURL',
            MONGO_OPLOG_URL: 'someOtherURL',
          };
        },
      },
    },
  };
}
