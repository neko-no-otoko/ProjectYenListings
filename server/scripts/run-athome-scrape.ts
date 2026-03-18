#!/usr/bin/env tsx
/**
 * AtHome Scraper Run Script
 * 
 * Usage:
 *   tsx server/scripts/run-athome-scrape.ts [options]
 * 
 * Options:
 *   --prefecture, -p    Scrape specific prefecture code (e.g., 01 for Hokkaido)
 *   --all, -a           Scrape all prefectures
 *   --limit, -l         Limit number of prefectures to scrape (for testing)
 *   --help, -h          Show this help message
 * 
 * Examples:
 *   # Scrape Hokkaido only (proof of concept)
 *   tsx server/scripts/run-athome-scrape.ts --prefecture 01
 * 
 *   # Scrape all prefectures
 *   tsx server/scripts/run-athome-scrape.ts --all
 * 
 *   # Scrape first 3 prefectures (for testing)
 *   tsx server/scripts/run-athome-scrape.ts --all --limit 3
 * 
 * Environment:
 *   DATABASE_URL        PostgreSQL connection string (required)
 */

import { runAtHomeScrapeJob, PREFECTURES, type AtHomeScraperStats } from "../lib/scrapers/athome-scraper";

interface CliOptions {
  prefecture?: string;
  all: boolean;
  limit?: number;
  help: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    all: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case "--prefecture":
      case "-p":
        options.prefecture = args[++i];
        break;
      case "--all":
      case "-a":
        options.all = true;
        break;
      case "--limit":
      case "-l":
        options.limit = parseInt(args[++i], 10);
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        if (arg.startsWith("-")) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
AtHome Scraper Run Script

Usage:
  tsx server/scripts/run-athome-scrape.ts [options]

Options:
  --prefecture, -p    Scrape specific prefecture code (e.g., 01 for Hokkaido)
  --all, -a           Scrape all prefectures
  --limit, -l         Limit number of prefectures to scrape (for testing)
  --help, -h          Show this help message

Examples:
  # Scrape Hokkaido only (proof of concept)
  tsx server/scripts/run-athome-scrape.ts --prefecture 01

  # Scrape all prefectures
  tsx server/scripts/run-athome-scrape.ts --all

  # Scrape first 3 prefectures (for testing)
  tsx server/scripts/run-athome-scrape.ts --all --limit 3

Environment:
  DATABASE_URL        PostgreSQL connection string (required)
`);
}

function printStats(stats: AtHomeScraperStats): void {
  console.log("\n" + "=".repeat(50));
  console.log("SCRAPING STATISTICS");
  console.log("=".repeat(50));
  console.log(`Prefectures scanned: ${stats.prefecturesScanned}`);
  console.log(`Properties found:    ${stats.propertiesFound}`);
  console.log(`Properties inserted: ${stats.propertiesUpserted}`);
  console.log(`Properties updated:  ${stats.propertiesUpdated}`);
  
  if (stats.errors.length > 0) {
    console.log(`\nErrors (${stats.errors.length}):`);
    stats.errors.forEach((error, i) => {
      console.log(`  ${i + 1}. ${error}`);
    });
  }
  console.log("=".repeat(50));
}

async function main(): Promise<void> {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  // Validate options
  if (!options.prefecture && !options.all) {
    console.error("Error: Must specify either --prefecture or --all");
    console.error("Run with --help for usage information");
    process.exit(1);
  }

  // Validate prefecture code if specified
  if (options.prefecture) {
    const prefecture = PREFECTURES.find(p => p.code === options.prefecture);
    if (!prefecture) {
      console.error(`Error: Invalid prefecture code: ${options.prefecture}`);
      console.error("Valid codes: 01-47");
      process.exit(1);
    }
    console.log(`Scraping prefecture: ${prefecture.code} - ${prefecture.nameEn} (${prefecture.name})`);
  }

  // Check DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error("Error: DATABASE_URL environment variable is required");
    console.error("Example: DATABASE_URL=postgresql://user:pass@localhost/dbname tsx server/scripts/run-athome-scrape.ts ...");
    process.exit(1);
  }

  try {
    console.log("Starting AtHome scraper...");
    console.log(`Rate limit: 1 request per second`);
    console.log("");

    const result = await runAtHomeScrapeJob({
      specificPrefectures: options.prefecture ? [options.prefecture] : undefined,
      maxPrefectures: options.limit,
    });

    printStats(result.stats);

    if (result.success) {
      console.log("\n✓ Scrape completed successfully!");
      process.exit(0);
    } else {
      console.error("\n✗ Scrape completed with errors");
      if (result.error) {
        console.error(`  Error: ${result.error}`);
      }
      process.exit(1);
    }
  } catch (error) {
    console.error("Fatal error:", (error as Error).message);
    process.exit(1);
  }
}

main();
