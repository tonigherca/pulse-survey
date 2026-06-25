"""Survey routes, mounted under /studiu/ (slug assumption — spec §11)."""
from django.urls import path

from . import views

app_name = "survey"

urlpatterns = [
    # Page views
    path("",           views.landing, name="landing"),
    path("run/",       views.runner,  name="runner"),
    # JSON API consumed by the runner JS
    path("api/catalogue", views.get_catalogue, name="catalogue"),
    path("api/start",     views.start,         name="start"),
    path("api/answer",    views.save_answer,    name="answer"),
    path("api/submit",    views.submit,         name="submit"),
    # World-2 opt-in (spec §7: POST /studiu/email)
    path("email",         views.email_optin,    name="email"),
    # Live response counter (spec §12: GET /studiu/count)
    path("count",         views.count,          name="count"),
]
