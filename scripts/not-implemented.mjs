#!/usr/bin/env node
/**
 * Placeholder for scripts whose contract is fixed but whose body belongs to a
 * later task. Exits 0 so nothing that shells out to them breaks; prints which
 * task fills it in, so the next implementer edits this script rather than
 * inventing a new name for it.
 */
import process from 'node:process';

const [name = 'this script', task = 'a later task'] = process.argv.slice(2);

console.error(`pnpm ${name}: not implemented yet (${task}).`);
process.exit(0);
