import { useState } from 'react';
import { Shield, Lock, Mail, User, AlertCircle, ArrowRight } from 'lucide-react';
import { loginUser, registerUser, setEncryptionKey } from '../utils/state';
import { deriveKeys } from '../utils/crypto';

export default function Auth({ onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsLoading(true);

    try {
      // Derive auth hash and encryption key client-side using PBKDF2
      const { encKeyHex, authHashHex } = await deriveKeys(email, password);
      
      if (activeTab === 'login') {
        const result = await loginUser(email, authHashHex);
        if (result.success) {
          setEncryptionKey(encKeyHex);
          onLoginSuccess(result.user);
        } else {
          setError(result.error || 'Authentication failed.');
        }
      } else {
        if (!name) {
          setError('Please enter your full name.');
          setIsLoading(false);
          return;
        }
        const result = await registerUser(name, email, authHashHex);
        if (result.success) {
          setEncryptionKey(encKeyHex);
          onLoginSuccess(result.user);
        } else {
          setError(result.error || 'Registration failed.');
        }
      }
    } catch (err) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to fill pre-seeded details for testing ease
  const handleQuickFill = (role) => {
    setError('');
    if (role === 'owner') {
      setEmail('alex@will.com');
      setPassword('password123');
      setActiveTab('login');
    } else if (role === 'admin') {
      setEmail('admin@will.com');
      setPassword('adminpassword');
      setActiveTab('login');
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="glass-card auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <Shield className="logo-icon" size={32} />
            <span className="logo-text">DigitalWill</span>
          </div>
          <p className="text-muted">Secure digital estate & asset synchronization ledger</p>
        </div>

        <div className="auth-tabs">
          <button 
            type="button"
            className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => { setActiveTab('login'); setError(''); }}
          >
            Access Vault
          </button>
          <button 
            type="button"
            className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => { setActiveTab('register'); setError(''); }}
          >
            Create Vault
          </button>
        </div>

        {error && (
          <div className="blockchain-verification-banner error" style={{ padding: '12px 16px', fontSize: '0.85rem' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {activeTab === 'register' && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={16} className="text-muted" style={{ position: 'absolute', left: '16px', top: '16px' }} />
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ paddingLeft: '44px' }}
                  placeholder="Alex Joyous" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} className="text-muted" style={{ position: 'absolute', left: '16px', top: '16px' }} />
              <input 
                type="email" 
                className="form-input" 
                style={{ paddingLeft: '44px' }}
                placeholder="alex@will.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Master Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} className="text-muted" style={{ position: 'absolute', left: '16px', top: '16px' }} />
              <input 
                type="password" 
                className="form-input" 
                style={{ paddingLeft: '44px' }}
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            {activeTab === 'register' && (
              <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '6px' }}>
                * This password will derive your local cryptographic recovery key. Keep it safe.
              </p>
            )}
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '14px', marginTop: '10px' }}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="mining-spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></span>
            ) : (
              <>
                {activeTab === 'login' ? 'Decrypt & Authenticate' : 'Initialize & Hash Vault'}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
          <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '12px' }}>Quick testing profiles:</p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button 
              type="button"
              className="btn btn-secondary" 
              style={{ fontSize: '0.75rem', padding: '6px 12px' }}
              onClick={() => handleQuickFill('owner')}
            >
              Fill Owner (Alex)
            </button>
            <button 
              type="button"
              className="btn btn-secondary" 
              style={{ fontSize: '0.75rem', padding: '6px 12px' }}
              onClick={() => handleQuickFill('admin')}
            >
              Fill Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
