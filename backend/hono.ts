import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { handle } from "hono/vercel"; // 👈 adaptador do Hono para Vercel
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

const app = new Hono();

// Habilitar CORS
app.use("*", cors());

// Montar o tRPC router
app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/trpc",
    router: appRouter,
    createContext,
  })
);

// Também lida com rewrite em /api/trpc/*
app.use(
  "/api/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
  })
);

// Rota de teste
app.get("/", (c) => {
  return c.json({ status: "ok", message: "API is running" });
});

// 👇 Exports que o Vercel entende
export const GET = handle(app);
export const POST = handle(app);
export const OPTIONS = handle(app);
