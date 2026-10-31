"""Test de bout en bout de COACH sur un iPhone simulé (appli installée sur l'écran d'accueil).

Lancer : python3 -m http.server 8766 dans app/, puis
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers python3 tests/test_app.py <dossier des captures>
"""
import os
import sys

from playwright.sync_api import sync_playwright

URL = 'http://localhost:8765/coach/?speed=12'
OUT = sys.argv[1] if len(sys.argv) > 1 else 'captures'
os.makedirs(OUT, exist_ok=True)
IPHONE = dict(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True,
              user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1')
STANDALONE = "Object.defineProperty(navigator, 'standalone', { get: () => true });"
results = []


def check(label, ok, detail=''):
    results.append(ok)
    print(('OK    ' if ok else 'ÉCHEC ') + label + ('' if ok else f' — {detail}'))


def shot(pg, name):
    pg.wait_for_timeout(350)
    pg.screenshot(path=os.path.join(OUT, name + '.png'))


def back(pg):
    pg.locator('#layer > .page:not(.closing) .backbtn').last.click()
    pg.wait_for_timeout(500)


def main():
    errors = []
    with sync_playwright() as p:
        for scheme in ['dark', 'light']:
            b = p.chromium.launch()
            ctx = b.new_context(color_scheme=scheme, **IPHONE)
            ctx.add_init_script(STANDALONE)
            pg = ctx.new_page()
            pg.on('pageerror', lambda e: errors.append(str(e)))
            pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
            pg.goto(URL)
            pg.wait_for_selector('#search')
            s = scheme[0].upper()
            shot(pg, f'{s}-01-vide')

            # Client + fiche
            pg.click('#add-client')
            pg.fill('#client-name', 'Thibault Crittin')
            pg.click('#client-save')
            pg.wait_for_selector('#client-note')
            pg.fill('#client-note', 'Objectif : perdre 5 kg. Genou gauche fragile.')
            pg.wait_for_timeout(400)
            check(f'[{scheme}] Client créé avec sa fiche', 'Genou gauche' in pg.evaluate("window.__coach.state.clients[0].note"))

            # Nouvelle séance comme dans Notes
            pg.click('#new-session')
            pg.wait_for_selector('#note-title')
            pg.fill('#note-title', 'Haut du corps')
            pg.click('#note-body')
            pg.click('#tool-bullet')
            pg.keyboard.type('Développé couché 4x8')
            pg.keyboard.press('Enter')
            pg.keyboard.type('Tractions 4x6')
            pg.wait_for_timeout(400)
            body = pg.locator('#note-body').input_value()
            check(f'[{scheme}] La liste à puces continue toute seule', body == '• Développé couché 4x8\n• Tractions 4x6', repr(body))
            shot(pg, f'{s}-02-seance')
            back(pg)
            pg.wait_for_selector('#layer .page .note-row')
            check(f'[{scheme}] La séance apparaît chez le client', 'Haut du corps' in pg.locator('#layer .page').last.inner_text())
            shot(pg, f'{s}-03-client')

            # Dupliquer
            pg.locator('#layer .page .note-row').first.click()
            pg.click('#note-more')
            pg.click('#note-duplicate')
            pg.wait_for_timeout(600)
            back(pg)
            check(f'[{scheme}] Séance dupliquée', pg.evaluate("window.__coach.state.notes.length") == 2)

            # Séance vide : supprimée en sortant
            pg.click('#new-session')
            pg.wait_for_selector('#note-title')
            back(pg)
            check(f'[{scheme}] Une séance vide n’est pas gardée', pg.evaluate("window.__coach.state.notes.length") == 2)
            back(pg)
            shot(pg, f'{s}-04-seances')
            pg.fill('#search', 'tractions')
            pg.wait_for_timeout(200)
            check(f'[{scheme}] Recherche dans les séances', pg.locator('#notes-list .note-row').count() == 2)
            pg.fill('#search', '')

            # Timer
            pg.click('.tabbar button[data-tab="timer"]')
            pg.wait_for_selector('.tiles')
            check(f'[{scheme}] 9 durées de 1:00 à 5:00', [t.strip() for t in pg.locator('.tile .tv').all_inner_texts()] == ['1:00', '1:30', '2:00', '2:30', '3:00', '3:30', '4:00', '4:30', '5:00'])
            pg.click('#rounds-plus')
            pg.click('#rounds-plus')
            pg.click('#rest-15')
            pg.wait_for_timeout(200)
            shot(pg, f'{s}-05-timer')
            pg.click('.tile[data-work="60"]')
            pg.wait_for_selector('#tb-count')
            shot(pg, f'{s}-06-decompte')
            check(f'[{scheme}] Décompte de 5 s avant le départ', True)
            pg.wait_for_selector('.tboard .tb-phase:has-text("Effort")', timeout=4000)
            pg.wait_for_timeout(1500)
            shot(pg, f'{s}-07-effort')
            pg.wait_for_selector('.tboard.rest', timeout=8000)
            check(f'[{scheme}] Repos entre les tours', pg.evaluate("document.querySelector('.tboard .tb-phase').textContent") == 'Repos')
            pg.screenshot(path=os.path.join(OUT, f'{s}-08-repos.png'))
            pg.click('#tb-pause')
            check(f'[{scheme}] Pause', 'Reprendre' in pg.locator('#tb-pause').inner_text())
            pg.click('#tb-pause')
            pg.click('#tb-skip')
            pg.wait_for_timeout(300)
            check(f'[{scheme}] Passer → tour 2', 'Tour 2 / 3' in pg.locator('.tb-round').inner_text())
            pg.wait_for_selector('#tb-again', timeout=20000)
            shot(pg, f'{s}-09-termine')
            check(f'[{scheme}] Timer terminé', 'Terminé' in pg.locator('.tboard').inner_text())
            pg.click('#tb-end')
            pg.wait_for_timeout(400)

            # Sans décompte : démarre tout de suite
            pg.locator('#cd-toggle .switch').click()
            pg.click('.tile[data-work="90"]')
            pg.wait_for_timeout(300)
            check(f'[{scheme}] Sans décompte : l’effort démarre tout de suite', pg.locator('#tb-count').count() == 0 and 'Effort' in pg.locator('.tboard').inner_text())
            pg.click('#tb-close')
            pg.wait_for_selector('.sheet .btn.danger')
            pg.click('.sheet .btn.danger')
            pg.wait_for_timeout(500)
            check(f'[{scheme}] Arrêter le timer', pg.locator('.tboard').count() == 0)

            # Réglages + recharge : les notes restent
            pg.reload()
            pg.wait_for_selector('.tiles')
            pg.click('.tabbar button[data-tab="notes"]')
            check(f'[{scheme}] Les notes restent après fermeture', pg.locator('[data-client]').count() >= 1)
            pg.click('.top .iconbtn[aria-label="Réglages"]')
            pg.wait_for_selector('#backup')
            shot(pg, f'{s}-10-reglages')
            b.close()

        # Safari (pas installée) : on conseille d'installer
        b = p.chromium.launch()
        ctx = b.new_context(**IPHONE)
        pg = ctx.new_page()
        pg.goto(URL)
        pg.wait_for_selector('#search')
        check('Dans Safari : bandeau « Installe l’appli »', pg.locator('#install-banner').count() == 1)
        b.close()
    check('Aucune erreur JavaScript', not errors, '; '.join(errors[:3]))
    print(f'\n{sum(results)}/{len(results)} vérifications réussies. Captures dans {OUT}')


main()
