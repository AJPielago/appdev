import { useState, useEffect, useCallback } from 'react';
import { 
  Shield, Database, Users, Lock, Cpu, FileText, 
  LayoutDashboard, LogOut, ShieldAlert, Menu, X 
} from 'lucide-react';
import { 
  getCurrentUser, getActiveRole, setActiveRole, 
  logoutUser, initializeDB, getContacts,
  setEncryptionKey, setClaimAccessCode
} from './utils/state';
import { deriveKeys } from './utils/crypto';

// Components
import Auth from './components/Auth';
import DashboardOverview from './components/DashboardOverview';
import AssetManager from './components/AssetManager';
import SecureVault from './components/SecureVault';
import TrustedContacts from './components/TrustedContacts';
import BlockchainLedger from './components/BlockchainLedger';
import AdminConsole from './components/AdminConsole';
import ReportsManager from './components/ReportsManager';
import ChatBot from './components/ChatBot';

export default function App() {
  // Initialize LocalStorage database
  initializeDB();

  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [activeRole, setActiveRoleState] = useState(getActiveRole());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isClaimApproved, setIsClaimApproved] = useState(false);
  
  // Mining Animation State
  const [isMining, setIsMining] = useState(false);
  const [miningText, setMiningText] = useState('');

  const checkClaimStatus = useCallback(() => {
    if (activeRole === 'beneficiary' && currentUser) {
      getContacts()
        .then(contacts => {
          const janeContact = contacts.find(c => c.email.toLowerCase() === currentUser.email.toLowerCase());
          setIsClaimApproved(janeContact && janeContact.claimStatus === 'approved');
        })
        .catch(err => console.error('Error fetching contacts for role:', err));
    } else {
      setIsClaimApproved(false);
    }
  }, [activeRole, currentUser]);

  // Check beneficiary claim status when activeRole or currentUser changes
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        checkClaimStatus();
      }
    });
    return () => { active = false; };
  }, [checkClaimStatus]);

  // Handle cross-component tab change event (e.g. from claimant portal)
  useEffect(() => {
    const handleChangeTab = (e) => {
      setActiveTab(e.detail);
    };
    window.addEventListener('changeTab', handleChangeTab);
    return () => window.removeEventListener('changeTab', handleChangeTab);
  }, []);

  // Monitor storage changes to sync state across views/tabs
  useEffect(() => {
    const handleStorageChange = () => {
      setCurrentUser(getCurrentUser());
      setActiveRoleState(getActiveRole());
      checkClaimStatus();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [checkClaimStatus]);

  // Trigger simulated proof-of-work block mining
  const triggerMining = (actionDescription, callback) => {
    setIsMining(true);
    setMiningText(actionDescription);
    setTimeout(async () => {
      try {
        await callback();
      } catch (err) {
        console.error(err);
      } finally {
        setIsMining(false);
        setCurrentUser(getCurrentUser());
        checkClaimStatus();
      }
    }, 1500);
  };

  // Toggle roles easily for testing the estate flow
  const handleRoleSwitch = (role) => {
    triggerMining(`synchronizing role workspace: ${role.toUpperCase()}`, async () => {
      setActiveRole(role);
      setActiveRoleState(role);
      setIsMobileMenuOpen(false); // Auto-close drawer on mobile
      
      let user = null;
      if (role === 'owner') {
        user = { id: 'usr_1', name: 'Alex Joyous', email: 'alex@will.com' };
        // Derive owner encryption keys client-side on sandbox switch for test ease
        const { encKeyHex } = await deriveKeys('alex@will.com', 'password123');
        setEncryptionKey(encKeyHex);
        setClaimAccessCode(null);
      } else if (role === 'admin') {
        user = { id: 'usr_admin', name: 'System Administrator', email: 'admin@will.com' };
        setEncryptionKey(null);
        setClaimAccessCode(null);
      } else if (role === 'beneficiary') {
        // Log in as claimant Jane Doe for test ease
        user = { id: 'usr_jane', name: 'Jane Doe (Claimant)', email: 'jane@will.com' };
        setEncryptionKey(null);
        setClaimAccessCode('WILL-JANE-589'); // set Jane's claim code
      }
      
      if (user) {
        localStorage.setItem('dw_current_user', JSON.stringify(user));
        setCurrentUser(user);
      }
      
      if (role === 'owner') {
        setActiveTab('dashboard');
      } else if (role === 'admin') {
        setActiveTab('admin');
      } else if (role === 'beneficiary') {
        setActiveTab('contacts'); // Default to claim portal
      }
    });
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setIsMobileMenuOpen(false); // Close mobile drawer
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setActiveRoleState(getActiveRole());
    setActiveTab(user.email === 'admin@will.com' ? 'admin' : 'dashboard');
  };

  // If not logged in, render authentication page
  if (!currentUser) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  // Define navigation based on roles
  const getNavItems = () => {
    if (activeRole === 'admin') {
      return [
        { id: 'admin', label: 'Admin Console', icon: <Shield size={18} /> },
        { id: 'ledger', label: 'Block Ledger', icon: <Cpu size={18} /> }
      ];
    }

    if (activeRole === 'beneficiary') {
      return [
        { id: 'contacts', label: 'Access Claims Portal', icon: <ShieldAlert size={18} /> },
        // Only visible if claim is approved
        ...(isClaimApproved ? [
          { id: 'assets', label: 'Decrypted Assets', icon: <Database size={18} /> },
          { id: 'vault', label: 'Secure Files', icon: <Lock size={18} /> }
        ] : []),
        { id: 'ledger', label: 'Ledger Audit', icon: <Cpu size={18} /> },
        { id: 'reports', label: 'Inheritance Report', icon: <FileText size={18} /> }
      ];
    }

    // Default: Owner Navigation
    return [
      { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard size={18} /> },
      { id: 'assets', label: 'Digital Assets', icon: <Database size={18} /> },
      { id: 'vault', label: 'Secure Vault', icon: <Lock size={18} /> },
      { id: 'contacts', label: 'Trustees & Contacts', icon: <Users size={18} /> },
      { id: 'ledger', label: 'Blockchain Ledger', icon: <Cpu size={18} /> },
      { id: 'reports', label: 'Estate Records', icon: <FileText size={18} /> }
    ];
  };

  // Render active Tab Component
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview onNavigate={setActiveTab} />;
      case 'assets':
        return <AssetManager triggerMining={triggerMining} />;
      case 'vault':
        return <SecureVault triggerMining={triggerMining} />;
      case 'contacts':
        return <TrustedContacts triggerMining={triggerMining} />;
      case 'ledger':
        return <BlockchainLedger />;
      case 'admin':
        return <AdminConsole triggerMining={triggerMining} />;
      case 'reports':
        return <ReportsManager />;
      default:
        return <DashboardOverview onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="app-container">
      {/* Top Header Bar */}
      <header className="app-header no-print">
        {/* Left: hamburger (mobile) + logo */}
        <div className="header-left">
          <button className="mobile-menu-toggle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="header-brand" onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}>
            <Shield className="logo-icon" size={22} />
            <span className="logo-text">DigitalWill</span>
          </div>
        </div>

        {/* Center: page title */}
        <div className="header-title-area">
          <h1>{getNavItems().find(n => n.id === activeTab)?.label || 'Overview'}</h1>
        </div>

        {/* Right: badge + chatbot + user */}
        <div className="header-actions">
          <span className="ledger-badge">Ledger verified: v1.0.0</span>
          <ChatBot />
          <div className="header-user">
            <div className="user-avatar" style={{ width: 34, height: 34, fontSize: '0.8rem' }}>
              {currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('') : 'U'}
            </div>
            <div className="user-details">
              <div className="user-name" style={{ fontSize: '0.82rem' }}>{currentUser.name || 'User'}</div>
              <div className="user-role-badge">{activeRole}</div>
            </div>
            <button className="logout-button" onClick={handleLogout} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              <LogOut size={13} /> Log Out
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Sidebar Navigation */}
      <nav className={`sidebar no-print ${isMobileMenuOpen ? 'open' : ''}`}>
        <ul className="nav-links">
          {getNavItems().map(item => (
            <li key={item.id} className="nav-item">
              <button
                className={`nav-button ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>

        {/* Inline Role Switcher */}
        <div className="sidebar-role-switcher">
          <div className="role-switcher-title">Role Sandbox Switcher</div>
          <div className="role-buttons">
            <button className={`role-btn ${activeRole === 'owner' ? 'active-owner' : ''}`} onClick={() => handleRoleSwitch('owner')}>Owner</button>
            <button className={`role-btn ${activeRole === 'beneficiary' ? 'active-beneficiary' : ''}`} onClick={() => handleRoleSwitch('beneficiary')}>Beneficiary</button>
            <button className={`role-btn ${activeRole === 'admin' ? 'active-admin' : ''}`} onClick={() => handleRoleSwitch('admin')}>Admin</button>
          </div>
        </div>
      </nav>

      {/* Main Workspace Area */}
      <main className="main-content">
        <div style={{ flexGrow: 1, position: 'relative', zIndex: 1 }}>
          {renderTabContent()}
        </div>
      </main>

      {/* Interactive Role Switcher Panel — now inside sidebar */}

      {/* Mining Spinner Overlay */}
      {isMining && (
        <div className="mining-overlay">
          <div className="mining-spinner"></div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', letterSpacing: '-0.5px' }}>
            Mining Block on DigitalWill Ledger...
          </h2>
          <p className="text-muted" style={{ fontSize: '0.9rem', fontFamily: 'monospace' }}>
            Payload: {miningText}
          </p>
          <p className="text-emerald" style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Solving Cryptographic Proof-of-Work...
          </p>
        </div>
      )}
    </div>
  );
}
