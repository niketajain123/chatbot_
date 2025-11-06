pipeline{
    agent any
    environment{
            DOCKER_IMAGE = "niketa15jain/chatbot:latest"
            DOCKERHUB_CREDENTIALS= 'dockerhub'
    }

    stages{
        stage('Cloning'){
            steps{
                checkout scm
            }
        }
    
    stage('Build and Push') {
       steps {
          script {
            echo "Building Docker image... "
            docker.build("${DOCKER_IMAGE}")
            echo "Pushing Docker image to DockerHub..."
            docker.withRegistry('https://index.docker.io/v1/',"${DOCKERHUB_CREDENTIALS}") {
            docker.image("${DOCKER_IMAGE}").push()
                }
            }
        }
    }
    stage('Building pods'){
        steps{
            sh 'helm repo add chatbot https://niketajain123.github.io/chatbot-chart'
            sh 'helm repo update'
            sh 'helm search repo chatbot'
            sleep 10
            sh 'helm upgrade --install my-chatbot chatbot/cbchart'
            sh 'kubectl get pods'
            sleep 10
            sh 'kubectl get svc'
        }
    }
    stage('Deploying'){
        steps{
            sh '''
            
                // tmux new -d -s port 'kubectl port-forward svc/chatbot-release-cbchart 5000:80'
                // sleep 30
                // helm uninstall chatbot-release-cbchart
            '''
            }
        }
    }
}
