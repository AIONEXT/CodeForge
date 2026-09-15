# Contributing to CodeForge

Thank you for your interest in contributing to CodeForge! This guide will help you get started.

## Development Setup

### Prerequisites

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0
- **VS Code** (for extension development)
- **Git**

### Getting Started

```bash
# Clone the repository
git clone https://github.com/codeforge-dev/codeforge.git
cd codeforge

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run type-checking
pnpm typecheck

# Run linting
pnpm lint

# Run tests
pnpm test
```

### Monorepo Structure

CodeForge is a pnpm monorepo with the following packages:

| Package | Path | Description |
|---------|------|-------------|
| `@codeforge/core` | `packages/core` | Recording engine, storage, analysis, explanations |
| `@codeforge/vscode` | `packages/vscode` | VS Code extension |
| `@codeforge/dashboard` | `packages/dashboard` | Web dashboard components |
| JetBrains Plugin | `packages/jetbrains` | JetBrains IDE plugin (Kotlin) |

### Working on @codeforge/core

```bash
# Build core
pnpm build:core

# Watch mode
pnpm dev:core

# Run core tests
pnpm --filter @codeforge/core test
```

### Working on @codeforge/vscode

```bash
# Build the extension
pnpm build:vscode

# Open VS Code with the extension loaded
code packages/vscode
# Then press F5 to launch the Extension Development Host
```

### Working on the JetBrains Plugin

```bash
cd packages/jetbrains
./gradlew build
./gradlew runIde  # Launches IDE with plugin loaded
```

## Code Style

### TypeScript

- **Strict mode** enabled across all packages
- Use `type` imports: `import type { Foo } from "./bar.js"`
- Use `.js` extensions in imports (ESM modules)
- No unused variables or parameters (enforced by `noUnusedLocals` and `noUnusedParameters`)
- No implicit returns (enforced by `noImplicitReturns`)
- Follow existing patterns in the codebase

### Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `terminal-listener.ts`)
- **Types/Interfaces**: `PascalCase` (e.g., `TerminalCommandRecord`)
- **Functions**: `camelCase` (e.g., `recordCommand`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `CODEFORGE_DIR`)
- **Classes**: `PascalCase` (e.g., `CodeForgeRecorder`)

### Comments

- Use `//` for inline comments
- Use `/** */` for JSDoc on exported functions and types
- Explain *why*, not *what*
- No commented-out code

## Development Workflow

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```

2. **Make your changes** following the code style guidelines

3. **Build and verify**:
   ```bash
   pnpm build
   pnpm typecheck
   pnpm lint
   pnpm test
   ```

4. **Commit** with a descriptive message:
   ```bash
   git commit -m "feat: add error category for TypeScript errors"
   ```

5. **Push** and open a Pull Request

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation changes
- `style:` code style changes (no logic change)
- `refactor:` code refactoring
- `test:` adding or updating tests
- `chore:` build process, CI, dependencies

Examples:
```
feat: add recipe replay command
fix: handle terminal close during active command
docs: update API reference for recorder class
refactor: extract error patterns into separate module
test: add unit tests for command categorization
```

## Pull Request Process

1. **Fill out the PR template** completely
2. **Ensure all checks pass** (CI will run build, typecheck, lint, and tests)
3. **Request review** from a maintainer
4. **Address feedback** promptly
5. **Squash and merge** once approved

### PR Title

Use the same convention as commits:
```
feat: add JetBrains plugin support
fix: prevent duplicate milestone detection
```

### What We Look For

- Code follows existing patterns and style
- Types are properly defined and used
- No regressions in existing functionality
- Tests added for new features
- Documentation updated if needed
- No secrets or sensitive data committed

## Issue Reporting

### Bug Reports

Include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- OS and IDE version
- CodeForge version

### Feature Requests

Include:
- Use case description
- Proposed solution (if any)
- Alternatives considered

### Good First Issues

Look for issues labeled `good first issue` -- these are scoped, well-defined tasks perfect for new contributors.

## Testing

```bash
# Run all tests
pnpm test

# Run tests for a specific package
pnpm --filter @codeforge/core test

# Run tests in watch mode
pnpm --filter @codeforge/core test:watch
```

### Writing Tests

- Place test files next to source files: `src/foo.ts` -> `src/foo.test.ts`
- Use `vitest` as the test framework
- Follow the existing test patterns in `packages/core/src/`
- Test both success and error paths
- Use descriptive test names

## Questions?

Open a [discussion](https://github.com/codeforge-dev/codeforge/discussions) or reach out on Discord.
