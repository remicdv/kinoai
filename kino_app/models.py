from django.db import models
from django.contrib.auth.models import User

# Create your models here.

class Timeline(models.Model):
    actor_name = models.CharField(max_length=200)

class Tracklet(models.Model):
    first_frame = models.IntegerField()
    timeline = models.ForeignKey(Timeline, models.SET_NULL, blank=True, null=True,)

class FolderPath(models.Model):
    path = models.TextField()
    abs_path = models.TextField()
    owner = models.ForeignKey(User, on_delete=models.CASCADE, blank=True, null=True, default=None)

class Detections(models.Model):
    json_data = models.TextField()
    path = models.ForeignKey(FolderPath, models.SET_NULL, blank=True, null=True,)

class Project(models.Model):
    title = models.TextField()
    company = models.TextField()
    date = models.DateField()
    password = models.TextField(blank=True, null=True, default=None)
