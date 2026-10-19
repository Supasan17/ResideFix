# Deploying ResideFix on an Ubuntu lab PC

Two options. **Option A (Docker) is recommended**: fewer steps and the same setup on every machine.
Commands assume Ubuntu 22.04 or 24.04 and a user with `sudo`.

First find the lab PC's IP address; other computers will use it:

```bash
hostname -I
```

The examples below use `192.168.1.50`. Replace it with your own IP everywhere.

---

## Option A: Docker (recommended)

### 1. Install Git and Docker

```bash
sudo apt update
sudo apt install -y git ca-certificates curl
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
docker --version && docker compose version
```

### 2. Get the code

```bash
cd ~
git clone https://github.com/Supasan17/ResideFix.git
cd ResideFix
```

### 3. Configure

```bash
cp .env.example .env
nano .env
```

Change `192.168.1.50` to your IP in `VITE_API_URL` and `CLIENT_ORIGIN`, and set `JWT_SECRET` to a random value (`openssl rand -hex 32` prints one). Save with `Ctrl+O`, `Enter`, `Ctrl+X`.

### 4. Build and start

```bash
docker compose up -d --build
docker compose ps
```

All three services should show `running` (the server and mongo also show `healthy` after ~30 s).

### 5. Load sample data (optional)

```bash
docker compose exec server node src/scripts/seed.js
```

### 6. Open it

- On the lab PC: http://localhost:8080
- From other PCs on the network: http://192.168.1.50:8080
- API health: http://192.168.1.50:5000/api/health

If other PCs cannot connect and the firewall is on:

```bash
sudo ufw allow 8080/tcp
sudo ufw allow 5000/tcp
```

### Everyday commands

| Task | Command |
| --- | --- |
| See logs | `docker compose logs -f server` |
| Stop | `docker compose down` |
| Start again | `docker compose up -d` |
| Update to latest code | `git pull && docker compose up -d --build` |
| Wipe the database too | `docker compose down -v` |

The containers use `restart: unless-stopped`, so they come back automatically after the PC reboots.

---

## Option B: Without Docker (Node + MongoDB + PM2 + nginx)

### 1. Install Node.js 22, Git and nginx

```bash
sudo apt update
sudo apt install -y git curl nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
```

### 2. Install MongoDB 7

```bash
sudo apt install -y gnupg
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl enable --now mongod
```

(MongoDB 7 publishes packages for Ubuntu 22.04 "jammy". On 24.04, if `apt` cannot find the package, replace `$(lsb_release -cs)` with `jammy`, or use Option A.)

### 3. Get the code and configure the API

```bash
cd ~
git clone https://github.com/Supasan17/ResideFix.git
cd ResideFix/residefix-server
cp .env.example .env
nano .env
```

Set:

```
NODE_ENV=production
JWT_SECRET=<output of: openssl rand -hex 32>
CLIENT_ORIGIN=http://192.168.1.50,http://localhost
```

Install, seed and start it with PM2 (keeps it running and restarts it on reboot):

```bash
npm ci --omit=dev
node src/scripts/seed.js
sudo npm install -g pm2
pm2 start src/server.js --name residefix-api
pm2 save
pm2 startup        # run the sudo command it prints
```

### 4. Build the client

```bash
cd ~/ResideFix/residefix-client
echo "VITE_API_URL=http://192.168.1.50/api" > .env
npm ci
npm run build
sudo mkdir -p /var/www/residefix
sudo cp -r dist/* /var/www/residefix/
```

### 5. Configure nginx (serves the client and forwards /api to Node)

```bash
sudo nano /etc/nginx/sites-available/residefix
```

Paste:

```nginx
server {
    listen 80;
    server_name _;
    root /var/www/residefix;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/residefix /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
sudo ufw allow 'Nginx HTTP'
```

### 6. Open it

http://192.168.1.50 (and the API at http://192.168.1.50/api/health).

### Updating

```bash
cd ~/ResideFix && git pull
cd residefix-server && npm ci --omit=dev && pm2 restart residefix-api
cd ../residefix-client && npm ci && npm run build && sudo cp -r dist/* /var/www/residefix/
```

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Page loads but login says "Cannot reach the server" | `VITE_API_URL` points to an address the browser can't reach. Use the lab IP, not `localhost`, then rebuild the client (`docker compose up -d --build`). |
| Browser console shows a CORS error | Add the exact address in the browser's address bar (e.g. `http://192.168.1.50:8080`) to `CLIENT_ORIGIN`, then restart the server. |
| `permission denied ... docker.sock` | Run `newgrp docker` or log out and back in after `usermod`. |
| Port 5000/8080 already in use | `sudo lsof -i :5000` to find the process, or change the left-hand port in `docker-compose.yml`. |
| API exits with "MongoDB connection failed" | Docker: `docker compose logs mongo`. Manual: `sudo systemctl status mongod`. |
| Lab IP changes after reboot | Update `.env` with the new IP and rebuild, or ask the lab admin for a fixed IP. |
