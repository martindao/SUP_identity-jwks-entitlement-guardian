# Portfolio Integration Requirements

This document tracks requirements for integrating this project with the main PortfolioProject.

## Standard Flow Structure

Every project MUST follow this 3-tier structure:

```
PortfolioProject/index.html (project card)
    ↓
projects/{project-name}/index.html (landing page)
    ↓
projects/{project-name}/demo/index.html (actual demo app)
```

## Landing Page Requirements

Every landing page (`projects/{project-name}/index.html`) MUST include:

### 1. CTA Buttons (Required)
- **"Open App Demo"** button → links to `./demo/index.html`
- **"View on GitHub"** button → links to the GitHub repository
- **"Back to Portfolio"** button → links to `../../index.html`

### 2. Standard Button Structure
```html
<div class="flex flex-col sm:flex-row gap-4">
  <a href="./demo/index.html" class="cursor-follow-cta">
    <span class="flex items-center gap-2">
      <i class="fas fa-play"></i>
      Open App Demo
    </span>
  </a>
  <a href="https://github.com/martindao/{repo-name}" target="_blank" rel="noopener noreferrer" class="apple-button">
    <i class="fab fa-github mr-2"></i>
    View on GitHub
  </a>
  <a href="../../index.html" class="apple-button">
    <i class="fas fa-arrow-left mr-2"></i>
    Back to Portfolio
  </a>
</div>
```

## Project Card Requirements

Every project card in `PortfolioProject/index.html` MUST include:

### 1. Card Structure
- Project card with `data-category` attribute
- Card image at `assets/projects/generated/{project-name}-card.svg`
- Matching route in `titleToFileMap`

### 2. Route Mapping
Add to `titleToFileMap` object:
```javascript
'{Project Title}': 'projects/{project-name}/index.html',
```

## Files Checklist

- [ ] `PortfolioProject/index.html` - Project card added
- [ ] `PortfolioProject/index.html` - Route mapping in `titleToFileMap`
- [ ] `PortfolioProject/assets/projects/generated/{project-name}-card.svg` - Card image
- [ ] `PortfolioProject/projects/{project-name}/index.html` - Landing page
- [ ] `PortfolioProject/projects/{project-name}/demo/index.html` - Demo app

## Current Project: Identity Guardian

### GitHub Repository
- **URL**: https://github.com/martindao/SUP_identity-jwks-entitlement-guardian

### Completed Items
- [x] Project card in PortfolioProject/index.html
- [x] Route mapping in titleToFileMap
- [x] Card SVG image
- [x] Landing page (needs GitHub button)
- [x] Demo app

### Pending Items
- [ ] Add GitHub button to landing page
- [ ] Create actual GitHub repository
- [ ] Push code to GitHub
