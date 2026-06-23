/* global process, Buffer */
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { User, Asset, Document, Contact, Block, Log } from './models/Schemas.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Support base64 file uploads

// Create uploads directory
const UPLOADS_DIR = path.join(process.cwd(), 'server', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// In-memory P2P peer list
let peers = [];

// --- Cryptographic Blockchain Utility Helpers ---
function hashString(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57, h3 = 0xfae900d1, h4 = 0x2f8b501a;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 3818301643);
    h4 = Math.imul(h4 ^ ch, 2901237911);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h3 ^ (h3 >>> 13), 3266489909);
  h3 = Math.imul(h3 ^ (h3 >>> 16), 2246822507) ^ Math.imul(h4 ^ (h4 >>> 13), 3266489909);
  h4 = Math.imul(h4 ^ (h4 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  
  const toHex = (n) => (n >>> 0).toString(16).padStart(8, '0');
  
  return toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4) + 
         toHex(h1 ^ h2) + toHex(h2 ^ h3) + toHex(h3 ^ h4) + toHex(h4 ^ h1);
}

function calculateBlockHash(block) {
  const str = block.index + 
              block.timestamp + 
              JSON.stringify(block.transactions) + 
              block.previousHash + 
              block.nonce;
  return hashString(str);
}

function createGenesisBlock() {
  const genesisBlock = {
    index: 0,
    timestamp: new Date('2026-06-01T00:00:00.000Z').toISOString(),
    transactions: [
      {
        action: 'GENESIS_BLOCK',
        user: 'SYSTEM',
        details: 'DigitalWill Ledger Initialized. Cryptographic security active.',
        timestamp: '2026-06-01T00:00:00.000Z'
      }
    ],
    previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
    nonce: 0,
    hash: ''
  };
  genesisBlock.hash = calculateBlockHash(genesisBlock);
  return genesisBlock;
}

function mineBlock(index, transactions, previousHash, difficulty = 2) {
  const block = {
    index,
    timestamp: new Date().toISOString(),
    transactions,
    previousHash,
    nonce: 0,
    hash: ''
  };
  
  const targetPrefix = '0'.repeat(difficulty);
  while (true) {
    const hash = calculateBlockHash(block);
    if (hash.startsWith(targetPrefix)) {
      block.hash = hash;
      break;
    }
    block.nonce++;
    if (block.nonce > 500000) {
      block.hash = hash;
      break;
    }
  }
  return block;
}

// --- Dynamic Transactions to Block Miner ---
async function mineTransactionsToBlock(txs) {
  const lastBlock = await Block.findOne().sort({ index: -1 });
  const nextIndex = lastBlock ? lastBlock.index + 1 : 1;
  const prevHash = lastBlock ? lastBlock.hash : '0000000000000000000000000000000000000000000000000000000000000000';
  const newBlockData = mineBlock(nextIndex, txs, prevHash, 2);
  const block = new Block(newBlockData);
  await block.save();
  
  // Propagate block to P2P nodes asynchronously
  peers.forEach(peer => {
    fetch(`${peer}/api/p2p/broadcast-block`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ block: newBlockData })
    }).catch(err => console.error(`[P2P] Broadcast failed to peer ${peer}:`, err.message));
  });
  
  return block;
}

// --- Activity Logger helper ---
async function logActivity(userId, userEmail, action, details, type = 'asset') {
  const newLog = new Log({
    id: 'log_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    timestamp: new Date().toISOString(),
    userId,
    userEmail,
    action,
    details,
    type
  });
  await newLog.save();
  return newLog;
}

// Sync helper to derive client auth hashes inside backend for seed setup
function deriveAuthHashSync(email, password) {
  const salt = Buffer.from(email.toLowerCase() + '_auth_salt');
  const derived = crypto.pbkdf2Sync(password, salt, 50000, 32, 'sha256');
  return derived.toString('hex');
}

// --- Database Seeding ---
async function seedInitialData() {
  const users = [
    { 
      id: 'usr_1', 
      name: 'Alex Joyous', 
      email: 'alex@will.com', 
      password: bcrypt.hashSync(deriveAuthHashSync('alex@will.com', 'password123'), 10), 
      createdAt: new Date('2026-06-01T08:00:00Z').toISOString() 
    },
    { 
      id: 'usr_admin', 
      name: 'System Administrator', 
      email: 'admin@will.com', 
      password: bcrypt.hashSync(deriveAuthHashSync('admin@will.com', 'adminpassword'), 10), 
      createdAt: new Date('2026-06-01T08:00:00Z').toISOString() 
    }
  ];

  // Seed assets (now encrypted client-side in Zero-Knowledge flow, but seed data uses plaintext indicators for initial state)
  const assets = [
    {
      id: 'ast_1',
      ownerId: 'usr_1',
      name: 'Bitcoin Wallet',
      category: 'cryptocurrency',
      identifier: 'bc1qxy2kg3ut5xg...',
      instructions: 'Contains 2.45 BTC. Recover via the 12-word seed phrase stored in the Secure Vault.',
      value: '$158,400',
      visibility: 'conditional',
      createdAt: new Date('2026-06-05T09:30:00Z').toISOString(),
      status: 'active'
    },
    {
      id: 'ast_2',
      ownerId: 'usr_1',
      name: 'Google Drive Legacy Archives',
      category: 'cloud_storage',
      identifier: 'alex.joyous.cloud@gmail.com',
      instructions: 'Request access to the main family archive folder. Contains childhood photos and family tax files.',
      value: 'Irreplaceable',
      visibility: 'conditional',
      createdAt: new Date('2026-06-06T14:15:00Z').toISOString(),
      status: 'active'
    },
    {
      id: 'ast_3',
      ownerId: 'usr_1',
      name: 'Facebook Memorial Profile',
      category: 'social_media',
      identifier: 'facebook.com/alex.joyous.legacy',
      instructions: 'Convert the page into a Memorial Profile. Do not delete. Post a final update saying I have moved on to my next adventure.',
      value: 'Sentimental',
      visibility: 'immediate',
      createdAt: new Date('2026-06-07T10:00:00Z').toISOString(),
      status: 'active'
    }
  ];

  // Seed documents
  const doc1Id = 'doc_1';
  const doc1Path = path.join(UPLOADS_DIR, `${doc1Id}.dat`);
  const doc1Base64 = 'data:application/pdf;base64,JVBERi0xLjQKJdPr6gogMSAwIG9iagogIDw8IC9UeXBlIC9DYXRhbG9nCiAgICAgL1BhZ2VzIDIgMCBSCiAgPj4KZW5kb2JqCjIgMCBvYmoKICA8PCAvVHlwZSAvUGFnZXMKICAgICAvS2lkcyBbIDMgMCBSIF0KICAgICAvQ291bnQgMQogID4+CmVuZG9iagozIDAgb2JqCiAgPDwgL1R5cGUgL1BhZ2UKICAgICAvUGFyZW50IDIgMCBSCiAgICAgL01lZGlhQm94IFsgMCAwIDYxMiA3OTIgXQogICAgIC9SZXNvdXJjZXMgPDw+PgogICAgIC9Db250ZW50cyA0IDAgUgo+PmVuZG9iag...';
  fs.writeFileSync(doc1Path, doc1Base64);

  const doc2Id = 'doc_2';
  const doc2Path = path.join(UPLOADS_DIR, `${doc2Id}.dat`);
  const doc2Base64 = 'data:text/plain;base64,YWxwaGEgYmV0YSBjaGFybGllIGRlbHRhIGVjaG8gZm94dHJvdCBnb2xmIGhvdGVsIGluZGlhIGp1bGlldHQga2lsbyBsaW1h';
  fs.writeFileSync(doc2Path, doc2Base64);

  const documents = [
    {
      id: doc1Id,
      ownerId: 'usr_1',
      name: 'Last Will & Testament.pdf',
      fileType: 'pdf',
      fileSize: '342 KB',
      base64Data: doc1Path,
      encryptedData: 'A3F8E9C02B918D7E36C2F8A4B0E8D7F91029384756ADBCFE0192837465FADECB495867382910AECFBD4829302DF78A9C0E2B1F',
      encryptionKey: 'key_dw_will_0605_secure_aes256',
      createdAt: new Date('2026-06-05T10:10:00Z').toISOString()
    },
    {
      id: doc2Id,
      ownerId: 'usr_1',
      name: 'Crypto Seed Phrase.txt',
      fileType: 'txt',
      fileSize: '1.2 KB',
      base64Data: doc2Path,
      encryptedData: '908DFCEAB231908ACFE4923018475FAEDBC1237890AE89D0C78291F092E38D4F7839D0C81FDEAC8293BD018DF9A01928374E',
      encryptionKey: 'key_dw_seeds_0605_secure_aes256',
      createdAt: new Date('2026-06-05T10:25:00Z').toISOString()
    }
  ];

  const contacts = [
    {
      id: 'con_1',
      ownerId: 'usr_1',
      name: 'Jane Doe',
      email: 'jane@will.com',
      relationship: 'Sister',
      accessCode: 'WILL-JANE-589',
      claimStatus: 'inactive',
      claimDate: null,
      claimNotes: '',
      assignedAssets: ['ast_1', 'ast_2'],
      assignedDocuments: ['doc_1', 'doc_2'],
      createdAt: new Date('2026-06-08T11:00:00Z').toISOString()
    }
  ];

  const logs = [
    { id: 'log_0', timestamp: new Date('2026-06-01T08:00:00Z').toISOString(), userId: 'SYSTEM', userEmail: 'SYSTEM', action: 'LEDGER_INITIALIZED', details: 'DigitalWill smart record-keeping ledger initialized.', type: 'admin' },
    { id: 'log_1', timestamp: new Date('2026-06-01T08:05:00Z').toISOString(), userId: 'usr_1', userEmail: 'alex@will.com', action: 'USER_REGISTERED', details: 'User account created for Alex Joyous.', type: 'auth' },
    { id: 'log_2', timestamp: new Date('2026-06-05T09:30:00Z').toISOString(), userId: 'usr_1', userEmail: 'alex@will.com', action: 'ASSET_CREATED', details: 'Added Cryptocurrency Asset: Bitcoin Wallet.', type: 'asset' },
    { id: 'log_3', timestamp: new Date('2026-06-05T10:10:00Z').toISOString(), userId: 'usr_1', userEmail: 'alex@will.com', action: 'DOCUMENT_UPLOADED', details: 'Uploaded secure document: Last Will & Testament.pdf.', type: 'vault' },
    { id: 'log_4', timestamp: new Date('2026-06-08T11:00:00Z').toISOString(), userId: 'usr_1', userEmail: 'alex@will.com', action: 'CONTACT_ADDED', details: 'Registered sister Jane Doe as trusted contact.', type: 'contact' }
  ];

  await User.insertMany(users);
  await Asset.insertMany(assets);
  await Document.insertMany(documents);
  await Contact.insertMany(contacts);
  await Log.insertMany(logs);

  const chain = [];
  const genesis = createGenesisBlock();
  chain.push(genesis);
  let prevHash = genesis.hash;

  const block1Tx = [
    { action: 'USER_REGISTRATION', user: 'alex@will.com', details: 'Register Alex Joyous account', timestamp: logs[1].timestamp },
    { action: 'ASSET_DECLARATION', user: 'alex@will.com', details: 'Declared Crypto Asset: Bitcoin Wallet', timestamp: logs[2].timestamp }
  ];
  const block1 = mineBlock(1, block1Tx, prevHash, 2);
  chain.push(block1);
  prevHash = block1.hash;

  const block2Tx = [
    { action: 'SECURE_UPLOAD', user: 'alex@will.com', details: 'Uploaded & Encrypted Last Will & Testament.pdf', timestamp: logs[3].timestamp },
    { action: 'BENEFICIARY_DECLARATION', user: 'alex@will.com', details: 'Assigned Jane Doe as trustee', timestamp: logs[4].timestamp }
  ];
  const block2 = mineBlock(2, block2Tx, prevHash, 2);
  chain.push(block2);

  await Block.insertMany(chain);
  console.log('Database successfully seeded with pre-loaded mock ledger data.');
}

// --- REST API Endpoints ---

// Auth Endpoints
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (user && await bcrypt.compare(password, user.password)) {
      await logActivity(user.id, user.email, 'USER_LOGIN', 'Logged into DigitalWill platform', 'auth');
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, error: 'Invalid email or password credentials.' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, error: 'User with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      id: 'usr_' + Date.now(),
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      createdAt: new Date().toISOString()
    });

    await newUser.save();
    await logActivity(newUser.id, newUser.email, 'USER_REGISTERED', `Created account for ${name}`, 'auth');
    await mineTransactionsToBlock([
      { action: 'USER_REGISTRATION', user: email, details: `Registered account for ${name}`, timestamp: new Date().toISOString() }
    ]);

    notifyServerUpdate('auth', 'register');
    res.json({ success: true, user: newUser });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Profile Update Endpoint
app.put('/api/auth/profile', async (req, res) => {
  const { name, password, userId } = req.body;
  try {
    const user = await User.findOne({ id: userId });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    
    user.name = name;
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }
    await user.save();

    await logActivity(user.id, user.email, 'PROFILE_UPDATED', `Updated settings (name/password)`, 'auth');
    await mineTransactionsToBlock([
      { action: 'PROFILE_UPDATE', user: user.email, details: `Updated profile details`, timestamp: new Date().toISOString() }
    ]);

    notifyServerUpdate('auth', 'profile');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Users Endpoint
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logs Endpoints
app.get('/api/logs', async (req, res) => {
  try {
    const logs = await Log.find().sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/logs', async (req, res) => {
  const { userId, userEmail, action, details, type } = req.body;
  try {
    const log = await logActivity(userId, userEmail, action, details, type);
    notifyServerUpdate('log', 'create');
    res.json({ success: true, log });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Blockchain Endpoints
app.get('/api/blockchain', async (req, res) => {
  try {
    const chain = await Block.find().sort({ index: 1 });
    res.json(chain);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/blockchain/reset', async (req, res) => {
  try {
    await mongoose.connection.db.dropDatabase();
    await seedInitialData();
    notifyServerUpdate('blockchain', 'reset');
    res.json({ success: true, message: 'Database reset and re-seeded successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/blockchain/tamper', async (req, res) => {
  const { index, transactions } = req.body;
  try {
    const block = await Block.findOne({ index });
    if (!block) return res.status(404).json({ success: false, error: 'Block not found' });

    block.transactions = transactions;
    block.markModified('transactions');
    await block.save();

    notifyServerUpdate('blockchain', 'tamper');
    res.json({ success: true, block });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Assets Endpoints
app.get('/api/assets', async (req, res) => {
  const role = req.headers['x-active-role'] || 'owner';
  const userId = req.headers['x-user-id'];
  try {
    const assets = await Asset.find();
    if (role === 'admin') {
      return res.json(assets);
    }
    if (role === 'beneficiary') {
      const contacts = await Contact.find();
      const activeContact = contacts.find(c => c.email.toLowerCase() === 'jane@will.com');
      if (!activeContact) return res.json([]);

      const filtered = assets.filter(a => {
        const isAssigned = activeContact.assignedAssets.includes(a.id);
        if (!isAssigned) return false;
        if (a.visibility === 'immediate') return true;
        if (a.visibility === 'conditional' && activeContact.claimStatus === 'approved') return true;
        return false;
      });
      return res.json(filtered);
    }
    const filtered = assets.filter(a => a.ownerId === userId && a.status === 'active');
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/assets', async (req, res) => {
  const { name, category, identifier, instructions, value, visibility, userId, userEmail } = req.body;
  try {
    const newAsset = new Asset({
      id: 'ast_' + Date.now(),
      ownerId: userId,
      name,
      category,
      identifier,
      instructions, // Encrypted client-side in Zero-Knowledge mode
      value: value || 'N/A',
      visibility: visibility || 'conditional',
      status: 'active',
      createdAt: new Date().toISOString()
    });

    await newAsset.save();
    await logActivity(userId, userEmail, 'ASSET_CREATED', `Added asset "${newAsset.name}" under category "${newAsset.category}"`, 'asset');
    await mineTransactionsToBlock([
      { action: 'ASSET_DECLARATION', user: userEmail, details: `Added "${newAsset.name}" (${newAsset.category})`, timestamp: new Date().toISOString() }
    ]);

    notifyServerUpdate('asset', 'create');
    res.json({ success: true, asset: newAsset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/assets/:id', async (req, res) => {
  const assetId = req.params.id;
  const { name, category, identifier, instructions, value, visibility, userId, userEmail } = req.body;
  try {
    const asset = await Asset.findOne({ id: assetId, ownerId: userId });
    if (!asset) return res.status(404).json({ success: false, error: 'Asset not found or unauthorized' });

    asset.name = name;
    asset.category = category;
    asset.identifier = identifier;
    asset.instructions = instructions; // Encrypted client-side
    asset.value = value || 'N/A';
    asset.visibility = visibility;

    await asset.save();
    await logActivity(userId, userEmail, 'ASSET_UPDATED', `Updated details for asset "${asset.name}"`, 'asset');
    await mineTransactionsToBlock([
      { action: 'ASSET_MODIFICATION', user: userEmail, details: `Modified asset details for "${asset.name}"`, timestamp: new Date().toISOString() }
    ]);

    notifyServerUpdate('asset', 'update');
    res.json({ success: true, asset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/assets/:id', async (req, res) => {
  const assetId = req.params.id;
  const userId = req.headers['x-user-id'];
  const userEmail = req.headers['x-user-email'];
  try {
    const asset = await Asset.findOne({ id: assetId, ownerId: userId });
    if (!asset) return res.status(404).json({ success: false, error: 'Asset not found or unauthorized' });

    await Asset.deleteOne({ id: assetId });
    await logActivity(userId, userEmail, 'ASSET_DELETED', `Removed asset "${asset.name}"`, 'asset');
    await mineTransactionsToBlock([
      { action: 'ASSET_DELETION', user: userEmail, details: `Deleted asset "${asset.name}"`, timestamp: new Date().toISOString() }
    ]);

    notifyServerUpdate('asset', 'delete');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Secure Documents Endpoints with Disk Upload Storage
app.get('/api/documents', async (req, res) => {
  const role = req.headers['x-active-role'] || 'owner';
  const userId = req.headers['x-user-id'];
  try {
    const documents = await Document.find();
    let filtered = [];
    if (role === 'admin') {
      filtered = documents;
    } else if (role === 'beneficiary') {
      const contacts = await Contact.find();
      const activeContact = contacts.find(c => c.email.toLowerCase() === 'jane@will.com');
      if (!activeContact) return res.json([]);

      filtered = documents.filter(d => {
        const isAssigned = activeContact.assignedDocuments.includes(d.id);
        return isAssigned && activeContact.claimStatus === 'approved';
      });
    } else {
      filtered = documents.filter(d => d.ownerId === userId);
    }

    // Populate Base64 data from file system disk store on retrieval
    const populated = filtered.map(d => {
      const docObj = d.toObject();
      if (fs.existsSync(docObj.base64Data)) {
        try {
          docObj.base64Data = fs.readFileSync(docObj.base64Data, 'utf8');
        } catch (err) {
          console.error('Error reading document from disk:', err);
        }
      }
      return docObj;
    });

    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/documents', async (req, res) => {
  const { name, fileType, fileSize, base64Data, userId, userEmail, encryptedData, encryptionKey } = req.body;
  try {
    const fileId = 'doc_' + Date.now();
    const filePath = path.join(UPLOADS_DIR, `${fileId}.dat`);
    
    // Save base64 payload to disk storage
    fs.writeFileSync(filePath, base64Data || '');

    const newDoc = new Document({
      id: fileId,
      ownerId: userId,
      name,
      fileType: fileType || 'pdf',
      fileSize: fileSize || '100 KB',
      base64Data: filePath, // save file path reference in DB
      encryptedData: encryptedData || '', // Encrypted file hashes client side
      encryptionKey: encryptionKey || '', // Wrapped file keys client side
      createdAt: new Date().toISOString()
    });

    await newDoc.save();
    await logActivity(userId, userEmail, 'DOCUMENT_UPLOADED', `Uploaded legal document "${newDoc.name}" with client-side Zero-Knowledge AES-256 encryption.`, 'vault');
    await mineTransactionsToBlock([
      { action: 'SECURE_DOCUMENT_UPLOAD', user: userEmail, details: `Uploaded & encrypted "${newDoc.name}"`, timestamp: new Date().toISOString() }
    ]);

    notifyServerUpdate('document', 'create');
    res.json({ success: true, document: newDoc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/documents/:id', async (req, res) => {
  const docId = req.params.id;
  const userId = req.headers['x-user-id'];
  const userEmail = req.headers['x-user-email'];
  try {
    const doc = await Document.findOne({ id: docId, ownerId: userId });
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found or unauthorized' });

    // Remove from file system
    if (fs.existsSync(doc.base64Data)) {
      try {
        fs.unlinkSync(doc.base64Data);
      } catch (err) {
        console.error('Error removing document file:', err);
      }
    }

    await Document.deleteOne({ id: docId });
    await logActivity(userId, userEmail, 'DOCUMENT_DELETED', `Removed legal document "${doc.name}"`, 'vault');
    await mineTransactionsToBlock([
      { action: 'DOCUMENT_REMOVAL', user: userEmail, details: `Deleted document "${doc.name}"`, timestamp: new Date().toISOString() }
    ]);

    notifyServerUpdate('document', 'delete');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Trusted Contacts Endpoints
app.get('/api/contacts', async (req, res) => {
  const role = req.headers['x-active-role'] || 'owner';
  const userId = req.headers['x-user-id'];
  try {
    const contacts = await Contact.find();
    if (role === 'admin' || role === 'beneficiary') {
      return res.json(contacts);
    }
    const filtered = contacts.filter(c => c.ownerId === userId);
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/contacts', async (req, res) => {
  const { name, email, relationship, assignedAssets, assignedDocuments, userId, userEmail, wrappedKey, accessCode } = req.body;
  try {
    const finalAccessCode = accessCode || ('WILL-' + name.split(' ')[0].toUpperCase() + '-' + Math.floor(100 + Math.random() * 900));

    const newContact = new Contact({
      id: 'con_' + Date.now(),
      ownerId: userId,
      name,
      email,
      relationship,
      accessCode: finalAccessCode,
      claimStatus: 'inactive',
      claimDate: null,
      claimNotes: '',
      assignedAssets: assignedAssets || [],
      assignedDocuments: assignedDocuments || [],
      wrappedKey: wrappedKey || '',
      createdAt: new Date().toISOString()
    });

    await newContact.save();
    await logActivity(userId, userEmail, 'CONTACT_ADDED', `Assigned trusted contact "${newContact.name}" (${newContact.relationship})`, 'contact');
    await mineTransactionsToBlock([
      { action: 'TRUSTEE_ASSIGNMENT', user: userEmail, details: `Added trustee ${newContact.name} (${newContact.relationship})`, timestamp: new Date().toISOString() }
    ]);

    notifyServerUpdate('contact', 'create');
    res.json({ success: true, contact: newContact });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/contacts/:id/permissions', async (req, res) => {
  const contactId = req.params.id;
  const { assignedAssets, assignedDocuments, userId, userEmail } = req.body;
  try {
    const contact = await Contact.findOne({ id: contactId, ownerId: userId });
    if (!contact) return res.status(404).json({ success: false, error: 'Contact not found' });

    contact.assignedAssets = assignedAssets;
    contact.assignedDocuments = assignedDocuments;
    await contact.save();

    await logActivity(userId, userEmail, 'CONTACT_PERMISSIONS_UPDATED', `Updated asset inheritance allocations for "${contact.name}"`, 'contact');
    await mineTransactionsToBlock([
      { action: 'PERMISSION_UPDATE', user: userEmail, details: `Updated permissions for trustee "${contact.name}"`, timestamp: new Date().toISOString() }
    ]);

    notifyServerUpdate('contact', 'update');
    res.json({ success: true, contact });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/contacts/:id', async (req, res) => {
  const contactId = req.params.id;
  const userId = req.headers['x-user-id'];
  const userEmail = req.headers['x-user-email'];
  try {
    const contact = await Contact.findOne({ id: contactId, ownerId: userId });
    if (!contact) return res.status(404).json({ success: false, error: 'Contact not found or unauthorized' });

    await Contact.deleteOne({ id: contactId });
    await logActivity(userId, userEmail, 'CONTACT_REMOVED', `Revoked trustee permissions for "${contact.name}"`, 'contact');
    await mineTransactionsToBlock([
      { action: 'TRUSTEE_REVOCATION', user: userEmail, details: `Revoked trustee ${contact.name}`, timestamp: new Date().toISOString() }
    ]);

    notifyServerUpdate('contact', 'delete');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Claim Submissions
app.post('/api/claims/submit', async (req, res) => {
  const { email, accessCode, notes } = req.body;
  try {
    const contact = await Contact.findOne({ email: email.toLowerCase(), accessCode });
    if (!contact) {
      return res.status(404).json({ success: false, error: 'Invalid claimant email or access authorization code.' });
    }

    if (contact.claimStatus === 'approved') {
      return res.status(400).json({ success: false, error: 'Access claim has already been approved and unlocked.' });
    }

    contact.claimStatus = 'pending';
    contact.claimDate = new Date().toISOString();
    contact.claimNotes = notes || '';
    await contact.save();

    await logActivity('SYSTEM', email, 'CLAIM_SUBMITTED', `Access claim request initiated by ${contact.name} (${contact.relationship})`, 'claim');
    await mineTransactionsToBlock([
      { action: 'CLAIM_SUBMISSION', user: email, details: `Initiated claim request for digital inheritance`, timestamp: new Date().toISOString() }
    ]);

    notifyServerUpdate('claim', 'submit');
    res.json({ success: true, contact });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Claim Decisions (Admin Review)
app.post('/api/claims/review', async (req, res) => {
  const { contactId, approve } = req.body;
  try {
    const contact = await Contact.findOne({ id: contactId });
    if (!contact) {
      return res.status(404).json({ success: false, error: 'Claim details not found.' });
    }

    const newStatus = approve ? 'approved' : 'rejected';
    contact.claimStatus = newStatus;
    await contact.save();

    await logActivity('SYSTEM', 'admin@will.com', `CLAIM_${newStatus.toUpperCase()}`, `Admin ${newStatus} inheritance claim for ${contact.name}.`, 'claim');
    await mineTransactionsToBlock([
      { action: 'CLAIM_DECISION', user: 'admin@will.com', details: `Claim for ${contact.name} marked ${newStatus.toUpperCase()}`, timestamp: new Date().toISOString() }
    ]);

    notifyServerUpdate('claim', 'review');
    res.json({ success: true, contact });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/claims/reset', async (req, res) => {
  const { contactId } = req.body;
  try {
    const contact = await Contact.findOne({ id: contactId });
    if (!contact) return res.status(404).json({ success: false, error: 'Contact not found' });

    contact.claimStatus = 'inactive';
    contact.claimDate = null;
    contact.claimNotes = '';
    await contact.save();

    await logActivity('SYSTEM', contact.email, 'CLAIM_RESET', `Access claim reset to inactive for ${contact.name}.`, 'claim');
    await mineTransactionsToBlock([
      { action: 'CLAIM_RESET', user: contact.email, details: `Reset claim request for trustee ${contact.name}`, timestamp: new Date().toISOString() }
    ]);

    notifyServerUpdate('claim', 'reset');
    res.json({ success: true, contact });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- P2P Network Sync Router ---
app.post('/api/p2p/peers', (req, res) => {
  const { peerUrl } = req.body;
  if (peerUrl && !peers.includes(peerUrl)) {
    peers.push(peerUrl);
    console.log('[P2P] Registered new peer node:', peerUrl);
  }
  res.json({ success: true, peers });
});

app.get('/api/p2p/peers', (req, res) => {
  res.json(peers);
});

app.post('/api/p2p/broadcast-block', async (req, res) => {
  const { block } = req.body;
  try {
    const lastBlock = await Block.findOne().sort({ index: -1 });
    
    // Validate block sequence linkage
    if (block.index !== (lastBlock ? lastBlock.index + 1 : 1)) {
      return res.status(400).json({ success: false, error: 'Invalid block index sequence.' });
    }
    
    const expectedPrevHash = lastBlock ? lastBlock.hash : '0000000000000000000000000000000000000000000000000000000000000000';
    if (block.previousHash !== expectedPrevHash) {
      return res.status(400).json({ success: false, error: 'Previous hash mismatch.' });
    }
    
    const computedHash = calculateBlockHash(block);
    if (block.hash !== computedHash) {
      return res.status(400).json({ success: false, error: 'Block hash verification failure.' });
    }
    
    if (!block.hash.startsWith('00')) {
      return res.status(400).json({ success: false, error: 'Proof-of-work difficulty requirement not met.' });
    }
    
    const newBlock = new Block(block);
    await newBlock.save();
    
    console.log('[P2P] Block successfully verified and appended to local ledger chain:', block.index);
    notifyServerUpdate('blockchain', 'broadcast');
    res.json({ success: true, message: 'Block merged and validated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- MongoDB Server Startup ---
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/digitalwill';

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

io.on('connection', (socket) => {
  console.log('[WebSockets] Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('[WebSockets] Client disconnected:', socket.id);
  });
});

// Emit real-time synchronization messages to all connected socket clients
function notifyServerUpdate(type, action) {
  io.emit('db_update', { type, action });
}

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Successfully connected to MongoDB.');
    
    // Seed database if empty
    const blockCount = await Block.countDocuments();
    if (blockCount === 0) {
      console.log('Blockchain is empty. Seeding initial data...');
      await seedInitialData();
    }
    
    httpServer.listen(PORT, () => {
      console.log(`Server Node is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
  });
