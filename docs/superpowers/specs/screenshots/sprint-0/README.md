# Sprint 0 — Captures de référence

Captures à prendre sur https://home-poker.vjdev.tech/ après déploiement de la branche `feat/sprint-0-fondations`.

## Matrice

| Écran | 320px | 375px | 768px | 1024px | 1280px |
|---|---|---|---|---|---|
| Lobby (avec shell) | `lobby-320.png` | `lobby-375.png` | `lobby-768.png` | `lobby-1024.png` | `lobby-1280.png` |
| Stats (avec shell) | `stats-320.png` | `stats-375.png` | `stats-768.png` | `stats-1024.png` | `stats-1280.png` |
| Table (fullscreen, sans shell) | `table-320.png` | `table-375.png` | `table-768.png` | `table-1024.png` | `table-1280.png` |

## Comment capturer

DevTools Chrome/Firefox → Toggle device toolbar → Responsive → définir largeur exacte → screenshot pleine page.

## Vérifications attendues

- 320–767 px : bottom tab bar visible avec 4 onglets (Lobby / Tournois / Stats / Profil), top header avec titre.
- 1024 px+ : sidebar rail à gauche (72 px) + top header, plus de bottom tab bar.
- Sur la table : aucun chrome (header, tabs, sidebar) — seule la table de jeu visible.
- Pas d'overflow horizontal sur 320 px.
