// CI/CD pipeline for the Real-Time Chat Application
// Runs on the Windows Jenkins controller: builds and tests the app, builds the Docker image
// and deploys it to the Docker Desktop Kubernetes cluster.

pipeline {
    agent any

    environment {
        IMAGE      = 'realtime-chat-app'
        IMAGE_TAG  = '1.0'
        KIND_NODE  = 'desktop-control-plane'
        // Docker Desktop CLI tools and the user's kubeconfig (Jenkins runs as a Windows service)
        DOCKER_BIN = 'C:\\Users\\kandu\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin'
        COMPOSE    = 'C:\\Users\\kandu\\.docker\\cli-plugins\\docker-compose.exe'
        KUBECONFIG = 'C:\\Users\\kandu\\.kube\\config'
        PATH       = "${DOCKER_BIN};${env.PATH}"
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                bat 'git log --oneline -n 3'
            }
        }

        stage('Environment Check') {
            steps {
                bat 'git --version'
                bat 'node --version && npm --version'
                bat 'docker version --format "Docker client {{.Client.Version}}, engine {{.Server.Version}}"'
                bat '"%COMPOSE%" version'
                bat 'kubectl version --client'
            }
        }

        stage('Install Dependencies') {
            steps {
                bat 'npm install --no-audit --no-fund'
            }
        }

        stage('Lint') {
            steps {
                bat 'npm run lint'
            }
        }

        stage('Unit Tests') {
            steps {
                bat 'npm test'
            }
        }

        stage('Docker Build') {
            steps {
                bat 'docker build -t %IMAGE%:%IMAGE_TAG% -t %IMAGE%:build-%BUILD_NUMBER% .'
                bat 'docker images %IMAGE%'
            }
        }

        stage('Compose Validation') {
            steps {
                bat '"%COMPOSE%" -f docker-compose.yml config --quiet && echo docker-compose.yml is valid'
            }
        }

        stage('Container Smoke Test') {
            steps {
                bat 'docker rm -f chat-smoke 2>nul || ver >nul'
                bat 'docker run -d --name chat-smoke -e MONGO_URL=mongodb://127.0.0.1:1 %IMAGE%:%IMAGE_TAG%'
                sleep time: 6, unit: 'SECONDS'
                bat 'docker exec chat-smoke wget -qO- http://localhost:3000/health'
                bat 'docker exec chat-smoke wget -qO- http://localhost:3000/api/info'
            }
            post {
                always {
                    bat 'docker rm -f chat-smoke 2>nul || ver >nul'
                }
            }
        }

        stage('Load Image into Cluster') {
            steps {
                bat 'kubectl config current-context'
                bat 'kubectl get nodes -o wide'
                script {
                    def nodes = bat(returnStdout: true, script: '@kubectl get nodes -o name').trim()
                    if (nodes.contains(env.KIND_NODE)) {
                        // the kind node runs in its own container and cannot see the host image store
                        bat 'docker save %IMAGE%:%IMAGE_TAG% -o realtime-chat-app.tar'
                        bat 'docker cp realtime-chat-app.tar %KIND_NODE%:/realtime-chat-app.tar'
                        bat 'docker exec %KIND_NODE% ctr -n k8s.io images import /realtime-chat-app.tar'
                        bat 'docker exec %KIND_NODE% sh -c "ctr -n k8s.io images list -q | grep realtime-chat-app"'
                        bat 'del /q realtime-chat-app.tar'
                    } else {
                        echo 'Cluster node shares the Docker Desktop image store, no import needed'
                    }
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                bat 'kubectl apply -f k8s/'
                bat 'kubectl rollout status deployment/mongo --timeout=300s'
                bat 'kubectl rollout restart deployment/chat-app'
                bat 'kubectl rollout status deployment/chat-app --timeout=180s'
            }
        }

        stage('Verify Deployment') {
            steps {
                bat 'kubectl get deployments -o wide'
                bat 'kubectl get pods -o wide'
                bat 'kubectl get services'
                bat 'kubectl get configmap,pvc'
                sleep time: 5, unit: 'SECONDS'
                bat 'curl.exe -s http://localhost:30080/health'
            }
        }
    }

    post {
        success {
            echo 'Real-Time Chat Application is running on Kubernetes at http://localhost:30080'
        }
        failure {
            bat 'kubectl get pods 2>nul || ver >nul'
        }
    }
}
