# Hostinger MySQL Deployment

## 1. Create the Hostinger MySQL database

Create a new MySQL database from the Hostinger control panel and note the database name.

## 2. Create a database user

Create a dedicated database user with a strong password and grant it access only to the application database.

## 3. Get the database host

Copy the Hostinger MySQL host, port, username, password, and database name.

## 4. Configure `DATABASE_URL`

Use this format:

```env
DATABASE_URL="mysql://USERNAME:PASSWORD@HOST:3306/DATABASE_NAME"
```

## 5. Deploy the Next.js backend

Deploy the app to a Node.js-capable environment that can run `next build` and `next start`.

## 6. Configure the Node.js application

- Node.js 20+
- install dependencies with `npm install`
- build with `npm run build`
- start with `npm start`

## 7. Configure environment variables

Set:

- `DATABASE_URL`
- `JWT_SECRET`
- `NODE_ENV=production`
- `FRONTEND_URL`
- `SCHOOL_NAME`
- `SCHOOL_ADDRESS`

Recommended:

- Frontend: `https://yourdomain.com`
- Backend: `https://api.yourdomain.com`

## 8. Run Prisma generate

```bash
npx prisma generate
```

## 9. Run production migrations

```bash
npx prisma migrate deploy
```

## 10. Configure API domain

Point your backend domain or subdomain to the deployed Node.js app.

## 11. Configure CORS

Set `FRONTEND_URL` to the exact frontend origin. Do not use `*` for authenticated production APIs.

## 12. Enable HTTPS

Use HTTPS for the frontend and backend so secure cookies work correctly in production.

## 13. Test database connectivity

Confirm the app can connect with:

```bash
npx prisma validate
```

## 14. Test the APIs

- Log in with a known account
- Create a student
- Create a fee structure
- Create a mapping
- Record a payment
- Download a receipt PDF
- Check dashboard totals
