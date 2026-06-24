"""Analysis layer: internal Metabase views + floored public views.

Metabase reads named views, never raw tables (spec §9). The EAV is pivoted here;
the pivot pattern is: filter survey_answers by question_id, extract the scalar
with `value #>> '{}'`, join survey_responses for path/channel/wave, and restrict
to status='completed'.

Postgres-only (uses jsonb operators + date()). On SQLite (local logic tests)
this migration is a no-op so the model tests still run.
"""
from django.db import migrations

# --- internal views (access-controlled; full row/aggregate detail) ----------

INTERNAL_VIEWS = {
    # Operational monitor for the Aug-31 window.
    "v_response_counts": """
        CREATE VIEW v_response_counts AS
        SELECT path, channel, wave, date(completed_at) AS day, count(*) AS n
        FROM survey_responses
        WHERE status = 'completed'
        GROUP BY path, channel, wave, date(completed_at);
    """,
    # The segmentation spine: user/non-user from self-report + channel rollup.
    "v_segmentation": """
        CREATE VIEW v_segmentation AS
        SELECT
            r.response_id,
            r.path,
            r.channel,
            r.wave,
            CASE
                WHEN r.path = 'parent' THEN (
                    SELECT CASE WHEN (a.value #>> '{}') IN ('uses_regularly', 'uses_rarely')
                                THEN 'user' ELSE 'non_user' END
                    FROM survey_answers a
                    WHERE a.response_id = r.response_id AND a.question_id = 'D4'
                    LIMIT 1)
                WHEN r.path IN ('director', 'teacher', 'secretariat') THEN (
                    CASE WHEN EXISTS (
                        SELECT 1 FROM survey_answers a
                        WHERE a.response_id = r.response_id
                          AND a.question_id = CASE r.path
                              WHEN 'director' THEN 'AD0'
                              WHEN 'teacher' THEN 'BD0'
                              WHEN 'secretariat' THEN 'CD0' END
                          AND (a.value #>> '{}') <> 'none')
                    THEN 'user' ELSE 'non_user' END)
                ELSE NULL
            END AS segment,
            CASE
                WHEN r.channel IN ('email_client', 'inapp') THEN 'customer'
                WHEN r.channel IN ('gads', 'fb') THEN 'cold'
                ELSE 'organic'
            END AS channel_rollup
        FROM survey_responses r
        WHERE r.status = 'completed';
    """,
    # End-of-day burden by role, distributions side by side.
    "v_burden_by_role": """
        CREATE VIEW v_burden_by_role AS
        SELECT r.path, a.question_id, (a.value #>> '{}') AS choice, count(*) AS n
        FROM survey_answers a
        JOIN survey_responses r ON r.response_id = a.response_id
        WHERE r.status = 'completed' AND a.question_id IN ('A_hook', 'B1', 'C1')
        GROUP BY r.path, a.question_id, (a.value #>> '{}');
    """,
    # Adoption depth proxy by role.
    "v_adoption_depth": """
        CREATE VIEW v_adoption_depth AS
        SELECT r.path, a.question_id, (a.value #>> '{}') AS level, count(*) AS n
        FROM survey_answers a
        JOIN survey_responses r ON r.response_id = a.response_id
        WHERE r.status = 'completed' AND a.question_id IN ('A4', 'B3', 'C4')
        GROUP BY r.path, a.question_id, (a.value #>> '{}');
    """,
    # THE headline cross-tab: admin-tool adoption vs pedagogy depth (teachers).
    "v_admin_vs_pedagogy": """
        CREATE VIEW v_admin_vs_pedagogy AS
        SELECT
            CASE WHEN EXISTS (
                SELECT 1 FROM survey_answers a
                WHERE a.response_id = r.response_id AND a.question_id = 'BD0'
                  AND (a.value #>> '{}') <> 'none')
            THEN 'admin_user' ELSE 'admin_none' END AS admin_adoption,
            (SELECT (a.value #>> '{}') FROM survey_answers a
             WHERE a.response_id = r.response_id AND a.question_id = 'B_ped2'
             LIMIT 1) AS pedagogy_depth,
            count(*) AS n
        FROM survey_responses r
        WHERE r.status = 'completed' AND r.path = 'teacher'
        GROUP BY 1, 2;
    """,
    # Double-entry ("digitalizare pe hartie") × tool presence × locality.
    "v_pe_hartie": """
        CREATE VIEW v_pe_hartie AS
        SELECT
            (SELECT (a.value #>> '{}') FROM survey_answers a
             WHERE a.response_id = r.response_id AND a.question_id = 'C3' LIMIT 1) AS double_entry,
            CASE WHEN EXISTS (
                SELECT 1 FROM survey_answers a
                WHERE a.response_id = r.response_id AND a.question_id = 'CD0'
                  AND (a.value #>> '{}') <> 'none')
            THEN 'has_tools' ELSE 'no_tools' END AS tools,
            (SELECT (a.value #>> '{}') FROM survey_answers a
             WHERE a.response_id = r.response_id AND a.question_id = 'CF3' LIMIT 1) AS locality,
            count(*) AS n
        FROM survey_responses r
        WHERE r.status = 'completed' AND r.path = 'secretariat'
        GROUP BY 1, 2, 3;
    """,
    # Audit-readiness perception gap: director A5(inspectii) vs secretariat C8.
    "v_audit_readiness_gap": """
        CREATE VIEW v_audit_readiness_gap AS
        SELECT 'director_A5_inspectii' AS metric, (a.value #>> '{}') AS level, count(*) AS n
        FROM survey_answers a
        JOIN survey_responses r ON r.response_id = a.response_id
        WHERE r.status = 'completed' AND a.question_id = 'A5.inspectii'
        GROUP BY (a.value #>> '{}')
        UNION ALL
        SELECT 'secretariat_C8', (a.value #>> '{}'), count(*)
        FROM survey_answers a
        JOIN survey_responses r ON r.response_id = a.response_id
        WHERE r.status = 'completed' AND a.question_id = 'C8'
        GROUP BY (a.value #>> '{}');
    """,
    # Parent pedagogy demand vs teacher pedagogy reality.
    "v_pedagogy_demand": """
        CREATE VIEW v_pedagogy_demand AS
        SELECT 'parent_D5c_demand' AS metric, (a.value #>> '{}') AS level, count(*) AS n
        FROM survey_answers a
        JOIN survey_responses r ON r.response_id = a.response_id
        WHERE r.status = 'completed' AND a.question_id = 'D5c'
        GROUP BY (a.value #>> '{}')
        UNION ALL
        SELECT 'teacher_B_ped2_reality', (a.value #>> '{}'), count(*)
        FROM survey_answers a
        JOIN survey_responses r ON r.response_id = a.response_id
        WHERE r.status = 'completed' AND a.question_id = 'B_ped2'
        GROUP BY (a.value #>> '{}');
    """,
    # Director vs inspector diagnosis disagreement.
    "v_director_vs_inspector": """
        CREATE VIEW v_director_vs_inspector AS
        SELECT 'director_A6' AS metric, (a.value #>> '{}') AS cause, count(*) AS n
        FROM survey_answers a
        JOIN survey_responses r ON r.response_id = a.response_id
        WHERE r.status = 'completed' AND a.question_id = 'A6'
        GROUP BY (a.value #>> '{}')
        UNION ALL
        SELECT 'inspector_E2', (a.value #>> '{}'), count(*)
        FROM survey_answers a
        JOIN survey_responses r ON r.response_id = a.response_id
        WHERE r.status = 'completed' AND a.question_id = 'E2'
        GROUP BY (a.value #>> '{}');
    """,
    # Free text, moderation-flagged. INTERNAL ONLY — never granted to public.
    "v_freetext": """
        CREATE VIEW v_freetext AS
        SELECT
            r.path,
            a.question_id,
            (a.value #>> '{}') AS text,
            r.wave,
            COALESCE(m.status, 'pending') AS moderation_status
        FROM survey_answers a
        JOIN survey_responses r ON r.response_id = a.response_id
        LEFT JOIN survey_freetext_moderation m ON m.answer_id = a.id
        WHERE r.status = 'completed'
          AND a.question_id IN ('A11', 'B8', 'C10', 'D9', 'E7');
    """,
}

# --- public views (aggregate-only, n<10 suppressed, no free text) -----------

PUBLIC_FLOOR = 10
PUBLIC_VIEWS = {
    "v_public_response_counts": f"""
        CREATE VIEW v_public_response_counts AS
        SELECT path, wave, count(*) AS n
        FROM survey_responses
        WHERE status = 'completed'
        GROUP BY path, wave
        HAVING count(*) >= {PUBLIC_FLOOR};
    """,
    "v_public_segmentation": f"""
        CREATE VIEW v_public_segmentation AS
        SELECT path, segment, channel_rollup, count(*) AS n
        FROM v_segmentation
        GROUP BY path, segment, channel_rollup
        HAVING count(*) >= {PUBLIC_FLOOR};
    """,
}

ALL_VIEWS = {**INTERNAL_VIEWS, **PUBLIC_VIEWS}


def create_views(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    for sql in INTERNAL_VIEWS.values():
        schema_editor.execute(sql)
    for sql in PUBLIC_VIEWS.values():  # depend on v_segmentation, create after
        schema_editor.execute(sql)


def drop_views(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    for name in list(PUBLIC_VIEWS) + list(INTERNAL_VIEWS):
        schema_editor.execute(f"DROP VIEW IF EXISTS {name};")


class Migration(migrations.Migration):

    dependencies = [("survey", "0001_initial")]

    operations = [migrations.RunPython(create_views, drop_views)]
