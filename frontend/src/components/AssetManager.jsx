import { useState, useEffect } from 'react';
import { 
  Plus, Edit3, Trash2, Globe, Coins, HardDrive, 
  FileText, Lock, Eye, ShieldAlert, X, Info 
} from 'lucide-react';
import { getAssets, addAsset, updateAsset, deleteAsset } from '../utils/state';

export default function AssetManager({ triggerMining }) {
  const [assets, setAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentAsset, setCurrentAsset] = useState(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('cryptocurrency');
  const [identifier, setIdentifier] = useState('');
  const [instructions, setInstructions] = useState('');
  const [value, setValue] = useState('');
  const [visibility, setVisibility] = useState('conditional');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const loadAssets = async () => {
      try {
        const data = await getAssets();
        if (active) {
          setAssets(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadAssets();
    window.addEventListener('storage', loadAssets);
    return () => {
      active = false;
      window.removeEventListener('storage', loadAssets);
    };
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <div className="mining-spinner"></div>
      </div>
    );
  }

  const openAddModal = () => {
    setName('');
    setCategory('cryptocurrency');
    setIdentifier('');
    setInstructions('');
    setValue('');
    setVisibility('conditional');
    setCurrentAsset(null);
    setIsEditing(true);
    setError('');
  };

  const openEditModal = (asset) => {
    setCurrentAsset(asset);
    setName(asset.name);
    setCategory(asset.category);
    setIdentifier(asset.identifier);
    setInstructions(asset.instructions);
    setValue(asset.value);
    setVisibility(asset.visibility);
    setIsEditing(true);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !identifier || !instructions) {
      setError('Please fill in all mandatory fields.');
      return;
    }

    const assetData = { name, category, identifier, instructions, value, visibility };

    if (currentAsset) {
      // Edit
      triggerMining('ledger modification for ' + name, async () => {
        await updateAsset(currentAsset.id, assetData);
        setIsEditing(false);
      });
    } else {
      // Add
      triggerMining('ledger registration for ' + name, async () => {
        await addAsset(assetData);
        setIsEditing(false);
      });
    }
  };

  const handleDelete = (id, assetName) => {
    if (window.confirm(`Are you sure you want to delete the asset "${assetName}"? This will log a DELETION transaction on the blockchain.`)) {
      triggerMining('ledger revocation of ' + assetName, async () => {
        await deleteAsset(id);
      });
    }
  };

  // Helper to get category icons
  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'social_media': return <Globe size={18} className="text-cyan" />;
      case 'cryptocurrency': return <Coins size={18} className="text-amber" />;
      case 'cloud_storage': return <HardDrive size={18} className="text-emerald" />;
      case 'digital_files': return <FileText size={18} className="text-rose" />;
      default: return <FileText size={18} />;
    }
  };

  // Helper for visibility badges
  const getVisibilityBadge = (vis) => {
    switch (vis) {
      case 'private':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--accent-rose)', backgroundColor: 'rgba(255, 56, 96, 0.08)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(255, 56, 96, 0.15)' }}>
            <Lock size={12} /> Private (Owner Only)
          </span>
        );
      case 'conditional':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--accent-amber)', backgroundColor: 'rgba(245, 158, 11, 0.08)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
            <Lock size={12} /> Release After Death Claim
          </span>
        );
      case 'immediate':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--accent-emerald)', backgroundColor: 'rgba(5, 217, 195, 0.08)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(5, 217, 195, 0.15)' }}>
            <Eye size={12} /> Immediately Visible
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="card-header" style={{ marginBottom: '24px' }}>
        <div>
          <h2 className="header-title-area" style={{ fontSize: '1.5rem', fontWeight: '700' }}>Digital Assets Declarations</h2>
          <p className="text-muted" style={{ fontSize: '0.9rem' }}>Maintain a cryptographic catalog of accounts and holdings, and set access logic.</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={16} /> Declare Asset
        </button>
      </div>

      {assets.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px', borderStyle: 'dashed' }}>
          <ShieldAlert size={48} className="text-muted" style={{ marginBottom: '16px', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: '600' }}>No assets declared yet</h3>
          <p className="text-muted" style={{ fontSize: '0.9rem', maxWidth: '400px', margin: '8px auto 20px' }}>
            Declare your assets and assign who receives access codes to request decrypting them in the future.
          </p>
          <button className="btn btn-primary" onClick={openAddModal}>Declare Your First Asset</button>
        </div>
      ) : (
        <div className="assets-grid">
          {assets.map((asset) => (
            <div key={asset.id} className="glass-card asset-card">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span className="asset-category-tag">
                    {getCategoryIcon(asset.category)}
                    {asset.category.replace('_', ' ')}
                  </span>
                  <span className="asset-value text-cyan">{asset.value}</span>
                </div>
                
                <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginTop: '14px' }}>{asset.name}</h3>
                <p className="text-muted" style={{ fontSize: '0.8rem', fontFamily: 'monospace', marginTop: '2px', wordBreak: 'break-all' }}>
                  ID: {asset.identifier}
                </p>
                <p className="asset-card-details">{asset.instructions}</p>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', marginTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {getVisibilityBadge(asset.visibility)}
                  
                  <div className="asset-actions">
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '6px 10px' }} 
                      onClick={() => openEditModal(asset)}
                      title="Edit Asset"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button 
                      className="btn btn-rose" 
                      style={{ padding: '6px 10px' }} 
                      onClick={() => handleDelete(asset.id, asset.name)}
                      title="Delete Asset"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal Drawer Overlay */}
      {isEditing && (
        <div className="mining-overlay" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button 
              className="btn btn-secondary" 
              style={{ position: 'absolute', right: '20px', top: '20px', padding: '6px' }}
              onClick={() => setIsEditing(false)}
            >
              <X size={16} />
            </button>
            
            <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '20px' }}>
              {currentAsset ? 'Modify Asset Ledger Entry' : 'Declare New Digital Asset'}
            </h2>

            {error && (
              <div className="blockchain-verification-banner error" style={{ padding: '10px 16px', fontSize: '0.85rem', marginBottom: '16px' }}>
                <ShieldAlert size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Asset Name / Title</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Bitcoin Cold Wallet, Personal Google Drive, Facebook Account" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Asset Category</label>
                  <select 
                    className="form-input form-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="cryptocurrency">Cryptocurrency</option>
                    <option value="social_media">Social Media</option>
                    <option value="cloud_storage">Cloud Storage</option>
                    <option value="digital_files">Digital Files</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Est. Financial/Sentimental Value</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. $10,000 / Irreplaceable" 
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Identifier (Account Email / Public Key / Wallet Link)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="alex.joyous@gmail.com or wallet key bc1q..." 
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Access & Inheritance Instructions</label>
                <textarea 
                  className="form-input" 
                  style={{ minHeight: '100px', resize: 'vertical' }}
                  placeholder="Provide detailed notes for the beneficiary on how to recover this asset. Mention details about credentials or physical locks."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Asset Visibility & Release Rules</label>
                <select 
                  className="form-input form-select"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                >
                  <option value="conditional">Release Only After Death Claim Approval (Recommended)</option>
                  <option value="immediate">Release Immediately (Beneficiary can view this asset now)</option>
                  <option value="private">Private (Strictly owner access; do not release)</option>
                </select>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px', padding: '10px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <Info size={16} className="text-cyan" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <p className="text-muted" style={{ fontSize: '0.75rem' }}>
                    {visibility === 'conditional' && 'Beneficiaries will not see this asset until they request an unlocking claim and the claim is approved by an administrator.'}
                    {visibility === 'immediate' && 'Beneficiaries assigned to this asset can see its credentials and retrieval details right away.'}
                    {visibility === 'private' && 'This asset will remain fully encrypted and hidden from all beneficiaries, even after death.'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {currentAsset ? 'Save Ledger Modifications' : 'Commit & Mine Block'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
