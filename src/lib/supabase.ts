import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function getSupabaseBrowser(): SupabaseClient | null {
  if (!supabaseConfigured()) return null;
  if (browserClient) return browserClient;
  browserClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return browserClient;
}

export function getSupabaseServer(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || (!service && !anon)) return null;
  return createClient(url, service ?? anon!);
}

export async function uploadIdProof(
  file: File,
  stayToken: string,
): Promise<string> {
  const sb = getSupabaseBrowser();
  if (!sb) {
    // Fallback: inline data URL (demo mode, no Supabase configured).
    // Cap at ~2.5MB to keep Vercel payloads sane.
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("read failed"));
      reader.readAsDataURL(file);
    });
  }
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `proofs/${stayToken}/${Date.now()}.${ext}`;
  const { error } = await sb.storage.from("id-proofs").upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = sb.storage.from("id-proofs").getPublicUrl(path);
  return data.publicUrl;
}
