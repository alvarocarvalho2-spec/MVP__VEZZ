import { createClient } from "https://esm.sh/@supabase/supabase-js@2.118.0";
import { createHandler } from "./handler.ts";

Deno.serve(createHandler(() => createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)));
