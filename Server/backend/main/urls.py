from django.urls import path
from . import views

urlpatterns = [
    path('', views.hello_world, name='hello_world'),
    path('api/table-data/', views.get_table_data, name='get_table_data'),
    path('api/single-table-join/', views.single_table_join, name='single_table_join'),
    path('api/multi-table-join/', views.multi_table_join, name='multi_table_join'),
    path('api/Q3-join/', views.Q3_join, name='Q3_join'),
] 