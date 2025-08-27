from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
import os
import mmap
from time import sleep
import json

# Create your views here.
shm_path = "/dev/shm/signal"
request_path = "../demo/communicate/request"
response_path = "../demo/communicate/response"

def create_shared_memory(size, name):
    shm_fd = os.open(name, os.O_CREAT | os.O_RDWR)
    os.ftruncate(shm_fd, size)
    shm = mmap.mmap(shm_fd, size, mmap.MAP_SHARED, mmap.PROT_WRITE | mmap.PROT_READ)
    return shm

def write_to_shared_memory(shm, signal):
    shm.seek(0)
    shm.write(signal.to_bytes(8, byteorder="little"))

def read_from_shared_memory(shm):
    shm.seek(0)
    data = shm.read(8)
    return int.from_bytes(data, byteorder="little")

shm = create_shared_memory(16, shm_path)
write_to_shared_memory(shm, 0)

def hello_world(request):
    return HttpResponse("Hello, World!")

def single_table_join(request):
    return HttpResponse("Single Table Join Page")

def multi_table_join(request):
    return HttpResponse("Multi Table Join Page")

def tables(request):
    return HttpResponse("Tables Page")

@csrf_exempt
@require_http_methods(["POST"])
def get_table_data(request):
    table_name = request.POST.get('table')
    if not table_name:
        return JsonResponse({
            'status': 'error',
            'message': 'Table name is required'
        }, status=400)
    
    while True:
        if read_from_shared_memory(shm) != 0:
            sleep(0.01)
        else:
            break
    data = {
        "table": table_name
    }
    with open(request_path, "w") as f:
        json.dump(data, f, indent=2)

    write_to_shared_memory(shm, 3)
    while True:
        if read_from_shared_memory(shm) != 0:
            sleep(0.01)
        else:
            break
    
    with open(response_path, "r") as f:
        response = json.load(f)
    return JsonResponse(response)

@csrf_exempt
@require_http_methods(["POST"])
def single_table_join(request):
    print(request.POST)
    index_name = request.POST.get('index')
    if not index_name:
        return JsonResponse({
            'status': 'error',
            'message': 'index is required'
        }, status=400)
    
    # try to convert index_name to int
    try:
        index_name = int(index_name)
    except ValueError:
        return JsonResponse({
            'status': 'error',
            'message': 'index must be an integer'
        }, status=400)
    
    if index_name < 0 or index_name > 2:
        return JsonResponse({
            'status': 'error',
            'message': 'index must be 0, 1 or 2'
        }, status=400)
    
    while True:
        if read_from_shared_memory(shm) != 0:
            sleep(0.01)
        else:
            break
    
    data = {
        "index": index_name
    }
    with open(request_path, "w") as f:
        json.dump(data, f, indent=2)
    
    write_to_shared_memory(shm, 1)
    while True:
        if read_from_shared_memory(shm) != 0:
            sleep(0.01)
        else:
            break

    with open(response_path, "r") as f:
        response = json.load(f)
    print(response)
    return JsonResponse(response)


@csrf_exempt
@require_http_methods(["POST"])
def multi_table_join(request):
    index_name = request.POST.get('index')
    if not index_name:
        return JsonResponse({
            'status': 'error',
            'message': 'index is required'
        }, status=400)
    nation = request.POST.get('nation')
    if not nation:
        return JsonResponse({
            'status': 'error',
            'message': 'nation is required'
        }, status=400)
    
    # try to convert nation to list
    try:
        nation = json.loads(nation)
    except json.JSONDecodeError:
        return JsonResponse({
            'status': 'error',
            'message': 'nation must be a list'
        }, status=400)  
    if len(nation) != 2:
        return JsonResponse({
            'status': 'error',
            'message': 'nation must be a list with 2 elements'
        }, status=400)
    
    # nation must be a list of 2 strings
    if not all(isinstance(item, str) for item in nation):
        return JsonResponse({
            'status': 'error',
            'message': 'nation must be a list of 2 strings'
        }, status=400)
        

    try:
        index_name = int(index_name)
    except ValueError:
        return JsonResponse({
            'status': 'error',
            'message': 'index must be an integer'
        }, status=400)
    if index_name < 0 or index_name > 2:
        return JsonResponse({
            'status': 'error',
            'message': 'index must be 0, 1 or 2'
        }, status=400)
    
    data = {
        "index": index_name,
        "nation": nation
    }
    with open(request_path, "w") as f:
        json.dump(data, f, indent=2)
    
    write_to_shared_memory(shm, 2)
    while True:
        if read_from_shared_memory(shm) != 0:
            sleep(0.01)
        else:
            break
    
    with open(response_path, "r") as f:
        response = json.load(f)
    return JsonResponse(response)

@csrf_exempt
@require_http_methods(["POST"])
def Q3_join(request):
    index_name = request.POST.get('index')
    if not index_name:
        return JsonResponse({
            'status': 'error',
            'message': 'index is required'
        }, status=400)

    try:
        index_name = int(index_name)
    except ValueError:
        return JsonResponse({
            'status': 'error',
            'message': 'index must be an integer'
        }, status=400)
    if index_name < 0 or index_name > 2:
        return JsonResponse({
            'status': 'error',
            'message': 'index must be 0, 1 or 2'
        }, status=400)
    
    data = {
        "index": index_name
    }
    with open(request_path, "w") as f:
        json.dump(data, f, indent=2)
    
    write_to_shared_memory(shm, 4)
    while True:
        if read_from_shared_memory(shm) != 0:
            sleep(0.01)
        else:
            break
    
    with open(response_path, "r") as f:
        response = json.load(f)
    return JsonResponse(response)