pipeline{
    agent any
    environment{
            DOCKER_IMAGE = "niketa15jain/chatbot:latest"
            DOCKERHUB_CREDENTIALS= 'dockerhub'
            SONARQUBE_SERVER = "SonarQube"
            SONAR_TOKEN = credentials('sonarqube-token')
            
    }

    stages{
        stage('Cloning'){
            steps{
                checkout scm
            }
        }

        stage('Sonar Analysis'){
            steps{
                withSonarQubeEnv("${SONARQUBE_SERVER}"){
                    sh '''
                        sonar-scanner \
                        -Dsonar.projectKey=cb-analysis \
                        -Dsonar.projectName="chatbot" \
                        -Dsonar.sources=. \
                        -Dsonar.host.url=http://localhost:9000 \
                        -Dsoanr.login=${SONAR_TOKEN}
                    '''
                }
            }
        }

    stage('Inject .env') {
                steps {
                    withCredentials([file(credentialsId: 'gemini_api_key', variable: 'ENV_FILE')]) {
                        sh '''
                        
                            echo "Injecting .env file from Jenkins credentials..."
                            cp $ENV_FILE .env
                            cat .env
                            ls -l .env
                        '''
                    }
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
           input message: "Wanna approve?", ok: "Merge"
            }
        }
    }
}
