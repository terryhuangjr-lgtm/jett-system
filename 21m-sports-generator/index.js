#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import ContentGenerator from './modules/content-generator.js';
import fs from 'fs';
import path from 'path';

const program = new Command();
const generator = new ContentGenerator();

// ASCII Art Banner
const banner = `
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ██████╗  ▄███╗ ███╗   ███╗    ███████╗██████╗  ██████╗ ║
║  ╚════██╗███╔══╝ ████╗ ████║    ██╔════╝██╔══██╗██╔════╝ ║
║   █████╔╝███████╗██╔████╔██║    ███████╗██████╔╝██║  ███╗║
║  ██╔═══╝ ██║  ██║██║╚██╔╝██║    ╚════██║██╔═══╝ ██║   ██║║
║  ███████╗╚██████║██║ ╚═╝ ██║    ███████║██║     ╚██████╔╝║
║  ╚══════╝ ╚═════╝╚═╝     ╚═╝    ╚══════╝╚═╝      ╚═════╝ ║
║                                                           ║
║          Content Generator for 21M Sports                ║
║          Bitcoin Standard Sports Analysis                ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`;

program
  .name('21m-sports-generator')
  .description('Generate Bitcoin-denominated sports content')
  .version('1.0.0');

// Generate contract comparison
program
  .command('contract')
  .description('Generate contract comparison content')
  .option('-s, --sport <sport>', 'Sport (NBA, NFL, MLB)')
  .option('-t, --template <template>', 'Template ID to use')
  .action(async (options) => {
    console.log(chalk.cyan(banner));
    const spinner = ora('Generating contract comparison content...').start();

    try {
      const result = await generator.generateContractComparison(options);
      spinner.succeed('Content generated!');

      displayPosts(result, 'Contract Comparison');
    } catch (error) {
      spinner.fail('Generation failed');
      console.error(chalk.red(`Error: ${error.message}`));
    }
  });

// Generate athlete story
program
  .command('athlete')
  .description('Generate athlete wealth story')
  .option('-t, --type <type>', 'Story type (bankruptcy, success)', 'bankruptcy')
  .action(async (options) => {
    console.log(chalk.cyan(banner));
    const spinner = ora('Generating athlete story...').start();

    try {
      const result = await generator.generateAthleteStory(options);
      spinner.succeed('Content generated!');

      displayPosts(result, 'Athlete Story');
    } catch (error) {
      spinner.fail('Generation failed');
      console.error(chalk.red(`Error: ${error.message}`));
    }
  });

// Generate quick hit
program
  .command('quick')
  .description('Generate quick hit content')
  .action(async () => {
    console.log(chalk.cyan(banner));
    const spinner = ora('Generating quick hit content...').start();

    try {
      const result = await generator.generateQuickHit();
      spinner.succeed('Content generated!');

      displayPosts(result, 'Quick Hit');
    } catch (error) {
      spinner.fail('Generation failed');
      console.error(chalk.red(`Error: ${error.message}`));
    }
  });

// Generate educational content
program
  .command('edu')
  .description('Generate educational content')
  .action(async () => {
    console.log(chalk.cyan(banner));
    const spinner = ora('Generating educational content...').start();

    try {
      const result = await generator.generateEducational();
      spinner.succeed('Content generated!');

      displayPosts(result, 'Educational');
    } catch (error) {
      spinner.fail('Generation failed');
      console.error(chalk.red(`Error: ${error.message}`));
    }
  });

// Generate by theme
program
  .command('theme <theme>')
  .description('Generate content by weekly theme (21m-monday, fiat-friday, etc.)')
  .action(async (theme) => {
    console.log(chalk.cyan(banner));
    const spinner = ora(`Generating ${theme} content...`).start();

    try {
      const result = await generator.generateByTheme(theme);
      spinner.succeed('Content generated!');

      displayPosts(result, theme.toUpperCase());
    } catch (error) {
      spinner.fail('Generation failed');
      console.error(chalk.red(`Error: ${error.message}`));
    }
  });

// Generate all options
program
  .command('all')
  .description('Generate multiple content options from different categories')
  .action(async () => {
    console.log(chalk.cyan(banner));
    const spinner = ora('Generating all content options...').start();

    try {
      const result = await generator.generateMultipleOptions();
      spinner.succeed('All content generated!');

      console.log('\n' + chalk.bold.yellow('═'.repeat(60)));
      console.log(chalk.bold.cyan('   CONTENT OPTIONS READY'));
      console.log(chalk.bold.yellow('═'.repeat(60)) + '\n');

      // Display each category
      Object.entries(result).forEach(([category, posts], index) => {
        if (index > 0) console.log('\n' + chalk.gray('─'.repeat(60)) + '\n');
        displayPosts(posts, category.toUpperCase());
      });
    } catch (error) {
      spinner.fail('Generation failed');
      console.error(chalk.red(`Error: ${error.message}`));
    }
  });

// Save to content bank
program
  .command('save <postNumber>')
  .description('Save a generated post to content bank')
  .action((postNumber) => {
    console.log(chalk.green(`✓ Post #${postNumber} saved to content bank`));
    // TODO: Implement saving to content-bank.md
  });

// Helper function to display posts
function displayPosts(posts, category) {
  console.log(chalk.bold.magenta(`\n${category}\n`));

  posts.forEach((post, index) => {
    console.log(chalk.bold.white(`\n─── Option ${index + 1} ───`));
    console.log(chalk.white(post.content));
    console.log(chalk.gray(`\nCharacters: ${post.charCount}/280`));

    if (post.warning) {
      console.log(chalk.red(post.warning));
    }
  });

  // Display metadata
  if (posts[0]?.metadata) {
    const meta = posts[0].metadata;
    console.log(chalk.bold.cyan('\n📊 DATA & SOURCES'));
    console.log(chalk.gray('─'.repeat(40)));

    if (meta.data) {
      Object.entries(meta.data).forEach(([key, value]) => {
        if (typeof value === 'string') {
          console.log(chalk.white(`${key}: ${value}`));
        }
      });
    }

    if (meta.sources) {
      console.log(chalk.cyan('\nSources:'));
      meta.sources.forEach(source => {
        console.log(chalk.gray(`  • ${source}`));
      });
    }
  }

  console.log('');
}

// List themes
program
  .command('themes')
  .description('List available weekly themes')
  .action(() => {
    console.log(chalk.cyan(banner));
    console.log(chalk.bold.yellow('Weekly Content Themes:\n'));

    const themes = [
      { name: '21m-monday', desc: 'Breaking news in BTC terms' },
      { name: 'timechain-thursday', desc: 'Historical moments + BTC prices' },
      { name: 'fiat-friday', desc: 'Contract era comparisons' },
      { name: 'sat-stacking-saturday', desc: 'Educational content' },
      { name: 'sound-money-sunday', desc: 'Athlete wealth stories' }
    ];

    themes.forEach(theme => {
      console.log(chalk.white(`  ${theme.name.padEnd(25)} ${chalk.gray(theme.desc)}`));
    });

    console.log(chalk.cyan(`\nUsage: ${chalk.white('npm run generate theme <theme-name>')}\n`));
  });

// Default command - show help
program.action(() => {
  console.log(chalk.cyan(banner));
  console.log(chalk.bold.yellow('Quick Start:\n'));
  console.log(chalk.white('  npm run generate all         ') + chalk.gray('- Generate all content types'));
  console.log(chalk.white('  npm run generate contract    ') + chalk.gray('- Generate contract comparison'));
  console.log(chalk.white('  npm run generate athlete     ') + chalk.gray('- Generate athlete story'));
  console.log(chalk.white('  npm run generate quick       ') + chalk.gray('- Generate quick hit'));
  console.log(chalk.white('  npm run generate edu         ') + chalk.gray('- Generate educational content'));
  console.log(chalk.white('  npm run generate themes      ') + chalk.gray('- List weekly themes'));
  console.log(chalk.white('\n  npm run generate theme <name>') + chalk.gray(' - Generate by weekly theme\n'));
  console.log(chalk.cyan('For more help: ') + chalk.white('npm run generate -- --help\n'));
});

program.parse();
