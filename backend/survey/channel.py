"""Server-side channel capture (backend spec §5, blocker #2).

The distribution channel is read from the ?src= query param on first landing,
validated against the enum, and stored in the SERVER session. At submission the
channel is read from the session, never from the request body — there is no
client field that can set it, and editing the submitted payload cannot change
the recorded channel.
"""
from __future__ import annotations

from . import catalogue

SESSION_KEY = "survey_channel"


def channel_from_session(request) -> str:
    """The channel to stamp on a response. Defaults to 'web' if unset."""
    default = catalogue.channel_config()["default"]
    return request.session.get(SESSION_KEY, default)


class ChannelCaptureMiddleware:
    """Capture ?src= into the session on the first request that carries it.

    Once set, the value persists for the session; later requests without the
    param keep the original attribution (the runner navigation drops the param).
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        raw = request.GET.get(catalogue.channel_config()["param"])
        if raw is not None and SESSION_KEY not in request.session:
            request.session[SESSION_KEY] = catalogue.normalize_channel(raw)
        return self.get_response(request)
