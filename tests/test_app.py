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
STANDALONE = "Object.defineProperty(navigator, 'standalone', { get: () => true });"


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
    pg.wait_for_selector('#onb-photo')


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
                pg.locator('#quiz').get_by_role('button', name='Triangle', exact=True).click()
                pg.locator('#quiz').get_by_role('button', name='Clé de bras', exact=True).click()
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
            ctx_a.add_init_script(STANDALONE)
            a = ctx_a.new_page()
            watch(a, 'A', errors)
            onboard(a, 'cedric@exemple.ch', 'Cédric', '2005', 'Violette', '78', shots='A')
            shot(a, 'A-04-photo')
            finish_onboarding(a, shots='A')
            check('Inscription complète (e-mail, nom d’utilisateur)', a.evaluate('window.__porrada.state.me.username') == 'cedric' and a.evaluate('window.__porrada.state.me.email') == 'cedric@exemple.ch')
            shot(a, 'A-07-mon-jeu')

            do_quiz(a, 'A-08')
            shot(a, 'A-09-strategie')
            a.screenshot(path=os.path.join(OUT, 'A-09b-strategie-complete.png'), full_page=True)
            check('Questionnaire → stratégie', a.locator('#plan').count() == 1)
            check('Réponse « Autre » reprise', 'berimbolo' in a.locator('#plan').inner_text())
            check('Arbre de jeu 1 → 2 → 4', [a.locator(f'#plan .gnode.d{d}').count() for d in range(3)] == [1, 2, 4])
            leaf = a.locator('#plan .gnode.d2').nth(1)
            leaf.click()
            check('Toucher une case affiche son détail', leaf.locator('.gl').inner_text() in a.locator('#plan .gdetail').inner_text())

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
            ctx_b.add_init_script(STANDALONE)
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
            a.locator('.board .btn', has_text='Arrêter').click()
            a.wait_for_selector('.sheet .btn.primary:has-text("Arrêter")', timeout=4000)
            shot(a, 'A-17b-confirmer-arret')
            a.locator('.sheet .btn.primary', has_text='Arrêter').click()
            a.wait_for_selector('text=Résultat du round', timeout=6000)
            b.wait_for_selector('text=Résultat du round', timeout=6000)
            check('Arrêter le combat : la confirmation s’affiche et marche sur les deux téléphones', True)
            a.click('[data-add="me"]')
            a.wait_for_selector('.sheet [data-sub]')
            nogi = a.locator('.sheet .rows').inner_text()
            check('En No-Gi, les soumissions au kimono sont masquées', 'Étranglement croisé' not in nogi and 'Clé de talon' in nogi)
            a.click('.sheet .chip[data-filter="kimono"]')
            check('Filtre Kimono : soumissions au col visibles', 'Étranglement croisé' in a.locator('.sheet .rows').inner_text())
            a.click('.sheet .chip[data-filter="grappling"]')
            a.fill('.sheet input.input', 'triangle')
            shot(a, 'A-19-recherche')
            a.click('.sheet [data-sub="triangle"]')
            a.wait_for_timeout(400)
            a.click('[data-add="me"]')
            a.wait_for_selector('#sub-skip')
            a.click('#sub-skip')
            a.wait_for_timeout(400)
            a.click('[data-add="opp"]')
            a.wait_for_selector('.sheet [data-sub="guillotine"]')
            a.click('.sheet [data-sub="guillotine"]')
            a.wait_for_timeout(400)
            shot(a, 'A-18-resultat-du-round')
            check('Décompte des soumissions : 2 – 1', a.locator('#tally-me').inner_text() == '2' and a.locator('#tally-opp').inner_text() == '1')
            a.click('#validate')
            b.wait_for_selector('.board .result-big:has-text("Défaite")', timeout=8000)
            a.wait_for_timeout(700)
            shot(a, 'A-20-victoire')
            shot(b, 'B-12-defaite')
            check('Le résultat 2–1 apparaît sur B', '2 soumissions à 1' in b.locator('.board').inner_text())
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
            check('Palmarès : soumissions de chacun listées', 'triangle' in a.locator('.page').last.inner_text().lower() and 'guillotine' in a.locator('.page').last.inner_text().lower())
            back(a)

            # ---------- Journal ----------
            tab(a, 'Journal')
            a.click('#start-course')
            a.click('#go-course')
            a.wait_for_selector('#course')
            a.click('#hit-give')
            a.click('#hit-give')
            a.click('#hit-take')
            a.wait_for_timeout(300)
            a.click('#start-rounds')
            a.wait_for_timeout(800)
            shot(a, 'A-23-mode-cours')
            check('Mode cours : un appui = une soumission (2 placées, 1 subie)', a.locator('#hit-give .n').inner_text() == '2' and a.locator('#hit-take .n').inner_text() == '1')
            check('Minuteur de rounds lancé', 'Round 1' in a.locator('#timer-label').inner_text())
            a.click('#end-course')
            a.wait_for_selector('#save-course')
            a.click('#end-given [data-sub="armbar"] [aria-label^="Plus"]')
            a.click('#end-given [data-sub="armbar"] [aria-label^="Plus"]')
            a.click('#end-received [data-sub="rnc"] [aria-label^="Plus"]')
            a.locator('.feel button').nth(4).click()
            shot(a, 'A-24-fin-du-cours')
            check('Fin du cours : les + précisent les soumissions', a.locator('#end-given [data-sub="armbar"] .cval').inner_text() == '2' and a.locator('#end-given [data-sub="none"] .cval').inner_text() == '0')
            a.click('#save-course')
            a.wait_for_timeout(900)
            shot(a, 'A-25-journal')
            a.screenshot(path=os.path.join(OUT, 'A-25b-journal-complet.png'), full_page=True)
            check('Séance enregistrée et graphique affiché', a.locator('.chart').count() == 1 and len(a.evaluate('window.__porrada.state.journal')) == 1)
            check('Séance : 2 clés de bras, 1 étranglement arrière', a.evaluate("window.__porrada.state.journal[0].given.filter(x => x.sub === 'armbar').length") == 2 and a.evaluate("window.__porrada.state.journal[0].received[0].sub") == 'rnc')

            # ---------- Palmarès de compétition ----------
            tab(a, 'Compétition')
            shot(a, 'A-25c-competition')
            a.click('#add-comp')
            a.wait_for_selector('#comp-name')
            a.fill('#comp-name', 'Open de Genève')
            a.locator('.page .chip', has_text='Or').click()
            a.click('#add-match')
            a.locator('.match').nth(1).locator('.seg button', has_text='Défaite').click()
            a.locator('.match').nth(1).locator('.chip', has_text='Points').click()
            shot(a, 'A-25d-nouvelle-competition')
            a.click('#save-comp')
            a.wait_for_timeout(800)
            check('Palmarès de compétition : 1 victoire, 1 défaite, 1 médaille d’or', '1 victoire · 1 défaite' in a.locator('#palmares-card').inner_text())
            a.click('#palmares-card')
            a.wait_for_selector('.donut')
            shot(a, 'A-25e-palmares-competition')
            back(a)

            # ---------- Arbitres (B, sombre) ----------
            tab(b, 'Compétition')
            shot(b, 'B-13-arbitres')
            b.click('[data-ref="ibjjf"]')
            b.wait_for_selector('[data-q="interdits"]')
            check('Arbitres : plus de phrase de présentation, des questions à choisir', b.locator('.page [data-q]').count() >= 10 and 'Précis, à cheval' not in b.locator('.page').last.inner_text())
            shot(b, 'B-14-arbitre-questions')

            def ask_ref(sel, then=None):
                b.click(sel)
                if then:
                    b.wait_for_selector(then)
                    b.click(then)
                b.wait_for_selector('.sheet .answer')
                b.wait_for_timeout(500)
                return b.locator('.sheet .answer').inner_text()

            last = ask_ref('[data-q="interdits"]')
            check('Arbitre IBJJF : clé de genou interdite pour une bleue', 'Clé de genou' in last, last[:90])
            close_sheet(b)
            b.click('[data-q="sub"]')
            b.wait_for_selector('.sheet [data-sub]')
            b.fill('.sheet input.input', 'talon')
            b.locator('.sheet [data-sub]').first.click()
            b.wait_for_selector('.sheet .answer')
            b.wait_for_timeout(500)
            last = b.locator('.sheet .answer').inner_text()
            check('Soumission choisie : clé de talon → interdite', b.locator('.sheet .answer .verdict.no').count() > 0, last[:90])
            close_sheet(b)
            last = ask_ref('[data-q="poids"]')
            check('Catégorie de poids calculée (84 kg en Gi)', 'Mi-lourd' in last, last[:90])
            shot(b, 'B-14b-arbitre-reponse')
            close_sheet(b)
            last = ask_ref('[data-q="pos"]', '.sheet [data-pos="Montée"]')
            check('Valeur d’une position : montée = 4 points', '4 points' in last, last[:90])
            close_sheet(b)
            back(b)
            b.click('[data-ref="adcc"]')
            last = ask_ref('[data-q="sit:tirer"]')
            check('Arbitre ADCC : tirer la garde = point négatif', 'négatif' in last, last[:90])
            shot(b, 'B-15-arbitre-adcc')
            close_sheet(b)
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

            # ---------- Transfert du compte vers un autre téléphone / l'appli installée ----------
            code = a.evaluate("import('/js/store.js').then((m) => m.exportTransfer())")
            browser_c = p.chromium.launch()
            ctx_c = browser_c.new_context(color_scheme='dark', **IPHONE)
            ctx_c.add_init_script(STANDALONE)
            c = ctx_c.new_page()
            watch(c, 'C', errors)
            c.goto(URL)
            c.click('#onb-restore')
            c.fill('#transfer-code', code)
            c.locator('.sheet .btn', has_text='Valider le code').click()
            c.wait_for_selector('.tabbar', timeout=8000)
            check('Transfert du compte : tout est récupéré (profil, amis, journal)', c.evaluate('window.__porrada.state.me.username') == 'cedric' and c.evaluate('Object.keys(window.__porrada.state.friends).length') == 1 and c.evaluate('window.__porrada.state.journal.length') == 1)
            ctx_c.close()
            ctx_d = browser_c.new_context(color_scheme='dark', **IPHONE)
            d = ctx_d.new_page()
            d.goto(URL)
            d.wait_for_selector('text=Installe PORRADA')
            shot(d, 'D-safari-installe')
            check('Dans Safari : on demande d’installer l’appli avant de créer le compte', d.locator('#onb-start').count() == 0)
            browser_c.close()

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
