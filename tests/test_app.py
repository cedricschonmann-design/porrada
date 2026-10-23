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


def shot(pg, name, full=False):
    pg.wait_for_timeout(450)
    pg.screenshot(path=os.path.join(OUT, name + '.png'), full_page=full)


def watch(pg, label, errors):
    pg.on('pageerror', lambda e: errors.append(f'{label}: {e}'))
    pg.on('console', lambda m: errors.append(f'{label}: {m.text}') if m.type == 'error' and 'WebSocket' not in m.text and 'ERR_INTERNET_DISCONNECTED' not in m.text and 'Failed to load resource' not in m.text else None)


def onboard(pg, email, name, year, belt_label, weight=None, shots=None):
    pg.goto(URL)
    pg.wait_for_selector('#onb-start')
    if shots:
        pg.wait_for_timeout(1300)
        shot(pg, shots + '-01-bienvenue')
    pg.click('#onb-start')
    pg.fill('#onb-email', email)
    if shots:
        shot(pg, shots + '-02-compte')
    pg.click('#onb-next')
    pg.fill('#onb-name', name)
    pg.fill('#onb-year', year)
    pg.click('#onb-next')
    pg.click(f'.onb .chip:has-text("{belt_label}")')
    if weight:
        pg.fill('input[placeholder="Facultatif, en kg"]', weight)
    if shots:
        shot(pg, shots + '-03-pratique')
    pg.click('#onb-next')
    pg.wait_for_selector('#onb-avatar')


def finish_onboarding(pg, shots=None):
    pg.click('#onb-next')
    pg.wait_for_selector('#onb-done')
    if shots:
        pg.wait_for_timeout(900)
        shot(pg, shots + '-06-pret')
    pg.click('#onb-done')
    pg.wait_for_selector('.tabbar')
    pg.wait_for_timeout(400)


def tab(pg, label):
    pg.click(f'.tabbar button:has-text("{label}")')
    pg.wait_for_timeout(450)


def back(pg):
    pg.locator('#layer > .page:not(.closing) .backbtn').last.click()
    pg.wait_for_timeout(450)


def close_sheet(pg):
    if pg.locator('.sheet:not(.closing)').count():
        pg.locator('.backdrop').last.click(position={'x': 20, 'y': 20})
        pg.wait_for_timeout(350)


def make_y4m(png, path):
    img = Image.open(png).convert('L')
    w, h = 640, 480
    canvas = Image.new('L', (w, h), 255)
    qr = img.resize((420, 420), Image.NEAREST)
    canvas.paste(qr, ((w - 420) // 2, (h - 420) // 2))
    y = canvas.tobytes()
    uv = bytes([128]) * ((w // 2) * (h // 2))
    with open(path, 'wb') as f:
        f.write(f'YUV4MPEG2 W{w} H{h} F15:1 Ip A1:1 C420jpeg\n'.encode())
        for _ in range(15):
            f.write(b'FRAME\n' + y + uv + uv)


def do_quiz(pg, prefix):
    pg.click('#start-quiz')
    used_other = False
    n = 0
    while n < 25:
        pg.wait_for_timeout(350)
        if pg.locator('#plan').count() or pg.locator('#quiz').count() == 0:
            break
        if not pg.locator('#quiz .opts').count():
            pg.wait_for_timeout(400)
            continue
        n += 1
        title = pg.locator('#quiz .q-title').inner_text()
        if n == 3:
            shot(pg, prefix + '-quiz-question')
        if pg.locator('#quiz .opt.one').count():
            if 'règlement' in title:
                pg.locator('#quiz .opt', has_text='IBJJF').click()
            elif 'objectif' in title:
                pg.locator('#quiz .opt', has_text='compétition').click()
            else:
                pg.locator('#quiz .opt.one').first.click()
            pg.wait_for_timeout(500)
        else:
            if not used_other and 'gardes' in title:
                pg.locator('#quiz .opt').first.click()
                pg.click('#q-other')
                pg.fill('#q-other-text', 'Je bosse le berimbolo')
                used_other = True
            elif 'soumissions' in title:
                pg.locator('#quiz .opt', has_text='Triangle').click()
                pg.locator('#quiz .opt', has_text='Clé de bras').click()
            else:
                pg.locator('#quiz .opt').first.click()
            pg.click('#q-next')
    pg.wait_for_selector('#plan', timeout=10000)
    pg.wait_for_timeout(900)


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
            onboard(a, 'cedric@exemple.ch', 'Cédric', '2005', 'Violette', '78', shots='A')
            shot(a, 'A-04-photo-ou-avatar')
            a.click('#onb-avatar')
            a.wait_for_selector('#av-save')
            a.locator('.range').first.fill('80')
            a.locator('.ctabs button', has_text='Visage').click()
            a.locator('.seg button', has_text='En chou-fleur').click()
            a.locator('.ctabs button', has_text='Tenue').click()
            shot(a, 'A-05-avatar-tenue')
            a.click('#av-save')
            a.wait_for_timeout(600)
            finish_onboarding(a, shots='A')
            check('Inscription complète (e-mail, nom d’utilisateur, avatar)', a.evaluate('window.__porrada.state.me.username') == 'cedric' and a.evaluate('window.__porrada.state.me.av.build') == 80)
            shot(a, 'A-07-mon-jeu')

            do_quiz(a, 'A-08')
            shot(a, 'A-09-strategie')
            a.screenshot(path=os.path.join(OUT, 'A-09b-strategie-complete.png'), full_page=True)
            check('Questionnaire → stratégie avec arbre de jeu', a.locator('#plan .flow .node').count() == 5)
            check('Réponse « Autre » reprise', 'berimbolo' in a.locator('#plan').inner_text())

            tab(a, 'Amis')
            shot(a, 'A-10-amis-vide')
            a.locator('.empty .btn', has_text='Mon code').click()
            a.wait_for_selector('.sheet .qrbox')
            code = a.locator('.sheet .qrbox').get_attribute('data-code')
            qr_png = os.path.join(OUT, '_qr-a.png')
            a.locator('.sheet .qrbox').screenshot(path=qr_png)
            shot(a, 'A-11-mon-code')
            close_sheet(a)
            y4m = os.path.join(OUT, '_qr-a.y4m')
            make_y4m(qr_png, y4m)
            check('Code ami généré', code and code.startswith('PRD1.'))

            # ---------- Téléphone B (sombre, caméra qui voit le QR de A) ----------
            browser_b = p.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', f'--use-file-for-fake-video-capture={y4m}'])
            ctx_b = browser_b.new_context(color_scheme='dark', permissions=['camera'], **IPHONE)
            b = ctx_b.new_page()
            watch(b, 'B', errors)
            onboard(b, 'karim@exemple.ch', 'Karim', '1999', 'Bleue', '84', shots='B')
            finish_onboarding(b)
            a.wait_for_timeout(1200)
            check('Les deux téléphones sont reliés au relais', a.locator('.top .av .dot.on').count() == 1 and b.locator('.top .av .dot.on').count() == 1)

            tab(b, 'Amis')
            b.locator('.empty .btn', has_text='Scanner').click()
            b.wait_for_selector('.scanner video')
            b.wait_for_timeout(600)
            shot(b, 'B-07-scanner')
            b.wait_for_selector('.scanner', state='detached', timeout=15000)
            b.wait_for_timeout(1500)
            close_sheet(b)
            check('B scanne le QR de A avec la caméra et l’ajoute', 'Cédric' in b.locator('main').inner_text())
            a.wait_for_timeout(800)
            check('A reçoit B en ami sans scanner', 'Karim' in a.locator('main').inner_text())
            shot(b, 'B-08-amis')

            # ---------- Messages ----------
            b.locator('[aria-label="Écrire à Cédric"]').click()
            b.wait_for_selector('#chat')
            b.locator('.composer .chip', has_text='Open mat ce soir ?').click()
            a.wait_for_timeout(1200)
            check('A voit un message non lu (pastille)', a.locator('.tabbar .badge').count() == 1)
            shot(a, 'A-12-message-recu')
            a.locator('[aria-label="Écrire à Karim"]').click()
            a.wait_for_selector('#chat')
            a.fill('.composer textarea', 'Oui, 19 h !')
            a.click('#chat-send')
            b.wait_for_timeout(1200)
            check('B reçoit la réponse de A', '19 h' in b.locator('#chat').inner_text())
            check('B voit que son message est arrivé', 'Reçu' in b.locator('#chat').inner_text())
            shot(a, 'A-13-conversation')
            shot(b, 'B-09-conversation')
            back(a)
            back(b)

            # ---------- Combat en direct ----------
            a.locator('#friend-rows .rowc button').first.click()
            a.wait_for_selector('#challenge')
            shot(a, 'A-14-profil-ami')
            a.click('#challenge')
            a.wait_for_selector('#inv-send')
            for _ in range(4):
                a.click('[aria-label="Moins une minute"]')
            a.locator('.sheet .seg button', has_text='No-Gi').click()
            shot(a, 'A-15-defi')
            check('Durée du défi réglée à 1 min', a.locator('#inv-min').inner_text() == '1 min')
            a.click('#inv-send')
            b.wait_for_selector('#incoming', timeout=8000)
            shot(b, 'B-10-defi-recu')
            b.click('#accept')
            a.wait_for_selector('.board', timeout=8000)
            check('Le compte à rebours démarre chez A quand B accepte', a.locator('.board').count() == 1)
            a.wait_for_selector('.board .count', timeout=5000)
            b.wait_for_selector('.board .count', timeout=5000)
            shot(a, 'A-16-compte-a-rebours')
            a.wait_for_selector('.board .clock', timeout=6000)
            a.wait_for_timeout(1200)
            shot(a, 'A-17-chrono')
            shot(b, 'B-11-chrono')
            a.wait_for_selector('text=Qui a gagné ?', timeout=12000)
            b.wait_for_selector('text=Qui a gagné ?', timeout=12000)
            shot(a, 'A-18-qui-a-gagne')
            a.click('.board .who-btn.me')
            a.locator('.board .who-btn', has_text='Par soumission').click()
            a.wait_for_selector('.board input.input')
            nogi = a.locator('.board .rows').inner_text()
            check('En No-Gi, les soumissions au kimono sont masquées', 'Étranglement croisé' not in nogi and 'Clé de talon' in nogi)
            a.click('.board .chip[data-filter="kimono"]')
            check('Filtre Kimono : soumissions au col visibles', 'Étranglement croisé' in a.locator('.board .rows').inner_text())
            a.click('.board .chip[data-filter="grappling"]')
            a.fill('.board input.input', 'triangle')
            shot(a, 'A-19-recherche')
            a.click('.board [data-sub="triangle"]')
            a.click('#validate')
            b.wait_for_selector('.board .result-big:has-text("Défaite")', timeout=8000)
            a.wait_for_timeout(700)
            shot(a, 'A-20-victoire')
            shot(b, 'B-12-defaite')
            check('Le résultat saisi sur A apparaît sur B', 'triangle' in b.locator('.board').inner_text().lower())
            a.click('#done')
            b.click('#done')
            a.wait_for_timeout(600)
            check('Profil de l’ami mis à jour (1 – 0)', '1' in a.locator('.page .h2h .big').inner_text())
            back(a)
            sa = a.locator('#friend-rows .score').inner_text().replace('\n', '').replace(' ', '')
            sb = b.locator('#friend-rows .score').inner_text().replace('\n', '').replace(' ', '')
            check('Score dans Amis : 1–0 chez A, 0–1 chez B', sa == '1–0' and sb == '0–1', f'{sa} / {sb}')
            shot(a, 'A-21-amis-score')
            a.locator('#friend-rows .score').click()
            a.wait_for_selector('text=Tous vos combats')
            shot(a, 'A-22-palmares')
            check('Palmarès : victoire par soumission listée', 'triangle' in a.locator('.page').last.inner_text().lower())
            back(a)

            # ---------- Journal ----------
            tab(a, 'Journal')
            a.click('#start-course')
            a.click('#go-course')
            a.wait_for_selector('#course')
            a.click('#hit-give')
            a.wait_for_selector('.sheet [data-sub]')
            a.click('.sheet [data-sub="armbar"]')
            a.wait_for_timeout(400)
            a.click('#hit-take')
            a.wait_for_selector('#skip-sub')
            a.click('#skip-sub')
            a.wait_for_timeout(400)
            a.click('#start-rounds')
            a.wait_for_timeout(800)
            shot(a, 'A-23-mode-cours')
            check('Mode cours : 1 placée / 1 subie', a.locator('#hit-give .n').inner_text() == '1' and a.locator('#hit-take .n').inner_text() == '1')
            check('Minuteur de rounds lancé', 'Round 1' in a.locator('#timer-label').inner_text())
            a.click('#end-course')
            a.wait_for_selector('#save-course')
            a.locator('.feel button').nth(4).click()
            shot(a, 'A-24-fin-du-cours')
            a.click('#save-course')
            a.wait_for_timeout(900)
            shot(a, 'A-25-journal')
            a.screenshot(path=os.path.join(OUT, 'A-25b-journal-complet.png'), full_page=True)
            check('Séance enregistrée et graphique affiché', a.locator('.chart').count() == 1 and len(a.evaluate('window.__porrada.state.journal')) == 1)

            # ---------- Arbitres (B, sombre) ----------
            tab(b, 'Compét.')
            shot(b, 'B-13-arbitres')
            b.click('[data-ref="ibjjf"]')
            b.wait_for_selector('#ref-q')
            b.locator('.composer .chip', has_text='Ce qui m’est interdit').click()
            b.wait_for_timeout(1300)
            check('Arbitre IBJJF : clé de genou interdite pour une bleue', 'Clé de genou' in b.locator('.chat').inner_text())
            b.fill('#ref-q', 'Est-ce que la clé de talon est autorisée ?')
            b.keyboard.press('Enter')
            b.wait_for_timeout(1300)
            last = b.locator('.chat .bubble.rich').last.inner_text()
            check('Question libre : clé de talon → interdite', 'Non' in last and '✕' in last, last[:90])
            b.fill('#ref-q', '84 kg, quelle catégorie ?')
            b.keyboard.press('Enter')
            b.wait_for_timeout(1300)
            last = b.locator('.chat .bubble.rich').last.inner_text()
            check('Catégorie de poids calculée (84 kg en Gi)', 'Mi-lourd' in last, last[:90])
            b.fill('#ref-q', 'Combien vaut une montée ?')
            b.keyboard.press('Enter')
            b.wait_for_timeout(1300)
            last = b.locator('.chat .bubble.rich').last.inner_text()
            check('Valeur d’une position : montée = 4 points', '4 points' in last, last[:90])
            shot(b, 'B-14-arbitre-conversation')
            back(b)
            b.click('[data-ref="adcc"]')
            b.wait_for_selector('#ref-q')
            b.fill('#ref-q', 'Je peux tirer la garde ?')
            b.keyboard.press('Enter')
            b.wait_for_timeout(1300)
            check('Arbitre ADCC : tirer la garde = point négatif', 'négatif' in b.locator('.chat .bubble.rich').last.inner_text())
            shot(b, 'B-15-arbitre-adcc')
            back(b)

            # Écrans en sombre (B)
            tab(b, 'Journal')
            shot(b, 'B-16-journal')
            tab(b, 'Mon jeu')
            shot(b, 'B-17-mon-jeu')
            b.click('[aria-label="Réglages"]')
            b.wait_for_selector('.page .group')
            shot(b, 'B-18-reglages')
            b.screenshot(path=os.path.join(OUT, 'B-18b-reglages-complet.png'), full_page=True)
            b.locator('.item', has_text='Ceinture').click()
            b.wait_for_selector('.sheet .seg')
            b.locator('.sheet .seg button', has_text='1').click()
            b.locator('.sheet .btn.primary').click()
            b.wait_for_timeout(500)
            check('Promotion enregistrée (1 barrette)', b.evaluate('window.__porrada.state.me.stripes') == 1 and len(b.evaluate('window.__porrada.state.me.promotions')) == 1)
            back(b)
            b.click('[aria-label="Mon profil"]')
            b.wait_for_selector('.profile-hero')
            shot(b, 'B-19-mon-profil')
            back(b)
            a.click('[aria-label="Mon profil"]')
            a.wait_for_selector('.profile-hero')
            shot(a, 'A-26-mon-profil')
            back(a)

            # ---------- Hors ligne ----------
            ctrl = a.evaluate('navigator.serviceWorker.ready.then(() => !!navigator.serviceWorker.controller)')
            if not ctrl:
                a.reload()
                a.wait_for_selector('.tabbar')
            ctx_a.set_offline(True)
            a.reload()
            a.wait_for_selector('.tabbar', timeout=8000)
            tab(a, 'Mon jeu')
            check('Sans internet : l’appli s’ouvre et garde les données', a.locator('#plan').count() == 1)
            shot(a, 'A-27-hors-ligne')
            tab(a, 'Amis')
            a.locator('#friend-rows .rowc button').first.click()
            a.click('#challenge')
            a.click('#inv-send')
            a.wait_for_selector('#waiting .qrbox', timeout=5000)
            shot(a, 'A-28-hors-ligne-defi-QR')
            check('Sans internet : le défi passe par QR code', True)
            a.click('#waiting .btn:has-text("Annuler")')
            ctx_a.set_offline(False)
            browser_a.close()
            browser_b.close()
    finally:
        web.terminate()
        broker.terminate()

    check('Aucune erreur JavaScript', not errors, ' | '.join(errors[:5]))
    failed = [r for r in results if not r[1]]
    print(f'\n{len(results) - len(failed)}/{len(results)} vérifications réussies. Captures dans {OUT}')
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
