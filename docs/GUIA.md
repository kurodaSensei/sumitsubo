# Guía de Sumitsubo (en español)

> Documentación completa y referencia de cada skill y comando: **[sumitsubo-docs.vercel.app](https://sumitsubo-docs.vercel.app)** · [English](https://sumitsubo-docs.vercel.app/en) · [repo del sitio](https://github.com/kurodaSensei/sumitsubo-docs)

Sumitsubo es tu framework personal de IA para diseño y desarrollo web con Claude Code. Los archivos del framework están en inglés (los modelos siguen mejor las instrucciones así y queda listo para publicarse); Claude te responde siempre en tu idioma.

## Cómo está organizado

- **sumi**: cómo se trabaja (flujo, calidad, accesibilidad, performance, review, hooks).
- **sumi-design**: cómo se diseña sin AI slop (dirección creativa, catálogo anti-slop, registro anti-repetición, tokens, movimiento).
- **Paquetes de stack**: sumi-nuxt, sumi-react, sumi-shopify y sumi-wordpress. En cada proyecto instalas solo los que uses.

## Instalación (una vez)

Necesitas Claude Code y git. No hacen falta llaves SSH ni cambiar tu configuración global de git.

**1. Un comando (la principal).** Dentro de un proyecto, con Node 18 o superior:

```bash
npx sumitsubo                          # core + diseño + compañeros + el stack que detecte
npx sumitsubo --stack nuxt,wordpress   # elegir los stacks en vez de detectarlos
npx sumitsubo doctor                   # revisar la instalación
npx sumitsubo update                   # actualizar todo y reparar lo dañado
npx sumitsubo uninstall                # quitarlo todo
```

El instalador solo ejecuta `claude plugin …` por debajo: nunca escribe los archivos de configuración de Claude Code. Al final revisa los archivos instalados en disco, porque el mensaje de "instalado con éxito" ya mintió antes.

**2. Dentro de Claude Code (la secundaria).**

```text
/plugin marketplace add kurodaSensei/sumitsubo
/plugin install sumi-design@sumitsubo     trae sumi y todos los compañeros
/plugin install sumi-nuxt@sumitsubo       más el stack que uses
```

**3. Desde un clon (respaldo, y para editar el framework).**

```bash
git clone https://github.com/kurodaSensei/sumitsubo.git
claude plugin marketplace add ./sumitsubo     # o tu carpeta: "/Users/kurodasensei/AI Setup/sumitsubo"
claude plugin install sumi-design@sumitsubo
```

Con un marketplace local, los plugins propios cargan directo desde la carpeta: lo que edites ahí aplica en la siguiente sesión.

En las tres vías hay que reiniciar Claude Code al terminar. Los compañeros se instalan solos como dependencias: Impeccable, Ponytail, 5 skills de Taste, 3 de Emil Kowalski y 5 de Superpowers. Sumitsubo no los copia; los referencia desde el repo de cada autor, así que se actualizan desde ahí y respetan sus licencias. `/sumi-design:deps` verifica que estén y detecta copias duplicadas.

### Probar la instalación como si fueras otra persona

```bash
npx sumitsubo --sandbox                 # perfil de Claude desechable: tu configuración no se toca
npx sumitsubo --sandbox --no-ssh        # además simula una máquina sin llaves SSH de GitHub
npm run test:install                    # desde el repo: instala tu copia local así, sin publicar nada
```

`--sandbox` usa `CLAUDE_CONFIG_DIR` con una carpeta temporal y al final te dice cómo abrir Claude dentro de ella y cómo borrarla. Para probar el paquete exactamente como se publicaría: `npm pack` y luego `npx --package=./sumitsubo-<versión>.tgz sumitsubo --sandbox`.

### Por qué la instalación fallaba sin SSH

Ponytail estaba declarado como `{"source":"github"}`. En una máquina normal, `claude plugin install` clona ese tipo de fuente por SSH y no cae a HTTPS, así que sin llaves fallaba ponytail y, con él, todo lo que depende de `sumi`. Ahora está declarado como `{"source":"url","url":"https://…"}`; se verificó en un perfil limpio con SSH bloqueado y quedan 21 plugins completos. `validate.mjs` rechaza fuentes `github` en los compañeros para que no vuelva a pasar. Además, el instalador `npx` reescribe GitHub a HTTPS solo para los comandos que ejecuta, así que también cubre versiones viejas de Claude Code.

## Flujo en un proyecto nuevo de cliente

1. `/sumi:init`: detecta el stack, crea `.sumi/`, agrega a `CLAUDE.md` un bloque gestionado entre las marcas `sumi:begin` y `sumi:end` (lo que escribas fuera nunca se toca) y deja el perfil `balanced` con `opusplan` como modelo de sesión en `.claude/settings.local.json`.
2. `/sumi-design:direction Cliente X <links>`:
   - Brief con rasgos de marca escritos como tensiones ("preciso pero cálido"), nunca como adjetivos sueltos.
   - Anti-referencias: clichés del sector, vicios típicos de la IA y lo que ya usaste con clientes anteriores (lo saca del ledger).
   - **3 direcciones** que difieren en al menos 5 ejes (tipografía, color, layout, forma, imagen, movimiento, densidad, voz…).
   - Eliges una y se genera `DESIGN.md` con los tokens, con el contraste ya verificado por script, y el proyecto queda anotado en el ledger.
3. ¿Quieres verlo en Claude Design? Pide "genera el brief para Claude Design" y la skill `claude-design-bridge` arma `design/claude-design-brief.md`: el spec del design system, las prohibiciones explícitas y un prompt por pantalla.
4. Para construir:
   - Pedidos pequeños: Claude los hace directo.
   - Algo grande: `/sumi:feature <idea>` crea un solo archivo en `.sumi/tasks/` con objetivo, lo que queda fuera del alcance, criterios de aceptación, log y evidencia.
5. `/sumi:review` al terminar cada slice: congela el diff y lanza solo las lentes necesarias según el riesgo, cada una sin el contexto del autor. Al final emite un recibo.
6. `/sumi-design:critique` sobre las pantallas: lente de diseño más la crítica y el audit de Impeccable.
7. `/sumi:ship`: checks, criterios con evidencia y borrador del PR (simple o encadenado).

## Modelos: Opus solo donde vale la pena

Sumitsubo reparte el trabajo por rol para ahorrar tokens sin perder calidad:

| Rol | Modelo (perfil balanced) | Qué hace |
|---|---|---|
| `scout` | Haiku | Busca archivos, lee versiones y documentación, resume |
| `builder` | Sonnet | Implementa tareas y slices delegados, corre los checks |
| `architect` | Opus | Arquitectura, modelo de datos, migraciones, división en slices |
| Lentes de review | Sonnet (seguridad en Opus) | Reviews sin el contexto del autor |
| Sesión principal | `opusplan` | Opus mientras planea, Sonnet mientras ejecuta |

Cambia el perfil por proyecto con `/sumi:models balanced|economy|performance`:
- **balanced** (por defecto): la tabla de arriba.
- **economy**: todo en Sonnet salvo búsquedas y reviews simples en Haiku. Para proyectos pequeños o cuando estés cerca del límite de tu plan.
- **performance**: Opus para decisiones y reviews, para trabajo delicado.

Al cerrar una feature, el log anota cuántas delegaciones hubo por rol, para comparar perfiles entre proyectos.

## Calibrar el esfuerzo (para no gastar de más)

Sumitsubo está pensado para ayudarte a decidir, no para usar toda su potencia siempre:
- **Control de alcance:** si el plan va más allá de lo que pediste (más de 3 slices o cosas que no mencionaste, como i18n, API o páginas generadas), se detiene y te muestra dos opciones con su costo: **Mínima** y **Extendida**. Tú eliges.
- **Reviews con presupuesto:** el diff y los checks (tipos, lint, tests, build) se calculan una sola vez. Cada lente tiene un tope de pasos y solo lee lo que cambió. Corren máximo 3 lentes, y un rango más grande que un slice se divide.
- **`/sumi:review --quick`:** una sola lente barata para cambios pequeños.
- **Perfil `performance` solo cuando lo pidas:** al iniciar sesión te avisa si está activo o si el proyecto no tiene modelo de sesión configurado.

## Lo que hacen los hooks (solo en proyectos con `.sumi/config.json`)

- Bloquean el push y el commit a main/master/production, y pide confirmación para force push y para `reset --hard`.
- Bloquean la edición de código estando en una rama protegida.
- Bloquean escribir secretos (llaves privadas, tokens de Stripe live, GitHub, Shopify, AWS…).
- Al iniciar sesión te muestran las features activas y en qué punto quedó cada una.

Configúralos en `.sumi/config.json`: ramas protegidas, presupuesto de líneas y presupuestos de performance.

## El ledger anti-repetición

Vive en `~/.sumi/design-ledger.json`, fuera de los repos, y por eso cubre a todos tus clientes. Guarda las tipografías, el tono de acento, el layout, la forma y el elemento firma de cada proyecto. Antes de cerrar una dirección se ejecuta `check`, y si choca con alguno de tus últimos 6 proyectos te avisa. Lo que impone la marca del cliente se anota como `--brand-locked` y no cuenta como repetición tuya.

## Actualizar

```bash
npx sumitsubo update
```

Sin Node: `claude plugin marketplace update sumitsubo` y luego `claude plugin update <plugin>@sumitsubo` por cada plugin. Desde un clon: `git pull`.

Reinicia Claude Code y, en cada proyecto ya inicializado, corre `/sumi:sync` para actualizar el bloque de `CLAUDE.md` y las claves nuevas de `.sumi/config.json`.

## El sitio de documentación

[sumitsubo-docs.vercel.app](https://sumitsubo-docs.vercel.app) se construyó con el propio Sumitsubo (dirección "Kumiko") y genera las páginas de referencia desde este repo. Se sincroniza solo con cada release (ver abajo). Si agregas una skill o un comando, la página en español se escribe a mano en [su repo](https://github.com/kurodaSensei/sumitsubo-docs).

## Publicar una versión

```bash
npm run release 0.7.0     # sube todas las versiones juntas y valida
```

Agrega la entrada en `CHANGELOG.md`, abre el PR y haz merge. Al llegar a `main`, `release.yml` hace la prueba de instalación limpia, crea el tag `v0.7.0`, publica `sumitsubo` en npm, crea el release de GitHub y le pide al sitio de documentación que se resincronice.

**El último paso es tuyo:** npm deja cada versión nueva en revisión (*staged publishing*) y solo la libera cuando la apruebas en **npmjs.com → sumitsubo → Staged Packages → Approve**, con tu 2FA (o `npm stage list sumitsubo` y `npm stage approve <id>`, con npm 11.15+). Mientras no la apruebes, `npx sumitsubo` sigue instalando la versión anterior.

## Origen del contenido

- Lo genérico de ai-guidelines (accesibilidad, HTML, JS, SCSS, Shopify) está reescrito y generalizado. El paquete de WordPress sigue el método de tus propios temas de bloques nativos (como Summers): theme.json, patterns, bloques dinámicos sin build y auditoría de tokens. No quedó nada específico de la empresa ni de sus clientes.
- Las ideas de Gentle AI (flujo escalonado, archivo único de feature, presupuesto de 400 líneas, lentes sin contexto, tags de sync) están adaptadas, no copiadas.
- Impeccable, Taste y Emil Kowalski se orquestan como dependencias externas.
