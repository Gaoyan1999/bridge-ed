# BridgeEd

A React + Vite prototype for the school–home collaboration shell (Bridge workspace).

## Requirements

- **Node.js**: Use a current **LTS** release (for example 20.x or 22.x).
- **Package manager**: This repo uses **pnpm**.

## Installing pnpm

In a terminal, run:

```bash
pnpm --version
```

If the command is not found, install pnpm using one of these options:

1. **Corepack** (bundled with Node 16.13+, recommended)

   ```bash
   corepack enable
   corepack prepare pnpm@latest --activate
   ```

2. **npm global install**

   ```bash
   npm install -g pnpm
   ```

For other install methods, see the [pnpm installation docs](https://pnpm.io/installation).

## Running the app

From the repository root:

```bash
pnpm install
pnpm dev
```

Open the URL printed in the terminal (usually `http://localhost:5173`).

## Other scripts

| Command            | Description                        |
|--------------------|------------------------------------|
| `pnpm run build`   | Typecheck and production build     |
| `pnpm run preview` | Serve the production build locally   |
| `pnpm run lint`    | Run ESLint                         |
| `pnpm run format`  | Format with Prettier               |
