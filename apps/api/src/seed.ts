import mongoose from 'mongoose';
import { portfolioSchema, portfolioSeed } from '@karna/shared';
import { readConfig } from './config.js';
import { PortfolioModel } from './models.js';

async function seed() {
  const { mongodbUri } = readConfig();
  if (!mongodbUri) throw new Error('MONGODB_URI is required for seeding.');
  const content = portfolioSchema.parse(portfolioSeed);
  await mongoose.connect(mongodbUri, { serverSelectionTimeoutMS: 5000 });
  await PortfolioModel.init();
  await PortfolioModel.updateOne({ key: 'main' }, { $set: { content } }, { upsert: true, runValidators: true });
  console.info('[seed] portfolio_updated');
}

try { await seed(); }
catch { console.error('[seed] failed; check server configuration and database availability'); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
