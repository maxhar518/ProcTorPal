-- Grant execute permission on public.has_role to application roles
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role)
TO authenticated, anon;
