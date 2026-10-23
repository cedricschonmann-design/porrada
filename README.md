# PORRADA

L'appli des pratiquants de JJB et de grappling : construis ton jeu, défie tes partenaires, tiens ton journal et demande les règles aux arbitres.

**Ouvrir l'appli :** https://cedricschonmann-design.github.io/porrada/

## Installer sur iPhone

1. Ouvre le lien ci-dessus dans **Safari**.
2. Touche le bouton **Partager** (le carré avec une flèche vers le haut).
3. Choisis **« Sur l'écran d'accueil »**, puis **Ajouter**.

L'icône PORRADA apparaît comme une vraie appli. Elle marche sans internet et se met à jour toute seule.

## Ce que fait l'appli

| Onglet | Ce qu'on y fait |
|---|---|
| **Mon jeu** | Questionnaire QCM (avec « Autre ») → stratégie : style, debout, plan A, finitions (avec les interdits de ton règlement), plan B, défense prioritaire, focus 4 semaines. À refaire quand le jeu évolue ; les anciennes versions sont gardées. |
| **Amis** | Ajout d'amis par QR code, « Inviter à combattre » (durée du round, Gi / No-Gi), compte à rebours de 10 s sur les deux téléphones, chrono du round, saisie du résultat (points / soumission avec moteur de recherche Kimono / Grappling / match nul), score « 2 – 0 » et palmarès détaillé. |
| **Journal** | Privé. « Commencer le cours » ouvre le mode cours : deux gros boutons « J'ai soumis » / « J'ai été soumis », chrono de round, totaux et soumissions favorites. |
| **Compét.** | Un arbitre par fédération (IBJJF, ADCC, AJP, NAGA, Grappling Industries) : points, durée, pesée, tenue, égalité, pénalités, interdits selon ta ceinture et ton âge. |

## Comment ça marche (sans serveur à payer)

- **Pas de compte** : tout est enregistré sur le téléphone (`localStorage`).
- **Amis** : chacun a un « code ami » (QR) qui contient son identifiant et une clé secrète.
- **Invitations et résultats en direct** : passent par un relais public gratuit (MQTT sur WebSocket, `broker.emqx.io`, secours `broker.hivemq.com`). Chaque message est **chiffré** (AES-GCM) avec la clé de l'ami : le relais ne voit rien.
- **Sans réseau** : le même message s'affiche en QR code, l'autre téléphone le scanne (ou colle le code).
- Le compte à rebours part à la même **heure de départ** sur les deux téléphones.
- La « stratégie IA » est un moteur de règles intégré à l'appli : il marche hors ligne et ne coûte rien.
- **Sauvegarde** : Profil → Exporter (à faire avant de changer de téléphone).

## Organisation du code

```
app/                      ← l'appli publiée (aucune étape de compilation)
  index.html
  manifest.webmanifest    ← nom, icônes, mode plein écran
  sw.js                   ← fonctionnement hors ligne + mise à jour automatique
  css/app.css             ← tout le design (clair / sombre)
  icons/                  ← icônes (main « shaka » strappée)
  fonts/                  ← police Archivo (licence OFL)
  vendor/                 ← qrcode-generator (MIT) et jsQR (Apache-2.0)
  js/
    app.js                ← démarrage, navigation, onglets
    store.js              ← données enregistrées sur le téléphone
    net.js                ← relais en direct (MQTT) + chiffrement + codes QR
    qr.js                 ← affichage et lecture des QR codes (caméra)
    ui.js                 ← boutons, feuilles, sons, écran allumé
    version.js            ← numéro de version (rempli à la publication)
    screens/              ← un fichier par partie de l'appli
    data/
      questionnaire.js    ← questions + moteur de stratégie
      submissions.js      ← répertoire des soumissions (Kimono / Grappling / les deux)
      referees.js         ← règles des fédérations (vérifiées en octobre 2026)
design/icon.svg           ← dessin de l'icône
tests/                    ← tests automatiques
.github/workflows/deploy.yml  ← publication sur GitHub Pages à chaque mise à jour
```

## Modifier l'appli

- Les textes du questionnaire et de la stratégie : `app/js/data/questionnaire.js`.
- Les règles des arbitres : `app/js/data/referees.js` (une fiche par fédération, avec le lien vers la source).
- Les soumissions : `app/js/data/submissions.js`.
- Les couleurs : en haut de `app/css/app.css` (`--accent` = la couleur d'accent).
- Si tu ajoutes un fichier dans `app/`, ajoute-le aussi à la liste `FILES` de `app/sw.js`.

Chaque envoi sur la branche `main` republie l'appli en 1 à 2 minutes. Les téléphones prennent la nouvelle version à la prochaine ouverture.

## Tests

```bash
# Appli complète sur écran d'iPhone : clair, sombre, hors ligne, deux téléphones, caméra
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers python3 tests/test_app.py /tmp/captures
```

Le test lance un serveur local et un petit relais de test (`tests/mqtt_broker.py`), puis simule deux iPhone : questionnaire, ajout d'ami par la caméra, combat complet, journal, arbitres, et l'appli sans internet.

## Limites connues

- Sur iPhone, une appli web ne peut pas avoir de widget sur l'écran verrouillé : le **mode cours** le remplace (l'appli rouvre directement dessus pendant un cours).
- Les données d'une appli installée sur l'écran d'accueil sont séparées de celles de Safari : utilise toujours l'icône.
- Les règles des fédérations changent : chaque réponse d'arbitre renvoie au règlement officiel.
