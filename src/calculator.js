import { evaluate, format } from 'mathjs';
import { CTRL } from './keyboard.js';

/**
 * Try to evaluate a mathjs expression. Returns a formatted string on
 * success, or null if the expression is empty/incomplete/invalid.
 */
function safeEvaluate(expr) {
  if (!expr || !expr.trim()) return null;
  try {
    const value = evaluate(expr);
    if (typeof value === 'function' || typeof value === 'undefined') return null;
    return format(value, { precision: 14 });
  } catch {
    return null; // e.g. "sin(" with no closing paren yet, or a typo
  }
}

/**
 * Apply one button press to the current expression.
 * Returns { expr, evalError } - evalError is true only when "=" was
 * pressed on something that doesn't evaluate, in which case expr is
 * left untouched so the user can fix it with backspace.
 */
export function applyButton(currentExpr, data) {
  if (data === CTRL.CLEAR) {
    return { expr: '', evalError: false };
  }
  if (data === CTRL.DELETE) {
    return { expr: currentExpr.slice(0, -1), evalError: false };
  }
  if (data === CTRL.EVAL) {
    const result = safeEvaluate(currentExpr);
    if (result === null) return { expr: currentExpr, evalError: true };
    return { expr: result, evalError: false };
  }
  // Plain literal button: digit, operator, function opener, constant, paren.
  return { expr: currentExpr + data, evalError: false };
}

export function renderText(expr) {
  const display = expr && expr.length ? expr : '0';
  return `🧮 *Calculator*\n\n\`${display}\``;
}
