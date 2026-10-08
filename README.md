# Real-Time Chat Application

A multi-room chat application built with **Node.js, Express, Socket.IO and MongoDB**, packaged with **Docker**,
built and tested by a **Jenkins** pipeline, and deployed on **Kubernetes** (Docker Desktop).

Course: DevOps Tools (22ITE11) - Assignment 2  
Student: K. Manideep (1601-23-729-043), B.E. AIML VII Semester, Section J, CBIT

## Features
- Join with a display name and pick a room (`general`, `devops`, `random`)
- Messages delivered instantly to everyone in the room over WebSockets
- Message history stored in MongoDB and loaded when you join
- Online-users list, typing indicator, join/leave notices
- `/health` endpoint used by Docker and Kubernetes probes; sidebar shows which pod served you

## Project layout
```
src/            server.js (Express + Socket.IO), utils.js (validation helpers)
public/         browser client (HTML, CSS, JS)
test/           unit tests (node:test)
Dockerfile      multi-stage build: dev -> deps -> runtime
docker-compose.yml   app + MongoDB for local runs
Jenkinsfile     CI/CD pipeline: checkout, env check, install, lint, unit tests, image build,
                compose validation, smoke test, image load, Kubernetes deploy and verification
Jenkinsfile.ops operations job: compose up/down, self-healing test, scaling test, logs, status
k8s/            ConfigMap, MongoDB (PVC + Deployment + Service), chat-app Deployment and NodePort Service
```

## Run locally
```bash
docker compose up -d --build      # http://localhost:3100
docker compose down
```

## Deploy on Kubernetes
```bash
docker build -t realtime-chat-app:1.0 .
kubectl apply -f k8s/
kubectl get pods,svc               # app on http://localhost:30080
```
On Docker Desktop's kind-based cluster, load the image into the node first:
```bash
docker save realtime-chat-app:1.0 -o app.tar
docker cp app.tar desktop-control-plane:/app.tar
docker exec desktop-control-plane ctr -n k8s.io images import /app.tar
```
