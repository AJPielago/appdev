import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: String, required: true }
});

const AssetSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  ownerId: { type: String, required: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  identifier: { type: String, required: true },
  instructions: { type: String, required: true },
  value: { type: String, required: true },
  visibility: { type: String, required: true },
  status: { type: String, default: 'active' },
  createdAt: { type: String, required: true }
});

const DocumentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  ownerId: { type: String, required: true },
  name: { type: String, required: true },
  fileType: { type: String, required: true },
  fileSize: { type: String, required: true },
  base64Data: { type: String, required: true },
  encryptedData: { type: String, required: true },
  encryptionKey: { type: String, required: true },
  createdAt: { type: String, required: true }
});

const ContactSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  ownerId: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  relationship: { type: String, required: true },
  accessCode: { type: String, required: true },
  claimStatus: { type: String, default: 'inactive' },
  claimDate: { type: String, default: null },
  claimNotes: { type: String, default: '' },
  assignedAssets: [{ type: String }],
  assignedDocuments: [{ type: String }],
  wrappedKey: { type: String, default: '' },
  createdAt: { type: String, required: true }
});

const BlockSchema = new mongoose.Schema({
  index: { type: Number, required: true, unique: true },
  timestamp: { type: String, required: true },
  transactions: [mongoose.Schema.Types.Mixed],
  previousHash: { type: String, required: true },
  nonce: { type: Number, required: true },
  hash: { type: String, required: true }
});

const LogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  timestamp: { type: String, required: true },
  userId: { type: String, required: true },
  userEmail: { type: String, required: true },
  action: { type: String, required: true },
  details: { type: String, required: true },
  type: { type: String, required: true }
});

export const User = mongoose.model('User', UserSchema);
export const Asset = mongoose.model('Asset', AssetSchema);
export const Document = mongoose.model('Document', DocumentSchema);
export const Contact = mongoose.model('Contact', ContactSchema);
export const Block = mongoose.model('Block', BlockSchema);
export const Log = mongoose.model('Log', LogSchema);
