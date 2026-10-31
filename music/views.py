from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth.forms import AuthenticationForm
from django.core.exceptions import PermissionDenied
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.http import require_POST

from .forms import AlbumForm, ArtistForm, PlaylistForm, ProfileForm, RegisterForm, TrackForm
from .models import Album, Artist, ArtistFollow, LikedTrack, Playlist, Track, UserProfile


def liked_ids(user):
    return set(LikedTrack.objects.filter(user=user).values_list('track_id', flat=True))


def get_own_playlist(request, pk):
    playlist = get_object_or_404(Playlist, pk=pk)
    if playlist.owner_id != request.user.id and (not request.user.is_staff):
        raise PermissionDenied('This playlist belongs to someone else.')
    return playlist


def get_viewable_playlist(request, pk):
    playlist = get_object_or_404(Playlist.objects.select_related('owner'), pk=pk)
    if not playlist.is_public and playlist.owner_id != request.user.id and (not request.user.is_staff):
        raise PermissionDenied('This playlist is private.')
    return playlist


def require_owner(request, obj, label):
    if not request.user.is_staff:
        if getattr(obj, 'created_by_id', None) != request.user.id:
            raise PermissionDenied(f'Only the uploader can edit or delete this {label}.')
    return obj


def safe_next(request, default='artist_list'):
    nxt = request.POST.get('next') or request.GET.get('next')
    if nxt and url_has_allowed_host_and_scheme(nxt, allowed_hosts={request.get_host()}):
        return nxt
    return default


def confirm_delete(request, obj, label, cancel_url, success_url):
    if request.method == 'POST':
        obj.delete()
        messages.success(request, f'{label} deleted.')
        return redirect(success_url)
    return render(request, 'pages/confirm_delete.html', {'object': obj, 'label': label, 'cancel_url': cancel_url})


SAMPLE_TILES = ['Late night', 'Road trip', 'Focus', 'Sunday slow', 'Workout', 'Throwback']


def home(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
    albums = Album.objects.select_related('artist').order_by('-cover', '-release_date')[:6]
    tiles = [{'title': album.title, 'sub': album.artist.name, 'cover': album.cover.url if album.cover else ''} for album in albums]
    while len(tiles) < 6:
        tiles.append({'title': SAMPLE_TILES[len(tiles)], 'sub': 'Your playlist', 'cover': ''})
    return render(request, 'pages/landing.html', {'tiles': tiles, 'track_total': Track.objects.count(), 'artist_total': Artist.objects.count(), 'login_form': AuthenticationForm(auto_id='login_%s'), 'register_form': RegisterForm(auto_id='reg_%s')})


def register(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
    form = RegisterForm(request.POST if request.method == 'POST' else None)
    if request.method == 'POST' and form.is_valid():
        user = form.save()
        login(request, user)
        messages.success(request, 'Welcome! Your account is ready.')
        return redirect('dashboard')
    return render(request, 'pages/auth/register.html', {'form': form})


def login_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
    form = AuthenticationForm(request, data=request.POST if request.method == 'POST' else None)
    if request.method == 'POST' and form.is_valid():
        login(request, form.get_user())
        next_url = request.POST.get('next') or request.GET.get('next')
        if next_url and url_has_allowed_host_and_scheme(next_url, allowed_hosts={request.get_host()}):
            return redirect(next_url)
        return redirect('dashboard')
    return render(request, 'pages/auth/login.html', {'form': form, 'next': request.POST.get('next') or request.GET.get('next', '')})


@login_required
def profile(request):
    user = request.user
    profile_obj, _ = UserProfile.objects.get_or_create(user=user)
    form = ProfileForm(request.POST if request.method == 'POST' else None, request.FILES or None, instance=profile_obj, user=user)
    if request.method == 'POST' and form.is_valid():
        form.save()
        messages.success(request, 'Profile updated.')
        return redirect('profile')
    return render(request, 'pages/profile.html', {'profile_obj': profile_obj, 'profile_form': form, 'playlist_count': user.playlists.count(), 'liked_count': user.liked_tracks.count(), 'followed_count': user.artist_follows.count(), 'playlists': user.playlists.all()[:5]})


@login_required
def dashboard(request):
    """Home screen: profile, playlists, every album, recommended artists and liked artists."""
    user = request.user
    profile_obj, _ = UserProfile.objects.get_or_create(user=user)
    followed_ids = set(ArtistFollow.objects.filter(user=user).values_list('artist_id', flat=True))
    followed_artists = Artist.objects.filter(pk__in=followed_ids).annotate(follower_total=Count('followers', distinct=True)).order_by('name')
    recommended_artists = Artist.objects.exclude(pk__in=followed_ids).annotate(follower_total=Count('followers', distinct=True), liked_hits=Count('albums__tracks__likes', filter=Q(albums__tracks__likes__user=user), distinct=True)).order_by('-liked_hits', '-follower_total', '-created_at')[:6]
    return render(request, 'pages/dashboard.html', {'profile_obj': profile_obj, 'albums': Album.objects.select_related('artist'), 'playlists': Playlist.objects.filter(is_public=True).select_related('owner').order_by('-created_at')[:8], 'recommended_artists': recommended_artists, 'followed_artists': followed_artists, 'followed_ids': followed_ids, 'playlist_count': user.playlists.count(), 'liked_count': user.liked_tracks.count(), 'followed_count': len(followed_ids)})


@login_required
@user_passes_test(lambda user: user.is_staff)
def admin_dashboard(request):
    """A site-styled admin hub; Django's existing model permissions and CRUD remain available."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    return render(request, 'pages/admin_dashboard.html', {'user_total': User.objects.count(), 'artist_total': Artist.objects.count(), 'album_total': Album.objects.count(), 'track_total': Track.objects.count(), 'playlist_total': Playlist.objects.count(), 'recent_tracks': Track.objects.select_related('album__artist').order_by('-pk')[:8], 'liked_ids': liked_ids(request.user)})


@login_required
def artist_list(request):
    """Artists page: just every artist that has been added."""
    return render(request, 'pages/artists/list.html', {'artists': Artist.objects.all()})


@login_required
def artist_detail(request, pk):
    artist = get_object_or_404(Artist, pk=pk)
    return render(request, 'pages/artists/detail.html', {'artist': artist, 'albums': artist.albums.all(), 'is_following': ArtistFollow.objects.filter(user=request.user, artist=artist).exists(), 'follower_total': artist.followers.count(), 'can_manage_artist': request.user.is_staff or artist.created_by_id == request.user.id})


@login_required
def artist_create(request):
    form = ArtistForm(request.POST if request.method == 'POST' else None, request.FILES or None)
    if request.method == 'POST' and form.is_valid():
        artist = form.save(commit=False)
        artist.created_by = request.user
        artist.save()
        messages.success(request, 'Artist added to your library.')
        return redirect(artist)
    return render(request, 'pages/form.html', {'form': form, 'title': 'New artist', 'cancel_url': reverse('artist_list')})


@login_required
def artist_update(request, pk):
    artist = get_object_or_404(Artist, pk=pk)
    require_owner(request, artist, 'artist')
    form = ArtistForm(request.POST if request.method == 'POST' else None, request.FILES or None, instance=artist)
    if request.method == 'POST' and form.is_valid():
        form.save()
        messages.success(request, 'Artist updated.')
        return redirect(artist)
    return render(request, 'pages/form.html', {'form': form, 'title': f'Edit {artist.name}', 'cancel_url': artist.get_absolute_url()})


@login_required
def artist_delete(request, pk):
    artist = get_object_or_404(Artist, pk=pk)
    require_owner(request, artist, 'artist')
    if not request.user.is_staff:
        has_other_albums = artist.albums.exclude(created_by_id=request.user.id).exists()
        has_other_tracks = Track.objects.filter(album__artist=artist).exclude(created_by_id=request.user.id).exists()
        if has_other_albums or has_other_tracks:
            messages.error(request, 'This artist has albums or tracks uploaded by other users. Remove or transfer those items first; their uploads are protected.')
            return redirect(artist)
    return confirm_delete(request, artist, 'Artist', artist.get_absolute_url(), 'artist_list')


@login_required
@require_POST
def toggle_artist_follow(request, pk):
    artist = get_object_or_404(Artist, pk=pk)
    follow, created = ArtistFollow.objects.get_or_create(user=request.user, artist=artist)
    if created:
        messages.success(request, f'You now like {artist.name}.')
    else:
        follow.delete()
        messages.info(request, f'Removed {artist.name} from your liked artists.')
    return redirect(safe_next(request, artist.get_absolute_url()))


@login_required
def album_list(request):
    return render(request, 'pages/albums/list.html', {'albums': Album.objects.select_related('artist')})


@login_required
def album_detail(request, pk):
    album = get_object_or_404(Album.objects.select_related('artist'), pk=pk)
    return render(request, 'pages/albums/detail.html', {'album': album, 'tracks': album.tracks.all(), 'liked_ids': liked_ids(request.user), 'can_manage_album': request.user.is_staff or album.created_by_id == request.user.id})


@login_required
def album_create(request):
    initial = {'artist': request.GET.get('artist')} if request.GET.get('artist') else None
    form = AlbumForm(request.POST if request.method == 'POST' else None, request.FILES or None, initial=initial)
    if request.method == 'POST' and form.is_valid():
        album = form.save(commit=False)
        album.created_by = request.user
        album.save()
        messages.success(request, 'Album added to your library.')
        return redirect(album)
    return render(request, 'pages/form.html', {'form': form, 'title': 'New album', 'cancel_url': reverse('album_list')})


@login_required
def album_update(request, pk):
    album = get_object_or_404(Album, pk=pk)
    require_owner(request, album, 'album')
    form = AlbumForm(request.POST if request.method == 'POST' else None, request.FILES or None, instance=album)
    if request.method == 'POST' and form.is_valid():
        form.save()
        messages.success(request, 'Album updated.')
        return redirect(album)
    return render(request, 'pages/form.html', {'form': form, 'title': f'Edit {album.title}', 'cancel_url': album.get_absolute_url()})


@login_required
def album_delete(request, pk):
    album = get_object_or_404(Album, pk=pk)
    require_owner(request, album, 'album')
    if not request.user.is_staff and album.tracks.exclude(created_by_id=request.user.id).exists():
        messages.error(request, 'This album contains tracks uploaded by other users. Their tracks are protected, so the album cannot be deleted yet.')
        return redirect(album)
    return confirm_delete(request, album, 'Album', album.get_absolute_url(), 'album_list')


@login_required
def track_create(request, album_id):
    album = get_object_or_404(Album, pk=album_id)
    require_owner(request, album, 'album')
    next_number = album.tracks.count() + 1
    form = TrackForm(request.POST if request.method == 'POST' else None, request.FILES or None, initial={'track_number': next_number})
    if request.method == 'POST' and form.is_valid():
        track = form.save(commit=False)
        track.album = album
        track.created_by = request.user
        track.save()
        messages.success(request, 'Track added.')
        return redirect(album)
    return render(request, 'pages/form.html', {'form': form, 'title': f'Add track to {album.title}', 'cancel_url': album.get_absolute_url()})


@login_required
def track_update(request, pk):
    track = get_object_or_404(Track, pk=pk)
    require_owner(request, track, 'track')
    form = TrackForm(request.POST if request.method == 'POST' else None, request.FILES or None, instance=track)
    if request.method == 'POST' and form.is_valid():
        form.save()
        messages.success(request, 'Track updated.')
        return redirect(track.album)
    return render(request, 'pages/form.html', {'form': form, 'title': f'Edit {track.title}', 'cancel_url': track.album.get_absolute_url()})


@login_required
def track_delete(request, pk):
    track = get_object_or_404(Track, pk=pk)
    require_owner(request, track, 'track')
    album = track.album
    return confirm_delete(request, track, 'Track', album.get_absolute_url(), album.get_absolute_url())


@login_required
def playlist_list(request):
    playlists = Playlist.objects.filter(Q(is_public=True) | Q(owner=request.user)).select_related('owner').distinct().order_by('-created_at')
    return render(request, 'pages/playlists/list.html', {'playlists': playlists})


@login_required
def playlist_detail(request, pk):
    playlist = get_viewable_playlist(request, pk)
    tracks = playlist.tracks.select_related('album__artist')
    return render(request, 'pages/playlists/detail.html', {'playlist': playlist, 'tracks': tracks, 'liked_ids': liked_ids(request.user), 'can_manage_playlist': request.user.is_staff or playlist.owner_id == request.user.id})


@login_required
def playlist_create(request):
    form = PlaylistForm(request.POST if request.method == 'POST' else None, request.FILES or None)
    if request.method == 'POST' and form.is_valid():
        playlist = form.save(commit=False)
        playlist.owner = request.user
        playlist.save()
        messages.success(request, 'Playlist created.')
        return redirect(playlist)
    return render(request, 'pages/form.html', {'form': form, 'title': 'New playlist', 'cancel_url': reverse('playlist_list')})


@login_required
def playlist_update(request, pk):
    playlist = get_own_playlist(request, pk)
    form = PlaylistForm(request.POST if request.method == 'POST' else None, request.FILES or None, instance=playlist)
    if request.method == 'POST' and form.is_valid():
        form.save()
        messages.success(request, 'Playlist updated.')
        return redirect(playlist)
    return render(request, 'pages/form.html', {'form': form, 'title': f'Edit {playlist.name}', 'cancel_url': playlist.get_absolute_url()})


@login_required
def playlist_delete(request, pk):
    playlist = get_own_playlist(request, pk)
    return confirm_delete(request, playlist, 'Playlist', playlist.get_absolute_url(), 'playlist_list')


@login_required
def add_to_playlist(request, track_id):
    track = get_object_or_404(Track.objects.select_related('album__artist'), pk=track_id)
    playlists = request.user.playlists.annotate(track_total=Count('tracks'))
    if request.method == 'POST':
        playlist = get_own_playlist(request, request.POST.get('playlist'))
        playlist.tracks.add(track)
        messages.success(request, f'Added “{track.title}” to {playlist.name}.')
        return redirect(safe_next(request, track.album.get_absolute_url()))
    return render(request, 'pages/playlists/add_track.html', {'track': track, 'playlists': playlists, 'next': request.GET.get('next', '')})


@login_required
@require_POST
def remove_from_playlist(request, playlist_id, track_id):
    playlist = get_own_playlist(request, playlist_id)
    track = get_object_or_404(Track, pk=track_id)
    playlist.tracks.remove(track)
    messages.success(request, 'Track removed from playlist.')
    return redirect(playlist)


@login_required
@require_POST
def toggle_like(request, track_id):
    track = get_object_or_404(Track, pk=track_id)
    like, created = LikedTrack.objects.get_or_create(user=request.user, track=track)
    if created:
        messages.success(request, f'Added “{track.title}” to Liked Songs.')
    else:
        like.delete()
        messages.info(request, f'Removed “{track.title}” from Liked Songs.')
    return redirect(safe_next(request, track.album.get_absolute_url()))


@login_required
def liked_songs(request):
    likes = LikedTrack.objects.filter(user=request.user).select_related('track__album__artist')
    tracks = [like.track for like in likes]
    return render(request, 'pages/liked_songs.html', {'tracks': tracks, 'liked_ids': {track.id for track in tracks}})


@login_required
def search(request):
    q = request.GET.get('q', '').strip()
    tracks = artists = albums = []
    if q:
        tracks = Track.objects.filter(title__icontains=q).select_related('album__artist')
        artists = Artist.objects.filter(name__icontains=q)
        albums = Album.objects.filter(Q(title__icontains=q)).select_related('artist')
    return render(request, 'pages/search.html', {'q': q, 'tracks': tracks, 'artists': artists, 'albums': albums, 'liked_ids': liked_ids(request.user)})