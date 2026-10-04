# Frontend dashboard architecture

This dashboard is being reorganized around a feature-first structure so it is easier to maintain and extend.

## Structure

```text
apps/dashboard/
├── index.html                 # Document HTML minimal
├── src/
│   ├── bootstrap.js            # Charge les fragments avant les features
│   ├── templates/
│   │   ├── auth.html
│   │   ├── app-shell.html
│   │   └── views/               # Une vue HTML par fonctionnalité
│   ├── config.js
│   ├── state/
│   │   └── store.js
│   ├── services/
│   │   ├── api.js
│   │   └── storage.js
│   ├── utils/
│   │   ├── format.js
│   │   └── ui.js
│   ├── features/
│   │   ├── auth/
│   │   │   └── auth.js
│   │   ├── dashboard/
│   │   │   └── dashboard.js
│   │   ├── whatsapp/
│   │   │   └── whatsapp.js
│   │   ├── routing/
│   │   │   └── routing.js
│   │   └── settings/
│   │       └── settings.js
│   └── styles/                  # CSS modulaire chargé via main.css
│       ├── main.css
│       ├── base.css
│       ├── layout.css
│       └── components.css
└── README.md
```

## Principles

- Feature-first organization instead of one giant file.
- Keep UI, API logic and business state separate.
- Use small modules with one responsibility.
- Create reusable utilities for numbers, dates and formatting.
- Prepare the app for future evolution (multi-page or component-driven rebuild).

## UX goals

- clearer navigation,
- lighter dashboard,
- faster scanning of leads,
- visible actions for critical tasks,
- more consistent spacing and states,
- better mobile support.

## Chargement

`index.html` fournit uniquement le document et le point d’entrée. `src/bootstrap.js` charge l’authentification, la coquille commune et les vues depuis `src/templates/`, puis importe `src/app.js`. Les vues sont injectées avant l’initialisation des fonctionnalités afin que leurs sélecteurs DOM restent disponibles.

Les styles sont organisés sous `src/styles/` et chargés dans l’ordre par `main.css`. Ajoute une nouvelle vue dans `src/templates/views/`, sa logique dans `src/features/`, son style dans `src/styles/`, puis raccorde son module et son chargeur dans `src/app.js` et `src/bootstrap.js`.
