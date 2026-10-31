from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("music", "0006_playlist_cover"),
    ]

    operations = [
        migrations.AddField(
            model_name="playlist",
            name="is_public",
            field=models.BooleanField(
                default=True,
                help_text=(
                    "Public playlists can be viewed "
                    "and played by other users."
                ),
            ),
        ),
    ]