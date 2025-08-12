# 📁 GitHub Repository Setup Guide

This guide will help you create a separate GitHub repository for the EMtek Tool Template.

## 🚀 Quick Setup (Recommended)

### Option 1: Create via GitHub Web Interface

1. **Go to GitHub** and create a new repository:
   - Repository name: `emtek-tool-template`
   - Description: `Next.js boilerplate template for EMtek Hub integrated tools`
   - Visibility: Public (recommended for template usage)
   - ✅ Add README file: **Uncheck** (we already have one)
   - ✅ Add .gitignore: **Uncheck** (we already have one)
   - ✅ Choose a license: MIT License

2. **After creating the repository**, copy the git remote URL

3. **In your terminal** (from the emtek-tool-template directory):
   ```bash
   # Add your GitHub repository as origin
   git remote add origin https://github.com/YOUR-USERNAME/emtek-tool-template.git
   
   # Push to GitHub
   git branch -M main
   git push -u origin main
   ```

### Option 2: GitHub CLI (if you have gh CLI installed)

```bash
# From the emtek-tool-template directory
gh repo create emtek-tool-template --public --description "Next.js boilerplate template for EMtek Hub integrated tools"
git remote add origin https://github.com/YOUR-USERNAME/emtek-tool-template.git
git branch -M main
git push -u origin main
```

## 🎯 Make it a Template Repository

After pushing to GitHub:

1. **Go to your repository** on GitHub
2. **Click Settings** tab
3. **Scroll down** to the "Repository template" section
4. **Check** "Template repository"
5. **Save changes**

This allows others to easily create new repositories from your template using the "Use this template" button.

## 📝 Repository Configuration

### Repository Settings
- **Repository name**: `emtek-tool-template`
- **Description**: `Next.js boilerplate template for EMtek Hub integrated tools`
- **Topics/Tags**: Add these for discoverability:
  - `nextjs`
  - `react`
  - `template`
  - `sso`
  - `authentication`
  - `emtek-hub`
  - `boilerplate`

### About Section
Fill in the repository's About section:
- **Description**: `Next.js boilerplate template for EMtek Hub integrated tools`
- **Website**: Link to your deployed demo (optional)
- **Topics**: Add the tags mentioned above

## 🔧 Advanced Setup

### Branch Protection (Optional)
For a template repository, you might want to protect the main branch:

1. Go to **Settings** → **Branches**
2. **Add rule** for `main` branch
3. Enable:
   - ✅ Require pull request reviews before merging
   - ✅ Dismiss stale PR approvals when new commits are pushed
   - ✅ Require status checks to pass before merging

### Issues and Discussions
Enable these for community support:
1. **Settings** → **General**
2. **Features** section:
   - ✅ Issues
   - ✅ Discussions (optional)

## 📊 Template Usage Analytics

To track how your template is being used:

1. **Insights** tab → **Traffic**
2. Monitor clones, downloads, and referrers
3. Check which files are viewed most often

## 🎉 Post-Setup Steps

After your repository is live:

### 1. Update Links
- Update any `<your-repo-url>` placeholders in documentation
- Verify all relative links work correctly

### 2. Test Template Creation
- Use the "Use this template" button yourself
- Verify the template creates a working copy
- Test the complete development setup

### 3. Create Release
Create your first release:
```bash
git tag v1.0.0
git push origin v1.0.0
```

Then create a GitHub release with:
- **Tag**: v1.0.0
- **Title**: Initial EMtek Tool Template Release
- **Description**: Include key features and setup instructions

### 4. Share with Team
- Share the repository URL with your development team
- Add team members as collaborators if needed
- Document the template in your internal documentation

## 🔗 Final Repository Structure

Your GitHub repository will include:

```
emtek-tool-template/
├── README.md              ← Main documentation
├── DEPLOYMENT.md          ← Netlify deployment guide
├── DEPLOY-CHECKLIST.md    ← Quick deployment reference
├── GITHUB-SETUP.md        ← This file
├── .gitignore             ← Git ignore rules
├── .env.example           ← Environment variables template
├── netlify.toml           ← Netlify configuration
├── package.json           ← Project dependencies
├── next.config.js         ← Next.js configuration
├── tailwind.config.js     ← Tailwind CSS configuration
├── postcss.config.js      ← PostCSS configuration
├── components/            ← React components
├── lib/                   ← Utility libraries
├── pages/                 ← Next.js pages
└── styles/                ← CSS styles
```

## 🆘 Troubleshooting

### Common Issues:

**Permission denied when pushing:**
```bash
# Make sure you're authenticated with GitHub
gh auth login
# Or set up SSH keys: https://docs.github.com/en/authentication/connecting-to-github-with-ssh
```

**Repository already exists:**
```bash
# If you need to change the remote URL
git remote set-url origin https://github.com/YOUR-USERNAME/new-repo-name.git
```

**Large file warnings:**
```bash
# Remove large files from git history if needed
git rm --cached large-file.zip
git commit -m "Remove large file"
```

## 🎯 Success!

Once complete, developers can use your template by:
1. Going to your GitHub repository
2. Clicking "Use this template"
3. Creating their own repository copy
4. Following the README.md setup instructions

Your EMtek Tool Template is now ready for the community! 🚀
