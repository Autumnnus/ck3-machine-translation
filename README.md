# Simplest Way to Translate CK3 Localization

This repository provides a straightforward way to translate CK3 (Crusader Kings 3) localization files using an automated process.

## Prerequisites


Before you begin, make sure you have the following:

- [Node.js](https://nodejs.org/) (version 14 or higher)
- [NPM](https://www.npmjs.com/) (Node Package Manager)

## Setup Instructions

1. Clone the repository
2. Install dependencies
3. Put the API key in the .env file
4. Put localization folder into loc folder
5. Configure target language in src/index.ts (default is Turkish)
6. Run `npm run start`

## Notes
- Marked rows will not be translated such as `# Translated!`
- You can also check non required other tools like merge-translated-yml and yml-translate-pointer. These are optional tools for my development.