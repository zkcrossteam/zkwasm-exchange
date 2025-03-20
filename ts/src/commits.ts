import {TxWitness} from 'zkwasm-ts-server/src/prover';
// Import CommitModel from zkwasm-ts-server instead of defining our own
import { CommitModel } from 'zkwasm-ts-server/src/commit.js';
// Re-export CommitModel for use in other files
export { CommitModel };

export const getTxFromCommit = async (key: string): Promise<TxWitness[]> => {
  try {
    const commit = await CommitModel.findOne({ key });
    if (commit) {
      console.info(`replay uncommitted transactions for commit ${key}: total ${commit.items.length}`);
      return commit.items.map((x) => {
        return {
          msg: x.msg,
          pkx: x.pkx,
          pky: x.pky,
          sigx: x.sigx,
          sigy: x.sigy,
          sigr: x.sigr,
        };
      });
    } else {
      console.info(`non transactions recorded for commit ${key}`);
      return [];
    }
  } catch (error) {
    console.info(`non transactions recorded for commit ${key}`);
    return [];
  }
}

export const clearTxFromCommit = async (key: string) => {
  try {
    await CommitModel.findOneAndUpdate({
      key: key
    }, {
      key: key,
      items: []
    }, {
      upsert: true
    });
  } catch (error) {
    console.info(`fatal: clear commits should not fail`);
    process.exit(1);
  }
}

export const insertTxIntoCommit = async (key: string, tx: TxWitness, counter: number) => {
  try {
    const commit = await CommitModel.findOne({ key });

    if (commit) {
      // If key exists, push new item to items array
      if (commit.items.length <= counter) {
        commit.items.push(tx);
        await commit.save();
      }
    } else {
      // If key does not exist, create a new commit record
      const newCommit = new CommitModel({
        key,
        items: [tx], // Insert the new item as the first element
      });
      await newCommit.save();
    }

    console.log(`Transaction inserted successfully into key: ${key}`);
    return { success: true, message: 'Transaction inserted' };
  } catch (error) {
    console.error('Error inserting transaction:', error);
    return { success: false, message: 'Failed to insert transaction' };
  }
};
