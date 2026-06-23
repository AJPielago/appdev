import { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Shield, Key, 
  Unlock, ShieldAlert, Clock, CheckCircle2, Trash2, X 
} from 'lucide-react';
import { 
  getContacts, addContact, updateContactPermissions, deleteContact, 
  getAssets, getDocuments, getActiveRole, submitClaim, resetClaim,
  getEncryptionKey
} from '../utils/state';
import { encryptWithKey } from '../utils/crypto';

export default function TrustedContacts({ triggerMining }) {
  const role = getActiveRole();
  const [contacts, setContacts] = useState([]);
  const [allAssets, setAllAssets] = useState([]);
  const [allDocuments, setAllDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Owner mode states
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('Spouse');
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [selectedDocs, setSelectedDocs] = useState([]);
  
  // Managing permissions modal
  const [managingPermissionsContact, setManagingPermissionsContact] = useState(null);
  
  // Beneficiary claim portal states
  const [claimEmail, setClaimEmail] = useState('');
  const [claimCode, setClaimCode] = useState('');
  const [claimNotes, setClaimNotes] = useState('');
  const [claimMessage, setClaimMessage] = useState(null);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        const [contactsData, assetsData, docsData] = await Promise.all([
          getContacts(),
          getAssets(),
          getDocuments()
        ]);
        if (active) {
          setContacts(contactsData);
          setAllAssets(assetsData);
          setAllDocuments(docsData);
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

  // Toggle selection helpers
  const toggleAssetSelection = (assetId) => {
    setSelectedAssets(prev => 
      prev.includes(assetId) ? prev.filter(id => id !== assetId) : [...prev, assetId]
    );
  };

  const toggleDocSelection = (docId) => {
    setSelectedDocs(prev => 
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  // Add Contact Submit
  const handleAddContactSubmit = (e) => {
    e.preventDefault();
    if (!name || !email) {
      alert('Please fill in Name and Email fields.');
      return;
    }

    triggerMining(`trusted trustee registration: ${name}`, async () => {
      const accessCode = 'WILL-' + name.split(' ')[0].toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);
      const key = getEncryptionKey();
      const wrappedKey = key ? await encryptWithKey(key, accessCode) : '';

      await addContact({
        name,
        email,
        relationship,
        assignedAssets: selectedAssets,
        assignedDocuments: selectedDocs,
        accessCode,
        wrappedKey
      });
      
      // Reset form
      setName('');
      setEmail('');
      setRelationship('Spouse');
      setSelectedAssets([]);
      setSelectedDocs([]);
      setIsAdding(false);
    });
  };

  // Delete contact
  const handleDeleteContact = (id, cName) => {
    if (window.confirm(`Are you sure you want to revoke trustee access for "${cName}"?`)) {
      triggerMining(`trusted trustee revocation: ${cName}`, async () => {
        await deleteContact(id);
      });
    }
  };

  // Save modified permissions
  const handleSavePermissions = (e) => {
    e.preventDefault();
    triggerMining(`permission matrix updates: ${managingPermissionsContact.name}`, async () => {
      await updateContactPermissions(
        managingPermissionsContact.id,
        selectedAssets,
        selectedDocs
      );
      setManagingPermissionsContact(null);
    });
  };

  // Open permissions manager
  const openPermissionsModal = (contact) => {
    setManagingPermissionsContact(contact);
    setSelectedAssets(contact.assignedAssets);
    setSelectedDocs(contact.assignedDocuments);
  };

  // Beneficiary Claim submission
  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!claimEmail || !claimCode) {
      setClaimMessage({ type: 'error', text: 'Please fill in both Claimant Email and security Access Code.' });
      return;
    }

    const result = await submitClaim(claimEmail, claimCode, claimNotes);
    if (result.success) {
      setClaimMessage({ 
        type: 'success', 
        text: `Claim request for ${result.contact.name} successfully registered. System Admin will verify certificates and approve release.` 
      });
      // clear fields
      setClaimNotes('');
    } else {
      setClaimMessage({ type: 'error', text: result.error });
    }
  };

  // Helper to check claim badges
  const renderClaimBadge = (status) => {
    switch (status) {
      case 'inactive': return <span className="badge-claim inactive">No active claim</span>;
      case 'pending': return <span className="badge-claim pending">Pending Verification</span>;
      case 'approved': return <span className="badge-claim approved">Unlocked & Released</span>;
      case 'rejected': return <span className="badge-claim rejected">Denied / Flagged</span>;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <div className="mining-spinner"></div>
      </div>
    );
  }

  // Render Owner View
  if (role === 'owner') {
    return (
      <div>
        <div className="card-header" style={{ marginBottom: '24px' }}>
          <div>
            <h2 className="header-title-area" style={{ fontSize: '1.5rem', fontWeight: '700' }}>Trusted Contacts & Beneficiaries</h2>
            <p className="text-muted" style={{ fontSize: '0.9rem' }}>Assign trusted individuals who can request access to your digital legacy.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
            <UserPlus size={16} /> Assign Trustee
          </button>
        </div>

        {contacts.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px', borderStyle: 'dashed' }}>
            <Users size={48} className="text-muted" style={{ marginBottom: '16px', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600' }}>No trustees assigned yet</h3>
            <p className="text-muted" style={{ fontSize: '0.9rem', maxWidth: '450px', margin: '8px auto 20px' }}>
              Assign a family member or attorney. They will receive a unique claim key to unlock your designated files in the future.
            </p>
            <button className="btn btn-primary" onClick={() => setIsAdding(true)}>Assign Your First Trustee</button>
          </div>
        ) : (
          <div className="contacts-layout">
            {contacts.map((contact) => (
              <div key={contact.id} className="glass-card contact-card">
                <div>
                  <div className="contact-header">
                    <div className="contact-profile-box">
                      <div className="contact-avatar">
                        {contact.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>{contact.name}</h3>
                        <p className="text-muted" style={{ fontSize: '0.8rem' }}>{contact.relationship} • {contact.email}</p>
                      </div>
                    </div>
                    <button 
                      className="btn btn-rose" 
                      style={{ padding: '6px' }}
                      onClick={() => handleDeleteContact(contact.id, contact.name)}
                      title="Revoke Trustee"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: '8px', border: '1px solid var(--border-color)', margin: '14px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Key size={14} className="text-cyan" />
                      <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>Secure Claim Code:</span>
                    </div>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.9rem', fontWeight: '700', color: 'var(--accent-cyan)' }}>
                      {contact.accessCode}
                    </span>
                  </div>

                  <div className="contact-permissions-matrix">
                    <div className="matrix-title">Allocated Access:</div>
                    <div className="matrix-items">
                      <div className="matrix-item">
                        <span>Digital Asset declarations</span>
                        <span className="text-cyan" style={{ fontWeight: '700' }}>{contact.assignedAssets.length} / {allAssets.length}</span>
                      </div>
                      <div className="matrix-item">
                        <span>Encrypted legal files</span>
                        <span className="text-cyan" style={{ fontWeight: '700' }}>{contact.assignedDocuments.length} / {allDocuments.length}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {renderClaimBadge(contact.claimStatus)}
                  <button 
                    className="btn btn-secondary" 
                    style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                    onClick={() => openPermissionsModal(contact)}
                  >
                    Adjust Allocations
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Contact Modal Panel */}
        {isAdding && (
          <div className="mining-overlay">
            <div className="glass-card" style={{ width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
              <button 
                className="btn btn-secondary" 
                style={{ position: 'absolute', right: '20px', top: '20px', padding: '6px' }}
                onClick={() => setIsAdding(false)}
              >
                <X size={16} />
              </button>

              <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '20px' }}>Assign Trust Beneficiary</h2>
              
              <form onSubmit={handleAddContactSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Beneficiary Full Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Jane Doe" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Relationship Type</label>
                    <select 
                      className="form-input form-select"
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value)}
                    >
                      <option value="Spouse">Spouse</option>
                      <option value="Child">Child</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Parent">Parent</option>
                      <option value="Attorney">Attorney</option>
                      <option value="Trusted Friend">Trusted Friend</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address (For claim notices)</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="jane@will.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {/* Permissions allocation lists */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                  <div>
                    <label className="form-label">Authorize Assets</label>
                    <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {allAssets.map(a => (
                        <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedAssets.includes(a.id)}
                            onChange={() => toggleAssetSelection(a.id)}
                          />
                          <span>{a.name}</span>
                        </label>
                      ))}
                      {allAssets.length === 0 && <span className="text-muted" style={{ fontSize: '0.75rem' }}>No assets declared.</span>}
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Authorize Legal Files</label>
                    <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {allDocuments.map(d => (
                        <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedDocs.includes(d.id)}
                            onChange={() => toggleDocSelection(d.id)}
                          />
                          <span>{d.name}</span>
                        </label>
                      ))}
                      {allDocuments.length === 0 && <span className="text-muted" style={{ fontSize: '0.75rem' }}>No files uploaded.</span>}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsAdding(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create & Mine Key
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Permissions Modal Panel */}
        {managingPermissionsContact && (
          <div className="mining-overlay">
            <div className="glass-card" style={{ width: '100%', maxWidth: '580px', position: 'relative' }}>
              <button 
                className="btn btn-secondary" 
                style={{ position: 'absolute', right: '20px', top: '20px', padding: '6px' }}
                onClick={() => setManagingPermissionsContact(null)}
              >
                <X size={16} />
              </button>

              <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '10px' }}>
                Adjust Allocations for {managingPermissionsContact.name}
              </h2>
              <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '20px' }}>
                Specify which files and assets the claim code `{managingPermissionsContact.accessCode}` will decrypt.
              </p>

              <form onSubmit={handleSavePermissions}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <label className="form-label">Authorize Assets</label>
                    <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {allAssets.map(a => (
                        <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedAssets.includes(a.id)}
                            onChange={() => toggleAssetSelection(a.id)}
                          />
                          <span>{a.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Authorize Legal Files</label>
                    <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {allDocuments.map(d => (
                        <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedDocs.includes(d.id)}
                            onChange={() => toggleDocSelection(d.id)}
                          />
                          <span>{d.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setManagingPermissionsContact(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Commit Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render Beneficiary Claim View
  // We assume the beneficiary email for testing is 'jane@will.com' (Access key: 'WILL-JANE-589')
  const janeContact = contacts.find(c => c.email.toLowerCase() === 'jane@will.com');
  const claimStatus = janeContact ? janeContact.claimStatus : 'inactive';

  return (
    <div className="claim-portal-wrapper">
      <div className="glass-card" style={{ marginBottom: '24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Shield size={36} className="text-cyan" style={{ marginBottom: '10px' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: '700' }}>Beneficiary Inheritance Access Portal</h2>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>
            Submit your designated security access token to claim legacy documentation.
          </p>
        </div>

        {claimMessage && (
          <div className={`blockchain-verification-banner ${claimMessage.type === 'success' ? 'success' : 'error'}`} style={{ padding: '12px 16px', fontSize: '0.85rem', marginBottom: '20px' }}>
            {claimMessage.type === 'success' ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
            <span>{claimMessage.text}</span>
          </div>
        )}

        {claimStatus === 'inactive' && (
          <form onSubmit={handleClaimSubmit}>
            <div className="form-group">
              <label className="form-label">Your Registered Email</label>
              <input 
                type="email" 
                className="form-input" 
                placeholder="jane@will.com" 
                value={claimEmail}
                onChange={(e) => setClaimEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Will Security Access Code</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="WILL-XXXX-XXX" 
                value={claimCode}
                onChange={(e) => setClaimCode(e.target.value)}
              />
              <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '6px' }}>
                * Standard test credential: Email: `jane@will.com` | Code: `WILL-JANE-589`
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Claim Purpose / Accompanying Notes</label>
              <textarea 
                className="form-input" 
                style={{ minHeight: '80px', resize: 'vertical' }}
                placeholder="Briefly state the reason for this claim request (e.g. executing estate guidelines)."
                value={claimNotes}
                onChange={(e) => setClaimNotes(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-emerald" style={{ width: '100%' }}>
              <Unlock size={16} /> Submit Inheritance Access Claim
            </button>
          </form>
        )}

        {claimStatus === 'pending' && (
          <div style={{ textAlign: 'center', padding: '30px 10px' }}>
            <Clock size={40} className="text-amber" style={{ animation: 'pulse 2s infinite', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Inheritance Claim Pending Verification</h3>
            <p className="text-muted" style={{ fontSize: '0.85rem', maxWidth: '400px', margin: '8px auto 20px' }}>
              Your access request has been cryptographically recorded on the blockchain ledger. We are awaiting administrator certification of death/execution files.
            </p>
            <div style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.01)', fontSize: '0.8rem', fontFamily: 'monospace' }}>
              Claimant: jane@will.com • Code: {janeContact.accessCode} • Status: PENDING
            </div>
            <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '20px' }}>
              💡 <strong>Testing tip:</strong> Use the floating <strong>Role Switcher</strong> in the bottom right, select <strong>ADMIN</strong>, and approve this claim to unlock access.
            </p>
          </div>
        )}

        {claimStatus === 'approved' && (
          <div className="claim-unlocked-card glass-card" style={{ borderStyle: 'solid', borderWidth: '1px', textAlign: 'center', padding: '30px 10px' }}>
            <CheckCircle2 size={40} className="text-emerald" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--accent-emerald)' }}>Access Claim Verified & Unlocked</h3>
            <p className="text-muted" style={{ fontSize: '0.85rem', maxWidth: '400px', margin: '8px auto 20px' }}>
              Your claim credentials have been approved. All allocated files and digital credentials have been decrypted.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button 
                className="btn btn-primary"
                style={{ fontSize: '0.8rem' }}
                onClick={() => {
                  // Dispatch a custom event to change App tabs to Assets/Vault
                  window.dispatchEvent(new CustomEvent('changeTab', { detail: 'assets' }));
                }}
              >
                Inspect Decrypted Assets
              </button>
              <button 
                className="btn btn-emerald"
                style={{ fontSize: '0.8rem' }}
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('changeTab', { detail: 'vault' }));
                }}
              >
                Download Legal Documents
              </button>
            </div>
          </div>
        )}

        {claimStatus === 'rejected' && (
          <div style={{ textAlign: 'center', padding: '30px 10px' }}>
            <ShieldAlert size={40} className="text-rose" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--accent-rose)' }}>Access Claim Rejected / Flagged</h3>
            <p className="text-muted" style={{ fontSize: '0.85rem', maxWidth: '400px', margin: '8px auto 20px' }}>
              Your access code request was reviewed and rejected by the estate administration. Unauthorized access has been logged to the security audit trails.
            </p>
            <button 
              className="btn btn-secondary" 
              onClick={async () => {
                // reset claim
                if (janeContact) {
                  await resetClaim(janeContact.id);
                  setClaimMessage(null);
                }
              }}
            >
              Retry Claim Entry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
