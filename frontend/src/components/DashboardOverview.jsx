import { useState, useEffect } from 'react';
import { 
  Database, Users, ShieldAlert, Cpu, CheckCircle2, 
  Activity, ShieldCheck, Clock, Globe, HardDrive, ArrowRight,
  TrendingUp, FileText, Lock, Zap
} from 'lucide-react';
import { 
  getAssets, getContacts, getDocuments, getBlockchain, 
  verifyBlockchainIntegrity, getLogs, getActiveRole,
  getIPFSStatus, getPolygonStatus
} from '../utils/state';

export default function DashboardOverview({ onNavigate }) {
  const role = getActiveRole();
  const [assets, setAssets] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [blockchain, setBlockchain] = useState([]);
  const [logs, setLogs] = useState([]);
  const [integrity, setIntegrity] = useState({ valid: true });
  const [ipfsStatus, setIpfsStatus] = useState({ enabled: false });
  const [polygonStatus, setPolygonStatus] = useState({ enabled: false });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const [
          assetsData, contactsData, documentsData, blockchainData,
          logsData, integrityData, ipfsData, polygonData
        ] = await Promise.all([
          getAssets(), getContacts(), getDocuments(), getBlockchain(),
          getLogs(), verifyBlockchainIntegrity(), getIPFSStatus(), getPolygonStatus()
        ]);
        if (active) {
          setAssets(assetsData);
          setContacts(contactsData);
          setDocuments(documentsData);
          setBlockchain(blockchainData);
          setLogs(logsData.slice(0, 4));
          setIntegrity(integrityData);
          setIpfsStatus(ipfsData);
          setPolygonStatus(polygonData);
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
        <div className="mining-spinner" />
      </div>
    );
  }

  const getSecurityScore = () => {
    let score = 30;
    if (assets.length > 0) score += 20;
    if (contacts.length > 0) score += 20;
    if (documents.length > 0) score += 20;
    if (integrity.valid) score += 10;
    return Math.min(score, 100);
  };

  const score = getSecurityScore();

  const getScoreColor = (val) => {
    if (val >= 80) return 'var(--accent-teal)';
    if (val >= 50) return 'var(--accent-amber)';
    return 'var(--accent-rose)';
  };

  const scoreColor = getScoreColor(score);
  const scoreLabel = score >= 80 ? 'Safe & Compliant' : score >= 50 ? 'Partially Secured' : 'Incomplete Vault';
  const circum = 2 * Math.PI * 52;

  return (
    <div>
      {/* ── Hero Banner ─────────────────────────── */}
      <div className="dashboard-hero-section">
        <div className="glass-card dashboard-hero-card">
          <div className="hero-content">
            <div className="hero-text">
              <span className="hero-eyebrow">
                <Zap size={10} />
                Blockchain-Secured Estate
              </span>
              <h1 className="hero-title">
                Your Digital Legacy,<br />Protected On-Chain
              </h1>
              <p className="hero-subtitle">
                Cryptographically seal your digital assets and documents.
                Transfer your estate with immutable, tamper-proof certainty.
              </p>
              <div className="hero-stats">
                <div className="hero-stat">
                  <span className="stat-number">{assets.length}</span>
                  <span className="stat-label">Assets Secured</span>
                </div>
                <div className="hero-stat">
                  <span className="stat-number">{contacts.length}</span>
                  <span className="stat-label">Beneficiaries</span>
                </div>
                <div className="hero-stat">
                  <span className="stat-number" style={{ color: scoreColor }}>{score}%</span>
                  <span className="stat-label">Security Score</span>
                </div>
              </div>
            </div>
            <div className="hero-image">
              <img src="/dashboard-hero.svg" alt="Digital Will Dashboard" className="hero-img" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Feature Cards ───────────────────────── */}
      <div className="feature-cards-grid">
        <div className="glass-card feature-card" onClick={() => onNavigate('assets')}>
          <div className="feature-image">
            <img src="/digital-assets.svg" alt="Digital Assets" />
          </div>
          <div className="feature-content">
            <h3 className="feature-title">
              <Database size={18} style={{ color: 'var(--accent-teal)' }} />
              Digital Assets
            </h3>
            <p className="feature-description">
              Catalog cryptocurrencies, accounts, and digital properties in one encrypted inventory.
            </p>
            <div className="feature-stats">
              <span className="feature-stat">
                <TrendingUp size={13} />
                {assets.length} items cataloged
              </span>
            </div>
            <div className="feature-action">
              <span>Manage Assets</span>
              <ArrowRight size={15} />
            </div>
          </div>
        </div>

        <div className="glass-card feature-card" onClick={() => onNavigate('vault')}>
          <div className="feature-image">
            <img src="/secure-vault.svg" alt="Secure Vault" />
          </div>
          <div className="feature-content">
            <h3 className="feature-title">
              <Lock size={18} style={{ color: 'var(--accent-indigo)' }} />
              Secure Vault
            </h3>
            <p className="feature-description">
              Store legal documents and files under AES-256 military-grade encryption.
            </p>
            <div className="feature-stats">
              <span className="feature-stat">
                <FileText size={13} />
                {documents.length} files protected
              </span>
            </div>
            <div className="feature-action">
              <span>Access Vault</span>
              <ArrowRight size={15} />
            </div>
          </div>
        </div>

        <div className="glass-card feature-card" onClick={() => onNavigate('ledger')}>
          <div className="feature-image">
            <img src="/blockchain-ledger.svg" alt="Blockchain Ledger" />
          </div>
          <div className="feature-content">
            <h3 className="feature-title">
              <Cpu size={18} style={{ color: 'var(--accent-amber)' }} />
              Blockchain Ledger
            </h3>
            <p className="feature-description">
              Immutable audit trail with cryptographic proof — every change recorded on-chain.
            </p>
            <div className="feature-stats">
              <span className="feature-stat">
                <CheckCircle2 size={13} />
                Block #{blockchain.length - 1} verified
              </span>
            </div>
            <div className="feature-action">
              <span>Inspect Ledger</span>
              <ArrowRight size={15} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Primary Metrics ─────────────────────── */}
      <div className="metrics-grid">
        <div className="glass-card metric-card">
          <div className="metric-header">
            <span>Secured Assets</span>
            <Database size={16} style={{ color: 'var(--accent-teal)' }} />
          </div>
          <div className="metric-value text-teal">{assets.length}</div>
          <div className="metric-footer">
            <span>Cataloged in digital inventory</span>
          </div>
        </div>

        {role === 'owner' ? (
          <div className="glass-card metric-card">
            <div className="metric-header">
              <span>Beneficiaries</span>
              <Users size={16} style={{ color: 'var(--accent-indigo)' }} />
            </div>
            <div className="metric-value" style={{ background: 'var(--grad-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {contacts.length}
            </div>
            <div className="metric-footer">
              <span>Trusted contacts assigned</span>
            </div>
          </div>
        ) : (
          <div className="glass-card metric-card">
            <div className="metric-header">
              <span>Encrypted Documents</span>
              <ShieldCheck size={16} style={{ color: 'var(--accent-indigo)' }} />
            </div>
            <div className="metric-value" style={{ background: 'var(--grad-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {documents.length}
            </div>
            <div className="metric-footer">
              <span>Files under AES-256</span>
            </div>
          </div>
        )}

        <div className="glass-card metric-card">
          <div className="metric-header">
            <span>Chain Height</span>
            <Cpu size={16} style={{ color: 'var(--accent-teal)' }} />
          </div>
          <div className="metric-value text-teal">
            #{blockchain.length - 1}
          </div>
          <div className="metric-footer">
            <span style={{ color: 'var(--accent-teal)' }}>● Ledger immutable</span>
          </div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-header">
            <span>Integrity Status</span>
            {integrity.valid
              ? <CheckCircle2 size={16} style={{ color: 'var(--accent-teal)' }} />
              : <ShieldAlert size={16} style={{ color: 'var(--accent-rose)' }} />
            }
          </div>
          <div className="metric-value" style={{
            color: integrity.valid ? 'var(--accent-teal)' : 'var(--accent-rose)',
            WebkitTextFillColor: integrity.valid ? 'var(--accent-teal)' : 'var(--accent-rose)',
            fontSize: '1.4rem',
            letterSpacing: '0.5px',
          }}>
            {integrity.valid ? 'VERIFIED' : 'TAMPERED'}
          </div>
          <div className="metric-footer">
            <span>Hash chain valid</span>
          </div>
        </div>
      </div>

      {/* ── Infrastructure Status ───────────────── */}
      <div className="metrics-grid" style={{ marginTop: 0 }}>
        <div className="glass-card metric-card">
          <div className="metric-header">
            <span>IPFS Storage</span>
            <Globe size={16} style={{ color: ipfsStatus.enabled ? 'var(--accent-teal)' : 'var(--text-faint)' }} />
          </div>
          <div className="metric-value" style={{
            color: ipfsStatus.enabled ? 'var(--accent-teal)' : 'var(--text-muted)',
            WebkitTextFillColor: ipfsStatus.enabled ? 'var(--accent-teal)' : 'var(--text-muted)',
            fontSize: '1.1rem',
            letterSpacing: '1px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            marginTop: 10,
          }}>
            {ipfsStatus.enabled ? '● CONNECTED' : '○ OFFLINE'}
          </div>
          <div className="metric-footer">
            {ipfsStatus.enabled
              ? `Pinata → ${ipfsStatus.gateway}`
              : 'Configure Pinata JWT to enable'
            }
          </div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-header">
            <span>Polygon Amoy</span>
            <HardDrive size={16} style={{ color: polygonStatus.enabled ? 'var(--accent-violet)' : 'var(--text-faint)' }} />
          </div>
          <div className="metric-value" style={{
            color: polygonStatus.enabled ? 'var(--accent-violet)' : 'var(--text-muted)',
            WebkitTextFillColor: polygonStatus.enabled ? 'var(--accent-violet)' : 'var(--text-muted)',
            fontSize: '1.1rem',
            letterSpacing: '1px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            marginTop: 10,
          }}>
            {polygonStatus.enabled ? '● ON-CHAIN' : '○ OFFLINE'}
          </div>
          <div className="metric-footer">
            {polygonStatus.enabled
              ? `${polygonStatus.auditEventsOnChain ?? 0} audit events anchored`
              : 'Deploy contract to activate'
            }
          </div>
        </div>

        {polygonStatus.enabled && polygonStatus.balance && (
          <div className="glass-card metric-card">
            <div className="metric-header">
              <span>Wallet Balance</span>
              <HardDrive size={16} style={{ color: 'var(--accent-violet)' }} />
            </div>
            <div className="metric-value" style={{
              color: 'var(--accent-violet)',
              WebkitTextFillColor: 'var(--accent-violet)',
            }}>
              {parseFloat(polygonStatus.balance).toFixed(4)}
            </div>
            <div className="metric-footer">POL · Amoy Testnet</div>
          </div>
        )}
      </div>

      {/* ── Main Grid: Activity + Security ─────── */}
      <div className="dashboard-sections">
        {/* Left: Activity Feed */}
        <div className="glass-card">
          <div className="card-header">
            <h2 className="card-title">
              <Activity size={18} style={{ color: 'var(--accent-teal)' }} />
              Live Ledger Feed
            </h2>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.78rem', padding: '6px 12px' }}
              onClick={() => onNavigate(role === 'admin' ? 'audit' : 'ledger')}
            >
              Inspect Blocks
            </button>
          </div>

          <div className="recent-activity-list">
            {logs.map((log) => (
              <div key={log.id} className="activity-item">
                <div className="activity-icon-container">
                  <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                </div>
                <div className="activity-content">
                  <div className="activity-title">
                    <span>{log.action}</span>
                    <span className="activity-type-tag">{log.type.toUpperCase()}</span>
                  </div>
                  <p className="activity-desc">{log.details}</p>
                  <p className="activity-time">
                    {log.userEmail} · {new Date(log.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <p className="text-muted" style={{ textAlign: 'center', padding: '32px 20px', fontSize: '0.85rem' }}>
                No events recorded in this session.
              </p>
            )}
          </div>
        </div>

        {/* Right: Security Health */}
        <div className="glass-card security-health-card">
          <h2 className="card-title" style={{ width: '100%', textAlign: 'left' }}>
            <ShieldCheck size={18} style={{ color: 'var(--accent-teal)' }} />
            Security Index
          </h2>

          {/* SVG gauge */}
          <div className="health-gauge-container">
            <svg
              width="130" height="130"
              viewBox="0 0 130 130"
              style={{ position: 'absolute' }}
            >
              {/* Track */}
              <circle
                cx="65" cy="65" r="52"
                stroke="rgba(255,255,255,0.04)"
                strokeWidth="8"
                fill="none"
                transform="rotate(-90 65 65)"
              />
              {/* Progress */}
              <circle
                cx="65" cy="65" r="52"
                stroke={scoreColor}
                strokeWidth="8"
                strokeDasharray={circum}
                strokeDashoffset={circum * (1 - score / 100)}
                strokeLinecap="round"
                fill="none"
                transform="rotate(-90 65 65)"
                style={{
                  filter: `drop-shadow(0 0 6px ${scoreColor})`,
                  transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)',
                }}
              />
            </svg>
            <div className="health-score-value" style={{ color: scoreColor }}>
              {score}%
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 4 }}>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1rem',
              fontWeight: 700,
              color: scoreColor,
            }}>
              {scoreLabel}
            </h3>
            <p className="text-muted" style={{
              fontSize: '0.8rem',
              marginTop: 6,
              maxWidth: 200,
              marginInline: 'auto',
              lineHeight: 1.5,
            }}>
              {score >= 80
                ? 'Your estate has active beneficiaries, logged assets, and a verified backup.'
                : 'Complete the setup checklist to strengthen your estate rating.'}
            </p>
          </div>

          {/* Checklist */}
          <div className="estate-checklist">
            <p className="checklist-label">Setup checklist</p>
            <div className="checklist-items">
              {[
                { done: assets.length > 0,    label: 'Declare at least 1 digital asset' },
                { done: contacts.length > 0,  label: 'Assign a trusted beneficiary' },
                { done: documents.length > 0, label: 'Upload a legal will document' },
                { done: integrity.valid,       label: 'Blockchain ledger verified' },
              ].map(({ done, label }) => (
                <div className="checklist-row" key={label}>
                  <span className="checklist-icon" style={{ color: done ? 'var(--accent-teal)' : 'var(--text-faint)' }}>
                    {done ? '✓' : '○'}
                  </span>
                  <span style={{ color: done ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}