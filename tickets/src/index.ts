import mongoose from 'mongoose';

import { app } from './app';
import { natsWrapper } from './nats-wrapper';

// Events
import { OrderCreatedListener } from './events/listeners/order-created-listener';
import { OrderCancelledListener } from './events/listeners/order-cancelled-listener';

const start = async () => {
  console.log('Starting...');
  // Check if env variables are defined
  if (!process.env.JWT_KEY) {
    throw new Error('JWT_KEY must be defined');
  }
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI must be defined');
  }
  if (!process.env.NATS_CLIENT_ID) {
    throw new Error('NATS_CLIENT_ID must be defined');
  }
  if (!process.env.NATS_URL) {
    throw new Error('NATS_URL must be defined');
  }
  if (!process.env.NATS_CLUSTER_ID) {
    throw new Error('NATS_CLUSTER_ID must be defined');
  }

  // Connect to other services
  try {
    // 'ticketing', clusterID is defined in nats-depl.yaml
    await natsWrapper.connect(
      process.env.NATS_CLUSTER_ID,
      process.env.NATS_CLIENT_ID,
      process.env.NATS_URL
    );

    natsWrapper.client.on('close', () => {
      console.log('NATS connecting closed!');
      process.exit();
    });

    // Graceful shutdown
    process.on('SIGINT', () => natsWrapper.client.close());
    process.on('SIGTERM', () => natsWrapper.client.close());

    // Listen to events
    new OrderCreatedListener(natsWrapper.client).listen();
    new OrderCancelledListener(natsWrapper.client).listen();

    // Connect to MongoDb
    await mongoose.connect(process.env.MONGO_URI);
    console.info('Connected to MongoDb');
  } catch (err) {
    console.error(err);
  }

  // The port wouldn't matter when we start kubernetes
  app.listen(3000, () => {
    console.log('Listening on port 3000!!!!!!');
  });
};

start();
