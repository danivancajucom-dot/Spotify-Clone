from django.contrib import messages
from django.contrib.auth import login, get_user_model
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth.forms import AuthenticationForm
from django.core.exceptions import PermissionDenied
from django.core.paginator import Paginator
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.http import require_POST

from .forms import (
    AdminPlaylistForm,
    AdminTrackForm,
    AdminUserForm,
    AlbumForm,
    ArtistForm,
    PlaylistForm,
    ProfileForm,
    RegisterForm,
    TrackForm,
)
from .models import (
    Album,
    Artist,
    ArtistFollow,
    LikedTrack,
    Playlist,
    Track,
    UserProfile,
)


def liked_ids(user):
    return set(
        LikedTrack.objects.filter(user=user).values_list(
            "track_id",
            flat=True,
        )
    )


def get_own_playlist(request, pk):
    playlist = get_object_or_404(Playlist, pk=pk)

    if (
        playlist.owner_id != request.user.id
        and not request.user.is_staff
    ):
        raise PermissionDenied(
            "This playlist belongs to someone else."
        )

    return playlist


def get_viewable_playlist(request, pk):
    playlist = get_object_or_404(
        Playlist.objects.select_related("owner"),
        pk=pk,
    )

    if (
        not playlist.is_public
        and playlist.owner_id != request.user.id
        and not request.user.is_staff
    ):
        raise PermissionDenied("This playlist is private.")

    return playlist


def require_owner(request, obj, label):
    if not request.user.is_staff:
        if getattr(obj, "created_by_id", None) != request.user.id:
            raise PermissionDenied(
                f"Only the uploader can edit or delete this {label}."
            )

    return obj


def safe_next(request, default="artist_list"):
    nxt = request.POST.get("next") or request.GET.get("next")

    if nxt and url_has_allowed_host_and_scheme(
        nxt,
        allowed_hosts={request.get_host()},
    ):
        return nxt

    return default


def confirm_delete(
    request,
    obj,
    label,
    cancel_url,
    success_url,
):
    if request.method == "POST":
        obj.delete()
        messages.success(request, f"{label} deleted.")
        return redirect(success_url)

    return render(
        request,
        "pages/confirm_delete.html",
        {
            "object": obj,
            "label": label,
            "cancel_url": cancel_url,
        },
    )


SAMPLE_TILES = [
    "Late night",
    "Road trip",
    "Focus",
    "Sunday slow",
    "Workout",
    "Throwback",
]


def home(request):
    if request.user.is_authenticated:
        return redirect("dashboard")

    albums = Album.objects.select_related("artist").order_by(
        "-cover",
        "-release_date",
    )[:6]

    tiles = [
        {
            "title": album.title,
            "sub": album.artist.name,
            "cover": album.cover.url if album.cover else "",
        }
        for album in albums
    ]

    while len(tiles) < 6:
        tiles.append(
            {
                "title": SAMPLE_TILES[len(tiles)],
                "sub": "Your playlist",
                "cover": "",
            }
        )

    return render(
        request,
        "pages/landing.html",
        {
            "tiles": tiles,
            "track_total": Track.objects.count(),
            "artist_total": Artist.objects.count(),
            "login_form": AuthenticationForm(auto_id="login_%s"),
            "register_form": RegisterForm(auto_id="reg_%s"),
        },
    )


def register(request):
    if request.user.is_authenticated:
        return redirect("dashboard")

    form = RegisterForm(
        request.POST if request.method == "POST" else None
    )

    if request.method == "POST" and form.is_valid():
        user = form.save()
        login(request, user)
        messages.success(
            request,
            "Welcome! Your account is ready.",
        )
        return redirect("dashboard")

    return render(
        request,
        "pages/auth/register.html",
        {"form": form},
    )


def login_view(request):
    if request.user.is_authenticated:
        return redirect("dashboard")

    form = AuthenticationForm(
        request,
        data=request.POST if request.method == "POST" else None,
    )

    if request.method == "POST" and form.is_valid():
        login(request, form.get_user())

        next_url = (
            request.POST.get("next")
            or request.GET.get("next")
        )

        if next_url and url_has_allowed_host_and_scheme(
            next_url,
            allowed_hosts={request.get_host()},
        ):
            return redirect(next_url)

        return redirect("dashboard")

    return render(
        request,
        "pages/auth/login.html",
        {
            "form": form,
            "next": (
                request.POST.get("next")
                or request.GET.get("next", "")
            ),
        },
    )


@login_required
def profile(request):
    user = request.user

    profile_obj, _ = UserProfile.objects.get_or_create(
        user=user
    )

    form = ProfileForm(
        request.POST if request.method == "POST" else None,
        request.FILES or None,
        instance=profile_obj,
        user=user,
    )

    if request.method == "POST" and form.is_valid():
        form.save()
        messages.success(request, "Profile updated.")
        return redirect("profile")

    return render(
        request,
        "pages/profile.html",
        {
            "profile_obj": profile_obj,
            "profile_form": form,
            "playlist_count": user.playlists.count(),
            "liked_count": user.liked_tracks.count(),
            "followed_count": user.artist_follows.count(),
            "playlists": user.playlists.all()[:5],
        },
    )


@login_required
def dashboard(request):
    """Home screen: profile, playlists, albums and recommended artists."""
    user = request.user

    profile_obj, _ = UserProfile.objects.get_or_create(
        user=user
    )

    followed_ids = set(
        ArtistFollow.objects.filter(
            user=user
        ).values_list("artist_id", flat=True)
    )

    followed_artists = (
        Artist.objects.filter(pk__in=followed_ids)
        .annotate(
            follower_total=Count(
                "followers",
                distinct=True,
            )
        )
        .order_by("name")
    )

    recommended_artists = (
        Artist.objects.exclude(pk__in=followed_ids)
        .annotate(
            follower_total=Count(
                "followers",
                distinct=True,
            ),
            liked_hits=Count(
                "albums__tracks__likes",
                filter=Q(albums__tracks__likes__user=user),
                distinct=True,
            ),
        )
        .order_by(
            "-liked_hits",
            "-follower_total",
            "-created_at",
        )[:6]
    )

    return render(
        request,
        "pages/dashboard.html",
        {
            "profile_obj": profile_obj,
            "albums": Album.objects.select_related("artist").order_by("-release_date")[:4],
            "playlists": (
                Playlist.objects.filter(is_public=True)
                .select_related("owner")
                .order_by("-created_at")[:4]
            ),
            "recommended_artists": recommended_artists[:4],
            "followed_artists": followed_artists[:4],
            "followed_ids": followed_ids,
            "playlist_count": user.playlists.count(),
            "liked_count": user.liked_tracks.count(),
            "followed_count": len(followed_ids),
        },
    )


@login_required
@user_passes_test(lambda user: user.is_staff)
def admin_dashboard(request):
    """A site-styled admin hub with in-page management overlays."""
    User = get_user_model()

    return render(
        request,
        "pages/admin_dashboard.html",
        {
            "user_total": User.objects.count(),
            "artist_total": Artist.objects.count(),
            "album_total": Album.objects.count(),
            "track_total": Track.objects.count(),
            "playlist_total": Playlist.objects.count(),
            "recent_tracks": (
                Track.objects.select_related("album__artist")
                .order_by("-pk")[:4]
            ),
            "liked_ids": liked_ids(request.user),
        },
    )


@login_required
def artist_list(request):
    """Paginated artists library."""
    page_obj = Paginator(
        Artist.objects.all(),
        12,
    ).get_page(request.GET.get("page"))

    return render(
        request,
        "pages/artists/list.html",
        {
            "artists": page_obj,
            "page_obj": page_obj,
        },
    )


@login_required
def artist_detail(request, pk):
    artist = get_object_or_404(Artist, pk=pk)

    return render(
        request,
        "pages/artists/detail.html",
        {
            "artist": artist,
            "albums": artist.albums.all(),
            "is_following": ArtistFollow.objects.filter(
                user=request.user,
                artist=artist,
            ).exists(),
            "follower_total": artist.followers.count(),
            "can_manage_artist": (
                request.user.is_staff
                or artist.created_by_id == request.user.id
            ),
        },
    )


@login_required
def artist_create(request):
    form = ArtistForm(
        request.POST if request.method == "POST" else None,
        request.FILES or None,
    )

    if request.method == "POST" and form.is_valid():
        artist = form.save(commit=False)
        artist.created_by = request.user
        artist.save()

        messages.success(
            request,
            "Artist added to your library.",
        )
        return redirect(artist)

    return render(
        request,
        "pages/form.html",
        {
            "form": form,
            "title": "New artist",
            "cancel_url": reverse("artist_list"),
        },
    )


@login_required
def artist_update(request, pk):
    artist = get_object_or_404(Artist, pk=pk)
    require_owner(request, artist, "artist")

    form = ArtistForm(
        request.POST if request.method == "POST" else None,
        request.FILES or None,
        instance=artist,
    )

    if request.method == "POST" and form.is_valid():
        form.save()
        messages.success(request, "Artist updated.")
        return redirect(artist)

    return render(
        request,
        "pages/form.html",
        {
            "form": form,
            "title": f"Edit {artist.name}",
            "cancel_url": artist.get_absolute_url(),
        },
    )


@login_required
def artist_delete(request, pk):
    artist = get_object_or_404(Artist, pk=pk)
    require_owner(request, artist, "artist")

    if not request.user.is_staff:
        has_other_albums = artist.albums.exclude(
            created_by_id=request.user.id
        ).exists()

        has_other_tracks = (
            Track.objects.filter(
                album__artist=artist
            )
            .exclude(created_by_id=request.user.id)
            .exists()
        )

        if has_other_albums or has_other_tracks:
            messages.error(
                request,
                (
                    "This artist has albums or tracks uploaded by "
                    "other users. Remove or transfer those items first; "
                    "their uploads are protected."
                ),
            )
            return redirect(artist)

    return confirm_delete(
        request,
        artist,
        "Artist",
        artist.get_absolute_url(),
        "artist_list",
    )


@login_required
@require_POST
def toggle_artist_follow(request, pk):
    artist = get_object_or_404(Artist, pk=pk)

    follow, created = ArtistFollow.objects.get_or_create(
        user=request.user,
        artist=artist,
    )

    if created:
        messages.success(
            request,
            f"You now like {artist.name}.",
        )
    else:
        follow.delete()
        messages.info(
            request,
            f"Removed {artist.name} from your liked artists.",
        )

    return redirect(
        safe_next(
            request,
            artist.get_absolute_url(),
        )
    )


@login_required
def album_list(request):
    page_obj = Paginator(
        Album.objects.select_related("artist"),
        12,
    ).get_page(request.GET.get("page"))

    return render(
        request,
        "pages/albums/list.html",
        {
            "albums": page_obj,
            "page_obj": page_obj,
        },
    )


@login_required
def album_detail(request, pk):
    album = get_object_or_404(
        Album.objects.select_related("artist"),
        pk=pk,
    )

    return render(
        request,
        "pages/albums/detail.html",
        {
            "album": album,
            "tracks": album.tracks.all(),
            "liked_ids": liked_ids(request.user),
            "can_manage_album": (
                request.user.is_staff
                or album.created_by_id == request.user.id
            ),
        },
    )


@login_required
def album_create(request):
    initial = (
        {"artist": request.GET.get("artist")}
        if request.GET.get("artist")
        else None
    )

    form = AlbumForm(
        request.POST if request.method == "POST" else None,
        request.FILES or None,
        initial=initial,
    )

    if request.method == "POST" and form.is_valid():
        album = form.save(commit=False)
        album.created_by = request.user
        album.save()

        messages.success(
            request,
            "Album added to your library.",
        )
        return redirect(album)

    return render(
        request,
        "pages/form.html",
        {
            "form": form,
            "title": "New album",
            "cancel_url": reverse("album_list"),
        },
    )


@login_required
def album_update(request, pk):
    album = get_object_or_404(Album, pk=pk)
    require_owner(request, album, "album")

    form = AlbumForm(
        request.POST if request.method == "POST" else None,
        request.FILES or None,
        instance=album,
    )

    if request.method == "POST" and form.is_valid():
        form.save()
        messages.success(request, "Album updated.")
        return redirect(album)

    return render(
        request,
        "pages/form.html",
        {
            "form": form,
            "title": f"Edit {album.title}",
            "cancel_url": album.get_absolute_url(),
        },
    )


@login_required
def album_delete(request, pk):
    album = get_object_or_404(Album, pk=pk)
    require_owner(request, album, "album")

    if (
        not request.user.is_staff
        and album.tracks.exclude(
            created_by_id=request.user.id
        ).exists()
    ):
        messages.error(
            request,
            (
                "This album contains tracks uploaded by other users. "
                "Their tracks are protected, so the album cannot "
                "be deleted yet."
            ),
        )
        return redirect(album)

    return confirm_delete(
        request,
        album,
        "Album",
        album.get_absolute_url(),
        "album_list",
    )


@login_required
def track_create(request, album_id):
    album = get_object_or_404(Album, pk=album_id)
    require_owner(request, album, "album")

    next_number = album.tracks.count() + 1

    form = TrackForm(
        request.POST if request.method == "POST" else None,
        request.FILES or None,
        initial={"track_number": next_number},
    )

    if request.method == "POST" and form.is_valid():
        track = form.save(commit=False)
        track.album = album
        track.created_by = request.user
        track.save()

        messages.success(request, "Track added.")
        return redirect(album)

    return render(
        request,
        "pages/form.html",
        {
            "form": form,
            "title": f"Add track to {album.title}",
            "cancel_url": album.get_absolute_url(),
        },
    )


@login_required
def track_update(request, pk):
    track = get_object_or_404(Track, pk=pk)
    require_owner(request, track, "track")

    form = TrackForm(
        request.POST if request.method == "POST" else None,
        request.FILES or None,
        instance=track,
    )

    if request.method == "POST" and form.is_valid():
        form.save()
        messages.success(request, "Track updated.")
        return redirect(track.album)

    return render(
        request,
        "pages/form.html",
        {
            "form": form,
            "title": f"Edit {track.title}",
            "cancel_url": track.album.get_absolute_url(),
        },
    )


@login_required
def track_delete(request, pk):
    track = get_object_or_404(Track, pk=pk)
    require_owner(request, track, "track")

    album = track.album

    return confirm_delete(
        request,
        track,
        "Track",
        album.get_absolute_url(),
        album.get_absolute_url(),
    )


@login_required
def playlist_list(request):
    playlists = (
        Playlist.objects.filter(owner=request.user)
        .select_related("owner")
        .order_by("-created_at")
    )

    page_obj = Paginator(
        playlists,
        12,
    ).get_page(request.GET.get("page"))

    return render(
        request,
        "pages/playlists/list.html",
        {
            "playlists": page_obj,
            "page_obj": page_obj,
            "is_my_playlists": True,
        },
    )


@login_required
def community_playlist_list(request):
    playlists = (
        Playlist.objects.filter(is_public=True)
        .select_related("owner")
        .order_by("-created_at")
    )

    page_obj = Paginator(
        playlists,
        12,
    ).get_page(request.GET.get("page"))

    return render(
        request,
        "pages/playlists/list.html",
        {
            "playlists": page_obj,
            "page_obj": page_obj,
            "is_my_playlists": False,
        },
    )


@login_required
def playlist_detail(request, pk):
    playlist = get_viewable_playlist(request, pk)
    tracks = playlist.tracks.select_related("album__artist")

    return render(
        request,
        "pages/playlists/detail.html",
        {
            "playlist": playlist,
            "tracks": tracks,
            "liked_ids": liked_ids(request.user),
            "can_manage_playlist": (
                request.user.is_staff
                or playlist.owner_id == request.user.id
            ),
        },
    )


@login_required
def playlist_create(request):
    form = PlaylistForm(
        request.POST if request.method == "POST" else None,
        request.FILES or None,
    )

    if request.method == "POST" and form.is_valid():
        playlist = form.save(commit=False)
        playlist.owner = request.user
        playlist.save()

        messages.success(request, "Playlist created.")
        return redirect(playlist)

    return render(
        request,
        "pages/form.html",
        {
            "form": form,
            "title": "New playlist",
            "cancel_url": reverse("playlist_list"),
        },
    )


@login_required
def playlist_update(request, pk):
    playlist = get_own_playlist(request, pk)

    form = PlaylistForm(
        request.POST if request.method == "POST" else None,
        request.FILES or None,
        instance=playlist,
    )

    if request.method == "POST" and form.is_valid():
        form.save()
        messages.success(request, "Playlist updated.")
        return redirect(playlist)

    return render(
        request,
        "pages/form.html",
        {
            "form": form,
            "title": f"Edit {playlist.name}",
            "cancel_url": playlist.get_absolute_url(),
        },
    )


@login_required
def playlist_delete(request, pk):
    playlist = get_own_playlist(request, pk)

    return confirm_delete(
        request,
        playlist,
        "Playlist",
        playlist.get_absolute_url(),
        "playlist_list",
    )


@login_required
def add_to_playlist(request, track_id):
    track = get_object_or_404(
        Track.objects.select_related("album__artist"),
        pk=track_id,
    )

    playlists = request.user.playlists.annotate(
        track_total=Count("tracks")
    )

    if request.method == "POST":
        playlist = get_own_playlist(
            request,
            request.POST.get("playlist"),
        )

        playlist.tracks.add(track)

        messages.success(
            request,
            f"Added “{track.title}” to {playlist.name}.",
        )

        return redirect(
            safe_next(
                request,
                track.album.get_absolute_url(),
            )
        )

    return render(
        request,
        "pages/playlists/add_track.html",
        {
            "track": track,
            "playlists": playlists,
            "next": request.GET.get("next", ""),
        },
    )


@login_required
@require_POST
def remove_from_playlist(request, playlist_id, track_id):
    playlist = get_own_playlist(request, playlist_id)
    track = get_object_or_404(Track, pk=track_id)

    playlist.tracks.remove(track)

    messages.success(
        request,
        "Track removed from playlist.",
    )

    return redirect(playlist)


@login_required
@require_POST
def toggle_like(request, track_id):
    track = get_object_or_404(Track, pk=track_id)

    like, created = LikedTrack.objects.get_or_create(
        user=request.user,
        track=track,
    )

    if created:
        messages.success(
            request,
            f"Added “{track.title}” to Liked Songs.",
        )
    else:
        like.delete()
        messages.info(
            request,
            f"Removed “{track.title}” from Liked Songs.",
        )

    return redirect(
        safe_next(
            request,
            track.album.get_absolute_url(),
        )
    )


@login_required
def liked_songs(request):
    likes = (
        LikedTrack.objects.filter(user=request.user)
        .select_related("track__album__artist")
    )

    page_obj = Paginator(
        likes,
        15,
    ).get_page(request.GET.get("page"))

    tracks = [
        like.track
        for like in page_obj.object_list
    ]

    return render(
        request,
        "pages/liked_songs.html",
        {
            "tracks": tracks,
            "liked_ids": {
                track.id
                for track in tracks
            },
            "page_obj": page_obj,
        },
    )


@login_required
def search(request):
    q = request.GET.get("q", "").strip()
    tracks = artists = albums = []

    if q:
        tracks = (
            Track.objects.filter(title__icontains=q)
            .select_related("album__artist")
        )

        artists = Artist.objects.filter(
            name__icontains=q
        )

        albums = (
            Album.objects.filter(Q(title__icontains=q))
            .select_related("artist")
        )

    return render(
        request,
        "pages/search.html",
        {
            "q": q,
            "tracks": tracks,
            "artists": artists,
            "albums": albums,
            "liked_ids": liked_ids(request.user),
        },
    )


ADMIN_MANAGER_CONFIG = {
    "users": {
        "title": "User accounts",
        "model": None,
        "form": AdminUserForm,
    },
    "artists": {
        "title": "Artists",
        "model": Artist,
        "form": ArtistForm,
    },
    "albums": {
        "title": "Albums",
        "model": Album,
        "form": AlbumForm,
    },
    "tracks": {
        "title": "Tracks",
        "model": Track,
        "form": AdminTrackForm,
    },
    "playlists": {
        "title": "Playlists",
        "model": Playlist,
        "form": AdminPlaylistForm,
    },
    "likes": {
        "title": "Liked songs",
        "model": LikedTrack,
        "form": None,
    },
}


def _admin_manager_items(kind, query=""):
    User = get_user_model()

    if kind == "users":
        items = User.objects.order_by("-date_joined")

        if query:
            items = items.filter(
                Q(username__icontains=query)
                | Q(email__icontains=query)
                | Q(first_name__icontains=query)
                | Q(last_name__icontains=query)
            )

        return items

    if kind == "artists":
        items = Artist.objects.all()

        if query:
            items = items.filter(
                Q(name__icontains=query)
                | Q(bio__icontains=query)
            )

        return items

    if kind == "albums":
        items = Album.objects.select_related("artist")

        if query:
            items = items.filter(
                Q(title__icontains=query)
                | Q(artist__name__icontains=query)
            )

        return items

    if kind == "tracks":
        items = Track.objects.select_related(
            "album__artist"
        )

        if query:
            items = items.filter(
                Q(title__icontains=query)
                | Q(album__title__icontains=query)
                | Q(album__artist__name__icontains=query)
            )

        return items

    if kind == "playlists":
        items = (
            Playlist.objects.select_related("owner")
            .prefetch_related("tracks")
        )

        if query:
            items = items.filter(
                Q(name__icontains=query)
                | Q(owner__username__icontains=query)
            )

        return items

    items = LikedTrack.objects.select_related(
        "user",
        "track__album__artist",
    )

    if query:
        items = items.filter(
            Q(user__username__icontains=query)
            | Q(track__title__icontains=query)
        )

    return items


def _render_admin_manager(
    request,
    kind,
    form=None,
    editing=None,
    query="",
    status=200,
    toast_message="",
):
    config = ADMIN_MANAGER_CONFIG[kind]

    response = render(
        request,
        "components/admin_manager_content.html",
        {
            "manager_kind": kind,
            "manager_title": config["title"],
            "items": Paginator(
                _admin_manager_items(kind, query),
                10,
            ).get_page(request.GET.get("page")),
            "form": form,
            "editing": editing,
            "query": query,
            "can_edit": config["form"] is not None,
        },
        status=status,
    )

    if toast_message:
        response["X-Toast-Message"] = toast_message

    User = get_user_model()

    response["X-Stats-Users"] = str(User.objects.count())
    response["X-Stats-Artists"] = str(Artist.objects.count())
    response["X-Stats-Albums"] = str(Album.objects.count())
    response["X-Stats-Tracks"] = str(Track.objects.count())
    response["X-Stats-Playlists"] = str(Playlist.objects.count())

    return response


@login_required
@user_passes_test(lambda user: user.is_staff)
def admin_manage(request, kind, pk=None, action=None):
    config = ADMIN_MANAGER_CONFIG.get(kind)

    if not config:
        from django.http import Http404
        raise Http404("Unknown management section")

    User = get_user_model()
    model = User if kind == "users" else config["model"]

    obj = (
        get_object_or_404(model, pk=pk)
        if pk is not None
        else None
    )

    if action == "delete":
        if request.method != "POST":
            from django.http import HttpResponseNotAllowed
            return HttpResponseNotAllowed(["POST"])

        obj.delete()

        item_label = (
            config["title"][:-1]
            if config["title"].endswith("s")
            else config["title"]
        )

        return _render_admin_manager(
            request,
            kind,
            toast_message=f"{item_label} deleted.",
        )

    form_class = config["form"]

    if form_class is None or (
        pk is None and action != "new"
    ):
        return _render_admin_manager(
            request,
            kind,
            query=request.GET.get("q", "").strip(),
        )

    if request.method == "POST":
        form = form_class(
            request.POST,
            request.FILES,
            instance=obj,
        )

        if form.is_valid():
            form.save()

            verb = "updated" if obj else "created"
            item_label = (
                config["title"][:-1]
                if config["title"].endswith("s")
                else config["title"]
            )

            return _render_admin_manager(
                request,
                kind,
                toast_message=(
                    f"{item_label} {verb} successfully."
                ),
            )

        return _render_admin_manager(
            request,
            kind,
            form=form,
            editing=obj,
            status=400,
        )

    form = form_class(instance=obj)

    return _render_admin_manager(
        request,
        kind,
        form=form,
        editing=obj,
    )