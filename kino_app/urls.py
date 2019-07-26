from django.urls import path

from . import views

app_name = 'kino_app'
urlpatterns = [
    # ex: /polls/
    path('', views.IndexView.as_view(), name='index'),
    path('upload', views.upload_view, name='upload'),
    path('preprocess', views.preprocess, name='preprocess'),
    path('video_book/<int:id>', views.video_book, name='video_book'),
    path('video_editing/<int:id>', views.video_editing, name='video_editing'),
    path('video_editing/get_data_detec', views.get_data_detec, name='get_data_detec'),
    path('video_editing/submit', views.submit, name='submit'),
    path('video_editing/upload_rough_cut', views.upload_rough_cut, name='upload_rough'),
    path('video_editing/load_sub', views.load_sub, name='load_sub'),
    path('video_editing/stabilize', views.stabilize, name='stabilize'),
    path('video_editing/fullhd', views.fullhd, name='fullhd'),
    path('video_editing/processKeyFrames', views.processKeyFrames, name='processKeyFrames'),
    path('video_editing/reframe', views.reframe, name='reframe'),
    path('video_editing/reframeCv', views.reframeCv, name='reframeCv'),
    path('video_editing/reframeMov', views.reframeMov, name='reframeMov')
]
