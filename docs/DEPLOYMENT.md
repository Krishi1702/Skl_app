# Deployment

Auto-deploy runs on every push to `Phase1` via [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

```
push to Phase1
   │
   ├─ test      ruff check + pytest (postgres & redis service containers)
   ├─ build     4 images → ghcr.io/krishi1702/skl_app/{backend,frontend,ai-service,nginx}
   │            tagged :<commit-sha> and :latest, layer-cached between runs
   └─ deploy    scp compose file → docker compose pull → up -d --wait
                → ollama pull → curl /health smoke test → prune
```

Pull requests against `Phase1` run **test only** — they never build or deploy.

---

## One-time server setup

A Linux host with Docker Engine and the Compose v2 plugin.

**1. Create the deploy user and app directory**

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG docker deploy
sudo mkdir -p /opt/skl_app && sudo chown deploy:deploy /opt/skl_app
```

**2. Add the CI deploy key**

Generate the keypair on your machine (no passphrase — CI can't type one):

```bash
ssh-keygen -t ed25519 -f skl_deploy_key -N "" -C "github-actions"
```

Append `skl_deploy_key.pub` to `/home/deploy/.ssh/authorized_keys` on the server.
The private half becomes the `SSH_PRIVATE_KEY` secret below.

**3. Create `/opt/skl_app/.env`**

This file lives **only on the server** — it is gitignored and never travels through
CI, so production secrets stay out of GitHub. Base it on `.env.example`, then change:

| Variable | Production value |
|---|---|
| `SECRET_KEY` | 32+ random chars — `openssl rand -hex 32` |
| `POSTGRES_PASSWORD` | a real password (and match it inside `DATABASE_URL`) |
| `MINIO_SECRET_KEY` | a real secret |
| `MINIO_PUBLIC_URL` | `https://your-domain` — nginx proxies `/lessons/` to MinIO |
| `CORS_ORIGINS` | `["https://your-domain"]` |
| `OLLAMA_MODEL` | `llama3.2:1b` (must match what the deploy job pulls) |

`MINIO_PUBLIC_URL` is the one that bites: presigned URLs are generated with this
host and handed to the browser. Leave it as `localhost:9000` and every PDF and
audio link 404s for real users.

**4. Seed the first admin**

Once, after the first successful deploy:

```bash
cd /opt/skl_app
docker compose -f docker-compose.prod.yml exec backend python -m app.db.seed
```

---

## GitHub secrets

`Settings → Secrets and variables → Actions`.

| Secret | Required | Purpose |
|---|---|---|
| `SSH_HOST` | yes | Server IP or hostname |
| `SSH_USER` | yes | e.g. `deploy` |
| `SSH_PRIVATE_KEY` | yes | Contents of `skl_deploy_key` (the private one) |
| `SSH_PORT` | no | Defaults to `22` |
| `APP_DIR` | no | Defaults to `/opt/skl_app` |
| `SSH_KNOWN_HOSTS` | recommended | Output of `ssh-keyscan -H <host>`. Without it the workflow falls back to trust-on-first-use, which is MITM-able on the first connect. |

`GITHUB_TOKEN` is injected automatically — no setup. It authenticates both the
image push and the server's `docker login`, so there's no long-lived registry PAT
to rotate.

---

## Operating it

```bash
cd /opt/skl_app
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
```

**Roll back to a previous commit:**

```bash
IMAGE_TAG=<older-sha> docker compose -f docker-compose.prod.yml up -d
```

Every build is tagged with its commit SHA, so any past commit is one command away.
The deploy job also writes the current `IMAGE_TAG` into `.env`, which means a bare
`docker compose up -d` reuses the exact deployed build rather than drifting to
whatever `:latest` happens to point at.

---

## Notes on how this is wired

**Migrations** run inside `backend/entrypoint.sh` (`alembic upgrade head`) before
uvicorn starts — there is no separate migration step. The `worker` service
deliberately overrides `entrypoint` to skip that script: both containers share the
backend image, and if both ran migrations they would race for the Alembic lock on
every deploy. The backend owns migrations; the worker waits on its healthcheck.

**Alembic revisions must stay tracked in git.** `.gitignore` previously excluded
`backend/alembic/versions/*.py`. CI builds from a clean checkout, so an ignored
revision produces an image with an empty `versions/` directory — `alembic upgrade
head` then succeeds while creating no tables at all, and the app comes up against
an empty schema. That ignore rule has been removed; keep it removed.

**Ports.** Only `80` is public. Postgres, Redis, and the backend are reachable only
on the internal Docker network. The MinIO console binds to `127.0.0.1:9001` — reach
it through a tunnel:

```bash
ssh -L 9001:localhost:9001 deploy@your-server
```

---

## TLS / HTTPS

nginx listens on both `:80` and `:443`. Port 80 keeps two things un-redirected —
`/.well-known/acme-challenge/` (renewal breaks otherwise) and `/health` (so probes
need no certificate) — and 301s everything else to HTTPS.

Certificates live in the `certbot_conf` volume. On startup nginx picks its
certificate this way:

- `/etc/letsencrypt/live/$DOMAIN/` exists → use the real certificate
- otherwise → generate a **self-signed** one under `/etc/nginx/self-signed/$DOMAIN/`
  and use that, so `:443` can bind at all (certbot cannot answer a challenge
  through an nginx that refused to start)

The self-signed cert is deliberately kept **outside** `/etc/letsencrypt`. Certbot
refuses to reuse a `live/` lineage it did not create — it silently issues to
`<domain>-0001` instead, which nginx would never read, leaving the untrusted cert
served forever.

Because the path changes when the real certificate appears, nginx needs a
`restart` (not a `reload`) after first issuance. Renewals keep the same path, so
the 6h reload loop handles those unattended.

### One-time issuance

Requires `DOMAIN` set in `/opt/skl_app/.env`, DNS already pointing at the server,
and port 443 open.

```bash
sudo ufw allow 443/tcp        # if ufw is active

cd /opt/skl_app
docker compose -f docker-compose.prod.yml up -d nginx

# Only if an earlier version wrote a self-signed cert into certbot's directory:
docker compose -f docker-compose.prod.yml run --rm --entrypoint sh certbot -c '
  rm -rf /etc/letsencrypt/live/reader.bharathiyavidyalaya.com \
         /etc/letsencrypt/archive/reader.bharathiyavidyalaya.com \
         /etc/letsencrypt/renewal/reader.bharathiyavidyalaya.com.conf'

docker compose -f docker-compose.prod.yml run --rm certbot \
  certonly --webroot -w /var/www/certbot \
  -d reader.bharathiyavidyalaya.com \
  --email you@example.com --agree-tos --no-eff-email

docker compose -f docker-compose.prod.yml restart nginx
```

Confirm the result — issuer should read `Let's Encrypt`, not your own domain:

```bash
echo | openssl s_client -connect reader.bharathiyavidyalaya.com:443 2>/dev/null \
  | openssl x509 -noout -issuer -dates
```

Add `--staging` first if you're unsure — Let's Encrypt rate-limits to 5 failures
per hostname per hour, and a typo can lock you out for a while. Remove the flag
and re-run once it succeeds.

### Renewal

The `certbot` service wakes every 12h and renews anything within 30 days of
expiry. nginx reloads every 6h to pick up new files, so renewal needs no
intervention. Check status with:

```bash
docker compose -f docker-compose.prod.yml run --rm certbot certificates
```

### After issuing

Switch these in `.env` from `http://` to `https://`, then restart the backend:

```
MINIO_PUBLIC_URL=https://reader.bharathiyavidyalaya.com
CORS_ORIGINS=["https://reader.bharathiyavidyalaya.com"]
```

Leave `MINIO_SECURE=false` — that flag governs the *internal* container hop to
MinIO, which stays plain HTTP inside the Docker network. It is unrelated to the
browser-facing scheme.
