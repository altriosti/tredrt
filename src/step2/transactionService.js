// -----------------------------------------------------------------------------
// TRANSACTION SERVICE
//
// One interface, two implementations. Only the demo one exists today.
//
//   stake({ tokenId, amount })  -> { ok, mode, steps, reference }
//   claimReward({ tokenId, amount }) -> { ok, mode, reference }
//
// DEMO MODE moves no ETH, signs nothing, touches no contract and produces no
// transaction hash. Its results are labelled 'demo' everywhere so the UI can
// never present a simulation as a real blockchain transaction.
//
// To go live later, implement onChainTransactionService with the same two
// methods and swap the export. No 3D scene, timer or UI needs to change.
// -----------------------------------------------------------------------------

import { STEP2 } from './config2.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export const demoTransactionService = {
  mode: 'demo',

  /**
   * Simulated stake lifecycle. onStep receives each stage label so the world
   * can react while it runs.
   */
  async stake({ tokenId, amount }, onStep = () => {}) {
    const steps = [
      'PREPARING DIMENSIONAL STAKE',
      'VERIFYING NFT',
      'LOCKING DESTINATION',
      'CONFIRMING STAKE',
    ];
    for (const label of steps) {
      onStep(label);
      await wait(1400 + Math.random() * 700);
    }
    onStep('STAKE CONFIRMED');
    await wait(900);
    return {
      ok: true,
      mode: 'demo',
      reference: `DEMO-${tokenId}-${Date.now().toString(36).toUpperCase()}`,
      amount,
      note: 'Simulated. No transaction was broadcast and no ETH moved.',
    };
  },

  async claimReward({ tokenId, amount, symbol }) {
    await wait(1600);
    return {
      ok: true,
      mode: 'demo',
      reference: `DEMO-CLAIM-${tokenId}-${Date.now().toString(36).toUpperCase()}`,
      amount,
      symbol,
      note: 'Simulated. No tokens were transferred.',
    };
  },
};

/**
 * Placeholder for the future production implementation. It intentionally
 * throws: nothing should ever silently fall through to a fake transaction.
 */
export const onChainTransactionService = {
  mode: 'production',
  async stake() { throw new Error('On-chain staking is not implemented yet.'); },
  async claimReward() { throw new Error('On-chain claiming is not implemented yet.'); },
};

export const transactionService =
  STEP2.mode === 'production' ? onChainTransactionService : demoTransactionService;

export const isDemo = () => transactionService.mode === 'demo';
