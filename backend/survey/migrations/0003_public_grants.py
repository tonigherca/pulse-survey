"""Grant-enforced public/internal boundary (spec blocker #4).

A read-only role that can SELECT the floored public views ONLY. It is granted
nothing on the raw tables or the internal views, so a public surface connecting
as this role cannot reach row-level responses or unmoderated free text even if
misconfigured. Naming a view "public" is not enough — the grant is what enforces
the wall.

Postgres-only; no-op elsewhere. Role creation needs a privileged migration user;
if the deploy DB user cannot CREATE ROLE, run this block manually and fake the
migration (documented in DEPLOY.md).
"""
from django.db import migrations

PUBLIC_ROLE = "survey_public_ro"
PUBLIC_VIEWS = ["v_public_response_counts", "v_public_segmentation"]

GRANT_SQL = f"""
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{PUBLIC_ROLE}') THEN
        CREATE ROLE {PUBLIC_ROLE} NOLOGIN;
    END IF;
END
$$;

-- Allow the role to see the schema, then grant SELECT on public views ONLY.
GRANT USAGE ON SCHEMA {{schema}} TO {PUBLIC_ROLE};
{chr(10).join(f"GRANT SELECT ON {{schema}}.{v} TO {PUBLIC_ROLE};" for v in PUBLIC_VIEWS)}

-- Belt and braces: ensure no broad grants leaked to this role.
REVOKE ALL ON ALL TABLES IN SCHEMA {{schema}} FROM {PUBLIC_ROLE};
{chr(10).join(f"GRANT SELECT ON {{schema}}.{v} TO {PUBLIC_ROLE};" for v in PUBLIC_VIEWS)}
"""

REVOKE_SQL = f"""
{chr(10).join(f"REVOKE ALL ON {{schema}}.{v} FROM {PUBLIC_ROLE};" for v in PUBLIC_VIEWS)}
REVOKE USAGE ON SCHEMA {{schema}} FROM {PUBLIC_ROLE};
"""


def grant(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    from django.conf import settings
    schema = getattr(settings, "SURVEY_DB_SCHEMA", "survey")
    schema_editor.execute(GRANT_SQL.format(schema=schema))


def revoke(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    from django.conf import settings
    schema = getattr(settings, "SURVEY_DB_SCHEMA", "survey")
    schema_editor.execute(REVOKE_SQL.format(schema=schema))


class Migration(migrations.Migration):

    dependencies = [("survey", "0002_analysis_views")]

    operations = [migrations.RunPython(grant, revoke)]
