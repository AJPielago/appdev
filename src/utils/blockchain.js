// Simulated Cryptographic Blockchain Utility

/**
 * Deterministically hashes a string to a 64-character hex string (256-bit representation).
 */
export function hashString(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57, h3 = 0xfae900d1, h4 = 0x2f8b501a;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 3818301643);
    h4 = Math.imul(h4 ^ ch, 2901237911);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h3 ^ (h3 >>> 13), 3266489909);
  h3 = Math.imul(h3 ^ (h3 >>> 16), 2246822507) ^ Math.imul(h4 ^ (h4 >>> 13), 3266489909);
  h4 = Math.imul(h4 ^ (h4 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  
  const toHex = (n) => (n >>> 0).toString(16).padStart(8, '0');
  
  // Combine these parts to output a 64-character hexadecimal representation
  return toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4) + 
         toHex(h1 ^ h2) + toHex(h2 ^ h3) + toHex(h3 ^ h4) + toHex(h4 ^ h1);
}

/**
 * Calculates the hash of a block structure.
 */
export function calculateBlockHash(block) {
  const str = block.index + 
              block.timestamp + 
              JSON.stringify(block.transactions) + 
              block.previousHash + 
              block.nonce;
  return hashString(str);
}

/**
 * Creates the genesis (first) block of the blockchain.
 */
export function createGenesisBlock() {
  const genesisBlock = {
    index: 0,
    timestamp: new Date('2026-06-01T00:00:00.000Z').toISOString(),
    transactions: [
      {
        action: 'GENESIS_BLOCK',
        user: 'SYSTEM',
        details: 'DigitalWill Ledger Initialized. Cryptographic security active.',
        timestamp: '2026-06-01T00:00:00.000Z'
      }
    ],
    previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
    nonce: 0,
    hash: ''
  };
  genesisBlock.hash = calculateBlockHash(genesisBlock);
  return genesisBlock;
}

/**
 * Mines a new block with a simple proof-of-work difficulty.
 */
export function mineBlock(index, transactions, previousHash, difficulty = 2) {
  const block = {
    index,
    timestamp: new Date().toISOString(),
    transactions,
    previousHash,
    nonce: 0,
    hash: ''
  };
  
  const targetPrefix = '0'.repeat(difficulty);
  while (true) {
    const hash = calculateBlockHash(block);
    if (hash.startsWith(targetPrefix)) {
      block.hash = hash;
      break;
    }
    block.nonce++;
    if (block.nonce > 500000) { // Safety break
      block.hash = hash;
      break;
    }
  }
  return block;
}

/**
 * Validates the integrity of the blockchain.
 * Returns an object: { valid: boolean, errorDetails: string | null, brokenIndex: number | null }
 */
export function validateChain(chain) {
  if (!chain || chain.length === 0) {
    return { valid: false, errorDetails: 'Empty chain', brokenIndex: 0 };
  }
  
  // Verify Genesis block
  const genesis = chain[0];
  if (genesis.index !== 0) {
    return { valid: false, errorDetails: 'Invalid genesis block index', brokenIndex: 0 };
  }
  const genesisHashComputed = calculateBlockHash(genesis);
  if (genesis.hash !== genesisHashComputed) {
    return { valid: false, errorDetails: 'Genesis block hash does not match content', brokenIndex: 0 };
  }
  
  // Verify subsequent blocks
  for (let i = 1; i < chain.length; i++) {
    const current = chain[i];
    const previous = chain[i - 1];
    
    // Check indices
    if (current.index !== previous.index + 1) {
      return { valid: false, errorDetails: `Invalid block index sequence between blocks ${previous.index} and ${current.index}`, brokenIndex: i };
    }
    
    // Check block hash recalculation
    const currentHashComputed = calculateBlockHash(current);
    if (current.hash !== currentHashComputed) {
      return { valid: false, errorDetails: `Block ${current.index} data hash has been tampered with or computed incorrectly`, brokenIndex: i };
    }
    
    // Check block linkage
    if (current.previousHash !== previous.hash) {
      return { valid: false, errorDetails: `Block ${current.index} links back to an invalid previous hash (chain broken)`, brokenIndex: i };
    }
  }
  
  return { valid: true, errorDetails: null, brokenIndex: null };
}
