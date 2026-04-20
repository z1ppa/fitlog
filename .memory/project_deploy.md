---
name: deployment setup
description: Как задеплоен проект — Supabase + Vercel
type: project
originSessionId: 3ec6c6de-5a9e-46d6-b395-fbaa3bb5a92a
---
Проект задеплоен на Vercel + Supabase.

**URLs:**
- Прод: https://fitlog-sandy.vercel.app
- GitHub: https://github.com/z1ppa/fitlog (основное репо)

**База данных:** Supabase PostgreSQL
- Project ID: zsxtzexeeaqbgwhkxqnf
- Region: eu-central-1
- Подключение через pgBouncer (порт 6543) для рантайма, прямое (порт 5432) для миграций

**Vercel env vars:**
- DATABASE_URL — pooler с pgbouncer=true (порт 6543)
- DIRECT_URL — прямое подключение (порт 5432), для prisma migrate
- NEXTAUTH_SECRET — fitlog-super-secret-2026-xkq9z
- NEXTAUTH_URL — https://fitlog-sandy.vercel.app

**Важно:** в package.json `build` скрипт запускает `prisma generate && next build` — без этого Vercel не находит сгенерированный клиент.

**Админ:** kulik.inc@gmail.com (role=ADMIN в Supabase)

**Why:** Деплой на Vercel + Supabase — стандартный стек для Next.js в продакшене.
**How to apply:** При новых миграциях — запускать `prisma migrate deploy` локально (с DIRECT_URL), пушить код в main, Vercel задеплоит автоматически.
