import json
import os
import random
import sys
from datetime import datetime
from functools import reduce
from threading import Lock
from time import sleep
from json.encoder import JSONEncoder

import boto3
import mysql.connector
from flask import Flask, jsonify, render_template
from flask_socketio import SocketIO
import socket

app = Flask(__name__)

pending_jobs = {}

running_jobs = {}

finished_jobs = []

CAL_UP_TO = 100_000_000
current_limit = 0
RANGE_SIZE = 1_000_000
JOB_COUNT = 10

socketio = SocketIO(app)

lock = Lock()

is_job_running = True
started = None

S3 = boto3.client('s3', endpoint_url="https://sos-ch-gva-2.exo.io",
                  aws_access_key_id=os.environ.get('S3_KEY'),
                  aws_secret_access_key=os.environ.get('S3_SECRET'))

cnx = mysql.connector.connect(
    user=os.environ.get('DB_USER'),
    host=os.environ.get('DB_HOST_'),
    password=os.environ.get('DB_PSWD'),
    database=os.environ.get('DB_NAME'),
    port=os.environ.get('DB_PORT')
)
cursor = cnx.cursor()


def reset_database():
    cursor.execute("DROP TABLE IF EXISTS logs")
    cursor.execute(
        "CREATE TABLE logs (id INT AUTO_INCREMENT PRIMARY KEY, logged_at TIMESTAMP default CURRENT_TIMESTAMP, data text)")


reset_database()


def create_jobs():
    global pending_jobs
    for i in range(0, JOB_COUNT):
        start = i * RANGE_SIZE
        end = i * RANGE_SIZE + RANGE_SIZE
        job_id = str(start) + "-" + str(end)
        pending_jobs[job_id] = {
            'id': job_id,
            'worker': None,
            'from': start,
            'to': end,
            'start': None,
            'end': None,
            'result': None
        }


create_jobs()


def get_total():
    return reduce(lambda x, y: x + int(y["result"]), finished_jobs, 0)


@app.route("/get-work/<worker_id>")
def get_work(worker_id):
    global current_limit, started
    if is_job_running:
        if len(pending_jobs) is JOB_COUNT:
            started = datetime.now()
        if len(pending_jobs) > 0:
            lock.acquire()
            job = pending_jobs.pop(list(pending_jobs.keys())[0])
            lock.release()
            job["worker"] = worker_id
            job["start"] = datetime.now()
            job["id"] = job["id"] + "_" + worker_id
            running_jobs[job["id"]] = job

            data = {"start": job["from"], "end": job["to"], "worker": worker_id, "id": job["id"]}
            socketio.emit('start', data)
            cursor.execute("INSERT INTO logs (data) VALUES (%s)", (
                json.dumps(
                    {"action": "get-work", "worker": worker_id, "range": {"from": job["from"], "to": job["to"]}}),))
            cnx.commit()
            return jsonify(data)
        else:
            return "Range ended"
    else:
        return "No work"


@app.route("/save-result/<worker_id>/<result>")
def save_result(worker_id, result):
    job = {k: v for k, v in running_jobs.items() if k.endswith(worker_id)}
    job = running_jobs.pop(list(job.keys())[0])
    job["end"] = datetime.now()
    job["result"] = result
    timing = (job["end"] - job["start"]).total_seconds()
    finished_jobs.append(job)
    socketio.emit('update', {"id": job["id"], "worker": worker_id, "result": result, "timing": timing})
    cursor.execute("INSERT INTO logs (data) VALUES (%s)", (
        json.dumps({
            "action": "save-result",
            "worker": worker_id,
            "range": {
                "from": job["from"],
                "to": job["to"]
            },
            "result": result,
            "timing": timing
        }),)
                   )
    cnx.commit()

    if len(pending_jobs) == 0 and len(running_jobs) == 0:
        global is_job_running
        is_job_running = False
        global started
        socketio.emit('end', {"result": get_total(), "timing": (datetime.now() - started).total_seconds()})
    return "None"


@app.route("/status")
def status():
    return render_template('index.html', hostname=socket.gethostname(), ip=socket.gethostbyname(socket.gethostname()),
                           pending_jobs=len(pending_jobs), running_jobs=len(running_jobs),
                           finished_jobs=len(finished_jobs), url=get_urls())


@app.route("/create-report")
def create_report():
    cursor.execute("SELECT * FROM logs")
    result = cursor.fetchall()
    S3.put_object(ACL='public-read', Body=json.dumps(result, cls=JSONEncoder, sort_keys=True, default=str),
                  Bucket="drutz-storage", Key='cld2/logs.json')
    return "Report created"


@socketio.on('restart')
def restart():
    global pending_jobs, running_jobs, finished_jobs, is_job_running
    pending_jobs = {}
    running_jobs = {}
    finished_jobs = []
    is_job_running = True
    reset_database()
    create_jobs()
    socketio.emit('restart')


def get_urls():
    response = S3.list_objects_v2(Bucket='drutz-storage', Prefix='cld2')
    return "https://sos-ch-gva-2.exo.io/drutz-storage/" + response['Contents'][1]['Key']


socketio.run(app, allow_unsafe_werkzeug=True, debug=True)
app.run(debug=True)
