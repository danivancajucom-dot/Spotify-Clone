from django.contrib.auth import views as auth_views
from django.urls import path

from . import views

urlpatterns = [
    path("", views.home, name="home"),

    # auth
    path("register/", views.register, name="register"),
    path("login/", auth_views.LoginView.as_view(template_name="pages/auth/login.html", redirect_authenticated_user=True), name="login"),
    path("logout/", auth_views.LogoutView.as_view(), name="logout"),
    path("profile/", views.profile, name="profile"),

    # artists
    path("artists/", views.artist_list, name="artist_list"),
    path("artists/new/", views.artist_create, name="artist_create"),
    path("artists/<int:pk>/", views.artist_detail, name="artist_detail"),
    path("artists/<int:pk>/edit/", views.artist_update, name="artist_update"),
    path("artists/<int:pk>/delete/", views.artist_delete, name="artist_delete"),

    # albums
    path("albums/", views.album_list, name="album_list"),
    path("albums/new/", views.album_create, name="album_create"),
    path("albums/<int:pk>/", views.album_detail, name="album_detail"),
    path("albums/<int:pk>/edit/", views.album_update, name="album_update"),
    path("albums/<int:pk>/delete/", views.album_delete, name="album_delete"),

    # tracks
    path("albums/<int:album_id>/tracks/new/", views.track_create, name="track_create"),
    path("tracks/<int:pk>/edit/", views.track_update, name="track_update"),
    path("tracks/<int:pk>/delete/", views.track_delete, name="track_delete"),
    path("tracks/<int:track_id>/like/", views.toggle_like, name="toggle_like"),
    path("tracks/<int:track_id>/add-to-playlist/", views.add_to_playlist, name="add_to_playlist"),

    # playlists
    path("playlists/", views.playlist_list, name="playlist_list"),
    path("playlists/new/", views.playlist_create, name="playlist_create"),
    path("playlists/<int:pk>/", views.playlist_detail, name="playlist_detail"),
    path("playlists/<int:pk>/edit/", views.playlist_update, name="playlist_update"),
    path("playlists/<int:pk>/delete/", views.playlist_delete, name="playlist_delete"),
    path("playlists/<int:playlist_id>/remove/<int:track_id>/", views.remove_from_playlist, name="remove_from_playlist"),

    # liked + search
    path("liked/", views.liked_songs, name="liked_songs"),
    path("search/", views.search, name="search"),
]
