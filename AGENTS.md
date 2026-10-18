# Instructions de Déploiement & Architecture LiveFX Academy (Pour tous les Agents IA)

## ⚠️ RÈGLE CRITIQUE DE DÉPLOIEMENT CPANEL (`gptservers.cloud`)

Sur le serveur de production cPanel (`katdscho@rs7-lon`) :
1. **Dossier du dépôt Git & Backend Node.js (`api.livefx-trading.com`)** :
   - Le serveur Node.js Phusion Passenger / LiteSpeed de `api.livefx-trading.com` est rattaché à **`~/repos/livefxacademy/backend`** (et **NON** `~/livefxacademy/backend`).
   - Il ne faut **jamais** lancer `npm run build` sur le serveur cPanel car la limite RAM CloudLinux LVE coupe `esbuild`.
   - `npm` n'est pas dans le `$PATH` global bash par défaut sur cPanel.

2. **Procédure obligatoire côté Agent avant de donner les commandes à l'utilisateur** :
   - Compiler le frontend en local : `npm --prefix frontend run build`
   - Créer l'archive ZIP avec des slashs POSIX (`/`) compatibles Linux `unzip` :
     ```powershell
     tar -a -cf frontend/dist.zip -C frontend/dist .
     ```
   - Commiter tous les fichiers (y compris `frontend/dist.zip`) et pousser sur GitHub (`git push origin main`).

3. **Commande unique à fournir à l'utilisateur pour le terminal cPanel (`gptservers.cloud`)** :
   ```bash
   cd ~/repos/livefxacademy && \
   git fetch origin main && \
   git reset --hard origin/main && \
   unzip -o frontend/dist.zip -d ~/livefx-trading.com/ && \
   mkdir -p ~/repos/livefxacademy/backend/tmp && \
   touch ~/repos/livefxacademy/backend/tmp/restart.txt && \
   pkill -u katdscho -f lsnode || pkill -u katdscho -f node || true
   ```
   *(Optionnel : si `~/livefxacademy` existe aussi, ce script met directement à jour `~/repos/livefxacademy` qui alimente à la fois le backend `api.livefx-trading.com` et le dossier public `~/livefx-trading.com/`).*
