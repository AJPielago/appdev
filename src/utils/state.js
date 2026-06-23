import { validateChain } from './blockchain';
import { io } from 'socket.io-client';
import { encryptData, decryptData, decryptWithKey } from './crypto';

// Intercept fetch to add localtunnel bypass headers and handle misconfigured URLs
if (typeof window !== 'undefined' && window.fetch) {
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    let [resource, config] = args;
    
    // Safely inject localtunnel bypass headers
    if (!config) config = {};
    if (!config.headers) {
      config.headers = {};
    }
    
    if (config.headers instanceof Headers) {
      config.headers.set('Bypass-Tunnel-Reminder', 'true');
      config.headers.set('bypass-tunnel-reminder', 'true');
      config.headers.set('ngrok-skip-browser-warning', 'true');
    } else if (Array.isArray(config.headers)) {
      config.headers.push(['Bypass-Tunnel-Reminder', 'true']);
      config.headers.push(['bypass-tunnel-reminder', 'true']);
      config.headers.push(['ngrok-skip-browser-warning', 'true']);
    } else {
      config.headers['Bypass-Tunnel-Reminder'] = 'true';
      config.headers['bypass-tunnel-reminder'] = 'true';
      config.headers['ngrok-skip-browser-warning'] = 'true';
    }
    
    args = [resource, config];

    const res = await originalFetch(...args);
    const originalJson = res.json.bind(res);
    res.json = async () => {
      try {
        return await originalJson();
      } catch (err) {
        try {
          const text = await res.clone().text();
          if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html') || text.trim().includes('__vite_plugin_react_preamble_installed__')) {
            throw new Error(
              `Incorrect API target: The request went to the frontend web server instead of the backend API. ` +
              `Please ensure VITE_BACKEND_URL in your .env.local points to the BACKEND tunnel (port 5000) and NOT the frontend tunnel (port 5173).`
            );
          }
        } catch (_) {}
        throw err;
      }
    };
    return res;
  };
}

const getApiBase = () => {
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  // When no backend URL is configured, use same-origin requests.
  // Vite's proxy will forward /api and /socket.io to the backend server.
  return '';
};

// WebSocket connection for real-time synchronization
const socket = io(getApiBase(), {
  extraHeaders: {
    'Bypass-Tunnel-Reminder': 'true',
    'bypass-tunnel-reminder': 'true',
    'ngrok-skip-browser-warning': 'true'
  }
});
socket.on('db_update', (data) => {
  console.log('[WebSockets] Received update broadcast event:', data);
  window.dispatchEvent(new Event('storage'));
});

// Session Management (Synchronous LocalStorage reads for fast render initialization)
export function getCurrentUser() {
  const raw = localStorage.getItem('dw_current_user');
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getActiveRole() {
  return localStorage.getItem('dw_active_role') || 'owner';
}

export function setActiveRole(role) {
  localStorage.setItem('dw_active_role', role);
  window.dispatchEvent(new Event('storage'));
}

export function initializeDB() {
  // Database seeding is now handled by the backend server on startup
}

// Session key cache storage (Cleared when the browser tab is closed)
export function getEncryptionKey() {
  return sessionStorage.getItem('dw_encryption_key') || '';
}

export function setEncryptionKey(key) {
  if (key) {
    sessionStorage.setItem('dw_encryption_key', key);
  } else {
    sessionStorage.removeItem('dw_encryption_key');
  }
}

export function getClaimAccessCode() {
  return sessionStorage.getItem('dw_claim_access_code') || '';
}

export function setClaimAccessCode(code) {
  if (code) {
    sessionStorage.setItem('dw_claim_access_code', code);
  } else {
    sessionStorage.removeItem('dw_claim_access_code');
  }
}

// Helper to check if role is beneficiary and resolve the decrypted master key using their claim code
async function resolveDecryptionKey() {
  let decryptKey = getEncryptionKey();
  if (getActiveRole() === 'beneficiary') {
    const code = getClaimAccessCode();
    if (code) {
      try {
        const contactsRes = await fetch(`${getApiBase()}/api/contacts`, { headers: getHeaders() });
        const contacts = await contactsRes.json();
        const myContact = contacts.find(c => c.email.toLowerCase() === getCurrentUser()?.email?.toLowerCase());
        if (myContact && myContact.wrappedKey && myContact.claimStatus === 'approved') {
          decryptKey = await decryptWithKey(myContact.wrappedKey, code);
        }
      } catch (err) {
        console.error('Failed to decrypt beneficiary key:', err);
      }
    }
  }
  return decryptKey;
}

// REST API headers helper
function getHeaders() {
  const user = getCurrentUser();
  const role = getActiveRole();
  return {
    'Content-Type': 'application/json',
    'x-active-role': role,
    'x-user-id': user ? user.id : '',
    'x-user-email': user ? user.email : ''
  };
}

// User Actions
export async function loginUser(email, password) {
  // 1. Password in req is the derived auth hash sent to server
  const res = await fetch(`${getApiBase()}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (data.success) {
    localStorage.setItem('dw_current_user', JSON.stringify(data.user));
    localStorage.setItem('dw_active_role', 'owner');
    window.dispatchEvent(new Event('storage'));
  }
  return data;
}

export async function registerUser(name, email, password) {
  const res = await fetch(`${getApiBase()}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  });
  const data = await res.json();
  if (data.success) {
    localStorage.setItem('dw_current_user', JSON.stringify(data.user));
    localStorage.setItem('dw_active_role', 'owner');
    window.dispatchEvent(new Event('storage'));
  }
  return data;
}

export async function logoutUser() {
  localStorage.removeItem('dw_current_user');
  localStorage.setItem('dw_active_role', 'owner');
  setEncryptionKey(null);
  setClaimAccessCode(null);
  window.dispatchEvent(new Event('storage'));
}

export async function updateProfile(name, password) {
  const user = getCurrentUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const res = await fetch(`${getApiBase()}/api/auth/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, password, userId: user.id })
  });
  const data = await res.json();
  if (data.success) {
    localStorage.setItem('dw_current_user', JSON.stringify(data.user));
    window.dispatchEvent(new Event('storage'));
  }
  return data;
}

// Logs
export async function getLogs() {
  const res = await fetch(`${getApiBase()}/api/logs`);
  return await res.json();
}

export async function logActivity(userId, userEmail, action, details, type) {
  const res = await fetch(`${getApiBase()}/api/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, userEmail, action, details, type })
  });
  const data = await res.json();
  window.dispatchEvent(new Event('storage'));
  return data;
}

// Users
export async function getUsers() {
  const res = await fetch(`${getApiBase()}/api/users`, {
    headers: getHeaders()
  });
  return await res.json();
}

// Blockchain
export async function getBlockchain() {
  const res = await fetch(`${getApiBase()}/api/blockchain`);
  return await res.json();
}

export async function resetBlockchain() {
  const res = await fetch(`${getApiBase()}/api/blockchain/reset`, {
    method: 'POST'
  });
  const data = await res.json();
  window.dispatchEvent(new Event('storage'));
  return data;
}

export async function tamperBlock(index, transactions) {
  const res = await fetch(`${getApiBase()}/api/blockchain/tamper`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ index, transactions })
  });
  const data = await res.json();
  window.dispatchEvent(new Event('storage'));
  return data;
}

export async function verifyBlockchainIntegrity() {
  const chain = await getBlockchain();
  return validateChain(chain);
}

// Assets (Zero-Knowledge Decrypted Client-Side)
export async function getAssets() {
  const res = await fetch(`${getApiBase()}/api/assets`, {
    headers: getHeaders()
  });
  const assets = await res.json();
  const decryptKey = await resolveDecryptionKey();
  
  return await Promise.all(assets.map(async a => {
    try {
      if (decryptKey) {
        const decIdentifier = await decryptData(a.identifier, decryptKey);
        const decInstructions = await decryptData(a.instructions, decryptKey);
        return {
          ...a,
          identifier: decIdentifier,
          instructions: decInstructions
        };
      }
    } catch (err) {
      console.warn('Could not decrypt asset:', a.name, err.message);
    }
    return {
      ...a,
      identifier: '• Encrypted •',
      instructions: '• Secure Zero-Knowledge Data (Claim Unapproved) •'
    };
  }));
}

export async function addAsset(assetData) {
  const user = getCurrentUser();
  const key = getEncryptionKey();
  
  let encryptedInstructions = assetData.instructions;
  let encryptedIdentifier = assetData.identifier;
  
  if (key) {
    encryptedInstructions = await encryptData(assetData.instructions, key);
    encryptedIdentifier = await encryptData(assetData.identifier, key);
  }
  
  const res = await fetch(`${getApiBase()}/api/assets`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      ...assetData,
      instructions: encryptedInstructions,
      identifier: encryptedIdentifier,
      userId: user?.id,
      userEmail: user?.email
    })
  });
  const data = await res.json();
  window.dispatchEvent(new Event('storage'));
  return data;
}

export async function updateAsset(assetId, assetData) {
  const user = getCurrentUser();
  const key = getEncryptionKey();
  
  let encryptedInstructions = assetData.instructions;
  let encryptedIdentifier = assetData.identifier;
  
  if (key) {
    encryptedInstructions = await encryptData(assetData.instructions, key);
    encryptedIdentifier = await encryptData(assetData.identifier, key);
  }
  
  const res = await fetch(`${getApiBase()}/api/assets/${assetId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({
      ...assetData,
      instructions: encryptedInstructions,
      identifier: encryptedIdentifier,
      userId: user?.id,
      userEmail: user?.email
    })
  });
  const data = await res.json();
  window.dispatchEvent(new Event('storage'));
  return data;
}

export async function deleteAsset(assetId) {
  const user = getCurrentUser();
  const res = await fetch(`${getApiBase()}/api/assets/${assetId}`, {
    method: 'DELETE',
    headers: {
      ...getHeaders(),
      'x-user-email': user?.email
    }
  });
  const data = await res.json();
  window.dispatchEvent(new Event('storage'));
  return data;
}

// Documents (Zero-Knowledge Decrypted Client-Side)
export async function getDocuments() {
  const res = await fetch(`${getApiBase()}/api/documents`, {
    headers: getHeaders()
  });
  const docs = await res.json();
  const decryptKey = await resolveDecryptionKey();
  
  return await Promise.all(docs.map(async d => {
    try {
      if (decryptKey && d.base64Data && !d.base64Data.startsWith('data:')) {
        const decryptedBase64 = await decryptData(d.base64Data, decryptKey);
        return {
          ...d,
          base64Data: decryptedBase64
        };
      }
    } catch (err) {
      console.warn('Could not decrypt document:', d.name, err.message);
    }
    return {
      ...d,
      base64Data: ''
    };
  }));
}

export async function uploadDocument(docData) {
  const user = getCurrentUser();
  const key = getEncryptionKey();
  
  let encryptedBase64 = docData.base64Data;
  if (key) {
    encryptedBase64 = await encryptData(docData.base64Data, key);
  }
  
  const res = await fetch(`${getApiBase()}/api/documents`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      ...docData,
      base64Data: encryptedBase64,
      userId: user?.id,
      userEmail: user?.email
    })
  });
  const data = await res.json();
  window.dispatchEvent(new Event('storage'));
  return data;
}

export async function deleteDocument(docId) {
  const user = getCurrentUser();
  const res = await fetch(`${getApiBase()}/api/documents/${docId}`, {
    method: 'DELETE',
    headers: {
      ...getHeaders(),
      'x-user-email': user?.email
    }
  });
  const data = await res.json();
  window.dispatchEvent(new Event('storage'));
  return data;
}

// Contacts
export async function getContacts() {
  const res = await fetch(`${getApiBase()}/api/contacts`, {
    headers: getHeaders()
  });
  return await res.json();
}

export async function addContact(contactData) {
  const user = getCurrentUser();
  const res = await fetch(`${getApiBase()}/api/contacts`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      ...contactData,
      userId: user?.id,
      userEmail: user?.email
    })
  });
  const data = await res.json();
  window.dispatchEvent(new Event('storage'));
  return data;
}

export async function updateContactPermissions(contactId, assignedAssets, assignedDocuments) {
  const user = getCurrentUser();
  const res = await fetch(`${getApiBase()}/api/contacts/${contactId}/permissions`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({
      assignedAssets,
      assignedDocuments,
      userId: user?.id,
      userEmail: user?.email
    })
  });
  const data = await res.json();
  window.dispatchEvent(new Event('storage'));
  return data;
}

export async function deleteContact(contactId) {
  const user = getCurrentUser();
  const res = await fetch(`${getApiBase()}/api/contacts/${contactId}`, {
    method: 'DELETE',
    headers: {
      ...getHeaders(),
      'x-user-email': user?.email
    }
  });
  const data = await res.json();
  window.dispatchEvent(new Event('storage'));
  return data;
}

// Claims
export async function submitClaim(email, accessCode, notes) {
  const res = await fetch(`${getApiBase()}/api/claims/submit`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ email, accessCode, notes })
  });
  const data = await res.json();
  if (data.success) {
    setClaimAccessCode(accessCode);
  }
  window.dispatchEvent(new Event('storage'));
  return data;
}

export async function reviewClaim(contactId, approve) {
  const res = await fetch(`${getApiBase()}/api/claims/review`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ contactId, approve })
  });
  const data = await res.json();
  window.dispatchEvent(new Event('storage'));
  return data;
}

export async function resetClaim(contactId) {
  const res = await fetch(`${getApiBase()}/api/claims/reset`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ contactId })
  });
  const data = await res.json();
  window.dispatchEvent(new Event('storage'));
  return data;
}
