import { useState, useEffect } from 'react';
import { 
  Database, Users, ShieldAlert, Cpu, CheckCircle2, 
  Activity, ShieldCheck, Clock
} from 'lucide-react';
import { 
  getAssets, getContacts, getDocuments, getBlockchain, 
  verifyBlockchainIntegrity, getLogs, getActiveRole
} from '../utils/state';

export default function DashboardOverview({ onNavigate }) {
  const role = getActiveRole();
  const [assets, setAssets] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [blockchain, setBlockchain] = useState([]);
  const [logs, setLogs] = useState([]);
  const [integrity, setIntegrity] = useState({ valid: true });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const [assetsData, contactsData, documentsData, blockchainData, logsData, integrityData] = await Promise.all([
          getAssets(),
          getContacts(),
          getDocuments(),
          getBlockchain(),
          getLogs(),
          verifyBlockchainIntegrity()
        ]);
        if (active) {
          setAssets(assetsData);
          setContacts(contactsData);
          setDocuments(documentsData);
          setBlockchain(blockchainData);
          setLogs(logsData.slice(0, 4));
          setIntegrity(integrityData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    loadData();
    return () => { active = false; };
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <div className="mining-spinner"></div>
      </div>
    );
  }

  // Compute estate safety rating
  const getSecurityScore = () => {
    let score = 30; // base score for having an account
    if (assets.length > 0) score += 20;
    if (contacts.length > 0) score += 20;
    if (documents.length > 0) score += 20;
    if (integrity.valid) score += 10;
    return Math.min(score, 100);
  };

  const score = getSecurityScore();
  
  // Highlight color based on score
  const getScoreColor = (val) => {
    if (val >= 80) return 'var(--accent-emerald)';
    if (val >= 50) return 'var(--accent-amber)';
    return 'var(--accent-rose)';
  };

  return (
    <div>
      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="glass-card metric-card">
          <div className="metric-header">
            <span>Secured Digital Assets</span>
            <Database size={18} className="text-cyan" />
          </div>
          <div className="metric-value text-cyan">{assets.length}</div>
          <div className="metric-footer text-muted">
            <span>Categorized in digital inventory</span>
          </div>
        </div>

        {role === 'owner' ? (
          <div className="glass-card metric-card">
            <div className="metric-header">
              <span>Trusted Contacts</span>
              <Users size={18} className="text-emerald" />
            </div>
            <div className="metric-value text-emerald">{contacts.length}</div>
            <div className="metric-footer text-muted">
              <span>Beneficiaries with claim codes</span>
            </div>
          </div>
        ) : (
          <div className="glass-card metric-card">
            <div className="metric-header">
              <span>Secure Documents</span>
              <ShieldCheck size={18} className="text-emerald" />
            </div>
            <div className="metric-value text-emerald">{documents.length}</div>
            <div className="metric-footer text-muted">
              <span>Uploaded under AES-256</span>
            </div>
          </div>
        )}

        <div className="glass-card metric-card">
          <div className="metric-header">
            <span>Blockchain Blocks</span>
            <Cpu size={18} className="text-cyan" />
          </div>
          <div className="metric-value" style={{ textShadow: '0 0 10px rgba(0, 242, 254, 0.3)' }}>
            #{blockchain.length - 1}
          </div>
          <div className="metric-footer text-muted">
            <span className="text-emerald">● Ledger Immutable</span>
          </div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-header">
            <span>Ledger Integrity</span>
            {integrity.valid ? (
              <CheckCircle2 size={18} className="text-emerald" />
            ) : (
              <ShieldAlert size={18} className="text-rose" />
            )}
          </div>
          <div className="metric-value" style={{ color: integrity.valid ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
            {integrity.valid ? 'VERIFIED' : 'TAMPERED'}
          </div>
          <div className="metric-footer text-muted">
            <span>Cryptographic hash valid</span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="dashboard-sections">
        {/* Left Side: Recent Activity Audit */}
        <div className="glass-card">
          <div className="card-header">
            <h2 className="card-title">
              <Activity size={20} className="text-cyan" />
              Real-time Ledger Log Feed
            </h2>
            <button 
              className="btn btn-secondary" 
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
              onClick={() => onNavigate(role === 'admin' ? 'audit' : 'ledger')}
            >
              Inspect Block Ledger
            </button>
          </div>
          <div className="recent-activity-list">
            {logs.map((log) => (
              <div key={log.id} className="activity-item">
                <div className="activity-icon-container">
                  <Clock size={16} className="text-muted" />
                </div>
                <div className="activity-content">
                  <div className="activity-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{log.action}</span>
                    <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                      {log.type.toUpperCase()}
                    </span>
                  </div>
                  <p className="activity-desc">{log.details}</p>
                  <p className="activity-time">
                    By {log.userEmail} • {new Date(log.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>
                No events recorded in this session.
              </p>
            )}
          </div>
        </div>

        {/* Right Side: Security Health Index */}
        <div className="glass-card security-health-card">
          <h2 className="card-title" style={{ width: '100%', textAlign: 'left', display: 'flex', gap: '8px' }}>
            <ShieldCheck size={20} className="text-cyan" />
            Will Security Index
          </h2>
          
          <div className="health-gauge-container">
            {/* SVG circle meter */}
            <svg style={{ position: 'absolute', width: '130px', height: '130px', transform: 'rotate(-90deg)' }}>
              <circle 
                cx="65" cy="65" r="55" 
                stroke="rgba(255,255,255,0.02)" 
                strokeWidth="10" 
                fill="none" 
              />
              <circle 
                cx="65" cy="65" r="55" 
                stroke={getScoreColor(score)}
                strokeWidth="10" 
                strokeDasharray={2 * Math.PI * 55}
                strokeDashoffset={2 * Math.PI * 55 * (1 - score / 100)}
                strokeLinecap="round"
                fill="none" 
                style={{ transition: 'stroke-dashoffset 1s ease-out' }}
              />
            </svg>
            <div className="health-score-value" style={{ color: getScoreColor(score) }}>{score}%</div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '10px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>
              {score >= 80 ? 'Safe & Compliant' : score >= 50 ? 'Partially Secured' : 'Incomplete Vault'}
            </h3>
            <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '6px', maxWidth: '200px', marginInline: 'auto' }}>
              {score >= 80 
                ? 'Your digital estate has active beneficiaries, logged assets, and a verified secure backup.' 
                : 'Complete key settings to raise your estate safety rating.'}
            </p>
          </div>

          <div style={{ width: '100%', marginTop: '24px', textAlign: 'left', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px', letterSpacing: '0.5px' }}>
              Estate Setup Checklist:
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: assets.length > 0 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                  {assets.length > 0 ? '✓' : '○'}
                </span>
                <span className={assets.length > 0 ? '' : 'text-muted'}>Declare at least 1 digital asset</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: contacts.length > 0 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                  {contacts.length > 0 ? '✓' : '○'}
                </span>
                <span className={contacts.length > 0 ? '' : 'text-muted'}>Assign a trusted contact</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: documents.length > 0 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                  {documents.length > 0 ? '✓' : '○'}
                </span>
                <span className={documents.length > 0 ? '' : 'text-muted'}>Store legal will document</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: integrity.valid ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                  {integrity.valid ? '✓' : '○'}
                </span>
                <span className={integrity.valid ? '' : 'text-muted'}>Verify blockchain ledger health</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
