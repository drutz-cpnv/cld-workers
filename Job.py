import json
from datetime import datetime

from flask import jsonify


class Job:
    def __init__(self, job_id, start, end):
        self.job_id = job_id
        self.start_at = None
        self.end_at = None
        self.result = None
        self.worker_id = None
        self.sfrom = start
        self.to = end

    def start(self, worker_id):
        self.start_at = datetime.now()
        self.worker_id = worker_id

    def end(self, result):
        self.end_at = datetime.now()
        self.result = result
        with open('data.json', 'a', encoding='utf-8') as f:
            json.dump({"id": self.job_id, "from": self.sfrom, "to": self.to, "worker": self.worker_id, "duration": self.result}, f, ensure_ascii=False, indent=4)

    def result(self):
        return (self.end_at-self.start_at).total_seconds()

    def is_started(self):
        return self.start_at is not None

    def __str__(self):
        return jsonify({"start": self.sfrom, "end": self.to})
