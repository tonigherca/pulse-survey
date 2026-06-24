"""Internal admin: response monitoring, free-text moderation, CRM opt-in review.

This is an internal, access-controlled surface (World 1 + World 2 are visible
here to staff). It is never the public surface — public reads go through the
floored views and the read-only role only.
"""
from __future__ import annotations

from django.contrib import admin
from django.utils import timezone

from .models import FreetextModeration, SurveyAnswer, SurveyEmail, SurveyResponse


@admin.register(SurveyResponse)
class SurveyResponseAdmin(admin.ModelAdmin):
    list_display = ("response_id", "path", "channel", "status", "wave",
                    "started_at", "completed_at")
    list_filter = ("path", "channel", "status", "wave")
    readonly_fields = [f.name for f in SurveyResponse._meta.fields]

    def has_add_permission(self, request):
        return False


@admin.register(SurveyAnswer)
class SurveyAnswerAdmin(admin.ModelAdmin):
    list_display = ("id", "response", "question_id", "value")
    list_filter = ("question_id",)
    search_fields = ("question_id",)
    readonly_fields = [f.name for f in SurveyAnswer._meta.fields]

    def has_add_permission(self, request):
        return False


@admin.register(SurveyEmail)
class SurveyEmailAdmin(admin.ModelAdmin):
    """World 2. Note: nothing here links to a response, by design."""
    list_display = ("email", "wave", "crm_synced", "opted_in_at")
    list_filter = ("crm_synced", "wave")
    search_fields = ("email",)


@admin.register(FreetextModeration)
class FreetextModerationAdmin(admin.ModelAdmin):
    list_display = ("answer", "question_id", "snippet", "status", "reviewed_at", "reviewer")
    list_filter = ("status",)
    actions = ("approve", "reject")

    @admin.display(description="question")
    def question_id(self, obj):
        return obj.answer.question_id

    @admin.display(description="text")
    def snippet(self, obj):
        text = obj.answer.value
        return (text[:80] + "…") if isinstance(text, str) and len(text) > 80 else text

    def _review(self, request, queryset, status):
        queryset.update(status=status, reviewed_at=timezone.now(),
                        reviewer=request.user.get_username())

    @admin.action(description="Approve for surfacing")
    def approve(self, request, queryset):
        self._review(request, queryset, FreetextModeration.Status.APPROVED)

    @admin.action(description="Reject (keep internal)")
    def reject(self, request, queryset):
        self._review(request, queryset, FreetextModeration.Status.REJECTED)
