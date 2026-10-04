# Guía de forge (en español)

forge es tu framework personal de IA para diseño y desarrollo web con Claude Code. Los archivos del framework están en inglés (los modelos siguen mejor las instrucciones así y queda listo para publicarse); Claude te responde siempre en tu idioma.

## Cómo está organizado

- **forge-core**: cómo se trabaja (flujo, calidad, accesibilidad, performance, review, hooks).
- **forge-design**: cómo se diseña sin AI slop (dirección creativa, catálogo anti-slop, registro anti-repetición, tokens, movimiento).
- **Paquetes de stack**: forge-nuxt, forge-react, forge-shopify y forge-wordpress. En cada proyecto instalas solo los que uses.

## Instalación (una vez)

1. Sube el repo a GitHub (privado por ahora) o úsalo desde tu carpeta local.
2. En Claude Code:
   ```
   /plugin marketplace add <tu-usuario>/forge
   /plugin install forge-core@forge
   /plugin install forge-design@forge
   /plugin install forge-nuxt@forge
   ```
3. Instala los compañeros de diseño con `/forge-design:deps`: Impeccable, Taste y las skills de Emil Kowalski. No vienen incluidos dentro de forge; así se actualizan solos y respetan sus licencias.

## Flujo en un proyecto nuevo de cliente

1. `/forge-core:init`: detecta el stack, crea `.forge/` y agrega a `CLAUDE.md` un bloque gestionado entre las marcas `forge:begin` y `forge:end`. Lo que escribas fuera de esas marcas nunca se toca.
2. `/forge-design:direction Cliente X <links>`:
   - Brief con rasgos de marca escritos como tensiones ("preciso pero cálido"), nunca como adjetivos sueltos.
   - Anti-referencias: clichés del sector, vicios típicos de la IA y lo que ya usaste con clientes anteriores (lo saca del ledger).
   - **3 direcciones** que difieren en al menos 5 ejes (tipografía, color, layout, forma, imagen, movimiento, densidad, voz…).
   - Eliges una y se genera `DESIGN.md` con los tokens, con el contraste ya verificado por script, y el proyecto queda anotado en el ledger.
3. ¿Quieres verlo en Claude Design? Pide "genera el brief para Claude Design" y la skill `claude-design-bridge` arma `design/claude-design-brief.md`: el spec del design system, las prohibiciones explícitas y un prompt por pantalla.
4. Para construir:
   - Pedidos pequeños: Claude los hace directo.
   - Algo grande: `/forge-core:feature <idea>` crea un solo archivo en `.forge/tasks/` con objetivo, lo que queda fuera del alcance, criterios de aceptación, log y evidencia.
5. `/forge-core:review` al terminar cada slice: congela el diff y lanza solo las lentes necesarias según el riesgo, cada una sin el contexto del autor. Al final emite un recibo.
6. `/forge-design:critique` sobre las pantallas: lente de diseño más la crítica y el audit de Impeccable.
7. `/forge-core:ship`: checks, criterios con evidencia y borrador del PR (simple o encadenado).

## Lo que hacen los hooks (solo en proyectos con `.forge/config.json`)

- Bloquean el push y el commit a main/master/production, y pide confirmación para force push y para `reset --hard`.
- Bloquean la edición de código estando en una rama protegida.
- Bloquean escribir secretos (llaves privadas, tokens de Stripe live, GitHub, Shopify, AWS…).
- Al iniciar sesión te muestran las features activas y en qué punto quedó cada una.

Configúralos en `.forge/config.json`: ramas protegidas, presupuesto de líneas y presupuestos de performance.

## El ledger anti-repetición

Vive en `~/.forge/design-ledger.json`, fuera de los repos, y por eso cubre a todos tus clientes. Guarda las tipografías, el tono de acento, el layout, la forma y el elemento firma de cada proyecto. Antes de cerrar una dirección se ejecuta `check`, y si choca con alguno de tus últimos 6 proyectos te avisa. Lo que impone la marca del cliente se anota como `--brand-locked` y no cuenta como repetición tuya.

## Renombrar

Cuando decidas el nombre: `scripts/rename.sh kata` (o el que elijas). Después revisa con `git diff --stat` y `node scripts/validate.mjs`.

## Origen del contenido

- Lo genérico de ai-guidelines (accesibilidad, HTML, JS, SCSS, Shopify, WordPress) está reescrito y generalizado. No quedó nada específico de la empresa ni de sus clientes.
- Las ideas de Gentle AI (flujo escalonado, archivo único de feature, presupuesto de 400 líneas, lentes sin contexto, tags de sync) están adaptadas, no copiadas.
- Impeccable, Taste y Emil Kowalski se orquestan como dependencias externas.
