import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AppRole = "student" | "teacher";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: profile, error: profileErr }, { data: roles, error: rolesErr }] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);

    if (profileErr) throw new Error(profileErr.message);
    if (rolesErr) throw new Error(rolesErr.message);

    const role: AppRole | null =
      (roles?.[0]?.role as AppRole | undefined) ?? null;

    return { profile, role };
  });

const updateSchema = z.object({
  full_name: z.string().trim().max(120).optional().nullable(),
  student_id: z.string().trim().max(60).optional().nullable(),
  section: z.string().trim().max(60).optional().nullable(),
  semester: z.string().trim().max(60).optional().nullable(),
  department: z.string().trim().max(120).optional().nullable(),
  profile_picture_url: z.string().url().max(2048).optional().nullable(),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: updated, error } = await supabase
      .from("profiles")
      .update(data)
      .eq("id", userId)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { profile: updated };
  });
