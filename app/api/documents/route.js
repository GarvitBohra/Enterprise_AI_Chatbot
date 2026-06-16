import { createSupabaseAdminClient } from "../../../lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return Response.json(
        { error: "Missing Supabase environment variables." },
        { status: 500 },
      );
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("documents")
      .select("id, filename, mime_type, created_at, storage_path")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ documents: data || [] });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to load documents." },
      { status: 500 },
    );
  }
}
