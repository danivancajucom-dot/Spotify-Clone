# spotify_clone/music/middleware.py


class TurboFormErrorsMiddleware:
    """
    Send HTTP 422 when a submitted HTML form is shown again with errors.

    Turbo (the library that makes page changes feel instant) only draws the response
    to a form submission when it is a redirect (success) or a 4xx/5xx status (failure).
    Django answers an invalid form with 200 and the form page, which Turbo throws away
    ("Form responses must redirect to another location"). The result was no red fields,
    no error toast, and a loading screen that never closed.

    A 422 is displayed by Turbo and by normal browsers alike, so nothing else changes.
    """

    ERROR_MARKERS = (b"has-error", b"field-error", b"form-alert")

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if (
            request.method == "POST"
            and response.status_code == 200
            and not getattr(response, "streaming", False)
            and "text/html" in response.get("Content-Type", "")
            and any(marker in response.content for marker in self.ERROR_MARKERS)
        ):
            response.status_code = 422

        return response