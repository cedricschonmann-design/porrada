"""Test de bout en bout de Notes sur un iPhone simulé (appli installée sur l'écran d'accueil).

Lancer : python3 -m http.server 8767 dans app/, puis
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers python3 tests/test_app.py <dossier des captures>
"""
import os
import sys

from playwright.sync_api import sync_playwright

URL = 'http://localhost:8767/'
OUT = sys.argv[1] if len(sys.argv) > 1 else 'captures'
# Code de transfert à importer (tes notes personnelles ne sont pas dans le dépôt)
CODE = open(sys.argv[2]).read().strip() if len(sys.argv) > 2 else None
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


def close_sheet(pg):
    if pg.locator('.sheet:not(.closing)').count():
        pg.locator('.backdrop').last.click(position={'x': 20, 'y': 20})
        pg.wait_for_timeout(400)


def open_note(pg, title):
    nid = pg.evaluate(f"window.__notes.state.notes.find(n => n.title === {title!r}).id")
    pg.click(f'#home-list [data-note="{nid}"]')
    pg.wait_for_selector('#layer .page .note-title')
    pg.wait_for_timeout(400)
    return nid


def note(pg, nid):
    return pg.evaluate(f"window.__notes.state.notes.find(n => n.id === {nid!r})")


def main():
    errors = []
    with sync_playwright() as p:
        for scheme in ['dark', 'light']:
            s = scheme[0].upper()
            b = p.chromium.launch()
            ctx = b.new_context(color_scheme=scheme, **IPHONE)
            ctx.add_init_script(STANDALONE)
            pg = ctx.new_page()
            pg.on('pageerror', lambda e: errors.append(str(e)))
            pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
            pg.goto(URL)
            pg.wait_for_selector('#today')
            check(f'[{scheme}] Premier lancement : modèle neutre et carte « Importer tes notes »', pg.locator('#import-card').count() == 1 and pg.evaluate('window.__notes.state.notes.length') == 1)
            shot(pg, f'{s}-00-premier-lancement')
            if not CODE:
                print('Pas de code de transfert : fin du test.')
                b.close()
                continue
            pg.click('#import-start')
            pg.fill('#transfer-code', CODE)
            pg.click('#import-code')
            pg.click('.sheet .btn.danger')
            pg.wait_for_timeout(800)
            shot(pg, f'{s}-01-accueil')
            check(f'[{scheme}] Import : 5 carnets et 7 notes', pg.evaluate('window.__notes.state.books.length') == 5 and pg.evaluate('window.__notes.state.notes.length') == 7 and pg.locator('#import-card').count() == 0)
            sem = pg.evaluate("window.__notes.state.notes.find(n => n.title === 'Ma semaine').blocks.find(b => b.t === 'week').days")
            check(f'[{scheme}] Semaine : JJB mardi et jeudi, séance lundi et vendredi, plus d’heures',
                  any(x['x'] == 'JJB' for x in sem[1]) and any(x['x'] == 'JJB' for x in sem[3]) and sem[0][0]['c'] == 'prepa' and sem[4][0]['c'] == 'prepa' and not any(':' in x['x'] for d in sem for x in d))

            # Aujourd'hui : cocher depuis l'accueil
            first = pg.locator('#today .witem .wmain').first
            first.click()
            pg.wait_for_timeout(300)
            check(f'[{scheme}] Aujourd’hui : cocher une activité', pg.locator('#today .witem.done').count() == 1)

            # Suivi du jour depuis l'accueil
            pg.locator('#today .tval').nth(1).fill('120')
            pg.wait_for_timeout(400)
            prot = pg.evaluate("Object.values(window.__notes.state.notes.find(n => n.title === 'Plan alimentaire').blocks.find(b => b.t === 'track').items[1].hist)")
            check(f'[{scheme}] Protéines notées depuis l’accueil', prot == ['120'], str(prot))

            # Séance : charges par série
            nid = open_note(pg, 'Séance prépa physique')
            pg.locator('.load[data-set="0"]').first.fill('24')
            pg.locator('.load[data-set="1"]').first.fill('24')
            pg.locator('.load[data-set="2"]').first.fill('28')
            pg.wait_for_timeout(400)
            shot(pg, f'{s}-02-seance')
            log = note(pg, nid)['blocks'][1]['log']
            check(f'[{scheme}] Charges gardées par date et par série', list(log.values())[0][note(pg, nid)['blocks'][1]['rows'][0]['id']] == ['24', '24', '28'])
            back(pg)

            # Objectifs : échéances
            open_note(pg, 'Objectifs 21 → 22 ans')
            check(f'[{scheme}] Objectifs avec compte à rebours', pg.locator('.due').count() >= 7)
            shot(pg, f'{s}-03-objectifs')
            back(pg)

            # Nouvelle note : texte riche
            pg.click('#new-note')
            pg.click('.sheet [data-new-in]')
            pg.wait_for_selector('#note-title')
            pg.keyboard.type('Idées')
            pg.keyboard.press('Enter')
            pg.keyboard.type('Première ligne')
            pg.keyboard.press('Enter')
            pg.keyboard.type('Deuxième ligne')
            pg.wait_for_timeout(300)
            nn = pg.evaluate("window.__notes.state.notes.find(n => n.title === 'Idées')")
            check(f'[{scheme}] Entrée crée un nouveau bloc', nn and [x.get('h') for x in nn['blocks']][:2] == ['Première ligne', 'Deuxième ligne'], str(nn and nn['blocks']))
            check(f'[{scheme}] La barre d’outils apparaît en écrivant', pg.locator('#layer .page.editing .etools').count() == 1)
            # Style : case à cocher, police manuscrite, couleur
            pg.click('#t-style')
            pg.click('.sheet [data-type="todo"]')
            pg.click('.sheet [data-font="hand"]')
            pg.click('.sheet .cdot[data-c="orange"]')
            close_sheet(pg)
            blk = pg.evaluate("window.__notes.state.notes.find(n => n.title === 'Idées').blocks[1]")
            check(f'[{scheme}] Style du bloc : case, police, couleur', blk['t'] == 'todo' and blk['s'].get('f') == 'hand' and blk['s'].get('c') == 'orange', str(blk))
            # Picto et pastille dans le texte
            pg.locator('#layer .page [data-id] .rt').last.click()
            pg.keyboard.press('End')
            pg.click('#t-pic')
            pg.click('.sheet .cdot[data-c="red"]')
            pg.click('.sheet [data-pic="arrow-right"]')
            pg.wait_for_timeout(300)
            pg.click('#t-pill')
            pg.fill('#pill-text', 'Urgent')
            pg.click('.sheet .cdot[data-c="pink"]')
            pg.click('#pill-ok')
            pg.wait_for_timeout(400)
            html = pg.evaluate("window.__notes.state.notes.find(n => n.title === 'Idées').blocks.at(-1).h")
            check(f'[{scheme}] Picto et pastille insérés dans le texte', 'data-i="arrow-right"' in html and 'class="pill"' in html and 'Urgent' in html, html)
            # Gras sur une sélection
            pg.locator('#layer .page [data-id] .rt').first.click()
            pg.keyboard.press('Home')
            pg.keyboard.press('Shift+End')
            pg.click('#t-bold')
            pg.wait_for_timeout(200)
            h0 = pg.evaluate("window.__notes.state.notes.find(n => n.title === 'Idées').blocks[0].h")
            check(f'[{scheme}] Gras sur la sélection', '<b>' in h0, h0)
            shot(pg, f'{s}-04-nouvelle-note')
            # Ajouter des blocs outils
            pg.locator('#t-done').click()
            pg.click('#add-block')
            pg.click('.sheet [data-add="budget"]')
            pg.wait_for_timeout(300)
            pg.click('#add-block')
            pg.click('.sheet [data-add="week"]')
            pg.wait_for_timeout(300)
            check(f'[{scheme}] Blocs Budget et Semaine ajoutés', pg.locator('#layer .page .sp.budget').count() == 1 and pg.locator('#layer .page .sp.week').count() == 1)
            pg.click('#week-edit')
            pg.locator('[data-add-day="2"]').click()
            pg.click('.sheet [data-cat="jjb"]')
            pg.click('#witem-ok')
            pg.wait_for_timeout(300)
            check(f'[{scheme}] Activité ajoutée au mercredi', 'JJB' in pg.locator('#layer .page .wday[data-day="2"]').inner_text())
            shot(pg, f'{s}-05-blocs-outils')
            back(pg)
            check(f'[{scheme}] La note apparaît sur l’accueil', pg.locator('#home-list .ncard', has_text='Idées').count() == 1)

            # Recherche
            pg.fill('#search', 'Coulomb')
            pg.wait_for_timeout(200)
            check(f'[{scheme}] Recherche dans le contenu', 'À revoir' in pg.locator('#home-list').inner_text())
            pg.fill('#search', '')

            # Recharger : tout reste
            pg.reload()
            pg.wait_for_selector('#today')
            check(f'[{scheme}] Tout est gardé après fermeture', pg.locator('#home-list .ncard', has_text='Idées').count() == 1 and pg.locator('#today .witem.done').count() == 1)
            pg.click('.top .iconbtn[aria-label="Réglages"]')
            pg.wait_for_selector('#backup')
            shot(pg, f'{s}-06-reglages')
            b.close()

        b = p.chromium.launch()
        pg = b.new_context(**IPHONE).new_page()
        pg.goto(URL)
        pg.wait_for_selector('#today')
        check('Dans Safari : bandeau « Installe l’appli »', pg.locator('#install-banner').count() == 1)
        b.close()
    check('Aucune erreur JavaScript', not errors, '; '.join(errors[:3]))
    print(f'\n{sum(results)}/{len(results)} vérifications réussies. Captures dans {OUT}')


main()
