# Node Boiler Plate

## Prerequisites

Before you begin, make sure you have the following installed:

- Node.js v20 or later
- npm (included with Node.js)
- Docker (optional)

## Check List
- [x] Typescript
- [x] Expressjs
- [x] [Helmet](https://github.com/helmetjs/helmet) nodejs package for security HTTP response headers
- [x] Swagger Spec
- [x] Parallel random-order testing using Chaijs, mocha, sinonjs
- [x] Code coverage
- [x] Eslint, Prettier
- [x] Commit and push hooks
- [x] Sequelize database setup with SSL in production
- [x] Dockerfile
- [x] Azure CI pipeline
- [x] Health check route
- [x] Return git commit id in HTTP response header
- [x] logs with transaction id
- [x] kubernetes deployment config files
- [x] Validation of request body using [Zod](https://zod.dev/)
- [x] Updated README file for the project
- [x] Logs with transaction id
- [x] CORS support for local development
- [x] VsCode debugger configuration
- [x] Integrate [Azure application insights](https://learn.microsoft.com/en-us/azure/azure-monitor/app/nodejs)
- [ ] [Gitops ready for AKS](https://learn.microsoft.com/en-us/azure/azure-arc/kubernetes/tutorial-use-gitops-flux2?tabs=azure-cli)
- [x] Load Test (K6) 

## Assign for intern
- Testing
  - what is Testing
- dockerfile
  - what is Dockerfile


# Node.js Boilerplate

This Node.js boilerplate provides a starting point for building backend applications with Express, TypeScript, and other popular tools and libraries.
## Folder Structure

node-boilerplate/  
├── src/  
│   ├── controllers/  
│   ├── database/  
│   │   ├── config/  
│   │   ├── migrations/  
│   │   ├── models/  
│   │   └── seeders/  
│   ├── middlewares/  
│   ├── routes/  
│   ├── services/  
│   ├── utils/  
│   └── index.ts  
├── tests/  
│   ├── controllers/  
│   ├── middlewares/  
│   ├── models/  
│   ├── routes/  
│   ├── services/  
│   └── utils/  
├── .env.example  
├── .eslintignore  
├── .eslintrc.json  
├── .gitignore  
├── .nvmrc  
├── .prettierignore  
├── .prettierrc.json  
├── Dockerfile  
├── azure-pipelines.yml  
├── package-lock.json  
├── package.json  
└── tsconfig.json  

# Set up Branch Policies (Need to be done before starting the project)
1. Create  branches, `qa`, `uat`, `production`
2. On Azure Devops go to `Repos` -> `Branches` -> Click on three dot next after the favorite star icon of branch `qa` -> `Branch policies`
3. Turn on the `Limit merge types` -> Turn off every merge types except `Rebase and fast-forward`
4. Redo step 2 and 3 to branches `uat` and `production`

## to do before using NodeJS Boilerplate
- Replace all `app-name` in all deployment file in kube folder to your application name

## Getting Started

1. Clone the repository
2. Run `npm install`
3. Create a `.env` file using the `.env.example` file as a reference
4. Run `npm start` to start the application

## Example URL

You can access the example route at `http://localhost:3000/example` and the health-check route at `http://localhost:3000/health`.

## Commands

- `npm start`: Start the application in development mode with hot-reloading
- `npm run build`: Build the application for production
- `npm run serve`: Start the application in production mode
- `npm run lint`: Lint the code using ESLint
- `npm run lint:fix`: Fix lint issues using ESLint
- `npm run test`: Run tests using Mocha

## Contributing

Before pushing your code or making a pull request, make sure to run `npm run lint:fix` and `npm run test` to ensure the code adheres to the project's standards and passes all tests.

## SSL Connection for Production Database

Make sure to configure your Sequelize connection settings in `src/database/config` to use SSL for connecting to the production database.

## Husky

This project uses Husky to run `lint:fix` before every commit and `npm run test` before every code-push. Make sure to set it up as per the Husky documentation.




## Getting Started

1. Clone this repository:
  -

2. Change to the project directory:
  -

3. Install dependencies:
  - npm install

4. Start the development server:
  - npm run dev

## Building and Running in Production

1. Build the project:
  - npm run build

2. Start the production server:
  ```
  npm start
  ```

## Running Tests

To run tests, use the following command:
`- npm test

# Update Sequelize configuration in src/database/config/config.js

## Create a migration
npm run migrate:up

## Edit the created migration file in src/database/migrations

## Apply the migration
npm run generate

## Undo the migration
npm run migrate:undo

## Create a seed file
npx prisma db seed (https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding)

## Edit the created seed file in src/database/seeders

## Run the seeds
npx sequelize-cli db:seed:all

## Undo the seeds
npx sequelize-cli db:seed:undo

## Load Test
docker compose up k6 (only have get method for test)


## Using Docker (optional)

1. Build the Docker image:
  - docker build -t node-boilerplate .

2. Run the Docker container:
  - docker run -p 3000:3000 node-boilerplate

## Customizing the Boilerplate

This boilerplate includes example files for controllers, middlewares, models, routes, and services. You can use these files as templates for your own application components. Replace or update the example files as needed to fit your project requirements.

## Shortcut keys for debugging in VS Code.
 - Continue (F5)  
 - Step Over (F10)  
 - Step Into (F11)  
 - Step Out (Shift+F11)  
 - Restart (Ctrl+Shift+F5)  
 - Stop (Shift + F5)  

## Security Header
    x-content-type-options	    nosniff
    x-frame-options	            SAMEORIGIN
    x-xss-protection	          1; mode=block
    strict-transport-security	  max-age=31536000; includeSubDomains; preload
    referrer-policy	            no-referrer-when-downgrade
    content-security-policy	    upgrade-insecure-requests; block-all-mixed-content
    permissions-policy	        accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=()

## Note
- secret-dev should not kept in code repository. in this repo just set format for everyone.

## License

[MIT](LICENSE)
