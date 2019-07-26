from django.contrib import admin

# Register your models here.

from .models import Tracklet, Timeline, Detections, FolderPath

admin.site.register(Tracklet)
admin.site.register(Timeline)
admin.site.register(Detections)
admin.site.register(FolderPath)
