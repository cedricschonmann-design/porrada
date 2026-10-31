"""Test de bout en bout de Notes sur un iPhone simulé (appli installée sur l'écran d'accueil).

Lancer : python3 -m http.server 8767 dans app/, puis
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers python3 tests/test_app.py <dossier des captures> [code de transfert]
"""
import os
import sys

from playwright.sync_api import sync_playwright

URL = os.environ.get('NOTES_URL', 'http://localhost:8767/')
OUT = sys.argv[1] if len(sys.argv) > 1 else 'captures'
# Code de transfert à importer (tes notes personnelles ne sont pas dans le dépôt)
CODE = open(sys.argv[2]).read().strip() if len(sys.argv) > 2 else None
os.makedirs(OUT, exist_ok=True)
IPHONE = dict(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True,
              user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1')
STANDALONE = "Object.defineProperty(navigator, 'standalone', { get: () => true });"
results = []


def check(label, ok, detail=''):
    results.append(bool(ok))
    print(('OK    ' if ok else 'ÉCHEC ') + label + ('' if ok else f' — {detail}'))


def shot(pg, name):
    pg.wait_for_timeout(350)
    pg.screenshot(path=os.path.join(OUT, name + '.png'))


def top(pg):
    return pg.locator('#layer > .page:not(.closing)').last


def back(pg):
    top(pg).locator('.backbtn').click()
    pg.wait_for_timeout(500)


def close_sheet(pg):
    if pg.locator('.sheet:not(.closing)').count():
        pg.locator('.backdrop').last.click(position={'x': 20, 'y': 20})
        pg.wait_for_timeout(400)


def note_id(pg, title):
    return pg.evaluate(f"window.__notes.state.notes.find(n => n.title === {title!r}).id")


def open_note(pg, title):
    nid = note_id(pg, title)
    pg.click(f'#home-list [data-note="{nid}"]')
    pg.wait_for_selector('#layer .page .note-head')
    pg.wait_for_timeout(450)
    return nid


def note(pg, nid):
    return pg.evaluate(f"window.__notes.state.notes.find(n => n.id === {nid!r})")


def run(p, scheme, errors):
    s = scheme[0].upper()
    b = p.chromium.launch()
    ctx = b.new_context(color_scheme=scheme, **IPHONE)
    ctx.add_init_script(STANDALONE)
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    pg.goto(URL)
    pg.wait_for_selector('#today')
    check(f'[{scheme}] Premier lancement : contenu neutre et « Importer tes notes »', pg.locator('#import-card').count() == 1 and pg.evaluate('window.__notes.state.notes.length') == 1)
    shot(pg, f'{s}-00-premier-lancement')
    if not CODE:
        print('Pas de code de transfert : fin du test.')
        b.close()
        return

    # ---------- Import ----------
    pg.click('#import-start')
    pg.fill('#transfer-code', CODE)
    pg.wait_for_timeout(400)
    check(f'[{scheme}] Le code est reconnu avant l’import', 'Code valide' in pg.locator('#code-info').inner_text())
    pg.click('#import-code')
    pg.click('.sheet .btn.danger')
    pg.wait_for_timeout(900)
    shot(pg, f'{s}-01-accueil')
    check(f'[{scheme}] Import : 5 carnets et 7 notes', pg.evaluate('window.__notes.state.books.length') == 5 and pg.evaluate('window.__notes.state.notes.length') == 7 and pg.locator('#import-card').count() == 0)
    sem = pg.evaluate("window.__notes.state.notes.find(n => n.title === 'Ma semaine').blocks.find(b => b.t === 'week').days")
    check(f'[{scheme}] Semaine : JJB mardi et jeudi, séance lundi et vendredi',
          any(x['x'] == 'JJB' for x in sem[1]) and any(x['x'] == 'JJB' for x in sem[3]) and sem[0][0]['c'] == 'prepa' and sem[4][0]['c'] == 'prepa')
    check(f'[{scheme}] Accueil en fenêtres (une par carnet)', pg.locator('#home-list .win.list').count() >= 5 and pg.locator('#home-list .nrow').count() >= 6)
    check(f'[{scheme}] Rappel de sauvegarde visible', pg.locator('#backup-card').count() == 1)

    # ---------- Aujourd'hui ----------
    pg.locator('#today .witem .wmain').first.click()
    pg.wait_for_timeout(300)
    check(f'[{scheme}] Aujourd’hui : cocher une activité', pg.locator('#today .witem.done').count() == 1 and pg.locator('#today .seg-bar i.on').count() == 1)
    pg.locator('#today .tval').nth(1).fill('120')
    pg.wait_for_timeout(400)
    prot = pg.evaluate("Object.values(window.__notes.state.notes.find(n => n.title === 'Plan alimentaire').blocks.find(b => b.t === 'track').items[1].hist)")
    check(f'[{scheme}] Protéines notées depuis l’accueil', prot == ['120'], str(prot))

    # ---------- Plan alimentaire : lecture ----------
    nid = open_note(pg, 'Plan alimentaire')
    pg_ = top(pg)
    check(f'[{scheme}] Diète : en lecture, rien n’est modifiable', pg_.locator('[contenteditable="true"]').count() == 0 and pg_.locator('.edit-hint').is_hidden())
    check(f'[{scheme}] Diète : fenêtres et tableaux', pg_.locator('.win.sec').count() >= 8 and pg_.locator('table.tbl').count() >= 8 and pg_.locator('.mac').count() == 2)
    kcal = pg_.locator('.mac-k').first.inner_text()
    check(f'[{scheme}] Macros : 2 300 kcal calculées pour la sèche', '2' in kcal and '300' in kcal, kcal)
    check(f'[{scheme}] Chiffres alignés à droite dans les tableaux', pg_.locator('td.r').count() >= 10)
    widths = pg.evaluate("Array.from(document.querySelectorAll('#layer .page:last-child .tscroll')).map(e => e.scrollWidth - e.clientWidth)")
    check(f'[{scheme}] Aucun tableau ne déborde de l’écran', max(widths) <= 1, str(widths))
    shot(pg, f'{s}-02-diete')
    # Replier une fenêtre
    pg_.locator('.win.sec .win-h', has_text='Recettes').click()
    pg.wait_for_timeout(300)
    check(f'[{scheme}] Replier une fenêtre', pg_.locator('.win.sec.folded', has_text='Recettes').count() == 1)
    pg_.locator('.win.sec .win-h', has_text='Recettes').click()
    pg.wait_for_timeout(300)
    # Cocher une course en touchant la ligne, puis tout décocher
    pg_.locator('.b-todo', has_text='bœuf haché light').click()
    pg.wait_for_timeout(300)
    check(f'[{scheme}] En lecture, toucher la ligne coche la case', any(x.get('done') for x in note(pg, nid)['blocks'] if x['t'] == 'todo'))
    back(pg)

    # ---------- Séance : charges ----------
    nid = open_note(pg, 'Séance prépa physique')
    pg.locator('.load[data-set="0"]').first.fill('24')
    pg.locator('.load[data-set="1"]').first.fill('24')
    pg.locator('.load[data-set="2"]').first.fill('28')
    pg.wait_for_timeout(400)
    shot(pg, f'{s}-03-seance')
    w = [x for x in note(pg, nid)['blocks'] if x['t'] == 'work'][0]
    check(f'[{scheme}] Charges gardées par date et par série', list(w['log'].values())[0][w['rows'][0]['id']] == ['24', '24', '28'])
    back(pg)

    open_note(pg, 'Objectifs 21 → 22 ans')
    check(f'[{scheme}] Objectifs avec compte à rebours', top(pg).locator('.due').count() >= 7)
    back(pg)

    # ---------- Nouvelle note : mode Modifier ----------
    pg.click('#new-note')
    pg.click('.sheet [data-new-in]')
    pg.wait_for_selector('#note-title')
    check(f'[{scheme}] Une nouvelle note s’ouvre en mode Modifier', pg.evaluate("document.querySelector('#layer .page:last-child').classList.contains('edit')") and pg.locator('.edit-hint').is_visible())
    pg.keyboard.type('Idées')
    pg.keyboard.press('Enter')
    pg.keyboard.type('Première ligne')
    pg.keyboard.press('Enter')
    pg.keyboard.type('Deuxième ligne')
    pg.wait_for_timeout(300)
    nn = pg.evaluate("window.__notes.state.notes.find(n => n.title === 'Idées')")
    check(f'[{scheme}] Entrée crée un nouveau bloc', nn and [x.get('h') for x in nn['blocks']][:2] == ['Première ligne', 'Deuxième ligne'], str(nn and nn['blocks']))
    check(f'[{scheme}] Pendant la frappe : barre de mise en forme', pg.locator('#layer .page.edit.typing .etools').is_visible())
    # Style du bloc
    pg.click('#t-style')
    pg.click('.sheet [data-type="todo"]')
    pg.click('.sheet [data-font="hand"]')
    pg.click('.sheet .cdot[data-c="orange"]')
    close_sheet(pg)
    blk = pg.evaluate("window.__notes.state.notes.find(n => n.title === 'Idées').blocks[1]")
    check(f'[{scheme}] Style du bloc : case, police, couleur', blk['t'] == 'todo' and blk['s'].get('f') == 'hand' and blk['s'].get('c') == 'orange', str(blk))
    # Picto et pastille
    top(pg).locator('[data-id] .rt').last.click()
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
    # Gras
    top(pg).locator('[data-id] .rt').first.click()
    pg.keyboard.press('Home')
    pg.keyboard.press('Shift+End')
    pg.click('#t-bold')
    pg.wait_for_timeout(200)
    h0 = pg.evaluate("window.__notes.state.notes.find(n => n.title === 'Idées').blocks[0].h")
    check(f'[{scheme}] Gras sur la sélection', '<b>' in h0, h0)
    pg.click('#t-done')
    pg.wait_for_timeout(300)
    check(f'[{scheme}] Clavier fermé : barre Ajouter / Fenêtre / Terminé', pg.locator('#ebar-ok').is_visible())

    # Fenêtre + tableau
    pg.click('#ebar-win')
    pg.wait_for_timeout(300)
    pg.keyboard.type('Plan')
    pg.click('#t-done')
    pg.wait_for_timeout(200)
    top(pg).locator('.win.sec .win-add').click()
    pg.click('.sheet [data-add="table"]')
    pg.wait_for_timeout(400)
    cell = top(pg).locator('.tbl .cell').first
    cell.click()
    pg.keyboard.type('Jour')
    pg.keyboard.press('Enter')
    pg.keyboard.type('Séance')
    pg.click('#tbl-add-row')
    pg.wait_for_timeout(300)
    t = [x for x in pg.evaluate("window.__notes.state.notes.find(n => n.title === 'Idées').blocks") if x['t'] == 'table'][0]
    check(f'[{scheme}] Tableau : en-têtes écrits et ligne ajoutée', t['cols'] == ['Jour', 'Séance'] and len(t['rows']) == 3, str(t))
    blocks = pg.evaluate("window.__notes.state.notes.find(n => n.title === 'Idées').blocks.map(b => b.t)")
    check(f'[{scheme}] Le tableau est dans la fenêtre « Plan »', blocks[-2:] == ['h2', 'table'], str(blocks))

    # Semaine dans une note
    pg.click('#t-done') if pg.locator('#t-done').is_visible() else None
    pg.wait_for_timeout(200)
    pg.click('#ebar-add')
    pg.click('.sheet [data-add="week"]')
    pg.wait_for_timeout(400)
    top(pg).locator('[data-add-day="2"]').click()
    pg.click('.sheet [data-cat="jjb"]')
    pg.click('#witem-ok')
    pg.wait_for_timeout(300)
    check(f'[{scheme}] Activité ajoutée au mercredi', 'JJB' in top(pg).locator('.wday[data-day="2"]').inner_text())
    shot(pg, f'{s}-04-modifier')

    # Poignée : monter, puis supprimer avec annulation
    first_id = pg.evaluate("window.__notes.state.notes.find(n => n.title === 'Idées').blocks[0].id")
    second_id = pg.evaluate("window.__notes.state.notes.find(n => n.title === 'Idées').blocks[1].id")
    top(pg).locator(f'[data-grip="{second_id}"]').click()
    pg.click('#block-up')
    pg.wait_for_timeout(300)
    order = pg.evaluate("window.__notes.state.notes.find(n => n.title === 'Idées').blocks.map(b => b.id)")
    check(f'[{scheme}] Poignée : monter un bloc', order[0] == second_id and order[1] == first_id)
    n_before = len(order)
    top(pg).locator(f'[data-grip="{first_id}"]').click()
    pg.click('#block-delete')
    pg.wait_for_timeout(300)
    check(f'[{scheme}] Poignée : supprimer un bloc', len(pg.evaluate("window.__notes.state.notes.find(n => n.title === 'Idées').blocks")) == n_before - 1)
    pg.click('#toast .act')
    pg.wait_for_timeout(300)
    check(f'[{scheme}] Annuler la suppression', len(pg.evaluate("window.__notes.state.notes.find(n => n.title === 'Idées').blocks")) == n_before)

    # OK : retour en lecture
    pg.click('#note-edit')
    pg.wait_for_timeout(400)
    check(f'[{scheme}] OK : retour en lecture, plus rien de modifiable', top(pg).locator('[contenteditable="true"]').count() == 0 and not pg.locator('#ebar-ok').is_visible())
    shot(pg, f'{s}-05-lecture')
    back(pg)
    check(f'[{scheme}] La note apparaît sur l’accueil', pg.locator('#home-list .nrow', has_text='Idées').count() == 1)

    # ---------- Corbeille ----------
    open_note(pg, 'Idées')
    pg.click('#note-more')
    pg.click('#note-delete')
    pg.wait_for_timeout(600)
    check(f'[{scheme}] Supprimer : la note part à la corbeille', pg.evaluate("window.__notes.state.trash.some(n => n.title === 'Idées')") and pg.locator('#home-list .nrow', has_text='Idées').count() == 0)
    pg.click('.top .iconbtn[aria-label="Réglages"]')
    pg.wait_for_selector('#trash')
    pg.wait_for_timeout(400)
    shot(pg, f'{s}-06-reglages')
    pg.click('#trash')
    pg.locator('.sheet .item', has_text='Idées').locator('.btn').click()
    pg.wait_for_timeout(400)
    close_sheet(pg)
    check(f'[{scheme}] Restaurer depuis la corbeille', pg.locator('#home-list .nrow', has_text='Idées').count() == 1)

    # ---------- Copies automatiques ----------
    pg.wait_for_timeout(4500)
    pg.click('.top .iconbtn[aria-label="Réglages"]')
    pg.click('#copies')
    pg.wait_for_timeout(500)
    check(f'[{scheme}] Copies automatiques : copie du jour et copie avant l’import', pg.locator('.sheet .item', has_text='Copie du jour').count() >= 1 and pg.locator('.sheet .item', has_text='Avant un import').count() >= 1)
    close_sheet(pg)

    # ---------- Recherche ----------
    pg.fill('#search', 'Coulomb')
    pg.wait_for_timeout(200)
    check(f'[{scheme}] Recherche dans le contenu', 'À revoir' in pg.locator('#home-list').inner_text())
    pg.fill('#search', 'cornflakes')
    pg.wait_for_timeout(200)
    check(f'[{scheme}] Recherche dans les tableaux', 'Plan alimentaire' in pg.locator('#home-list').inner_text())
    pg.fill('#search', '')

    # ---------- Tout est gardé ----------
    pg.reload()
    pg.wait_for_selector('#today')
    check(f'[{scheme}] Tout est gardé après fermeture', pg.locator('#home-list .nrow', has_text='Idées').count() == 1 and pg.locator('#today .witem.done').count() == 1)

    # ---------- Stockage vidé : on retrouve les notes ----------
    # (l'iPhone vide le stockage pendant que l'appli est fermée : on le vide avant son démarrage)
    pg.add_init_script("if (!sessionStorage.getItem('vide')) { localStorage.clear(); sessionStorage.setItem('vide', '1'); }")
    pg.reload()
    pg.wait_for_selector('#recover-card', timeout=5000)
    check(f'[{scheme}] Stockage vidé : la copie automatique est proposée', pg.locator('#recover-card').count() == 1)
    pg.locator('#recover-card .btn.primary').click()
    pg.wait_for_timeout(700)
    check(f'[{scheme}] Notes restaurées depuis la copie automatique', pg.evaluate('window.__notes.state.notes.length') == 8)
    b.close()


def main():
    errors = []
    with sync_playwright() as p:
        for scheme in ['dark', 'light']:
            run(p, scheme, errors)
        b = p.chromium.launch()
        pg = b.new_context(**IPHONE).new_page()
        pg.goto(URL)
        pg.wait_for_selector('#today')
        check('Dans Safari : bandeau « Installe l’appli »', pg.locator('#install-banner').count() == 1)
        b.close()
    check('Aucune erreur JavaScript', not errors, '; '.join(errors[:3]))
    print(f'\n{sum(results)}/{len(results)} vérifications réussies. Captures dans {OUT}')


main()
