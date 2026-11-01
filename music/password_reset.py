# spotify_clone/music/password_reset.py
import logging

from django.conf import settings
from django.contrib.auth import views as auth_views
from django.contrib.auth.forms import PasswordResetForm
from django.core.mail import EmailMultiAlternatives
from django.template import loader

logger = logging.getLogger(__name__)


class ResetEmailForm(PasswordResetForm):
    """Password reset form that reports sending problems and can use a fixed link address."""

    def send_mail(
        self,
        subject_template_name,
        email_template_name,
        context,
        from_email,
        to_email,
        html_email_template_name=None,
    ):
        # Django's own version swallows every sending error (it only writes it to the log),
        # so the page said "check your email" even when nothing could be sent.
        # Here the error is raised so SafePasswordResetView can tell the user.
        subject = "".join(
            loader.render_to_string(subject_template_name, context).splitlines()
        )
        body = loader.render_to_string(email_template_name, context)

        message = EmailMultiAlternatives(subject, body, from_email, [to_email])

        if html_email_template_name is not None:
            message.attach_alternative(
                loader.render_to_string(html_email_template_name, context),
                "text/html",
            )

        message.send()

    def save(self, *args, **kwargs):
        if settings.SITE_DOMAIN and not kwargs.get("domain_override"):
            kwargs["domain_override"] = settings.SITE_DOMAIN
        return super().save(*args, **kwargs)


class SafePasswordResetView(auth_views.PasswordResetView):
    """Send the reset link to the registered email, and never crash if sending fails."""

    form_class = ResetEmailForm

    def form_valid(self, form):
        try:
            return super().form_valid(form)
        except Exception:  # wrong app password, no internet, blocked port, ...
            logger.exception("Could not send the password reset email")
            form.add_error(
                None,
                "We couldn't send the email right now. Please try again in a few "
                "minutes. If this keeps happening, ask the site admin to check the "
                "email settings.",
            )
            return self.form_invalid(form)