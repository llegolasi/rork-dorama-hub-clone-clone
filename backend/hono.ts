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
  "/api/trpc/*", // O cliente vai chamar este caminho
  trpcServer({
    router: appRouter,
    createContext,
    endpoint: "/api/trpc", // O endpoint interno precisa corresponder
  })
);

// 4. Adicionar um handler para debug
app.all("/api/*", (c) => {
  console.log(`Unhandled API route: ${c.req.method} ${c.req.path}`);
  return c.json({ error: "Route not found", path: c.req.path, method: c.req.method }, 404);
});

export default app;