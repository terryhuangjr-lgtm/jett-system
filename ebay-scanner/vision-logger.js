/**
 * vision-logger.js
 * Records every vision decision for review and validation
 */

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, 'vision-logs');

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function logVisionDecision(item, vision, decision) {
  ensureLogDir();
  
  const today = new Date().toISOString().split('T')[0];
  const logFile = path.join(LOG_DIR, `vision-${today}.json`);
  
  const entry = {
    timestamp: new Date().toISOString(),
    decision: decision,
    itemId: item.itemId,
    title: item.title,
    price: item.currentPrice || item.price,
    imageUrl: item.imageUrl,
    ebayUrl: item.viewItemURL || item.url,
    vision: {
      corners: vision.corners,
      centering: vision.centering,
      overallScore: vision.score,
      confidence: vision.confidence,
      issues: vision.issues || [],
      reason: vision.reason
    },
    dealScore: item.dealScore?.score || null
  };

  let log = [];
  if (fs.existsSync(logFile)) {
    try {
      log = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    } catch (e) {
      log = [];
    }
  }

  log.push(entry);
  fs.writeFileSync(logFile, JSON.stringify(log, null, 2));
}

function getVisionSummary(date) {
  ensureLogDir();
  const logFile = path.join(LOG_DIR, `vision-${date}.json`);
  
  if (!fs.existsSync(logFile)) {
    return null;
  }

  const log = JSON.parse(fs.readFileSync(logFile, 'utf8'));
  
  const passed = log.filter(e => e.decision === 'PASS');
  const rejected = log.filter(e => e.decision === 'REJECT');
  
  const cornerRejections = rejected.filter(e => 
    e.vision.corners < 6
  );
  const centeringRejections = rejected.filter(e => 
    e.vision.centering < 6
  );
  const bothRejections = rejected.filter(e => 
    e.vision.corners < 6 && e.vision.centering < 6
  );

  return {
    date,
    total: log.length,
    passed: passed.length,
    rejected: rejected.length,
    passRate: Math.round((passed.length / log.length) * 100) + '%',
    rejectionBreakdown: {
      cornersOnly: cornerRejections.length - bothRejections.length,
      centeringOnly: centeringRejections.length - bothRejections.length,
      both: bothRejections.length
    },
    rejectedItems: rejected.map(e => ({
      title: e.title,
      price: e.price,
      corners: e.vision.corners,
      centering: e.vision.centering,
      score: e.vision.overallScore,
      confidence: e.vision.confidence,
      issues: e.vision.issues,
      imageUrl: e.imageUrl,
      ebayUrl: e.ebayUrl
    }))
  };
}

module.exports = { logVisionDecision, getVisionSummary };
