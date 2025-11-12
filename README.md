# DfE Sign-in Services

**DfE Sign-in Services** enables users to manage their services, organisations and permissions within DfE Sign-in. Users can view and update the services they have access to, search for and request access to organisations, and see key organisation details such as status, identifiers and approvers. Approvers can also manage users within their organisations, update their permissions, control service access, handle organisation membership, and review and action access requests. This service is part of the wider **login.dfe** project.

## Getting Started

### Install Dependencies

```
npm install
```

Additionally, this app requires Redis as a backing service. The easiest way is to create an instance of Redis using Docker:

```
docker run -d -p 6379:6379 redis
```

### Run application

Start the application with:

```
npm run dev
```

Once the application has started, you can view it in the browser by going to:

```
https://localhost:41012
```

### Run Tests

Run all tests with:

```
npm run test
```

### Code Quality and Formatting

Run ESLint:

```
npm run lint
```

Automatically fix lint issues:

```
npm run lint:fix
```

### Development Checks

Run linting and tests together:

```
npm run dev:checks
```

### Pre-commit Hooks

Pre-commit hooks are handled automatically via Husky. No additional setup is required.
