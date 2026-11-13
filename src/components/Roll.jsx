// Chữ "lăn" khi rê chuột: hai dòng chồng nhau, từng ký tự trượt lên lệch nhịp.
export default function Roll({ children }) {
  const text = String(children);
  const chars = [...text];
  const line = hidden => (
    <span className="roll-line" aria-hidden={hidden || undefined}>
      {chars.map((c, i) => (
        <span className="roll-char" style={{ '--i': i }} key={i}>
          {c === ' ' ? ' ' : c}
        </span>
      ))}
    </span>
  );
  return (
    <span className="roll" aria-label={text}>
      {line(false)}
      {line(true)}
    </span>
  );
}
