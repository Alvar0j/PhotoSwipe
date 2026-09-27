# PhotoSwipe

Repasa tus fotos deslizando: **izquierda** para borrar, **derecha** para conservar.

## Versión web

Disponible en **https://alvar0j.github.io/PhotoSwipe/** (se instala en el móvil desde Safari → Compartir → *Añadir a pantalla de inicio*, o Chrome → ⋮ → *Instalar aplicación*).

Como una web no puede acceder a la galería ni borrar fotos de ella, en la web:

1. Eliges las fotos que quieras repasar desde la galería.
2. Las deslizas (con botón para **deshacer** y para **revisar** las marcadas en cualquier momento).
3. Al final ves las fotos marcadas para borrar con su **nombre y fecha de captura** (leída del EXIF) y puedes rescatar alguna o copiar la lista. Después las eliminas en la app Fotos.

Las fotos no se suben a ningún sitio: todo ocurre en el navegador.

La web se publica automáticamente con GitHub Actions (`.github/workflows/pages.yml`) en cada push a `main`.

## App nativa (iOS)

La app de iPhone (Capacitor + plugin `local-plugins/photo-library`) sí borra directamente de la galería:

```bash
npm run build && npx cap sync ios && npx cap open ios
```

## Desarrollo

```bash
npm install
npm run dev
```

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
