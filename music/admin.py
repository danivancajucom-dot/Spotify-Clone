from django.contrib import admin
from django.utils.html import format_html

from .models import Album, Artist, LikedTrack, Playlist, Track

# ---------- branding ----------
admin.site.site_header = "Spotify Clone admin"
admin.site.site_title = "Spotify Clone admin"
admin.site.index_title = "Manage your music library"


def _thumb(file_field, size=44, round_=False):
    """Small image preview used in list pages and detail pages."""
    if not file_field:
        return "—"
    radius = "50%" if round_ else "8px"
    return format_html(
        '<img src="{}" style="width:{}px;height:{}px;object-fit:cover;border-radius:{}">',
        file_field.url, size, size, radius,
    )


# ---------- inlines ----------
class TrackInline(admin.TabularInline):
    model = Track
    extra = 1
    fields = ("track_number", "title", "duration_seconds", "audio_file")
    ordering = ("track_number",)


class AlbumInline(admin.StackedInline):
    model = Album
    extra = 0
    fields = ("title", "cover", "release_date")
    show_change_link = True


# ---------- model admins ----------
@admin.register(Artist)
class ArtistAdmin(admin.ModelAdmin):
    list_display = ("photo", "name", "album_count", "created_at")
    list_display_links = ("photo", "name")
    search_fields = ("name", "bio")
    readonly_fields = ("photo_large", "created_at")
    fields = ("name", "bio", "image", "photo_large", "created_at")
    inlines = [AlbumInline]

    @admin.display(description="Photo")
    def photo(self, obj):
        return _thumb(obj.image, 44, round_=True)

    @admin.display(description="Current photo")
    def photo_large(self, obj):
        return _thumb(obj.image, 140, round_=True)

    @admin.display(description="Albums")
    def album_count(self, obj):
        return obj.albums.count()


@admin.register(Album)
class AlbumAdmin(admin.ModelAdmin):
    list_display = ("art", "title", "artist", "release_date", "track_count")
    list_display_links = ("art", "title")
    list_filter = ("artist", "release_date")
    search_fields = ("title", "artist__name")
    date_hierarchy = "release_date"
    autocomplete_fields = ("artist",)
    readonly_fields = ("art_large",)
    fields = ("title", "artist", "release_date", "cover", "art_large")
    list_select_related = ("artist",)
    inlines = [TrackInline]

    @admin.display(description="Cover")
    def art(self, obj):
        return _thumb(obj.cover)

    @admin.display(description="Current cover")
    def art_large(self, obj):
        return _thumb(obj.cover, 160)

    @admin.display(description="Tracks")
    def track_count(self, obj):
        return obj.tracks.count()


@admin.register(Track)
class TrackAdmin(admin.ModelAdmin):
    list_display = ("title", "album", "artist_name", "track_number", "duration_display", "has_audio")
    list_filter = ("album__artist",)
    search_fields = ("title", "album__title", "album__artist__name")
    autocomplete_fields = ("album",)
    list_select_related = ("album__artist",)

    @admin.display(description="Artist", ordering="album__artist__name")
    def artist_name(self, obj):
        return obj.album.artist.name

    @admin.display(description="Audio", boolean=True)
    def has_audio(self, obj):
        return bool(obj.audio_file)


@admin.register(Playlist)
class PlaylistAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "track_count", "created_at")
    list_filter = ("owner", "created_at")
    search_fields = ("name", "description", "owner__username")
    filter_horizontal = ("tracks",)
    list_select_related = ("owner",)

    @admin.display(description="Tracks")
    def track_count(self, obj):
        return obj.tracks.count()


@admin.register(LikedTrack)
class LikedTrackAdmin(admin.ModelAdmin):
    list_display = ("user", "track", "created_at")
    list_filter = ("user", "created_at")
    search_fields = ("user__username", "track__title")
    list_select_related = ("user", "track")
