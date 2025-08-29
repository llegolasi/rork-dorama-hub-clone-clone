import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

const app = new Hono();

// 1. O CORS continua aqui, para todas as rotas
app.use("*", cors());

// 2. A rota de status vem antes do tRPC
app.get("/", (c) => {
  return c.json({ status: "ok", message: "API is running" });
});

// 3. O middleware do tRPC com o caminho CORRETO
app.use(
  "/trpc/*", // O cliente vai chamar /api/trpc/* mas o Vercel reescreve para /trpc/*
  trpcServer({
    router: appRouter,
    createContext,
    endpoint: "/trpc", // O endpoint interno precisa corresponder
  })
);

// 4. Fallback para outras rotas da API
app.all("*", (c) => {
  return c.json({ error: "Route not found" }, 404);
});

export default app;