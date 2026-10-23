"""Test complet de l'appli sur un écran d'iPhone : clair, sombre, hors ligne, deux téléphones, caméra.

Usage : PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers python3 tests/test_app.py /tmp/captures
Lance lui-même le serveur web (port 8765) et le relais de test (port 8883).
"""
import os
import subprocess
import sys
import time

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/captures'
os.makedirs(OUT, exist_ok=True)
URL = 'http://localhost:8765/?broker=ws://127.0.0.1:8883&speed=10'
IPHONE = dict(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True,
              user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1')

results = []


def check(name, ok, detail=''):
    results.append((name, bool(ok), detail))
    print(('OK   ' if ok else 'ÉCHEC') + ' ' + name + (f' — {detail}' if detail and not ok else ''), flush=True)


def shot(pg, name):
    pg.wait_for_timeout(250)
    pg.screenshot(path=os.path.join(OUT, name + '.png'))


def watch(pg, label, errors):
    pg.on('pageerror', lambda e: errors.append(f'{label}: {e}'))
    pg.on('console', lambda m: errors.append(f'{label}: {m.text}') if m.type == 'error' and 'WebSocket' not in m.text and 'net::ERR_INTERNET_DISCONNECTED' not in m.text else None)


def onboard(pg, name, belt_label):
    pg.goto(URL)
    pg.wait_for_selector('input.input')
    pg.fill('input.input', name)
    pg.click(f'.chip:has-text("{belt_label}")')
    pg.get_by_role('button', name='C’est parti').click()
    pg.wait_for_selector('nav.tabs')


def tab(pg, label):
    pg.click(f'nav.tabs button:has-text("{label}")')
    pg.wait_for_timeout(250)


def close_sheet(pg):
    pg.locator('.backdrop').last.click(position={'x': 20, 'y': 20})
    pg.wait_for_timeout(250)


def make_y4m(png, path):
    img = Image.open(png).convert('L')
    w, h = 640, 480
    canvas = Image.new('L', (w, h), 255)
    qr = img.resize((380, 380), Image.NEAREST)
    canvas.paste(qr, ((w - 380) // 2, (h - 380) // 2))
    y = canvas.tobytes()
    uv = bytes([128]) * ((w // 2) * (h // 2))
    with open(path, 'wb') as f:
        f.write(f'YUV4MPEG2 W{w} H{h} F15:1 Ip A1:1 C420jpeg\n'.encode())
        for _ in range(15):
            f.write(b'FRAME\n' + y + uv + uv)


ANSWERS = [
    ['Les deux'], ['1 à 3 ans'], ['Dans la moyenne'], ['La souplesse', 'La patience et la technique'],
    ['Tirer la garde'], ['Dessous, en garde'], ['Garde fermée', 'Araignée, lasso'], ['AUTRE:Je bosse le berimbolo'],
    ['Triangle', 'Clé de bras', 'Clés de jambe'], ['Sortir de la montée ou du contrôle latéral', 'Le cardio'],
    ['Gagner en compétition'], ['IBJJF'], ['3 ou 4'],
]


def do_quiz(pg):
    pg.click('#start-quiz')
    for i, picks in enumerate(ANSWERS):
        pg.wait_for_selector('#quiz .opts')
        if i == 3:
            shot(pg, '04-questionnaire-clair')
        for p in picks:
            if p.startswith('AUTRE:'):
                pg.click('#q-other')
                pg.fill('#quiz textarea', p[6:])
            else:
                pg.locator('#quiz .opt', has_text=p).first.click()
            pg.wait_for_timeout(120)
        pg.wait_for_timeout(350)
        nxt = pg.locator('#q-next')
        if nxt.count() and nxt.is_visible() and nxt.is_enabled():
            nxt.click()
            pg.wait_for_timeout(200)
    pg.wait_for_selector('#plan', timeout=8000)


def main():
    web = subprocess.Popen([sys.executable, '-m', 'http.server', '8765', '--directory', os.path.join(ROOT, 'app')], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    broker = subprocess.Popen([sys.executable, os.path.join(ROOT, 'tests', 'mqtt_broker.py'), '8883'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.2)
    errors = []
    try:
        with sync_playwright() as p:
            # ---------- Téléphone A (clair) ----------
            browser_a = p.chromium.launch()
            ctx_a = browser_a.new_context(color_scheme='light', **IPHONE)
            a = ctx_a.new_page()
            watch(a, 'A', errors)
            a.goto(URL)
            a.wait_for_selector('input.input')
            shot(a, '01-accueil-clair')
            onboard(a, 'Cédric', 'Violette')
            shot(a, '02-mon-jeu-vide-clair')
            check('Accueil et création du profil', a.locator('nav.tabs').count() == 1)

            do_quiz(a)
            a.wait_for_timeout(600)
            shot(a, '05-strategie-clair')
            a.screenshot(path=os.path.join(OUT, '05b-strategie-complete-clair.png'), full_page=True)
            style = a.locator('.plan-head .arch').inner_text()
            check('Questionnaire → stratégie générée', len(style) > 3, style)
            check('Réponse « Autre » reprise dans la stratégie', 'berimbolo' in a.locator('#plan').inner_text())
            check('Soumission préférée reprise dans « Tes finitions »', a.locator('#plan .tag', has_text='Ta préférée').count() >= 1)

            # Code ami de A, pour la caméra de B
            tab(a, 'Amis')
            shot(a, '06-amis-vide-clair')
            a.click('button:has-text("Mon code")')
            a.wait_for_selector('.sheet .qrbox')
            code = a.locator('.sheet .qrbox').get_attribute('data-code')
            qr_png = os.path.join(OUT, '_qr-a.png')
            a.locator('.sheet .qrbox').screenshot(path=qr_png)
            shot(a, '07-mon-code-ami-clair')
            close_sheet(a)
            y4m = os.path.join(OUT, '_qr-a.y4m')
            make_y4m(qr_png, y4m)
            check('Code ami généré', code and code.startswith('PRD1.'))

            # ---------- Téléphone B (sombre, avec caméra qui voit le QR de A) ----------
            browser_b = p.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', f'--use-file-for-fake-video-capture={y4m}'])
            ctx_b = browser_b.new_context(color_scheme='dark', permissions=['camera'], **IPHONE)
            b = ctx_b.new_page()
            watch(b, 'B', errors)
            onboard(b, 'Karim', 'Bleue')
            shot(b, '20-mon-jeu-vide-sombre')
            a.wait_for_timeout(1500)
            check('Les deux téléphones sont reliés au relais', 'dot on' in a.locator('.top .avatar').inner_html() and 'dot on' in b.locator('.top .avatar').inner_html())

            tab(b, 'Amis')
            b.click('button:has-text("Scanner")')
            b.wait_for_selector('.scanner video')
            b.wait_for_timeout(500)
            shot(b, '21-scanner-sombre')
            b.wait_for_selector('.scanner', state='detached', timeout=15000)
            b.wait_for_timeout(1500)
            check('B scanne le QR de A avec la caméra et l’ajoute', 'Cédric' in b.locator('main').inner_text())
            close_sheet(b) if b.locator('.sheet').count() else None
            a.wait_for_timeout(800)
            check('A reçoit automatiquement B en ami (sans scanner)', 'Karim' in a.locator('main').inner_text())
            shot(b, '22-amis-sombre')

            # ---------- Combat en direct ----------
            a.click('.rowbtn')
            a.wait_for_selector('text=Inviter à combattre')
            shot(a, '08-profil-ami-clair')
            a.click('text=Inviter à combattre')
            a.wait_for_selector('#inv-min')
            a.select_option('#inv-min', '1')
            a.click('.sheet .seg button:has-text("No-Gi")')
            shot(a, '09-invitation-clair')
            a.click('#inv-send')
            b.wait_for_selector('#incoming', timeout=8000)
            shot(b, '23-invitation-recue-sombre')
            check('L’invitation arrive sur le téléphone de B', True)
            b.click('#accept')
            a.wait_for_selector('.board', timeout=8000)
            check('Le compte à rebours démarre sur le téléphone de A quand B accepte', a.locator('.board').count() == 1)
            a.wait_for_selector('.board .count', timeout=5000)
            b.wait_for_selector('.board .count', timeout=5000)
            shot(a, '10-compte-a-rebours-A')
            shot(b, '24-compte-a-rebours-B')
            a.wait_for_selector('.board .clock', timeout=6000)
            shot(a, '11-chrono-round-A')
            a.wait_for_selector('text=Qui a gagné ?', timeout=12000)
            b.wait_for_selector('text=Qui a gagné ?', timeout=12000)
            shot(a, '12-qui-a-gagne-A')
            a.locator('.board .btn', has_text='Cédric').click()
            a.click('.board .btn:has-text("Par soumission")')
            a.wait_for_selector('.board input.input')
            shot(a, '13-recherche-soumission-nogi-A')
            nogi_list = a.locator('.board .list').inner_text()
            check('En No-Gi, les soumissions au kimono sont masquées', 'Étranglement croisé' not in nogi_list and 'Clé de talon' in nogi_list)
            a.click('.board .chip:has-text("Kimono")')
            gi_list = a.locator('.board .list').inner_text()
            check('Filtre Kimono : soumissions au col visibles et marquées', 'Étranglement croisé' in gi_list)
            a.click('.board .chip:has-text("Grappling")')
            a.fill('.board input.input', 'triangle')
            a.locator('.board .list .row', has_text='Triangle').first.click()
            shot(a, '14-confirmation-resultat-A')
            a.click('#validate')
            b.wait_for_selector('.board .giant:has-text("Défaite")', timeout=8000)
            shot(a, '15-resultat-A')
            shot(b, '25-resultat-recu-B')
            check('Le résultat saisi sur A apparaît sur B', 'triangle' in b.locator('.board').inner_text().lower())
            a.click('.board .btn:has-text("Terminer")')
            b.click('.board .btn:has-text("Terminer")')
            a.wait_for_timeout(400)
            check('Profil de l’ami mis à jour tout de suite (1 – 0)', '1–0' in a.locator('.full').last.inner_text().replace('\n', ''), a.locator('.full').last.inner_text()[:120])
            shot(a, '16a-profil-ami-apres-combat')
            a.locator('.full .iconbtn').last.click()
            a.wait_for_timeout(300)
            score_a = a.locator('.score').first.inner_text().replace('\n', '')
            score_b = b.locator('.score').first.inner_text().replace('\n', '')
            check('Score dans Amis : 1 – 0 chez A, 0 – 1 chez B', score_a == '1–0' and score_b == '0–1', f'{score_a} / {score_b}')
            shot(a, '16-amis-score-clair')
            a.locator('.score').first.click()
            a.wait_for_selector('text=Tous vos combats')
            shot(a, '17-palmares-clair')
            check('Palmarès : victoire par soumission listée', 'triangle' in a.locator('.full').last.inner_text().lower())
            a.locator('.full .iconbtn').last.click()

            # ---------- Journal ----------
            tab(a, 'Journal')
            a.click('#start-course')
            a.click('#go-course')
            a.wait_for_selector('#course')
            a.click('#hit-give')
            a.wait_for_selector('.sheet .list')
            a.locator('.sheet .list .row', has_text='Clé de bras').first.click()
            a.click('#hit-take')
            a.wait_for_selector('.sheet .list')
            a.click('.sheet .btn:has-text("Passer")')
            a.locator('.chip:has-text("5 min")').click()
            shot(a, '18-mode-cours-clair')
            check('Mode cours : compteurs 1 placée / 1 subie', a.locator('#hit-give .n').inner_text() == '1' and a.locator('#hit-take .n').inner_text() == '1')
            a.click('#end-course')
            a.click('.sheet .btn.primary:has-text("Terminer")')
            a.wait_for_timeout(500)
            shot(a, '19-journal-clair')
            check('Séance enregistrée avec ses totaux', a.locator('.stat .v').first.inner_text() == '1')

            # ---------- Arbitres (B, sombre) ----------
            tab(b, 'Compét.')
            shot(b, '26-competitions-sombre')
            b.click('[data-ref="ibjjf"]')
            b.click('.chip:has-text("Ce qui m’est interdit")')
            b.wait_for_selector('.answer')
            shot(b, '27-arbitre-ibjjf-interdits-sombre')
            check('Arbitre IBJJF : clé de genou interdite pour une bleue', 'Clé de genou' in b.locator('.answer').first.inner_text())
            b.fill('#referee input.input', 'Est-ce que la clé de talon est autorisée ?')
            b.keyboard.press('Enter')
            b.wait_for_timeout(400)
            ans = b.locator('.answer').first.inner_text()
            shot(b, '28-arbitre-question-sombre')
            check('Question libre : « clé de talon » → interdite', 'Non' in ans, ans[:80])
            b.locator('#referee .iconbtn').first.click()
            b.click('[data-ref="adcc"]')
            b.click('.chip:has-text("Les points")')
            check('Arbitre ADCC : prise de dos à 3 points', 'Prise de dos' in b.locator('.answer').first.inner_text())
            b.locator('#referee .iconbtn').first.click()

            # Écrans en sombre
            tab(b, 'Journal')
            shot(b, '29-journal-sombre')
            tab(b, 'Mon jeu')
            b.click('#start-quiz')
            b.wait_for_selector('#quiz .opts')
            shot(b, '30-questionnaire-sombre')
            b.locator('#quiz .iconbtn').first.click()
            b.locator('.top .avatar').click()
            b.wait_for_selector('text=Sauvegarde')
            shot(b, '31-profil-sombre')

            # ---------- Hors ligne ----------
            ctrl = a.evaluate('navigator.serviceWorker.ready.then(() => !!navigator.serviceWorker.controller)')
            if not ctrl:
                a.reload()
                a.wait_for_selector('nav.tabs')
            ctx_a.set_offline(True)
            a.reload()
            a.wait_for_selector('nav.tabs', timeout=8000)
            tab(a, 'Mon jeu')
            check('Sans internet : l’appli s’ouvre et garde les données', a.locator('#plan').count() == 1)
            shot(a, '32-hors-ligne-mon-jeu')
            tab(a, 'Amis')
            a.click('.rowbtn')
            a.click('text=Inviter à combattre')
            a.click('#inv-send')
            a.wait_for_selector('#waiting .qrbox', timeout=5000)
            shot(a, '33-hors-ligne-invitation-par-QR')
            check('Sans internet : l’invitation passe par QR code', True)
            a.click('#waiting .btn:has-text("Annuler")')
            ctx_a.set_offline(False)

            # Stratégie en sombre (B fait le questionnaire)
            browser_a.close()
            browser_b.close()
    finally:
        web.terminate()
        broker.terminate()

    real_errors = [e for e in errors if 'Failed to load resource' not in e]
    check('Aucune erreur JavaScript', not real_errors, ' | '.join(real_errors[:5]))
    failed = [r for r in results if not r[1]]
    print(f'\n{len(results) - len(failed)}/{len(results)} vérifications réussies. Captures dans {OUT}')
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
