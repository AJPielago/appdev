import { useState, useEffect } from 'react';
import { 
  Users, CheckCircle, XCircle, Database, AlertCircle, 
  ShieldAlert, Activity, Clock, ShieldCheck 
} from 'lucide-react';
import { 
  getContacts, reviewClaim, getLogs, getAssets, getUsers 
} from '../utils/state';

export default function AdminConsole({ triggerMining }) {
  const [activeSubTab, setActiveSubTab] = useState('claims'); // 'claims' | 'users' | 'logs'
  const [logFilter, setLogFilter] = useState('all');
  
  const [contacts, setContacts] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [allAssets, setAllAssets] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        const [contactsData, logsData, assetsData, usersData] = await Promise.all([
          getContacts(),
          getLogs(),
          getAssets(),
          getUsers()
        ]);
        if (active) {
          setContacts(contactsData);
          setAllLogs(logsData);
          setAllAssets(assetsData);
          setUsers(usersData);
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

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <div className="mining-spinner"></div>
      </div>
    );
  }

  // Pending claims list
  const claims = contacts.filter(c => c.claimStatus === 'pending');
  const pastClaims = contacts.filter(c => c.claimStatus !== 'inactive' && c.claimStatus !== 'pending');

  const handleReviewClaim = (contactId, name, approve) => {
    const actionText = approve ? 'APPROVING' : 'REJECTING';
    if (window.confirm(`Are you sure you want to proceed with ${actionText} the inheritance claim for "${name}"?`)) {
      triggerMining(`admin claim decision: ${name} (${approve ? 'Approved' : 'Denied'})`, async () => {
        await reviewClaim(contactId, approve);
      });
    }
  };

  const getFilteredLogs = () => {
    if (logFilter === 'all') return allLogs;
    return allLogs.filter(l => l.type === logFilter);
  };

  return (
    <div>
      <div className="card-header" style={{ marginBottom: '24px' }}>
        <div>
          <h2 className="header-title-area" style={{ fontSize: '1.5rem', fontWeight: '700' }}>System Administration Console</h2>
          <p className="text-muted" style={{ fontSize: '0.9rem' }}>Monitor user registries, review beneficiary claim requests, and track systemic audit logs.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={`btn ${activeSubTab === 'claims' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveSubTab('claims')}
          >
            <ShieldAlert size={16} /> Claims Review ({claims.length})
          </button>
          <button 
            className={`btn ${activeSubTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveSubTab('users')}
          >
            <Users size={16} /> User Registry
          </button>
          <button 
            className={`btn ${activeSubTab === 'logs' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveSubTab('logs')}
          >
            <Activity size={16} /> Audit Trails
          </button>
        </div>
      </div>

      {/* Admin stats */}
      <div className="metrics-grid" style={{ marginBottom: '24px' }}>
        <div className="glass-card metric-card">
          <div className="metric-header">
            <span>Total Registered Vaults</span>
            <Users size={16} className="text-cyan" />
          </div>
          <div className="metric-value text-cyan">{users.length}</div>
        </div>
        <div className="glass-card metric-card">
          <div className="metric-header">
            <span>Active Assets Monitored</span>
            <Database size={16} className="text-amber" />
          </div>
          <div className="metric-value text-amber">{allAssets.length}</div>
        </div>
        <div className="glass-card metric-card">
          <div className="metric-header">
            <span>Claims Awaiting Verification</span>
            <AlertCircle size={16} className="text-rose" />
          </div>
          <div className="metric-value text-rose">{claims.length}</div>
        </div>
      </div>

      {/* Sub Tabs Panel */}
      {activeSubTab === 'claims' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Active Pending Claims */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px' }}>Inheritance Claims Awaiting Action</h3>
            {claims.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                <ShieldCheck size={32} className="text-emerald" style={{ marginBottom: '12px' }} />
                <p>All submitted claims are resolved. No actions pending.</p>
              </div>
            ) : (
              <div>
                {claims.map(claim => (
                  <div key={claim.id} className="document-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '14px', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Claimant: {claim.name} ({claim.relationship})</h4>
                        <p className="text-muted" style={{ fontSize: '0.85rem' }}>Email: {claim.email} • Token: `{claim.accessCode}`</p>
                      </div>
                      <span className="badge-claim pending">PENDING REVIEW</span>
                    </div>

                    <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)' }}>
                      <span className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Claimant's Statements:</span>
                      <p style={{ fontSize: '0.85rem' }}>"{claim.claimNotes || 'No notes provided by claimant.'}"</p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Claim Submitted: {new Date(claim.claimDate).toLocaleString()}
                      </span>
                      
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                          className="btn btn-rose" 
                          style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                          onClick={() => handleReviewClaim(claim.id, claim.name, false)}
                        >
                          <XCircle size={14} /> Deny Claim
                        </button>
                        <button 
                          className="btn btn-emerald" 
                          style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                          onClick={() => handleReviewClaim(claim.id, claim.name, true)}
                        >
                          <CheckCircle size={14} /> Certify & Release Assets
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Historical Claims */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px' }}>Decided Claims Registry</h3>
            {pastClaims.length === 0 ? (
              <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No claims processed in system history.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '10px', color: 'var(--text-muted)' }}>Claimant</th>
                    <th style={{ padding: '10px', color: 'var(--text-muted)' }}>Code Used</th>
                    <th style={{ padding: '10px', color: 'var(--text-muted)' }}>Date Processed</th>
                    <th style={{ padding: '10px', color: 'var(--text-muted)' }}>Decision Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pastClaims.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '10px', fontWeight: '600' }}>{c.name} ({c.relationship})</td>
                      <td style={{ padding: '10px', fontFamily: 'monospace' }}>{c.accessCode}</td>
                      <td style={{ padding: '10px' }}>{new Date(c.claimDate).toLocaleDateString()}</td>
                      <td style={{ padding: '10px' }}>
                        <span className={`badge-claim ${c.claimStatus}`}>
                          {c.claimStatus === 'approved' ? 'Released' : 'Denied'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'users' && (
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px' }}>System User Registry</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                <th style={{ padding: '12px', color: 'var(--text-muted)' }}>User ID</th>
                <th style={{ padding: '12px', color: 'var(--text-muted)' }}>Name</th>
                <th style={{ padding: '12px', color: 'var(--text-muted)' }}>Email</th>
                <th style={{ padding: '12px', color: 'var(--text-muted)' }}>Created At</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                  <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '0.8rem' }}>{u.id}</td>
                  <td style={{ padding: '12px', fontWeight: '600' }}>{u.name}</td>
                  <td style={{ padding: '12px' }}>{u.email}</td>
                  <td style={{ padding: '12px' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeSubTab === 'logs' && (
        <div className="glass-card">
          <div className="card-header" style={{ marginBottom: '16px' }}>
            <h3 className="card-title">Security & Operations Audit Trail</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['all', 'auth', 'asset', 'vault', 'contact', 'claim', 'admin'].map(filter => (
                <button
                  key={filter}
                  className={`btn ${logFilter === filter ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                  onClick={() => setLogFilter(filter)}
                >
                  {filter.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {getFilteredLogs().map(log => (
              <div key={log.id} style={{ display: 'flex', gap: '12px', padding: '10px 14px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                <Clock size={14} className="text-muted" style={{ marginTop: '3px', flexShrink: 0 }} />
                <div style={{ flexGrow: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', marginBottom: '2px' }}>
                    <span>{log.action}</span>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-muted" style={{ fontSize: '0.8rem' }}>{log.details}</p>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)' }}>
                    Triggered by: {log.userEmail} ({log.userId})
                  </p>
                </div>
              </div>
            ))}
            {getFilteredLogs().length === 0 && (
              <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No logs fit this filter criteria.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
