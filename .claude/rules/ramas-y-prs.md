# Ramas y PRs (regla de Keiver, 2026-10-25): léela antes de crear una rama o abrir un PR

Vale para todos los repos de Midaz-Cloud, para personas y para agentes (Claude, Codex, Cursor).

## La regla
1. **`develop` junta todo y no se promueve.** Ahí se integra y se prueba todo, pero nunca se abre un PR de `develop` hacia QA ni hacia producción, ni de QA hacia producción en bloque.
2. **Un arreglo o función = una rama propia.** Sale del **ancestro común** de las ramas a las que va a llegar, nunca de `develop`:
   - Va a un solo destino: sale de ese destino (por ejemplo `git switch -c fix/x origin/QA`).
   - Va a varios: `git switch -c fix/x $(git merge-base --octopus origin/QA origin/allinone origin/release/aws)` (con los destinos que correspondan).
   - Si el código cambió tanto entre ramas que el arreglo no encaja en una base común, se hace una rama por destino con el mismo cambio (`fix/x-qa`, `fix/x-aws`), cada una sacada de su destino.
3. **La misma rama sube a cada destino con su propio PR** y también a `develop`. Cada PR trae solo ese cambio: si el PR muestra archivos o commits que no son tuyos, la base está mal y no se abre así.
4. **Los PR a `QA`, `prod`, `release/aws`, `allinone` y `main` (donde `main` es producción) los aprueba y fusiona únicamente Keiver.** Quien abre el PR no lo fusiona, no empuja directo a esas ramas y no dispara a mano un despliegue de ellas. A `develop` sí se puede fusionar.
5. **Cada PR dice** qué trae, qué despliega y de qué otro PR depende (sube después de ese). Una migración de base va dentro del mismo PR que la usa.
6. **Probar contra la rama de destino** antes de abrir el PR, no solo en `develop`: las pruebas de GitHub pueden no correr.

## Por qué
Los PR de `develop` hacia QA traían decenas de commits imposibles de revisar y arrastraban trabajo a medias a QA y a producción. Subiendo uno por uno, cada destino recibe solo lo que se eligió y cualquier cambio se revierte solo.

## Antes de crear la rama: preguntar siempre
Un agente (Claude u otro) no crea una rama sin antes preguntar a la persona, y esperar la respuesta:
1. **Qué tipo de cambio es** (define el título del PR y la versión):
   | Tipo | Cuándo | Título del PR | Versión |
   |---|---|---|---|
   | Parche | Arregla algo que ya existía, sin cambiar cómo se usa | `fix(área): …` | sube Z |
   | Menor | Agrega algo nuevo; lo anterior sigue igual | `feat(área): …` | sube Y |
   | Mayor | Obliga a otro a cambiar: APK o kiosko instalados, Hub, lo que consumen o certificaron Credicard/Access, migración sin vuelta atrás, flujo que el comercio ya conoce | `feat!:`/`fix!:` + línea `BREAKING CHANGE: qué rompe` | sube X |
   | Sin versión | No cambia lo que corre | `docs:`, `test:`, `ci:`, `chore:` | no sube |
2. **A qué ramas va** (QA, allinone, release/aws, main…). Con eso se calcula la base: el ancestro común de esos destinos.

Con Claude Code, usar la herramienta de preguntas (AskUserQuestion) con esas dos preguntas. El hook `.claude/hooks/confirmar-rama.mjs` además pide confirmación en pantalla cada vez que se va a crear una rama. Si la persona ya respondió ambas cosas en su mensaje, no se vuelve a preguntar.

## Ramas de este repo
`develop` (integración, no se promueve) y `main` (lo publicado en los kioskos).
