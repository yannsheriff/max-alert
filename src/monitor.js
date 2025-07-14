const axios = require("axios");
const cron = require("node-cron");
const winston = require("winston");
const fs = require("fs");
const path = require("path");

// Compteur de notifications
let notificationCount = 0;
const MAX_NOTIFICATIONS = 3;

// Configuration du logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "sncf-monitor" },
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Créer le dossier logs s'il n'existe pas
const logsDir = path.join(__dirname, "..", "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configuration de la requête SNCF
const configPath = path.join(__dirname, "..", "config.json");
let config = {};
try {
  config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
} catch (e) {
  logger.warn(
    "Impossible de lire config.json, utilisation de la date par défaut"
  );
}
const DEPARTURE_DATE = config.departureDateTime || "2025-07-14T00:00:00.000Z";

const SNCF_CONFIG = {
  url: "https://www.maxjeune-tgvinoui.sncf/api/public/refdata/search-freeplaces-proposals",
  params: {
    destination: "FRPLY",
    origin: "FRLPD",
    departureDateTime: DEPARTURE_DATE,
  },
  headers: {
    accept: "application/json",
    "accept-language": "en-US,en;q=0.9,fr-FR;q=0.8,fr;q=0.7",
    dnt: "1",
    priority: "u=1, i",
    referer: "https://www.maxjeune-tgvinoui.sncf/sncf-connect/max-planner",
    "sec-ch-device-memory": "8",
    "sec-ch-ua": '"Not)A;Brand";v="8", "Chromium";v="138"',
    "sec-ch-ua-arch": '"arm"',
    "sec-ch-ua-full-version-list":
      '"Not)A;Brand";v="8.0.0.0", "Chromium";v="138.0.7204.93"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-model": '""',
    "sec-ch-ua-platform": '"macOS"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
    "x-client-app": "MAX_JEUNE",
    "x-client-app-version": "2.34.2",
    "x-distribution-channel": "OUI",
    "x-syg-correlation-id": "51ec8c4a-54a9-45ed-8937-6a69b7862876",
  },
  cookies: {
    didomi_token:
      "eyJ1c2VyX2lkIjoiMTk0NGZmNjQtMDc5My02YTM2LWFkOGItNzNmZGRhNTY4YTI3IiwiY3JlYXRlZCI6IjIwMjUtMDEtMTBUMTE6MjU6MjYuMDA5WiIsInVwZGF0ZWQiOiIyMDI1LTAxLTEwVDExOjI1OjI3LjA4OFoiLCJ2ZW5kb3JzIjp7ImVuYWJsZWQiOlsiYzptaWQiLCJjOmRhdGFkb2ciXX0sInB1cnBvc2VzIjp7ImVuYWJsZWQiOlsibW9uaXRvcmluZyIsImFuYWx5dGljcyJdfSwidmVyc2lvbiI6Mn0=",
    "euconsent-v2": "CQLA94AQLA94AAHABBENBXFgAAAAAAAAAAAAAAAAAAAA.YAAAAAAAAAAA",
    __cf_bm:
      "LmIP80mzH8ANaW7TDgfCHSwAz_S4pM5aDMXMGjsI7BQ-1752400133-1.0.1.1-DTAjLtM05B_rMOWNog3.u4ugy6On.JeoJ7CIvASWFJHLflNpV6SSlODIAm02mRg8oHh0xcNb01FfgKA8gP0GTvbqIYR0hq7aiFHIY8boMdU",
    datadome:
      "~SaJE0U4B5i692KrY1OnIZuYKEt6lMZTmtfHH3M6StXLL6TfI5JjPCncSDbGZ0vyFuxztC9itnZCuPV0PYB544Z7l16D~272H53T3wMMsiD0AlGtmWrwZkYOI0FK24~Y",
    _dd_s:
      "aid=fc5e6cc0-b81c-474b-8ee9-10bfb68e2a4b&rum=0&expire=1752401802955",
  },
};

// Fonction pour envoyer une notification ntfy (format headers explicite)
async function sendNtfyNotification(proposals) {
  try {
    const message =
      `Trouvé ${proposals.length} proposition(s) avec des places disponibles.\n\n` +
      proposals.map((p) => `${p.count} place(s) disponible(s)\n`).join("\n") +
      `\nNotification :  ${notificationCount + 1}/${MAX_NOTIFICATIONS}`;

    await axios.post(
      "https://ntfy.sh/yannsheriff_sncf_max_notifcations_plus",
      message,
      {
        headers: {
          Title: "Places SNCF Disponibles !",
          Priority: "urgent",
          Tags: "train,sncf,alert,success",
        },
      }
    );

    logger.info(
      `Notification ntfy envoyée (${
        notificationCount + 1
      }/${MAX_NOTIFICATIONS})`
    );
    notificationCount++;

    // Si on a atteint le maximum de notifications, arrêter le script
    if (notificationCount >= MAX_NOTIFICATIONS) {
      logger.warn(
        `Maximum de ${MAX_NOTIFICATIONS} notifications atteint. Arrêt du script.`
      );

      // Notification finale
      await axios.post(
        "https://ntfy.sh/yannsheriff_sncf_max_notifcations_plus",
        `🛑 Script SNCF Monitor arrêté automatiquement après ${MAX_NOTIFICATIONS} notifications.\n\nMerci d'avoir utilisé le service !`,
        {
          headers: {
            Title: "Monitoring stopped",
            Priority: "default",
            Tags: "stop,info",
          },
        }
      );
      process.exit(0);
    }
  } catch (error) {
    logger.error("Erreur lors de l'envoi de la notification ntfy", {
      message: error.message,
      status: error.response?.status,
    });
  }
}

// Fonction pour exécuter la requête SNCF
async function checkSNCFAvailability() {
  try {
    logger.info("Début de la vérification des places disponibles SNCF");

    // Construire la chaîne de cookies
    const cookieString = Object.entries(SNCF_CONFIG.cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join("; ");

    // Créer les headers avec les cookies
    const headers = {
      ...SNCF_CONFIG.headers,
      Cookie: cookieString,
    };

    const response = await axios.get(SNCF_CONFIG.url, {
      params: SNCF_CONFIG.params,
      headers: headers,
      timeout: 30000, // 30 secondes de timeout
    });

    // logger.info("Réponse reçue de l'API SNCF", {
    //   status: response.status,
    //   dataLength: JSON.stringify(response.data).length,
    //   timestamp: new Date().toISOString(),
    // });

    // Analyser la réponse pour détecter des places disponibles
    if (response.data && response.data.proposals) {
      const availableProposals = response.data.proposals.filter(
        (proposal) => proposal.count && proposal.count > 0
      );

      if (response.data.proposals.length > 0) {
        logger.warn("🎉 PLACES DISPONIBLES DÉTECTÉES !", {
          count: availableProposals.length,
          proposals: availableProposals.map((p) => ({
            origin: p.dep,
            destination: p.arr,
            departureTime: p.dep,
            availablePlaces: p.count,
          })),
        });

        // Envoyer la notification ntfy
        await sendNtfyNotification(availableProposals);
      } else {
        logger.info("Aucune place disponible trouvée");
      }
    }

    // Sauvegarder la réponse dans un fichier pour debug
    const responseFile = path.join(logsDir, `response_${Date.now()}.json`);
    fs.writeFileSync(responseFile, JSON.stringify(response.data, null, 2));
    logger.debug(`Réponse sauvegardée dans ${responseFile}`);
  } catch (error) {
    logger.error("Erreur lors de la vérification SNCF", {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
    });

    // En cas d'erreur réseau, on peut essayer de relancer plus tard
    if (error.code === "ECONNRESET" || error.code === "ETIMEDOUT") {
      logger.warn("Erreur réseau détectée, nouvelle tentative dans 1 minute");
    }
  }
}

// Fonction pour démarrer le monitoring
async function startMonitoring() {
  logger.info("🚂 Démarrage du monitoring SNCF");
  logger.info("Configuration:", {
    origin: SNCF_CONFIG.params.origin,
    destination: SNCF_CONFIG.params.destination,
    departureDate: SNCF_CONFIG.params.departureDateTime,
    interval: "3 minutes",
  });

  // Notification de démarrage (format ntfy natif)
  try {
    const startMsg =
      `Origine : ${SNCF_CONFIG.params.origin}\n` +
      `Destination : ${SNCF_CONFIG.params.destination}\n` +
      `Date : ${SNCF_CONFIG.params.departureDateTime}\n` +
      `Fréquence : Toutes les 3 minutes\n` +
      `Notifications max : ${MAX_NOTIFICATIONS}`;
    await axios.post(
      "https://ntfy.sh/yannsheriff_sncf_max_notifcations_plus",
      startMsg,
      {
        headers: {
          Title: "Monitoring SNCF démarré",
          Priority: "default",
          Tags: "info,start",
        },
      }
    );
    logger.info("Notification de démarrage envoyée");
  } catch (error) {
    logger.error("Erreur lors de l'envoi de la notification de démarrage", {
      message: JSON.stringify(error),
    });
  }

  // Exécuter immédiatement la première vérification
  checkSNCFAvailability();

  // Programmer l'exécution toutes les 3 minutes
  cron.schedule("*/3 * * * *", () => {
    checkSNCFAvailability();
  });

  logger.info("✅ Monitoring programmé avec succès (toutes les 3 minutes)");
}

// Gestion de l'arrêt propre
process.on("SIGINT", () => {
  logger.info("🛑 Arrêt du monitoring SNCF");
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("🛑 Arrêt du monitoring SNCF");
  process.exit(0);
});

// Démarrer le monitoring
startMonitoring();
