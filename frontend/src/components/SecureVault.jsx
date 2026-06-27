import { useState, useEffect } from 'react';
import { 
  UploadCloud, File, Key, Lock, Unlock, 
  Trash2, Plus, Eye, EyeOff, FileText, CheckCircle2, Globe, ExternalLink 
} from 'lucide-react';
import { getDocuments, uploadDocument, deleteDocument, logActivity, getEncryptionKey } from '../utils/state';
import { encryptData, decryptData } from '../utils/crypto';

export default function SecureVault({ triggerMining }) {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('documents'); // 'documents' | 'credentials'
  
  // File upload state
  const [encryptionLog, setEncryptionLog] = useState([]);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [showEncryptedPreview, setShowEncryptedPreview] = useState(false);
  const [encryptedHex, setEncryptedHex] = useState('');
  
  // Credentials locker states
  const [credName, setCredName] = useState('');
  const [credUsername, setCredUsername] = useState('');
  const [credSecret, setCredSecret] = useState('');
  const [showSecrets, setShowSecrets] = useState({});
  const [credentialsList, setCredentialsList] = useState([]);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        const docsData = await getDocuments();
        
        // Decrypt cached credentials locker from LocalStorage
        const raw = localStorage.getItem('dw_vault_credentials');
        const key = getEncryptionKey();
        let decryptedCreds = [];
        if (raw && key) {
          try {
            const decrypted = await decryptData(raw, key);
            decryptedCreds = JSON.parse(decrypted);
          } catch (err) {
            console.error('Failed to decrypt credentials:', err);
          }
        } else if (!raw) {
          // Initialize default credentials
          decryptedCreds = [
            { id: 'crd_1', name: 'Primary Gmail Account', username: 'alex.joyous@gmail.com', secret: 'GmailPass9981!@', hash: '5B2F90DC8E2A7FA1C9D5E2F32B1A5C4D', key: 'key_dw_crd1_aes256', createdAt: new Date('2026-06-05T09:45:00Z').toISOString() },
            { id: 'crd_2', name: 'Ethereum Ledger Seed Phrase', username: 'alex.wallet.eth', secret: 'ocean breeze crystal forest elephant orange window river solar dynamic galaxy shield', hash: '8F3E0A9B8D7C6E5F4D3C2B1A0F9E8D7C', key: 'key_dw_crd2_aes256', createdAt: new Date('2026-06-06T11:20:00Z').toISOString() }
          ];
          if (key) {
            const encrypted = await encryptData(JSON.stringify(decryptedCreds), key);
            localStorage.setItem('dw_vault_credentials', encrypted);
          }
        }
        
        if (active) {
          setDocuments(docsData);
          setCredentialsList(decryptedCreds);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadData();
    window.addEventListener('storage', loadData);
    return () => {
      active = false;
      window.removeEventListener('storage', loadData);
    };
  }, []);

  const saveCredentials = async (newList) => {
    setCredentialsList(newList);
    const key = getEncryptionKey();
    if (key) {
      const encrypted = await encryptData(JSON.stringify(newList), key);
      localStorage.setItem('dw_vault_credentials', encrypted);
    } else {
      localStorage.setItem('dw_vault_credentials', JSON.stringify(newList));
    }
  };

  // Handle local file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadComplete(false);
    setIsEncrypting(true);
    setEncryptionLog(['[SYSTEM] Initializing AES-256 encryption engine...']);

    // Read file as Base64 to simulate encrypted storage
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      
      // Generate some dummy encrypted hex bytes
      const hex = Array.from({ length: 120 }, () => 
        Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase()
      ).join(' ');

      setEncryptedHex(hex);

      // Simulate step-by-step matrix encryption logs
      let steps = [
        '[SYSTEM] Initializing AES-256 encryption engine...',
        `[FILE] Loaded "${file.name}" (${(file.size / 1024).toFixed(1)} KB)`,
        '[ENCRYPT] Generating 256-bit symmetric block key...',
        `[KEY] Derived Cipher Key: key_dw_${Math.random().toString(36).substring(2, 7)}_aes256`,
        '[ENCRYPT] Applying PKCS#7 padding...',
        '[ENCRYPT] Execution Round 1 (SubBytes & ShiftRows)...',
        '[ENCRYPT] Execution Round 5 (MixColumns)...',
        '[ENCRYPT] Execution Round 10 (AddRoundKey)...',
        '[SUCCESS] Cipher block chaining successfully finalized.',
        '[IPFS] Pinning encrypted payload to IPFS network via Pinata...',
        '[IPFS] Generating Content Identifier (CID)...',
        '[POLYGON] Anchoring IPFS CID on Polygon Amoy testnet...',
        '[SUCCESS] Encrypted hash written. IPFS + On-chain signature appended.'
      ];

      let currentStepIndex = 0;
      const interval = setInterval(() => {
        const nextStep = steps[currentStepIndex];
        if (nextStep) {
          setEncryptionLog(prev => [...prev, nextStep]);
        }
        currentStepIndex++;
        if (currentStepIndex >= steps.length) {
          clearInterval(interval);
          setIsEncrypting(false);
          setUploadComplete(true);
          
           // Actually write the document to local storage state
          triggerMining(`secure document upload: ${file.name}`, async () => {
            await uploadDocument({
              name: file.name,
              fileType: file.name.split('.').pop(),
              fileSize: `${(file.size / 1024).toFixed(1)} KB`,
              base64Data: base64
            });
          });
        }
      }, 250);
    };

    reader.readAsDataURL(file);
  };

  // Download Decrypted File
  const handleDownload = async (doc) => {
    try {
      if (!doc.base64Data) {
        alert('Could not download document. Decryption failed or key is missing.');
        return;
      }

      const link = document.createElement('a');
      let url = doc.base64Data;
      let isBlob = false;

      if (doc.base64Data.startsWith('data:')) {
        const res = await fetch(doc.base64Data);
        const blob = await res.blob();
        url = URL.createObjectURL(blob);
        isBlob = true;
      }

      link.href = url;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (isBlob) {
        setTimeout(() => URL.revokeObjectURL(url), 100);
      }
      
      // Log decryption activity
      logActivity('SYSTEM', 'alex@will.com', 'DOCUMENT_DECRYPTED', `Decrypted and retrieved file "${doc.name}"`, 'vault');
    } catch (err) {
      console.error('Download failed:', err);
      alert('Could not download document. Ensure data is correct.');
    }
  };

  // Preview Decrypted File in Browser Tab
  const handlePreview = async (e, doc) => {
    if (doc.base64Data && doc.base64Data.startsWith('data:')) {
      e.preventDefault();
      try {
        const res = await fetch(doc.base64Data);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } catch (err) {
        console.error('Preview failed:', err);
        window.open(doc.gatewayUrl || `https://gateway.pinata.cloud/ipfs/${doc.ipfsCid}?filename=${encodeURIComponent(doc.name)}.enc&download=true`, '_blank');
      }
    }
  };

  const handleDeleteDoc = (id, docName) => {
    if (window.confirm(`Are you sure you want to delete the legal document "${docName}"?`)) {
      triggerMining(`secure document removal: ${docName}`, async () => {
        await deleteDocument(id);
      });
    }
  };

  // Add credentials locker
  const handleAddCredential = (e) => {
    e.preventDefault();
    if (!credName || !credUsername || !credSecret) {
      alert('Please fill in all credential fields.');
      return;
    }

    const newCred = {
      id: 'crd_' + Date.now(),
      name: credName,
      username: credUsername,
      secret: credSecret,
      hash: Array.from({length: 32}, () => Math.floor(Math.random()*16).toString(16)).join('').toUpperCase(),
      key: 'key_dw_crd_' + Math.random().toString(36).substring(2, 6) + '_aes256',
      createdAt: new Date().toISOString()
    };

    triggerMining(`secure credentials deposit: ${credName}`, () => {
      const updated = [...credentialsList, newCred];
      saveCredentials(updated);
      setCredName('');
      setCredUsername('');
      setCredSecret('');
    });
  };

  const handleDeleteCredential = (id, cName) => {
    if (window.confirm(`Are you sure you want to delete credentials for "${cName}"?`)) {
      triggerMining(`secure credentials removal: ${cName}`, () => {
        const filtered = credentialsList.filter(c => c.id !== id);
        saveCredentials(filtered);
      });
    }
  };

  const toggleSecret = (id) => {
    setShowSecrets(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
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
      <div className="card-header" style={{ marginBottom: '24px' }}>
        <div>
          <h2 className="header-title-area" style={{ fontSize: '1.5rem', fontWeight: '700' }}>Secure Digital Vault</h2>
          <p className="text-muted" style={{ fontSize: '0.9rem' }}>Upload sensitive legal papers and store logins under local simulated AES-256 encryption.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={`btn ${activeSubTab === 'documents' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveSubTab('documents')}
          >
            <File size={16} /> Legal Documents
          </button>
          <button 
            className={`btn ${activeSubTab === 'credentials' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveSubTab('credentials')}
          >
            <Key size={16} /> Credentials Locker
          </button>
        </div>
      </div>

      <div className="vault-layout">
        {/* Left column: Upload form / add form */}
        <div className="glass-card" style={{ height: 'fit-content' }}>
          {activeSubTab === 'documents' ? (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '14px' }}>Upload Legal Document</h3>
              <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '20px' }}>
                Upload files like Wills, Powers of Attorney, ID scans, or estate details. The file will be encrypted on the client side.
              </p>

              <label className="dropzone-container">
                <UploadCloud size={32} className="text-cyan" />
                <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Select file to upload</span>
                <span className="text-muted" style={{ fontSize: '0.75rem' }}>PDF, DOCX, TXT (Max 2MB)</span>
                <input 
                  type="file" 
                  style={{ display: 'none' }} 
                  accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg" 
                  onChange={handleFileChange}
                  disabled={isEncrypting}
                />
              </label>

              {/* Encryption simulation monitor */}
              {(isEncrypting || uploadComplete) && (
                <div style={{ marginTop: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' }}>
                      {isEncrypting ? 'AES-256 Cipher Engine' : 'Cipher Ready'}
                    </span>
                    {uploadComplete && (
                      <span className="text-emerald" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                        <CheckCircle2 size={12} /> Encrypted
                      </span>
                    )}
                  </div>
                  <div className="encryption-visualizer">
                    {encryptionLog.map((log, idx) => (
                      <div key={idx} style={{ color: log && log.startsWith('[SUCCESS]') ? 'var(--accent-emerald)' : '#39ff14' }}>
                        {log}
                      </div>
                    ))}
                    {isEncrypting && <div className="mining-spinner" style={{ width: '12px', height: '12px', borderWidth: '1px', display: 'inline-block', marginLeft: '6px' }}></div>}
                  </div>
                  
                  {uploadComplete && (
                    <button 
                      className="btn btn-secondary" 
                      style={{ width: '100%', fontSize: '0.75rem', padding: '6px 12px', marginTop: '10px' }}
                      onClick={() => setShowEncryptedPreview(prev => !prev)}
                    >
                      {showEncryptedPreview ? 'Hide Encrypted Ciphertext' : 'View Encrypted Hex Bytes'}
                    </button>
                  )}
                  
                  {showEncryptedPreview && uploadComplete && (
                    <div style={{ marginTop: '8px', padding: '10px', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: '6px', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', wordBreak: 'break-all', border: '1px solid var(--border-color)', maxHeight: '100px', overflowY: 'auto' }}>
                      {encryptedHex}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '14px' }}>Deposit Secure Login</h3>
              <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '20px' }}>
                Store master account passwords, encryption keys, or pin codes to be released to beneficiaries.
              </p>

              <form onSubmit={handleAddCredential}>
                <div className="form-group">
                  <label className="form-label">Platform Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Primary Gmail, Coinbase Account" 
                    value={credName}
                    onChange={(e) => setCredName(e.target.value)}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Username / Account ID</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. alex.joyous@gmail.com" 
                    value={credUsername}
                    onChange={(e) => setCredUsername(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password / Secret Key</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter password or seed phrase text" 
                    value={credSecret}
                    onChange={(e) => setCredSecret(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  <Plus size={16} /> Encrypt & Add Credential
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right column: List of items */}
        <div>
          {activeSubTab === 'documents' ? (
            <div className="glass-card" style={{ minHeight: '340px' }}>
              <div className="card-header">
                <h3 className="card-title">
                  <FileText size={18} className="text-cyan" />
                  Encrypted Documents ({documents.length})
                </h3>
              </div>

              {documents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                  <Lock size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
                  <p>No documents uploaded yet. Upload digital copy of Wills or assets above.</p>
                </div>
              ) : (
                <div>
                  {documents.map((doc) => (
                    <div key={doc.id} className="document-item">
                      <div className="document-info">
                        <div className="document-icon-wrapper">
                          {doc.storageType === 'ipfs' ? (
                            <Globe className="text-emerald" size={18} />
                          ) : (
                            <File className="text-cyan" size={18} />
                          )}
                        </div>
                        <div>
                          <div className="document-name">
                            {doc.name}
                            {doc.storageType === 'ipfs' && (
                              <span style={{ marginLeft: '8px', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(5, 217, 195, 0.1)', border: '1px solid rgba(5, 217, 195, 0.3)', color: 'var(--accent-emerald)', fontWeight: '700', textTransform: 'uppercase' }}>IPFS</span>
                            )}
                          </div>
                          <div className="document-meta">
                            {doc.fileSize} • Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                            {!doc.base64Data && (
                              <span className="text-rose" style={{ marginLeft: '8px', fontSize: '0.75rem', fontWeight: '600' }}>• Decryption Failed / Key Missing</span>
                            )}
                          </div>
                          {doc.ipfsCid && (
                            <div style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ color: 'var(--accent-emerald)' }}>CID:</span> {doc.ipfsCid.substring(0, 20)}...
                              <a href={doc.gatewayUrl || `https://gateway.pinata.cloud/ipfs/${doc.ipfsCid}?filename=${encodeURIComponent(doc.name)}.enc&download=true`} onClick={(e) => handlePreview(e, doc)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-cyan)', display: 'inline-flex', alignItems: 'center' }} title="View on IPFS Gateway">
                                <ExternalLink size={10} />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          onClick={() => handleDownload(doc)}
                          title="Decrypt & Download File"
                        >
                          <Unlock size={12} /> Decrypt & Save
                        </button>
                        <button 
                          className="btn btn-rose" 
                          style={{ padding: '6px 10px' }}
                          onClick={() => handleDeleteDoc(doc.id, doc.name)}
                          title="Delete Document"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card" style={{ minHeight: '340px' }}>
              <div className="card-header">
                <h3 className="card-title">
                  <Key size={18} className="text-cyan" />
                  Secure Credentials Locker ({credentialsList.length})
                </h3>
              </div>

              {credentialsList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                  <Lock size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
                  <p>Locker is empty. Add a secure password or seed phrase to keep it safe.</p>
                </div>
              ) : (
                <div>
                  {credentialsList.map((c) => (
                    <div key={c.id} className="document-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div className="document-name">{c.name}</div>
                          <div className="document-meta" style={{ fontFamily: 'monospace' }}>
                            User: {c.username}
                          </div>
                        </div>
                        <button 
                          className="btn btn-rose" 
                          style={{ padding: '4px 8px' }}
                          onClick={() => handleDeleteCredential(c.id, c.name)}
                          title="Delete credentials"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                        <div style={{ flexGrow: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          <span className="text-muted">Secret: </span>
                          {showSecrets[c.id] ? (
                            <span style={{ color: 'var(--accent-emerald)', wordBreak: 'break-all' }}>{c.secret}</span>
                          ) : (
                            <span style={{ letterSpacing: '2px', color: 'var(--text-muted)' }}>••••••••••••</span>
                          )}
                        </div>
                        
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '4px 8px', fontSize: '0.75rem', height: 'auto' }}
                          onClick={() => toggleSecret(c.id)}
                        >
                          {showSecrets[c.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                          {showSecrets[c.id] ? 'Hide' : 'Reveal'}
                        </button>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '2px' }}>
                        <span>Derived Key: {c.key}</span>
                        <span>Hash: {c.hash.substring(0, 12)}...</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
