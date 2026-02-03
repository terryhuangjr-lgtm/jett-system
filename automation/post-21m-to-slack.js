#!/usr/bin/env node
// Post 21M Sports content to Slack
// Called by automation at 7 AM

const fs = require('fs');
const path = require('path');

const date = new Date().toISOString().split('T')[0];
const contentFile = path.join(__dirname, 'output', `nightly-${date}.md`);

// Check if today's content exists, otherwise try yesterday
let content;
if (fs.existsSync(contentFile)) {
    content = fs.readFileSync(contentFile, 'utf8');
} else {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const yesterdayFile = path.join(__dirname, 'output', `nightly-${yesterday}.md`);
    
    if (fs.existsSync(yesterdayFile)) {
        content = fs.readFileSync(yesterdayFile, 'utf8');
    } else {
        console.error('No content file found');
        process.exit(1);
    }
}

// Output the content file path for Jett to read and post
console.log(contentFile);
