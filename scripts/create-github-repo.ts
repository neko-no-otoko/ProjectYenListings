import { getUncachableGitHubClient } from '../server/lib/github';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const REPO_NAME = 'ProjectYenListings';

async function createGitHubRepo() {
  console.log('🔗 Connecting to GitHub...');
  const octokit = await getUncachableGitHubClient();
  
  const { data: user } = await octokit.users.getAuthenticated();
  console.log(`✅ Authenticated as: ${user.login}`);
  
  let repoExists = false;
  try {
    await octokit.repos.get({
      owner: user.login,
      repo: REPO_NAME
    });
    repoExists = true;
    console.log(`📁 Repository ${REPO_NAME} already exists`);
  } catch (e: any) {
    if (e.status !== 404) throw e;
  }
  
  if (!repoExists) {
    console.log(`📦 Creating repository: ${REPO_NAME}...`);
    await octokit.repos.createForAuthenticatedUser({
      name: REPO_NAME,
      description: 'YenLow - Japan Akiya Real Estate Aggregator for discovering affordable abandoned homes',
      private: false,
      auto_init: false
    });
    console.log(`✅ Repository created: https://github.com/${user.login}/${REPO_NAME}`);
  }
  
  console.log('📋 Preparing to push code...');
  
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, `node_modules/
dist/
.env
*.log
.DS_Store
`);
  }
  
  try {
    execSync('git status', { stdio: 'pipe' });
  } catch {
    console.log('📂 Initializing git repository...');
    execSync('git init', { stdio: 'inherit' });
  }
  
  const { data: installation } = await octokit.apps.listInstallationsForAuthenticatedUser();
  
  const accessToken = await getAccessToken();
  const remoteUrl = `https://x-access-token:${accessToken}@github.com/${user.login}/${REPO_NAME}.git`;
  
  try {
    execSync(`git remote remove origin`, { stdio: 'pipe' });
  } catch {}
  
  execSync(`git remote add origin ${remoteUrl}`, { stdio: 'inherit' });
  
  console.log('📤 Adding files...');
  execSync('git add -A', { stdio: 'inherit' });
  
  try {
    execSync('git commit -m "Initial commit: YenLow Japan Akiya Real Estate Aggregator"', { stdio: 'inherit' });
  } catch {
    console.log('ℹ️  No new changes to commit');
  }
  
  console.log('🚀 Pushing to GitHub...');
  execSync('git push -u origin main --force', { stdio: 'inherit' });
  
  console.log(`\n✅ Success! Your code is now at: https://github.com/${user.login}/${REPO_NAME}`);
}

async function getAccessToken() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  const response = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  );
  
  const data = await response.json();
  const connectionSettings = data.items?.[0];
  return connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;
}

createGitHubRepo().catch(console.error);
