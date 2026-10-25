const mongoose = require('mongoose');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let spawnedMongoProcess = null;

async function attemptConnect(uri, maxRetries = 3, retryDelayMs = 1500) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Connecting to MongoDB (attempt ${attempt}/${maxRetries})...`);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log('MongoDB connected successfully!');
      return true;
    } catch (err) {
      console.warn(`Connection attempt ${attempt} failed: ${err.message}`);
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, retryDelayMs));
      }
    }
  }
  return false;
}

async function trySpawnLocalMongod() {
  const possiblePaths = [
    'C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.exe',
    'C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe',
    'C:\\Program Files\\MongoDB\\Server\\7.0\\bin\\mongod.exe',
    'mongod',
  ];

  let mongodBinary = null;
  for (const p of possiblePaths) {
    if (p === 'mongod' || fs.existsSync(p)) {
      mongodBinary = p;
      break;
    }
  }

  if (!mongodBinary) return false;

  const dbDir = path.join(__dirname, '..', 'data', 'db');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  console.log(`Starting local mongod from ${mongodBinary} with dbpath ${dbDir}...`);
  try {
    spawnedMongoProcess = spawn(mongodBinary, ['--dbpath', dbDir, '--bind_ip', '127.0.0.1', '--port', '27017'], {
      detached: false,
      stdio: 'ignore',
    });

    spawnedMongoProcess.on('error', (err) => {
      console.warn('Spawned mongod error:', err.message);
    });

    // Wait a couple seconds for mongod to listen
    await new Promise((r) => setTimeout(r, 2500));
    return true;
  } catch (err) {
    console.warn('Could not launch local mongod:', err.message);
    return false;
  }
}

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/saanjh_restaurant';

  const connected = await attemptConnect(uri, 2, 1000);
  if (connected) return;

  // If connection failed and we are pointing to localhost, try starting local mongod
  if (uri.includes('127.0.0.1') || uri.includes('localhost')) {
    console.log('Local MongoDB not responding. Attempting to start local MongoDB process...');
    const started = await trySpawnLocalMongod();
    if (started) {
      const reconnected = await attemptConnect(uri, 5, 2000);
      if (reconnected) return;
    }

    // Try mongodb-memory-server as fallback if installed
    try {
      console.log('Attempting in-memory MongoDB fallback...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const memUri = mongod.getUri();
      console.log(`In-memory MongoDB started at: ${memUri}`);
      await mongoose.connect(memUri);
      console.log('Connected to In-Memory MongoDB successfully!');
      return;
    } catch (memErr) {
      console.warn('In-memory MongoDB not available:', memErr.message);
    }
  }

  throw new Error(`Failed to connect to MongoDB at ${uri}. Please ensure MongoDB is running.`);
}

process.on('exit', () => {
  if (spawnedMongoProcess) {
    try {
      spawnedMongoProcess.kill();
    } catch (e) {}
  }
});

module.exports = connectDB;
