#!/usr/bin/env node
/**
 * Research Protocol Enforcement Hook
 * 
 * Validates 21M Sports content generation has proper research verification.
 * Integrates with the enforcement protocol to BLOCK unapproved content.
 */

const { execSync } = require('child_process');
const path = require('path');

function handler(context) {
  if (!context) {
    console.error('[Hook] Invalid context passed to research-protocol-enforcement');
    return { allowed: true };
  }

  const message = context.message || context.content || '';
  const messageType = context.messageType || context.type || '';
  
  // Only validate messages that mention 21M Sports
  if (!is21MSportsRequest(message)) {
    return { allowed: true };
  }

  try {
    // Run the enforcement check
    const result = execSync(
      `node ${path.join(__dirname, '..', 'scripts', 'enforce_research_protocol.js')} --message "${message.replace(/"/g, '\\"')}"`,
      { timeout: 5000, encoding: 'utf8' }
    );

    // Exit code 0 = approved, 1 = blocked
    return {
      allowed: true,
      enforced: true,
      message: 'Research protocol validation passed'
    };
  } catch (error) {
    // Exit code 1 indicates validation failed
    if (error.status === 1) {
      return {
        allowed: false,
        enforced: true,
        reason: 'Research protocol validation failed - content blocked',
        error: error.stdout || error.message
      };
    }
    
    // Other errors - log but allow (fail-safe)
    console.error('[Hook] Enforcement check error:', error.message);
    return {
      allowed: true,
      enforced: false,
      warning: 'Enforcement check unavailable, allowing message'
    };
  }
};

module.exports = handler;
module.exports.default = handler;

/**
 * Check if message is requesting 21M Sports content
 */
function is21MSportsRequest(message) {
  if (!message) return false;

  const lowerMessage = message.toLowerCase();
  return lowerMessage.includes('21m') && lowerMessage.includes('sport');
}
