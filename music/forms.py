from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError

from .models import (
    Album,
    Artist,
    Playlist,
    Track,
    UserProfile,
)


class RegisterForm(UserCreationForm):
    first_name = forms.CharField(
        max_length=150,
        required=True,
        label="First name",
    )

    last_name = forms.CharField(
        max_length=150,
        required=True,
        label="Last name",
    )

    email = forms.EmailField(required=True)

    class Meta:
        model = User
        fields = (
            "first_name",
            "last_name",
            "username",
            "email",
            "password1",
            "password2",
        )

    def clean_email(self):
        email = self.cleaned_data["email"].strip().lower()

        if User.objects.filter(email__iexact=email).exists():
            raise ValidationError(
                "An account with this email address already exists."
            )

        return email

    def save(self, commit=True):
        user = super().save(commit=False)

        user.first_name = self.cleaned_data["first_name"].strip()
        user.last_name = self.cleaned_data["last_name"].strip()
        user.email = self.cleaned_data["email"]

        if commit:
            user.save()

        return user


class ArtistForm(forms.ModelForm):
    class Meta:
        model = Artist
        fields = ["name", "bio", "image"]

        widgets = {
            "bio": forms.Textarea(attrs={"rows": 5}),
            "image": forms.FileInput(
                attrs={"accept": "image/*"}
            ),
        }


class AlbumForm(forms.ModelForm):
    class Meta:
        model = Album
        fields = [
            "title",
            "artist",
            "cover",
            "release_date",
        ]

        widgets = {
            "release_date": forms.DateInput(
                attrs={"type": "date"},
                format="%Y-%m-%d",
            ),
            "cover": forms.FileInput(
                attrs={"accept": "image/*"}
            ),
        }


class TrackForm(forms.ModelForm):
    class Meta:
        model = Track
        fields = [
            "title",
            "track_number",
            "duration_seconds",
            "audio_file",
        ]

        widgets = {
            "audio_file": forms.FileInput(
                attrs={"accept": "audio/*"}
            )
        }


class PlaylistForm(forms.ModelForm):
    class Meta:
        model = Playlist
        fields = [
            "name",
            "description",
            "cover",
            "is_public",
        ]

        labels = {
            "is_public": "Make this playlist public",
        }

        help_texts = {
            "is_public": (
                "Public playlists can be discovered "
                "and played by other users."
            ),
        }

        widgets = {
            "description": forms.Textarea(attrs={"rows": 3}),
            "cover": forms.FileInput(
                attrs={"accept": "image/*"}
            ),
        }


class ProfileForm(forms.ModelForm):
    first_name = forms.CharField(
        max_length=150,
        required=False,
    )

    last_name = forms.CharField(
        max_length=150,
        required=False,
    )

    email = forms.EmailField(required=False)

    class Meta:
        model = UserProfile
        fields = [
            "first_name",
            "last_name",
            "email",
            "avatar",
            "bio",
        ]

        widgets = {
            "avatar": forms.FileInput(
                attrs={"accept": "image/*"}
            ),
            "bio": forms.Textarea(
                attrs={"rows": 3, "maxlength": 240}
            ),
        }

    def __init__(self, *args, user=None, **kwargs):
        self.user = user
        super().__init__(*args, **kwargs)

        if user:
            self.fields["first_name"].initial = user.first_name
            self.fields["last_name"].initial = user.last_name
            self.fields["email"].initial = user.email

    def clean_email(self):
        email = self.cleaned_data.get(
            "email", ""
        ).strip().lower()

        if (
            email
            and User.objects.filter(
                email__iexact=email
            ).exclude(pk=self.user.pk).exists()
        ):
            raise ValidationError(
                "This email address is already in use."
            )

        return email

    def save(self, commit=True):
        profile = super().save(commit=False)

        if self.user:
            self.user.first_name = self.cleaned_data.get(
                "first_name", ""
            )

            self.user.last_name = self.cleaned_data.get(
                "last_name", ""
            )

            self.user.email = self.cleaned_data.get(
                "email", ""
            )

            if commit:
                self.user.save(
                    update_fields=[
                        "first_name",
                        "last_name",
                        "email",
                    ]
                )

        if commit:
            profile.save()

        return profile