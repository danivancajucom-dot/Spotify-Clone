# Project structure

```
spotify_clone/
├── manage.py
├── db.sqlite3
├── media/                         uploaded covers / audio
├── templates/
│   └── admin/base_site.html       admin branding (loads css/admin.css)
├── spotify_clone/                 settings.py, urls.py, wsgi.py
└── music/
    ├── models.py  forms.py  admin.py  views.py  urls.py
    ├── templates/
    │   ├── layouts/               page shells (like React layouts)
    │   │   ├── base.html          <html>, css, js, toasts, confirm dialog
    │   │   ├── app.html           sidebar + topbar + content + player (logged in)
    │   │   └── auth.html          centered card (login / register pages)
    │   ├── components/            reusable pieces (like React components)
    │   │   ├── sidebar.html  topbar.html  player.html  icons.html
    │   │   ├── confirm_dialog.html  auth_modal.html  auth_fields.html
    │   │   ├── page_head.html  empty_state.html
    │   │   ├── artist_card.html  album_card.html  playlist_card.html
    │   │   ├── track_table.html  track_row.html
    │   │   └── form_field.html  form_alert.html
    │   └── pages/                 one file per screen (like React pages)
    │       ├── landing.html  profile.html  search.html  liked_songs.html
    │       ├── form.html  confirm_delete.html
    │       ├── auth/       login.html  register.html
    │       ├── artists/    list.html  detail.html
    │       ├── albums/     list.html  detail.html
    │       └── playlists/  list.html  detail.html  add_track.html
    └── static/music/
        ├── css/
        │   ├── main.css           imports everything shared
        │   ├── base.css  layout.css  responsive.css  admin.css
        │   ├── components/        buttons forms dropzone cards banner track-table
        │   │                      player dialog toast auth-modal
        │   └── pages/             landing auth add-track confirm-delete profile
        └── js/
            ├── main.js            entry point
            └── modules/           utils toast dialog forms dropzone player auth-modal
```

How it fits together
- A page does `{% extends "layouts/app.html" %}` and fills `{% block content %}`.
- Reusable pieces: `{% include "components/album_card.html" with album=album %}`.
- Page-only CSS goes in `{% block page_css %}` (example: pages/profile.html).
- Shared CSS: add an `@import` line in `css/main.css`.
- JS: `main.js` loads every module as an ES module (`<script type="module">`).

Run it
```
venv\Scripts\activate
python manage.py migrate
python manage.py runserver
```
Open http://127.0.0.1:8000/ then press Ctrl+F5.
