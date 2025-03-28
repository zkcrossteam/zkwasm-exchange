#!/bin/bash

# Environment Variables
CHART_NAME="zkwasm-automata"
CHAIN_ID="11155111" # Default to Sepolia testnet
ALLOWED_ORIGINS="*" # Multiple domains separated by commas
CHART_PATH="./helm-charts/${CHART_NAME}"
DEPLOY_VALUE="TRUE" 
REMOTE_VALUE="TRUE" 
AUTO_SUBMIT_VALUE="" # Default to empty
MIGRATE_VALUE="FALSE" # Default to false
MIGRATE_IMAGE_VALUE="" # MD5 value of the intended image to migrate
IMAGE_VALUE="4C8AED67EEA742ACB671D133F9B91E40"
SETTLEMENT_CONTRACT_ADDRESS="" # Default to empty
RPC_PROVIDER="" # Default to empty

echo "Using IMAGE_VALUE: ${IMAGE_VALUE}"

mkdir -p ${CHART_PATH}/templates

helm create ${CHART_PATH}

rm -f ${CHART_PATH}/templates/deployment.yaml
rm -f ${CHART_PATH}/templates/service.yaml
rm -f ${CHART_PATH}/templates/serviceaccount.yaml
rm -f ${CHART_PATH}/templates/hpa.yaml
rm -f ${CHART_PATH}/templates/ingress.yaml
rm -f ${CHART_PATH}/templates/NOTES.txt
rm -f ${CHART_PATH}/values.yaml

cat > ${CHART_PATH}/templates/mongodb-pvc.yaml << EOL
{{- if and .Values.config.mongodb.enabled .Values.config.mongodb.persistence.enabled }}
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: {{ include "${CHART_NAME}.fullname" . }}-mongodb-pvc
  labels:
    {{- include "${CHART_NAME}.labels" . | nindent 4 }}
  annotations:
    "helm.sh/resource-policy": keep
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: {{ .Values.config.mongodb.persistence.size }}
  storageClassName: {{ .Values.config.mongodb.persistence.storageClassName }}
{{- end }}
EOL

REPO_URL=$(git config --get remote.origin.url)
if [[ $REPO_URL == *"github.com"* ]]; then
  if [[ $REPO_URL == *":"* ]]; then
    REPO_OWNER=$(echo $REPO_URL | sed -E 's/.*:([^\/]+)\/[^\/]+.*/\1/')
  else
    REPO_OWNER=$(echo $REPO_URL | sed -E 's/.*github\.com\/([^\/]+).*/\1/')
  fi
  
  REPO_OWNER=$(echo $REPO_OWNER | sed 's/https:\/\///g' | sed 's/http:\/\///g')
  
  REPO_OWNER=$(echo $REPO_OWNER | sed 's/github\.com\///g' | sed 's/\/.*//g')
  
  REPO_OWNER=$(echo $REPO_OWNER | tr '[:upper:]' '[:lower:]')
else
  REPO_OWNER="jupiterxiaoxiaoyu"
  echo "Warning: Not a GitHub repository or couldn't determine owner. Using default: $REPO_OWNER"
fi

echo "Using repository owner: $REPO_OWNER"

cat > ${CHART_PATH}/values.yaml << EOL
# Default values for ${CHART_NAME}
replicaCount: 1

image:
  repository: ghcr.io/${REPO_OWNER}/${CHART_NAME}
  pullPolicy: Always
  tag: "latest"  # Could be latest or MD5 value

ingress:
  enabled: true
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-body-size: "8m"
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "180"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "180"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "180"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
  tls:
    enabled: true
  domain:
    base: "zkwasm.ai"
    prefix: "rpc"  # Generate rpc.namespace.zkwasm.ai
  cors:
    enabled: true
    allowOrigins: "${ALLOWED_ORIGINS}"
    allowMethods: "GET, PUT, POST, DELETE, PATCH, OPTIONS"
    allowHeaders: "DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization"
    allowCredentials: "true"
    maxAge: "1728000"

config:
  app:
    deploy: "${DEPLOY_VALUE}"
    remote: "${REMOTE_VALUE}"
    autoSubmit: "${AUTO_SUBMIT_VALUE}"
    migrate: "${MIGRATE_VALUE}"
    image: "${IMAGE_VALUE}"
    settlementContractAddress: "${SETTLEMENT_CONTRACT_ADDRESS}"
    rpcProvider: "${RPC_PROVIDER}"
  mongodb:
    enabled: true
    image:
      repository: mongo
      tag: latest
    port: 27017
    persistence:
      enabled: true
      storageClassName: csi-disk  
      size: 10Gi
  redis:
    enabled: true
    image:
      repository: redis
      tag: 7.4.2
    port: 6379
    resources:
      requests:
        memory: "1Gi"
        cpu: "250m"
      limits:
        memory: "2Gi"
        cpu: "500m"
  merkle:
    enabled: true
    image:
      repository: sinka2022/zkwasm-merkleservice
      tag: v1
    port: 3030

service:
  type: ClusterIP
  port: 3000

# 初始化容器配置
initContainer:
  enabled: true
  image: node:18-slim

resources:
  limits:
    cpu: 1000m
    memory: 2Gi
  requests:
    cpu: 500m
    memory: 1Gi

nodeSelector: {}
tolerations: []
affinity: {}
EOL

cat > ${CHART_PATH}/templates/deployment.yaml << EOL
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "${CHART_NAME}.fullname" . }}-rpc
  labels:
    {{- include "${CHART_NAME}.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      {{- include "${CHART_NAME}.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "${CHART_NAME}.selectorLabels" . | nindent 8 }}
    spec:
      containers:
      - name: app
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
        command: ["node"]
        args: ["--experimental-modules", "--es-module-specifier-resolution=node", "ts/src/service.js"]
        env:
        - name: URI
          value: mongodb://{{ include "${CHART_NAME}.fullname" . }}-mongodb:{{ .Values.config.mongodb.port }}
        - name: REDISHOST
          value: {{ include "${CHART_NAME}.fullname" . }}-redis
        - name: REDIS_PORT
          value: "{{ .Values.config.redis.port }}"
        - name: MERKLE_SERVER
          value: http://{{ include "${CHART_NAME}.fullname" . }}-merkle:{{ .Values.config.merkle.port }}
        - name: SERVER_ADMIN_KEY
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: SERVER_ADMIN_KEY
        - name: USER_ADDRESS
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: USER_ADDRESS
        - name: USER_PRIVATE_ACCOUNT
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: USER_PRIVATE_ACCOUNT
        - name: DEPLOY
          value: "{{ .Values.config.app.deploy | default "" }}"
        - name: REMOTE
          value: "{{ .Values.config.app.remote | default "" }}"
        - name: AUTO_SUBMIT
          value: "{{ .Values.config.app.autoSubmit | default "" }}"
        - name: MIGRATE
          value: "{{ .Values.config.app.migrate | default "" }}"
        - name: IMAGE
          value: "{{ .Values.config.app.image | default "" }}"
        - name: SETTLEMENT_CONTRACT_ADDRESS
          value: "{{ .Values.config.app.settlementContractAddress | default "" }}"
        - name: RPC_PROVIDER
          value: "{{ .Values.config.app.rpcProvider | default "" }}"
        ports:
        - containerPort: 3000
          name: http
        resources:
          {{- toYaml .Values.resources | nindent 10 }}
EOL

cat > ${CHART_PATH}/templates/service.yaml << EOL
apiVersion: v1
kind: Service
metadata:
  name: {{ include "${CHART_NAME}.fullname" . }}-rpc
  labels:
    {{- include "${CHART_NAME}.labels" . | nindent 4 }}
spec:
  type: {{ .Values.service.type }}
  ports:
    - port: {{ .Values.service.port }}
      targetPort: http
      protocol: TCP
      name: http
  selector:
    {{- include "${CHART_NAME}.selectorLabels" . | nindent 4 }}
EOL

cat > ${CHART_PATH}/templates/NOTES.txt << EOL
1. Get the application URL by running these commands:
{{- if contains "NodePort" .Values.service.type }}
  export NODE_PORT=\$(kubectl get --namespace {{ .Release.Namespace }} -o jsonpath="{.spec.ports[0].nodePort}" services {{ include "${CHART_NAME}.fullname" . }})
  export NODE_IP=\$(kubectl get nodes --namespace {{ .Release.Namespace }} -o jsonpath="{.items[0].status.addresses[0].address}")
  echo http://\$NODE_IP:\$NODE_PORT
{{- else if contains "LoadBalancer" .Values.service.type }}
  NOTE: It may take a few minutes for the LoadBalancer IP to be available.
        You can watch the status of by running 'kubectl get --namespace {{ .Release.Namespace }} svc -w {{ include "${CHART_NAME}.fullname" . }}'
  export SERVICE_IP=\$(kubectl get svc --namespace {{ .Release.Namespace }} {{ include "${CHART_NAME}.fullname" . }} --template "{{"{{ range (index .status.loadBalancer.ingress 0) }}{{.}}{{ end }}"}}")
  echo http://\$SERVICE_IP:{{ .Values.service.port }}
{{- else if contains "ClusterIP" .Values.service.type }}
  export POD_NAME=\$(kubectl get pods --namespace {{ .Release.Namespace }} -l "app.kubernetes.io/name={{ include "${CHART_NAME}.name" . }},app.kubernetes.io/instance={{ .Release.Name }}" -o jsonpath="{.items[0].metadata.name}")
  export CONTAINER_PORT=\$(kubectl get pod --namespace {{ .Release.Namespace }} \$POD_NAME -o jsonpath="{.spec.containers[0].ports[0].containerPort}")
  echo "Visit http://127.0.0.1:8080 to use your application"
  kubectl --namespace {{ .Release.Namespace }} port-forward \$POD_NAME 8080:\$CONTAINER_PORT
{{- end }}
EOL

cat > ${CHART_PATH}/Chart.yaml << EOL
apiVersion: v2
name: ${CHART_NAME}
description: A Helm chart for HelloWorld Rollup service
type: application
version: 0.1.0
appVersion: "1.0.0"
EOL

cat > ${CHART_PATH}/.helmignore << EOL
# Patterns to ignore when building packages.
*.tgz
.git
.gitignore
.idea/
*.tmproj
.vscode/
EOL

cat > ${CHART_PATH}/templates/mongodb-deployment.yaml << EOL
{{- if .Values.config.mongodb.enabled }}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "${CHART_NAME}.fullname" . }}-mongodb
  labels:
    {{- include "${CHART_NAME}.labels" . | nindent 4 }}
spec:
  selector:
    matchLabels:
      app: {{ include "${CHART_NAME}.fullname" . }}-mongodb
  template:
    metadata:
      labels:
        app: {{ include "${CHART_NAME}.fullname" . }}-mongodb
    spec:
      containers:
      - name: mongodb
        image: "{{ .Values.config.mongodb.image.repository }}:{{ .Values.config.mongodb.image.tag }}"
        ports:
        - containerPort: {{ .Values.config.mongodb.port }}
        volumeMounts:
        - name: mongodb-data
          mountPath: /data/db
      volumes:
      - name: mongodb-data
        persistentVolumeClaim:
          claimName: {{ include "${CHART_NAME}.fullname" . }}-mongodb-pvc
{{- end }}
EOL

cat > ${CHART_PATH}/templates/redis-deployment.yaml << EOL
{{- if .Values.config.redis.enabled }}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "${CHART_NAME}.fullname" . }}-redis
  labels:
    {{- include "${CHART_NAME}.labels" . | nindent 4 }}
spec:
  selector:
    matchLabels:
      app: {{ include "${CHART_NAME}.fullname" . }}-redis
  template:
    metadata:
      labels:
        app: {{ include "${CHART_NAME}.fullname" . }}-redis
    spec:
      containers:
      - name: redis
        image: "{{ .Values.config.redis.image.repository }}:{{ .Values.config.redis.image.tag }}"
        ports:
        - containerPort: {{ .Values.config.redis.port }}
        resources:
          {{- toYaml .Values.config.redis.resources | nindent 10 }}
{{- end }}
EOL

cat > ${CHART_PATH}/templates/merkle-deployment.yaml << EOL
{{- if .Values.config.merkle.enabled }}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "${CHART_NAME}.fullname" . }}-merkle
  labels:
    {{- include "${CHART_NAME}.labels" . | nindent 4 }}
spec:
  selector:
    matchLabels:
      app: {{ include "${CHART_NAME}.fullname" . }}-merkle
  template:
    metadata:
      labels:
        app: {{ include "${CHART_NAME}.fullname" . }}-merkle
    spec:
      containers:
      - name: merkle
        image: "{{ .Values.config.merkle.image.repository }}:{{ .Values.config.merkle.image.tag }}"
        command: ["./target/release/csm_service"]
        args: ["--uri", "mongodb://{{ include "${CHART_NAME}.fullname" . }}-mongodb:{{ .Values.config.mongodb.port }}"]
        ports:
        - containerPort: {{ .Values.config.merkle.port }}
        env:
        - name: URI
          value: mongodb://{{ include "${CHART_NAME}.fullname" . }}-mongodb:{{ .Values.config.mongodb.port }}
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
{{- end }}
EOL

cat > ${CHART_PATH}/templates/mongodb-pvc.yaml << EOL
{{- if and .Values.config.mongodb.enabled .Values.config.mongodb.persistence.enabled }}
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: {{ include "${CHART_NAME}.fullname" . }}-mongodb-pvc
  labels:
    {{- include "${CHART_NAME}.labels" . | nindent 4 }}
  annotations:
    "helm.sh/resource-policy": keep
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: {{ .Values.config.mongodb.persistence.size }}
  storageClassName: {{ .Values.config.mongodb.persistence.storageClassName }}
{{- end }}
EOL

cat > ${CHART_PATH}/templates/mongodb-service.yaml << EOL
apiVersion: v1
kind: Service
metadata:
  name: {{ include "${CHART_NAME}.fullname" . }}-mongodb
  labels:
    {{- include "${CHART_NAME}.labels" . | nindent 4 }}
spec:
  ports:
    - port: {{ .Values.config.mongodb.port }}
      targetPort: {{ .Values.config.mongodb.port }}
      protocol: TCP
      name: mongodb
  selector:
    app: {{ include "${CHART_NAME}.fullname" . }}-mongodb
EOL

cat > ${CHART_PATH}/templates/merkle-service.yaml << EOL
apiVersion: v1
kind: Service
metadata:
  name: {{ include "${CHART_NAME}.fullname" . }}-merkle
  labels:
    {{- include "${CHART_NAME}.labels" . | nindent 4 }}
spec:
  ports:
    - port: {{ .Values.config.merkle.port }}
      targetPort: {{ .Values.config.merkle.port }}
      protocol: TCP
      name: http
  selector:
    app: {{ include "${CHART_NAME}.fullname" . }}-merkle
EOL

cat > ${CHART_PATH}/templates/redis-service.yaml << EOL
apiVersion: v1
kind: Service
metadata:
  name: {{ include "${CHART_NAME}.fullname" . }}-redis
  labels:
    {{- include "${CHART_NAME}.labels" . | nindent 4 }}
spec:
  ports:
    - port: {{ .Values.config.redis.port }}
      targetPort: {{ .Values.config.redis.port }}
      protocol: TCP
      name: redis
  selector:
    app: {{ include "${CHART_NAME}.fullname" . }}-redis
EOL

cat > ${CHART_PATH}/templates/ingress.yaml << EOL
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ include "${CHART_NAME}.fullname" . }}
  labels:
    {{- include "${CHART_NAME}.labels" . | nindent 4 }}
  annotations:
    kubernetes.io/ingress.class: nginx
    {{- if .Values.ingress.cors.enabled }}
    nginx.ingress.kubernetes.io/cors-allow-origin: "{{ .Values.ingress.cors.allowOrigins }}"
    nginx.ingress.kubernetes.io/cors-allow-methods: "{{ .Values.ingress.cors.allowMethods }}"
    nginx.ingress.kubernetes.io/cors-allow-headers: "{{ .Values.ingress.cors.allowHeaders }}"
    nginx.ingress.kubernetes.io/cors-allow-credentials: "{{ .Values.ingress.cors.allowCredentials }}"
    nginx.ingress.kubernetes.io/cors-max-age: "{{ .Values.ingress.cors.maxAge }}"
    {{- end }}
    cert-manager.io/cluster-issuer: letsencrypt-prod
    {{- with .Values.ingress.annotations }}
    {{- toYaml . | nindent 4 }}
    {{- end }}
spec:
  {{- if .Values.ingress.tls.enabled }}
  tls:
  - hosts:
    - "{{ .Values.ingress.domain.prefix }}.{{ .Release.Namespace }}.{{ .Values.ingress.domain.base }}"
    secretName: "{{ .Release.Name }}-tls"
  {{- end }}
  rules:
  - host: "{{ .Values.ingress.domain.prefix }}.{{ .Release.Namespace }}.{{ .Values.ingress.domain.base }}"
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: {{ include "${CHART_NAME}.fullname" . }}-rpc
            port:
              number: {{ .Values.service.port }}
EOL

mkdir -p ts

cat > ts/publish.sh << EOL
#!/bin/bash

# 加载环境变量
if [ -f .env ]; then
  echo "Loading environment variables from .env file"
  source .env
elif [ -f ../.env ]; then
  echo "Loading environment variables from parent directory .env file"
  source ../.env
else
  echo "No .env file found"
fi

PUBLISH_CMD="node ./node_modules/zkwasm-service-cli/dist/index.js addimage -r \"https://rpc.zkwasmhub.com:8090\" -p \"./node_modules/zkwasm-ts-server/src/application/application_bg.wasm\" -u \"\${USER_ADDRESS}\" -x \"\${USER_PRIVATE_ACCOUNT}\" -d \"Multi User App\" -c 22 --auto_submit_network_ids ${CHAIN_ID} -n \"${CHART_NAME}\" --creator_only_add_prove_task true"

if [ "${MIGRATE_VALUE}" = "TRUE" ] || [ "${MIGRATE_VALUE}" = "true" ]; then
  if [ -n "${MIGRATE_IMAGE_VALUE}" ]; then
    echo "Migration enabled, adding import_data_image parameter with value: ${MIGRATE_IMAGE_VALUE}"
    PUBLISH_CMD="\${PUBLISH_CMD} --import_data_image ${MIGRATE_IMAGE_VALUE}"
  else
    echo "Warning: Migration is enabled but MIGRATE_IMAGE_VALUE is not set"
  fi
fi

# 执行命令
eval \${PUBLISH_CMD}
EOL

chmod +x ts/publish.sh

chmod +x scripts/generate-helm.sh

echo "Helm chart generated successfully at ${CHART_PATH}"
echo "Publish script generated at ts/publish.sh" 