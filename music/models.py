from django.conf import settings
from django.db import models
from django.urls import reverse


class Artist(models.Model):
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_artists",
    )

    name = models.CharField(max_length=150)
    bio = models.TextField(blank=True)

    image = models.ImageField(
        upload_to="artists/",
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    def get_absolute_url(self):
        return reverse("artist_detail", args=[self.pk])


class Album(models.Model):
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_albums",
    )

    title = models.CharField(max_length=150)

    cover = models.ImageField(
        upload_to="covers/",
        blank=True,
        null=True,
    )

    release_date = models.DateField()

    artist = models.ForeignKey(
        Artist,
        on_delete=models.CASCADE,
        related_name="albums",
    )

    class Meta:
        ordering = ["-release_date"]

    def __str__(self):
        return f"{self.title} - {self.artist.name}"

    def get_absolute_url(self):
        return reverse("album_detail", args=[self.pk])


class Track(models.Model):
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_tracks",
    )

    album = models.ForeignKey(
        Album,
        on_delete=models.CASCADE,
        related_name="tracks",
    )

    title = models.CharField(max_length=150)

    track_number = models.PositiveIntegerField(default=1)

    duration_seconds = models.PositiveIntegerField(
        default=180,
        help_text="Length in seconds",
    )

    audio_file = models.FileField(
        upload_to="tracks/",
        blank=True,
        null=True,
    )

    class Meta:
        ordering = ["album", "track_number", "title"]

    def __str__(self):
        return self.title

    @property
    def duration_display(self):
        minutes, seconds = divmod(
            self.duration_seconds, 60
        )

        return f"{minutes}:{seconds:02d}"


class Playlist(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="playlists",
    )

    name = models.CharField(max_length=120)

    description = models.TextField(blank=True)

    cover = models.ImageField(
        upload_to="playlists/",
        blank=True,
        null=True,
    )

    is_public = models.BooleanField(
        default=True,
        help_text=(
            "Public playlists can be viewed "
            "and played by other users."
        ),
    )

    tracks = models.ManyToManyField(
        Track,
        blank=True,
        related_name="playlists",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name

    def get_absolute_url(self):
        return reverse("playlist_detail", args=[self.pk])


class LikedTrack(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="liked_tracks",
    )

    track = models.ForeignKey(
        Track,
        on_delete=models.CASCADE,
        related_name="likes",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "track")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} likes {self.track}"


class UserProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )

    avatar = models.ImageField(
        upload_to="avatars/",
        blank=True,
        null=True,
    )

    bio = models.TextField(
        max_length=240,
        blank=True,
    )

    def __str__(self):
        return f"{self.user}'s profile"


class ArtistFollow(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="artist_follows",
    )

    artist = models.ForeignKey(
        Artist,
        on_delete=models.CASCADE,
        related_name="followers",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "artist")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} follows {self.artist.name}"