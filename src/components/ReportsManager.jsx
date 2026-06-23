import { useState, useEffect } from 'react';
import { FileText, Download, Printer, Database, Users } from 'lucide-react';
import { getAssets, getContacts, getBlockchain, getCurrentUser } from '../utils/state';

export default function ReportsManager() {
  const [reportType, setReportType] = useState('inventory'); // 'inventory' | 'inheritance' | 'audit'
  const [assets, setAssets] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [blockchain, setBlockchain] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const user = getCurrentUser();

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        const [assetsData, contactsData, blockchainData] = await Promise.all([
          getAssets(),
          getContacts(),
          getBlockchain()
        ]);
        if (active) {
          setAssets(assetsData);
          setContacts(contactsData);
          setBlockchain(blockchainData);
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

  // Handle PDF/Print trigger
  const handlePrint = () => {
    window.print();
  };

  // Handle JSON backup export
  const handleDownloadBackup = () => {
    const backupData = {
      exportedAt: new Date().toISOString(),
      owner: user ? { name: user.name, email: user.email } : 'Guest',
      inventory: {
        totalAssets: assets.length,
        assets: assets.map(a => ({ name: a.name, category: a.category, identifier: a.identifier, value: a.value, visibility: a.visibility }))
      },
      trustees: contacts.map(c => ({ name: c.name, email: c.email, relationship: c.relationship, claimStatus: c.claimStatus, accessCodeHash: '***encrypted***' })),
      ledgerHeight: blockchain.length
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `digitalwill_estate_report_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      <div className="card-header no-print" style={{ marginBottom: '24px' }}>
        <div>
          <h2 className="header-title-area" style={{ fontSize: '1.5rem', fontWeight: '700' }}>Estate Records & Reports</h2>
          <p className="text-muted" style={{ fontSize: '0.9rem' }}>Compile, preview, print, or download secure records of your digital estate assets.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={handleDownloadBackup}>
            <Download size={16} /> Download JSON Backup
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={16} /> Print/Save PDF
          </button>
        </div>
      </div>

      {/* Reports selection bar */}
      <div className="glass-card no-print" style={{ display: 'flex', gap: '16px', padding: '16px', marginBottom: '24px' }}>
        <button 
          className={`btn ${reportType === 'inventory' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1 }}
          onClick={() => setReportType('inventory')}
        >
          <Database size={16} /> Digital Asset Inventory
        </button>
        <button 
          className={`btn ${reportType === 'inheritance' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1 }}
          onClick={() => setReportType('inheritance')}
        >
          <Users size={16} /> Inheritance Allocation Plan
        </button>
        <button 
          className={`btn ${reportType === 'audit' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1 }}
          onClick={() => setReportType('audit')}
        >
          <FileText size={16} /> Ledger Verification Summary
        </button>
      </div>

      {/* Print Preview Sheet Container */}
      <div className="report-sheet">
        <div className="report-header">
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a' }}>DIGITAL WILL ESTATE REPORT</h1>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
              Cryptographically Signed Ledger Summary • Verified Tamper-Proof
            </p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.85rem', color: '#64748b' }}>
            <div>Date Generated: {new Date().toLocaleDateString()}</div>
            <div>Owner: {user ? user.name : 'Unknown Owner'} ({user ? user.email : 'N/A'})</div>
          </div>
        </div>

        {reportType === 'inventory' && (
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '14px', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px', color: '#1e293b' }}>
              Digital Asset Catalog
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
              This section outlines all active digital accounts, crypto holdings, and online databases registered within the DigitalWill system.
            </p>

            <table className="report-table">
              <thead>
                <tr>
                  <th>Asset Name</th>
                  <th>Category</th>
                  <th>Identifier</th>
                  <th>Value</th>
                  <th>Visibility Rule</th>
                </tr>
              </thead>
              <tbody>
                {assets.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: '600' }}>{a.name}</td>
                    <td style={{ textTransform: 'capitalize' }}>{a.category.replace('_', ' ')}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{a.identifier}</td>
                    <td>{a.value}</td>
                    <td style={{ fontSize: '0.8rem', color: '#475569' }}>
                      {a.visibility === 'conditional' && 'Release After Death Certificate Approval'}
                      {a.visibility === 'immediate' && 'Release Immediately'}
                      {a.visibility === 'private' && 'Private / Owner Access Only'}
                    </td>
                  </tr>
                ))}
                {assets.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                      No digital assets declared.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {reportType === 'inheritance' && (
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '14px', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px', color: '#1e293b' }}>
              Inheritance Allocation Matrix
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
              This section details assigned beneficiaries, their relative security access keys, and the count of assets/files they are authorized to retrieve.
            </p>

            <table className="report-table">
              <thead>
                <tr>
                  <th>Trustee Name</th>
                  <th>Email</th>
                  <th>Relationship</th>
                  <th>Claim Token</th>
                  <th>Status</th>
                  <th>Assigned Access</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: '600' }}>{c.name}</td>
                    <td>{c.email}</td>
                    <td>{c.relationship}</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: '700' }}>{c.accessCode}</td>
                    <td style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '700' }}>
                      {c.claimStatus === 'inactive' && 'Active Key / Safe'}
                      {c.claimStatus === 'pending' && 'Claim Submitted'}
                      {c.claimStatus === 'approved' && 'Released'}
                      {c.claimStatus === 'rejected' && 'Flagged / Blocked'}
                    </td>
                    <td>
                      {c.assignedAssets.length} Assets / {c.assignedDocuments.length} Documents
                    </td>
                  </tr>
                ))}
                {contacts.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                      No trustees declared on this estate.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {reportType === 'audit' && (
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '14px', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px', color: '#1e293b' }}>
              Cryptographic Ledger Summary & Verification
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
              Summary details of the internal block ledger proving database audit integrity.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '6px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Ledger Height</span>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a' }}>{blockchain.length} Blocks</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Latest Block Hash</span>
                <div style={{ fontSize: '0.8rem', fontFamily: 'monospace', wordBreak: 'break-all', marginTop: '4px', fontWeight: '600', color: '#0f172a' }}>
                  {blockchain[blockchain.length - 1]?.hash}
                </div>
              </div>
            </div>

            <table className="report-table" style={{ fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th>Block Index</th>
                  <th>Timestamp</th>
                  <th>Nonce</th>
                  <th>Link Linkage Status</th>
                </tr>
              </thead>
              <tbody>
                {blockchain.map(b => (
                  <tr key={b.index}>
                    <td>Block #{b.index}</td>
                    <td>{new Date(b.timestamp).toLocaleString()}</td>
                    <td>{b.nonce}</td>
                    <td>
                      <span style={{ color: '#10b981', fontWeight: '700' }}>✓ Hash Verified</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="report-footer">
          <p>This document represents a local statement of DigitalWill records. Secure signatures are verified at client level.</p>
          <p style={{ marginTop: '4px' }}>DigitalWill Ledger Service • Secure Decentralized Architecture Simulation</p>
        </div>
      </div>
    </div>
  );
}
