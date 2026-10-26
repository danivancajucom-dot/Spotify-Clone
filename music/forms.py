from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User

from .models import Album, Artist, Playlist, Track


class RegisterForm(UserCreationForm):
    email = forms.EmailField(required=True)

    class Meta:
        model = User
        fields = ("username", "email", "password1", "password2")

    def save(self, commit=True):
        user = super().save(commit=False)
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
            "image": forms.FileInput(attrs={"accept": "image/*"}),
        }


class AlbumForm(forms.ModelForm):
    class Meta:
        model = Album
        fields = ["title", "artist", "cover", "release_date"]
        widgets = {
            "release_date": forms.DateInput(attrs={"type": "date"}, format="%Y-%m-%d"),
            "cover": forms.FileInput(attrs={"accept": "image/*"}),
        }


class TrackForm(forms.ModelForm):
    class Meta:
        model = Track
        fields = ["title", "track_number", "duration_seconds", "audio_file"]
        widgets = {"audio_file": forms.FileInput(attrs={"accept": "audio/*"})}


class PlaylistForm(forms.ModelForm):
    class Meta:
        model = Playlist
        fields = ["name", "description"]
        widgets = {"description": forms.Textarea(attrs={"rows": 3})}