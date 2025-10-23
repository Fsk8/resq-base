export function DebugPanel({ note }: { note?: string }) {
  return (
    <div
      style={{
        marginTop: 12,
        padding: 10,
        border: "1px dashed #bbb",
        borderRadius: 8,
        fontSize: 12,
      }}
    >
      <div>
        <b>Debug</b>
      </div>
      {note ? <div>{note}</div> : null}
    </div>
  );
}
