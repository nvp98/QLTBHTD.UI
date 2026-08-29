import { useRef } from 'react';
import type { FormInstance } from 'antd';
import type { TextAreaRef } from 'antd/es/input/TextArea';

// ─── Toolbar chèn biến/toán tử/dấu/hàm cho ô biểu thức NCalc — dùng chung ChiTieuPage
// (Formula/Rule) và CongThucTongHopPage (Công thức tổng hợp) ─────────────────────────
export const NCALC_TOOLBAR_TAG_STYLE = {
  fontSize: 14, fontWeight: 600, fontFamily: 'monospace', cursor: 'pointer',
  padding: '3px 10px', textAlign: 'center',
} as const;
export const NCALC_OPERATORS = ['+', '-', '*', '/', '>', '<', '>=', '<=', '&&', '||'];
export const NCALC_PUNCTUATION = ['(', ')', ','];
export const NCALC_FUNCTIONS = [
  { label: 'ABS',   fn: 'Abs' },
  { label: 'MIN',   fn: 'Min' },
  { label: 'MAX',   fn: 'Max' },
  { label: 'ROUND', fn: 'Round' },
  { label: 'IF',    fn: 'If' },
];

/** Chèn text vào đúng vị trí con trỏ trong 1 ô Input.TextArea của Form — tránh gõ tay sai
 * tên biến/toán tử/casing hàm (NCalc phân biệt hoa/thường: "Min" đúng, "MIN" lỗi runtime). */
export function useNCalcToolbar(form: FormInstance, fieldName: string) {
  const ref = useRef<TextAreaRef>(null);

  const insertAtCursor = (text: string, cursorOffsetFromEnd = 0) => {
    const textarea = ref.current?.resizableTextArea?.textArea;
    const current: string = form.getFieldValue(fieldName) ?? '';
    if (textarea) {
      const start = textarea.selectionStart ?? current.length;
      const end = textarea.selectionEnd ?? current.length;
      const newValue = current.slice(0, start) + text + current.slice(end);
      form.setFieldsValue({ [fieldName]: newValue });
      requestAnimationFrame(() => {
        textarea.focus();
        const pos = start + text.length - cursorOffsetFromEnd;
        textarea.setSelectionRange(pos, pos);
      });
    } else {
      form.setFieldsValue({ [fieldName]: current + text });
    }
  };

  return {
    ref,
    insertVar:  (varName: string) => insertAtCursor(varName),
    insertOp:   (op: string) => insertAtCursor(` ${op} `),
    insertPunc: (p: string) => insertAtCursor(p === ',' ? ', ' : p),
    insertFunc: (fn: string) => insertAtCursor(`${fn}()`, 1),
  };
}
