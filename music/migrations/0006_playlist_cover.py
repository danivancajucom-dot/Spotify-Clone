from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("music", "0005_userprofile_artistfollow"),
    ]

    operations = [
        migrations.AddField(
            model_name="playlist",
            name="cover",
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to="playlists/",
            ),
        ),
    ]