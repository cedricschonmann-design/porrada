# PORRADA

L'appli des pratiquants de JJB et de grappling : construis ton jeu, défie tes partenaires, tiens ton journal et demande les règles aux arbitres.

**Ouvrir l'appli :** https://cedricschonmann-design.github.io/porrada/

## Installer sur iPhone

1. Ouvre le lien ci-dessus dans **Safari**.
2. Touche le bouton **Partager** (le carré avec une flèche vers le haut).
3. Choisis **« Sur l'écran d'accueil »**, puis **Ajouter**.

L'icône PORRADA apparaît comme une vraie appli. Elle marche sans internet et se met à jour toute seule.

## Ce que fait l'appli

| Partie | Ce qu'on y fait |
|---|---|
| **Inscription** | E-mail, nom d'utilisateur, prénom, année de naissance, catégorie, ceinture et barrettes, académie, poids, photo de profil (sinon les initiales). |
| **Mon jeu** | Questionnaire à choix (avec « Autre »), dont les questions s'adaptent aux réponses → stratégie : style, profil en toile d’araignée (8 axes), arbre de jeu, debout, plan A, finitions (avec les interdits de ton règlement), « s'il fait ça, tu fais ça », plan B, défense, clés de jambe, zones à ménager, plan sur 4 semaines. Versions gardées. |
| **Amis** | Ajout par QR code, messages chiffrés (réponses rapides, accusé de réception), défi (durée, Gi / No-Gi), compte à rebours commun, chrono en anneau, résultat avec le nombre de soumissions de chacun (ex. 3 – 1, recherche Kimono / Grappling), points ou match nul, revanche, score « 2 – 0 » et palmarès. |
| **Journal** | Privé. Mode cours : deux gros boutons (un appui = une soumission), à la fin du cours des boutons + pour préciser (kimura ×3), minuteur de rounds avec repos et sonnerie, ressenti, partenaires, notes. Graphique des soumissions placées et subies, régularité sur 12 semaines, objectif par semaine, tes armes et ce qui te piège. |
| **Compétition** | Palmarès de compétition (médailles, victoires et défaites, graphique en cercle). Cinq arbitres (Paulo, Sami, Leïla, Mike, Jess : IBJJF, ADCC, AJP, NAGA, Grappling Industries) avec une liste de questions à choisir : points, valeur d'une position, durée, pesée, catégorie de poids, tenue, égalité, pénalités, situations (tirer la garde, slam…), techniques autorisées selon ta ceinture et ton âge. |
| **Réglages** | Roue dentée : compte, pratique (ceinture et promotions, académie, poids, objectif), photo de profil, thème, sons, vibrations, sauvegarde, suppression du compte. |

## Comment ça marche (sans serveur à payer)

- **Pas de compte** : tout est enregistré sur le téléphone (`localStorage`).
- **Amis** : chacun a un « code ami » (QR) qui contient son identifiant et une clé secrète.
- **Invitations et résultats en direct** : passent par un relais public gratuit (MQTT sur WebSocket, `broker.emqx.io`, secours `broker.hivemq.com`). Chaque message est **chiffré** (AES-GCM) avec la clé de l'ami : le relais ne voit rien.
- **Sans réseau** : le même message s'affiche en QR code, l'autre téléphone le scanne (ou colle le code).
- Le compte à rebours part à la même **heure de départ** sur les deux téléphones.
- La « stratégie IA » est un moteur de règles intégré à l'appli : il marche hors ligne et ne coûte rien. Pareil pour les arbitres : des personnages fictifs qui répondent à partir des règlements officiels.
- **Sons et vibrations** : sons synthétisés dans l'appli (aucun fichier), vibrations sur iPhone récent. Tout se coupe dans les réglages.
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
    people.js             ← photo de profil ou initiales
    qr.js                 ← affichage et lecture des QR codes (caméra)
    ui.js                 ← boutons, feuilles, sons, écran allumé
    version.js            ← numéro de version (rempli à la publication)
    screens/              ← un fichier par partie de l'appli
    data/
      questionnaire.js    ← questions + moteur de stratégie
      submissions.js      ← répertoire des soumissions (Kimono / Grappling / les deux)
      referees.js         ← règles des fédérations (vérifiées en octobre 2026)
      refbrain.js         ← les arbitres personnages et leurs réponses précises
design/icon.svg           ← dessin de l'icône (étoile blanche sur fond noir)
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

Le test lance un serveur local et un petit relais de test (`tests/mqtt_broker.py`), puis simule deux iPhone : inscription, questionnaire, ajout d'ami par la caméra, messages, combat complet, journal, arbitres, réglages, et l'appli sans internet.

## Limites connues

- Sur iPhone, une appli web ne peut pas avoir de widget sur l'écran verrouillé : le **mode cours** le remplace (l'appli rouvre directement dessus pendant un cours).
- Les données d'une appli installée sur l'écran d'accueil sont séparées de celles de Safari : utilise toujours l'icône.
- Les règles des fédérations changent : chaque réponse d'arbitre renvoie au règlement officiel.
