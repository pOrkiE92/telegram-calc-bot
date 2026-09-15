// Inline keyboard layout. Every button's callback_data is the literal text
// to append to the expression, except for the three control codes below -
// this keeps calculator.js's applyButton() trivial.

export const CTRL = {
  CLEAR: 'CTRL:C',
  DELETE: 'CTRL:DEL',
  EVAL: 'CTRL:EQ',
};

function btn(label, data) {
  return { text: label, callback_data: data };
}

export function buildKeyboard() {
  return {
    inline_keyboard: [
      [btn('sin', 'sin('), btn('cos', 'cos('), btn('tan', 'tan('), btn('log', 'log('), btn('√', 'sqrt(')],
      [btn('(', '('), btn(')', ')'), btn('^', '^'), btn('π', 'pi'), btn('⌫', CTRL.DELETE)],
      [btn('7', '7'), btn('8', '8'), btn('9', '9'), btn('÷', '/'), btn('C', CTRL.CLEAR)],
      [btn('4', '4'), btn('5', '5'), btn('6', '6'), btn('×', '*')],
      [btn('1', '1'), btn('2', '2'), btn('3', '3'), btn('−', '-')],
      [btn('0', '0'), btn('.', '.'), btn('=', CTRL.EVAL), btn('+', '+')],
    ],
  };
}
