#!/usr/bin/env node
/**
 * File Upload Helper - Reliable file uploads for Gmail/Drive via browser automation
 * Handles path resolution, validation, and common upload scenarios
 */

const fs = require('fs');
const path = require('path');

class FileUploadHelper {
  constructor(options = {}) {
    this.workspaceDir = options.workspaceDir || '/home/clawd/clawd';
    this.tempDir = options.tempDir || '/tmp';
    this.verbose = options.verbose || false;
  }

  /**
   * Resolve and validate file path
   * @param {string} filePath - Relative or absolute path
   * @returns {object} { valid: boolean, absolutePath: string, error: string }
   */
  resolveFilePath(filePath) {
    if (!filePath) {
      return { valid: false, error: 'No file path provided' };
    }

    let absolutePath;

    // Already absolute?
    if (path.isAbsolute(filePath)) {
      absolutePath = filePath;
    }
    // Relative to workspace
    else if (filePath.startsWith('./') || filePath.startsWith('../')) {
      absolutePath = path.resolve(this.workspaceDir, filePath);
    }
    // Just filename - check workspace first, then temp
    else {
      const workspacePath = path.join(this.workspaceDir, filePath);
      const tempPath = path.join(this.tempDir, filePath);

      if (fs.existsSync(workspacePath)) {
        absolutePath = workspacePath;
      } else if (fs.existsSync(tempPath)) {
        absolutePath = tempPath;
      } else {
        // Assume workspace
        absolutePath = workspacePath;
      }
    }

    // Validate file exists
    if (!fs.existsSync(absolutePath)) {
      return {
        valid: false,
        absolutePath,
        error: `File not found: ${absolutePath}`
      };
    }

    // Check if it's actually a file
    const stats = fs.statSync(absolutePath);
    if (!stats.isFile()) {
      return {
        valid: false,
        absolutePath,
        error: `Not a file: ${absolutePath}`
      };
    }

    // Check file size
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

    return {
      valid: true,
      absolutePath,
      size: stats.size,
      sizeMB,
      error: null
    };
  }

  /**
   * Prepare multiple files for upload
   * @param {string|string[]} files - Single file or array of files
   * @returns {object} { valid: boolean, files: array, errors: array }
   */
  prepareFiles(files) {
    const fileArray = Array.isArray(files) ? files : [files];
    const resolved = [];
    const errors = [];

    for (const file of fileArray) {
      const result = this.resolveFilePath(file);
      if (result.valid) {
        resolved.push({
          original: file,
          absolute: result.absolutePath,
          size: result.size,
          sizeMB: result.sizeMB,
          name: path.basename(result.absolutePath)
        });
      } else {
        errors.push(result.error);
      }
    }

    return {
      valid: errors.length === 0,
      files: resolved,
      errors
    };
  }

  /**
   * Generate browser upload command
   * @param {string} filePath - File to upload
   * @returns {object} Command structure for browser tool
   */
  generateUploadCommand(filePath) {
    const result = this.resolveFilePath(filePath);

    if (!result.valid) {
      return {
        error: result.error,
        command: null
      };
    }

    return {
      error: null,
      absolutePath: result.absolutePath,
      command: {
        action: 'upload',
        files: [result.absolutePath]
      }
    };
  }

  /**
   * Gmail attachment workflow
   * Returns steps for browser automation
   */
  gmailAttachWorkflow(filePath, recipientEmail, subject, body) {
    const fileResult = this.resolveFilePath(filePath);

    if (!fileResult.valid) {
      return { error: fileResult.error };
    }

    return {
      steps: [
        { action: 'navigate', url: 'https://mail.google.com/' },
        { action: 'wait', selector: '[aria-label="Compose"]', timeout: 10000 },
        { action: 'click', description: 'Click Compose button' },
        { action: 'wait', selector: '[name="to"]', timeout: 5000 },
        { action: 'type', description: 'Enter recipient', text: recipientEmail },
        { action: 'type', description: 'Enter subject', selector: '[name="subjectbox"]', text: subject },
        { action: 'type', description: 'Enter body', selector: '[aria-label="Message Body"]', text: body },
        {
          action: 'upload',
          description: 'Arm file chooser and click attach',
          files: [fileResult.absolutePath],
          comment: 'This arms the file chooser. Next click should trigger it.'
        },
        {
          action: 'click',
          description: 'Click attach files button',
          selector: '[aria-label*="Attach"]',
          comment: 'The armed file chooser will handle the upload'
        },
        {
          action: 'wait',
          description: 'Wait for upload to complete',
          timeout: 30000,
          comment: 'Wait for attachment to appear in compose window'
        },
        {
          action: 'click',
          description: 'Click Send',
          selector: '[aria-label*="Send"]'
        }
      ],
      filePath: fileResult.absolutePath
    };
  }

  /**
   * Google Drive upload workflow
   */
  driveUploadWorkflow(filePath, folderName = null) {
    const fileResult = this.resolveFilePath(filePath);

    if (!fileResult.valid) {
      return { error: fileResult.error };
    }

    const steps = [
      { action: 'navigate', url: 'https://drive.google.com/' },
      { action: 'wait', selector: '[aria-label*="New"]', timeout: 10000 }
    ];

    if (folderName) {
      steps.push(
        { action: 'click', description: 'Navigate to folder', comment: `Find folder: ${folderName}` }
      );
    }

    steps.push(
      {
        action: 'upload',
        description: 'Arm file chooser',
        files: [fileResult.absolutePath]
      },
      {
        action: 'click',
        description: 'Click New button',
        selector: '[aria-label*="New"]'
      },
      {
        action: 'click',
        description: 'Click File upload',
        selector: '[aria-label*="File upload"]'
      },
      {
        action: 'wait',
        description: 'Wait for upload',
        timeout: 30000
      }
    );

    return {
      steps,
      filePath: fileResult.absolutePath
    };
  }

  /**
   * Debug file upload issue
   */
  debugUpload(filePath) {
    console.log('=== File Upload Debug ===\n');

    const result = this.resolveFilePath(filePath);

    console.log(`Original path: ${filePath}`);
    console.log(`Resolved path: ${result.absolutePath || 'N/A'}`);
    console.log(`File exists: ${result.valid ? '✅' : '❌'}`);

    if (result.valid) {
      console.log(`File size: ${result.sizeMB} MB`);
      console.log(`Readable: ${fs.accessSync(result.absolutePath, fs.constants.R_OK) === undefined ? '✅' : '❌'}`);
    } else {
      console.log(`Error: ${result.error}`);

      // Suggest alternatives
      console.log('\nSearching for similar files...');
      const filename = path.basename(filePath);
      const workspaceFiles = this.findSimilarFiles(filename, this.workspaceDir);
      const tempFiles = this.findSimilarFiles(filename, this.tempDir);

      if (workspaceFiles.length > 0) {
        console.log('Found in workspace:');
        workspaceFiles.forEach(f => console.log(`  - ${f}`));
      }

      if (tempFiles.length > 0) {
        console.log('Found in /tmp:');
        tempFiles.forEach(f => console.log(`  - ${f}`));
      }
    }

    return result;
  }

  /**
   * Find similar files
   */
  findSimilarFiles(filename, directory) {
    try {
      const files = fs.readdirSync(directory);
      const basename = path.basename(filename, path.extname(filename)).toLowerCase();

      return files
        .filter(f => {
          const fbase = path.basename(f, path.extname(f)).toLowerCase();
          return fbase.includes(basename) || basename.includes(fbase);
        })
        .map(f => path.join(directory, f))
        .slice(0, 5); // Max 5 suggestions
    } catch (err) {
      return [];
    }
  }

  /**
   * List all uploadable files in common locations
   */
  listAvailableFiles() {
    const locations = [
      { name: 'Workspace', path: this.workspaceDir },
      { name: 'Temp', path: this.tempDir }
    ];

    const results = {};

    for (const loc of locations) {
      try {
        const files = fs.readdirSync(loc.path)
          .filter(f => {
            try {
              return fs.statSync(path.join(loc.path, f)).isFile();
            } catch {
              return false;
            }
          })
          .map(f => {
            const fullPath = path.join(loc.path, f);
            const stats = fs.statSync(fullPath);
            return {
              name: f,
              path: fullPath,
              sizeMB: (stats.size / 1024 / 1024).toFixed(2)
            };
          });

        results[loc.name] = files;
      } catch (err) {
        results[loc.name] = [];
      }
    }

    return results;
  }
}

// CLI usage
if (require.main === module) {
  const helper = new FileUploadHelper({ verbose: true });
  const args = process.argv.slice(2);
  const cmd = args[0];

  switch (cmd) {
    case 'check':
    case 'debug':
      helper.debugUpload(args[1]);
      break;

    case 'resolve':
      const result = helper.resolveFilePath(args[1]);
      console.log(JSON.stringify(result, null, 2));
      break;

    case 'list':
      const files = helper.listAvailableFiles();
      console.log(JSON.stringify(files, null, 2));
      break;

    case 'gmail':
      const gmailWorkflow = helper.gmailAttachWorkflow(
        args[1],
        args[2] || 'recipient@example.com',
        args[3] || 'Test Subject',
        args[4] || 'Test body'
      );
      console.log(JSON.stringify(gmailWorkflow, null, 2));
      break;

    case 'drive':
      const driveWorkflow = helper.driveUploadWorkflow(args[1], args[2]);
      console.log(JSON.stringify(driveWorkflow, null, 2));
      break;

    default:
      console.log(`File Upload Helper

Usage:
  node file-upload-helper.js check <file>      Check if file exists and is accessible
  node file-upload-helper.js resolve <file>    Resolve file path (relative to absolute)
  node file-upload-helper.js list              List all available files
  node file-upload-helper.js gmail <file> [to] [subject] [body]    Generate Gmail workflow
  node file-upload-helper.js drive <file> [folder]                 Generate Drive workflow

Examples:
  node file-upload-helper.js check report.pdf
  node file-upload-helper.js resolve ./test-upload.txt
  node file-upload-helper.js list
  node file-upload-helper.js gmail report.pdf terry@example.com "Monthly Report"
  node file-upload-helper.js drive document.pdf "Work Files"
`);
  }
}

module.exports = FileUploadHelper;
