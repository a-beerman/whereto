# Git Workflow & Contributing Guidelines

This document describes the Git workflow, branching strategy, and contribution process for the WhereTo project.

> **Reference**: This workflow supports implementation of [`docs/FINAL-SPEC.md`](FINAL-SPEC.md) and the execution plan in [`docs/Backlog-M1-M2-RU.md`](Backlog-M1-M2-RU.md). For the canonical implementation-ready specification, see FINAL-SPEC.md.

## Branching Strategy

We use **Git Flow** with the following branches:

- **`main`**: Production-ready code
- **`develop`**: Integration branch for features
- **`feature/*`**: Feature branches
- **`bugfix/*`**: Bug fix branches
- **`hotfix/*`**: Hotfix branches for production issues
- **`release/*`**: Release preparation branches

### Branch Naming

- **Features**: `feature/venue-search-filters`
- **Bugfixes**: `bugfix/fix-distance-calculation`
- **Hotfixes**: `hotfix/critical-api-error`
- **Releases**: `release/v1.0.0`

## Workflow

### Starting a New Feature

1. **Create feature branch from develop**:
```bash
git checkout develop
git pull origin develop
git checkout -b feature/venue-search-filters
```

2. **Work on feature**:
   - Make commits following commit message conventions
   - Keep commits focused and atomic
   - Push regularly to remote

3. **Create Pull Request**:
   - Target: `develop`
   - Fill out PR template
   - Request review

4. **After approval**:
   - Merge to `develop`
   - Delete feature branch

### Bug Fixes

1. **Create bugfix branch from develop**:
```bash
git checkout develop
git checkout -b bugfix/fix-distance-calculation
```

2. **Fix and test**
3. **Create PR to develop**

### Hotfixes

1. **Create hotfix branch from main**:
```bash
git checkout main
git checkout -b hotfix/critical-api-error
```

2. **Fix and test**
3. **Create PR to main**
4. **After merge, merge back to develop**:
```bash
git checkout develop
git merge main
```

## Commit Messages

Follow **Conventional Commits** specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, config, etc.)
- `perf`: Performance improvements
- `ci`: CI/CD changes

### Examples

```
feat(api): add venue search by category filter

Adds category filter to GET /api/v1/venues endpoint.
Supports filtering by single category or multiple categories.

Closes #123
```

```
fix(geo): correct distance calculation in radius search

Fixes incorrect distance calculation when using PostGIS
ST_DWithin function. Distance is now calculated correctly
in meters.

Fixes #456
```

```
docs: update API documentation for venue endpoints

Adds missing query parameters and response examples.
```

### Commit Message Rules

- **Subject line**: 50 characters or less, imperative mood
- **Body**: Explain what and why, wrap at 72 characters
- **Footer**: Reference issues (e.g., `Closes #123`)

## Pull Requests

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Closes #123

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests pass locally
```

### PR Review Process

1. **Create PR** with clear description
2. **Request review** from at least one team member
3. **Address feedback** and push updates
4. **Wait for approval** before merging
5. **Merge** using "Squash and merge" for feature branches

### PR Size

- **Keep PRs small**: Focused, single-purpose changes
- **Maximum ~400 lines**: Break large features into multiple PRs
- **One logical change per PR**: Don't mix unrelated changes

## Code Review Guidelines

### For Authors

- **Self-review first**: Review your own code before requesting review
- **Explain complex logic**: Add comments or PR description
- **Test thoroughly**: Ensure all tests pass
- **Be responsive**: Address feedback promptly

### For Reviewers

- **Be constructive**: Provide actionable feedback
- **Focus on code, not person**: Critique the code, not the author
- **Ask questions**: If something is unclear, ask
- **Approve when ready**: Don't block on minor issues

### Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests are adequate and pass
- [ ] No obvious bugs or security issues
- [ ] Documentation is updated
- [ ] Performance considerations addressed
- [ ] Error handling is appropriate

## Merging

### Merge Strategies

- **Feature branches**: Squash and merge
- **Hotfixes**: Merge commit
- **Release branches**: Merge commit

### Before Merging

1. Ensure all CI checks pass
2. Get required approvals
3. Resolve all conversations
4. Update documentation if needed
5. Ensure branch is up-to-date with target

## Release Process

1. **Create release branch from develop**:
```bash
git checkout develop
git checkout -b release/v1.0.0
```

2. **Update version numbers**:
   - `package.json`
   - CHANGELOG.md

3. **Test release branch**
4. **Merge to main**:
```bash
git checkout main
git merge release/v1.0.0
git tag v1.0.0
```

5. **Merge back to develop**:
```bash
git checkout develop
git merge main
```

## Git Hooks

### Pre-commit Hook

Runs automatically before commit:
- Linting
- Formatting check
- Type checking

### Pre-push Hook

Runs automatically before push:
- Full test suite
- Build verification

## Conflict Resolution

### When Conflicts Occur

1. **Fetch latest changes**:
```bash
git fetch origin
```

2. **Rebase or merge**:
```bash
# Option 1: Rebase (cleaner history)
git rebase origin/develop

# Option 2: Merge
git merge origin/develop
```

3. **Resolve conflicts** in files
4. **Continue**:
```bash
# For rebase
git rebase --continue

# For merge
git commit
```

## Best Practices

1. **Commit often**: Small, focused commits
2. **Pull before push**: Always pull latest changes
3. **Write clear messages**: Follow commit message conventions
4. **Keep branches up-to-date**: Regularly merge/rebase from develop
5. **Delete merged branches**: Clean up after merge
6. **Use .gitignore**: Don't commit generated files or secrets

## .gitignore

Ensure `.gitignore` includes:

```
# Dependencies
node_modules/
.pnp
.pnp.js

# Build outputs
dist/
build/
*.tsbuildinfo

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# Logs
logs/
*.log
npm-debug.log*

# OS
.DS_Store
Thumbs.db
```

## References

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)

