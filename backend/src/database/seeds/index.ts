import { DataSource } from 'typeorm';
import { seedEscalationRules } from './escalation-rules.seed';

export async function runAllSeeds(dataSource: DataSource): Promise<void> {
  console.log('Starting database seeds...');

  try {
    await seedEscalationRules(dataSource);
    console.log('All seeds completed successfully!');
  } catch (error) {
    console.error('Error running seeds:', error);
    throw error;
  }
}

export { seedEscalationRules };
