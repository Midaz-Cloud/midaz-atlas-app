// Hook PreToolUse (regla de ramas, ver .claude/rules/ramas-y-prs.md): antes de crear una rama
// pide confirmación a la persona, con el tipo de cambio y los destinos a la vista. Node sin dependencias
// para que funcione igual en Mac, Linux y Windows.
let raw = ''
process.stdin.on('data', (chunk) => (raw += chunk))
process.stdin.on('end', () => {
  let input = {}
  try { input = JSON.parse(raw) } catch { process.exit(0) }

  const command = String(input?.tool_input?.command ?? '')
  const createsBranch =
    input?.tool_name === 'EnterWorktree' ||
    /\bgit\b[^;&|\n]*\b(checkout\s+-[bB]\b|switch\s+(-[cC]\b|--create\b|--force-create\b)|worktree\s+add\b[^;&|\n]*\s-[bB]\s)/.test(command) ||
    /\bgit\b[^;&|\n]*\bbranch\s+(?!-)[^\s;&|]+/.test(command)
  if (!createsBranch) process.exit(0)

  const reason = [
    'Regla de ramas (.claude/rules/ramas-y-prs.md): antes de crear la rama confirma con la persona:',
    '1) qué tipo de cambio es: fix (parche), feat (menor) o cambio que rompe algo de afuera (mayor);',
    '2) a qué ramas va (QA, allinone, release/aws, main…). La rama sale del ancestro común de esos destinos, nunca de develop.',
  ].join(' ')
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'ask', permissionDecisionReason: reason },
  }))
})
