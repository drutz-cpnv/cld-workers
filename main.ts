import {io} from "socket.io-client";
import {Status} from "./src/status";

const socket = io();
// @ts-ignore
const $status = document.querySelector('#status')
updateStatus(Status.CONNECTING)

type Worker = {
    id: string,
    // @ts-ignore
    element?: HTMLElement,
    jobs: Map<string, Job>
}

type Job = {
    id: string,
    status: 'running' | 'completed' | 'failed',
    range?: string,
    // @ts-ignore
    element?: HTMLElement,
    result?: number|string,
    timing?: number|string,
}

type SocketStartData = {
    id: string,
    worker: string
    start: string,
    end: string,
}

type SocketUpdateData = {
    id: string,
    worker: string
    result: string,
    timing: number|string,
}

const workers: Map<string, Worker> = new Map();

socket.on('connect', function () {
    updateStatus(Status.CONNECTED)
});

socket.on('start', (data: SocketStartData) => {
    console.log(workers)
    if (!workers.has(data.worker)) {
        const worker: Worker = {
            id: data.worker,
            jobs: new Map([[data.id, {id: data.id, status: 'running', range: `${data.start} - ${data.end}`}]]),
        }
        workers.set(data.worker, worker)
        createWorker(worker)
        const job = getJob(data)
        // @ts-ignore
        worker.jobs.set(data.id, job)
        // @ts-ignore
        createJob(job, worker)
    } else {
        const worker = workers.get(data.worker)
        const job = getJob(data)
        // @ts-ignore
        worker.jobs.set(data.id, job)
        // @ts-ignore
        createJob(job, worker)
    }
});


socket.on('update', (data: SocketUpdateData) => {
    const worker = workers.get(data.worker)
    // @ts-ignore
    const job = worker.jobs.get(data.id)
    // @ts-ignore
    job.result = data.result
    // @ts-ignore
    job.timing = data.timing
    // @ts-ignore
    job.element.querySelector('div').innerHTML = `<svg class="w-4 h-4 me-2 text-green-500 dark:text-green-400 flex-shrink-0" aria-hidden="true"
                             xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z"/>
                        </svg>`
    // @ts-ignore
    job.element.querySelector('span').innerHTML = `${job.range} - ${data.timing}s - ${data.result}`
});


socket.on('disconnect', function () {
    updateStatus(Status.DISCONNECTED)
});

socket.on('end', (data) => {
    // @ts-ignore
    document.querySelector('body > div').insertAdjacentHTML('afterend', `<div class="relative isolate flex text-center items-center gap-x-6 overflow-hidden bg-green-500 px-6 py-2.5 sm:px-3.5" id="banner">
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p class="text-sm leading-6 text-gray-900">
            <strong class="font-semibold">Tasks ended</strong>
            <svg viewBox="0 0 2 2" class="mx-2 inline h-0.5 w-0.5 fill-current" aria-hidden="true"><circle cx="1" cy="1" r="1" /></svg>
            A total of ${data.result} prime numbers have been found in ${data.timing} seconds.
        </p>
    </div>
</div>`)
})


function updateStatus(status: Status) {
    const STATUS = {
        CONNECTED: {
            text: 'Connected',
            classes: [
                'bg-green-50',
                'text-green-700',
                'ring-green-600/20',
            ],
        },
        DISCONNECTED: {
            text: 'Disconnected',
            classes: [
                'bg-red-50',
                'text-red-700',
                'ring-red-600/20',
            ],
        },
        CONNECTING: {
            text: 'Connecting',
            classes: [
                'bg-yellow-50',
                'text-yellow-700',
                'ring-yellow-600/20',
            ],
        },
    }

    $status.innerText = STATUS[status].text;
    $status.classList.remove(...STATUS.CONNECTED.classes, ...STATUS.DISCONNECTED.classes, ...STATUS.CONNECTING.classes);
    $status.classList.add(...STATUS[status].classes);
}

function createWorker(worker: Worker) {
    // @ts-ignore
    const $el = document.createElement('div');
    $el.classList.add('flex', 'p-4');
    $el.dataset.worker = worker.id;
    $el.innerHTML = `<img src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSItNjAgLTc1IDIxMCAyNjAiPgogIDxnIGZpbGw9IiNENzA3NTEiPgogICAgPHBhdGggZD0iTTY0LjUyNSA2Mi4wNTNjLTQuMTI1LjA1OC43OCAyLjEyNSA2LjE2NSAyLjk1NCAxLjQ4OC0xLjE2MSAyLjgzOC0yLjMzNiA0LjA0LTMuNDc5LTMuMzU0LjgyMS02Ljc2NS44MzgtMTAuMjA1LjUyNW0yMi4xNC01LjUyYzIuNDU3LTMuMzg5IDQuMjQ2LTcuMTAyIDQuODc4LTEwLjkzOS0uNTUxIDIuNzM2LTIuMDM1IDUuMDk5LTMuNDM1IDcuNTkyLTcuNzExIDQuODU0LS43MjYtMi44ODMtLjAwNC01LjgyNC04LjI5IDEwLjQzNi0xLjEzOCA2LjI1Ny0xLjQzOSA5LjE3MW04LjE3NC0yMS4yNjVjLjQ5Ny03LjQyOC0xLjQ2Mi01LjA4LTIuMTIxLTIuMjQ1Ljc2Ni40IDEuMzc3IDUuMjM3IDIuMTIxIDIuMjQ1TTQ4Ljg4My02Ni4yNjRjMi4yMDEuMzk1IDQuNzU3LjY5OCA0LjM5OCAxLjIyNCAyLjQwNy0uNTI4IDIuOTU0LTEuMDE1LTQuMzk4LTEuMjI0Ii8+CiAgICA8cGF0aCBkPSJtNTMuMjgxLTY1LjA0LTEuNTU2LjMyIDEuNDQ4LS4xMjcuMTA4LS4xOTMiLz4KICAgIDxwYXRoIGQ9Ik0xMjEuOTMgMzguMDg1Yy4yNDcgNi42NzEtMS45NSA5LjkwNy0zLjkzMiAxNS42MzdsLTMuNTY0IDEuNzgxYy0yLjkxOSA1LjY2Ni4yODIgMy41OTgtMS44MDcgOC4xMDUtNC41NTYgNC4wNDktMTMuODIzIDEyLjY3LTE2Ljc4OSAxMy40NTctMi4xNjMtLjA0NyAxLjQ2OS0yLjU1NCAxLjk0My0zLjUzNy02LjA5NyA0LjE4OC00Ljg5NCA2LjI4NS0xNC4yMTcgOC44M2wtLjI3My0uNjA3QzYwLjI5IDkyLjU2OSAyOC4zNDQgNzEuMTI5IDI4Ljc2NSA0MS44NzVjLS4yNDYgMS44NTctLjY5OCAxLjM5My0xLjIwOCAyLjE0NC0xLjE4Ni0xNS4wNTIgNi45NTItMzAuMTcgMjAuNjc1LTM2LjM0MyAxMy40MjctNi42NDYgMjkuMTYzLTMuOTE4IDM4Ljc4IDUuMDQ0QzgxLjczIDUuOCA3MS4yMTctMS41MzQgNTguNzU3LS44NDhjLTEyLjIwOC4xOTMtMjMuNjI1IDcuOTUtMjcuNDM2IDE2LjM2OS02LjI1MyAzLjkzOC02Ljk3OSAxNS4xNzctOS43MDQgMTcuMjMzLTMuNjY1IDI2Ljk0MyA2Ljg5NiAzOC41ODMgMjQuNzYyIDUyLjI3NSAyLjgxMiAxLjg5Ni43OTIgMi4xODQgMS4xNzMgMy42MjctNS45MzYtMi43NzktMTEuMzcyLTYuOTc2LTE1Ljg0MS0xMi4xMTQgMi4zNzIgMy40NzMgNC45MzEgNi44NDcgOC4yMzkgOS40OTktNS41OTYtMS44OTctMTMuMDc0LTEzLjU2My0xNS4yNTYtMTQuMDM4IDkuNjQ3IDE3LjI3NCAzOS4xNDIgMzAuMjk1IDU0LjU4NyAyMy44MzYtNy4xNDYuMjYzLTE2LjIyNi4xNDYtMjQuMjU2LTIuODIyLTMuMzcxLTEuNzM0LTcuOTU4LTUuMzMxLTcuMTQtNi4wMDMgMjEuMDc5IDcuODc1IDQyLjg1NCA1Ljk2NSA2MS4wOS04LjY1NSA0LjY0MS0zLjYxNCA5LjcwOS05Ljc2MSAxMS4xNzMtOS44NDYtMi4yMDYgMy4zMTcuMzc3IDEuNTk2LTEuMzE4IDQuNTIzIDQuNjI1LTcuNDU2LTIuMDA4LTMuMDM1IDQuNzc5LTEyLjg3N2wyLjUwNyAzLjQ1M2MtLjkzMS02LjE4OCA3LjY4Ny0xMy43MDQgNi44MTMtMjMuNDkyIDEuOTc1LTIuOTk0IDIuMjA2IDMuMjIuMTA3IDEwLjEwNyAyLjkxMi03LjY0Ljc2Ny04Ljg2NyAxLjUxNi0xNS4xNzEuODEgMi4xMTggMS44NjcgNC4zNyAyLjQxMiA2LjYwNi0xLjg5NS03LjM4MiAxLjk0OC0xMi40MzMgMi44OTgtMTYuNzI0LS45MzctLjQxNS0yLjkyOCAzLjI2NC0zLjM4My01LjQ1Ny4wNjUtMy43ODggMS4wNTQtMS45ODUgMS40MzUtMi45MTctLjc0NC0uNDI3LTIuNjk0LTMuMzMtMy44OC04LjkuODYtMS4zMDggMi4zIDMuMzkzIDMuNDcgMy41ODYtLjc1My00LjQyOS0yLjA0OS03LjgwNS0yLjEwMy0xMS4yMDItMy40MjEtNy4xNDktMS4yMTEuOTUzLTMuOTg1LTMuMDY5LTMuNjQxLTExLjM1NyAzLjAyMS0yLjYzNyAzLjQ3LTcuNzk2IDUuNTIgNy45OTUgOC42NjcgMjAuMzg3IDEwLjExIDI1LjUxOS0xLjEwMy02LjI1OC0yLjg4My0xMi4zMi01LjA1OC0xOC4xODUgMS42NzcuNzA1LTIuNjk5LTEyLjg3NSAyLjE4LTMuODgyLTUuMjEtMTkuMTcyLTIyLjMwMi0zNy4wODctMzguMDI1LTQ1LjQ5MyAxLjkyNCAxLjc2IDQuMzU0IDMuOTcxIDMuNDgxIDQuMzE3LTcuODE5LTQuNjU2LTYuNDQ0LTUuMDE4LTcuNTY1LTYuOTg1LTYuMzY5LTIuNTkxLTYuNzg4LjIwOC0xMS4wMDcuMDA0LTEyLjAwNS02LjM2OC0xNC4zMTgtNS42OS0yNS4zNjgtOS42ODFsLjUwMiAyLjM0OWMtNy45NTMtMi42NDktOS4yNjUgMS4wMDUtMTcuODYyLjAwOS0uNTIzLS40MDkgMi43NTMtMS40NzkgNS40NTItMS44NzEtNy42OSAxLjAxNS03LjMyOS0xLjUxNS0xNC44NTQuMjc5IDEuODU1LTEuMzAxIDMuODE1LTIuMTYyIDUuNzkzLTMuMjY5LTYuMjcxLjM4MS0xNC45NzEgMy42NDktMTIuMjg2LjY3N0MyMC4xNDQtNjIuNDYgMS45NzYtNTYuMDUzLTguMjE4LTQ2LjQ5NGwtLjMyMS0yLjE0MmMtNC42NzIgNS42MDgtMjAuMzcxIDE2Ljc0OC0yMS42MjIgMjQuMDExbC0xLjI0OS4yOTFjLTIuNDMxIDQuMTE2LTQuMDA0IDguNzgxLTUuOTMyIDEzLjAxNi0zLjE4IDUuNDE3LTQuNjYxIDIuMDg1LTQuMjA4IDIuOTM0LTYuMjUzIDEyLjY3OS05LjM1OSAyMy4zMzItMTIuMDQzIDMyLjA2OSAxLjkxMiAyLjg1OC4wNDYgMTcuMjA2Ljc2OSAyOC42ODgtMy4xNDEgNTYuNzA5IDM5LjggMTExLjc3IDg2LjczNyAxMjQuNDggNi44OCAyLjQ1OSAxNy4xMSAyLjM2NCAyNS44MTMgMi42MTgtMTAuMjY4LTIuOTM3LTExLjU5NS0xLjU1Ni0yMS41OTUtNS4wNDQtNy4yMTUtMy4zOTgtOC43OTctNy4yNzctMTMuOTA3LTExLjcxMWwyLjAyMiAzLjU3M2MtMTAuMDIxLTMuNTQ3LTUuODI5LTQuMzktMTMuOTgyLTYuOTcybDIuMTYtMi44MmMtMy4yNDktLjI0Ni04LjYwNC01LjQ3NS0xMC4wNjktOC4zNzFsLTMuNTUzLjE0Yy00LjI3LTUuMjY5LTYuNTQ1LTkuMDYzLTYuMzc5LTEyLjAwNWwtMS4xNDggMi4wNDdjLTEuMzAxLTIuMjM1LTE1LjcwOS0xOS43NTktOC4yMzQtMTUuNjc5LTEuMzg5LTEuMjcxLTMuMjM1LTIuMDY3LTUuMjM3LTUuNzAzbDEuNTIyLTEuNzM5Yy0zLjU5Ny00LjYyNy02LjYyMS0xMC41NjItNi4zOTEtMTIuNTM2IDEuOTE5IDIuNTkyIDMuMjUgMy4wNzUgNC41NjggMy41Mi05LjA4My0yMi41MzktOS41OTMtMS4yNDItMTYuNDc0LTIyLjk0MmwxLjQ1Ni0uMTE2Yy0xLjExNi0xLjY4Mi0xLjc5My0zLjUwNi0yLjY5LTUuMjk4bC42MzMtNi4zMTNjLTYuNTQxLTcuNTYyLTEuODI5LTMyLjE1MS0uODg3LTQ1LjYzNy42NTUtNS40ODUgNS40NTktMTEuMzIyIDkuMTE0LTIwLjQ3N2wtMi4yMjctLjM4NEMtMjcuMzE2LTIuNDE5LTcuMjcxLTI0LjgxIDIuMDExLTIzLjY1OGM0LjQ5OS01LjY0OS0uODkyLS4wMi0xLjc3Mi0xLjQ0MyA5Ljg3OC0xMC4yMjMgMTIuOTg0LTcuMjIyIDE5LjY1LTkuMDYxIDcuMTktNC4yNjgtNi4xNyAxLjY2NC0yLjc2MS0xLjYyOCAxMi40MjctMy4xNzQgOC44MDgtNy4yMTYgMjUuMDIxLTguODI4IDEuNzEuOTczLTMuOTY5IDEuNTAzLTUuMzk1IDIuNzY2IDEwLjM1NC01LjA2NiAzMi43NjktMy45MTQgNDcuMzI2IDIuODExIDE2Ljg5NSA3Ljg5NiAzNS44NzMgMzEuMjMyIDM2LjYyMiA1My4xODlsLjg1Mi4yMjljLS40MzEgOC43MjkgMS4zMzYgMTguODIyLTEuNzI3IDI4LjA5NGwyLjEtNC4zODUiLz4KICAgIDxwYXRoIGQ9Im0xOS41IDY3LjcxNS0uNTc4IDIuODkzYzIuNzEgMy42ODMgNC44NjEgNy42NzMgOC4zMjMgMTAuNTUyLTIuNDktNC44NjMtNC4zNDEtNi44NzItNy43NDUtMTMuNDQ1bTYuNDA5LS4yNTFjLTEuNDM1LTEuNTg3LTIuMjg0LTMuNDk3LTMuMjM1LTUuNC45MDkgMy4zNDUgMi43NzEgNi4yMTkgNC41MDQgOS4xNDNsLTEuMjY5LTMuNzQzbTExMy40MTEtMjQuNjUtLjYwNSAxLjUyYy0xLjExMSA3Ljg5Mi0zLjUxMSAxNS43MDEtNy4xODkgMjIuOTQxIDQuMDYtNy42MzkgNi42OS0xNS45OTUgNy43OS0yNC40NjFNNDkuNjk4LTY4LjI0M2MyLjc4OS0xLjAyMiA2Ljg1NS0uNTYgOS44MTQtMS4yMzMtMy44NTUuMzI0LTcuNjkzLjUxNy0xMS40ODQgMS4wMDVsMS42Ny4yMjhtLTk3LjkxNyA1Mi4wNjdjLjY0MiA1Ljk1MS00LjQ3NyA4LjI2IDEuMTM0IDQuMzM3IDMuMDA3LTYuNzczLTEuMTc1LTEuODctMS4xMzQtNC4zMzdtLTYuNTkzIDI3LjUzOGMxLjI5Mi0zLjk2NyAxLjUyNi02LjM0OSAyLjAyLTguNjQ1LTMuNTcxIDQuNTY2LTEuNjQzIDUuNTM5LTIuMDIgOC42NDUiLz4KICA8L2c+Cjwvc3ZnPg=="
                 alt="" class="h-10 w-10 flex-none rounded-full">
            <div class="ml-4 flex-auto">
                <div class="font-medium">${worker.id}</div>
                <ul class="mt-2 max-w-md space-y-2 text-gray-500 list-inside dark:text-gray-400"></ul>
            </div>`
    worker.element = $el;
    // @ts-ignore
    document.querySelector('#workers').appendChild($el);
}

function createJob(job: Job, worker: Worker) {
    // @ts-ignore
    const $el = document.createElement('li');
    $el.classList.add('flex', 'items-center');
    $el.dataset.job = job.id;
    $el.innerHTML = `
            <div role="status">
                <svg aria-hidden="true"
                     class="w-4 h-4 me-2 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
                     viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                        fill="currentColor"/>
                    <path
                        d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                        fill="currentFill"/>
                </svg>
            </div>
            <span>${job.range}</span>
            `
    job.element = $el;
    worker.element.querySelector('ul').appendChild($el);

}

function getJob(data: SocketStartData): Job {
    return {
        id: data.id,
        status: 'running',
        range: `${data.start} - ${data.end}`,
    }
}


// @ts-ignore
const $restart = document.querySelector('#restart')
$restart.addEventListener('click', function () {
    socket.emit('restart')
    workers.forEach((worker) => {
        worker.jobs.forEach((job) => {
            worker.element.querySelector(`[data-job="${job.id}"]`).remove()
        })
        worker.element.remove()
    })
    workers.clear()
    // @ts-ignore
    document.querySelector('#banner').remove()
})