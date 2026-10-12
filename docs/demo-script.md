# AzureDrop — 5-minute demo script

Keep this wording consistent: **Target architecture: Azure. Local storage
emulation: Azurite. Live demonstration host: AWS EC2 because Azure
credits/subscription were unavailable.**

## Demo order

1. **Architecture** — show the diagram and explain "Azure target + AWS demo host":
   the API speaks the Azure Blob SDK; Azurite emulates Azure Blob locally and on
   the demo host; Terraform defines the real Azure target (validated, not
   deployed).
2. **Repository & CI** — GitHub repo, branches/PRs, green GitHub Actions
   (backend tests against PostgreSQL + Azurite, frontend lint/build, Terraform
   validate, image builds).
3. **Live app** — open the site, register/login.
4. **Files** — upload a file, search for it, download it (short-lived signed URL).
5. **Sharing** — create a temporary share link, open it in a private window,
   revoke it and show it stops working.
6. **Health** — show `/health` (database + storage checks). Optional: stop the
   Azurite container, refresh `/health` (503), start it again (200).
7. **Terraform** — walk through `terraform/azure` (target design) and
   `terraform/aws` (demo host); show `terraform validate` output.
8. **Kubernetes** — show manifests under `deploy/kubernetes/` and the Minikube
   procedure (live or via screenshots).

## Talking points

- **Security:** bcrypt + JWT, private blob container, signed URLs, revocable
  expiring shares, upload validation, private data tier, Managed Identity +
  RBAC in the Azure target design instead of access keys.
- **Persistence:** PostgreSQL and Azurite use Docker volumes — data survives
  container restarts.
- **Honesty:** we validate the Azure design with Terraform and emulate Azure
  Blob with Azurite; the live host is AWS EC2, clearly labelled as such.

## Capture checklist (screenshots)

- [ ] Architecture diagram
- [ ] Green GitHub Actions run
- [ ] Live app login/dashboard
- [ ] Upload + search + download
- [ ] Share link created, opened, revoked
- [ ] `/health` 200 (and optional 503 outage demo)
- [ ] `terraform validate` output
- [ ] Kubernetes pods/Minikube (if included)
