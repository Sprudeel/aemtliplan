# Aemtliplan

Der Ämtliplan befindet sich derzeit noch im Aufbau und wird wahrscheinlich Ende Jahr fertig sein.

# Prisma Commands Cheat Sheet

This project uses **Prisma** with SQLite (`dev.db`) as the database.  
Here are the most important commands for development.

---

## 🔄 Database Reload (without seeding)

Push the current schema to the database:

```shell
npx prisma db push
```

This will:

- Create the database file if it does not exist.
- Apply your current `schema.prisma` (but not migration history).

---

## 🌱 Database Reload (with seeding)

Push schema **and** run the seed script:

```shell
npx prisma db push && npx prisma db seed
```

---

## 🧹 Reset Database (with migrations)

If you are using migrations:

```shell
npx prisma migrate reset
```

This will:

- Drop the database.
- Recreate it from your migrations.
- Run the seed script automatically (if configured).

---

## 👀 Explore Database

Open Prisma Studio to inspect and edit records:

```shell
npx prisma studio
```

---

## 📝 Generate Prisma Client

After schema changes:

```shell
npx prisma generate
```
