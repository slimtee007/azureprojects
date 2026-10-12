# AzureDrop

**Secure cloud file storage platform** — upload, view, search, download, share and delete files from a clean web interface. File bytes live in **Azure Blob-compatible storage** (Azurite emulator locally and on the demo host; real Azure Blob Storage is the target design). **PostgreSQL** stores users, file metadata and share records.

> **Target architecture: Azure. Local storage emulation: Azurite. Live demonstration host: AWS EC2, because Azure credits/a subscription were unavailable.** AzureDrop remains Azure-oriented: the Azure infrastructure is defined and validated with Terraform, and Azure Blob is emulated with Azurite everywhere the app runs today. We do **not** claim a real Azure deployment unless an Azure subscription becomes available. This distinction must stay clear in the README and presentation.

---

## Architecture at a glance

```
USER BROWSER
    |
    v
React / Vite Frontend  -------------------------------\
    |                                                   |
    | HTTPS / API                                       | signed short-lived
    v                                                   | Blob URLs
Node.js / Express API                                   |
   |                    |                               |
   | metadata           | file objects                  |
   v                    v                               |
PostgreSQL         Azure Blob API                      |
                       |                                |
                       +-- Local/Demo: Azurite <--------/
                       +-- Target Azure: Blob Storage
```

**LIVE DEMO:** AWS EC2 hosts Nginx + Docker containers (API, PostgreSQL, Azurite, frontend). Only Nginx (80/443) is public — the database and blob emulator stay on the private Docker network.

## Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Frontend | React + Vite | Login, dashboard, storage, sharing UI |
| Backend | Node.js + Express | Authentication, file APIs, validation, health checks |
| Database | PostgreSQL | Users, file metadata, share tokens and expiry |
| Object storage | Azure Blob SDK + Azurite | File object storage (Azurite emulates Azure Blob) |
| Containers | Docker + Compose | Consistent local/production runtime |
| IaC | Terraform | Azure target design + AWS demo infrastructure |
| Orchestration | Kubernetes / Minikube | Deployment manifests and cluster practice |
| CI/CD | GitHub Actions | Tests, lint/build, Terraform validate, deploy |
| Live host | AWS EC2 + Nginx | Public capstone demo when Azure credits are unavailable |

## Features

- **Register / login** — bcrypt password hashing, JWT-authenticated API routes
- **Upload** — Multer validates size/type; bytes go to Blob/Azurite, metadata to PostgreSQL
- **List / search** — fast metadata search by file name
- **Download** — authorized requests return a short-lived signed Blob URL
- **Share** — expiring share links that anyone can open; owners can revoke them
- **Delete** — removes the blob object and its metadata
- **Health** — `/health` checks PostgreSQL **and** blob storage, returns 503 when either fails

## Repository layout

```
.
├── backend/                 # Node.js + Express API (Jest tests included)
├── frontend/                # React + Vite app (production build served by Nginx)
├── docker-compose.yml       # Local stack: API + PostgreSQL + Azurite
├── docker-compose.prod.yml  # Production stack (+ frontend/Nginx) for the demo host
├── terraform/
│   ├── azure/               # Azure target design (validate without credentials)
│   └── aws/                 # AWS EC2 demo host
├── deploy/kubernetes/       # Kustomize base + local (Minikube) overlay
├── .github/workflows/       # CI (tests/build/validate) and EC2 deploy
└── docs/                    # Demo script and team references
```

## Quick start (local development)

Prerequisites: **Git**, **Node.js 22+**, **Docker + Compose plugin**, `curl`, `jq` — see `docs/` for the full workstation setup.

```bash
# 1. Get the code
git clone https://github.com/slimtee007/azureprojects.git
cd azureprojects

# 2. Configure environment
cp .env.example .env
#    set a strong JWT_SECRET (e.g. openssl rand -hex 32)

# 3. Start PostgreSQL, Azurite and the API
docker compose up -d --build
docker compose ps

# 4. Check dependency health (database + storage must both be healthy)
curl -s http://localhost:5001/health | jq .

# 5. Start the frontend
cd frontend
npm ci
npm run dev
#    open http://localhost:5173
```

The frontend calls the API at `http://localhost:5001` (`VITE_API_BASE_URL`).

### Run the backend tests

`npm test` boots an embedded PostgreSQL and Azurite automatically (no Docker
required) and runs the full integration suite — auth, upload, search, signed
downloads, share/revoke and health:

```bash
cd backend
npm ci
npm test
```

### Quick functional test

1. Create/login to a test account.
2. Upload a TXT, image or PDF under the size limit.
3. Search/filter it, download it and create a temporary share link.
4. Open the share link, revoke it and confirm it stops working.
5. Delete the test file.
6. Optional outage demo — watch `/health` react to a dependency outage:

```bash
docker stop azuredrop-azurite
curl -i http://localhost:5001/health   # 503, storage: unhealthy
docker start azuredrop-azurite
curl -i http://localhost:5001/health   # 200, healthy again
```

## How it works

| User action | Behind the scenes |
| --- | --- |
| Register/Login | API validates input, bcrypt protects passwords, JWT authenticates later requests |
| Upload | Multer validates size/type; backend uploads bytes to Blob/Azurite and saves metadata in PostgreSQL |
| List/Search | Frontend calls the file API; PostgreSQL returns metadata |
| Download | Backend authorizes access and returns a short-lived signed Blob URL |
| Share | Backend creates an expiring share record/token and a public download URL |
| Revoke | Share record becomes unusable |
| Delete | Backend removes the blob object and the database metadata |
| Health | `/health` checks PostgreSQL + Blob storage; 503 if either fails |

## Environment variables

Copy `.env.example` — it documents every variable. Highlights:

| Variable | Meaning |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (`postgres` host inside Docker) |
| `JWT_SECRET` | Long random string signing JWTs — required in production |
| `CORS_ORIGINS` | Allowed browser origins (comma-separated) |
| `PUBLIC_BASE_URL` | Public base URL used when building share links |
| `AZURE_STORAGE_CONNECTION_STRING` | Blob connection (Azurite dev account locally) |
| `AZURE_STORAGE_PUBLIC_BASE_URL` | Browser-reachable base for signed URLs |
| `AZURE_STORAGE_CONTAINER` | Private blob container name |
| `MAX_UPLOAD_BYTES` / `SHARE_TTL_MINUTES` / `SIGNED_URL_TTL_MINUTES` | Limits & TTLs |

**Never commit `.env`, passwords, keys, PEM files or cloud credentials.**

## Terraform (Azure design + AWS demo)

The Azure target can be written and validated locally **without** an Azure
subscription. `terraform plan/apply` needs real credentials — we never fabricate
successful Azure apply output.

```bash
# Azure target design
cd terraform/azure
terraform init
terraform fmt -recursive
terraform validate

# AWS demo host (needs AWS credentials to plan/apply)
cd ../aws
terraform init
terraform fmt -recursive
terraform validate
terraform plan
terraform apply
```

CI enforces `terraform fmt -check -recursive` and `terraform validate` for
both stacks on every pull request.

**Azure target resources:** Resource Group, VNet + subnets, NSG, Linux VM,
Storage Account + private Blob container, PostgreSQL Flexible Server
(VNet-integrated), system-assigned Managed Identity on the VM and RBAC
(*Storage Blob Data Contributor*) so the VM authenticates without stored
access keys.

**AWS demo resources:** VPC/subnet/security group (SSH from the admin IP,
HTTP/HTTPS from the internet) and a small Ubuntu EC2 instance whose public
IP/DNS is the live demo address.

## Kubernetes / Minikube

```bash
minikube start --cpus=4 --memory=6144
eval $(minikube docker-env)
docker build -t azuredrop-api:local backend
docker build -t azuredrop-frontend:local frontend

kubectl apply -k deploy/kubernetes/overlays/local
kubectl get pods,svc,pvc -n azuredrop
kubectl rollout status deployment/azuredrop-api -n azuredrop

minikube service azuredrop-frontend --url
```

Manifests cover Namespace, Deployments (API, frontend, Azurite), a StatefulSet
for PostgreSQL with PVC storage, Services, ConfigMap and Secrets. Production
secrets never go into Git — use `deploy/kubernetes/base/secret.example.yaml`
out-of-band or a secret manager.

## AWS EC2 live deployment

Because Azure student credits are unavailable, AWS hosts the live
demonstration. AWS is the host; AzureDrop still uses Azure Blob-compatible
APIs through Azurite.

```
Internet → :80/:443 → Nginx → / (React static) and /api,/health → azuredrop-api
                                   Docker private network: PostgreSQL · Azurite
```

1. Provision the host with `terraform/aws` (SSH from the admin IP only).
2. Install Git + Docker + Compose, clone the repo, create production `.env`.
3. `docker compose -f docker-compose.prod.yml up -d --build`
4. Set production URLs: `CORS_ORIGINS`, `PUBLIC_BASE_URL` and
   `AZURE_STORAGE_PUBLIC_BASE_URL=https://your-domain.example/devstoreaccount1`
   (Nginx proxies that path to Azurite so port 10000 stays private).
5. `curl -s https://your-domain.example/health | jq .`
6. Add HTTPS with Let's Encrypt/Certbot or another approved TLS method.

## CI/CD

Every pull request runs **GitHub Actions**: backend Jest tests against live
PostgreSQL + Azurite service containers plus a `/health` smoke test, frontend
lint and production build, Terraform `validate` for both stacks and Docker
image builds. Merging happens only when checks are green
(`gh pr checks --watch`). Deployment to the EC2 demo host runs on `main` and
verifies `/health` after updating the containers. Secrets live in GitHub
Actions Secrets — never in workflow YAML.

## Security

- Passwords: bcrypt hashes only; JWT on protected routes; long random production `JWT_SECRET`
- CORS limited to approved frontend origins
- Private blob container; short-lived signed downloads/shares; revocable share tokens
- File extension/MIME/size validation on upload
- PostgreSQL and Azurite stay private; only Nginx 80/443 is public
- Azure target: Managed Identity + RBAC instead of storage access keys
- `/health` returns 503 when a dependency fails

## Troubleshooting

| Problem | First checks |
| --- | --- |
| Frontend cannot log in | `VITE_API_BASE_URL`, backend port, `CORS_ORIGINS`, browser Network tab |
| API unhealthy | `curl /health`, then PostgreSQL and Azurite containers |
| Upload fails | File size/type rules, API logs, Azurite health |
| Database connection refused | `DATABASE_URL` + `docker compose ps` (inside Docker the host is `postgres`, not `localhost`) |
| Blob unavailable | `AZURE_STORAGE_CONNECTION_STRING`, `azuredrop-azurite` container |
| CI fails | Reproduce the failing job's exact command locally |
| Kubernetes pod crashes | `kubectl logs` / `kubectl describe pod`, env/secrets, DB service name |
| EC2 site unreachable | Security group, Nginx, Docker containers, DNS |

More: `docker compose logs --tail=100 backend`, `docker stats`.

## Demo & submission

See [`docs/demo-script.md`](docs/demo-script.md) for the 5-minute demonstration flow and [`docs/slides-outline.md`](docs/slides-outline.md) for the presentation structure. The final wording to keep consistent everywhere:

> **Target architecture: Azure. Local storage emulation: Azurite. Live demonstration host: AWS EC2 because Azure credits/subscription were unavailable.**
