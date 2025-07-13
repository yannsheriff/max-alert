# SNCF Alert - Monitoring des places disponibles

Script de monitoring automatique pour détecter les places disponibles sur les trains SNCF Max Jeune.

## 🚀 Installation

1. **Installer les dépendances :**

```bash
npm install
```

2. **Lancer le script :**

```bash
npm start
```

## 📋 Configuration

Le script est configuré pour :

- **Origine :** FRLPD (Lyon Part-Dieu)
- **Destination :** FRPLY (Paris Lyon)
- **Date :** 14 juillet 2025
- **Fréquence :** Toutes les 3 minutes

### Modifier la configuration

Pour changer les paramètres, éditez le fichier `src/monitor.js` et modifiez l'objet `SNCF_CONFIG` :

```javascript
const SNCF_CONFIG = {
  url: "https://www.maxjeune-tgvinoui.sncf/api/public/refdata/search-freeplaces-proposals",
  params: {
    destination: "FRPLY", // Code destination
    origin: "FRLPD", // Code origine
    departureDateTime: "2025-07-14T00:00:00.000Z", // Date de départ
  },
  // ... autres configurations
};
```

## 🔧 Fonctionnalités

- ✅ **Monitoring automatique** toutes les 3 minutes
- ✅ **Logging complet** avec Winston
- ✅ **Détection des places disponibles**
- ✅ **Gestion d'erreurs robuste**
- ✅ **Sauvegarde des réponses** pour debug
- ✅ **Arrêt propre** avec Ctrl+C

## 📊 Logs

Les logs sont sauvegardés dans le dossier `logs/` :

- `combined.log` : Tous les logs
- `error.log` : Erreurs uniquement
- `response_*.json` : Réponses de l'API pour debug

## 🚨 Notifications

Le script utilise **ntfy.sh** pour envoyer des notifications push :

- **Notification de démarrage** : Informe que le monitoring a commencé
- **Notifications d'alerte** : Envoyées quand des places sont détectées
- **Notification de fin** : Informe que le script s'est arrêté après 3 notifications

### Configuration ntfy

Le script envoie les notifications à : `https://ntfy.sh/yannsheriff_sncf_max_notifcations_plus`

### Limite de notifications

Le script s'arrête automatiquement après **3 notifications** pour éviter le spam. Vous pouvez modifier `MAX_NOTIFICATIONS` dans le code si nécessaire.

## 🐳 Déploiement sur serveur

### Avec PM2 (recommandé)

1. **Installer PM2 :**

```bash
npm install -g pm2
```

2. **Créer un fichier ecosystem.config.js :**

```javascript
module.exports = {
  apps: [
    {
      name: "sncf-monitor",
      script: "src/monitor.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
```

3. **Démarrer avec PM2 :**

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Avec systemd

1. **Créer un service systemd :**

```bash
sudo nano /etc/systemd/system/sncf-monitor.service
```

2. **Contenu du service :**

```ini
[Unit]
Description=SNCF Monitor
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/sncf-alert
ExecStart=/usr/bin/node src/monitor.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

3. **Activer et démarrer :**

```bash
sudo systemctl enable sncf-monitor
sudo systemctl start sncf-monitor
```

## 🔍 Monitoring

### Vérifier les logs

```bash
# Logs en temps réel
tail -f logs/combined.log

# Erreurs uniquement
tail -f logs/error.log
```

### Statut du service

```bash
# Avec PM2
pm2 status
pm2 logs sncf-monitor

# Avec systemd
sudo systemctl status sncf-monitor
sudo journalctl -u sncf-monitor -f
```

## ⚠️ Notes importantes

- Les cookies et headers peuvent expirer. Surveillez les erreurs 401/403.
- Respectez les conditions d'utilisation de l'API SNCF.
- Le script utilise des User-Agents et headers de navigateur pour éviter la détection.
- Les tokens de cookies peuvent nécessiter une mise à jour périodique.

## 🛠️ Développement

```bash
# Mode développement
npm run dev

# Installer les dépendances de développement
npm install --save-dev nodemon
```

## 📝 Licence

ISC License
