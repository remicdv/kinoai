# Generated by Django 2.1.3 on 2019-01-03 15:56

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('kino_app', '0002_folderpath'),
    ]

    operations = [
        migrations.AddField(
            model_name='folderpath',
            name='abs_path',
            field=models.TextField(default=''),
        ),
    ]
