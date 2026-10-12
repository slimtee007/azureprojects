# AzureDrop — slides outline

Target wording for the opening/closing slide:
> **Target architecture: Azure. Local storage emulation: Azurite. Live demonstration host: AWS EC2 because Azure credits/subscription were unavailable.**

## 1. Problem
- Teams and individuals need secure file storage: upload, search, download, temporary sharing
- Requirements: authentication, private-by-default storage, revocable sharing, health visibility

## 2. Solution & architecture
- AzureDrop: React UI → Express API → PostgreSQL (metadata) + Azure Blob (file objects)
- Show the architecture diagram from the README
- Honest hosting story: Azure target design (Terraform) + Azurite emulation + AWS EC2 demo host

## 3. Stack
- React + Vite · Node.js + Express · PostgreSQL · Azure Blob SDK + Azurite
- Docker + Compose · Terraform · Kubernetes/Minikube · GitHub Actions · Nginx

## 4. Security
- bcrypt password hashing, JWT-authenticated routes
- Private blob container, short-lived signed URLs, expiring + revocable share tokens
- Upload validation (extension/MIME/size), CORS allow-list
- Azure target: Managed Identity + RBAC instead of stored access keys
- PostgreSQL and Azurite never public — only Nginx 80/443

## 5. CI/CD
- PR pipeline: backend Jest tests (PostgreSQL + Azurite) + /health smoke test,
  frontend lint/build, Terraform fmt + validate, Docker image builds
- Deploy pipeline on main: updates EC2 containers, verifies /health

## 6. Deployment
- Local: `docker compose up` (API + PostgreSQL + Azurite) + Vite dev server
- Kubernetes: kustomize manifests (Deployments, StatefulSet, Services, PVCs)
- Live: AWS EC2 single host — Nginx + Docker production compose, HTTPS via Certbot

## 7. Challenges
- Emulator vs cloud reality: Azurite API-version skew with the Azure SDK
- Keeping the "Azure target vs AWS demo host" distinction crystal clear
- Signed URLs must be reachable from the browser (public base URL / Nginx proxy path)
- Secrets hygiene across Compose, Kubernetes and GitHub Actions

## 8. Results
- Working demo: register/login → upload → search → download → share → revoke → delete
- Green CI on every PR; Terraform validates; health endpoint proves dependency checks
- Data persists across container restarts (Docker volumes)

## 9. Improvements
- Real Azure subscription: `terraform apply` the Azure design and swap Azurite for Blob
- Domain + TLS everywhere, CDN for downloads, malware scanning on upload
- Secret manager (Azure Key Vault) + managed identity in production
- Observability: metrics/alerts on /health, structured logs
