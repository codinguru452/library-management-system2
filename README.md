# Library Management System API

A REST API for managing a library catalogue, built with NestJS, TypeScript, PostgreSQL and Prisma. It includes Genre and Book CRUD, filtering/search/pagination, patron registration and login, JWT authentication, and librarian-only book management.

## Technology

- NestJS 11 and TypeScript
- PostgreSQL
- Prisma ORM 6
- class-validator and NestJS ValidationPipe
- Passport JWT and `@nestjs/jwt`
- bcrypt password hashing
- Postman collection for API testing

## Project structure

```text
library-management-system/
├── docs/
│   └── postman_collection.json
├── api/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── auth/
│   │   │   ├── dto/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── jwt.strategy.ts
│   │   │   ├── roles.decorator.ts
│   │   │   └── roles.guard.ts
│   │   ├── books/
│   │   │   ├── dto/
│   │   │   ├── books.controller.ts
│   │   │   ├── books.module.ts
│   │   │   └── books.service.ts
│   │   ├── genres/
│   │   │   ├── dto/
│   │   │   ├── genres.controller.ts
│   │   │   ├── genres.module.ts
│   │   │   └── genres.service.ts
│   │   ├── prisma/
│   │   │   ├── prisma.module.ts
│   │   │   └── prisma.service.ts
│   │   ├── users/
│   │   │   ├── users.controller.ts
│   │   │   └── users.module.ts
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── .env.example
│   └── package.json
└── README.md
```

## 1. Requirements

Install Node.js 20 or newer and npm. You also need a PostgreSQL database (Neon or Supabase are suitable hosted options).

Check your installation:

```bash
node -v
npm -v
```

## 2. Install and configure

Open a terminal in the `api` directory:

```bash
cd api
npm install
```

Copy the example environment file to `.env` (on PowerShell):

```powershell
Copy-Item .env.example .env
```

On macOS/Linux:

```bash
cp .env.example .env
```

Edit `api/.env` and set:

```env
DATABASE_URL="your-hosted-postgresql-connection-string"
JWT_SECRET="a-long-random-secret-at-least-32-characters"
LIBRARIAN_EMAIL="librarian@example.com"
LIBRARIAN_PASSWORD="a-strong-unique-password"
PORT=3000
```

Use the actual connection string from your PostgreSQL provider. Do not commit `.env` or share its contents. `.env.example` contains placeholders only.

## 3. Generate Prisma Client and migrate

From the `api` directory:

```bash
npx prisma validate
npx prisma generate
npx prisma migrate dev --name library_api
```

The migration command creates/updates the PostgreSQL tables and writes migration files under `api/prisma/migrations`. Commit those migration files to GitHub. Do not claim the migration ran until the command completes successfully against your hosted database.

## 4. Seed genres, books and librarian

With `LIBRARIAN_EMAIL` and `LIBRARIAN_PASSWORD` set in `.env`, run:

```bash
npm run prisma:seed
```

The seed script creates or updates four genres, inserts sixteen sample books without duplicating ISBNs, and creates/updates a librarian account using the environment credentials. The librarian password is hashed with bcrypt before it is stored.

You can inspect the records using:

```bash
npx prisma studio
```

## 5. Start the API

```bash
npm run start:dev
```

The API runs at `http://localhost:3000` unless `PORT` is changed.

## API endpoints

### Genres

| Method | Endpoint | Description |
|---|---|---|
| POST | `/genres` | Create a genre |
| GET | `/genres` | List genres |
| GET | `/genres/:id` | Get one genre and its books |
| PATCH | `/genres/:id` | Update a genre |
| DELETE | `/genres/:id` | Delete a genre (returns conflict if books still reference it) |

### Books

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/books` | Librarian | Create a book |
| GET | `/books` | Public | List, filter, search and paginate books |
| GET | `/books/:id` | Public | Get one book |
| PATCH | `/books/:id` | Librarian | Update a book |
| DELETE | `/books/:id` | Librarian | Delete a book |

`GET /books` accepts:

- `genreId` — filter by genre ID
- `search` — case-insensitive search in title and author
- `page` — page number, starting at 1 (default 1)
- `limit` — page size from 1 to 100 (default 10)

Example:

```http
GET /books?genreId=2&search=python&page=1&limit=10
```

The response includes `data` and pagination metadata (`total`, `page`, `limit`, `totalPages`).

### Authentication and profile

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register a patron account |
| POST | `/auth/login` | Verify credentials and issue a JWT |
| GET | `/users/profile` | (Stretch) Get the authenticated user's profile |

Registration always creates a `PATRON`. A user cannot make themselves a librarian by adding a `role` field to the request. The seeded librarian credentials are configured privately in `.env`.

For protected routes, send the access token in the request header:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

Book create, update and delete routes require a valid JWT and the `LIBRARIAN` role. A valid patron token receives `403 Forbidden` on these routes. Missing or invalid tokens receive `401 Unauthorized`.

## Validation and errors

A global `ValidationPipe` validates request DTOs. `whitelist: true` strips properties that are not declared in the DTO; `forbidNonWhitelisted: true` rejects such requests. Invalid values return `400 Bad Request`.

The services use NestJS HTTP exceptions for common errors, including `404 Not Found`, `409 Conflict`, and `400 Bad Request`.

## Postman testing

Import `docs/postman_collection.json` into Postman. Set the collection variable `baseUrl` to `http://localhost:3000` if needed.

Suggested test order:

1. Create a genre or use a seeded genre.
2. Register a patron and test login.
3. Log in using the seeded librarian email/password and copy the returned token (the Login request also saves it to the collection variable).
4. Use the librarian token to create, update and delete books.
5. Call `GET /books` with search/filter/pagination query parameters.
6. Test a patron token against `POST /books`; it should return `403`.
7. Test `/users/profile` with a valid token.

The collection includes requests for all Genre endpoints, all Book endpoints, registration, login and the optional profile endpoint.

## Security notes

- Passwords are stored as bcrypt hashes, never as plain text.
- JWTs are signed with `JWT_SECRET`; keep that secret private and use a strong random value.
- JWT payloads are signed, not encrypted. Do not put passwords or other secrets in them.
- Registration only assigns the `PATRON` role. Librarian creation is performed through the seed script and private environment variables.
- Never commit `api/.env`, database credentials, JWT secrets or real user passwords.

## Useful commands

| Command | Purpose |
|---|---|
| `npm run start:dev` | Run NestJS in watch mode |
| `npm run build` | Compile the application |
| `npx prisma validate` | Validate the Prisma schema |
| `npx prisma generate` | Generate Prisma Client |
| `npx prisma migrate dev --name library_api` | Apply a development migration and create migration files |
| `npm run prisma:seed` | Seed genres, books and optional librarian account |
| `npx prisma studio` | Inspect database records |
