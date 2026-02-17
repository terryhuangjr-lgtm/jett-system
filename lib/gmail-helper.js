#!/usr/bin/env node
/**
 * Gmail Helper - Simplified Gmail operations via browser automation
 * Handles common Gmail tasks with proper error handling
 */

const FileUploadHelper = require('./file-upload-helper');

class GmailHelper {
  constructor(options = {}) {
    this.fileHelper = new FileUploadHelper(options);
    this.gmailUrl = 'https://mail.google.com/';
    this.verbose = options.verbose || false;
  }

  /**
   * Send email with optional attachment
   * Returns browser command sequence
   */
  sendEmail({ to, subject, body, attachments = [] }) {
    const commands = [];

    // 1. Navigate to Gmail
    commands.push({
      description: 'Navigate to Gmail',
      command: { action: 'navigate', url: this.gmailUrl }
    });

    // 2. Wait for Gmail to load
    commands.push({
      description: 'Wait for Gmail to load',
      command: { action: 'wait', timeoutMs: 10000 }
    });

    // 3. Get page snapshot
    commands.push({
      description: 'Get page structure',
      command: { action: 'snapshot', format: 'interactive' },
      note: 'Find compose button ref from snapshot'
    });

    // 4. Click compose (user must provide ref from snapshot)
    commands.push({
      description: 'Click Compose',
      command: { action: 'act', ref: '<COMPOSE_REF>', type: 'click' },
      note: 'Replace <COMPOSE_REF> with actual ref from snapshot'
    });

    // 5. Wait for compose window
    commands.push({
      description: 'Wait for compose window',
      command: { action: 'wait', timeoutMs: 5000 }
    });

    // 6. Get compose window snapshot
    commands.push({
      description: 'Get compose window structure',
      command: { action: 'snapshot', format: 'interactive' },
      note: 'Find to/subject/body field refs'
    });

    // 7. Fill in recipient
    if (to) {
      commands.push({
        description: `Enter recipient: ${to}`,
        command: { action: 'act', ref: '<TO_REF>', type: 'type', text: to },
        note: 'Replace <TO_REF> with actual ref from snapshot'
      });
    }

    // 8. Fill in subject
    if (subject) {
      commands.push({
        description: `Enter subject: ${subject}`,
        command: { action: 'act', ref: '<SUBJECT_REF>', type: 'type', text: subject },
        note: 'Replace <SUBJECT_REF> with actual ref from snapshot'
      });
    }

    // 9. Fill in body
    if (body) {
      commands.push({
        description: `Enter body`,
        command: { action: 'act', ref: '<BODY_REF>', type: 'type', text: body },
        note: 'Replace <BODY_REF> with actual ref from snapshot'
      });
    }

    // 10. Handle attachments
    if (attachments && attachments.length > 0) {
      // Validate all files first
      const fileResults = attachments.map(file => {
        const result = this.fileHelper.resolveFilePath(file);
        if (!result.valid) {
          throw new Error(`File error: ${result.error}`);
        }
        return result.absolutePath;
      });

      commands.push({
        description: `Arm file chooser with ${attachments.length} file(s)`,
        command: { action: 'upload', files: fileResults },
        note: 'IMPORTANT: This MUST come BEFORE clicking attach button'
      });

      commands.push({
        description: 'Click attach files button',
        command: { action: 'act', ref: '<ATTACH_REF>', type: 'click' },
        note: 'Replace <ATTACH_REF> with actual ref from snapshot'
      });

      commands.push({
        description: 'Wait for upload to complete',
        command: { action: 'wait', timeoutMs: 60000 },
        note: 'Increase timeout for large files'
      });
    }

    // 11. Send email
    commands.push({
      description: 'Click Send button',
      command: { action: 'act', ref: '<SEND_REF>', type: 'click' },
      note: 'Replace <SEND_REF> with actual ref from snapshot'
    });

    // 12. Wait for send confirmation
    commands.push({
      description: 'Wait for send confirmation',
      command: { action: 'wait', timeoutMs: 5000 }
    });

    return {
      success: true,
      commands,
      totalSteps: commands.length,
      note: 'Replace placeholder refs (<COMPOSE_REF>, <TO_REF>, etc) with actual refs from snapshots'
    };
  }

  /**
   * Check inbox for unread emails
   */
  checkInbox() {
    return {
      commands: [
        {
          description: 'Navigate to Gmail',
          command: { action: 'navigate', url: this.gmailUrl }
        },
        {
          description: 'Wait for inbox',
          command: { action: 'wait', timeoutMs: 10000 }
        },
        {
          description: 'Get inbox snapshot',
          command: { action: 'snapshot', format: 'interactive' },
          note: 'Parse snapshot to find unread email count and subjects'
        },
        {
          description: 'Take screenshot for visual verification',
          command: { action: 'screenshot' }
        }
      ]
    };
  }

  /**
   * Read specific email
   */
  readEmail(emailSubject) {
    return {
      commands: [
        {
          description: 'Navigate to Gmail',
          command: { action: 'navigate', url: this.gmailUrl }
        },
        {
          description: 'Wait and get inbox',
          command: { action: 'wait', timeoutMs: 10000 }
        },
        {
          description: 'Get inbox snapshot',
          command: { action: 'snapshot', format: 'interactive' },
          note: `Find email with subject: ${emailSubject}`
        },
        {
          description: 'Click email',
          command: { action: 'act', ref: '<EMAIL_REF>', type: 'click' },
          note: 'Replace <EMAIL_REF> with ref of target email from snapshot'
        },
        {
          description: 'Wait for email to open',
          command: { action: 'wait', timeoutMs: 5000 }
        },
        {
          description: 'Get email content',
          command: { action: 'snapshot', format: 'text' },
          note: 'Parse snapshot to extract email body'
        }
      ]
    };
  }

  /**
   * Pre-flight check before sending email
   */
  validateEmail({ to, subject, body, attachments = [] }) {
    const errors = [];
    const warnings = [];

    // Validate recipient
    if (!to) {
      errors.push('Recipient email (to) is required');
    } else if (!to.includes('@')) {
      errors.push(`Invalid recipient email: ${to}`);
    }

    // Validate subject
    if (!subject || subject.trim().length === 0) {
      warnings.push('Email subject is empty');
    }

    // Validate body
    if (!body || body.trim().length === 0) {
      warnings.push('Email body is empty');
    }

    // Validate attachments
    if (attachments && attachments.length > 0) {
      for (const file of attachments) {
        const result = this.fileHelper.resolveFilePath(file);
        if (!result.valid) {
          errors.push(`Attachment error: ${result.error}`);
        } else {
          if (parseFloat(result.sizeMB) > 25) {
            errors.push(`Attachment too large: ${file} (${result.sizeMB} MB > 25 MB Gmail limit)`);
          }
        }
      }

      const totalSizeMB = attachments.reduce((sum, file) => {
        const result = this.fileHelper.resolveFilePath(file);
        return sum + (result.valid ? parseFloat(result.sizeMB) : 0);
      }, 0);

      if (totalSizeMB > 25) {
        errors.push(`Total attachment size ${totalSizeMB.toFixed(2)} MB exceeds Gmail limit of 25 MB`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// CLI usage
if (require.main === module) {
  const helper = new GmailHelper({ verbose: true });
  const args = process.argv.slice(2);
  const cmd = args[0];

  switch (cmd) {
    case 'send':
      const workflow = helper.sendEmail({
        to: args[1],
        subject: args[2],
        body: args[3],
        attachments: args.slice(4)
      });
      console.log(JSON.stringify(workflow, null, 2));
      break;

    case 'validate':
      const validation = helper.validateEmail({
        to: args[1],
        subject: args[2],
        body: args[3],
        attachments: args.slice(4)
      });
      console.log(JSON.stringify(validation, null, 2));
      break;

    case 'inbox':
      const inboxWorkflow = helper.checkInbox();
      console.log(JSON.stringify(inboxWorkflow, null, 2));
      break;

    case 'read':
      const readWorkflow = helper.readEmail(args[1]);
      console.log(JSON.stringify(readWorkflow, null, 2));
      break;

    default:
      console.log(`Gmail Helper

Usage:
  node gmail-helper.js send <to> <subject> <body> [attachments...]
  node gmail-helper.js validate <to> <subject> <body> [attachments...]
  node gmail-helper.js inbox
  node gmail-helper.js read <subject>

Examples:
  node gmail-helper.js send terry@example.com "Report" "See attached" report.pdf
  node gmail-helper.js validate terry@example.com "Test" "Body" file.pdf
  node gmail-helper.js inbox
  node gmail-helper.js read "Important Email"
`);
  }
}

module.exports = GmailHelper;
