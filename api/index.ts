import app, { ensureDb } from "../server.js";

let dbReady = false;
export default async (req: any, res: any) => {
  if (!dbReady) { await ensureDb(); dbReady = true; }
  return app(req, res);
};
