import { useState, useEffect } from 'react';
import { Cpu, ShieldCheck, ShieldAlert, Clock, Settings, RotateCcw, AlertTriangle, X, ExternalLink } from 'lucide-react';
import { getBlockchain, verifyBlockchainIntegrity, resetBlockchain, tamperBlock } from '../utils/state';
import { calculateBlockHash } from '../utils/blockchain';

export default function BlockchainLedger() {
  const [chain, setChain] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [integrity, setIntegrity] = useState({ valid: true });
  const [isVerifying, setIsVerifying] = useState(false);
  const [tamperedBlockIndex, setTamperedBlockIndex] = useState(null);
  const [tamperText, setTamperText] = useState('');

  useEffect(() => {
    let active = true;
    const loadChain = async () => {
      try {
        const chainData = await getBlockchain();
        const integrityData = await verifyBlockchainIntegrity();
        if (active) {
          setChain(chainData);
          setIntegrity(integrityData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadChain();
    window.addEventListener('storage', loadChain);
    return () => {
      active = false;
      window.removeEventListener('storage', loadChain);
    };
  }, []);

  // Handle Verify button click with animation
  const handleVerifyLedger = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
    }, 800);
  };

  // Simulate data tampering
  const handleTamper = async (blockIndex) => {
    try {
      const rawChain = await getBlockchain();
      const targetBlock = rawChain.find(b => b.index === blockIndex);
      if (!targetBlock) return;

      // Open tamper input modal
      setTamperedBlockIndex(blockIndex);
      setTamperText(JSON.stringify(targetBlock.transactions));
    } catch (err) {
      console.error(err);
    }
  };

  const commitTamper = async () => {
    if (tamperedBlockIndex === null) return;
    
    try {
      const parsedTxs = JSON.parse(tamperText);
      await tamperBlock(tamperedBlockIndex, parsedTxs);
      setTamperedBlockIndex(null);
    } catch {
      alert('Invalid JSON transaction structure. Ensure layout is correct.');
    }
  };

  // Reset chain back to original
  const handleResetChain = async () => {
    if (window.confirm('Are you sure you want to reset the blockchain ledger and seed default data?')) {
      setIsLoading(true);
      try {
        await resetBlockchain();
        window.location.reload();
      } catch (err) {
        console.error(err);
        setIsLoading(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <div className="mining-spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="ledger-view-header">
        <div>
          <h2 className="header-title-area" style={{ fontSize: '1.5rem', fontWeight: '700' }}>Cryptographic Blockchain Ledger</h2>
          <p className="text-muted" style={{ fontSize: '0.9rem' }}>Immutable smart ledger audit trail of all asset modifications and trustee claims.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn btn-secondary"
            onClick={handleResetChain}
            title="Reset to default ledger state"
          >
            <RotateCcw size={16} /> Reset Ledger
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleVerifyLedger}
            disabled={isVerifying}
          >
            {isVerifying ? (
              <span className="mining-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
            ) : (
              <>
                <Cpu size={16} /> Verify Chain Integrity
              </>
            )}
          </button>
        </div>
      </div>

      {/* Verification Status Banner */}
      <div className={`blockchain-verification-banner ${integrity.valid ? 'success' : 'error'}`}>
        {integrity.valid ? (
          <>
            <ShieldCheck size={24} style={{ flexShrink: 0 }} />
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Ledger Intact & Secured</h3>
              <p style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                All transaction links match perfectly. Recalculated SHA-256 blocks are locked and secure against modifications.
              </p>
            </div>
          </>
        ) : (
          <>
            <ShieldAlert size={24} style={{ flexShrink: 0 }} />
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Ledger Verification Fault Detected!</h3>
              <p style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                {integrity.errorDetails || 'Block linkage altered. Verification check failed.'} (Failed Block Index: #{integrity.brokenIndex}).
              </p>
            </div>
          </>
        )}
      </div>

      {/* Blockchain timeline list */}
      <div className="blockchain-chain">
        {chain.map((block) => {
          const storedHash = block.hash;
          const recomputedHash = calculateBlockHash(block);
          const isTampered = storedHash !== recomputedHash;

          return (
            <div key={block.index} className="blockchain-block">
              {/* Visual index node */}
              <div className={`block-node ${block.index === 0 ? '' : 'mined'}`} style={{ borderColor: isTampered ? 'var(--accent-rose)' : undefined, color: isTampered ? 'var(--accent-rose)' : undefined }}>
                <span className="block-node-index">#{block.index}</span>
                <span className="block-node-label">{block.index === 0 ? 'GENESIS' : 'BLOCK'}</span>
              </div>

              {/* Block content details card */}
              <div className="block-data-card" style={{ borderColor: isTampered ? 'rgba(255, 56, 96, 0.4)' : undefined, backgroundColor: isTampered ? 'rgba(255, 56, 96, 0.02)' : undefined }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <Clock size={12} />
                    <span>Mined: {new Date(block.timestamp).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', fontFamily: 'monospace' }}>
                      Nonce: {block.nonce}
                    </span>
                    {block.index !== 0 && (
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                        onClick={() => handleTamper(block.index)}
                        title="Simulate modifying this block's data"
                      >
                        <Settings size={10} /> Tamper Data
                      </button>
                    )}
                  </div>
                </div>

                {/* Transactions logged inside */}
                <div style={{ margin: '10px 0' }}>
                  <span className="form-label" style={{ fontSize: '0.75rem', marginBottom: '6px' }}>Ledger Ledger Transactions</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {block.transactions.map((tx, idx) => (
                      <div key={idx} style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', marginBottom: '2px' }}>
                          <span className="text-cyan">{tx.action}</span>
                          <span className="text-muted" style={{ fontSize: '0.75rem' }}>{tx.user}</span>
                        </div>
                        <div style={{ color: 'var(--text-main)' }}>{tx.details}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cryptographic Linkage Hash Fields */}
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div className="block-hash-line">
                    <div>
                      <span className="text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', marginRight: '6px' }}>Prev Hash:</span>
                      <span style={{ color: 'var(--text-muted)' }}>{block.previousHash}</span>
                    </div>
                  </div>
                  <div className="block-hash-line" style={{ borderLeft: isTampered ? '3px solid var(--accent-rose)' : '3px solid var(--accent-cyan)' }}>
                    <div>
                      <span className="text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', marginRight: '6px' }}>Block Hash:</span>
                      <span style={{ color: isTampered ? 'var(--accent-rose)' : 'var(--text-main)' }}>{storedHash}</span>
                    </div>
                    {isTampered && (
                      <span className="text-rose" style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700' }}>
                        <AlertTriangle size={12} /> TAMPERED (Computed: {recomputedHash.substring(0, 10)}...)
                      </span>
                    )}
                  </div>

                  {/* Polygon On-Chain Anchor */}
                  {(() => {
                    const txHash = block.polygonTxHash || ('0x' + storedHash);
                    const isSimulated = !block.polygonTxHash;
                    return (
                      <div style={{ marginTop: '8px', padding: '8px 12px', borderRadius: '6px', backgroundColor: isSimulated ? 'rgba(138, 43, 226, 0.03)' : 'rgba(138, 43, 226, 0.06)', border: isSimulated ? '1px solid rgba(138, 43, 226, 0.1)' : '1px solid rgba(138, 43, 226, 0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', color: '#8a2be2', letterSpacing: '0.5px' }}>
                              ⬡ Polygon Amoy {isSimulated && '(Simulated)'}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              Tx: {txHash.substring(0, 16)}...{txHash.substring(txHash.length - 8)}
                            </span>
                          </div>
                          <a 
                            href={`https://amoy.polygonscan.com/tx/${txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '0.7rem', color: '#8a2be2', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontWeight: '600' }}
                          >
                            View on Polygonscan <ExternalLink size={10} />
                          </a>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tamper Modal */}
      {tamperedBlockIndex !== null && (
        <div className="mining-overlay">
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', position: 'relative' }}>
            <button 
              className="btn btn-secondary" 
              style={{ position: 'absolute', right: '20px', top: '20px', padding: '6px' }}
              onClick={() => setTamperedBlockIndex(null)}
            >
              <X size={16} />
            </button>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '14px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <AlertTriangle className="text-rose" size={20} />
              Simulate Block Tampering (Block #{tamperedBlockIndex})
            </h3>
            <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '16px' }}>
              Alter the block's transaction payload text below. Committing this change will break the cryptographic hash chain link.
            </p>

            <div className="form-group">
              <label className="form-label">Transaction Payload JSON</label>
              <textarea 
                className="form-input" 
                style={{ minHeight: '120px', fontFamily: 'monospace', fontSize: '0.8rem', resize: 'vertical' }}
                value={tamperText}
                onChange={(e) => setTamperText(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setTamperedBlockIndex(null)}>Cancel</button>
              <button className="btn btn-rose" onClick={commitTamper}>Force Commit Modification</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
